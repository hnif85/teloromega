// /api/content — list brand content & generate new content (LLM/image)
// POST generates: caption | gambar | video | carousel
// GET returns saved content list (excludes large assetUrl to keep payload light)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { chargeCredit, refundCredit } from "@/lib/credit";
import { llmChat, llmJson, generateImage } from "@/lib/ai";
import type { CreditActionKey } from "@/lib/constants";

export const dynamic = "force-dynamic";

const TYPE_ACTION_KEY: Record<string, CreditActionKey> = {
  caption: "konten.caption",
  gambar: "konten.gambar",
  video: "konten.video",
  carousel: "konten.carousel",
};

const VALID_TYPES = new Set(["caption", "gambar", "video", "carousel"]);

// ─── GET /api/content?brandId=X ─────────────────────────────
export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const brandId = req.nextUrl.searchParams.get("brandId");
  if (!brandId) return NextResponse.json({ contents: [] });

  const brand = await db.brand.findUnique({ where: { id: brandId } });
  if (!brand || brand.userId !== userId) {
    return NextResponse.json({ error: "brand tidak ditemukan" }, { status: 404 });
  }

  const rows = await db.content.findMany({
    where: { brandId },
    orderBy: { createdAt: "desc" },
    include: { product: true },
    take: 100,
  });

  // Omit assetUrl in list view to keep response small (base64 PNG ~1.5MB)
  const contents = rows.map((c) => ({
    id: c.id,
    brandId: c.brandId,
    productId: c.productId,
    productName: c.product?.name ?? null,
    contextId: c.contextId,
    type: c.type,
    platform: c.platform,
    body: c.body,
    createdAt: c.createdAt,
  }));

  return NextResponse.json({ contents });
}

