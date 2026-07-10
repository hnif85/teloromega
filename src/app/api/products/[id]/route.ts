// /api/products/[id] — update & soft delete
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const product = await db.product.findUnique({ where: { id }, include: { brand: true } });
  if (!product || product.brand.userId !== userId) {
    return NextResponse.json({ error: "produk tidak ditemukan" }, { status: 404 });
  }
  const body = await req.json();
  const { name, price, costPrice, stock, minStock, description, imageUrl } = body;
  const updated = await db.product.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(price !== undefined ? { price: Number(price) } : {}),
      ...(costPrice !== undefined ? { costPrice: costPrice != null ? Number(costPrice) : null } : {}),
      ...(stock !== undefined ? { stock: stock != null ? Number(stock) : null } : {}),
      ...(minStock !== undefined ? { minStock: minStock != null ? Number(minStock) : null } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(imageUrl !== undefined ? { imageUrl } : {}),
    },
  });
  return NextResponse.json({ product: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const product = await db.product.findUnique({ where: { id }, include: { brand: true } });
  if (!product || product.brand.userId !== userId) {
    return NextResponse.json({ error: "produk tidak ditemukan" }, { status: 404 });
  }
  await db.product.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ ok: true });
}
