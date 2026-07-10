// /api/shipping/[orderId] — set resi + change order status to Dikirim
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { orderId } = await params;

  const order = await db.order.findUnique({ where: { id: orderId }, include: { brand: true } });
  if (!order || order.brand.userId !== userId) {
    return NextResponse.json({ error: "order tidak ditemukan" }, { status: 404 });
  }

  const body = await req.json();
  const { resiNumber, shippingCourier, shippingCost } = body as {
    resiNumber: string;
    shippingCourier: string;
    shippingCost?: number;
  };

  if (!resiNumber?.trim() || !shippingCourier?.trim()) {
    return NextResponse.json({ error: "resiNumber & shippingCourier wajib" }, { status: 400 });
  }

  const updated = await db.order.update({
    where: { id: orderId },
    data: {
      resiNumber: resiNumber.trim(),
      shippingCourier: shippingCourier.trim(),
      shippingCost: shippingCost != null ? Number(shippingCost) : order.shippingCost,
      status: "Dikirim",
    },
    include: { customer: true, lead: true, payments: true },
  });
  return NextResponse.json({ order: updated });
}
