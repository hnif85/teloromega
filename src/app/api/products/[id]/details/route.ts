// /api/products/[id]/details — aggregated product detail
// Returns product, sales stats, recent orders, stock movements, related content.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

type OrderItemJson = {
  productId: string;
  name: string;
  qty: number;
  price: number;
  type?: string;
};

function parseItems(s: string): OrderItemJson[] {
  try {
    const parsed = JSON.parse(s);
    if (!Array.isArray(parsed)) return [];
    return parsed as OrderItemJson[];
  } catch {
    return [];
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;

  // Fetch product + verify ownership via brand.userId
  const product = await db.product.findUnique({
    where: { id },
    include: { brand: true },
  });
  if (!product || product.brand.userId !== userId) {
    return NextResponse.json({ error: "produk tidak ditemukan" }, { status: 404 });
  }

  // Fetch all orders for this brand (we'll filter client-side via items JSON)
  const allOrders = await db.order.findMany({
    where: { brandId: product.brandId },
    include: { customer: true, lead: true, payments: true },
    orderBy: { createdAt: "desc" },
  });

  // Filter orders containing this product
  const containingOrders = allOrders.filter((o) => {
    const items = parseItems(o.items);
    return items.some((it) => it.productId === id);
  });

  // Compute stats: sum of qty × price from non-cancelled orders
  let totalSold = 0;
  let totalRevenue = 0;
  let totalCost = 0;
  let lastSoldAt: string | null = null;
  let lastSoldDate: Date | null = null;

  for (const o of containingOrders) {
    if (o.status === "Dibatalkan") continue;
    const items = parseItems(o.items);
    const matching = items.filter((it) => it.productId === id);
    for (const it of matching) {
      totalSold += it.qty;
      totalRevenue += it.qty * it.price;
      if (product.costPrice != null) {
        totalCost += it.qty * product.costPrice;
      }
    }
    if (!lastSoldDate || o.createdAt > lastSoldDate) {
      lastSoldDate = o.createdAt;
    }
  }
  if (lastSoldDate) lastSoldAt = lastSoldDate.toISOString();

  const grossProfit = totalRevenue - totalCost;
  const marginPct =
    product.price > 0 && product.costPrice != null
      ? Math.round(((product.price - product.costPrice) / product.price) * 100)
      : 0;
  const orderCount = containingOrders.length;

  // Recent orders (last 10) — newest first
  const recentOrders = containingOrders.slice(0, 10).map((o) => {
    const items = parseItems(o.items);
    const matching = items.filter((it) => it.productId === id);
    const qty = matching.reduce((sum, it) => sum + it.qty, 0);
    const total = matching.reduce((sum, it) => sum + it.qty * it.price, 0);
    const customerName =
      o.customer?.name ?? o.lead?.name ?? "Walk-in";
    // Determine payment status from payments array
    const totalPaid = (o.payments ?? [])
      .filter((p) => p.status === "Diterima")
      .reduce((acc, p) => acc + p.amount, 0);
    const hasPending = (o.payments ?? []).some((p) => p.status === "Menunggu");
    let paymentStatus: "Lunas" | "Menunggu" | "Sebagian" | "Belum bayar";
    if (totalPaid >= o.totalAmount && totalPaid > 0) paymentStatus = "Lunas";
    else if (hasPending) paymentStatus = "Menunggu";
    else if (totalPaid > 0) paymentStatus = "Sebagian";
    else paymentStatus = "Belum bayar";
    return {
      id: o.id,
      orderNumber: `#${o.id.slice(-6).toUpperCase()}`,
      customerName,
      qty,
      total,
      status: o.status,
      paymentStatus,
      date: o.createdAt.toISOString(),
    };
  });

  // Stock movements — derived from order history
  // For barang products only.
  type Movement = {
    date: string;
    type: "in" | "out";
    quantity: number;
    reference: string;
    balance: number;
  };
  let stockMovements: Movement[] = [];
  if (product.type === "barang") {
    // Non-cancelled orders containing this product, sorted oldest first
    const orderedChrono = containingOrders
      .filter((o) => o.status !== "Dibatalkan")
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    // Build chronological list with running balance starting from initial stock.
    // We don't know the true initial stock, but we can reconstruct it:
    // current_stock = initial_stock - sum(qty sold). So initial = current + sum(sold).
    const totalSoldQty = orderedChrono.reduce((sum, o) => {
      const items = parseItems(o.items);
      return (
        sum +
        items
          .filter((it) => it.productId === id)
          .reduce((s, it) => s + it.qty, 0)
      );
    }, 0);
    const initialStock = (product.stock ?? 0) + totalSoldQty;

    const chronological: Movement[] = [
      {
        date: product.createdAt.toISOString(),
        type: "in",
        quantity: initialStock,
        reference: "initial",
        balance: initialStock,
      },
    ];
    let bal = initialStock;
    for (const o of orderedChrono) {
      const items = parseItems(o.items);
      const qty = items
        .filter((it) => it.productId === id)
        .reduce((sum, it) => sum + it.qty, 0);
      if (qty <= 0) continue;
      bal -= qty;
      chronological.push({
        date: o.createdAt.toISOString(),
        type: "out",
        quantity: qty,
        reference: `#${o.id.slice(-6).toUpperCase()}`,
        balance: bal,
      });
    }
    stockMovements = chronological;
  }

  // Related content generated for this product
  const relatedContentRaw = await db.content.findMany({
    where: { productId: id },
    orderBy: { createdAt: "desc" },
    select: { id: true, type: true, platform: true, createdAt: true },
  });
  const relatedContent = relatedContentRaw.map((c) => ({
    id: c.id,
    type: c.type,
    platform: c.platform,
    createdAt: c.createdAt.toISOString(),
  }));

  return NextResponse.json({
    product: {
      id: product.id,
      name: product.name,
      type: product.type,
      price: product.price,
      costPrice: product.costPrice,
      stock: product.stock,
      minStock: product.minStock,
      sku: product.sku,
      description: product.description,
      imageUrl: product.imageUrl,
      isActive: product.isActive,
      createdAt: product.createdAt.toISOString(),
    },
    stats: {
      totalSold,
      totalRevenue,
      totalCost,
      grossProfit,
      marginPct,
      orderCount,
      lastSoldAt,
    },
    recentOrders,
    stockMovements,
    relatedContent,
  });
}
