// POST /api/public/order/[orderId]/payment-proof — upload bukti bayar + AI verify
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { setAiContext, llmJson } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;

    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        brand: { select: { id: true, storeSettings: true } },
        payments: { take: 1, orderBy: { createdAt: "desc" } },
      },
    });
    if (!order) {
      return NextResponse.json({ error: "Pesanan tidak ditemukan" }, { status: 404 });
    }

    let formData: FormData;
    try { formData = await req.formData(); }
    catch { return NextResponse.json({ error: "invalid form data" }, { status: 400 }); }

    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "file wajib diupload" }, { status: 400 });

    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "format file tidak didukung (PNG/JPEG/WEBP)" }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "ukuran file maksimal 5MB" }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const filePath = `payment-proofs/${order.brand.id}/${orderId}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(filePath, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      console.error("[payment-proof] upload failed:", uploadError.message);
      return NextResponse.json({ error: "gagal upload gambar" }, { status: 500 });
    }

    const { data: urlData } = supabase.storage
      .from("product-images")
      .getPublicUrl(filePath);

    const proofImageUrl = urlData.publicUrl;

    await db.payment.updateMany({
      where: { orderId },
      data: { proofImageUrl, status: "Menunggu" },
    });

    // ── AI verify after upload ──────────────────────────────────────────────
    setAiContext({ feature: "public_payment_verify", brandId: order.brand.id });

    const brandSettings = (order.brand.storeSettings ?? {}) as Record<string, unknown>;
    const bankAccounts = Array.isArray(brandSettings.bankAccounts)
      ? brandSettings.bankAccounts as { bank: string; accountNumber: string; accountName: string }[]
      : [];
    const expectedAmount = order.totalAmount;

    const bankInfoStr = bankAccounts.length > 0
      ? `Rekening toko:\n${bankAccounts.map((a) => `- ${a.bank}: ${a.accountNumber} a.n. ${a.accountName}`).join("\n")}`
      : "Tidak ada rekening terdaftar.";

    let aiResult: any = null;
    try {
      const imgBuffer = Buffer.from(await file.arrayBuffer());
      const dataUrl = `data:${file.type};base64,${imgBuffer.toString("base64")}`;

      const extracted = await llmJson<{
        bankName: string | null;
        accountNumber: string | null;
        accountName: string | null;
        amount: number | null;
        senderName: string | null;
        date: string | null;
        time: string | null;
      }>(
        [{
          role: "user",
          content: [
            { type: "text", text: `Analisis gambar bukti transfer ini.
Informasi pesanan:
- Total harus dibayar: Rp ${expectedAmount.toLocaleString("id-ID")}
${bankInfoStr}

Ekstrak data berikut. Return ONLY JSON:
{
  "bankName": "nama bank atau null",
  "accountNumber": "nomor rekening tujuan atau null",
  "accountName": "nama pemilik rekening atau null",
  "amount": jumlah_angka (number) atau null,
  "senderName": "nama pengirim atau null",
  "date": "tanggal YYYY-MM-DD atau null",
  "time": "jam HH:MM atau null"
}` },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        }],
        { temperature: 0.1, max_tokens: 2000 }
      );

      let amountOk = false;
      let amountDetail = "";
      if (extracted.amount != null) {
        const diff = Math.abs(extracted.amount - expectedAmount);
        amountOk = diff <= 1000;
        amountDetail = amountOk
          ? `✅ Rp ${expectedAmount.toLocaleString("id-ID")}`
          : `❌ Terbaca Rp ${extracted.amount.toLocaleString("id-ID")}, harus Rp ${expectedAmount.toLocaleString("id-ID")}`;
      } else {
        amountDetail = "❌ Nominal tidak terbaca";
      }

      let bankOk = false;
      let bankDetail = "";
      if (extracted.accountNumber && bankAccounts.length > 0) {
        const norm = extracted.accountNumber.replace(/\s/g, "");
        const matched = bankAccounts.find((a) => a.accountNumber.replace(/\s/g, "") === norm);
        if (matched) {
          bankOk = true;
          bankDetail = `✅ ${matched.bank} ${matched.accountNumber} a.n. ${matched.accountName}`;
        } else {
          bankDetail = `❌ Rek ${extracted.accountNumber} tidak cocok dengan daftar toko`;
        }
      } else if (!extracted.accountNumber) {
        bankDetail = "❌ No. rekening tidak terbaca";
      } else {
        bankOk = true;
        bankDetail = "ℹ️ Tidak ada rekening pembanding";
      }

      const okCount = [amountOk, bankOk].filter(Boolean).length;
      aiResult = {
        extracted: {
          bankName: extracted.bankName,
          accountNumber: extracted.accountNumber,
          accountName: extracted.accountName,
          amount: extracted.amount,
          senderName: extracted.senderName,
          date: extracted.date,
          time: extracted.time,
        },
        amountOk,
        amountDetail,
        bankOk,
        bankDetail,
        confidence: okCount === 2 ? "high" : okCount === 1 ? "medium" : "low",
      };
    } catch (err) {
      console.error("[payment-proof] AI verify failed:", err);
      aiResult = { error: "Gagal memverifikasi otomatis" };
    }

    return NextResponse.json({ proofImageUrl, aiResult });
  } catch (err) {
    console.error("[payment-proof] error:", err);
    return NextResponse.json({ error: "gagal upload bukti bayar" }, { status: 500 });
  }
}
