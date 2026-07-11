// /api/research — POST: create job + kick off async pipeline | GET: list by brand
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { chargeCredit, refundCredit } from "@/lib/credit";
import { setAiContext } from "@/lib/ai";
import { runResearchPipeline, generateContexts, type BrandLite } from "./_pipeline";

export const dynamic = "force-dynamic";

// ─── Background: process research job after response is sent ──────────────────
async function processJob(
  jobId: string,
  brandId: string,
  userId: string,
  query: string,
  chargeBalanceBefore: number
) {
  try {
    const brand = await db.brand.findUnique({ where: { id: brandId } });
    if (!brand) {
      await db.researchJob.update({ where: { id: jobId }, data: { status: "failed", error: "Brand not found" } });
      await refundCredit({ userId, brandId, actionKey: "riset.pasar", originalBalanceBefore: chargeBalanceBefore });
      return;
    }

    setAiContext({ feature: "research", userId, brandId, service: "Market Research" });

    const brandLite: BrandLite = {
      id: brand.id, name: brand.name, category: brand.category,
      toneOfVoice: brand.toneOfVoice, description: brand.description,
    };

    const updateProgress = async (status: string, progress: number, message: string) => {
      await db.researchJob.update({ where: { id: jobId }, data: { status, progress, progressMessage: message } });
    };

    const pipelineResult = await runResearchPipeline(brandLite, query, updateProgress);

    const research = await db.research.create({
      data: {
        userId, brandId, query,
        intent: pipelineResult.intent,
        resultJson: JSON.stringify(pipelineResult.result),
        status: "completed", jobId,
      },
    });

    await generateContexts(research.id, brandId, brandLite, pipelineResult.result);

    await db.researchJob.update({
      where: { id: jobId },
      data: {
        status: "completed", progress: 100,
        progressMessage: "Riset selesai!",
        resultJson: JSON.stringify(pipelineResult.result),
      },
    });
  } catch (err) {
    console.error("[research] background pipeline failed:", err);
    await db.researchJob.update({
      where: { id: jobId },
      data: { status: "failed", error: err instanceof Error ? err.message : "Pipeline error" },
    });
    await refundCredit({ userId, brandId, actionKey: "riset.pasar", originalBalanceBefore: chargeBalanceBefore });
  }
}

// ─── POST: create job → return jobId → kick off background pipeline ───────────
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { brandId, query } = body as { brandId: string; query: string };

    if (!brandId || !query?.trim()) {
      return NextResponse.json({ error: "brandId dan query wajib" }, { status: 400 });
    }

    const brand = await db.brand.findUnique({ where: { id: brandId } });
    if (!brand || brand.userId !== userId) {
      return NextResponse.json({ error: "brand tidak ditemukan" }, { status: 404 });
    }

    const charge = await chargeCredit({ userId, brandId, actionKey: "riset.pasar" });
    if (!charge.ok) {
      return NextResponse.json(
        { error: "Credit tidak cukup untuk riset pasar", reason: "insufficient_balance", required: 5 },
        { status: 402 }
      );
    }

    const job = await db.researchJob.create({
      data: {
        userId, brandId, query: query.trim(),
        status: "queued", progress: 0, progressMessage: "Menunggu...",
      },
    });

    // Kick off async processing (runs after response is sent — works on node server.js)
    processJob(job.id, brandId, userId, query.trim(), charge.balanceAfter + 5).catch((err) => {
      console.error("[research] background processJob failed:", err);
    });

    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      progress: 0,
      progressMessage: job.progressMessage,
      creditBalanceAfter: charge.balanceAfter,
    });
  } catch (err) {
    console.error("[research POST] fatal:", err);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
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
