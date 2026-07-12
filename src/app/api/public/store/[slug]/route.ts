// /api/public/store/[slug] — public store data (no auth)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  if (!slug) {
    return NextResponse.json({ error: "slug wajib" }, { status: 400 });
  }

  const brand = await db.brand.findUnique({
    where: { slug, isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      category: true,
      logoUrl: true,
      phone: true,
    },
  });

  if (!brand) {
    return NextResponse.json({ error: "Toko tidak ditemukan" }, { status: 404 });
  }

  const products = await db.product.findMany({
    where: { brandId: brand.id, isActive: true },
    select: {
      id: true,
      name: true,
      type: true,
      price: true,
      promoPrice: true,
      stock: true,
      description: true,
      imageUrl: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ brand, products });
}
