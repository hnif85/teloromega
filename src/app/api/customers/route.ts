// /api/customers — list customers (for campaign recipient picker)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const brandId = req.nextUrl.searchParams.get("brandId");
  if (!brandId) return NextResponse.json({ customers: [], leads: [] });

  const brand = await db.brand.findUnique({ where: { id: brandId } });
  if (!brand || brand.userId !== userId) {
    return NextResponse.json({ error: "brand tidak ditemukan" }, { status: 404 });
  }

  const [customers, leads] = await Promise.all([
    db.customer.findMany({
      where: { brandId },
      orderBy: { createdAt: "desc" },
    }),
    db.lead.findMany({
      where: { brandId, stage: { notIn: ["Closed"] } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({ customers, leads });
}

// POST /api/customers — lookup by phone or create new customer
export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const { brandId, phone, name, email, address } = body;
  if (!brandId || !phone) {
    return NextResponse.json({ error: "brandId dan phone wajib" }, { status: 400 });
  }

  const brand = await db.brand.findUnique({ where: { id: brandId } });
  if (!brand || brand.userId !== userId) {
    return NextResponse.json({ error: "brand tidak ditemukan" }, { status: 404 });
  }

  // Normalize phone — strip spaces, dashes, leading +
  const normalizedPhone = phone.replace(/[\s\-+]/g, "");

  // Lookup existing customer
  const existing = await db.customer.findUnique({
    where: { brandId_phone: { brandId, phone: normalizedPhone } },
  });

  if (existing) {
    // Fetch order count & total spent for summary
    const [orderCount, spentAgg, lastOrder] = await Promise.all([
      db.order.count({ where: { customerId: existing.id } }),
      db.order.aggregate({
        where: { customerId: existing.id, status: { not: "Batal" } },
        _sum: { totalAmount: true },
      }),
      db.order.findFirst({
        where: { customerId: existing.id },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
    ]);

    return NextResponse.json({
      found: true,
      customer: {
        id: existing.id,
        name: existing.name,
        phone: existing.phone,
        email: existing.email,
        totalOrders: orderCount,
        totalSpent: spentAgg._sum.totalAmount ?? 0,
        lastOrderAt: lastOrder?.createdAt?.toISOString() ?? null,
        createdAt: existing.createdAt.toISOString(),
      },
    });
  }

  // Not found — return flag so frontend can show registration form
  return NextResponse.json({ found: false, phone: normalizedPhone });
}

// PUT /api/customers — update customer profile (from registration form)
export async function PUT(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const { brandId, phone, name, email, address } = body;
  if (!brandId || !phone || !name) {
    return NextResponse.json({ error: "brandId, phone, dan name wajib" }, { status: 400 });
  }

  const brand = await db.brand.findUnique({ where: { id: brandId } });
  if (!brand || brand.userId !== userId) {
    return NextResponse.json({ error: "brand tidak ditemukan" }, { status: 404 });
  }

  const normalizedPhone = phone.replace(/[\s\-+]/g, "");

  // Upsert customer
  const customer = await db.customer.upsert({
    where: { brandId_phone: { brandId, phone: normalizedPhone } },
    create: {
      brandId,
      phone: normalizedPhone,
      name,
      email: email || null,
    },
    update: {
      name,
      email: email || null,
    },
  });

  return NextResponse.json({
    found: true,
    customer: {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      totalOrders: 0,
      totalSpent: 0,
      lastOrderAt: null,
      createdAt: customer.createdAt.toISOString(),
    },
  });
}
