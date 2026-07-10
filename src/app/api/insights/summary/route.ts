// /api/insights/summary — AI-generated business summary
// Charges 3 credits (reuses keuangan.proyeksi action key for analytical actions).
// Calls llmJson with insights data; on failure returns a derived fallback summary.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { chargeCredit } from "@/lib/credit";
import { llmJson } from "@/lib/ai";

export const dynamic = "force-dynamic";

export interface AISummary {
  headline: string;
  strengths: string[];
  concerns: string[];
  recommendations: string[];
  healthScore: number; // 0-100
  trend: "up" | "down" | "stable";
}

export interface SummaryResponse {
  summary: AISummary;
  balanceAfter: number;
  usedFallback: boolean;
}

interface OrderItemParsed {
  productId: string;
  name: string;
  qty: number;
  price: number;
  type?: string;
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const { brandId } = body as { brandId?: string };

  if (!brandId) {
    return NextResponse.json({ error: "brandId wajib" }, { status: 400 });
  }

  const brand = await db.brand.findUnique({ where: { id: brandId } });
  if (!brand || brand.userId !== userId) {
    return NextResponse.json({ error: "brand tidak ditemukan" }, { status: 404 });
  }

  // ── Charge 3 credits (keuangan.proyeksi — analytical action) ──
  const charge = await chargeCredit({
    userId,
    brandId,
    actionKey: "keuangan.proyeksi",
  });
  if (!charge.ok) {
    return NextResponse.json(
      { error: "Credit tidak cukup untuk ringkasan AI (butuh 3 credit)", reason: charge.reason },
      { status: 402 }
    );
  }

  // ── Gather insights data ────────────────────────────────────
  const data = await gatherInsightsForAI(brandId);

  // ── Try LLM, fall back to derived summary ───────────────────
  let summary: AISummary;
  let usedFallback = false;
  try {
    const sys = `Kamu adalah konsultan bisnis UMKM Indonesia yang berpengalaman. Analisis data bisnis berikut dan berikan ringkasan dalam Bahasa Indonesia yang hangat, konkret, dan action-oriented.

Wajib return JSON dengan shape PERSIS seperti ini:
{
  "headline": string (1 kalimat ringkasan kesehatan bisnis, maks 25 kata),
  "strengths": string[] (2-3 observasi positif, konkret dengan angka),
  "concerns": string[] (2-3 area yang perlu perhatian, konkret),
  "recommendations": string[] (3-4 langkah aksi berikutnya, konkret dan bisa dieksekusi UMKM),
  "healthScore": number (0-100, skor kesehatan bisnis),
  "trend": "up" | "down" | "stable"
}

Gunakan format Rupiah "Rp X" untuk angka mata uang. Selalu sertakan angka spesifik dari data. Jangan gunakan placeholder. Jangan tambahkan field lain.`;

    const usr = JSON.stringify({
      brand: { name: brand.name, category: brand.category },
      metrics: data.metrics,
      revenueTrend: data.revenueTrend,
      topProducts: data.topProducts,
      leadFunnel: data.leadFunnel,
      customerGrowth: data.customerGrowth,
      recentActivityCount: data.recentActivityCount,
    });

    summary = await llmJson<AISummary>(
      [
        { role: "system", content: sys },
        { role: "user", content: usr },
      ],
      { temperature: 0.4, max_tokens: 1500 }
    );

    // Normalize/validate LLM output
    summary = normalizeSummary(summary);
  } catch {
    usedFallback = true;
    summary = deriveFallbackSummary(brand.name, data);
  }

  return NextResponse.json<SummaryResponse>({
    summary,
    balanceAfter: charge.balanceAfter,
    usedFallback,
  });
}

// ─── Helpers ─────────────────────────────────────────────────

