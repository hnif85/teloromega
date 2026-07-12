// POST /api/payments/[id]/ai-verify — verify payment proof using AI
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { setAiContext, llmJson } from "@/lib/ai";

export const dynamic = "force-dynamic";

interface AiExtracted {
  bankName: string | null;
  accountNumber: string | null;
  accountName: string | null;
  amount: number | null;
  senderName: string | null;
}

interface VerificationResult {
  extracted: AiExtracted;
  amountOk: boolean;
  amountDetail: string;
  bankOk: boolean;
  bankDetail: string;
  confidence: "high" | "medium" | "low";
  suggestion: "auto_accept" | "manual_review" | "reject";
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;

  const payment = await db.payment.findUnique({
    where: { id },
    include: {
      order: {
        include: {
          brand: { select: { id: true, userId: true, name: true, storeSettings: true } },
        },
      },
    },
  });

  if (!payment || payment.order.brand.userId !== userId) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  if (!payment.proofImageUrl) {
    return NextResponse.json({ error: "Tidak ada bukti bayar" }, { status: 400 });
  }

  setAiContext({ feature: "payment_verify", userId });

  try {
    const imgRes = await fetch(payment.proofImageUrl);
    const imgBlob = await imgRes.blob();
    const imgBuffer = Buffer.from(await imgBlob.arrayBuffer());
    const base64 = imgBuffer.toString("base64");
    const mimeType = imgBlob.type || "image/jpeg";
    const dataUrl = `data:${mimeType};base64,${base64}`;

    const brandSettings = (payment.order.brand.storeSettings ?? {}) as Record<string, unknown>;
    const bankAccounts = Array.isArray(brandSettings.bankAccounts) ? brandSettings.bankAccounts as { bank: string; accountNumber: string; accountName: string }[] : [];
    const expectedAmount = payment.order.totalAmount;

    const bankInfoStr = bankAccounts.length > 0
      ? `Rekening toko terdaftar:\n${bankAccounts.map((a) => `- ${a.bank}: ${a.accountNumber} a.n. ${a.accountName}`).join("\n")}`
      : "Tidak ada rekening terdaftar.";

    const result = await llmJson<AiExtracted>(
      [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analisis gambar bukti transfer ini.
Informasi pesanan:
- Total harus dibayar: Rp ${expectedAmount.toLocaleString("id-ID")}
${bankInfoStr}

Ekstrak data berikut. Return ONLY JSON:
{
  "bankName": "nama bank atau null",
  "accountNumber": "nomor rekening tujuan atau null",
  "accountName": "nama pemilik rekening atau null",
  "amount": jumlah_angka (number atau null),
  "senderName": "nama pengirim atau null"
}` },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
      { temperature: 0.1, max_tokens: 2000 }
    );

    const extracted: AiExtracted = {
      bankName: typeof result.bankName === "string" ? result.bankName.trim() || null : null,
      accountNumber: typeof result.accountNumber === "string" ? result.accountNumber.trim() || null : null,
      accountName: typeof result.accountName === "string" ? result.accountName.trim() || null : null,
      amount: typeof result.amount === "number" ? result.amount : null,
      senderName: typeof result.senderName === "string" ? result.senderName.trim() || null : null,
    };

    let amountOk = false;
    let amountDetail = "";
    if (extracted.amount != null) {
      const diff = Math.abs(extracted.amount - expectedAmount);
      if (diff <= 1000) {
        amountOk = true;
        amountDetail = `Jumlah sesuai: Rp ${expectedAmount.toLocaleString("id-ID")}`;
      } else {
        amountDetail = `Jumlah tidak cocok: terbaca Rp ${extracted.amount.toLocaleString("id-ID")}, harus Rp ${expectedAmount.toLocaleString("id-ID")}`;
      }
    } else {
      amountDetail = "Nominal tidak terbaca dari gambar";
    }

    let bankOk = false;
    let bankDetail = "";
    if (extracted.accountNumber && bankAccounts.length > 0) {
      const norm = extracted.accountNumber.replace(/\s/g, "");
      const matched = bankAccounts.find((a) => a.accountNumber.replace(/\s/g, "") === norm);
      if (matched) {
        bankOk = true;
        bankDetail = `Rekening ${matched.bank} ${matched.accountNumber} a.n. ${matched.accountName} cocok`;
      } else {
        bankDetail = `Rekening ${extracted.bankName ?? ""} ${extracted.accountNumber} tidak cocok dengan daftar toko`;
      }
    } else if (!extracted.accountNumber) {
      bankDetail = "Nomor rekening tidak terbaca";
    } else {
      bankOk = true;
      bankDetail = "Tidak ada rekening pembanding";
    }

    const okCount = [amountOk, bankOk].filter(Boolean).length;
    let confidence: "high" | "medium" | "low" = "low";
    if (okCount === 2) confidence = "high";
    else if (okCount === 1) confidence = "medium";

    const suggestion: "auto_accept" | "manual_review" | "reject" =
      confidence === "high" ? "auto_accept" : confidence === "low" ? "reject" : "manual_review";

    return NextResponse.json({ extracted, amountOk, amountDetail, bankOk, bankDetail, confidence, suggestion } satisfies VerificationResult);
  } catch (err) {
    console.error("[ai-verify] error:", err);
    return NextResponse.json({ error: "Gagal memverifikasi" }, { status: 500 });
  }
}
