// /api/inbox/ai-reply — generate AI reply via llmChat (does not persist as outbound)
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
  const { brandId, messageText, leadContext, fromNumber } = body as {
    brandId: string;
    messageText: string;
    leadContext?: { name?: string; stage?: string; notes?: string };
    fromNumber?: string;
  };

  if (!brandId || !messageText?.trim()) {
    return NextResponse.json({ error: "brandId & messageText wajib" }, { status: 400 });
  }

  const brand = await db.brand.findUnique({ where: { id: brandId } });
  if (!brand || brand.userId !== userId) {
    return NextResponse.json({ error: "brand tidak ditemukan" }, { status: 404 });
  }

  setAiContext({ feature: "inbox_ai_reply", userId, brandId, service: "Customer Service" });

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

  // ── Product knowledge ────────────────────────────────────────────────────
  const products = await db.product.findMany({
    where: { brandId, isActive: true },
    take: 20,
    select: { name: true, price: true, promoPrice: true, type: true, stock: true, description: true },
  });
  const catalogStr = products.length > 0
    ? products.map((p) => {
        const harga = p.promoPrice != null && p.promoPrice < p.price
          ? `Rp ${p.promoPrice.toLocaleString("id-ID")} (promo, normal Rp ${p.price.toLocaleString("id-ID")})`
          : `Rp ${p.price.toLocaleString("id-ID")}`;
        const stok = p.type === "barang" && p.stock != null ? ` · stok ${p.stock}` : "";
        const deskripsi = p.description ? ` · ${p.description}` : "";
        return `  - ${p.name}${harga}${stok}${deskripsi}`;
      }).join("\n")
    : "(belum ada produk)";

  // ── Order context — by customer phone if available ───────────────────
  let ordersStr = "";
  if (fromNumber) {
    const phone = fromNumber.replace(/[^0-9]/g, "").slice(-10);
    const customer = await db.customer.findFirst({ where: { brandId, phone: { contains: phone } } });
    if (customer) {
      const customerOrders = await db.order.findMany({
        where: { brandId, customerId: customer.id },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, totalAmount: true, status: true, createdAt: true, items: true },
      });
      if (customerOrders.length > 0) {
        ordersStr = `\n📦 Order ${customer.name}:\n${customerOrders.map((o) => {
          const items = JSON.parse(o.items) as { name: string; qty: number }[];
          return `  - #${o.id.slice(-8).toUpperCase()} | ${items.map((i) => `${i.name} x${i.qty}`).join(", ")} | Rp ${o.totalAmount.toLocaleString("id-ID")} | Status: ${o.status} | ${new Date(o.createdAt).toLocaleDateString("id-ID")}`;
        }).join("\n")}`;
      }
    }
  }

  // ── Guardrails ───────────────────────────────────────────────────────
  const systemPrompt = `Kamu adalah asisten penjual untuk brand "${brand.name}" (kategori: ${brand.category}, tone: ${brand.toneOfVoice}).
Tugasmu: menyusun draf balasan chat pelanggan via WhatsApp yang ramah, natural, ringkas (1-3 kalimat), Bahasa Indonesia.

📋 KATALOG PRODUK:
${catalogStr}
${ordersStr}
${brand.description ? `\n📌 Info brand: ${brand.description}` : ""}
${leadContext ? `\n👤 Konteks lead: nama ${leadContext.name ?? "-"}, tahap ${leadContext.stage ?? "-"}${leadContext.notes ? `, catatan: ${leadContext.notes}` : ""}.` : ""}

⚠️ GUARDRAILS (jangan pernah langgar):
1. Jangan membuat janji pengiriman yang tidak realistis (hanya bilang "akan diproses")
2. Jangan memberikan diskon/harga spesial tanpa persetujuan admin toko
3. Jangan meminta data pribadi sensitif (PIN, password, KTP)
4. Jangan menjawab di luar konteks brand dan produk yang terdaftar
5. Jika pelanggan komplain, respon dengan empati dan janji untuk bantu cek ke admin
6. Untuk cek status pesanan, gunakan data ORDER di atas
7. Jika tidak tahu jawabannya, arahkan untuk chat admin toko
8. Jangan berpura-pura menjadi manusia — gunakan bahasa natural tapi jangan mengaku "saya admin"
9. Prioritaskan informasi dari KATALOG PRODUK untuk pertanyaan produk
10. Gunakan Bahasa Indonesia yang baik dan sopan`;

  let reply: string;
  try {
    reply = await llmChat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Pesan pelanggan: "${messageText}"\n\nTulis draf balasan ramah:` },
      ],
      { temperature: 0.7, max_tokens: 300 }
    );
  } catch {
    reply = `Halo kak! Terima kasih sudah menghubungi ${brand.name}. Ada yang bisa kami bantu? 😊`;
  }

  return NextResponse.json({ reply, creditBalanceAfter: charge.balanceAfter });
}
