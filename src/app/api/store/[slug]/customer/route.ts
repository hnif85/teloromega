// /api/store/[slug]/customer — public customer lookup for storefront
// No auth required — pelanggan bisa cek data tanpa login
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const body = await req.json();
  const { phone } = body;

  if (!phone) {
    return NextResponse.json({ error: "phone wajib" }, { status: 400 });
  }

  // Find brand by slug
  const brand = await db.brand.findUnique({ where: { slug } });
  if (!brand) {
    return NextResponse.json({ error: "Toko tidak ditemukan" }, { status: 404 });
  }

  // Normalize phone
  const normalizedPhone = phone.replace(/[\s\-+]/g, "");

  // Lookup customer
  const customer = await db.customer.findUnique({
    where: { brandId_phone: { brandId: brand.id, phone: normalizedPhone } },
  });

  if (!customer) {
    return NextResponse.json({ found: false, phone: normalizedPhone });
  }

  // Get order stats
  const [orderCount, spentAgg, lastOrder] = await Promise.all([
    db.order.count({ where: { customerId: customer.id } }),
    db.order.aggregate({
      where: { customerId: customer.id, status: { not: "Batal" } },
      _sum: { totalAmount: true },
    }),
    db.order.findFirst({
      where: { customerId: customer.id },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);

  return NextResponse.json({
    found: true,
    customer: {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      totalOrders: orderCount,
      totalSpent: spentAgg._sum.totalAmount ?? 0,
      lastOrderAt: lastOrder?.createdAt?.toISOString() ?? null,
    },
  });
}
