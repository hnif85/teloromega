// /api/keuangan/projection — read context's proyeksi_margin, optionally apply product costPrice,
// charge 3 credits, enhance with LLM narrative, mark context as used.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { chargeCredit } from "@/lib/credit";
import { llmJson } from "@/lib/ai";

export const dynamic = "force-dynamic";

interface ProjectionContextJson {
  proyeksi_margin?: {
    skenario?: string;
    asumsi_modal?: number | string;
    margin_sebelum?: number | string;
    margin_sesudah?: number | string;
    estimasi_volume_change?: string | number;
    rekomendasi?: string;
    [k: string]: unknown;
  };
  harga_pasar?: {
    rata_rata?: number | string;
    [k: string]: unknown;
  };
  [k: string]: unknown;
}

interface LlmEnhancement {
  narasi?: string;
  rekomendasi_tindakan?: string;
  risiko?: string[];
  break_even_volume?: number | null;
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const { brandId, contextId, productId } = body as {
    brandId: string;
    contextId: string;
    productId?: string | null;
  };

  if (!brandId || !contextId) {
    return NextResponse.json({ error: "brandId & contextId wajib" }, { status: 400 });
  }

  // ── Auth checks ───────────────────────────────────────────
  const brand = await db.brand.findUnique({ where: { id: brandId } });
  if (!brand || brand.userId !== userId) {
    return NextResponse.json({ error: "brand tidak ditemukan" }, { status: 404 });
  }

  const ctx = await db.context.findUnique({
    where: { id: contextId },
    include: { research: true, contextUsage: true },
  });
  if (!ctx || ctx.brandId !== brandId || ctx.targetModule !== "keuangan") {
    return NextResponse.json({ error: "context tidak ditemukan" }, { status: 404 });
  }

  // ── Charge 3 credits ───────────────────────────────────────
  const charge = await chargeCredit({
    userId,
    brandId,
    actionKey: "keuangan.proyeksi",
    referenceId: ctx.id,
  });
  if (!charge.ok) {
    return NextResponse.json(
      { error: "Credit tidak cukup untuk proyeksi (butuh 3 credit)", reason: charge.reason },
      { status: 402 }
    );
  }

  // ── Parse contextJson ─────────────────────────────────────
  let parsed: ProjectionContextJson = {};
  try {
    parsed = JSON.parse(ctx.contextJson) as ProjectionContextJson;
  } catch {
    /* ignore */
  }
  const pm = parsed.proyeksi_margin ?? {};

  const skenario = (pm.skenario as string) ?? "Skenario Proyeksi";
  const asumsiModal = toNumber(pm.asumsi_modal) ?? 0;
  const marginSebelum = toNumber(pm.margin_sebelum) ?? 0;
  const marginSesudah = toNumber(pm.margin_sesudah) ?? 0;

