// /api/keuangan/import-template/confirm — batch insert confirmed transactions
import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { chargeCredit } from "@/lib/credit";

export const dynamic = "force-dynamic";

interface ImportRow {
  date: string;
  type: "income" | "expense";
  category: string;
  amount: number;
  description: string | null;
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json() as { brandId: string; rows: ImportRow[] };
  if (!body.brandId || !Array.isArray(body.rows) || body.rows.length === 0) {
    return NextResponse.json({ error: "brandId and rows required" }, { status: 400 });
  }

  const { brandId, rows } = body;

  const brand = await db.brand.findUnique({ where: { id: brandId } });
  if (!brand || brand.userId !== userId) {
    return NextResponse.json({ error: "brand not found" }, { status: 404 });
  }

  const charge = await chargeCredit({
    userId,
    brandId,
    actionKey: "keuangan.import_template",
  });

  if (!charge.ok) {
    return NextResponse.json(
      { error: charge.reason === "insufficient_balance" ? "Credit tidak cukup" : "Gagal charge credit" },
      { status: 402 },
    );
  }

  const created = await db.transaction.createMany({
    data: rows.map((r) => ({
      userId,
      brandId,
      type: r.type,
      category: r.category,
      amount: Math.round(r.amount),
      description: r.description,
      date: new Date(r.date),
    })),
  });

  return NextResponse.json({
    imported: created.count,
    balanceAfter: charge.balanceAfter,
  });
}
