// /api/inventory/[productId] — update stock + minStock
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { productId } = await params;

  const product = await db.product.findUnique({ where: { id: productId }, include: { brand: true } });
  if (!product || product.brand.userId !== userId) {
    return NextResponse.json({ error: "produk tidak ditemukan" }, { status: 404 });
  }

  const body = await req.json();
  const { stock, minStock } = body as { stock?: number; minStock?: number };

  const data: Record<string, unknown> = {};
  if (stock !== undefined) data.stock = stock != null ? Number(stock) : null;
  if (minStock !== undefined) data.minStock = minStock != null ? Number(minStock) : null;

  const updated = await db.product.update({ where: { id: productId }, data });
  return NextResponse.json({ product: updated });
}
