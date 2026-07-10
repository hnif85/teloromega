// /api/transactions/summary — aggregated P&L, cash flow, margin, monthly trend
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

function periodRange(period: "month" | "quarter" | "year"): { from: Date; to: Date } {
  const now = new Date();
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  let from: Date;
  if (period === "month") {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (period === "quarter") {
    const q = Math.floor(now.getMonth() / 3);
    from = new Date(now.getFullYear(), q * 3, 1);
  } else {
    from = new Date(now.getFullYear(), 0, 1);
  }
  return { from, to };
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(d: Date): string {
  return d.toLocaleDateString("id-ID", { month: "short", year: "2-digit" });
}

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const brandId = req.nextUrl.searchParams.get("brandId");
  const periodParam = req.nextUrl.searchParams.get("period") ?? "month";
  const period: "month" | "quarter" | "year" =
    periodParam === "quarter" || periodParam === "year" ? periodParam : "month";

  if (!brandId) {
    return NextResponse.json(emptySummary());
  }

  const brand = await db.brand.findUnique({ where: { id: brandId } });
  if (!brand || brand.userId !== userId) {
    return NextResponse.json({ error: "brand tidak ditemukan" }, { status: 404 });
  }

  const { from, to } = periodRange(period);

  // Period transactions
  const periodTx = await db.transaction.findMany({
    where: { brandId, date: { gte: from, lte: to } },
    select: {
      type: true,
      category: true,
      amount: true,
      costAmount: true,
      date: true,
      productId: true,
      product: { select: { id: true, name: true, costPrice: true } },
    },
  });

  // Aggregate
  let totalIncome = 0;
  let totalExpense = 0;
  let totalHPP = 0;
  let incompleteMarginCount = 0;
  const byCatMap = new Map<
    string,
    { category: string; income: number; expense: number; count: number }
  >();
  const affectedProducts = new Map<string, { id: string; name: string; count: number }>();

  for (const t of periodTx) {
    const cat = byCatMap.get(t.category) ?? {
      category: t.category,
      income: 0,
      expense: 0,
      count: 0,
    };
    cat.count += 1;
    if (t.type === "income") {
      totalIncome += t.amount;
      cat.income += t.amount;
      if (t.costAmount != null) {
        totalHPP += t.costAmount;
      } else {
        incompleteMarginCount += 1;
        if (t.product) {
          const p = affectedProducts.get(t.product.id) ?? {
            id: t.product.id,
            name: t.product.name,
            count: 0,
          };
          p.count += 1;
          affectedProducts.set(t.product.id, p);
        }
      }
    } else {
      totalExpense += t.amount;
      cat.expense += t.amount;
    }
    byCatMap.set(t.category, cat);
  }

  // Other (non-HPP) expenses = totalExpense minus HPP-like expenses (bahan_baku treated as HPP)
  const hppLikeExpense = periodTx
    .filter((t) => t.type === "expense" && t.category === "bahan_baku")
    .reduce((s, t) => s + t.amount, 0);

  const grossProfit = totalIncome - totalHPP;
  const otherExpenses = totalExpense - hppLikeExpense;
  const netProfit = grossProfit - otherExpenses;
  const marginPct = totalIncome > 0 ? (grossProfit / totalIncome) * 100 : 0;

  // Cash flow (cash basis on transactions)
  const inflow = totalIncome;
  const outflow = totalExpense + totalHPP;
  const cashNet = inflow - outflow;

  // Monthly trend (last 6 months) — based on calendar months, not period
  const now = new Date();
  const months: { from: Date; to: Date; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
    months.push({ from: m, to: end, label: monthLabel(m) });
  }
  const monthlyTrend: { month: string; income: number; expense: number; profit: number }[] = [];
  for (const mo of months) {
    const txs = await db.transaction.findMany({
      where: { brandId, date: { gte: mo.from, lte: mo.to } },
      select: { type: true, amount: true, costAmount: true },
    });
    let inc = 0;
    let exp = 0;
    let hpp = 0;
    for (const t of txs) {
      if (t.type === "income") {
        inc += t.amount;
        hpp += t.costAmount ?? 0;
      } else {
        exp += t.amount;
      }
    }
    monthlyTrend.push({
      month: mo.label,
      income: inc,
      expense: exp + hpp,
      profit: inc - exp - hpp,
    });
  }

  // Tax estimate (PPh 0.5% UMKM + PPN 11% of income, rough estimate)
  const pphUmkm = Math.round(totalIncome * 0.005);
  const ppnEstimate = Math.round(totalIncome * 0.11);

  return NextResponse.json({
    period,
    from: from.toISOString(),
    to: to.toISOString(),
    totalIncome,
    totalExpense,
    totalHPP,
    grossProfit,
    otherExpenses,
    netProfit,
    marginPct: Math.round(marginPct * 10) / 10,
    byCategory: Array.from(byCatMap.values()).sort((a, b) => b.income + b.expense - (a.income + a.expense)),
    monthlyTrend,
    cashFlow: {
      inflow,
      outflow,
      net: cashNet,
      warning: cashNet < 0,
    },
    incompleteMarginCount,
    incompleteMarginProducts: Array.from(affectedProducts.values()).slice(0, 10),
    taxEstimate: {
      pphUmkm,
      ppnEstimate,
      total: pphUmkm + ppnEstimate,
      note: "Estimasi PPh Final 0,5% UMKM (PP 23/2018) + PPN 11% atas penjualan kena pajak. Bukan konsultasi pajak resmi.",
    },
  });
}

function emptySummary() {
  return {
    period: "month",
    totalIncome: 0,
    totalExpense: 0,
    totalHPP: 0,
    grossProfit: 0,
    otherExpenses: 0,
    netProfit: 0,
    marginPct: 0,
    byCategory: [],
    monthlyTrend: [],
    cashFlow: { inflow: 0, outflow: 0, net: 0, warning: false },
    incompleteMarginCount: 0,
    incompleteMarginProducts: [],
    taxEstimate: { pphUmkm: 0, ppnEstimate: 0, total: 0, note: "" },
  };
}
