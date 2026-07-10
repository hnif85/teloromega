// /api/orders/[id] — update order
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const order = await db.order.findUnique({ where: { id }, include: { brand: true } });
  if (!order || order.brand.userId !== userId) {
    return NextResponse.json({ error: "order tidak ditemukan" }, { status: 404 });
  }

  const body = await req.json();
  const { status, resiNumber, shippingCourier, shippingCost, notes } = body as {
    status?: string;
    resiNumber?: string;
    shippingCourier?: string;
    shippingCost?: number;
    notes?: string;
  };

  const data: Record<string, unknown> = {};
  if (status !== undefined) data.status = status;
  if (resiNumber !== undefined) data.resiNumber = resiNumber?.trim() || null;
  if (shippingCourier !== undefined) data.shippingCourier = shippingCourier?.trim() || null;
  if (shippingCost !== undefined) data.shippingCost = shippingCost != null ? Number(shippingCost) : null;
  if (notes !== undefined) data.notes = notes?.trim() || null;

  // If status → "Dibatalkan": restore stock for barang products
  if (status === "Dibatalkan") {
    let parsedItems: { productId: string; name: string; qty: number; price: number; type?: string }[] = [];
    try {
      parsedItems = JSON.parse(order.items);
    } catch {
      parsedItems = [];
    }
    const productIds = parsedItems.map((i) => i.productId);
    const products = await db.product.findMany({ where: { id: { in: productIds } } });
    for (const it of parsedItems) {
      const p = products.find((x) => x.id === it.productId);
      if (p?.type === "barang" && p.stock != null) {
        await db.product.update({
          where: { id: p.id },
          data: { stock: (p.stock ?? 0) + it.qty },
        });
      }
    }
  }

  const updated = await db.order.update({
    where: { id },
    data,
    include: { customer: true, lead: true, payments: true },
  });
  return NextResponse.json({ order: updated });
}
