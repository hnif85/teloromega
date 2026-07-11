// /api/credit/usage-log — list user's credit history
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const logs = await db.creditUsageLog.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ logs });
}
