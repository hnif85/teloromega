// /api/keuangan/import-template — parse CSV/Excel + AI column mapping + category guessing
import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { mapImportTemplate, type ImportMapping, setAiContext } from "@/lib/ai";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

// Simple keyword-based category guesser for Indonesian descriptions
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  bahan_baku: ["beras", "gula", "tepung", "bumbu", "bahan", "stok", "sayur", "daging", "ikan", "telur", "minyak", "sembako", "gas", "galon", "aqua", "sabun", "kopi", "susu", "roti", "mie", "beras"],
  gaji: ["gaji", "upah", "honor", "karyawan", "pegawai", "staff", "buruh"],
  sewa: ["sewa", "kontrak", "kontrakan", "ruko", "kios"],
  listrik_internet: ["listrik", "air", "internet", "wifi", "pulsa", "token", "pln", "pdam"],
  marketing: ["iklan", "ads", "promosi", "banner", "spanduk", "fb", "instagram", "tiktok", "adsense", "google ads", "meta ads"],
  transportasi: ["bensin", "solar", "transport", "kirim", "ekspedisi", "ongkir", "parkir", "gojek", "grab", "ojek"],
};

function guessCategory(desc: string, type: string): string {
  if (type === "income") return "penjualan_produk";
  const lower = (desc ?? "").toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw.toLowerCase()))) return cat;
  }
  return "operasional_lain";
}

function parseDate(raw: string): string | null {
  if (!raw) return null;
  // Try various date formats
  const d = new Date(raw);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  // Try DD/MM/YYYY or DD-MM-YYYY
  const mm = raw.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (mm) {
    const day = mm[1].padStart(2, "0");
    const month = mm[2].padStart(2, "0");
    const year = mm[3].length === 2 ? `20${mm[3]}` : mm[3];
    const dt = new Date(`${year}-${month}-${day}`);
    if (!isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
  }
  return null;
}

function parseAmount(raw: string): number | null {
  if (!raw) return null;
  const cleaned = String(raw).replace(/[Rp\s.,]/gi, "").replace(/\.(\d{3})/g, "$1").replace(/,(\d{2})$/, ".$1");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : Math.round(num);
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "file required" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());

  // Parse CSV or Excel
  let rows: Record<string, string>[] = [];
  const fileName = file.name.toLowerCase();

  try {
    if (fileName.endsWith(".csv") || file.type === "text/csv") {
      const text = new TextDecoder().decode(buffer);
      rows = parseCSV(text);
    } else {
      const wb = XLSX.read(buffer, { type: "buffer" });
      const sheetName = wb.SheetNames[0];
      if (!sheetName) return NextResponse.json({ error: "no sheet found" }, { status: 400 });
      rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName]);
    }
  } catch (err: any) {
    return NextResponse.json({ error: `failed to parse file: ${err.message}` }, { status: 400 });
  }

  if (rows.length === 0) return NextResponse.json({ error: "file kosong" }, { status: 400 });

  const headers = Object.keys(rows[0]);
  if (headers.length === 0) return NextResponse.json({ error: "no headers found" }, { status: 400 });

  // AI mapping
  setAiContext({ feature: "import_template", userId, service: "Import Mapping" });
  const mapping = await mapImportTemplate(headers, rows.slice(0, 5));

  // Apply mapping to all rows
  const preview = rows.slice(0, 20).map((row) => {
    const dateCol = mapping?.columnMap.date ?? findColumn(headers, ["tanggal", "date", "tgl"]);
    const typeCol = mapping?.columnMap.type ?? findColumn(headers, ["jenis", "type", "tipe", "keterangan"]);
    const amountCol = mapping?.columnMap.amount ?? findColumn(headers, ["jumlah", "amount", "total", "nominal"]);
    const descCol = mapping?.columnMap.description ?? findColumn(headers, ["deskripsi", "description", "keterangan", "catatan", "uraian"]);

    const rawType = typeCol ? (row[typeCol] ?? "").toLowerCase() : "";
    const type = mapping?.typeMap && Object.keys(mapping.typeMap).some((k) => k.toLowerCase() === rawType)
      ? (mapping.typeMap[Object.keys(mapping.typeMap).find((k) => k.toLowerCase() === rawType)!] ?? "expense" as const)
      : (rawType.includes("masuk") || rawType.includes("income") || rawType.includes("pendapatan") ? "income" as const : "expense" as const);

    const rawDate = dateCol ? row[dateCol] ?? "" : "";
    const date = parseDate(rawDate);

    const rawAmount = amountCol ? row[amountCol] ?? "" : "";
    const amount = parseAmount(rawAmount);

    const description = descCol ? (row[descCol] ?? "").trim() || null : null;

    return {
      date: date ?? new Date().toISOString().slice(0, 10),
      type,
      category: guessCategory(description ?? "", type),
      amount: amount ?? 0,
      description,
    };
  }).filter((r) => r.amount > 0);

  return NextResponse.json({
    preview,
    total: rows.length,
    headers,
    mapping: mapping ? { columnMap: mapping.columnMap, typeMap: mapping.typeMap } : null,
  });
}

/** Parse CSV text into array of objects */
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = splitCSVLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = splitCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h.trim()] = values[i]?.trim() ?? ""; });
    return row;
  });
}

function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if ((ch === "," || ch === ";") && !inQuotes) { result.push(current.trim()); current = ""; continue; }
    current += ch;
  }
  result.push(current.trim());
  return result;
}

function findColumn(headers: string[], candidates: string[]): string | null {
  for (const c of candidates) {
    const found = headers.find((h) => h.toLowerCase().includes(c.toLowerCase()));
    if (found) return found;
  }
  return null;
}
