// GET /api/public/store/[slug]/settings — public store settings (no auth)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const brand = await db.brand.findUnique({
    where: { slug, isActive: true },
    select: { storeSettings: true },
  });

  if (!brand) {
    return NextResponse.json({ error: "Toko tidak ditemukan" }, { status: 404 });
  }

  const defaults = {
    checkoutEnabled: true,
    paymentMethods: ["transfer", "cod", "qris"],
    minOrder: 0,
    shippingEnabled: false,
  };

  return NextResponse.json({ settings: brand.storeSettings ?? defaults });
}
