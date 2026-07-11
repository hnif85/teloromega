// /api/analytics/products — Product performance & BCG matrix
// Aggregates units sold, revenue, cost, profit per product from order
// items. Classifies each product into BCG matrix quadrants:
//   star         — high revenue + high margin
//   cash_cow     — high revenue + low margin
//   question_mark — low revenue + high margin
//   dog          — low revenue + low margin
// "High"/"low" thresholds = median split across the product set.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export type BCGQuadrant = "star" | "cash_cow" | "question_mark" | "dog";

export interface ProductPerfRow {
  id: string;
  name: string;
  type: string; // 'barang' | 'jasa'
  price: number;
  costPrice: number;
  margin: number; // absolute (price - costPrice)
  unitsSold: number;
  revenue: number;
  cost: number;
  profit: number;
  marginPct: number; // profit / revenue * 100
  orderCount: number;
  uniqueCustomers: number;
  avgQtyPerOrder: number;
  lastSoldAt: string | null;
  daysSinceLastSale: number | null;
  performance: BCGQuadrant;
}
export interface ProductPerfSummary {
  totalProducts: number;
  starProducts: number;
  cashCowProducts: number;
  avgMargin: number;
  topPerformer: { name: string; revenue: number } | null;
  underperformer: { name: string; revenue: number } | null;
}
export interface ProductPerfResponse {
  products: ProductPerfRow[];
  summary: ProductPerfSummary;
}

interface OrderItemParsed {
  productId: string;
  name: string;
  qty: number;
  price: number;
  type?: string;
}

