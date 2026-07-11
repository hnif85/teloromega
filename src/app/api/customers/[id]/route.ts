// /api/customers/[id] — aggregated customer detail
// Returns customer, stats, orders, transactions, campaigns received, receivables.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

type OrderItemJson = {
  productId: string;
  name: string;
  qty: number;
  price: number;
  type?: string;
};

function parseItems(s: string): OrderItemJson[] {
  try {
    const parsed = JSON.parse(s);
    if (!Array.isArray(parsed)) return [];
    return parsed as OrderItemJson[];
  } catch {
    return [];
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;

  // Fetch customer + verify ownership via brand.userId
  const customer = await db.customer.findUnique({
    where: { id },
    include: { brand: true },
  });
  if (!customer || customer.brand.userId !== userId) {
    return NextResponse.json({ error: "customer tidak ditemukan" }, { status: 404 });
  }

  // Fetch orders, transactions, receivables, and campaign recipients in parallel
  const [orders, transactions, receivables, campaignRecipients] = await Promise.all([
    db.order.findMany({
      where: { customerId: id },
      include: { payments: true },
      orderBy: { createdAt: "desc" },
    }),
    db.transaction.findMany({
      where: { customerId: id },
      orderBy: { date: "desc" },
    }),
    db.receivable.findMany({
      where: { customerId: id },
      orderBy: { dueDate: "desc" },
    }),
    db.campaignRecipient.findMany({
      where: { customerId: id },
      include: { campaign: true },
      orderBy: { deliveredAt: "desc" },
    }),
  ]);

  // Orders with parsed items
  const orderList = orders.map((o) => {
    const items = parseItems(o.items);
    return {
      id: o.id,
      orderNumber: `#${o.id.slice(-6).toUpperCase()}`,
      items: items.map((it) => ({
        name: it.name,
        qty: it.qty,
        price: it.price,
      })),
      totalAmount: o.totalAmount,
      status: o.status,
      paymentStatus: o.status, // kept for legacy compat; computed below
      date: o.createdAt.toISOString(),
    };
  });

  // Compute payment status per order
  const ordersWithPayment = orderList.map((o) => {
    const orig = orders.find((x) => x.id === o.id);
    const totalPaid = (orig?.payments ?? [])
      .filter((p) => p.status === "Diterima")
      .reduce((acc, p) => acc + p.amount, 0);
    const hasPending = (orig?.payments ?? []).some(
      (p) => p.status === "Menunggu"
    );
    let paymentStatus: "Lunas" | "Menunggu" | "Sebagian" | "Belum bayar";
    if (totalPaid >= o.totalAmount && totalPaid > 0) paymentStatus = "Lunas";
    else if (hasPending) paymentStatus = "Menunggu";
    else if (totalPaid > 0) paymentStatus = "Sebagian";
    else paymentStatus = "Belum bayar";
    return { ...o, paymentStatus };
  });

  // Transactions
  const transactionList = transactions.map((t) => ({
    id: t.id,
    type: t.type,
    category: t.category,
    amount: t.amount,
    description: t.description,
    date: t.date.toISOString(),
  }));

  // Campaigns received — join campaign + open/click status
  const campaignList = campaignRecipients.map((cr) => ({
    id: cr.id,
    campaignId: cr.campaignId,
    name: cr.campaign?.name ?? "—",
    channel: cr.campaign?.channel ?? "—",
    sentAt: cr.campaign?.sentAt
      ? cr.campaign.sentAt.toISOString()
      : cr.campaign?.createdAt.toISOString() ?? cr.deliveredAt?.toISOString() ?? null,
    status: cr.campaign?.status ?? "—",
    opened: cr.openedAt != null,
    clicked: cr.clickedAt != null,
  }));

  // Receivables
  const receivableList = receivables.map((r) => ({
    id: r.id,
    amount: r.amount,
    dueDate: r.dueDate.toISOString(),
    status: r.status,
  }));

  // Stats
  const totalOrders = customer.totalOrders;
  const totalSpent = customer.totalSpent;
  const avgOrderValue = totalOrders > 0 ? Math.round(totalSpent / totalOrders) : 0;

  // lastOrderAt — most recent order createdAt
  let lastOrderAt: string | null = null;
  let lastOrderDate: Date | null = null;
  for (const o of orders) {
    if (!lastOrderDate || o.createdAt > lastOrderDate) {
      lastOrderDate = o.createdAt;
    }
  }
  if (lastOrderDate) lastOrderAt = lastOrderDate.toISOString();

  const now = Date.now();
  const firstOrderAt = customer.firstOrderAt;
  const daysSinceFirstOrder = firstOrderAt
    ? Math.floor((now - firstOrderAt.getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const daysSinceLastOrder = lastOrderDate
    ? Math.floor((now - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  // repeatRate proxy: totalOrders / (totalOrders + 1) — slightly under 100% to reflect future potential
  const repeatRate =
    totalOrders > 0
      ? Math.round((totalOrders / (totalOrders + 1)) * 100)
      : 0;

  return NextResponse.json({
    customer: {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      firstOrderAt: customer.firstOrderAt
        ? customer.firstOrderAt.toISOString()
        : null,
      totalOrders,
      totalSpent,
      createdAt: customer.createdAt.toISOString(),
    },
    stats: {
      avgOrderValue,
      lastOrderAt,
      repeatRate,
      daysSinceFirstOrder,
      daysSinceLastOrder,
    },
    orders: ordersWithPayment,
    transactions: transactionList,
    campaigns: campaignList,
    receivables: receivableList,
  });
}
