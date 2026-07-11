// /api/payables — list & create hutang
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const brandId = req.nextUrl.searchParams.get("brandId");
  const status = req.nextUrl.searchParams.get("status");
  if (!brandId) return NextResponse.json({ payables: [] });

  const brand = await db.brand.findUnique({ where: { id: brandId } });
  if (!brand || brand.userId !== userId) {
    return NextResponse.json({ error: "brand tidak ditemukan" }, { status: 404 });
  }

  const where: any = { brandId };
  if (status) where.status = status;

  const items = await db.payable.findMany({
    where,
    orderBy: { dueDate: "asc" },
  });

  const now = Date.now();
  const enriched = items.map((p) => ({
    ...p,
    status: p.status === "paid" ? "paid" : p.dueDate.getTime() < now ? "overdue" : "outstanding",
  }));

  return NextResponse.json({ payables: enriched });
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const { brandId, supplierName, amount, dueDate, description } = body as {
    brandId: string;
    supplierName?: string;
    amount: number;
    dueDate: string;
    description?: string | null;
  };

  if (!brandId || !amount || !dueDate || !supplierName?.trim()) {
    return NextResponse.json(
      { error: "brandId, supplierName, amount, dueDate wajib" },
      { status: 400 }
    );
  }
  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt <= 0) {
    return NextResponse.json({ error: "amount harus angka > 0" }, { status: 400 });
  }

  const brand = await db.brand.findUnique({ where: { id: brandId } });
  if (!brand || brand.userId !== userId) {
    return NextResponse.json({ error: "brand tidak ditemukan" }, { status: 404 });
  }

  const p = await db.payable.create({
    data: {
      userId,
      brandId,
      supplierName: supplierName.trim(),
      amount: amt,
      dueDate: new Date(dueDate),
      status: "outstanding",
    },
  });
  return NextResponse.json({ payable: p }, { status: 201 });
}
