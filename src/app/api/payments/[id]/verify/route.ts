// /api/payments/[id]/verify — verify payment (Diterima/Ditolak)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const payment = await db.payment.findUnique({
    where: { id },
    include: { order: { include: { brand: true } } },
  });
  if (!payment || payment.order.brand.userId !== userId) {
    return NextResponse.json({ error: "payment tidak ditemukan" }, { status: 404 });
  }

  const body = await req.json();
  const { status } = body as { status: "Diterima" | "Ditolak" };
  if (status !== "Diterima" && status !== "Ditolak") {
    return NextResponse.json({ error: "status harus 'Diterima' atau 'Ditolak'" }, { status: 400 });
  }

  const now = new Date();
  const updated = await db.payment.update({
    where: { id },
    data: { status, verifiedAt: now },
    include: { order: true },
  });

  let transaction: Awaited<ReturnType<typeof db.transaction.create>> | null = null;

  if (status === "Diterima") {
    const order = payment.order;
    const brandId = order.brandId;
    const customerId = order.customerId;

    // Parse items & compute HPP (cost_price × qty)
    let parsedItems: { productId: string; name: string; qty: number; price: number; type?: string }[] = [];
    try {
      parsedItems = JSON.parse(order.items);
    } catch {
      parsedItems = [];
    }
    const productIds = parsedItems.map((i) => i.productId);
    const products = await db.product.findMany({ where: { id: { in: productIds } } });
    let hppTotal = 0;
    for (const it of parsedItems) {
      const p = products.find((x) => x.id === it.productId);
      if (p?.costPrice) hppTotal += p.costPrice * it.qty;
    }
    // First item's product if single
    const singleProductId = parsedItems.length === 1 ? parsedItems[0].productId : null;

    // CRITICAL: insert transaction (income diakui saat Payment = Diterima)
    transaction = await db.transaction.create({
      data: {
        userId,
        brandId,
        orderId: order.id,
        customerId: customerId ?? null,
        productId: singleProductId,
        type: "income",
        category: "penjualan",
        amount: payment.amount,
        costAmount: hppTotal > 0 ? hppTotal : null,
        quantity: parsedItems.reduce((acc, i) => acc + i.qty, 0),
        description: `Pembayaran diterima — Order #${order.id.slice(-6)}`,
        date: now,
      },
    });

    // Update customer totals
    if (customerId) {
      const customer = await db.customer.findUnique({ where: { id: customerId } });
      if (customer) {
        await db.customer.update({
          where: { id: customerId },
          data: {
            totalOrders: customer.totalOrders + 1,
            totalSpent: customer.totalSpent + payment.amount,
            firstOrderAt: customer.firstOrderAt ?? now,
          },
        });
      }
    }

    // Update order.status → "Diproses" if currently "Baru"
    if (order.status === "Baru") {
      await db.order.update({
        where: { id: order.id },
        data: { status: "Diproses" },
      });
    }
  }

  return NextResponse.json({ payment: updated, transaction });
}
