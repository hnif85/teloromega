// /api/content — list brand content & generate new content (LLM/image)
// POST generates: caption | gambar | video | carousel
// GET returns saved content list (excludes large assetUrl to keep payload light)
// Falls back to template-based generation when AI API is unavailable.
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

// ─── Fallback generators (used when LLM/image API is unavailable) ────────────

function fallbackCaption(opts: {
  brandName: string;
  category: string;
  tone: string;
  productDesc: string;
  platform: string;
  angle: string;
  hashtags: string[];
}): string {
  const { brandName, category, tone, productDesc, platform, angle, hashtags } = opts;
  const emoji = category.includes("Makanan") ? "🔥😋" : category.includes("Fashion") ? "✨👗" : "💼";
  const hook =
    tone === "energik"
      ? `🔥 GILA SIH! ${angle.charAt(0).toUpperCase() + angle.slice(1)}`
      : tone === "humoris"
        ? `Ngaku deh, ${angle} itu bikin nagih 😂`
        : tone === "profesional"
          ? `${brandName} — ${angle}`
          : `Hai Sob! ✨ Yuk kenalan sama ${productDesc.split("—")[0].trim()}`;

  const tags = (hashtags.length > 0 ? hashtags : [`#${brandName.toLowerCase().replace(/\s/g, "")}`, "#umkm", "#produklokal", "#supportlokal"]).slice(0, 8);

  return [
    `${hook}`,
    ``,
    `${productDesc}.`,
    ``,
    `Cocok buat kamu yang suka ${angle.toLowerCase()}.`,
    `Langsung gas, stok terbatas! ⚡`,
    ``,
    `📍 Pesan via WA / DM`,
    `💰 Harga terjangkau, quality ga main-main`,
    ``,
    tags.join(" "),
  ].join("\n");
}

function fallbackVideoScript(opts: {
  brandName: string;
  productDesc: string;
  angle: string;
  hashtags: string[];
}) {
  const { brandName, productDesc, angle, hashtags } = opts;
  return JSON.stringify({
    script: `Video promosi ${productDesc} dengan angle "${angle}". Total 30 detik, 5 scene, hook di 3 detik pertama.`,
    scenes: [
      { duration_sec: 3, visual: "Close-up produk dengan lighting dramatis, text overlay hook", voiceover: "", text_overlay: `Wait... ${angle}?` },
      { duration_sec: 6, visual: "B-roll produk dari berbagai angle, slow motion", voiceover: `Kenalin nih, ${productDesc}.`, text_overlay: "" },
      { duration_sec: 8, visual: "Demo penggunaan / unboxing / test produk", voiceover: `Lihat deh kualitasnya. ${angle} banget kan?`, text_overlay: "Quality check ✅" },
      { duration_sec: 6, visual: "Testimoni / reaksi positif", voiceover: `Banyak yang udah cobain dan langsung repeat order.`, text_overlay: "🔥 Best seller" },
      { duration_sec: 7, visual: "Logo brand + CTA + kontak", voiceover: `Pesan sekarang di ${brandName}. Stok terbatas!`, text_overlay: "DM/WA sekarang 👆" },
    ],
    hashtags: hashtags.length > 0 ? hashtags : [`#${brandName.toLowerCase().replace(/\s/g, "")}`, "#fyp", "#viral", "#umkm"],
    hooks: [
      `Wait... ${angle}?`,
      `Siapa sangka ${productDesc.split("—")[0].trim()} bisa segini?`,
      `Jangan skip! Ini penting buat kamu yang ${angle.toLowerCase()}.`,
      `Gila sih, ${productDesc.split("—")[0].trim()} ini 😱`,
    ],
  });
}

