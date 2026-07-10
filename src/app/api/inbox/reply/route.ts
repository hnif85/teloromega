// /api/inbox/reply — send outbound reply. If text empty → AI auto-generates.
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
  const { brandId, messageId, text } = body as {
    brandId: string;
    messageId: string;
    text?: string;
  };

  if (!brandId || !messageId) {
    return NextResponse.json({ error: "brandId & messageId wajib" }, { status: 400 });
  }

  const brand = await db.brand.findUnique({ where: { id: brandId } });
  if (!brand || brand.userId !== userId) {
    return NextResponse.json({ error: "brand tidak ditemukan" }, { status: 404 });
  }

  const inbound = await db.inboxMessage.findUnique({ where: { id: messageId } });
  if (!inbound || inbound.brandId !== brandId) {
    return NextResponse.json({ error: "pesan tidak ditemukan" }, { status: 404 });
  }

  let finalText = (text ?? "").trim();
  let usedAi = false;

  // If empty → auto-generate AI reply with brand context + product catalog
  if (!finalText) {
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

    const leadInfo = inbound.leadId
      ? await db.lead.findUnique({ where: { id: inbound.leadId } })
      : null;

    const systemPrompt = `Kamu adalah asisten penjual untuk brand "${brand.name}" (kategori: ${brand.category}, tone: ${brand.toneOfVoice}).
Tugasmu: membalas chat pelanggan via WhatsApp dengan ramah, natural, ringkas (1-3 kalimat), dan dalam Bahasa Indonesia.
Balas pertanyaan pelanggan dengan akurat berdasarkan info brand & katalog di bawah. Jika tidak tahu, arahkan pelanggan untuk chat admin.

Katalog produk:
${catalogStr || "(belum ada produk)"}

${leadInfo ? `Konteks lead: nama ${leadInfo.name}, tahap ${leadInfo.stage}.` : ""}
${brand.description ? `Info brand: ${brand.description}` : ""}`;

    const userPrompt = `Pesan pelanggan: "${inbound.messageText}"\n\nTulis balasan ramah dalam Bahasa Indonesia:`;

    try {
      finalText = await llmChat(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        { temperature: 0.7, max_tokens: 250 }
      );
      usedAi = true;
    } catch {
      finalText = `Halo kak! Terima kasih sudah menghubungi ${brand.name}. Ada yang bisa kami bantu? 😊`;
      usedAi = true;
    }
  }

  // Charge 1 credit (toko.ai_chat_reply)
  const charge = await chargeCredit({
    userId,
    brandId,
    actionKey: "toko.ai_chat_reply",
    referenceId: inbound.id,
  });
  if (!charge.ok) {
    return NextResponse.json(
      { error: "credit tidak cukup", reason: charge.reason, balanceAfter: charge.balanceAfter },
      { status: 402 }
    );
  }

  const outbound = await db.inboxMessage.create({
    data: {
      brandId,
      userId,
      channel: inbound.channel,
      fromNumber: inbound.fromNumber, // recipient number stored here
      fromName: brand.name,
      messageText: finalText,
      direction: "outbound",
      repliedBy: usedAi ? "ai" : "user",
      leadId: inbound.leadId,
    },
  });

  return NextResponse.json({
    message: outbound,
    creditBalanceAfter: charge.balanceAfter,
    usedAi,
  });
}
