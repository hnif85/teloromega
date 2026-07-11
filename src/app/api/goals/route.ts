// /api/goals — list & create goals
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const GOAL_TYPES = [
  "revenue",
  "orders",
  "products",
  "customers",
  "content",
  "research",
] as const;
export type GoalType = (typeof GOAL_TYPES)[number];

export const GOAL_PERIODS = ["monthly", "quarterly", "yearly"] as const;
export type GoalPeriod = (typeof GOAL_PERIODS)[number];

export const GOAL_STATUSES = ["active", "achieved", "failed", "paused"] as const;
export type GoalStatus = (typeof GOAL_STATUSES)[number];

// Compose a lightweight goal shape with computed progress percentage
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

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const brandId = req.nextUrl.searchParams.get("brandId");
  if (!brandId) return NextResponse.json({ goals: [] });

  const brand = await db.brand.findUnique({ where: { id: brandId } });
  if (!brand || brand.userId !== userId) {
    return NextResponse.json({ error: "brand tidak ditemukan" }, { status: 404 });
  }

  const status = req.nextUrl.searchParams.get("status"); // active | achieved | failed | paused | all
  const where: { brandId: string; status?: string } = { brandId };
  if (status && status !== "all" && GOAL_STATUSES.includes(status as GoalStatus)) {
    where.status = status;
  }

  const goals = await db.goal.findMany({
    where,
    orderBy: [{ status: "asc" }, { endDate: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ goals: goals.map(shape) });
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { brandId, type, period, target, startDate, endDate, notes } = body as {
    brandId: string;
    type: string;
    period: string;
    target: number;
    startDate?: string;
    endDate?: string;
    notes?: string | null;
  };

  if (!brandId || !type || !period || target == null) {
    return NextResponse.json(
      { error: "brandId, type, period, target wajib" },
      { status: 400 }
    );
  }
  if (!GOAL_TYPES.includes(type as GoalType)) {
    return NextResponse.json(
      { error: `type tidak valid. Pilihan: ${GOAL_TYPES.join(", ")}` },
      { status: 400 }
    );
  }
  if (!GOAL_PERIODS.includes(period as GoalPeriod)) {
    return NextResponse.json(
      { error: `period tidak valid. Pilihan: ${GOAL_PERIODS.join(", ")}` },
      { status: 400 }
    );
  }
  const tgt = Number(target);
  if (!Number.isFinite(tgt) || tgt <= 0) {
    return NextResponse.json({ error: "target harus angka > 0" }, { status: 400 });
  }

  const brand = await db.brand.findUnique({ where: { id: brandId } });
  if (!brand || brand.userId !== userId) {
    return NextResponse.json({ error: "brand tidak ditemukan" }, { status: 404 });
  }

  // Auto-compute date range from period if not provided
  const now = new Date();
  let sDate: Date;
  let eDate: Date;
  if (startDate && endDate) {
    sDate = new Date(startDate);
    eDate = new Date(endDate);
  } else if (period === "monthly") {
    sDate = new Date(now.getFullYear(), now.getMonth(), 1);
    eDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  } else if (period === "quarterly") {
    const q = Math.floor(now.getMonth() / 3);
    sDate = new Date(now.getFullYear(), q * 3, 1);
    eDate = new Date(now.getFullYear(), q * 3 + 3, 0, 23, 59, 59, 999);
  } else {
    sDate = new Date(now.getFullYear(), 0, 1);
    eDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
  }

  const goal = await db.goal.create({
    data: {
      brandId,
      userId,
      type,
      period,
      target: tgt,
      current: 0,
      startDate: sDate,
      endDate: eDate,
      status: "active",
      notes: notes?.trim() || null,
    },
  });

  return NextResponse.json({ goal: shape(goal) }, { status: 201 });
}
