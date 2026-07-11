// /api/research — POST: run pipeline | GET: list by brand
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { chargeCredit, refundCredit } from "@/lib/credit";
import { setAiContext } from "@/lib/ai";
import { runResearchPipeline, generateContexts, type BrandLite } from "./_pipeline";

export const dynamic = "force-dynamic";

// ─── POST: run research pipeline ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { brandId, query } = body as { brandId: string; query: string };

    if (!brandId || !query?.trim()) {
      return NextResponse.json(
        { error: "brandId dan query wajib" },
        { status: 400 }
      );
    }

    // Step 1: verify brand ownership
    const brand = await db.brand.findUnique({ where: { id: brandId } });
    if (!brand || brand.userId !== userId) {
      return NextResponse.json(
        { error: "brand tidak ditemukan" },
        { status: 404 }
      );
    }

    // Set AI context for prompt logging
    setAiContext({ feature: "research", userId, brandId, service: "Market Research" });

    // Step 2: charge credit
    const charge = await chargeCredit({
      userId,
      brandId,
      actionKey: "riset.pasar",
    });
    if (!charge.ok) {
      return NextResponse.json(
        {
          error: "Credit tidak cukup untuk riset pasar",
          reason: "insufficient_balance",
          required: 5,
        },
        { status: 402 }
      );
    }

    // Steps 3-5: run pipeline (web search + classify + synthesize)
    const brandLite: BrandLite = {
      id: brand.id,
      name: brand.name,
      category: brand.category,
      toneOfVoice: brand.toneOfVoice,
      description: brand.description,
    };

    let pipelineResult;
    let research;
    try {
      pipelineResult = await runResearchPipeline(brandLite, query.trim());

      // Step 6: persist research
      research = await db.research.create({
        data: {
          userId,
          brandId,
          query: query.trim(),
          intent: pipelineResult.intent,
          resultJson: JSON.stringify(pipelineResult.result),
          status: "completed",
        },
      });

      // Step 7: auto-generate 3 contexts (FREE, no credit charge)
      const contexts = await generateContexts(
        research.id,
        brandId,
        brandLite,
        pipelineResult.result
      );

      // Step 8: return success
      return NextResponse.json({
        research: {
          id: research.id,
          query: research.query,
          intent: research.intent,
          status: research.status,
          createdAt: research.createdAt,
          result: pipelineResult.result,
        },
        contexts: contexts.map((c) => ({
          id: c.id,
          targetModule: c.targetModule,
          context: JSON.parse(c.contextJson),
          createdAt: c.createdAt,
        })),
        creditBalanceAfter: charge.balanceAfter,
      });
    } catch (err) {
      // Step 9: refund on failure (after charge)
      await refundCredit({
        userId,
        brandId,
        actionKey: "riset.pasar",
        originalBalanceBefore: charge.balanceAfter + 5,
      });
      console.error("[research] pipeline failed:", err);
      return NextResponse.json(
        {
          error:
            "Riset gagal dijalankan. Credit sudah dikembalikan. Coba lagi.",
          detail: err instanceof Error ? err.message : "unknown_error",
        },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error("[research POST] fatal:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

// ─── GET: list research by brand ─────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const brandId = req.nextUrl.searchParams.get("brandId");
  if (!brandId) {
    return NextResponse.json({ research: [] });
  }

  const brand = await db.brand.findUnique({ where: { id: brandId } });
  if (!brand || brand.userId !== userId) {
    return NextResponse.json(
      { error: "brand tidak ditemukan" },
      { status: 404 }
    );
  }

  const rows = await db.research.findMany({
    where: { brandId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      _count: { select: { contexts: true } },
    },
  });

  return NextResponse.json({
    research: rows.map((r) => ({
      id: r.id,
      query: r.query,
      intent: r.intent,
      status: r.status,
      createdAt: r.createdAt,
      contextsCount: r._count.contexts,
      result: safeParse(r.resultJson),
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
