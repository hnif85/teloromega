// /api/receivables — list & create piutang
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

function deriveStatus(dueDate: Date, status: string): string {
  if (status === "paid") return "paid";
  return dueDate.getTime() < Date.now() ? "overdue" : "outstanding";
}

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const brandId = req.nextUrl.searchParams.get("brandId");
  const status = req.nextUrl.searchParams.get("status"); // outstanding | overdue | paid
  if (!brandId) return NextResponse.json({ receivables: [] });

  const brand = await db.brand.findUnique({ where: { id: brandId } });
  if (!brand || brand.userId !== userId) {
    return NextResponse.json({ error: "brand tidak ditemukan" }, { status: 404 });
  }

  const where: any = { brandId };
  if (status) where.status = status;

  const items = await db.receivable.findMany({
    where,
    orderBy: { dueDate: "asc" },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
    },
  });

  const now = Date.now();
  const enriched = items.map((r) => ({
    ...r,
    status: r.status === "paid" ? "paid" : r.dueDate.getTime() < now ? "overdue" : "outstanding",
  }));

  return NextResponse.json({ receivables: enriched });
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const { brandId, customerName, customerId, amount, dueDate, description } = body as {
    brandId: string;
    customerName?: string;
    customerId?: string | null;
    amount: number;
    dueDate: string;
    description?: string | null;
  };

  if (!brandId || !amount || !dueDate) {
    return NextResponse.json({ error: "brandId, amount, dueDate wajib" }, { status: 400 });
  }
  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt <= 0) {
    return NextResponse.json({ error: "amount harus angka > 0" }, { status: 400 });
  }

  let name = customerName?.trim() ?? "";
  let custId: string | null = customerId ?? null;
  if (custId) {
    const c = await db.customer.findUnique({ where: { id: custId } });
    if (c && c.brandId === brandId) name = c.name;
  }
  if (!name) {
    return NextResponse.json({ error: "customerName atau customerId wajib" }, { status: 400 });
  }

  const brand = await db.brand.findUnique({ where: { id: brandId } });
  if (!brand || brand.userId !== userId) {
    return NextResponse.json({ error: "brand tidak ditemukan" }, { status: 404 });
  }

  const r = await db.receivable.create({
    data: {
      userId,
      brandId,
      customerName: name,
      customerId: custId,
      amount: amt,
      dueDate: new Date(dueDate),
      status: "outstanding",
    },
  });
  return NextResponse.json({ receivable: r }, { status: 201 });
}
