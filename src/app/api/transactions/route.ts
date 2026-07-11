// /api/transactions — list & create (manual book-keeping)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

const TX_CATEGORIES = [
  "penjualan",
  "bahan_baku",
  "operasional",
  "marketing",
  "gaji",
  "lainnya",
] as const;

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const brandId = req.nextUrl.searchParams.get("brandId");
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  const type = req.nextUrl.searchParams.get("type"); // income | expense
  const category = req.nextUrl.searchParams.get("category");
  const q = req.nextUrl.searchParams.get("q");
  const limitParam = req.nextUrl.searchParams.get("limit");
  const cursor = req.nextUrl.searchParams.get("cursor");

  if (!brandId) return NextResponse.json({ transactions: [], nextCursor: null });

  const brand = await db.brand.findUnique({ where: { id: brandId } });
  if (!brand || brand.userId !== userId) {
    return NextResponse.json({ error: "brand tidak ditemukan" }, { status: 404 });
  }

  const where: any = { brandId };
  if (type === "income" || type === "expense") where.type = type;
  if (category && TX_CATEGORIES.includes(category as any)) where.category = category;
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = new Date(from);
    if (to) where.date.lte = new Date(to);
  }
  if (q?.trim()) {
    where.OR = [
      { description: { contains: q.trim() } },
      { category: { contains: q.trim() } },
    ];
  }

  const take = Math.min(Number(limitParam ?? 50), 200);

  const transactions = await db.transaction.findMany({
    where,
    orderBy: { date: "desc" },
    take: take + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    include: {
      product: { select: { id: true, name: true, price: true, costPrice: true } },
      customer: { select: { id: true, name: true, phone: true } },
      order: { select: { id: true, resiNumber: true, status: true } },
    },
  });

  let nextCursor: string | null = null;
  if (transactions.length > take) {
    const nextItem = transactions.pop();
    nextCursor = nextItem?.id ?? null;
  }

  return NextResponse.json({ transactions, nextCursor });
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    brandId,
    type,
    category,
    amount,
    productId,
    customerId,
    description,
    receiptUrl,
    date,
    quantity,
    costAmount: explicitCost,
  } = body as {
    brandId: string;
    type: "income" | "expense";
    category: string;
    amount: number;
    productId?: string | null;
    customerId?: string | null;
    description?: string | null;
    receiptUrl?: string | null;
    date?: string | null;
    quantity?: number | null;
    costAmount?: number | null;
  };

  if (!brandId || !type || !category || amount == null) {
    return NextResponse.json(
      { error: "brandId, type, category, amount wajib" },
      { status: 400 }
    );
  }
  if (type !== "income" && type !== "expense") {
    return NextResponse.json({ error: "type harus 'income' atau 'expense'" }, { status: 400 });
  }
  if (!TX_CATEGORIES.includes(category as any)) {
    return NextResponse.json(
      { error: `category harus salah satu dari: ${TX_CATEGORIES.join(", ")}` },
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

  // Resolve product (for HPP auto-compute)
  let product: { id: string; costPrice: number | null; price: number; name: string } | null = null;
  if (productId) {
    product = await db.product.findUnique({
      where: { id: productId },
      select: { id: true, costPrice: true, price: true, name: true },
    });
    if (!product) {
      return NextResponse.json({ error: "product tidak ditemukan" }, { status: 404 });
    }
  }

  // Compute costAmount (HPP snapshot)
  let costAmount: number | null = null;
  if (type === "income") {
    if (typeof explicitCost === "number") {
      costAmount = explicitCost;
    } else if (product) {
      const qty = quantity && quantity > 0 ? quantity : 1;
      if (product.costPrice != null) {
        costAmount = product.costPrice * qty;
      } else {
        costAmount = null; // margin belum lengkap
      }
    }
  }

  const tx = await db.transaction.create({
    data: {
      userId,
      brandId,
      type,
      category,
      amount: amt,
      costAmount,
      quantity: quantity ?? (product ? 1 : null),
      description: description?.trim() || null,
      receiptUrl: receiptUrl?.trim() || null,
      date: date ? new Date(date) : new Date(),
      productId: product?.id ?? null,
      customerId: customerId || null,
    },
    include: {
      product: { select: { id: true, name: true, price: true, costPrice: true } },
      customer: { select: { id: true, name: true, phone: true } },
    },
  });

  return NextResponse.json({ transaction: tx }, { status: 201 });
}
