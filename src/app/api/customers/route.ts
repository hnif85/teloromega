// /api/customers — list customers (for campaign recipient picker)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const brandId = req.nextUrl.searchParams.get("brandId");
  if (!brandId) return NextResponse.json({ customers: [], leads: [] });

  const brand = await db.brand.findUnique({ where: { id: brandId } });
  if (!brand || brand.userId !== userId) {
    return NextResponse.json({ error: "brand tidak ditemukan" }, { status: 404 });
  }

  const [customers, leads] = await Promise.all([
    db.customer.findMany({
      where: { brandId },
      orderBy: { createdAt: "desc" },
    }),
    db.lead.findMany({
      where: { brandId, stage: { notIn: ["Closed"] } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({ customers, leads });
}
