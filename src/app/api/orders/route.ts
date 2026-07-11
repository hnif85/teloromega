// /api/orders — list & create
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

type OrderItemInput = { productId: string; qty: number };

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const brandId = req.nextUrl.searchParams.get("brandId");
  if (!brandId) return NextResponse.json({ orders: [] });

  const brand = await db.brand.findUnique({ where: { id: brandId } });
  if (!brand || brand.userId !== userId) {
    return NextResponse.json({ error: "brand tidak ditemukan" }, { status: 404 });
  }

  const orders = await db.order.findMany({
    where: { brandId },
    include: {
      customer: true,
      lead: true,
      payments: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ orders });
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const { brandId, customerId, leadId, items, shippingCost, notes } = body as {
    brandId: string;
    customerId?: string;
    leadId?: string;
    items: OrderItemInput[];
    shippingCost?: number;
    notes?: string;
  };

  if (!brandId || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "brandId & items (non-empty) wajib" }, { status: 400 });
  }

  const brand = await db.brand.findUnique({ where: { id: brandId } });
  if (!brand || brand.userId !== userId) {
    return NextResponse.json({ error: "brand tidak ditemukan" }, { status: 404 });
  }

  // Resolve products & validate stock for barang
  const productIds = items.map((i) => i.productId);
  const products = await db.product.findMany({ where: { id: { in: productIds }, brandId } });
  if (products.length !== productIds.length) {
    return NextResponse.json({ error: "salah satu produk tidak ditemukan" }, { status: 404 });
  }

  const stockWarnings: string[] = [];
  const enrichedItems: { productId: string; name: string; qty: number; price: number; type: string }[] = [];
  let totalAmount = 0;

  for (const it of items) {
    const p = products.find((x) => x.id === it.productId);
    if (!p) continue;
    const qty = Math.max(1, Number(it.qty) || 1);
    if (p.type === "barang") {
      const current = p.stock ?? 0;
      if (current < qty) {
        stockWarnings.push(`${p.name}: stok ${current}, diminta ${qty} (akan jadi negatif)`);
      }
    }
    enrichedItems.push({ productId: p.id, name: p.name, qty, price: p.price, type: p.type });
    totalAmount += p.price * qty;
  }

  // Decrement stock for barang products
  for (const it of enrichedItems) {
    const p = products.find((x) => x.id === it.productId);
    if (p?.type === "barang") {
      const current = p.stock ?? 0;
      await db.product.update({
        where: { id: p.id },
        data: { stock: current - it.qty },
      });
    }
  }

  const shipping = shippingCost != null ? Number(shippingCost) : null;
  const orderTotal = totalAmount + (shipping ?? 0);

  const order = await db.order.create({
    data: {
      brandId,
      customerId: customerId || null,
      leadId: leadId || null,
      items: JSON.stringify(enrichedItems),
      totalAmount: orderTotal,
      status: "Baru",
      shippingCost: shipping,
      notes: notes?.trim() || null,
    },
    include: { customer: true, lead: true, payments: true },
  });

  return NextResponse.json({ order, stockWarnings });
}