interface InsightsForAI {
  metrics: {
    avgOrderValue: number;
    repeatCustomerRate: number;
    conversionRate: number;
    avgMarginPct: number;
    revenueGrowthPct: number;
    inventoryValue: number;
    totalRevenueThisMonth: number;
    totalRevenueLastMonth: number;
    totalCustomers: number;
    newCustomersThisMonth: number;
    totalLeads: number;
    dealsCount: number;
    totalOrders: number;
  };
  revenueTrend: { month: string; revenue: number; orders: number }[];
  topProducts: { name: string; unitsSold: number; revenue: number; margin: number }[];
  leadFunnel: { stage: string; count: number; conversionRate: number }[];
  customerGrowth: { month: string; newCustomers: number; totalCustomers: number }[];
  recentActivityCount: number;
}

async function gatherInsightsForAI(brandId: string): Promise<InsightsForAI> {
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  const [incomeTx, orders, leads, customers, products] = await Promise.all([
    db.transaction.findMany({
      where: { brandId, type: "income", date: { gte: sixMonthsAgo } },
      select: { amount: true, date: true },
    }),
    db.order.findMany({
      where: { brandId, createdAt: { gte: sixMonthsAgo } },
      select: { id: true, items: true, totalAmount: true, status: true, createdAt: true },
    }),
    db.lead.findMany({
      where: { brandId },
      select: { id: true, stage: true },
    }),
    db.customer.findMany({
      where: { brandId },
      select: { id: true, createdAt: true, totalOrders: true },
    }),
    db.product.findMany({
      where: { brandId },
      select: { id: true, name: true, price: true, costPrice: true, stock: true, type: true },
    }),
  ]);

  // Revenue trend
  const months: { key: string; label: string; revenue: number; orders: number }[] = [];
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: monthNames[d.getMonth()],
      revenue: 0,
      orders: 0,
    });
  }
  for (const t of incomeTx) {
    const k = `${t.date.getFullYear()}-${t.date.getMonth()}`;
    const b = months.find((x) => x.key === k);
    if (b) b.revenue += t.amount;
  }
  for (const o of orders) {
    const k = `${o.createdAt.getFullYear()}-${o.createdAt.getMonth()}`;
    const b = months.find((x) => x.key === k);
    if (b) b.orders += 1;
  }

  // Top products
  const productMap = new Map(products.map((p) => [p.id, p]));
  const productAgg = new Map<string, { unitsSold: number; revenue: number; cost: number }>();
  for (const o of orders) {
    if (o.status === "Dibatalkan") continue;
    let items: OrderItemParsed[] = [];
    try {
      items = JSON.parse(o.items) as OrderItemParsed[];
    } catch {
      continue;
    }
    if (!Array.isArray(items)) continue;
    for (const it of items) {
      const qty = Math.max(1, Number(it.qty) || 1);
      const price = Number(it.price) || 0;
      const prod = productMap.get(it.productId);
      const cost = prod?.costPrice != null ? prod.costPrice * qty : 0;
      const cur = productAgg.get(it.productId) ?? { unitsSold: 0, revenue: 0, cost: 0 };
      cur.unitsSold += qty;
      cur.revenue += price * qty;
      cur.cost += cost;
      productAgg.set(it.productId, cur);
    }
  }
  const topProducts = Array.from(productAgg.entries())
    .map(([pid, agg]) => {
      const prod = productMap.get(pid);
      return {
        name: prod?.name ?? "Produk",
        unitsSold: agg.unitsSold,
        revenue: agg.revenue,
        margin: agg.revenue - agg.cost,
      };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 3);

  // Lead funnel
  const stageOrder = ["Baru", "Negosiasi", "Deal", "Closed"];
  const stageCounts: Record<string, number> = { Baru: 0, Negosiasi: 0, Deal: 0, Closed: 0 };
  for (const l of leads) {
    stageCounts[l.stage] = (stageCounts[l.stage] ?? 0) + 1;
  }
  const totalLeads = leads.length;
  const leadFunnel = stageOrder.map((stage, idx) => {
    const count = stageCounts[stage] ?? 0;
    const prevCount = idx === 0 ? totalLeads : stageCounts[stageOrder[idx - 1]] ?? 0;
    const conversionRate = prevCount > 0 ? Math.round((count / prevCount) * 100) : 0;
    return { stage, count, conversionRate };
  });

  // Customer growth
  const customersBeforeWindow = customers.filter((c) => new Date(c.createdAt) < sixMonthsAgo).length;
  const custBuckets = months.map((m) => ({ ...m, newCustomers: 0 }));
  for (const c of customers) {
    const d = new Date(c.createdAt);
    if (d < sixMonthsAgo) continue;
    const k = `${d.getFullYear()}-${d.getMonth()}`;
    const b = custBuckets.find((x) => x.key === k);
    if (b) b.newCustomers += 1;
  }
  let runningTotal = customersBeforeWindow;
  const customerGrowth = custBuckets.map((b) => {
    runningTotal += b.newCustomers;
    return { month: b.label, newCustomers: b.newCustomers, totalCustomers: runningTotal };
  });

  // Metrics
  const revenueThis = incomeTx
    .filter((t) => t.date >= startOfThisMonth)
    .reduce((s, t) => s + t.amount, 0);
  const revenueLast = incomeTx
    .filter((t) => t.date >= startOfLastMonth && t.date <= endOfLastMonth)
    .reduce((s, t) => s + t.amount, 0);
  const revenueGrowthPct =
    revenueLast > 0
      ? Math.round(((revenueThis - revenueLast) / revenueLast) * 100)
      : revenueThis > 0
        ? 100
        : 0;

  const ordersThisMonth = orders.filter(
    (o) => o.createdAt >= startOfThisMonth && o.status !== "Dibatalkan"
  );
  const avgOrderValue =
    ordersThisMonth.length > 0
      ? Math.round(ordersThisMonth.reduce((s, o) => s + o.totalAmount, 0) / ordersThisMonth.length)
      : 0;

  const customersWithMultiple = customers.filter((c) => (c.totalOrders ?? 0) > 1).length;
  const repeatCustomerRate =
    customers.length > 0 ? Math.round((customersWithMultiple / customers.length) * 100) : 0;

  const dealsCount = leads.filter((l) => l.stage === "Deal" || l.stage === "Closed").length;
  const conversionRate = totalLeads > 0 ? Math.round((dealsCount / totalLeads) * 100) : 0;

  const totalRevenueTop = topProducts.reduce((s, p) => s + p.revenue, 0);
  const totalMarginTop = topProducts.reduce((s, p) => s + p.margin, 0);
  const avgMarginPct = totalRevenueTop > 0 ? Math.round((totalMarginTop / totalRevenueTop) * 100) : 0;

  const inventoryValue = products
    .filter((p) => p.type === "barang" && p.stock != null && p.costPrice != null)
    .reduce((s, p) => s + (p.stock ?? 0) * (p.costPrice ?? 0), 0);

  const newCustomersThisMonth = customers.filter((c) => new Date(c.createdAt) >= startOfThisMonth).length;

  // Recent activity count (rough — orders this week)
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentActivityCount = orders.filter((o) => o.createdAt >= weekAgo).length;

  return {
    metrics: {
      avgOrderValue,
      repeatCustomerRate,
      conversionRate,
      avgMarginPct,
      revenueGrowthPct,
      inventoryValue,
      totalRevenueThisMonth: revenueThis,
      totalRevenueLastMonth: revenueLast,
      totalCustomers: customers.length,
      newCustomersThisMonth,
      totalLeads,
      dealsCount,
      totalOrders: orders.length,
    },
    revenueTrend: months.map((m) => ({ month: m.label, revenue: m.revenue, orders: m.orders })),
    topProducts,
    leadFunnel,
    customerGrowth,
    recentActivityCount,
  };
}