function fallbackCarousel(opts: {
  brandName: string;
  productDesc: string;
  angle: string;
  hashtags: string[];
}) {
  const { brandName, productDesc, angle, hashtags } = opts;
  return JSON.stringify({
    slides: [
      { slide_num: 1, headline: `Swipe ➡️`, body: `Kenalan sama ${productDesc.split("—")[0].trim()}`, cta: "Swipe →" },
      { slide_num: 2, headline: `Apa istimewanya?`, body: `${angle.charAt(0).toUpperCase() + angle.slice(1)} — dibuat dengan kualitas terbaik.`, cta: "Lanjut →" },
      { slide_num: 3, headline: `Buat siapa?`, body: `Cocok buat kamu yang cari produk ${opts.brandName} berkualitas.`, cta: "Lanjut →" },
      { slide_num: 4, headline: `Testimoni`, body: `"Puas banget! Quality sesuai harga." — pelanggan setia`, cta: "Lanjut →" },
      { slide_num: 5, headline: `Pesan sekarang!`, body: `DM atau WA kami. Stok terbatas, harga spesial.`, cta: "Pesan 🛒" },
    ],
    hashtags: hashtags.length > 0 ? hashtags : [`#${brandName.toLowerCase().replace(/\s/g, "")}`, "#carousel", "#produklokal"],
  });
}

