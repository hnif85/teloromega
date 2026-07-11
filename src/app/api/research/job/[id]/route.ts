// GET /api/research/job/[id] — poll job status for async research flow
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const job = await db.researchJob.findUnique({ where: { id } });

  if (!job || job.userId !== userId) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: job.id,
    status: job.status,
    progress: job.progress,
    progressMessage: job.progressMessage,
    error: job.error,
    isReady: job.status === "completed",
    isFailed: job.status === "failed",
    // Return result when completed
    resultJson: job.resultJson ? safeParse(job.resultJson) : null,
  });
}

function safeParse(s: string): unknown {
  try { return JSON.parse(s); } catch { return null; }
}
