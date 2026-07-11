// Normalizes research resultJson into one canonical shape for rendering.
//
// The research pipeline has changed shape more than once (manual pipeline vs
// agentic pipeline, and the manual pipeline used to vary its JSON structure
// per intent). Rather than have every consumer of research results guess at
// field names, this is the single place that understands every shape seen so
// far and maps it into `NormalizedResearchResult`.
//
// Anything in the raw JSON that isn't recognized is preserved in `extras`
// instead of being silently dropped — so a future pipeline change that adds
// or renames fields degrades to "shown in a generic section" rather than
// "invisible".

export interface NormalizedPersona {
  name: string;
  demography: string;
  platform: string;
  pain: string;
  trigger: string;
}

export interface NormalizedCompetitor {
  name: string;
  price_range: string;
  social_activity: string;
  marketplace_strength: string;
  threat_level: string;
}

export interface NormalizedContentRec {
  title: string;
  platform: string;
  angle: string;
  hashtags: string[];
  best_time: string;
}

export interface NormalizedResearchResult {
  intent: string;
  target_audience: NormalizedPersona[];
  swot: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  competitors: NormalizedCompetitor[];
  keywords: { hot: string[]; stable: string[] };
  market_trend: {
    labels: string[];
    values: number[];
    stats: { growth_pct: number; peak: string };
  };
  content_recommendations: NormalizedContentRec[];
  pricing: {
    market_avg: string;
    lowest: string;
    highest: string;
    recommendation: string;
  };
}