function normalizeSummary(s: AISummary): AISummary {
  return {
    headline: typeof s.headline === "string" && s.headline.trim() ? s.headline.trim() : "Bisnis dalam kondisi stabil.",
    strengths: Array.isArray(s.strengths) ? s.strengths.filter((x) => typeof x === "string").slice(0, 3) : [],
    concerns: Array.isArray(s.concerns) ? s.concerns.filter((x) => typeof x === "string").slice(0, 3) : [],
    recommendations: Array.isArray(s.recommendations)
      ? s.recommendations.filter((x) => typeof x === "string").slice(0, 4)
      : [],
    healthScore:
      typeof s.healthScore === "number" && Number.isFinite(s.healthScore)
        ? Math.max(0, Math.min(100, Math.round(s.healthScore)))
        : 50,
    trend: s.trend === "up" || s.trend === "down" || s.trend === "stable" ? s.trend : "stable",
  };
}

function rp(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}

// ─── Fallback: derive insights from actual data ──────────────
function deriveFallbackSummary(brandName: string, data: InsightsForAI): AISummary {
  const m = data.metrics;
  const strengths: string[] = [];
  const concerns: string[] = [];
  const recommendations: string[] = [];

  // Strengths
  if (m.revenueGrowthPct > 10) {
    strengths.push(`Pendapatan naik ${m.revenueGrowthPct}% bulan ini (${rp(m.totalRevenueLastMonth)} → ${rp(m.totalRevenueThisMonth)}).`);
  } else if (m.totalRevenueThisMonth > 0) {
    strengths.push(`Pendapatan bulan ini ${rp(m.totalRevenueThisMonth)} dari ${m.totalOrders} order.`);
  }
  if (m.avgMarginPct >= 30) {
    strengths.push(`Margin produk rata-rata ${m.avgMarginPct}% — sehat untuk UMKM.`);
  } else if (topProductMargin(data) >= 30) {
    strengths.push(`Produk terlaris memiliki margin ${topProductMargin(data)}%.`);
  }
  if (m.repeatCustomerRate >= 30) {
    strengths.push(`${m.repeatCustomerRate}% pelanggan sudah repeat order — loyalitas bagus.`);
  } else if (m.totalCustomers > 0) {
    strengths.push(`Sudah punya ${m.totalCustomers} pelanggan terdaftar.`);
  }
  if (data.topProducts.length > 0) {
    const top = data.topProducts[0];
    strengths.push(`Produk terlaris: ${top.name} (${top.unitsSold} unit, omzet ${rp(top.revenue)}).`);
  }
  if (m.conversionRate >= 30) {
    strengths.push(`Konversi lead ke deal ${m.conversionRate}% — efektif.`);
  }
  // Ensure at least 2 strengths
  if (strengths.length < 2) {
    strengths.push(`${brandName} sudah punya dasar data yang cukup untuk dianalisis.`);
  }

  // Concerns
  if (m.revenueGrowthPct < 0) {
    concerns.push(`Pendapatan turun ${Math.abs(m.revenueGrowthPct)}% dibanding bulan lalu.`);
  } else if (m.revenueGrowthPct === 0 && m.totalRevenueThisMonth === 0) {
    concerns.push("Belum ada pendapatan tercatat bulan ini.");
  }
  if (m.conversionRate > 0 && m.conversionRate < 20) {
    concerns.push(`Konversi lead rendah (${m.conversionRate}%) — perlu improve follow-up.`);
  }
  if (m.avgMarginPct > 0 && m.avgMarginPct < 20) {
    concerns.push(`Margin rata-rata tipis (${m.avgMarginPct}%) — waspadai kenaikan biaya bahan.`);
  }
  if (m.repeatCustomerRate < 20 && m.totalCustomers > 0) {
    concerns.push(`Repeat customer rate rendah (${m.repeatCustomerRate}%) — pelanggan belum kembali.`);
  }
  if (m.inventoryValue > 0 && m.totalRevenueThisMonth === 0) {
    concerns.push(`Stok mengendap (${rp(m.inventoryValue)}) tapi belum ada penjualan bulan ini.`);
  }
  if (data.leadFunnel[0] && data.leadFunnel[0].count > 0 && data.leadFunnel[2] && data.leadFunnel[2].count === 0) {
    concerns.push(`Ada ${data.leadFunnel[0].count} lead Baru yang belum bergerak ke tahap Deal.`);
  }
  if (concerns.length === 0) {
    concerns.push("Tidak ada masalah mendesak terdeteksi — pertahankan konsistensi.");
  }

  // Recommendations
  if (m.revenueGrowthPct < 0) {
    recommendations.push("Evaluasi produk/jasa yang turun penjualan dan jalankan campaign promosi terbatas.");
  } else if (m.totalRevenueThisMonth === 0) {
    recommendations.push("Mulai jualan atau catat transaksi pertama untuk mengaktifkan analisis.");
  } else {
    recommendations.push(`Pertahankan momentum penjualan — target ${rp(Math.round(m.totalRevenueThisMonth * 1.2))} bulan depan (+20%).`);
  }
  if (m.conversionRate < 20 && m.totalLeads > 0) {
    recommendations.push("Hubungi semua lead Baru dalam 24 jam pertama untuk meningkatkan konversi.");
  }
  if (m.repeatCustomerRate < 30 && m.totalCustomers > 0) {
    recommendations.push("Buat program loyalti sederhana (mis. beli 5 gratis 1) untuk pelanggan existing.");
  }
  if (m.avgMarginPct < 25 && m.avgMarginPct > 0) {
    recommendations.push("Review harga jual — naikkan 5-10% atau negosiasi ulang harga bahan baku.");
  }
  if (data.topProducts.length > 0) {
    recommendations.push(`Fokus promosi pada ${data.topProducts[0].name} (produk terlaris) untuk maksimalkan omzet.`);
  }
  recommendations.push("Update stok dan produk secara berkala agar data insights selalu akurat.");
  // Cap at 4
  const finalRecs = recommendations.slice(0, 4);

  // Health score: weighted
  let score = 50;
  if (m.revenueGrowthPct > 10) score += 15;
  else if (m.revenueGrowthPct > 0) score += 8;
  else if (m.revenueGrowthPct < 0) score -= 15;
  if (m.avgMarginPct >= 30) score += 12;
  else if (m.avgMarginPct >= 15) score += 6;
  else if (m.avgMarginPct > 0) score -= 5;
  if (m.conversionRate >= 30) score += 10;
  else if (m.conversionRate >= 15) score += 5;
  else if (m.conversionRate > 0) score -= 5;
  if (m.repeatCustomerRate >= 30) score += 10;
  else if (m.repeatCustomerRate >= 15) score += 5;
  if (m.totalRevenueThisMonth > 0) score += 5;
  if (m.inventoryValue > 0 && m.totalRevenueThisMonth === 0) score -= 10;
  score = Math.max(0, Math.min(100, score));

  const trend: AISummary["trend"] =
    m.revenueGrowthPct > 5 ? "up" : m.revenueGrowthPct < -5 ? "down" : "stable";

  // Headline
  let headline: string;
  if (m.totalRevenueThisMonth === 0 && m.totalOrders === 0) {
    headline = `${brandName} masih dalam tahap awal — mulai catat transaksi untuk insight yang lebih akurat.`;
  } else if (score >= 70) {
    headline = `${brandName} tumbuh sehat dengan pendapatan ${rp(m.totalRevenueThisMonth)} bulan ini.`;
  } else if (score >= 40) {
    headline = `${brandName} stabil namun ada ruang perbaikan untuk meningkatkan pertumbuhan.`;
  } else {
    headline = `${brandName} perlu perhatian — beberapa metrik kunci di bawah target.`;
  }

  return {
    headline,
    strengths: strengths.slice(0, 3),
    concerns: concerns.slice(0, 3),
    recommendations: finalRecs,
    healthScore: score,
    trend,
  };
}

function topProductMargin(data: InsightsForAI): number {
  if (data.topProducts.length === 0) return 0;
  const top = data.topProducts[0];
  return top.revenue > 0 ? Math.round((top.margin / top.revenue) * 100) : 0;
}
