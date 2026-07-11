// /api/notifications/read-all — POST marks ALL unread notifications for the
// logged-in user as read. Returns `{ updated: N }`.
//
// Optional `brandId` query param scopes the bulk-update to a single brand.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const brandId = req.nextUrl.searchParams.get("brandId");
  const where: { userId: string; readAt: null; brandId?: string } = {
    userId,
    readAt: null,
  };
  if (brandId) where.brandId = brandId;

  const now = new Date();
  const result = await db.notification.updateMany({
    where,
    data: { readAt: now },
  });

  return NextResponse.json({ updated: result.count });
}
