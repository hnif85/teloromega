// /api/activity — unified timeline of all brand events
// Merges Order, Payment, Lead, Content, Research, Transaction, Campaign, Goal
// into a single chronological feed for the Aktivitas section.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { formatRupiah } from "@/lib/constants";

export const dynamic = "force-dynamic";

// ─── Response types ───────────────────────────────────────────
export type ActivityType =
  | "order"
  | "payment"
  | "lead"
  | "content"
  | "research"
  | "transaction"
  | "campaign"
  | "goal";

export interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  amount?: number;
  status?: string;
  timestamp: string; // ISO date
  referenceId: string;
  icon: string; // emoji for the type
}

export interface ActivityResponse {
  activities: ActivityItem[];
  total: number;
}

const VALID_TYPES: ActivityType[] = [
  "order",
  "payment",
  "lead",
  "content",
  "research",
  "transaction",
  "campaign",
  "goal",
];

interface OrderItemParsed {
  productId: string;
  name: string;
  qty: number;
  price: number;
  type?: string;
}

function parseOrderItemsCount(itemsJson: string): number {
  try {
    const parsed = JSON.parse(itemsJson) as OrderItemParsed[];
    if (!Array.isArray(parsed)) return 0;
    return parsed.reduce((s, it) => s + (Number(it.qty) || 0), 0);
  } catch {
    return 0;
  }
}

