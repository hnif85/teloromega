// /api/kalender — monthly calendar of orders, payments, campaigns, receivables, payables
// Returns color-coded events for a monthly grid + aggregated stats.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export type KalenderEventType =
  | "order"
  | "payment"
  | "campaign"
  | "receivable"
  | "payable";

export interface KalenderEvent {
  id: string;
  date: string; // ISO
  type: KalenderEventType;
  title: string;
  description: string;
  amount?: number;
  status: string;
  referenceId: string;
}

export interface KalenderStats {
  totalOrders: number;
  totalPayments: number;
  totalCampaigns: number;
  totalReceivables: number;
  totalPayables: number;
  totalRevenue: number; // sum of verified payments this month
  totalDue: number; // sum of receivables + payables due this month
}

export interface KalenderResponse {
  events: KalenderEvent[];
  stats: KalenderStats;
  month: number;
  year: number;
  monthLabel: string;
}

const MONTHS_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function shortOrderRef(id: string): string {
  // Show last 5 chars of cuid for friendlier display.
  return id.slice(-5).toUpperCase();
}

function countItems(itemsJson: string): number {
  try {
    const parsed = JSON.parse(itemsJson) as unknown;
    if (Array.isArray(parsed)) return parsed.length;
    return 0;
  } catch {
    return 0;
  }
}

function formatRupiah(amount: number): string {
  return "Rp " + amount.toLocaleString("id-ID");
}

function emptyStats(): KalenderStats {
  return {
    totalOrders: 0,
    totalPayments: 0,
    totalCampaigns: 0,
    totalReceivables: 0,
    totalPayables: 0,
    totalRevenue: 0,
    totalDue: 0,
  };
}

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const brandId = sp.get("brandId");
  if (!brandId) {
    return NextResponse.json({ events: [], stats: emptyStats() });
  }

  const brand = await db.brand.findUnique({ where: { id: brandId } });
  if (!brand || brand.userId !== userId) {
    return NextResponse.json({ error: "brand tidak ditemukan" }, { status: 404 });
  }

  // Parse month/year (default to current month if missing/invalid)
  const now = new Date();
  const monthRaw = Number(sp.get("month"));
  const yearRaw = Number(sp.get("year"));
  const month =
    Number.isFinite(monthRaw) && monthRaw >= 1 && monthRaw <= 12
      ? Math.floor(monthRaw)
      : now.getMonth() + 1;
  const year =
    Number.isFinite(yearRaw) && yearRaw >= 2000 && yearRaw <= 3000
      ? Math.floor(yearRaw)
      : now.getFullYear();

  const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

  // Parallel queries across all 5 event sources
  const [orders, payments, campaigns, receivables, payables] = await Promise.all([
    db.order.findMany({
      where: {
        brandId,
        createdAt: { gte: startOfMonth, lte: endOfMonth },
      },
      include: {
        customer: { select: { name: true } },
        lead: { select: { name: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    db.payment.findMany({
      where: {
        order: { brandId },
        createdAt: { gte: startOfMonth, lte: endOfMonth },
      },
      include: {
        order: {
          select: {
            id: true,
            customer: { select: { name: true } },
            lead: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    db.campaign.findMany({
      where: {
        brandId,
        OR: [
          {
            scheduledAt: { gte: startOfMonth, lte: endOfMonth },
          },
          {
            sentAt: { gte: startOfMonth, lte: endOfMonth },
          },
        ],
      },
      orderBy: { createdAt: "asc" },
    }),
    db.receivable.findMany({
      where: {
        brandId,
        dueDate: { gte: startOfMonth, lte: endOfMonth },
      },
      orderBy: { dueDate: "asc" },
    }),
    db.payable.findMany({
      where: {
        brandId,
        dueDate: { gte: startOfMonth, lte: endOfMonth },
      },
      orderBy: { dueDate: "asc" },
    }),
  ]);

  const events: KalenderEvent[] = [];

  // Orders
  for (const o of orders) {
    const customerName = o.customer?.name ?? o.lead?.name ?? "Walk-in Customer";
    events.push({
      id: `order-${o.id}`,
      date: o.createdAt.toISOString(),
      type: "order",
      title: `Order #${shortOrderRef(o.id)} · ${customerName}`,
      description: `Order ${o.status} — ${formatRupiah(o.totalAmount)}${
        o.items ? ` · ${countItems(o.items)} item` : ""
      }`,
      amount: o.totalAmount,
      status: o.status,
      referenceId: o.id,
    });
  }

  // Payments
  for (const p of payments) {
    const customerName =
      p.order?.customer?.name ?? p.order?.lead?.name ?? "Walk-in Customer";
    events.push({
      id: `payment-${p.id}`,
      date: p.createdAt.toISOString(),
      type: "payment",
      title: `Pembayaran ${formatRupiah(p.amount)} · ${p.method}`,
      description: `${p.status} · ${customerName} · Order #${shortOrderRef(p.orderId)}`,
      amount: p.amount,
      status: p.status,
      referenceId: p.id,
    });
  }

  // Campaigns — date = scheduledAt OR sentAt (whichever falls in this month)
  for (const c of campaigns) {
    let eventDate: Date | null = null;
    if (c.scheduledAt && c.scheduledAt >= startOfMonth && c.scheduledAt <= endOfMonth) {
      eventDate = c.scheduledAt;
    } else if (c.sentAt && c.sentAt >= startOfMonth && c.sentAt <= endOfMonth) {
      eventDate = c.sentAt;
    } else {
      // Fallback: whichever exists (defensive — should not happen given the OR clause)
      eventDate = c.scheduledAt ?? c.sentAt;
    }
    if (!eventDate) continue;
    events.push({
      id: `campaign-${c.id}`,
      date: eventDate.toISOString(),
      type: "campaign",
      title: `Campaign: ${c.name}`,
      description: `Channel: ${c.channel.toUpperCase()} · ${c.status}${
        c.subject ? ` · ${c.subject}` : ""
      }`,
      status: c.status,
      referenceId: c.id,
    });
  }

  // Receivables
  for (const r of receivables) {
    events.push({
      id: `receivable-${r.id}`,
      date: r.dueDate.toISOString(),
      type: "receivable",
      title: `Piutang: ${r.customerName}`,
      description: `Jatuh tempo · ${formatRupiah(r.amount)} · ${r.status}`,
      amount: r.amount,
      status: r.status,
      referenceId: r.id,
    });
  }

  // Payables
  for (const p of payables) {
    events.push({
      id: `payable-${p.id}`,
      date: p.dueDate.toISOString(),
      type: "payable",
      title: `Hutang: ${p.supplierName}`,
      description: `Jatuh tempo · ${formatRupiah(p.amount)} · ${p.status}`,
      amount: p.amount,
      status: p.status,
      referenceId: p.id,
    });
  }

  // Sort events by date asc
  events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Stats
  const totalRevenue = payments
    .filter((p) => p.status === "Diterima")
    .reduce((sum, p) => sum + p.amount, 0);
  const totalReceivablesAmount = receivables.reduce((s, r) => s + r.amount, 0);
  const totalPayablesAmount = payables.reduce((s, p) => s + p.amount, 0);

  const stats: KalenderStats = {
    totalOrders: orders.length,
    totalPayments: payments.length,
    totalCampaigns: campaigns.length,
    totalReceivables: receivables.length,
    totalPayables: payables.length,
    totalRevenue,
    totalDue: totalReceivablesAmount + totalPayablesAmount,
  };

  return NextResponse.json({
    events,
    stats,
    month,
    year,
    monthLabel: `${MONTHS_ID[month - 1]} ${year}`,
  } as KalenderResponse);
}
