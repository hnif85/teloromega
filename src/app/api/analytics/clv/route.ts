// /api/analytics/clv — Customer Lifetime Value analysis
// Returns: average CLV, top 10 customers by lifetime spend, distribution
// buckets, retention rate (% of customers with >1 order), and average
// days between orders. predictedCLV = avgOrderValue × projectedOrders
// (projection = current order frequency sustained over a 365-day horizon).
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export interface CLVTopCustomer {
  id: string;
  name: string;
  phone: string;
  totalSpent: number;
  orderCount: number;
  avgOrderValue: number;
  firstOrder: string | null; // ISO
  lastOrder: string | null; // ISO
  daysActive: number;
  predictedCLV: number;
}
export interface CLVDistributionBucket {
  bucket: string;
  count: number;
  pct: number;
}
export interface CLVResponse {
  avgCLV: number;
  topCustomers: CLVTopCustomer[];
  distribution: CLVDistributionBucket[];
  retentionRate: number;
  avgDaysBetweenOrders: number;
}

const BUCKET_DEFS: { key: string; min: number; max: number }[] = [
  { key: "0-50rb", min: 0, max: 50_000 },
  { key: "50rb-100rb", min: 50_000, max: 100_000 },
  { key: "100rb-500rb", min: 100_000, max: 500_000 },
  { key: "500rb+", min: 500_000, max: Number.POSITIVE_INFINITY },
];

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const brandId = req.nextUrl.searchParams.get("brandId");
  if (!brandId) {
    return NextResponse.json<CLVResponse>(emptyCLV(), { status: 200 });
  }

  const brand = await db.brand.findUnique({ where: { id: brandId } });
  if (!brand || brand.userId !== userId) {
    return NextResponse.json({ error: "brand tidak ditemukan" }, { status: 404 });
  }

  // ── Fetch all customers + their orders (createdAt only) ─────────────
  const customers = await db.customer.findMany({
    where: { brandId },
    select: {
      id: true,
      name: true,
      phone: true,
      totalSpent: true,
      totalOrders: true,
      firstOrderAt: true,
      createdAt: true,
      orders: {
        where: { status: { not: "Dibatalkan" } },
        select: { id: true, createdAt: true, totalAmount: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (customers.length === 0) {
    return NextResponse.json<CLVResponse>(emptyCLV(), { status: 200 });
  }

  const now = new Date();
  const MS_PER_DAY = 86_400_000;

  // ── Build per-customer analytics ────────────────────────────────────
  interface RowInternal extends CLVTopCustomer {
    _avgGap?: number;
  }
  const rows: RowInternal[] = customers.map((c) => {
    const orderDates = c.orders
      .map((o) => new Date(o.createdAt).getTime())
      .sort((a, b) => a - b);
    const totalSpent = c.totalSpent ?? 0;
    const orderCount = c.totalOrders ?? orderDates.length;
    const avgOrderValue = orderCount > 0 ? Math.round(totalSpent / orderCount) : 0;

    const firstMs = orderDates[0] ?? (c.firstOrderAt ? new Date(c.firstOrderAt).getTime() : null);
    const lastMs = orderDates[orderDates.length - 1] ?? null;
    const firstOrder = firstMs ? new Date(firstMs).toISOString() : null;
    const lastOrder = lastMs ? new Date(lastMs).toISOString() : null;

    // daysActive — from first order (or createdAt fallback) to today
    const anchor = firstMs ?? new Date(c.createdAt).getTime();
    const daysActive = Math.max(0, Math.round((now.getTime() - anchor) / MS_PER_DAY));

    // Average days between orders
    let avgGap = 0;
    if (orderDates.length >= 2) {
      let sum = 0;
      for (let i = 1; i < orderDates.length; i++) {
        sum += orderDates[i] - orderDates[i - 1];
      }
      avgGap = sum / (orderDates.length - 1) / MS_PER_DAY;
    }

    // Projected orders over a 365-day horizon at current frequency.
    // If customer has ordered ≥2 times → frequency = orders / daysActive * 365
    // Else assume 1 more order in the next 365 days (conservative).
    let projectedOrders = 0;
    if (daysActive > 0 && orderCount >= 2) {
      const annualFrequency = (orderCount / daysActive) * 365;
      projectedOrders = Math.max(0, Math.round(annualFrequency));
    } else if (orderCount >= 1) {
      projectedOrders = 1;
    }
    const predictedCLV = avgOrderValue * projectedOrders;

    const row: RowInternal = {
      id: c.id,
      name: c.name,
      phone: c.phone,
      totalSpent,
      orderCount,
      avgOrderValue,
      firstOrder,
      lastOrder,
      daysActive,
      predictedCLV,
    };
    if (avgGap > 0) row._avgGap = avgGap;
    return row;
  });

  // Aggregate avg days between orders (across customers that have ≥2 orders)
  const gaps = rows.map((r) => r._avgGap ?? 0).filter((g) => g > 0);
  const avgDaysBetweenOrders =
    gaps.length > 0 ? Math.round(gaps.reduce((s, g) => s + g, 0) / gaps.length) : 0;

  // Strip private fields before sending
  const cleanRows: CLVTopCustomer[] = rows.map(({ _avgGap: _ignored, ...rest }) => rest);

  // ── Avg CLV (mean of totalSpent across all customers) ───────────────
  const totalRevenueAll = customers.reduce((s, c) => s + (c.totalSpent ?? 0), 0);
  const avgCLV = customers.length > 0 ? Math.round(totalRevenueAll / customers.length) : 0;

  // ── Top 10 by totalSpent ────────────────────────────────────────────
  const topCustomers = [...cleanRows].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 10);

  // ── Distribution buckets ────────────────────────────────────────────
  const distribution: CLVDistributionBucket[] = BUCKET_DEFS.map((b) => {
    const count = cleanRows.filter((r) => r.totalSpent >= b.min && r.totalSpent < b.max).length;
    return {
      bucket: b.key,
      count,
      pct: cleanRows.length > 0 ? Math.round((count / cleanRows.length) * 100) : 0,
    };
  });

  // ── Retention rate (% with >1 order) ────────────────────────────────
  const repeatCustomers = customers.filter((c) => (c.totalOrders ?? 0) > 1).length;
  const retentionRate =
    customers.length > 0 ? Math.round((repeatCustomers / customers.length) * 100) : 0;

  return NextResponse.json<CLVResponse>({
    avgCLV,
    topCustomers,
    distribution,
    retentionRate,
    avgDaysBetweenOrders,
  });
}

function emptyCLV(): CLVResponse {
  return {
    avgCLV: 0,
    topCustomers: [],
    distribution: [],
    retentionRate: 0,
    avgDaysBetweenOrders: 0,
  };
}
