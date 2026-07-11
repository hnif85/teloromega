// LangChain agentic research pipeline
// DeepSeek LLM + Tavily web search tool → agentic loop (think → act → observe)
//
// Performs multi-step market research: the agent decides how many searches to run,
// what to search for, and synthesizes everything into a structured result.

import { createAgent, tool } from "langchain";
import { ChatDeepSeek } from "@langchain/deepseek";
import * as z from "zod";
import { HumanMessage } from "@langchain/core/messages";

const TAVILY_URL = "https://api.tavily.com/search";
const TAVILY_KEY = process.env.TAVILY_API_KEY || "";

// ─── Tool: Tavily web search ─────────────────────────────────────────────────

export const tavilySearchTool = tool(
  async ({ query, maxResults = 5 }: { query: string; maxResults?: number }) => {
    const res = await fetch(TAVILY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TAVILY_KEY}`,
      },
      body: JSON.stringify({
        query,
        search_depth: "advanced",
        include_answer: true,
        max_results: maxResults,
        days: 90,
        topic: "general",
      }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "unknown");
      return JSON.stringify({ error: `Tavily search failed: ${res.status}`, detail: err.slice(0, 300) });
    }

    const data = await res.json();
    return JSON.stringify({
      answer: data.answer,
      results: (data.results || []).map((r: any) => ({
        title: r.title,
        url: r.url,
        content: r.content?.slice(0, 500),
        score: r.score,
      })),
    });
  },
  {
    name: "web_search",
    description:
      "Cari data real-time dari web menggunakan Tavily API. Gunakan untuk riset pasar, tren industri, analisis kompetitor, data harga, keyword, dan informasi terkini. Bisa dipanggil berkali-kali dengan query berbeda.",
    schema: z.object({
      query: z.string().describe("Kata kunci pencarian (Bahasa Indonesia atau Inggris)"),
      maxResults: z.number().optional().describe("Maksimal hasil (default 5, max 10)"),
    }),
  }
);

// ─── System prompt for market research agent ──────────────────────────────────

function buildSystemPrompt(brand: {
  name: string;
  category: string;
  toneOfVoice: string;
  description?: string | null;
}): string {
  return `Kamu adalah analis riset pasar profesional untuk UMKM Indonesia.

BRAND CONTEXT:
- Nama: ${brand.name}
- Kategori: ${brand.category}
- Tone: ${brand.toneOfVoice}
- Deskripsi: ${brand.description || "-"}

TUGAS:
Lakukan riset pasar menyeluruh untuk brand di atas. Gunakan tool "web_search" untuk mencari data real-time.
Kamu BEBAS menentukan berapa kali search dan query apa yang dipakai — jangan terpaku pola tertentu.
Riset ini SELALU riset pasar umum menyeluruh (basic_research) — bukan kamu yang menentukan jenis intent.

WAJIB dilakukan:
1. Cari tren pasar dan pertumbuhan industri
2. Cari kompetitor dan harga pasaran
3. Cari target audiens dan behavior
4. Cari keyword dan konten yang trending

OUTPUT — harus JSON persis dengan struktur ini (tidak boleh ada teks lain):

{
  "intent": "basic_research",
  "market_trend": {
    "labels": ["Jan","Feb","Mar","Apr","Mei","Jun"],
    "values": [50,55,60,58,70,75],
    "stats": {"growth_pct": 25, "peak": "Jun"}
  },
  "target_audience": [
    {"name": "Nama Persona", "demography": "usia, lokasi, income", "platform": "TikTok|Instagram|WhatsApp", "pain": "masalah mereka", "trigger": "pemicu beli"}
  ],
  "swot": {
    "strengths": ["...3-5 items"],
    "weaknesses": ["...3-5 items"],
    "opportunities": ["...3-5 items"],
    "threats": ["...3-5 items"]
  },
  "competitors": [
    {"name": "Nama", "price_range": "Rp X - Y", "social_activity": "aktif/sedang/rendah", "marketplace_strength": "kuat/sedang/lemah", "threat_level": "tinggi/sedang/rendah"}
  ],
  "keywords": {
    "hot": ["keyword1", "keyword2", "...5-8 items"],
    "stable": ["keyword1", "keyword2", "...5-8 items"]
  },
  "content_recommendations": [
    {"title": "Judul konten", "platform": "TikTok|Instagram|WhatsApp|Facebook", "angle": "Sudut konten", "hashtags": ["#tag1", "#tag2"], "best_time": "19:00"}
  ],
  "pricing": {
    "market_avg": "Rp X - Y",
    "lowest": "Rp Z",
    "highest": "Rp W",
    "recommendation": "Rekomendasi strategi harga"
  }
}

PENTING:
- Semua data HARUS berdasarkan hasil web_search, bukan mengarang
- Platform: TikTok, Instagram, WhatsApp, atau Facebook
- Harga dalam Rupiah (Rp)
- Bahasa Indonesia
- Minimal 3 target audience, 3-5 competitor, 5-8 hot keywords, 3 content recommendations
- market_trend.labels: 6 bulan singkat (Jan, Feb, Mar, Apr, Mei, Jun)`;
}

// ─── Research agent ──────────────────────────────────────────────────────────

let _agentPromise: Promise<ReturnType<typeof createAgent>> | null = null;

function getAgent(brand: {
  name: string;
  category: string;
  toneOfVoice: string;
  description?: string | null;
}) {
  // Cache the agent? No — each brand gets its own system prompt.
  const model = new ChatDeepSeek({
    model: "deepseek-chat",
    temperature: 0.5,
  });

  return createAgent({
    model,
    tools: [tavilySearchTool],
    systemPrompt: buildSystemPrompt(brand),
  });
}

// ─── Run research ────────────────────────────────────────────────────────────

export interface AgentResearchResult {
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
    threat_level: string;
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

export async function runAgenticResearch(
  brand: { name: string; category: string; toneOfVoice: string; description?: string | null },
  query: string
): Promise<AgentResearchResult> {
  const agent = getAgent(brand);

  const result = await agent.invoke({
    messages: [
      new HumanMessage(
        `Lakukan riset pasar untuk query: "${query}".\n\n` +
        `Lakukan web search dengan kata kunci yang relevan, analisis hasilnya, lalu berikan JSON output sesuai format yang sudah ditentukan.\n\n` +
        `JANGAN berhenti sebelum menghasilkan JSON final. Lakukan search secukupnya untuk mendapat data yang akurat.`
      ),
    ],
  });

  // Extract JSON from final AI message
  const messages = result.messages || [];
  const lastAiMsg = [...messages].reverse().find((m: any) => m._getType?.() === "ai" || m.type === "ai");

  if (!lastAiMsg) {
    throw new Error("No AI response from agent");
  }

  const text = typeof lastAiMsg.content === "string"
    ? lastAiMsg.content
    : Array.isArray(lastAiMsg.content)
    ? lastAiMsg.content.map((c: any) => (typeof c === "string" ? c : c?.text || "")).join("")
    : "";

  // Extract JSON from response
  const cleaned = text.replace(/```(?:json)?\s*/gi, "").replace(/```\s*$/gi, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error("Agent did not return valid JSON. Response: " + cleaned.slice(0, 500));
  }

  const parsed = JSON.parse(match[0]) as AgentResearchResult;

  // Normalize with safe defaults
  return {
    intent: "basic_research",
    target_audience: Array.isArray(parsed.target_audience) ? parsed.target_audience.slice(0, 4) : [],
    swot: {
      strengths: Array.isArray((parsed as any).swot?.strengths) ? (parsed as any).swot.strengths : [],
      weaknesses: Array.isArray((parsed as any).swot?.weaknesses) ? (parsed as any).swot.weaknesses : [],
      opportunities: Array.isArray((parsed as any).swot?.opportunities) ? (parsed as any).swot.opportunities : [],
      threats: Array.isArray((parsed as any).swot?.threats) ? (parsed as any).swot.threats : [],
    },
    competitors: Array.isArray(parsed.competitors) ? parsed.competitors : [],
    keywords: {
      hot: Array.isArray((parsed as any).keywords?.hot) ? (parsed as any).keywords.hot : [],
      stable: Array.isArray((parsed as any).keywords?.stable) ? (parsed as any).keywords.stable : [],
    },
    market_trend: {
      labels: Array.isArray((parsed as any).market_trend?.labels) ? (parsed as any).market_trend.labels : [],
      values: Array.isArray((parsed as any).market_trend?.values) ? (parsed as any).market_trend.values : [],
      stats: {
        growth_pct: (parsed as any).market_trend?.stats?.growth_pct ?? 0,
        peak: (parsed as any).market_trend?.stats?.peak ?? "-",
      },
    },
    content_recommendations: Array.isArray(parsed.content_recommendations) ? parsed.content_recommendations : [],
    pricing: {
      market_avg: (parsed as any).pricing?.market_avg || "-",
      lowest: (parsed as any).pricing?.lowest || "-",
      highest: (parsed as any).pricing?.highest || "-",
      recommendation: (parsed as any).pricing?.recommendation || "-",
    },
  };
}
