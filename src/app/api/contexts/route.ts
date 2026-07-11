// /api/contexts — list contexts for a brand (with usage count + research query)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const brandId = req.nextUrl.searchParams.get("brandId");
  if (!brandId) {
    return NextResponse.json({ contexts: [] });
  }

  const brand = await db.brand.findUnique({ where: { id: brandId } });
  if (!brand || brand.userId !== userId) {
    return NextResponse.json(
      { error: "brand tidak ditemukan" },
      { status: 404 }
    );
  }

  const rows = await db.context.findMany({
    where: { brandId },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      research: { select: { query: true, intent: true } },
      _count: { select: { contextUsage: true } },
    },
  });

  return NextResponse.json({
    contexts: rows.map((c) => ({
      id: c.id,
      researchId: c.researchId,
      targetModule: c.targetModule,
      context: safeParse(c.contextJson),
      usageCount: c._count.contextUsage,
      researchQuery: c.research.query,
      researchIntent: c.research.intent,
      createdAt: c.createdAt,
    })),
  });
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
