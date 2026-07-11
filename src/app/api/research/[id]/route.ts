// /api/research/[id] — single research detail
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const research = await db.research.findUnique({
    where: { id },
    include: {
      contexts: {
        orderBy: { createdAt: "asc" },
        include: { _count: { select: { contextUsage: true } } },
      },
    },
  });

  if (!research) {
    return NextResponse.json({ error: "riset tidak ditemukan" }, { status: 404 });
  }
  if (research.userId !== userId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let result: unknown = null;
  try {
    result = JSON.parse(research.resultJson);
  } catch {
    /* ignore */
  }

  return NextResponse.json({
    research: {
      id: research.id,
      query: research.query,
      intent: research.intent,
      status: research.status,
      createdAt: research.createdAt,
      result,
      contexts: research.contexts.map((c) => ({
        id: c.id,
        targetModule: c.targetModule,
        context: safeParse(c.contextJson),
        usageCount: c._count.contextUsage,
        createdAt: c.createdAt,
      })),
    },
  });
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