const MS_PER_DAY = 86_400_000;

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const brandId = req.nextUrl.searchParams.get("brandId");
  if (!brandId) {
    return NextResponse.json<ProductPerfResponse>(emptyPerf(), { status: 200 });
  }

  const brand = await db.brand.findUnique({ where: { id: brandId } });
  if (!brand || brand.userId !== userId) {
    return NextResponse.json({ error: "brand tidak ditemukan" }, { status: 404 });
  }

  // ── Fetch products + all non-cancelled orders ──────────────────────
  const [products, orders] = await Promise.all([
    db.product.findMany({
      where: { brandId },
      select: { id: true, name: true, type: true, price: true, costPrice: true },
    }),
    db.order.findMany({
      where: { brandId, status: { not: "Dibatalkan" } },
      select: {
        id: true,
        items: true,
        createdAt: true,
        customerId: true,
      },
    }),
  ]);

  if (products.length === 0) {
    return NextResponse.json<ProductPerfResponse>(emptyPerf(), { status: 200 });
  }

  const productMap = new Map(products.map((p) => [p.id, p]));

  // ── Aggregate per-product metrics from order items ─────────────────
  interface Agg {
    unitsSold: number;
    revenue: number;
    cost: number;
    orderCount: number;
    customerSet: Set<string>;
    lastSoldMs: number | null;
  }
  const aggMap = new Map<string, Agg>();
  for (const p of products) {
    aggMap.set(p.id, {
      unitsSold: 0,
      revenue: 0,
      cost: 0,
      orderCount: 0,
      customerSet: new Set<string>(),
      lastSoldMs: null,
    });
  }

  for (const o of orders) {
    let items: OrderItemParsed[] = [];
    try {
      items = JSON.parse(o.items) as OrderItemParsed[];
    } catch {
      continue;
    }
    if (!Array.isArray(items)) continue;

    const productsInThisOrder = new Set<string>();
    for (const it of items) {
      const pid = it.productId;
      if (!pid) continue;
      const agg = aggMap.get(pid);
      if (!agg) continue;
      const qty = Math.max(1, Number(it.qty) || 1);
      const price = Number(it.price) || 0;
      const prod = productMap.get(pid);
      const cost = prod?.costPrice != null ? prod.costPrice * qty : 0;
      agg.unitsSold += qty;
      agg.revenue += price * qty;
      agg.cost += cost;
      productsInThisOrder.add(pid);
      if (o.customerId) agg.customerSet.add(o.customerId);
      const ms = new Date(o.createdAt).getTime();
      if (agg.lastSoldMs === null || ms > agg.lastSoldMs) agg.lastSoldMs = ms;
    }
    // orderCount = number of orders containing this product
    for (const pid of productsInThisOrder) {
      const agg = aggMap.get(pid);
      if (agg) agg.orderCount += 1;
    }
  }

  // ── Build preliminary rows ─────────────────────────────────────────
  const now = Date.now();
  const preliminary = products.map((p) => {
    const agg = aggMap.get(p.id)!;
    const price = p.price ?? 0;
    const costPrice = p.costPrice ?? 0;
    const margin = price - costPrice; // per-unit margin
    const profit = agg.revenue - agg.cost;
    const marginPct = agg.revenue > 0 ? Math.round((profit / agg.revenue) * 100) : 0;
    const avgQtyPerOrder = agg.orderCount > 0 ? Number((agg.unitsSold / agg.orderCount).toFixed(1)) : 0;
    return {
      id: p.id,
      name: p.name,
      type: p.type,
      price,
      costPrice,
      margin,
      unitsSold: agg.unitsSold,
      revenue: agg.revenue,
      cost: agg.cost,
      profit,
      marginPct,
      orderCount: agg.orderCount,
      uniqueCustomers: agg.customerSet.size,
      avgQtyPerOrder,
      lastSoldAt: agg.lastSoldMs !== null ? new Date(agg.lastSoldMs).toISOString() : null,
      daysSinceLastSale:
        agg.lastSoldMs !== null ? Math.floor((now - agg.lastSoldMs) / MS_PER_DAY) : null,
    };
  });

  // ── Compute median thresholds for revenue & marginPct ──────────────
  // Only consider products that have actually sold for the median calculation
  // so the BCG split is meaningful.
  const soldProducts = preliminary.filter((p) => p.revenue > 0);
  const revenueMedian = median(soldProducts.map((p) => p.revenue));
  const marginMedian = median(soldProducts.map((p) => p.marginPct));

  // ── Assign BCG quadrant ─────────────────────────────────────────────
  const productsOut: ProductPerfRow[] = preliminary.map((p) => {
    let performance: BCGQuadrant;
    if (p.revenue === 0) {
      // No sales — classify as dog
      performance = "dog";
    } else {
      const highRevenue = p.revenue >= revenueMedian;
      const highMargin = p.marginPct >= marginMedian;
      if (highRevenue && highMargin) performance = "star";
      else if (highRevenue && !highMargin) performance = "cash_cow";
      else if (!highRevenue && highMargin) performance = "question_mark";
      else performance = "dog";
    }
    return { ...p, performance };
  });

  // Sort by revenue desc for table display
  productsOut.sort((a, b) => b.revenue - a.revenue);

  // ── Summary ────────────────────────────────────────────────────────
  const starProducts = productsOut.filter((p) => p.performance === "star").length;
  const cashCowProducts = productsOut.filter((p) => p.performance === "cash_cow").length;
  const marginPcts = productsOut.map((p) => p.marginPct);
  const avgMargin =
    marginPcts.length > 0
      ? Math.round(marginPcts.reduce((s, m) => s + m, 0) / marginPcts.length)
      : 0;
  const topPerformer = productsOut[0]
    ? { name: productsOut[0].name, revenue: productsOut[0].revenue }
    : null;
  const underperformerCandidate = [...productsOut]
    .filter((p) => p.revenue > 0)
    .sort((a, b) => a.revenue - b.revenue)[0];
  const underperformer = underperformerCandidate
    ? { name: underperformerCandidate.name, revenue: underperformerCandidate.revenue }
    : null;

  return NextResponse.json<ProductPerfResponse>({
    products: productsOut,
    summary: {
      totalProducts: productsOut.length,
      starProducts,
      cashCowProducts,
      avgMargin,
      topPerformer,
      underperformer,
    },
  });
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function emptyPerf(): ProductPerfResponse {
  return {
    products: [],
    summary: {
      totalProducts: 0,
      starProducts: 0,
      cashCowProducts: 0,
      avgMargin: 0,
      topPerformer: null,
      underperformer: null,
    },
  };
}
