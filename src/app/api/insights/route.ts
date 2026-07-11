// /api/insights — aggregated analytics for the Insights section
// Returns revenue trend, top products, customer growth, lead funnel,
// content distribution, sales-by-day pattern, key metrics, and recent activity.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

// ─── Response types ───────────────────────────────────────────
export interface RevenueTrendPoint {
  month: string; // "Jan", "Feb", ...
  revenue: number;
  orders: number;
  avgOrderValue: number;
}
export interface TopProduct {
  productId: string;
  name: string;
  unitsSold: number;
  revenue: number;
  margin: number; // absolute margin (revenue - cost)
}
export interface CustomerGrowthPoint {
  month: string;
  newCustomers: number;
  totalCustomers: number;
}
export interface LeadFunnelStage {
  stage: string;
  count: number;
  conversionRate: number;
}
export interface ContentByType {
  type: string;
  count: number;
  pct: number;
}
export interface SalesByDay {
  day: string;
  sales: number;
}
export interface InsightsMetrics {
  avgOrderValue: number;
  repeatCustomerRate: number;
  conversionRate: number;
  avgMarginPct: number;
  revenueGrowthPct: number;
  inventoryValue: number;
}
export interface RecentActivityItem {
  type: "order" | "payment" | "lead" | "content" | "research" | "transaction";
  description: string;
  amount?: number;
  timestamp: string;
}
export interface InsightsResponse {
  revenueTrend: RevenueTrendPoint[];
  topProducts: TopProduct[];
  customerGrowth: CustomerGrowthPoint[];
  leadFunnel: LeadFunnelStage[];
  contentByType: ContentByType[];
  salesByDay: SalesByDay[];
  metrics: InsightsMetrics;
  recentActivity: RecentActivityItem[];
}

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const DAY_DISPLAY = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"]; // JS getDay(): 0=Sunday

