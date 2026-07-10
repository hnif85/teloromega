// /api/goals/refresh — recompute `current` for all active goals of a brand
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

function shape(g: {
  id: string;
  brandId: string;
  userId: string;
  type: string;
  period: string;
  target: number;
  current: number;
  startDate: Date;
  endDate: Date;
  status: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  const pct =
    g.target > 0
      ? Math.min(100, Math.round((g.current / g.target) * 1000) / 10)
      : 0;
  return { ...g, progress: pct };
}

// Compute the current value for a goal based on its type + date range.
async function computeCurrent(
  brandId: string,
  type: string,
  startDate: Date,
  endDate: Date
): Promise<number> {
  switch (type) {
    case "revenue": {
      // SUM of income transactions in date range
      const agg = await db.transaction.aggregate({
        where: {
          brandId,
          type: "income",
          date: { gte: startDate, lte: endDate },
        },
        _sum: { amount: true },
      });
      return agg._sum.amount ?? 0;
    }
    case "orders": {
      // COUNT orders in date range (excluding cancelled)
      const c = await db.order.count({
        where: {
          brandId,
          status: { not: "Dibatalkan" },
          createdAt: { gte: startDate, lte: endDate },
        },
      });
      return c;
    }
    case "products": {
      // COUNT active products created in date range
      const c = await db.product.count({
        where: {
          brandId,
          isActive: true,
          createdAt: { gte: startDate, lte: endDate },
        },
      });
      return c;
    }
    case "customers": {
      // COUNT new customers in date range
      const c = await db.customer.count({
        where: {
          brandId,
          createdAt: { gte: startDate, lte: endDate },
        },
      });
      return c;
    }
    case "content": {
      // COUNT content created in date range
      const c = await db.content.count({
        where: {
          brandId,
          createdAt: { gte: startDate, lte: endDate },
        },
      });
      return c;
    }
    case "research": {
      // COUNT research completed in date range
      const c = await db.research.count({
        where: {
          brandId,
          status: "completed",
          createdAt: { gte: startDate, lte: endDate },
        },
      });
      return c;
    }
    default:
      return 0;
  }
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { brandId } = body as { brandId?: string };
  if (!brandId) {
    return NextResponse.json({ error: "brandId wajib" }, { status: 400 });
  }

  const brand = await db.brand.findUnique({ where: { id: brandId } });
  if (!brand || brand.userId !== userId) {
    return NextResponse.json({ error: "brand tidak ditemukan" }, { status: 404 });
  }

  // Only refresh goals that are still in progress (active or paused)
  const goals = await db.goal.findMany({
    where: { brandId, status: { in: ["active", "paused"] } },
  });

  const now = new Date();
  const updated = await Promise.all(
    goals.map(async (g) => {
      const current = await computeCurrent(g.brandId, g.type, g.startDate, g.endDate);
      // Auto-mark achieved if current >= target.
      // Auto-mark failed if the end date has passed without hitting the target.
      let status = g.status;
      if (current >= g.target) {
        status = "achieved";
      } else if (now > g.endDate) {
        status = "failed";
      } else if (status === "paused") {
        // keep paused
        status = "paused";
      } else {
        status = "active";
      }
      const u = await db.goal.update({
        where: { id: g.id },
        data: { current, status },
      });
      return shape(u);
    })
  );

  return NextResponse.json({ goals: updated, refreshedAt: now.toISOString() });
}
