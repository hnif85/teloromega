// POST /api/public/order — create order from public store (no auth)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

interface OrderItem {
  productId: string;
  name: string;
  qty: number;
  price: number;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { brandId, customerName, customerPhone, customerAddress, notes, paymentMethod, items } = body as {
      brandId: string;
      customerName: string;
      customerPhone: string;
      customerAddress: string;
      notes?: string;
      paymentMethod: string;
      items: OrderItem[];
    };

    if (!brandId || !customerName || !customerPhone || !items?.length) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    const brand = await db.brand.findUnique({ where: { id: brandId } });
    if (!brand) {
      return NextResponse.json({ error: "Toko tidak ditemukan" }, { status: 404 });
    }

    const totalAmount = items.reduce((s, i) => s + i.price * i.qty, 0);

    // Validate stock availability
    const products = await db.product.findMany({
      where: { id: { in: items.map((i) => i.productId) }, brandId },
      select: { id: true, stock: true, type: true },
    });
    for (const item of items) {
      const prod = products.find((p) => p.id === item.productId);
      if (prod?.type === "barang" && prod.stock != null && item.qty > prod.stock) {
        return NextResponse.json({ error: `Stok ${item.name} tidak mencukupi (tersedia: ${prod.stock})` }, { status: 400 });
      }
    }

    const order = await db.$transaction(async (tx) => {
      const customer = await tx.customer.upsert({
        where: { brandId_phone: { brandId, phone: customerPhone } },
        update: { name: customerName },
        create: { brandId, name: customerName, phone: customerPhone, firstOrderAt: new Date() },
      });

      const newOrder = await tx.order.create({
        data: {
          brandId,
          customerId: customer.id,
          items: JSON.stringify(items),
          totalAmount,
          status: "Baru",
          notes: [customerAddress, notes].filter(Boolean).join("\n---\n"),
        },
      });

      await tx.payment.create({
        data: {
          orderId: newOrder.id,
          amount: totalAmount,
          method: paymentMethod,
          status: "Menunggu",
        },
      });

      await tx.customer.update({
        where: { id: customer.id },
        data: { totalOrders: { increment: 1 }, totalSpent: { increment: totalAmount } },
      });

      for (const item of items) {
        await tx.product.updateMany({
          where: { id: item.productId, brandId },
          data: { stock: { decrement: item.qty } },
        });
      }

      return newOrder;
    });

    return NextResponse.json({ orderId: order.id, totalAmount }, { status: 201 });
  } catch (err) {
    console.error("POST /api/public/order error:", err);
    return NextResponse.json({ error: "Gagal membuat pesanan" }, { status: 500 });
  }
}
