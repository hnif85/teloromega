// /api/content/[id] — get, edit, & delete content
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { chargeCredit, refundCredit } from "@/lib/credit";
import { llmChat, llmJson, generateImage, setAiContext } from "@/lib/ai";
import type { CreditActionKey } from "@/lib/constants";

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

// ─── PATCH /api/content/[id] — edit (regenerate dengan instruksi) ────────
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  let bodyParsed: { edit?: string };
  try {
    bodyParsed = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const edit = bodyParsed.edit?.trim();
  if (!edit) return NextResponse.json({ error: "edit wajib diisi" }, { status: 400 });

  const content = await db.content.findUnique({
    where: { id },
    include: { product: true, brand: true },
  });
  if (!content) return NextResponse.json({ error: "konten tidak ditemukan" }, { status: 404 });
  if (content.brand.userId !== userId) {
    return NextResponse.json({ error: "tidak punya akses" }, { status: 403 });
  }

  const actionKey: CreditActionKey = content.type === "gambar" ? "konten.gambar" : "konten.video";
  const charge = await chargeCredit({ userId, brandId: content.brandId, actionKey });
  if (!charge.ok) {
    return NextResponse.json(
      { error: charge.reason === "insufficient_balance" ? "Credit tidak cukup" : "Gagal charge credit", balanceAfter: charge.balanceAfter },
      { status: 402 }
    );
  }

  setAiContext({ feature: `content_${content.type}_edit`, userId, brandId: content.brandId, service: "Content Editor" });

  const brand = content.brand;
  const product = content.product;
  const productDesc = product
    ? `${product.name} — ${product.description ?? "produk unggulan"}`
    : `${brand.name} — produk unggulan brand`;
  const platformLabel = content.platform || "Instagram";

  let newBody = content.body;
  let newAssetUrl = content.assetUrl;
  let usedFallback = false;

  try {
    if (content.type === "gambar") {
      // Regenerate image
      const imgPrompt = [
        `Product photography style, professional commercial photo,`,
        `${productDesc}, brand ${brand.name} (${brand.category}),`,
        `for ${platformLabel} post,`,
        `Edit instruction: ${edit}`,
        `studio lighting, high detail, modern aesthetic,`,
        `clean background, vibrant colors, sharp focus, no text overlay.`,
      ].join(" ");
      const sizeMap: Record<string, string> = {
        TikTok: "768x1344", Instagram: "1024x1024", Facebook: "1024x1024",
        WhatsApp: "1024x1024", "Twitter/X": "1440x720",
      };
      const size = (sizeMap[platformLabel] ?? "1024x1024") as any;
      try {
        const imgUrl = await generateImage(imgPrompt, { size, imageUrl: product?.imageUrl ?? undefined });
        if (imgUrl) newAssetUrl = imgUrl;
        else throw new Error("image generation returned null");
      } catch {
        usedFallback = true;
      }
      // Regenerate caption
      try {
        const caption = await llmChat(
          [
            {
              role: "system",
              content: `Edit caption ${platformLabel} untuk produk berikut. Original: "${content.body}". Instruksi edit: ${edit}. Tulis caption baru langsung siap pakai, 200-400 karakter, sertakan 3-5 hashtag. Tanpa meta-teks.`,
            },
            { role: "user", content: edit },
          ],
          { temperature: 0.8, max_tokens: 600 }
        );
        if (caption) newBody = caption;
      } catch {
        usedFallback = true;
      }
    } else if (content.type === "video") {
      try {
        const sys = [
          `Edit script video ${platformLabel} berikut.`,
          `Original: ${content.body}`,
          `Instruksi edit: ${edit}`,
          `Output JSON saja, tanpa markdown, structure sama seperti original (script, scenes, hashtags, hooks).`,
        ].join(" ");
        const plan = await llmJson<{
          script?: string;
          scenes?: any[];
          hashtags?: string[];
          hooks?: string[];
        }>(
          [{ role: "system", content: sys }, { role: "user", content: edit }],
          { temperature: 0.8, max_tokens: 2000 }
        );
        if (plan && (plan.scenes || plan.script)) {
          newBody = JSON.stringify(plan);
        }
      } catch {
        usedFallback = true;
      }
    }

    const updated = await db.content.update({
      where: { id },
      data: { body: newBody, assetUrl: newAssetUrl },
      include: { product: true },
    });

    return NextResponse.json({
      content: {
        id: updated.id, brandId: updated.brandId, productId: updated.productId,
        productName: updated.product?.name ?? null, contextId: updated.contextId,
        type: updated.type, platform: updated.platform,
        body: updated.body, assetUrl: updated.assetUrl, createdAt: updated.createdAt,
      },
      balanceAfter: charge.balanceAfter,
      usedFallback,
    });
  } catch (err: unknown) {
    await refundCredit({ userId, brandId: content.brandId, actionKey, referenceId: id, originalBalanceBefore: charge.balanceAfter });
    const msg = err instanceof Error ? err.message : "Gagal edit konten";
    return NextResponse.json({ error: msg, refunded: true, balanceAfter: charge.balanceAfter }, { status: 500 });
  }
}
