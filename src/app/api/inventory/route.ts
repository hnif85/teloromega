// /api/inventory — list products with stock info, low-stock alerts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const brandId = req.nextUrl.searchParams.get("brandId");
  if (!brandId) return NextResponse.json({ products: [], movements: [] });

  const brand = await db.brand.findUnique({ where: { id: brandId } });
  if (!brand || brand.userId !== userId) {
    return NextResponse.json({ error: "brand tidak ditemukan" }, { status: 404 });
  }

  const products = await db.product.findMany({
    where: { brandId, isActive: true },
    orderBy: { name: "asc" },
  });

  // Derive stock movement history from orders containing each product
  const orders = await db.order.findMany({
    where: { brandId },
    select: {
      id: true,
      items: true,
      status: true,
      createdAt: true,
      customer: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  type Movement = {
    productId: string;
    orderId: string;
    customerName: string | null;
    qty: number;
    status: string;
    createdAt: string;
  };
  const movements: Movement[] = [];
  for (const o of orders) {
    try {
      const items = JSON.parse(o.items) as { productId: string; qty: number }[];
      for (const it of items) {
        movements.push({
          productId: it.productId,
          orderId: o.id,
          customerName: o.customer?.name ?? null,
          qty: it.qty,
          status: o.status,
          createdAt: o.createdAt.toISOString(),
        });
      }
    } catch {
      // skip malformed
    }
  }

  return NextResponse.json({ products, movements });
}
