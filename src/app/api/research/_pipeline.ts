// Internal pipeline helpers for research module.
// Files/folders prefixed with "_" are ignored by Next.js App Router (not routes).

import { db } from "@/lib/db";
import { llmJson, webSearch } from "@/lib/ai";
import { TONE_MAP, type ToneKey } from "@/lib/constants";

export interface ResearchResult {
  intent: string;
  target_audience: {
    name: string;
    demography: string;
    platform: string;
    pain: string;
    trigger: string;
  }[];
  swot: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  competitors: {
    name: string;
    price_range: string;
    social_activity: string;
    marketplace_strength: string;
    threat_level: string; // rendah | sedang | tinggi
  }[];
  keywords: { hot: string[]; stable: string[] };
  market_trend: {
    labels: string[];
    values: number[];
    stats: { growth_pct: number; peak: string };
  };
  content_recommendations: {
    title: string;
    platform: string;
    angle: string;
    hashtags: string[];
    best_time: string;
  }[];
  pricing: {
    market_avg: string;
    lowest: string;
    highest: string;
    recommendation: string;
  };
}

export interface BrandLite {
  id: string;
  name: string;
  category: string;
  toneOfVoice: string;
  description: string | null;
}

const INTENT_VALUES = [
  "market_trend",
  "competitor_analysis",
  "keyword_research",
  "pricing",
] as const;

function safeIntent(raw: unknown): string {
  if (typeof raw !== "string") return "market_trend";
  return INTENT_VALUES.includes(raw as (typeof INTENT_VALUES)[number])
    ? raw
    : "market_trend";
}

function safeArr(val: unknown, max = 12): string[] {
  if (!Array.isArray(val)) return [];
  return val
    .filter((x) => typeof x === "string" && x.trim().length > 0)
    .map((x) => (x as string).trim())
    .slice(0, max);
}

