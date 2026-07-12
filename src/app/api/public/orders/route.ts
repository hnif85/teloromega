// GET /api/public/orders — list orders by phone for public lookup
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const brandId = req.nextUrl.searchParams.get("brandId");
  const phone = req.nextUrl.searchParams.get("phone");

  if (!brandId || !phone) {
    return NextResponse.json({ orders: [] });
  }

  const customer = await db.customer.findFirst({
    where: { brandId, phone: { contains: phone.replace(/[^0-9]/g, "").slice(-10) } },
    select: { id: true, name: true },
  });

  if (!customer) {
    return NextResponse.json({ orders: [], customer: null });
  }

  const orders = await db.order.findMany({
    where: { brandId, customerId: customer.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      totalAmount: true,
      status: true,
      items: true,
      notes: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    customer: { name: customer.name },
    orders: orders.map((o) => ({
      ...o,
      items: JSON.parse(o.items),
    })),
  });
}