export interface NormalizeOutput {
  result: NormalizedResearchResult;
  /** Free-text summary, if the source shape had one (common across every legacy shape seen so far). */
  summary: string | null;
  /** Any raw fields not mapped into `result` or `summary` — render generically, never drop silently. */
  extras: Record<string, unknown>;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

function formatRupiah(n: unknown): string {
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
  return "Rp " + n.toLocaleString("id-ID");
}

const EMPTY_RESULT: NormalizedResearchResult = {
  intent: "basic_research",
  target_audience: [],
  swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
  competitors: [],
  keywords: { hot: [], stable: [] },
  market_trend: { labels: [], values: [], stats: { growth_pct: 0, peak: "—" } },
  content_recommendations: [],
  pricing: { market_avg: "—", lowest: "—", highest: "—", recommendation: "—" },
};

export function normalizeResearchResult(
  raw: unknown,
  fallbackIntent?: string | null
): NormalizeOutput {
  if (!isPlainObject(raw)) {
    return {
      result: { ...EMPTY_RESULT, intent: fallbackIntent || "basic_research" },
      summary: null,
      extras: {},
    };
  }

  // Track which raw keys we've consumed so anything left over → extras.
  const used = new Set<string>();
  const take = (key: string): unknown => {
    used.add(key);
    return raw[key];
  };

  const intentFromJson = typeof raw.intent === "string" ? raw.intent : undefined;
  used.add("intent");
  const intent = intentFromJson || fallbackIntent || "basic_research";

  const summaryRaw = take("summary");
  const summary = typeof summaryRaw === "string" ? summaryRaw : null;

  // ── target_audience ──
  let target_audience: NormalizedPersona[] = [];
  const rawTA = take("target_audience");
  if (Array.isArray(rawTA)) {
    target_audience = rawTA.map((p) => {
      const o = isPlainObject(p) ? p : {};
      return {
        name: String(o.name ?? "—"),
        demography: String(o.demography ?? "—"),
        platform: String(o.platform ?? "—"),
        pain: String(o.pain ?? "—"),
        trigger: String(o.trigger ?? "—"),
      };
    });
  } else {
    const audienceSummary = take("audienceSummary");
    if (typeof audienceSummary === "string") {
      target_audience = [
        { name: "Target Audiens", demography: audienceSummary, platform: "—", pain: "—", trigger: "—" },
      ];
    }
  }

  // ── swot ──
  let swot = { strengths: [] as string[], weaknesses: [] as string[], opportunities: [] as string[], threats: [] as string[] };
  const rawSwot = take("swot");
  if (isPlainObject(rawSwot)) {
    swot = {
      strengths: isStringArray(rawSwot.strengths) ? rawSwot.strengths : [],
      weaknesses: isStringArray(rawSwot.weaknesses) ? rawSwot.weaknesses : [],
      opportunities: isStringArray(rawSwot.opportunities) ? rawSwot.opportunities : [],
      threats: isStringArray(rawSwot.threats) ? rawSwot.threats : [],
    };
  } else {
    // Legacy shape: opportunities/threats sometimes sit loose at the top level.
    const topOpportunities = take("opportunities");
    const topThreats = take("threats");
    if (isStringArray(topOpportunities) || isStringArray(topThreats)) {
      swot = {
        strengths: [],
        weaknesses: [],
        opportunities: isStringArray(topOpportunities) ? topOpportunities : [],
        threats: isStringArray(topThreats) ? topThreats : [],
      };
    }
  }

  // ── competitors ──
  let competitors: NormalizedCompetitor[] = [];
  const rawComp = take("competitors");
  if (Array.isArray(rawComp)) {
    competitors = rawComp.map((c) => {
      if (typeof c === "string") {
        return { name: c, price_range: "—", social_activity: "—", marketplace_strength: "—", threat_level: "—" };
      }
      if (isPlainObject(c)) {
        if ("price_range" in c || "threat_level" in c) {
          return {
            name: String(c.name ?? "—"),
            price_range: String(c.price_range ?? "—"),
            social_activity: String(c.social_activity ?? "—"),
            marketplace_strength: String(c.marketplace_strength ?? "—"),
            threat_level: String(c.threat_level ?? "—"),
          };
        }
        // Legacy { name, strengths[], weaknesses[] } shape — repurpose into
        // the nearest-meaning canonical fields rather than dropping them.
        const strengths = isStringArray(c.strengths) ? c.strengths.join("; ") : "—";
        const weaknesses = isStringArray(c.weaknesses) ? c.weaknesses.join("; ") : "—";
        return {
          name: String(c.name ?? "—"),
          price_range: "—",
          social_activity: strengths,
          marketplace_strength: weaknesses,
          threat_level: "—",
        };
      }
      return { name: "—", price_range: "—", social_activity: "—", marketplace_strength: "—", threat_level: "—" };
    });
  }

  // ── keywords ──
  let keywords = { hot: [] as string[], stable: [] as string[] };
  const rawKw = take("keywords");
  if (isPlainObject(rawKw)) {
    keywords = {
      hot: isStringArray(rawKw.hot) ? rawKw.hot : [],
      stable: isStringArray(rawKw.stable) ? rawKw.stable : [],
    };
  } else if (isStringArray(rawKw)) {
    keywords = { hot: rawKw, stable: [] };
  } else {
    const hashtags = take("recommendedHashtags");
    if (isStringArray(hashtags)) keywords = { hot: hashtags, stable: [] };
  }

  // ── market_trend ──
  let market_trend = { labels: [] as string[], values: [] as number[], stats: { growth_pct: 0, peak: "—" } };
  const rawMt = take("market_trend");
  if (isPlainObject(rawMt)) {
    const stats = isPlainObject(rawMt.stats) ? rawMt.stats : {};
    market_trend = {
      labels: isStringArray(rawMt.labels) ? rawMt.labels : [],
      values: Array.isArray(rawMt.values) ? rawMt.values.filter((n): n is number => typeof n === "number") : [],
      stats: {
        growth_pct: typeof stats.growth_pct === "number" ? stats.growth_pct : 0,
        peak: typeof stats.peak === "string" ? stats.peak : "—",
      },
    };
  }

  // ── content_recommendations ──
  let content_recommendations: NormalizedContentRec[] = [];
  const rawCr = take("content_recommendations");
  if (Array.isArray(rawCr)) {
    content_recommendations = rawCr.map((c) => {
      const o = isPlainObject(c) ? c : {};
      return {
        title: String(o.title ?? "—"),
        platform: String(o.platform ?? "—"),
        angle: String(o.angle ?? "—"),
        hashtags: isStringArray(o.hashtags) ? o.hashtags : [],
        best_time: String(o.best_time ?? "—"),
      };
    });
  } else {
    const formats = take("topFormats");
    if (isStringArray(formats)) {
      content_recommendations = formats.map((f) => ({ title: f, platform: "—", angle: "—", hashtags: [], best_time: "—" }));
    }
  }

  // ── pricing ──
  let pricing = { market_avg: "—", lowest: "—", highest: "—", recommendation: "—" };
  const rawPricing = take("pricing");
  if (isPlainObject(rawPricing)) {
    pricing = {
      market_avg: String(rawPricing.market_avg ?? "—"),
      lowest: String(rawPricing.lowest ?? "—"),
      highest: String(rawPricing.highest ?? "—"),
      recommendation: String(rawPricing.recommendation ?? "—"),
    };
  } else {
    const rp = take("recommendedPrice");
    if (isPlainObject(rp)) {
      pricing = {
        market_avg: formatRupiah(rp.optimal),
        lowest: formatRupiah(rp.min),
        highest: formatRupiah(rp.max),
        recommendation: "—",
      };
    }
  }

  // ── extras: anything left over, never silently dropped ──
  const extras: Record<string, unknown> = {};
  for (const key of Object.keys(raw)) {
    if (!used.has(key)) extras[key] = raw[key];
  }

  return {
    result: { intent, target_audience, swot, competitors, keywords, market_trend, content_recommendations, pricing },
    summary,
    extras,
  };
}