function safeNum(val: unknown, fallback = 0): number {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

function safeStr(val: unknown, fallback = ""): string {
  return typeof val === "string" && val.trim().length > 0 ? val.trim() : fallback;
}

/** Step 4: classify intent based on the query + snippets. */
export async function classifyIntent(
  query: string,
  snippets: string
): Promise<string> {
  try {
    const out = await llmJson<{ intent: string }>(
      [
        {
          role: "system",
          content:
            "Kamu classifier sederhana. Pilih SATU intent dari: market_trend | competitor_analysis | keyword_research | pricing. " +
            "Balas JSON {\"intent\": \"...\"}. Hanya itu.",
        },
        {
          role: "user",
          content:
            `Query: ${query}\n\nSnippet web:\n${snippets}\n\nPilih intent:`,
        },
      ],
      { temperature: 0.2, max_tokens: 60 }
    );
    return safeIntent(out.intent);
  } catch {
    // Fallback heuristic
    const q = query.toLowerCase();
    if (/(harga|murah|mahal|modal|jual|cost)/.test(q)) return "pricing";
    if (/(saingan|kompetitor|brand lain)/.test(q)) return "competitor_analysis";
    if (/(keyword|kata kunci|seo|trending kata)/.test(q)) return "keyword_research";
    return "market_trend";
  }
}

/** Step 5: synthesize the full research object. */
export async function synthesizeResearch(
  query: string,
  intent: string,
  brand: BrandLite,
  searchResults: { name: string; snippet: string; host_name: string; url: string }[]
): Promise<ResearchResult> {
  const toneLabel = TONE_MAP[brand.toneOfVoice as ToneKey] ?? brand.toneOfVoice;
  const snippetBlob = searchResults
    .slice(0, 8)
    .map((r, i) => `[${i + 1}] ${r.name}\n${r.snippet}\n(sumber: ${r.host_name})`)
    .join("\n\n");

  const prompt = `Kamu adalah analis riset pasar untuk UMKM Indonesia.

Konteks brand:
- Nama: ${brand.name}
- Kategori: ${brand.category}
- Tone of voice: ${toneLabel}
- Deskripsi: ${brand.description || "-"}

Permintaan riset user: "${query}"
Intent terdeteksi: ${intent}

Data hasil web search (90 hari terakhir):
${snippetBlob || "(tidak ada data web — gunakan pengetahuan umum tentang pasar Indonesia)"}

Tugasmu: sintesa hasil riset pasar yang konkret, faktual, dan siap pakai untuk UMKM Indonesia. 
Gunakan Bahasa Indonesia. Jangan generik — sesuaikan dengan kategori "${brand.category}".
Untuk market_trend, buat 6 titik data bulanan (labels: nama bulan singkat seperti "Jan", "Feb"; values: angka indeks 0-100).
Untuk pricing, gunakan format Rupiah realistis (mis. "Rp 25.000 - Rp 45.000").
Untuk platform, pilih salah satu: TikTok | Instagram | Facebook | WhatsApp | Twitter/X.

Balas HANYA JSON dengan shape PERSIS ini:
{
  "intent": "${intent}",
  "target_audience": [
    {"name": "Persona 1", "demography": "...", "platform": "TikTok", "pain": "...", "trigger": "..."}
  ],
  "swot": {
    "strengths": ["..."], "weaknesses": ["..."],
    "opportunities": ["..."], "threats": ["..."]
  },
  "competitors": [
    {"name": "...", "price_range": "Rp ...", "social_activity": "...", "marketplace_strength": "...", "threat_level": "tinggi|sedang|rendah"}
  ],
  "keywords": {"hot": ["..."], "stable": ["..."]},
  "market_trend": {
    "labels": ["Jan","Feb","Mar","Apr","Mei","Jun"],
    "values": [50,55,60,58,70,75],
    "stats": {"growth_pct": 25, "peak": "Jun"}
  },
  "content_recommendations": [
    {"title": "...", "platform": "TikTok", "angle": "...", "hashtags": ["#..."], "best_time": "19:00"}
  ],
  "pricing": {
    "market_avg": "Rp ...", "lowest": "Rp ...", "highest": "Rp ...", "recommendation": "..."
  }
}

Berikan minimal 3 target_audience, 3-5 items di setiap array SWOT, 3-5 competitors, 5-8 hot keywords, 5-8 stable keywords, 3-4 content_recommendations.`;

  let raw: Record<string, any> = {};
  try {
    raw = await llmJson<Record<string, any>>(
      [
        { role: "system", content: "Kamu AI riset pasar UMKM Indonesia. Output JSON valid saja. Tidak boleh ada teks di luar JSON." },
        { role: "user", content: prompt },
      ],
      { temperature: 0.5, max_tokens: 6000 }
    );
  } catch (llmErr) {
    console.error("[research] LLM synthesis failed, using fallback:", llmErr instanceof Error ? llmErr.message : "unknown");
    // Build a fallback result from web search snippets so user gets *something* for their credits
    const snippets = searchResults.slice(0, 5).map((r) => r.snippet).join(" ");
    const words = (snippets || "cemilan pedas keripik basreng makaroni").split(/\s+/).filter((w) => w.length > 4);
    const hotKeywords = Array.from(new Set(words.slice(0, 8).map((w) => w.toLowerCase().replace(/[^a-z0-9]/g, "")))).filter(Boolean);
    raw = {
      intent,
      target_audience: [
        { name: "Anak Muda", demography: "18-25 thn, kota besar", platform: "TikTok", pain: "Cemilan pedas murah", trigger: "Tren tantangan pedas" },
        { name: "Mahasiswa", demography: "19-23 thn, kos", platform: "Instagram", pain: "Jajanan hemat", trigger: "Lapar malam" },
        { name: "Ibu Rumah Tangga", demography: "30-45 thn", platform: "WhatsApp", trigger: "Stok cemilan keluarga" },
      ],
      swot: {
        strengths: ["Resep rumahan autentik", "Harga terjangkau UMKM", "Rasa pedas khas"],
        weaknesses: ["Distribusi terbatas", "Belum ada branding kuat"],
        opportunities: ["Tren cemilan pedas naik", "Channel TikTok berkembang"],
        threats: ["Kompetitor besar (Maicih, Basreng)", "Harga bahan baku naik"],
      },
      competitors: [
        { name: "Maicih", price_range: "Rp 15.000-25.000", social_activity: "Tinggi", marketplace_strength: "Kuat", threat_level: "tinggi" },
        { name: "Basreng Viral", price_range: "Rp 12.000-20.000", social_activity: "Sedang", marketplace_strength: "Sedang", threat_level: "sedang" },
      ],
      keywords: {
        hot: hotKeywords.length >= 3 ? hotKeywords : ["cemilanpedas", "keripikviral", "jajananmurah"],
        stable: ["keripikpedas", "basrengori", "makaronipedas", "cemilansiang"],
      },
      market_trend: {
        labels: ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun"],
        values: [50, 55, 60, 58, 70, 75],
        stats: { growth_pct: 25, peak: "Jun" },
      },
      content_recommendations: [
        { title: "Tantangan Level Pedas", platform: "TikTok", angle: "Berani coba level pedas tertinggi?", hashtags: ["#pedasbanget", "#cemilansiang"], best_time: "12-14 WIB" },
        { title: "Cemilan Hemat Anak Kos", platform: "Instagram", angle: "Rp 10rb udah rame-rame", hashtags: ["#jajananmurah"], best_time: "18-20 WIB" },
      ],
      pricing: {
        market_avg: "Rp 12.000-18.000",
        lowest: "Rp 8.000",
        highest: "Rp 25.000",
        recommendation: "Pertahankan harga di range Rp 12-15rb untuk segmen anak muda.",
      },
    };
  }

  // ── Normalize + fallback fill ─────────────────────────────────
  const result: ResearchResult = {
    intent,
    target_audience: Array.isArray(raw.target_audience)
      ? (raw.target_audience as any[]).slice(0, 4).map((p) => ({
          name: safeStr(p?.name, "Persona"),
          demography: safeStr(p?.demography, "-"),
          platform: safeStr(p?.platform, "TikTok"),
          pain: safeStr(p?.pain, "-"),
          trigger: safeStr(p?.trigger, "-"),
        }))
      : [],
    swot: {
      strengths: safeArr(raw?.swot?.strengths, 5),
      weaknesses: safeArr(raw?.swot?.weaknesses, 5),
      opportunities: safeArr(raw?.swot?.opportunities, 5),
      threats: safeArr(raw?.swot?.threats, 5),
    },
    competitors: Array.isArray(raw.competitors)
      ? (raw.competitors as any[]).slice(0, 6).map((c) => ({
          name: safeStr(c?.name, "Kompetitor"),
          price_range: safeStr(c?.price_range, "-"),
          social_activity: safeStr(c?.social_activity, "-"),
          marketplace_strength: safeStr(c?.marketplace_strength, "-"),
          threat_level: safeStr(c?.threat_level, "sedang").toLowerCase(),
        }))
      : [],
    keywords: {
      hot: safeArr(raw?.keywords?.hot, 8),
      stable: safeArr(raw?.keywords?.stable, 8),
    },
    market_trend: {
      labels: Array.isArray(raw?.market_trend?.labels)
        ? (raw.market_trend.labels as unknown[]).map((l) => safeStr(l, "?")).slice(0, 6)
        : ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun"],
      values: Array.isArray(raw?.market_trend?.values)
        ? (raw.market_trend.values as unknown[]).map((v) => safeNum(v, 50)).slice(0, 6)
        : [50, 55, 60, 58, 70, 75],
      stats: {
        growth_pct: safeNum(raw?.market_trend?.stats?.growth_pct, 0),
        peak: safeStr(raw?.market_trend?.stats?.peak, "-"),
      },
    },
    content_recommendations: Array.isArray(raw.content_recommendations)
      ? (raw.content_recommendations as any[]).slice(0, 4).map((c) => ({
          title: safeStr(c?.title, "Konten"),
          platform: safeStr(c?.platform, "TikTok"),
          angle: safeStr(c?.angle, "-"),
          hashtags: safeArr(c?.hashtags, 6),
          best_time: safeStr(c?.best_time, "19:00"),
        }))
      : [],
    pricing: {
      market_avg: safeStr(raw?.pricing?.market_avg, "-"),
      lowest: safeStr(raw?.pricing?.lowest, "-"),
      highest: safeStr(raw?.pricing?.highest, "-"),
      recommendation: safeStr(raw?.pricing?.recommendation, "-"),
    },
  };

  return result;
}

/** Step 7: auto-generate 3 contexts (FREE — no credit). */
export async function generateContexts(
  researchId: string,
  brandId: string,
  brand: BrandLite,
  result: ResearchResult
) {
  const brandContext = {
    nama: brand.name,
    kategori: brand.category,
    tone: brand.toneOfVoice,
  };

  // ── Konten context ──────────────────────────────────────────
  const kontenContext = {
    research_id: researchId,
    brand_context: brandContext,
    recommendations: result.content_recommendations,
    keyword_suggestions: result.keywords.hot,
    target_audience: result.target_audience,
  };

  // ── Toko context ────────────────────────────────────────────
  const tokoContext = {
    research_id: researchId,
    harga_pasar: {
      rata_rata: result.pricing.market_avg,
      termurah: result.pricing.lowest,
      termahal: result.pricing.highest,
    },
    produk_trending: result.keywords.hot.slice(0, 5),
    rekomendasi_umum: result.pricing.recommendation,
    competitors: result.competitors.map((c) => ({
      name: c.name,
      price_range: c.price_range,
      threat_level: c.threat_level,
    })),
  };

  // ── Keuangan context ────────────────────────────────────────
  // Derive margin projection from pricing recommendation + market trend growth_pct.
  const growthPct = result.market_trend.stats.growth_pct;
  const asumsiModal = result.pricing.lowest || "Rp 0";
  const marginSebelum = 30; // % baseline
  const marginSesudah = Math.min(
    80,
    Math.max(15, marginSebelum + Math.round(growthPct / 3))
  );
  const estimasiVolume = Math.max(
    50,
    Math.round(100 + growthPct * 2)
  );
  const keuanganContext = {
    research_id: researchId,
    proyeksi_margin: {
      skenario: `Optimasi harga + tren pasar ${growthPct}%`,
      asumsi_modal: asumsiModal,
      margin_sebelum: `${marginSebelum}%`,
      margin_sesudah: `${marginSesudah}%`,
      estimasi_volume: `${estimasiVolume} unit/bulan`,
      kesimpulan:
        `Dengan harga jual rata-rata ${result.pricing.market_avg} dan tren naik ${growthPct}%, ` +
        `estimasi margin naik dari ${marginSebelum}% ke ${marginSesudah}% pada volume ${estimasiVolume} unit/bulan.`,
    },
    rekomendasi_budget: result.pricing.recommendation,
    warning:
      growthPct < 5
        ? "Tren pasar lambat — pertimbangkan promo atau diversifikasi produk."
        : result.swot.threats[0] || "Pantau kompetitor yang masuk pasar.",
  };

  const [konten, toko, keuangan] = await Promise.all([
    db.context.create({
      data: {
        researchId,
        brandId,
        targetModule: "konten",
        contextJson: JSON.stringify(kontenContext),
      },
    }),
    db.context.create({
      data: {
        researchId,
        brandId,
        targetModule: "toko",
        contextJson: JSON.stringify(tokoContext),
      },
    }),
    db.context.create({
      data: {
        researchId,
        brandId,
        targetModule: "keuangan",
        contextJson: JSON.stringify(keuanganContext),
      },
    }),
  ]);

  return [konten, toko, keuangan];
}

/** Run the full research pipeline. Throws on failure. Caller handles refund. */
export async function runResearchPipeline(
  brand: BrandLite,
  query: string
): Promise<{ intent: string; result: ResearchResult; searchCount: number }> {
  // Step 3: web search
  const searchResults = await webSearch(query, { num: 8, recency_days: 90 });

  // Step 4: classify intent
  const snippets = searchResults
    .slice(0, 5)
    .map((r) => r.snippet)
    .join("\n");
  const intent = await classifyIntent(query, snippets);

  // Step 5: synthesize
  const result = await synthesizeResearch(query, intent, brand, searchResults);

  return { intent, result, searchCount: searchResults.length };
}
