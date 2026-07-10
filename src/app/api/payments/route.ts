// /api/payments — list & create
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const brandId = req.nextUrl.searchParams.get("brandId");
  if (!brandId) return NextResponse.json({ payments: [] });

  const brand = await db.brand.findUnique({ where: { id: brandId } });
  if (!brand || brand.userId !== userId) {
    return NextResponse.json({ error: "brand tidak ditemukan" }, { status: 404 });
  }

  const payments = await db.payment.findMany({
    where: { order: { brandId } },
    include: { order: { include: { customer: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ payments });
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const { orderId, amount, method, proofImageUrl } = body as {
    orderId: string;
    amount: number;
    method?: string;
    proofImageUrl?: string;
  };

  if (!orderId || amount == null) {
    return NextResponse.json({ error: "orderId & amount wajib" }, { status: 400 });
  }

  const order = await db.order.findUnique({ where: { id: orderId }, include: { brand: true } });
  if (!order || order.brand.userId !== userId) {
    return NextResponse.json({ error: "order tidak ditemukan" }, { status: 404 });
  }

  const payment = await db.payment.create({
    data: {
      orderId,
      amount: Number(amount),
      method: method || "transfer",
      status: "Menunggu",
      proofImageUrl: proofImageUrl?.trim() || null,
    },
    include: { order: true },
  });
  return NextResponse.json({ payment });
}
