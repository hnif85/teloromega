// GET /api/public/order/[orderId] — public order detail (no auth)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

interface BankAccount {
  bank: string;
  accountNumber: string;
  accountName: string;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;

  if (!orderId) {
    return NextResponse.json({ error: "orderId wajib" }, { status: 400 });
  }

  const order = await db.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      totalAmount: true,
      status: true,
      items: true,
      notes: true,
      createdAt: true,
      brand: {
        select: {
          name: true,
          slug: true,
          phone: true,
          storeSettings: true,
        },
      },
      payments: { select: { method: true, status: true, proofImageUrl: true }, take: 1 },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Pesanan tidak ditemukan" }, { status: 404 });
  }

  const brandSettings = (order.brand.storeSettings ?? {}) as Record<string, unknown>;
  const bankAccounts = Array.isArray(brandSettings.bankAccounts) ? brandSettings.bankAccounts as BankAccount[] : [];

  return NextResponse.json({
    ...order,
    brand: { name: order.brand.name, slug: order.brand.slug, phone: order.brand.phone },
    payment: order.payments[0] ?? null,
    bankAccounts,
  });
}
