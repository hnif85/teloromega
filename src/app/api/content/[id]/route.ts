// /api/content/[id] — get single content (with full body + assetUrl) & delete
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const content = await db.content.findUnique({
    where: { id },
    include: { product: true, context: { include: { research: true } } },
  });
  if (!content) {
    return NextResponse.json({ error: "konten tidak ditemukan" }, { status: 404 });
  }

  // Verify ownership via brand
  const brand = await db.brand.findUnique({ where: { id: content.brandId } });
  if (!brand || brand.userId !== userId) {
    return NextResponse.json({ error: "tidak punya akses" }, { status: 403 });
  }

  return NextResponse.json({
    content: {
      id: content.id,
      brandId: content.brandId,
      productId: content.productId,
      productName: content.product?.name ?? null,
      contextId: content.contextId,
      type: content.type,
      platform: content.platform,
      body: content.body,
      assetUrl: content.assetUrl,
      createdAt: content.createdAt,
    },
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const content = await db.content.findUnique({ where: { id } });
  if (!content) {
    return NextResponse.json({ error: "konten tidak ditemukan" }, { status: 404 });
  }

  const brand = await db.brand.findUnique({ where: { id: content.brandId } });
  if (!brand || brand.userId !== userId) {
    return NextResponse.json({ error: "tidak punya akses" }, { status: 403 });
  }

  await db.content.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
