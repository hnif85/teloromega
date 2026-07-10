// /api/inbox/ai-reply — generate AI reply via llmChat (does not persist as outbound)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { chargeCredit } from "@/lib/credit";
import { llmChat } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const { brandId, messageText, leadContext } = body as {
    brandId: string;
    messageText: string;
    leadContext?: { name?: string; stage?: string; notes?: string };
  };

  if (!brandId || !messageText?.trim()) {
    return NextResponse.json({ error: "brandId & messageText wajib" }, { status: 400 });
  }

  const brand = await db.brand.findUnique({ where: { id: brandId } });
  if (!brand || brand.userId !== userId) {
    return NextResponse.json({ error: "brand tidak ditemukan" }, { status: 404 });
  }

  // Charge 1 credit
  const charge = await chargeCredit({
    userId,
    brandId,
    actionKey: "toko.ai_chat_reply",
  });
  if (!charge.ok) {
    return NextResponse.json(
      { error: "credit tidak cukup", reason: charge.reason, balanceAfter: charge.balanceAfter },
      { status: 402 }
    );
  }

  // Build context
  const products = await db.product.findMany({
    where: { brandId, isActive: true },
    take: 10,
    select: { name: true, price: true, type: true, stock: true, description: true },
  });
  const catalogStr = products
    .map(
      (p) =>
        `- ${p.name} (${p.type}) — Rp ${p.price.toLocaleString("id-ID")}${
          p.type === "barang" && p.stock != null ? ` · stok ${p.stock}` : ""
        }${p.description ? ` · ${p.description}` : ""}`
    )
    .join("\n");

  const systemPrompt = `Kamu adalah asisten penjual untuk brand "${brand.name}" (kategori: ${brand.category}, tone: ${brand.toneOfVoice}).
Tugasmu: menyusun draf balasan chat pelanggan via WhatsApp yang ramah, natural, ringkas (1-3 kalimat), Bahasa Indonesia.

Katalog produk:
${catalogStr || "(belum ada produk)"}

${brand.description ? `Info brand: ${brand.description}` : ""}
${leadContext ? `Konteks lead: nama ${leadContext.name ?? "-"}, tahap ${leadContext.stage ?? "-"}${leadContext.notes ? `, catatan: ${leadContext.notes}` : ""}.` : ""}`;

  let reply: string;
  try {
    reply = await llmChat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Pesan pelanggan: "${messageText}"\n\nTulis draf balasan ramah:` },
      ],
      { temperature: 0.75, max_tokens: 250 }
    );
  } catch {
    reply = `Halo kak! Terima kasih sudah menghubungi ${brand.name}. Ada yang bisa kami bantu? 😊`;
  }

  return NextResponse.json({ reply, creditBalanceAfter: charge.balanceAfter });
}