// SVG placeholder image (data URI) — used when image generation API is unavailable
function fallbackImage(opts: { brandName: string; productName: string; category: string; angle: string }): string {
  const { brandName, productName, category, angle } = opts;
  const initials = brandName.slice(0, 2).toUpperCase();
  const colors = ["#0D9488", "#EA580C", "#16A34A", "#D97706"];
  const c1 = colors[brandName.length % colors.length];
  const c2 = colors[(brandName.length + 2) % colors.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${c1}"/>
      <stop offset="100%" style="stop-color:${c2}"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#g)"/>
  <circle cx="512" cy="380" r="140" fill="rgba(255,255,255,0.15)"/>
  <text x="512" y="430" font-family="Manrope, sans-serif" font-size="120" font-weight="800" fill="white" text-anchor="middle">${initials}</text>
  <text x="512" y="600" font-family="Manrope, sans-serif" font-size="42" font-weight="700" fill="white" text-anchor="middle">${productName.slice(0, 30)}</text>
  <text x="512" y="660" font-family="Manrope, sans-serif" font-size="28" font-weight="400" fill="rgba(255,255,255,0.8)" text-anchor="middle">${category}</text>
  <rect x="362" y="720" width="300" height="60" rx="30" fill="rgba(255,255,255,0.2)"/>
  <text x="512" y="760" font-family="Manrope, sans-serif" font-size="22" font-weight="600" fill="white" text-anchor="middle">${angle.slice(0, 35)}</text>
</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

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
  const { brandId, productId, contextId, type, platform, angle } = body as {
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

  const brand = await db.brand.findUnique({ where: { id: brandId } });
  if (!brand || brand.userId !== userId) {
    return NextResponse.json({ error: "brand tidak ditemukan" }, { status: 404 });
  }

  let product: { name: string; description: string | null; type: string; price: number } | null = null;
  if (productId) {
    const p = await db.product.findUnique({ where: { id: productId } });
    if (!p || p.brandId !== brandId) {
      return NextResponse.json({ error: "produk tidak ditemukan" }, { status: 404 });
    }
    product = { name: p.name, description: p.description, type: p.type, price: p.price };
  }

  let context: { id: string; contextJson: string; researchId: string } | null = null;
  if (contextId) {
    const c = await db.context.findUnique({ where: { id: contextId } });
    if (!c || c.brandId !== brandId) {
      return NextResponse.json({ error: "context tidak ditemukan" }, { status: 404 });
    }
    context = { id: c.id, contextJson: c.contextJson, researchId: c.researchId };
  }

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
      /* ignore */
    }
  }

  const actionKey = TYPE_ACTION_KEY[type];
  const toneLabel = brand.toneOfVoice || "santai_ramah";
  const productDesc = product
    ? `${product.name} — ${product.description ?? "produk unggulan"}`
    : `${brand.name} — produk unggulan brand`;
  const productNameShort = product?.name ?? brand.name;
  const platformLabel = platform || ctxPlatform || "Instagram";
  const angleText = angle?.trim() || ctxAngle || "promosi produk menarik untuk audiens UMKM Indonesia";
  const hashtagHint = ctxHashtags.length > 0 ? ctxHashtags : [];

  // Charge credit BEFORE expensive AI call
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

  let resultBody: string | null = null;
  let assetUrl: string | null = null;
  let usedFallback = false;

  try {
    if (type === "caption") {
      try {
        const sys = [
          `Kamu adalah copywriter media sosial untuk UMKM Indonesia.`,
          `Brand: ${brand.name} (kategori: ${brand.category}).`,
          `Tone of voice: ${toneLabel}.`,
          `Produk: ${productDesc}.`,
          `Platform: ${platformLabel}.`,
          `Angle: ${angleText}.`,
          hashtagHint.length > 0 ? `Hashtag wajib dipakai: ${hashtagHint.join(", ")}.` : "",
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
      } catch (llmErr) {
        console.error("[content] caption LLM failed, using fallback:", llmErr instanceof Error ? llmErr.message : "unknown");
        resultBody = fallbackCaption({
          brandName: brand.name,
          category: brand.category,
          tone: toneLabel,
          productDesc,
          platform: platformLabel,
          angle: angleText,
          hashtags: hashtagHint,
        });
        usedFallback = true;
      }
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
      try {
        const imgUrl = await generateImage(imgPrompt, { size });
        if (imgUrl) assetUrl = imgUrl;
        else throw new Error("image generation returned null");
      } catch (imgErr) {
        console.error("[content] gambar generation failed, using fallback:", imgErr instanceof Error ? imgErr.message : "unknown");
        assetUrl = fallbackImage({ brandName: brand.name, productName: productNameShort, category: brand.category, angle: angleText });
        usedFallback = true;
      }
      // Caption (with its own fallback)
      try {
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
      } catch {
        resultBody = fallbackCaption({
          brandName: brand.name,
          category: brand.category,
          tone: toneLabel,
          productDesc,
          platform: platformLabel,
          angle: angleText,
          hashtags: hashtagHint,
        });
        usedFallback = true;
      }
    } else if (type === "video") {
      try {
        const sys = [
          `Kamu adalah scriptwriter video pendek ${platformLabel} untuk UMKM Indonesia.`,
          `Tone: ${toneLabel}. Brand: ${brand.name} (${brand.category}).`,
          `Produk: ${productDesc}. Angle: ${angleText}.`,
          hashtagHint.length > 0 ? `Hashtag wajib: ${hashtagHint.join(", ")}.` : "",
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
        if (!plan.scenes || !Array.isArray(plan.scenes)) plan.scenes = [];
        if (!plan.hashtags || !Array.isArray(plan.hashtags)) plan.hashtags = [];
        if (!plan.hooks || !Array.isArray(plan.hooks)) plan.hooks = [];
        resultBody = JSON.stringify(plan);
      } catch (llmErr) {
        console.error("[content] video LLM failed, using fallback:", llmErr instanceof Error ? llmErr.message : "unknown");
        resultBody = fallbackVideoScript({
          brandName: brand.name,
          productDesc,
          angle: angleText,
          hashtags: hashtagHint,
        });
        usedFallback = true;
      }
    } else if (type === "carousel") {
      try {
        const sys = [
          `Kamu adalah copywriter carousel ${platformLabel} untuk UMKM Indonesia.`,
          `Tone: ${toneLabel}. Brand: ${brand.name} (${brand.category}).`,
          `Produk: ${productDesc}. Angle: ${angleText}.`,
          hashtagHint.length > 0 ? `Hashtag wajib: ${hashtagHint.join(", ")}.` : "",
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
      } catch (llmErr) {
        console.error("[content] carousel LLM failed, using fallback:", llmErr instanceof Error ? llmErr.message : "unknown");
        resultBody = fallbackCarousel({
          brandName: brand.name,
          productDesc,
          angle: angleText,
          hashtags: hashtagHint,
        });
        usedFallback = true;
      }
    }

    // Save content row
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

    // Mark context as used
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
      usedFallback,
    });
  } catch (err: unknown) {
    // Fatal error — refund credit
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
