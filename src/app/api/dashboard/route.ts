// /api/dashboard — aggregated stats per brand
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const brandId = req.nextUrl.searchParams.get("brandId");
  if (!brandId) {
    return NextResponse.json({
      stats: { research: 0, products: 0, salesMonth: 0, credit: 0, leads: 0, orders: 0, content: 0 },
      recentResearch: [],
      recommendations: [],
    });
  }

  const brand = await db.brand.findUnique({ where: { id: brandId } });
  if (!brand || brand.userId !== userId) {
    return NextResponse.json({ error: "brand tidak ditemukan" }, { status: 404 });
  }

  // ── Date ranges ─────────────────────────────────────────────
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // ── Parallel queries ────────────────────────────────────────
  const [
    researchCount,
    productsCount,
    salesSumAgg,
    leadsCount,
    ordersPendingCount,
    contentCount,
    recentResearch,
    contexts,
    lowStockProducts,
    pendingPaymentsOld,
    leadsStale,
  ] = await Promise.all([
    db.research.count({ where: { brandId } }),
    db.product.count({ where: { brandId, isActive: true } }),
    db.transaction.aggregate({
      where: { brandId, type: "income", date: { gte: startOfMonth } },
      _sum: { amount: true },
    }),
    db.lead.count({ where: { brandId, stage: { notIn: ["Closed", "Deal"] } } }),
    db.order.count({ where: { brandId, status: { in: ["Baru", "Diproses"] } } }),
    db.content.count({ where: { brandId } }),
    db.research.findMany({
      where: { brandId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    db.context.findMany({
      where: { brandId },
      orderBy: { createdAt: "desc" },
      take: 12,
      include: { contextUsage: true, research: true },
    }),
    db.product.findMany({
      where: {
        brandId,
        type: "barang",
        isActive: true,
        stock: { not: null },
      },
    }),
    db.payment.findMany({
      where: { status: "Menunggu", order: { brandId } },
      include: { order: true },
    }),
    db.lead.findMany({
      where: {
        brandId,
        stage: { notIn: ["Closed", "Deal"] },
        lastContactedAt: { lt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  // ── Low stock products ──────────────────────────────────────
  const lowStock = lowStockProducts.filter(
    (p) => p.minStock != null && (p.stock ?? 0) <= (p.minStock ?? 0)
  );

  // ── Build recommendations from contexts (not yet used) ──────
  type Rec = {
    id: string;
    title: string;
    source: "konten" | "toko" | "keuangan" | "leads" | "stok";
    action: "Buat" | "Review" | "Terapkan" | "Lihat" | "Hubungi" | "Restok";
    used: boolean;
    contextId?: string;
    contextModule?: string;
    payload?: unknown;
  };
  const recommendations: Rec[] = [];

  for (const c of contexts) {
    let parsed: any = {};
    try {
      parsed = JSON.parse(c.contextJson);
    } catch {
      continue;
    }
    const used = c.contextUsage.length > 0;
    if (c.targetModule === "konten" && Array.isArray(parsed.recommendations) && parsed.recommendations[0]) {
      recommendations.push({
        id: c.id,
        title: `Bikin konten ${parsed.recommendations[0].platform ?? "TikTok"}: ${parsed.recommendations[0].angle ?? "angle siap pakai"}`,
        source: "konten",
        action: "Buat",
        used,
        contextId: c.id,
        contextModule: "konten",
        payload: parsed.recommendations[0],
      });
    } else if (c.targetModule === "toko" && parsed.harga_pasar) {
      recommendations.push({
        id: c.id,
        title: `Review harga pasar: ${parsed.harga_pasar.rata_rata ?? "lihat detail"}`,
        source: "toko",
        action: "Review",
        used,
        contextId: c.id,
        contextModule: "toko",
        payload: parsed,
      });
    } else if (c.targetModule === "keuangan" && parsed.proyeksi_margin) {
      recommendations.push({
        id: c.id,
        title: `Proyeksi: ${parsed.proyeksi_margin.skenario ?? "lihat detail"}`,
        source: "keuangan",
        action: "Lihat",
        used,
        contextId: c.id,
        contextModule: "keuangan",
        payload: parsed,
      });
    }
  }

  // Stale leads (>3 days)
  if (leadsStale.length > 0) {
    recommendations.push({
      id: `leads-stale-${brandId}`,
      title: `Follow-up ${leadsStale.length} leads > 3 hari`,
      source: "leads",
      action: "Hubungi",
      used: false,
    });
  }

  // Low stock
  for (const p of lowStock.slice(0, 3)) {
    recommendations.push({
      id: `low-stock-${p.id}`,
      title: `Stok ${p.name} menipis (${p.stock ?? 0} pcs)`,
      source: "stok",
      action: "Restok",
      used: false,
      payload: { productId: p.id, name: p.name, stock: p.stock, minStock: p.minStock },
    });
  }

  return NextResponse.json({
    stats: {
      research: researchCount,
      products: productsCount,
      salesMonth: salesSumAgg._sum.amount ?? 0,
      credit: 0, // filled by client from store
      leads: leadsCount,
      orders: ordersPendingCount,
      content: contentCount,
    },
    recentResearch: recentResearch.map((r) => ({
      id: r.id,
      query: r.query,
      intent: r.intent,
      createdAt: r.createdAt,
    })),
    recommendations: recommendations.slice(0, 8),
    lowStock: lowStock.map((p) => ({
      id: p.id,
      name: p.name,
      stock: p.stock,
      minStock: p.minStock,
    })),
    pendingPaymentsCount: pendingPaymentsOld.length,
  });
}
