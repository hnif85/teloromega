// /api/goals/[id] — PATCH (update / pause / resume) & DELETE
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { GOAL_STATUSES, type GoalStatus } from "../route";

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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { target, endDate, status, notes } = body as {
    target?: number;
    endDate?: string;
    status?: string;
    notes?: string | null;
  };

  const existing = await db.goal.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "target tidak ditemukan" }, { status: 404 });
  }

  const data: {
    target?: number;
    endDate?: Date;
    status?: string;
    notes?: string | null;
  } = {};

  if (target != null) {
    const t = Number(target);
    if (!Number.isFinite(t) || t <= 0) {
      return NextResponse.json({ error: "target harus angka > 0" }, { status: 400 });
    }
    data.target = t;
  }
  if (endDate) {
    const d = new Date(endDate);
    if (!isNaN(d.getTime())) data.endDate = d;
  }
  if (status != null) {
    if (!GOAL_STATUSES.includes(status as GoalStatus)) {
      return NextResponse.json(
        { error: `status tidak valid. Pilihan: ${GOAL_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }
    data.status = status;
  }
  if (notes !== undefined) {
    data.notes = notes?.trim() || null;
  }

  const updated = await db.goal.update({ where: { id }, data });
  return NextResponse.json({ goal: shape(updated) });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await db.goal.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "target tidak ditemukan" }, { status: 404 });
  }

  await db.goal.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