// ─── POST /api/content — generate ───────────────────────────
export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    brandId,
    productId,
    contextId,
    type,
    platform,
    angle,
  } = body as {
    brandId: string;
    productId?: string | null;
    contextId?: string | null;
    type: "caption" | "gambar" | "video" | "carousel";
    platform?: string | null;
    angle?: string | null;
  };

  if (!brandId || !type) {
    return NextResponse.json({ error: "brandId dan type wajib" }, { status: 400 });
  }
  if (!VALID_TYPES.has(type)) {
    return NextResponse.json({ error: "type tidak valid" }, { status: 400 });
  }

  // ── Verify brand ownership ────────────────────────────────
  const brand = await db.brand.findUnique({ where: { id: brandId } });
  if (!brand || brand.userId !== userId) {
    return NextResponse.json({ error: "brand tidak ditemukan" }, { status: 404 });
  }

  // ── Load product (optional) ───────────────────────────────
  let product: { name: string; description: string | null; type: string; price: number } | null = null;
  if (productId) {
    const p = await db.product.findUnique({ where: { id: productId } });
    if (!p || p.brandId !== brandId) {
      return NextResponse.json({ error: "produk tidak ditemukan" }, { status: 404 });
    }
    product = { name: p.name, description: p.description, type: p.type, price: p.price };
  }

  // ── Load context (optional) — for konten angle/hashtags ───
  let context: { id: string; contextJson: string; researchId: string } | null = null;
  if (contextId) {
    const c = await db.context.findUnique({ where: { id: contextId } });
    if (!c || c.brandId !== brandId) {
      return NextResponse.json({ error: "context tidak ditemukan" }, { status: 404 });
    }
    context = { id: c.id, contextJson: c.contextJson, researchId: c.researchId };
  }

  // ── Extract context recommendations (angle/platform/hashtags) ─
  let ctxAngle: string | null = null;
  let ctxPlatform: string | null = null;
  let ctxHashtags: string[] = [];
  if (context) {
    try {
      const parsed = JSON.parse(context.contextJson) as {
        recommendations?: { angle?: string; platform?: string; hashtags?: string[] }[];
      };
      const rec0 = parsed.recommendations?.[0];
      if (rec0) {
        ctxAngle = rec0.angle ?? null;
        ctxPlatform = rec0.platform ?? null;
        ctxHashtags = Array.isArray(rec0.hashtags) ? rec0.hashtags : [];
      }
    } catch {
      /* ignore malformed context */
    }
  }

  // ── Resolve final params ──────────────────────────────────
  const actionKey = TYPE_ACTION_KEY[type];
  const toneLabel = brand.toneOfVoice || "santai_ramah";
  const productDesc = product
    ? `${product.name} — ${product.description ?? "produk unggulan"}`
    : "produk unggulan brand";
  const platformLabel = platform || ctxPlatform || "Instagram";
  const angleText = angle?.trim() || ctxAngle || "promosi produk menarik untuk audiens UMKM Indonesia";
  const hashtagHint = ctxHashtags.length > 0 ? ctxHashtags.join(", ") : "";

  // ── Charge credit BEFORE expensive LLM/image call ────────
  const charge = await chargeCredit({ userId, brandId, actionKey });
  if (!charge.ok) {
    return NextResponse.json(
      {
        error: charge.reason === "insufficient_balance" ? "Credit tidak cukup" : "Gagal charge credit",
        balanceAfter: charge.balanceAfter,
      },
      { status: 402 }
    );
  }

  try {
    let resultBody: string | null = null;
    let assetUrl: string | null = null;

    if (type === "caption") {
      const sys = [
        `Kamu adalah copywriter media sosial untuk UMKM Indonesia.`,
        `Brand: ${brand.name} (kategori: ${brand.category}).`,
        `Tone of voice: ${toneLabel}.`,
        `Produk: ${productDesc}.`,
        `Platform: ${platformLabel}.`,
        `Angle: ${angleText}.`,
        hashtagHint ? `Hashtag wajib dipakai: ${hashtagHint}.` : "",
        `Aturan: maksimal 1500 karakter, sertakan emoji relevan, dan 5-8 hashtag di bagian bawah.`,
        `Jangan ada teks penjelas atau meta — langsung caption siap pakai.`,
      ].filter(Boolean).join(" ");
      const caption = await llmChat(
        [
          { role: "system", content: sys },
          { role: "user", content: `Buatkan caption ${platformLabel} untuk produk ini.` },
        ],
        { temperature: 0.8, max_tokens: 1000 }
      );
      resultBody = caption.slice(0, 1500);
    } else if (type === "gambar") {
      const imgPrompt = [
        `Product photography style, professional commercial photo,`,
        `${productDesc}, brand ${brand.name} (${brand.category} category),`,
        `angle: ${angleText}, for ${platformLabel} post,`,
        `studio lighting, high detail, modern aesthetic, appetizing,`,
        `clean background, vibrant colors, sharp focus, no text overlay.`,
      ].join(" ");
      const sizeMap: Record<string, "1024x1024" | "768x1344" | "864x1152" | "1344x768" | "1152x864" | "1440x720" | "720x1440"> = {
        TikTok: "768x1344",
        Instagram: "1024x1024",
        Facebook: "1024x1024",
        WhatsApp: "1024x1024",
        "Twitter/X": "1440x720",
      };
      const size = sizeMap[platformLabel] ?? "1024x1024";
      const imgUrl = await generateImage(imgPrompt, { size });
      if (imgUrl) assetUrl = imgUrl;
      // Also generate matching caption
      const caption = await llmChat(
        [
          {
            role: "system",
            content: [
              `Kamu adalah copywriter ${platformLabel} untuk UMKM Indonesia.`,
              `Tone: ${toneLabel}. Brand: ${brand.name}. Produk: ${productDesc}.`,
              `Tulis caption singkat (200-400 karakter) untuk gambar produk ini.`,
              `Sertakan 3-5 hashtag. Langsung caption tanpa meta-teks.`,
            ].join(" "),
          },
          { role: "user", content: `Buatkan caption singkat.` },
        ],
        { temperature: 0.8, max_tokens: 600 }
      );
      resultBody = caption;
    } else if (type === "video") {
      const sys = [
        `Kamu adalah scriptwriter video pendek ${platformLabel} untuk UMKM Indonesia.`,
        `Tone: ${toneLabel}. Brand: ${brand.name} (${brand.category}).`,
        `Produk: ${productDesc}. Angle: ${angleText}.`,
        hashtagHint ? `Hashtag wajib: ${hashtagHint}.` : "",
        `Buat 4-6 scene, total durasi 15-45 detik.`,
        `Output JSON saja, tanpa markdown, sesuai schema yang diminta.`,
      ].filter(Boolean).join(" ");
      const plan = await llmJson<{
        script: string;
        scenes: { duration_sec: number; visual: string; voiceover: string; text_overlay: string }[];
        hashtags: string[];
        hooks: string[];
      }>(
        [
          { role: "system", content: sys },
          {
            role: "user",
            content: `Buatkan script video dengan struktur JSON: { "script": string (ringkasan total), "scenes": [{ "duration_sec": number, "visual": string, "voiceover": string, "text_overlay": string }], "hashtags": string[], "hooks": string[] (3-5 hook alternatif untuk opening) }`,
          },
        ],
        { temperature: 0.8, max_tokens: 2000 }
      );
      // Validate / normalize shape
      if (!plan.scenes || !Array.isArray(plan.scenes)) plan.scenes = [];
      if (!plan.hashtags || !Array.isArray(plan.hashtags)) plan.hashtags = [];
      if (!plan.hooks || !Array.isArray(plan.hooks)) plan.hooks = [];
      resultBody = JSON.stringify(plan);
    } else if (type === "carousel") {
      const sys = [
        `Kamu adalah copywriter carousel ${platformLabel} untuk UMKM Indonesia.`,
        `Tone: ${toneLabel}. Brand: ${brand.name} (${brand.category}).`,
        `Produk: ${productDesc}. Angle: ${angleText}.`,
        hashtagHint ? `Hashtag wajib: ${hashtagHint}.` : "",
        `Buat 4-6 slide. Output JSON saja, tanpa markdown.`,
      ].filter(Boolean).join(" ");
      const plan = await llmJson<{
        slides: { slide_num: number; headline: string; body: string; cta: string }[];
        hashtags: string[];
      }>(
        [
          { role: "system", content: sys },
          {
            role: "user",
            content: `Buatkan carousel dengan struktur JSON: { "slides": [{ "slide_num": number, "headline": string (max 60 char), "body": string (max 200 char), "cta": string (max 30 char) }], "hashtags": string[] }`,
          },
        ],
        { temperature: 0.8, max_tokens: 1500 }
      );
      if (!plan.slides || !Array.isArray(plan.slides)) plan.slides = [];
      if (!plan.hashtags || !Array.isArray(plan.hashtags)) plan.hashtags = [];
      resultBody = JSON.stringify(plan);
    }

    // ── Save content row ─────────────────────────────────────
    const content = await db.content.create({
      data: {
        brandId,
        productId: productId ?? null,
        contextId: contextId ?? null,
        type,
        body: resultBody,
        assetUrl,
        platform: platformLabel,
      },
    });

    // ── Mark context as used (if contextId was provided) ─────
    if (contextId) {
      await db.contextUsage.create({
        data: {
          contextId,
          brandId,
          usedFor: "konten.generate",
          referenceId: content.id,
        },
      });
    }

    return NextResponse.json({
      content: {
        id: content.id,
        brandId: content.brandId,
        productId: content.productId,
        productName: product?.name ?? null,
        contextId: content.contextId,
        type: content.type,
        platform: content.platform,
        body: content.body,
        assetUrl: content.assetUrl,
        createdAt: content.createdAt,
      },
      balanceAfter: charge.balanceAfter,
    });
  } catch (err: unknown) {
    // ── Refund credit on any failure after charge ──────────
    await refundCredit({
      userId,
      brandId,
      actionKey,
      referenceId: undefined,
      originalBalanceBefore: charge.balanceAfter,
    });
    const msg = err instanceof Error ? err.message : "Gagal generate konten";
    return NextResponse.json(
      { error: msg, refunded: true, balanceAfter: charge.balanceAfter },
      { status: 500 }
    );
  }
}
