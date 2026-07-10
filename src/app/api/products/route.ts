// /api/products — list & create
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const brandId = req.nextUrl.searchParams.get("brandId");
  if (!brandId) return NextResponse.json({ products: [] });

  const brand = await db.brand.findUnique({ where: { id: brandId } });
  if (!brand || brand.userId !== userId) {
    return NextResponse.json({ error: "brand tidak ditemukan" }, { status: 404 });
  }

  const products = await db.product.findMany({
    where: { brandId, isActive: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ products });
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const { brandId, type, name, price, costPrice, stock, minStock, sku, description, imageUrl } =
    body as {
      brandId: string;
      type: "barang" | "jasa";
      name: string;
      price: number;
      costPrice?: number | null;
      stock?: number | null;
      minStock?: number | null;
      sku?: string | null;
      description?: string | null;
      imageUrl?: string | null;
    };

  if (!brandId || !type || !name?.trim() || price == null) {
    return NextResponse.json({ error: "brandId, type, name, price wajib" }, { status: 400 });
  }
  if (type !== "barang" && type !== "jasa") {
    return NextResponse.json({ error: "type harus 'barang' atau 'jasa'" }, { status: 400 });
  }

  const brand = await db.brand.findUnique({ where: { id: brandId } });
  if (!brand || brand.userId !== userId) {
    return NextResponse.json({ error: "brand tidak ditemukan" }, { status: 404 });
  }

  const product = await db.product.create({
    data: {
      brandId,
      type,
      name: name.trim(),
      price: Number(price),
      costPrice: costPrice != null ? Number(costPrice) : null,
      stock: type === "barang" ? (stock != null ? Number(stock) : 0) : null,
      minStock: minStock != null ? Number(minStock) : null,
      sku: sku?.trim() || null,
      description: description?.trim() || null,
      imageUrl: imageUrl?.trim() || null,
    },
  });
  return NextResponse.json({ product });
}