  // ── Resolve product (override costPrice) ───────────────────
  let product: {
    id: string;
    name: string;
    price: number;
    costPrice: number | null;
  } | null = null;
  if (productId) {
    product = await db.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, price: true, costPrice: true },
    });
    if (!product || product.id === "") {
      product = null;
    }
  }

  // ── Compute current margin + break-even ────────────────────
  let currentMargin = 0;
  let currentMarginPct = 0;
  let fixedCostMonthly = asumsiModal > 0 ? asumsiModal : 0;
  let breakEvenVolume: number | null = null;
  let pricePerUnit = 0;
  let costPerUnit = 0;
  let proyeksiMarginPerUnit = marginSesudah;

  if (product) {
    pricePerUnit = product.price;
    costPerUnit = product.costPrice ?? 0;
    currentMargin = pricePerUnit - costPerUnit;
    currentMarginPct = pricePerUnit > 0 ? (currentMargin / pricePerUnit) * 100 : 0;
    proyeksiMarginPerUnit = marginSesudah > 0 ? marginSesudah : currentMargin;
    if (proyeksiMarginPerUnit > 0 && fixedCostMonthly > 0) {
      breakEvenVolume = Math.ceil(fixedCostMonthly / proyeksiMarginPerUnit);
    } else if (proyeksiMarginPerUnit > 0) {
      // If no explicit modal, use monthly expense as proxy (rough)
      const monthlyExpenseAgg = await db.transaction.aggregate({
        where: { brandId, type: "expense" },
        _sum: { amount: true },
      });
      const monthlyExpense = (monthlyExpenseAgg._sum.amount ?? 0) / 6; // last 6 months avg
      if (monthlyExpense > 0) {
        breakEvenVolume = Math.ceil(monthlyExpense / proyeksiMarginPerUnit);
        fixedCostMonthly = Math.round(monthlyExpense);
      }
    }
  } else {
    proyeksiMarginPerUnit = marginSesudah;
  }

  // ── LLM enhancement (narrative + recommendation) ──────────
  let llm: LlmEnhancement = {};
  try {
    const sys = `Kamu adalah analis keuangan UMKM Indonesia. Berikan analisis singkat, konkret, dan action-oriented dalam Bahasa Indonesia yang hangat dan profesional. Format JSON wajib: { "narasi": string, "rekomendasi_tindakan": string, "risiko": string[], "break_even_volume": number|null }`;
    const usr = JSON.stringify({
      brand: { name: brand.name, category: brand.category },
      product: product
        ? { name: product.name, price: product.price, costPrice: product.costPrice }
        : null,
      context: {
        skenario,
        asumsi_modal: asumsiModal,
        margin_sebelum: marginSebelum,
        margin_sesudah: marginSesudah,
        rekomendasi: pm.rekomendasi ?? null,
      },
      harga_pasar: parsed.harga_pasar ?? null,
      currentMargin,
      currentMarginPct: Math.round(currentMarginPct * 10) / 10,
      breakEvenVolumeCalculated: breakEvenVolume,
    });
    llm = await llmJson<LlmEnhancement>(
      [
        { role: "system", content: sys },
        { role: "user", content: usr },
      ],
      { temperature: 0.5, max_tokens: 800 }
    );
  } catch {
    llm = {
      narasi: `Berdasarkan skenario "${skenario}", margin proyeksi ${formatRp(marginSesudah)} per unit. ${pm.rekomendasi ?? ""}`.trim(),
      rekomendasi_tindakan: (pm.rekomendasi as string) ?? "Pantau realisasi penjualan setelah perubahan diterapkan.",
      risiko: [],
      break_even_volume: breakEvenVolume,
    };
  }

  // ── Mark context as used ───────────────────────────────────
  await db.contextUsage.create({
    data: {
      contextId: ctx.id,
      brandId,
      usedFor: "keuangan.view_projection",
    },
  });

  return NextResponse.json({
    projection: {
      contextId: ctx.id,
      skenario,
      asumsiModal,
      marginSebelum,
      marginSesudah,
      estimasiVolumeChange: pm.estimasi_volume_change ?? null,
      rekomendasiContext: (pm.rekomendasi as string) ?? null,
      product: product
        ? {
            id: product.id,
            name: product.name,
            price: product.price,
            costPrice: product.costPrice,
            currentMargin,
            currentMarginPct: Math.round(currentMarginPct * 10) / 10,
          }
        : null,
      breakEven: breakEvenVolume != null
        ? {
            volume: breakEvenVolume,
            fixedCostMonthly,
            marginPerUnit: proyeksiMarginPerUnit,
            note: breakEvenVolume != null
              ? `Butuh jual ${breakEvenVolume} unit/bulan untuk menutup biaya tetap ${formatRp(fixedCostMonthly)} dengan margin ${formatRp(proyeksiMarginPerUnit)}/unit.`
              : "",
          }
        : null,
      narasi: llm.narasi ?? "",
      rekomendasiTindakan: llm.rekomendasi_tindakan ?? "",
      risiko: Array.isArray(llm.risiko) ? llm.risiko : [],
    },
    charged: { credits: 3, balanceAfter: charge.balanceAfter },
    createdAt: new Date().toISOString(),
  });
}

function toNumber(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const cleaned = v.replace(/[^\d.-]/g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function formatRp(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}
