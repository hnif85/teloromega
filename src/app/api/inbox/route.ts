// /api/inbox — list & simulate inbound messages
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

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

  // Group into threads by fromNumber (inbound) or recipient number (outbound)
  type Thread = {
    key: string;
    fromNumber: string;
    fromName: string | null;
    channel: string;
    lastAt: string;
    unread: number;
    messages: typeof messages;
  };
  const map = new Map<string, Thread>();
  for (const m of messages) {
    const key = m.direction === "inbound" ? m.fromNumber : m.fromNumber; // outbound stores recipient in fromNumber
    const t = map.get(key) ?? {
      key,
      fromNumber: m.fromNumber,
      fromName: m.fromName,
      channel: m.channel,
      lastAt: m.createdAt.toISOString(),
      unread: 0,
      messages: [],
    };
    t.messages.push(m);
    if (m.createdAt.toISOString() > t.lastAt) t.lastAt = m.createdAt.toISOString();
    if (m.direction === "inbound") t.unread += 1;
    if (m.fromName && !t.fromName) t.fromName = m.fromName;
    map.set(key, t);
  }
  const threads = Array.from(map.values()).sort(
    (a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime()
  );

  return NextResponse.json({ messages, threads });
}

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

  // Auto-create lead if fromNumber is new, or attach to existing lead
  const existingLead = await db.lead.findFirst({
    where: { brandId, phone: fromNumber },
    orderBy: { createdAt: "desc" },
  });
  let leadId: string | null = existingLead?.id ?? null;
  if (!existingLead) {
    const newLead = await db.lead.create({
      data: {
        brandId,
        name: fromName?.trim() || fromNumber,
        phone: fromNumber,
        sourceChannel: channel,
        stage: "Baru",
        lastContactedAt: new Date(),
      },
    });
    leadId = newLead.id;
  } else {
    await db.lead.update({
      where: { id: existingLead.id },
      data: { lastContactedAt: new Date() },
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

  return NextResponse.json({ message, leadId });
}