interface OrderItemParsed {
  productId: string;
  name: string;
  qty: number;
  price: number;
  type?: string;
}

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const brandId = req.nextUrl.searchParams.get("brandId");
  if (!brandId) {
    return NextResponse.json(emptyInsights(), { status: 200 });
  }

  const brand = await db.brand.findUnique({ where: { id: brandId } });
  if (!brand || brand.userId !== userId) {
    return NextResponse.json({ error: "brand tidak ditemukan" }, { status: 404 });
  }

  // ── Date ranges ─────────────────────────────────────────────
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  // ── Parallel base queries ───────────────────────────────────
  const [
    incomeTxAll,
    ordersAll,
    leadsAll,
    contentAll,
    customersAll,
    productsAll,
    researchRecent,
    paymentsRecent,
    transactionsRecent,
    leadsRecent,
    contentRecent,
    ordersRecent,
  ] = await Promise.all([
    db.transaction.findMany({
      where: { brandId, type: "income", date: { gte: sixMonthsAgo } },
      select: { id: true, amount: true, date: true, costAmount: true, category: true, description: true },
    }),
    db.order.findMany({
      where: { brandId, createdAt: { gte: sixMonthsAgo } },
      select: {
        id: true,
        items: true,
        totalAmount: true,
        status: true,
        createdAt: true,
        customer: { select: { name: true } },
      },
    }),
    db.lead.findMany({
      where: { brandId },
      select: { id: true, stage: true, name: true, createdAt: true },
    }),
    db.content.findMany({
      where: { brandId },
      select: { id: true, type: true, platform: true, createdAt: true, productId: true },
    }),
    db.customer.findMany({
      where: { brandId },
      select: { id: true, createdAt: true, totalOrders: true },
    }),
    db.product.findMany({
      where: { brandId },
      select: { id: true, name: true, price: true, costPrice: true, stock: true, type: true },
    }),
    db.research.findMany({
      where: { brandId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, query: true, intent: true, createdAt: true },
    }),
    db.payment.findMany({
      where: { order: { brandId } },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { order: { select: { id: true, customer: { select: { name: true } } } } },
    }),
    db.transaction.findMany({
      where: { brandId },
      orderBy: { date: "desc" },
      take: 5,
      select: { id: true, type: true, amount: true, category: true, description: true, date: true },
    }),
    db.lead.findMany({
      where: { brandId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, stage: true, sourceChannel: true, createdAt: true },
    }),
    db.content.findMany({
      where: { brandId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, type: true, platform: true, createdAt: true, product: { select: { name: true } } },
    }),
    db.order.findMany({
      where: { brandId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        totalAmount: true,
        status: true,
        createdAt: true,
        customer: { select: { name: true } },
      },
    }),
  ]);

  // ── Build 6-month revenue trend ─────────────────────────────
  const buckets: { key: string; label: string; year: number; month: number; revenue: number; orders: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: MONTH_SHORT[d.getMonth()],
      year: d.getFullYear(),
      month: d.getMonth(),
      revenue: 0,
      orders: 0,
    });
  }

  for (const t of incomeTxAll) {
    const k = `${t.date.getFullYear()}-${t.date.getMonth()}`;
    const b = buckets.find((x) => x.key === k);
    if (b) b.revenue += t.amount;
  }
  for (const o of ordersAll) {
    const k = `${o.createdAt.getFullYear()}-${o.createdAt.getMonth()}`;
    const b = buckets.find((x) => x.key === k);
    if (b) b.orders += 1;
  }

  const revenueTrend: RevenueTrendPoint[] = buckets.map((b) => ({
    month: b.label,
    revenue: b.revenue,
    orders: b.orders,
    avgOrderValue: b.orders > 0 ? Math.round(b.revenue / b.orders) : 0,
  }));

  // ── Top products ────────────────────────────────────────────
  const productMap = new Map(productsAll.map((p) => [p.id, p]));
  const productAgg = new Map<string, { unitsSold: number; revenue: number; cost: number }>();
  for (const o of ordersAll) {
    if (o.status === "Dibatalkan") continue;
    let items: OrderItemParsed[] = [];
    try {
      items = JSON.parse(o.items) as OrderItemParsed[];
    } catch {
      continue;
    }
    if (!Array.isArray(items)) continue;
    for (const it of items) {
      const pid = it.productId;
      if (!pid) continue;
      const qty = Math.max(1, Number(it.qty) || 1);
      const price = Number(it.price) || 0;
      const prod = productMap.get(pid);
      const cost = prod?.costPrice != null ? prod.costPrice * qty : 0;
      const cur = productAgg.get(pid) ?? { unitsSold: 0, revenue: 0, cost: 0 };
      cur.unitsSold += qty;
      cur.revenue += price * qty;
      cur.cost += cost;
      productAgg.set(pid, cur);
    }
  }

  const topProducts: TopProduct[] = Array.from(productAgg.entries())
    .map(([pid, agg]) => {
      const prod = productMap.get(pid);
      const revenue = agg.revenue;
      const margin = revenue - agg.cost;
      return {
        productId: pid,
        name: prod?.name ?? "Produk tidak diketahui",
        unitsSold: agg.unitsSold,
        revenue,
        margin,
      };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // ── Customer growth ─────────────────────────────────────────
  const customerBuckets = buckets.map((b) => ({
    key: b.key,
    label: b.label,
    newCustomers: 0,
  }));
  const customersBeforeWindow = customersAll.filter(
    (c) => new Date(c.createdAt) < sixMonthsAgo
  ).length;

  for (const c of customersAll) {
    const d = new Date(c.createdAt);
    if (d < sixMonthsAgo) continue;
    const k = `${d.getFullYear()}-${d.getMonth()}`;
    const b = customerBuckets.find((x) => x.key === k);
    if (b) b.newCustomers += 1;
  }
  let runningTotal = customersBeforeWindow;
  const customerGrowth: CustomerGrowthPoint[] = customerBuckets.map((b) => {
    runningTotal += b.newCustomers;
    return {
      month: b.label,
      newCustomers: b.newCustomers,
      totalCustomers: runningTotal,
    };
  });

  // ── Lead funnel ─────────────────────────────────────────────
  const stageOrder = ["Baru", "Negosiasi", "Deal", "Closed"];
  const stageCounts: Record<string, number> = { Baru: 0, Negosiasi: 0, Deal: 0, Closed: 0 };
  for (const l of leadsAll) {
    stageCounts[l.stage] = (stageCounts[l.stage] ?? 0) + 1;
  }
  const totalLeads = leadsAll.length;
  const leadFunnel: LeadFunnelStage[] = stageOrder.map((stage, idx) => {
    const count = stageCounts[stage] ?? 0;
    const prevCount = idx === 0 ? totalLeads : stageCounts[stageOrder[idx - 1]] ?? 0;
    const conversionRate = prevCount > 0 ? Math.round((count / prevCount) * 100) : 0;
    return { stage, count, conversionRate };
  });

  // ── Content by type ─────────────────────────────────────────
  const contentTypeCounts: Record<string, number> = {};
  for (const c of contentAll) {
    contentTypeCounts[c.type] = (contentTypeCounts[c.type] ?? 0) + 1;
  }
  const totalContent = contentAll.length;
  const contentByType: ContentByType[] = Object.entries(contentTypeCounts)
    .map(([type, count]) => ({
      type,
      count,
      pct: totalContent > 0 ? Math.round((count / totalContent) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // ── Sales by day of week ────────────────────────────────────
  const dayBuckets = DAY_DISPLAY.map((day) => ({ day, sales: 0 }));
  for (const t of incomeTxAll) {
    const jsDay = t.date.getDay(); // 0=Sun, 6=Sat
    dayBuckets[jsDay].sales += t.amount;
  }
  const salesByDay: SalesByDay[] = [
    dayBuckets[1], // Senin
    dayBuckets[2],
    dayBuckets[3],
    dayBuckets[4],
    dayBuckets[5],
    dayBuckets[6],
    dayBuckets[0], // Minggu
  ];

  // ── Key metrics ─────────────────────────────────────────────
  const ordersThisMonth = ordersAll.filter(
    (o) => o.createdAt >= startOfThisMonth && o.status !== "Dibatalkan"
  );
  const revenueThisMonth = ordersThisMonth.reduce((sum, o) => sum + o.totalAmount, 0);
  const avgOrderValue =
    ordersThisMonth.length > 0 ? Math.round(revenueThisMonth / ordersThisMonth.length) : 0;

  const customersWithMultipleOrders = customersAll.filter((c) => (c.totalOrders ?? 0) > 1).length;
  const repeatCustomerRate =
    customersAll.length > 0 ? Math.round((customersWithMultipleOrders / customersAll.length) * 100) : 0;

  const dealsCount = leadsAll.filter((l) => l.stage === "Deal" || l.stage === "Closed").length;
  const conversionRate = totalLeads > 0 ? Math.round((dealsCount / totalLeads) * 100) : 0;

  const totalRevenueTop = topProducts.reduce((s, p) => s + p.revenue, 0);
  const totalMarginTop = topProducts.reduce((s, p) => s + p.margin, 0);
  const avgMarginPct = totalRevenueTop > 0 ? Math.round((totalMarginTop / totalRevenueTop) * 100) : 0;

  const revenueThis = incomeTxAll
    .filter((t) => t.date >= startOfThisMonth)
    .reduce((s, t) => s + t.amount, 0);
  const revenueLast = incomeTxAll
    .filter((t) => t.date >= startOfLastMonth && t.date <= endOfLastMonth)
    .reduce((s, t) => s + t.amount, 0);
  const revenueGrowthPct =
    revenueLast > 0
      ? Math.round(((revenueThis - revenueLast) / revenueLast) * 100)
      : revenueThis > 0
        ? 100
        : 0;

  const inventoryValue = productsAll
    .filter((p) => p.type === "barang" && p.stock != null && p.costPrice != null)
    .reduce((s, p) => s + (p.stock ?? 0) * (p.costPrice ?? 0), 0);

  const metrics: InsightsMetrics = {
    avgOrderValue,
    repeatCustomerRate,
    conversionRate,
    avgMarginPct,
    revenueGrowthPct,
    inventoryValue,
  };

  // ── Recent activity feed ────────────────────────────────────
  const activity: RecentActivityItem[] = [];

  for (const o of ordersRecent) {
    activity.push({
      type: "order",
      description: `Order ${o.customer?.name ?? "Tanpa nama"} · ${o.status}`,
      amount: o.totalAmount,
      timestamp: o.createdAt.toISOString(),
    });
  }
  for (const p of paymentsRecent) {
    activity.push({
      type: "payment",
      description: `Pembayaran ${p.method} dari ${p.order?.customer?.name ?? "—"}`,
      amount: p.amount,
      timestamp: p.createdAt.toISOString(),
    });
  }
  for (const l of leadsRecent) {
    activity.push({
      type: "lead",
      description: `Lead baru: ${l.name} via ${l.sourceChannel}`,
      timestamp: l.createdAt.toISOString(),
    });
  }
  for (const c of contentRecent) {
    activity.push({
      type: "content",
      description: `Konten ${c.type}${c.platform ? ` untuk ${c.platform}` : ""}${c.product ? ` · ${c.product.name}` : ""}`,
      timestamp: c.createdAt.toISOString(),
    });
  }
  for (const r of researchRecent) {
    activity.push({
      type: "research",
      description: `Riset: ${r.query}`,
      timestamp: r.createdAt.toISOString(),
    });
  }
  for (const t of transactionsRecent) {
    activity.push({
      type: "transaction",
      description: `${t.type === "income" ? "Pemasukan" : "Pengeluaran"} ${t.category}${t.description ? ` · ${t.description}` : ""}`,
      amount: t.amount,
      timestamp: t.date.toISOString(),
    });
  }

  activity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const recentActivity = activity.slice(0, 10);

  return NextResponse.json<InsightsResponse>({
    revenueTrend,
    topProducts,
    customerGrowth,
    leadFunnel,
    contentByType,
    salesByDay,
    metrics,
    recentActivity,
  });
}

function emptyInsights(): InsightsResponse {
  return {
    revenueTrend: [],
    topProducts: [],
    customerGrowth: [],
    leadFunnel: [],
    contentByType: [],
    salesByDay: [],
    metrics: {
      avgOrderValue: 0,
      repeatCustomerRate: 0,
      conversionRate: 0,
      avgMarginPct: 0,
      revenueGrowthPct: 0,
      inventoryValue: 0,
    },
    recentActivity: [],
  };
}
