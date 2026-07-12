// /api/inbox/reply — send outbound reply. If text empty → AI auto-generates.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { chargeCredit } from "@/lib/credit";
import { llmChat, setAiContext } from "@/lib/ai";

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
          }${p.description ? ` · ${p.description.slice(0, 50)}${p.description.length > 50 ? "…" : ""}` : ""}`
      )
      .join("\n");

    // ── Look up customer by phone number and get their orders ──────────
    const customerPhone = inbound.fromNumber?.replace(/[^0-9]/g, "");
    const customer = customerPhone
      ? await db.customer.findFirst({ where: { brandId, phone: { contains: customerPhone.slice(-10) } } })
      : null;
    const customerOrders = customer
      ? await db.order.findMany({
          where: { brandId, customerId: customer.id },
          orderBy: { createdAt: "desc" },
          take: 3,
          select: { id: true, totalAmount: true, status: true, createdAt: true, items: true },
        })
      : [];

    const ordersStr = customerOrders.length > 0
      ? `\n📦 Order ${customer?.name ?? "pelanggan ini"}:\n${customerOrders.map((o) => {
          const items = JSON.parse(o.items) as { name: string; qty: number }[];
          const itemStr = items.map((i) => `${i.name} x${i.qty}`).join(", ");
          return `  - #${o.id.slice(-8).toUpperCase()} | ${itemStr} | Rp ${o.totalAmount.toLocaleString("id-ID")} | Status: ${o.status} | ${new Date(o.createdAt).toLocaleDateString("id-ID")}`;
        }).join("\n")}`
      : "";

    const leadInfo = inbound.leadId
      ? await db.lead.findUnique({ where: { id: inbound.leadId } })
      : null;

    const systemPrompt = `Kamu adalah asisten penjual untuk brand "${brand.name}" (kategori: ${brand.category}, tone: ${brand.toneOfVoice}).
Tugasmu: membalas chat pelanggan via WhatsApp dengan ramah, natural, ringkas (1-3 kalimat), dan dalam Bahasa Indonesia.
Balas pertanyaan pelanggan dengan akurat berdasarkan info di bawah. Jika tidak tahu, arahkan pelanggan untuk chat admin.

📋 Katalog produk:
${catalogStr || "(belum ada produk)"}
${ordersStr}
${leadInfo ? `\n👤 Konteks lead: nama ${leadInfo.name}, tahap ${leadInfo.stage}.` : ""}
${brand.description ? `\n📌 Info brand: ${brand.description}` : ""}

⚠️ GUARDRAILS:
1. Jangan buat janji pengiriman — bilang "akan diproses"
2. Untuk cek status pesanan, gunakan data ORDER di atas
3. Jangan minta data sensitif (PIN, password, KTP)
4. Jika tidak tahu, arahkan ke admin toko`;

    const userPrompt = `Pesan pelanggan: "${inbound.messageText}"\n\nTulis balasan ramah dalam Bahasa Indonesia:`;

    setAiContext({ feature: "inbox_reply", userId, brandId, service: "Customer Service" });

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
      // Contextual fallback — acknowledge customer's message + offer help
      const msg = inbound.messageText.toLowerCase();
      let fallback = `Halo kak! Terima kasih sudah menghubungi ${brand.name}. 😊`;
      if (/(harga|berapa|murah|mahal)/.test(msg)) {
        fallback = `Halo kak! Terima kasih sudah tanya. Untuk info harga terbaru, kami bisa kirimkan katalog lengkap ${brand.name}. Mau kami kirim sekarang? 😊`;
      } else if (/(stok|ready|tersedia|masih)/.test(msg)) {
        fallback = `Halo kak! Stok produk ${brand.name} selalu update. Boleh tau produk mana yang kakak mau? Nanti kami cek real-time ya 😊`;
      } else if (/(alamat|kirim|kirimkan|ongkir)/.test(msg)) {
        fallback = `Halo kak! Kami bisa kirim ke seluruh Indonesia. Boleh tau alamat lengkap + produk yang dimau? Nanti kami cek ongkirnya ya 📦`;
      } else if (/(order|pesan|beli|mau)/.test(msg)) {
        fallback = `Halo kak! Mantap, kami bantu proses orderannya. Boleh tau produk + jumlah yang kakak mau pesan? 🛒`;
      } else {
        fallback = `Halo kak! Terima kasih sudah menghubungi ${brand.name}. Ada yang bisa kami bantu? 😊`;
      }
      finalText = fallback;
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