function shortRef(id: string): string {
  return id.slice(-6).toUpperCase();
}

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const brandId = req.nextUrl.searchParams.get("brandId");
  if (!brandId) {
    return NextResponse.json<ActivityResponse>({ activities: [], total: 0 });
  }

  const brand = await db.brand.findUnique({ where: { id: brandId } });
  if (!brand || brand.userId !== userId) {
    return NextResponse.json({ error: "brand tidak ditemukan" }, { status: 404 });
  }

  // ── Parse query params ──────────────────────────────────────
  let limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "50", 10);
  if (isNaN(limit) || limit < 1) limit = 50;
  if (limit > 200) limit = 200;

  const typeParam = req.nextUrl.searchParams.get("type");
  let filterTypes: ActivityType[] | null = null;
  if (typeParam) {
    const requested = typeParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean) as ActivityType[];
    filterTypes = requested.filter((t) => VALID_TYPES.includes(t));
    if (filterTypes.length === 0) filterTypes = null;
  }

  // Per-model take = limit (so after merge+sort+slice we still have `limit` items
  // even if all of the most-recent events come from a single model).
  const perModelTake = limit;
  const wants = (t: ActivityType) => !filterTypes || filterTypes.includes(t);

  // ── Parallel queries across 8 models ────────────────────────
  const [
    orders,
    payments,
    leads,
    contents,
    researches,
    transactions,
    campaigns,
    goals,
  ] = await Promise.all([
    wants("order")
      ? db.order.findMany({
          where: { brandId },
          orderBy: { createdAt: "desc" },
          take: perModelTake,
          select: {
            id: true,
            items: true,
            totalAmount: true,
            status: true,
            createdAt: true,
            customer: { select: { name: true } },
            lead: { select: { name: true } },
          },
        })
      : Promise.resolve([]),
    wants("payment")
      ? db.payment.findMany({
          where: { order: { brandId } },
          orderBy: { createdAt: "desc" },
          take: perModelTake,
          include: {
            order: {
              select: {
                id: true,
                customer: { select: { name: true } },
                lead: { select: { name: true } },
              },
            },
          },
        })
      : Promise.resolve([]),
    wants("lead")
      ? db.lead.findMany({
          where: { brandId },
          orderBy: { createdAt: "desc" },
          take: perModelTake,
          select: {
            id: true,
            name: true,
            stage: true,
            sourceChannel: true,
            createdAt: true,
          },
        })
      : Promise.resolve([]),
    wants("content")
      ? db.content.findMany({
          where: { brandId },
          orderBy: { createdAt: "desc" },
          take: perModelTake,
          select: {
            id: true,
            type: true,
            platform: true,
            body: true,
            createdAt: true,
            product: { select: { name: true } },
          },
        })
      : Promise.resolve([]),
    wants("research")
      ? db.research.findMany({
          where: { brandId },
          orderBy: { createdAt: "desc" },
          take: perModelTake,
          select: {
            id: true,
            query: true,
            intent: true,
            status: true,
            createdAt: true,
          },
        })
      : Promise.resolve([]),
    wants("transaction")
      ? db.transaction.findMany({
          where: { brandId },
          orderBy: { date: "desc" },
          take: perModelTake,
          select: {
            id: true,
            type: true,
            amount: true,
            category: true,
            description: true,
            date: true,
            createdAt: true,
          },
        })
      : Promise.resolve([]),
    wants("campaign")
      ? db.campaign.findMany({
          where: { brandId },
          orderBy: { createdAt: "desc" },
          take: perModelTake,
          select: {
            id: true,
            name: true,
            channel: true,
            status: true,
            sentAt: true,
            scheduledAt: true,
            createdAt: true,
            _count: { select: { recipients: true } },
          },
        })
      : Promise.resolve([]),
    wants("goal")
      ? db.goal.findMany({
          where: { brandId },
          orderBy: { createdAt: "desc" },
          take: perModelTake,
          select: {
            id: true,
            type: true,
            period: true,
            target: true,
            current: true,
            status: true,
            createdAt: true,
          },
        })
      : Promise.resolve([]),
  ]);

  // ── Map each model → ActivityItem ───────────────────────────
  const activities: ActivityItem[] = [];

  for (const o of orders) {
    const itemCount = parseOrderItemsCount(o.items);
    const name = o.customer?.name ?? o.lead?.name ?? "Tanpa nama";
    activities.push({
      id: `order-${o.id}`,
      type: "order",
      title: `🛒 Order #${shortRef(o.id)} dibuat`,
      description: `${name} · ${itemCount} item · ${formatRupiah(o.totalAmount)}`,
      amount: o.totalAmount,
      status: o.status,
      timestamp: o.createdAt.toISOString(),
      referenceId: o.id,
      icon: "🛒",
    });
  }

  for (const p of payments) {
    const orderRef = shortRef(p.order?.id ?? "");
    const custName = p.order?.customer?.name ?? p.order?.lead?.name ?? "—";
    activities.push({
      id: `payment-${p.id}`,
      type: "payment",
      title: `💳 Pembayaran ${p.status}`,
      description: `${formatRupiah(p.amount)} · ${p.method} · Order #${orderRef} · ${custName}`,
      amount: p.amount,
      status: p.status,
      timestamp: p.createdAt.toISOString(),
      referenceId: p.id,
      icon: "💳",
    });
  }

  for (const l of leads) {
    activities.push({
      id: `lead-${l.id}`,
      type: "lead",
      title: `👥 Lead baru: ${l.name}`,
      description: `Stage ${l.stage} · via ${l.sourceChannel}`,
      status: l.stage,
      timestamp: l.createdAt.toISOString(),
      referenceId: l.id,
      icon: "👥",
    });
  }

  for (const c of contents) {
    const excerpt = (c.body ?? "")
      .replace(/[#*`>\-_]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 60);
    const parts = [c.platform ?? "—", c.product?.name, excerpt].filter(Boolean);
    activities.push({
      id: `content-${c.id}`,
      type: "content",
      title: `📝 Konten dibuat: ${c.type}`,
      description: parts.join(" · "),
      timestamp: c.createdAt.toISOString(),
      referenceId: c.id,
      icon: "📝",
    });
  }

  for (const r of researches) {
    activities.push({
      id: `research-${r.id}`,
      type: "research",
      title: `🔍 Riset selesai: ${r.query}`,
      description: `${r.intent ?? "riset"} · ${r.status}`,
      status: r.status,
      timestamp: r.createdAt.toISOString(),
      referenceId: r.id,
      icon: "🔍",
    });
  }

  for (const t of transactions) {
    const isIncome = t.type === "income";
    activities.push({
      id: `transaction-${t.id}`,
      type: "transaction",
      title: `💰 Transaksi: ${isIncome ? "Pemasukan" : "Pengeluaran"}`,
      description: `${t.category}${t.description ? ` · ${t.description}` : ""}`,
      amount: t.amount,
      timestamp: t.date.toISOString(),
      referenceId: t.id,
      icon: "💰",
    });
  }

  for (const c of campaigns) {
    const recipients = c._count?.recipients ?? 0;
    const channelLabel =
      c.channel === "wa" ? "WhatsApp" : c.channel === "email" ? "Email" : c.channel.toUpperCase();
    activities.push({
      id: `campaign-${c.id}`,
      type: "campaign",
      title: `📣 Campaign dikirim: ${c.name}`,
      description: `${channelLabel} · ${recipients} penerima · ${c.status}`,
      status: c.status,
      timestamp: (c.sentAt ?? c.scheduledAt ?? c.createdAt).toISOString(),
      referenceId: c.id,
      icon: "📣",
    });
  }

  for (const g of goals) {
    const targetLabel =
      g.type === "revenue" ? formatRupiah(Math.round(g.target)) : String(Math.round(g.target));
    activities.push({
      id: `goal-${g.id}`,
      type: "goal",
      title: `🎯 Target dibuat: ${g.type}`,
      description: `Periode ${g.period} · target ${targetLabel}`,
      status: g.status,
      timestamp: g.createdAt.toISOString(),
      referenceId: g.id,
      icon: "🎯",
    });
  }

  // ── Sort by timestamp desc, slice to `limit` ────────────────
  activities.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  const total = activities.length;
  const sliced = activities.slice(0, limit);

  return NextResponse.json<ActivityResponse>({ activities: sliced, total });
}
