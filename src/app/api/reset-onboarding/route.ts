// POST /api/reset-onboarding — soft-delete all active brands for the current user
// so the onboarding dialog re-appears. User account + credit balance preserved.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Soft-delete all active brands (cascades to products, orders, etc. via isActive checks)
  await db.brand.updateMany({
    where: { userId, isActive: true },
    data: { isActive: false },
  });

  return NextResponse.json({ ok: true });
}
