// /api/inbox — list & simulate inbound messages
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

// ─── Intent detection ─────────────────────────────────────────────────────
type Intent = "product_inquiry" | "buying_intent" | "order_status" | "complaint" | "general";

const INTENT_PATTERNS: { intent: Intent; patterns: RegExp[]; label: string }[] = [
  {
    intent: "buying_intent",
    patterns: [
      /mau (beli|pesan|order|ambil)/i,
      /saya (beli|ambil|pesan|order)/i,
      /bisa (dipesan|dibeli|dipesan|dibooking)/i,
      /cara (pesan|beli|order)/i,
      /saya (mau|ingin) (beli|pesan|order)/i,
      /kode (pesan|order)/i,
      /minat/i,
      / jadi (beli|pesan|order)/i,
    ],
    label: "Mau Beli",
  },
  {
    intent: "product_inquiry",
    patterns: [
      /(produk|barang) .*(ada|ready|stok|tersedia)/i,
      /harga (produk|barang)?/i,
      /berapaan? (harga|harganya)/i,
      /masih (ada|ready|tersedia)/i,
      /stok (produk|barang)?/i,
      /katalog/i,
      /boleh tau/i,
      /info (produk|barang|harga)/i,
      /rekomendasi/i,
      /review/i,
    ],
    label: "Tanya Produk",
  },
  {
    intent: "order_status",
    patterns: [
      /pesanan (saya|aku)/i,
      /order (saya|aku)/i,
      /sampai mana/i,
      /status (pesanan|order)/i,
      /kapan (dikirim|sampai|datang)/i,
      /sudah (dikirim|diproses|dibuat)/i,
      /no? (resi|tracking)/i,
      /cek (pesanan|order)/i,
    ],
    label: "Cek Order",
  },
  {
    intent: "complaint",
    patterns: [
      /(produk|barang) (rusak|cacat|bocor|pecah|sobek)/i,
      /kecewa/i,
      /komplain/i,
      /ganti (uang|barang)/i,
      /refund/i,
      /retur/i,
      /tidak sesuai/i,
      /salah (kirim|produk|barang)/i,
      /kecewa/i,
    ],
    label: "Komplain",
  },
];

function detectIntent(text: string): { intent: Intent; label: string } {
  for (const rule of INTENT_PATTERNS) {
    for (const pattern of rule.patterns) {
      if (pattern.test(text)) {
        return { intent: rule.intent, label: rule.label };
      }
    }
  }
  return { intent: "general", label: "Umum" };
}

function stageForIntent(intent: Intent, currentStage: string): string | null {
  if (intent === "buying_intent") {
    if (currentStage === "Baru") return "Negosiasi";
    if (currentStage === "Negosiasi") return "Deal";
    return null;
  }
  if (intent === "product_inquiry" && currentStage === "Baru") {
    return "Negosiasi";
  }
  return null;
}

// ─── GET ─────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const brandId = req.nextUrl.searchParams.get("brandId");
  if (!brandId) return NextResponse.json({ messages: [] });

  const brand = await db.brand.findUnique({ where: { id: brandId } });
  if (!brand || brand.userId !== userId) {
    return NextResponse.json({ error: "brand tidak ditemukan" }, { status: 404 });
  }

  const messages = await db.inboxMessage.findMany({
    where: { brandId },
    orderBy: { createdAt: "asc" },
    take: 500,
  });

  // Group into threads by fromNumber
  type Thread = {
    key: string;
    fromNumber: string;
    fromName: string | null;
    channel: string;
    lastAt: string;
    unread: number;
    messages: typeof messages;
    intent: { intent: Intent; label: string };
  };
  const map = new Map<string, Thread>();
  for (const m of messages) {
    const key = m.fromNumber;
    const t = map.get(key) ?? {
      key,
      fromNumber: m.fromNumber,
      fromName: m.fromName,
      channel: m.channel,
      lastAt: m.createdAt.toISOString(),
      unread: 0,
      messages: [],
      intent: { intent: "general" as Intent, label: "Umum" },
    };
    t.messages.push(m);
    if (m.createdAt.toISOString() > t.lastAt) t.lastAt = m.createdAt.toISOString();
    if (m.direction === "inbound") t.unread += 1;
    if (m.fromName && !t.fromName) t.fromName = m.fromName;
    // Detect intent from latest inbound message
    if (m.direction === "inbound") {
      t.intent = detectIntent(m.messageText);
    }
    map.set(key, t);
  }
  const threads = Array.from(map.values()).sort(
    (a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime()
  );

  // Fetch lead info for each thread
  const leads = await db.lead.findMany({
    where: { brandId },
    select: { id: true, phone: true, stage: true },
  });
  const leadByPhone = new Map(leads.map((l) => [l.phone, l]));

  return NextResponse.json({
    messages,
    threads: threads.map((t) => ({
      ...t,
      leadStage: leadByPhone.get(t.fromNumber)?.stage ?? null,
    })),
  });
}

// ─── POST ────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const { brandId, channel, fromNumber, fromName, messageText } = body as {
    brandId: string;
    channel: string;
    fromNumber: string;
    fromName?: string;
    messageText: string;
  };

  if (!brandId || !channel || !fromNumber?.trim() || !messageText?.trim()) {
    return NextResponse.json({ error: "brandId, channel, fromNumber, messageText wajib" }, { status: 400 });
  }
  if (channel !== "wa" && channel !== "telegram") {
    return NextResponse.json({ error: "channel harus 'wa' atau 'telegram'" }, { status: 400 });
  }

  const brand = await db.brand.findUnique({ where: { id: brandId } });
  if (!brand || brand.userId !== userId) {
    return NextResponse.json({ error: "brand tidak ditemukan" }, { status: 404 });
  }

  // ── Detect intent ──────────────────────────────────────────────────────
  const { intent, label } = detectIntent(messageText);

  // Auto-create or update lead
  const existingLead = await db.lead.findFirst({
    where: { brandId, phone: fromNumber },
    orderBy: { createdAt: "desc" },
  });
  let leadId: string | null = existingLead?.id ?? null;

  if (!existingLead) {
    const initialStage = intent === "buying_intent" || intent === "product_inquiry" ? "Negosiasi" : "Baru";
    const newLead = await db.lead.create({
      data: {
        brandId,
        name: fromName?.trim() || fromNumber,
        phone: fromNumber,
        sourceChannel: channel,
        stage: initialStage,
        lastContactedAt: new Date(),
      },
    });
    leadId = newLead.id;
  } else {
    const newStage = stageForIntent(intent, existingLead.stage);
    await db.lead.update({
      where: { id: existingLead.id },
      data: {
        lastContactedAt: new Date(),
        ...(newStage ? { stage: newStage } : {}),
      },
    });
  }

  const message = await db.inboxMessage.create({
    data: {
      brandId,
      userId,
      channel,
      fromNumber,
      fromName: fromName?.trim() || null,
      messageText: messageText.trim(),
      direction: "inbound",
      leadId,
    },
  });

  return NextResponse.json({ message, leadId, intent: { intent, label } });
}
