// /api/contexts/[id]/use — mark context as used
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

const VALID_USED_FOR = [
  "konten.generate",
  "toko.apply_price",
  "keuangan.view_projection",
] as const;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { usedFor, referenceId } = body as {
    usedFor: string;
    referenceId?: string;
  };

  if (!usedFor || !VALID_USED_FOR.includes(usedFor as (typeof VALID_USED_FOR)[number])) {
    return NextResponse.json(
      {
        error: `usedFor harus salah satu: ${VALID_USED_FOR.join(", ")}`,
      },
      { status: 400 }
    );
  }

  // Fetch context + verify ownership via brand
  const context = await db.context.findUnique({
    where: { id },
    include: { brand: true },
  });
  if (!context) {
    return NextResponse.json({ error: "context tidak ditemukan" }, { status: 404 });
  }
  if (context.brand.userId !== userId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const usage = await db.contextUsage.create({
    data: {
      contextId: id,
      brandId: context.brandId,
      usedFor,
      referenceId: referenceId?.trim() || null,
    },
  });

  return NextResponse.json({ usage, ok: true });
}
