// /api/operational-costs — list & create recurring/one-time operational costs
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

const OP_CATEGORIES = [
  "Sewa",
  "Listrik & Air",
  "Internet",
  "Gaji",
  "Marketing",
  "Transport",
  "Pajak",
  "Pemeliharaan",
  "Lainnya",
] as const;

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const brandId = req.nextUrl.searchParams.get("brandId");
  if (!brandId) return NextResponse.json({ operationalCosts: [] });

  const brand = await db.brand.findUnique({ where: { id: brandId } });
  if (!brand || brand.userId !== userId) {
    return NextResponse.json({ error: "brand tidak ditemukan" }, { status: 404 });
  }

  const items = await db.operationalCost.findMany({
    where: { brandId },
    orderBy: { date: "desc" },
  });

  // Stats
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const thisMonth = items.filter(
    (i) => i.date >= startOfMonth && i.date <= endOfMonth
  );
  const totalThisMonth = thisMonth.reduce((s, i) => s + i.amount, 0);

  // Recurring monthly estimate: sum of recurring items (treated as per-month)
  const totalMonthlyRecurring = items
    .filter((i) => i.recurring)
    .reduce((s, i) => s + i.amount, 0);

  return NextResponse.json({
    operationalCosts: items,
    stats: {
      totalThisMonth,
      totalMonthlyRecurring,
      countThisMonth: thisMonth.length,
      countRecurring: items.filter((i) => i.recurring).length,
    },
  });
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const { brandId, category, amount, recurring, date, description } = body as {
    brandId: string;
    category?: string;
    amount: number;
    recurring?: boolean;
    date?: string;
    description?: string | null;
  };

  if (!brandId || !amount || !category) {
    return NextResponse.json({ error: "brandId, category, amount wajib" }, { status: 400 });
  }
  if (!OP_CATEGORIES.includes(category as any)) {
    return NextResponse.json(
      { error: `category tidak valid. Pilihan: ${OP_CATEGORIES.join(", ")}` },
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

  const ocDate = date ? new Date(date) : new Date();

  // 1. Create operational cost record
  const oc = await db.operationalCost.create({
    data: {
      userId,
      brandId,
      category,
      amount: amt,
      recurring: !!recurring,
      date: ocDate,
    },
  });

  // 2. Auto-create a matching expense transaction so P&L includes it
  const tx = await db.transaction.create({
    data: {
      userId,
      brandId,
      type: "expense",
      category: "operasional",
      amount: amt,
      description: description?.trim() || `Biaya ${category}${recurring ? " (rutin)" : ""}`,
      date: ocDate,
    },
  });

  return NextResponse.json({ operationalCost: oc, transaction: tx }, { status: 201 });
}
