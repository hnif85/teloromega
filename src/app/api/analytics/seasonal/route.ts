// /api/analytics/seasonal — Seasonal sales patterns
// Aggregates revenue & orders by month (12-month), day of week, and hour
// of day (from order createdAt). Identifies best/worst month, peak day
// and hour, and a seasonality strength rating (variance-based).
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export interface SeasonalByMonth {
  month: string;
  revenue: number;
  orders: number;
  avgOrderValue: number;
}
export interface SeasonalByDay {
  day: string;
  revenue: number;
  orders: number;
}
export interface SeasonalByHour {
  hour: string;
  orders: number;
}
export interface SeasonalResponse {
  byMonth: SeasonalByMonth[];
  byDayOfWeek: SeasonalByDay[];
  byHour: SeasonalByHour[];
  bestMonth: { month: string; revenue: number };
  worstMonth: { month: string; revenue: number };
  peakDay: { day: string; revenue: number };
  peakHour: { hour: string; orders: number };
  seasonality: "high" | "medium" | "low";
}

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
// JS getDay(): 0=Sun, 6=Sat — reorder to Mon..Sun for display
const DAY_DISPLAY = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const brandId = req.nextUrl.searchParams.get("brandId");
  if (!brandId) {
    return NextResponse.json<SeasonalResponse>(emptySeasonal(), { status: 200 });
  }

  const brand = await db.brand.findUnique({ where: { id: brandId } });
  if (!brand || brand.userId !== userId) {
    return NextResponse.json({ error: "brand tidak ditemukan" }, { status: 404 });
  }

  // ── Fetch income transactions + orders (12-month window) ───────────
  const now = new Date();
  const windowStart = new Date(now.getFullYear(), now.getMonth() - 11, 1); // 12 months incl. current

  const [incomeTx, orders] = await Promise.all([
    db.transaction.findMany({
      where: { brandId, type: "income", date: { gte: windowStart } },
      select: { id: true, amount: true, date: true },
    }),
    db.order.findMany({
      where: { brandId, status: { not: "Dibatalkan" }, createdAt: { gte: windowStart } },
      select: { id: true, totalAmount: true, createdAt: true },
    }),
  ]);

  // ── By month (12 buckets) ───────────────────────────────────────────
  const monthBuckets: { key: string; label: string; revenue: number; orders: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthBuckets.push({
      key: monthKey(d),
      label: MONTH_SHORT[d.getMonth()],
      revenue: 0,
      orders: 0,
    });
  }
  for (const t of incomeTx) {
    const k = monthKey(t.date);
    const b = monthBuckets.find((x) => x.key === k);
    if (b) b.revenue += t.amount;
  }
  for (const o of orders) {
    const k = monthKey(o.createdAt);
    const b = monthBuckets.find((x) => x.key === k);
    if (b) b.orders += 1;
  }
  const byMonth: SeasonalByMonth[] = monthBuckets.map((b) => ({
    month: b.label,
    revenue: b.revenue,
    orders: b.orders,
    avgOrderValue: b.orders > 0 ? Math.round(b.revenue / b.orders) : 0,
  }));

  // ── By day of week (Mon..Sun) ───────────────────────────────────────
  const dayBuckets = DAY_DISPLAY.map((day) => ({ day, revenue: 0, orders: 0 }));
  for (const t of incomeTx) {
    const jsDay = t.date.getDay(); // 0=Sun
    dayBuckets[jsDay].revenue += t.amount;
  }
  for (const o of orders) {
    const jsDay = new Date(o.createdAt).getDay();
    dayBuckets[jsDay].orders += 1;
  }
  // Reorder to Mon..Sun
  const order = [1, 2, 3, 4, 5, 6, 0];
  const byDayOfWeek: SeasonalByDay[] = order.map((i) => ({
    day: dayBuckets[i].day,
    revenue: dayBuckets[i].revenue,
    orders: dayBuckets[i].orders,
  }));

  // ── By hour of day (0-23) from order createdAt ──────────────────────
  const hourBuckets = Array.from({ length: 24 }, (_, h) => ({
    hour: `${String(h).padStart(2, "0")}`,
    orders: 0,
  }));
  for (const o of orders) {
    const h = new Date(o.createdAt).getHours();
    hourBuckets[h].orders += 1;
  }
  const byHour: SeasonalByHour[] = hourBuckets;

  // ── Best/worst month, peak day, peak hour ──────────────────────────
  const bestMonthEntry = [...byMonth].sort((a, b) => b.revenue - a.revenue)[0];
  const worstMonthEntry = [...byMonth].sort((a, b) => a.revenue - b.revenue)[0];
  const peakDayEntry = [...byDayOfWeek].sort((a, b) => b.revenue - a.revenue)[0];
  const peakHourEntry = [...byHour].sort((a, b) => b.orders - a.orders)[0];

  // ── Seasonality rating (coefficient of variation of monthly revenue) ─
  const revenues = byMonth.map((m) => m.revenue);
  const mean = revenues.reduce((s, r) => s + r, 0) / revenues.length;
  const variance =
    revenues.length > 0
      ? revenues.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / revenues.length
      : 0;
  const stdDev = Math.sqrt(variance);
  const cv = mean > 0 ? stdDev / mean : 0;
  let seasonality: "high" | "medium" | "low" = "low";
  if (cv >= 0.5) seasonality = "high";
  else if (cv >= 0.25) seasonality = "medium";

  return NextResponse.json<SeasonalResponse>({
    byMonth,
    byDayOfWeek,
    byHour,
    bestMonth: { month: bestMonthEntry.month, revenue: bestMonthEntry.revenue },
    worstMonth: { month: worstMonthEntry.month, revenue: worstMonthEntry.revenue },
    peakDay: { day: peakDayEntry.day, revenue: peakDayEntry.revenue },
    peakHour: { hour: peakHourEntry.hour, orders: peakHourEntry.orders },
    seasonality,
  });
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function emptySeasonal(): SeasonalResponse {
  return {
    byMonth: [],
    byDayOfWeek: [],
    byHour: [],
    bestMonth: { month: "—", revenue: 0 },
    worstMonth: { month: "—", revenue: 0 },
    peakDay: { day: "—", revenue: 0 },
    peakHour: { hour: "—", orders: 0 },
    seasonality: "low",
  };
}
