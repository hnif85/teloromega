// Freeform ("non-basic") research agent — for any query after a brand's
// first (forced basic_research) research. Reuses the same DeepSeek + Tavily
// agentic loop as _agent.ts, but the output shape is a ContentBlock[]
// instead of the rigid basic_research schema — the question can be about
// anything, so the answer's shape shouldn't be forced into audience/SWOT/
// competitor/pricing sections that may not apply.
//
// The agent never emits HTML — only block content (plain text/arrays) that
// the frontend renders through fixed, hand-written React elements. This is
// the same trust boundary reasoning as _agent.ts's web_search tool: agent
// output is seeded from web search results, so it's untrusted input.

import { createAgent } from "langchain";
import { ChatDeepSeek } from "@langchain/deepseek";
import { HumanMessage } from "@langchain/core/messages";
import { tavilySearchTool } from "./_agent";
import type { ContentBlock } from "@/lib/content-blocks";

function buildFreeformSystemPrompt(brand: {
  name: string;
  category: string;
  toneOfVoice: string;
  description?: string | null;
}): string {
  return `Kamu adalah asisten riset untuk UMKM Indonesia.

BRAND CONTEXT:
- Nama: ${brand.name}
- Kategori: ${brand.category}
- Tone: ${brand.toneOfVoice}
- Deskripsi: ${brand.description || "-"}

TUGAS:
Jawab pertanyaan/topik riset dari user. Gunakan tool "web_search" untuk mencari data real-time kalau perlu.
Kamu BEBAS menentukan berapa kali search dan query apa yang dipakai.

Pertanyaan bisa soal apa saja — bukan cuma riset pasar umum (itu sudah dilakukan sebelumnya untuk brand ini).
Bentuk jawaban HARUS menyesuaikan isi, bukan dipaksa ke format tertentu.

OUTPUT — harus JSON persis dengan struktur ini (tidak boleh ada teks lain):

{
  "blocks": [
    {"type": "heading", "text": "Judul bagian"},
    {"type": "paragraph", "text": "Teks penjelasan..."},
    {"type": "list", "items": ["poin 1", "poin 2"]},
    {"type": "table", "headers": ["Kolom A", "Kolom B"], "rows": [["a1", "b1"], ["a2", "b2"]]},
    {"type": "stat", "label": "Label angka", "value": "Rp 50.000"},
    {"type": "quote", "text": "Kutipan penting"}
  ]
}

Block types yang tersedia: heading, paragraph, list, table, stat, quote — pilih dan susun sesuai kebutuhan jawaban.
Tidak wajib pakai semua jenis block. Susun urutan yang paling mudah dibaca untuk menjawab pertanyaan user.

PENTING:
- Semua data HARUS berdasarkan hasil web_search kalau relevan, bukan mengarang
- Bahasa Indonesia
- JANGAN sertakan HTML, markdown, atau markup apa pun di dalam teks block — teks polos saja`;
}

export interface FreeformResearchResult {
  blocks: ContentBlock[];
}

const VALID_BLOCK_TYPES = new Set(["heading", "paragraph", "list", "table", "stat", "quote"]);

function sanitizeBlocks(raw: unknown): ContentBlock[] {
  if (!Array.isArray(raw)) return [];
  const blocks: ContentBlock[] = [];
  for (const b of raw) {
    if (!b || typeof b !== "object" || typeof (b as any).type !== "string") continue;
    const type = (b as any).type;
    if (!VALID_BLOCK_TYPES.has(type)) continue;
    const o = b as any;
    switch (type) {
      case "heading":
      case "paragraph":
        if (typeof o.text === "string") blocks.push({ type, text: o.text });
        break;
      case "list":
        if (Array.isArray(o.items)) {
          blocks.push({ type: "list", items: o.items.filter((x: unknown) => typeof x === "string") });
        }
        break;
      case "table":
        if (Array.isArray(o.headers) && Array.isArray(o.rows)) {
          blocks.push({
            type: "table",
            headers: o.headers.filter((x: unknown) => typeof x === "string"),
            rows: o.rows
              .filter((r: unknown) => Array.isArray(r))
              .map((r: unknown[]) => r.map((c) => String(c))),
          });
        }
        break;
      case "stat":
        if (typeof o.label === "string" && typeof o.value === "string") {
          blocks.push({ type: "stat", label: o.label, value: o.value });
        }
        break;
      case "quote":
        if (typeof o.text === "string") blocks.push({ type: "quote", text: o.text });
        break;
    }
  }
  return blocks;
}

export async function runFreeformResearch(
  brand: { name: string; category: string; toneOfVoice: string; description?: string | null },
  query: string
): Promise<FreeformResearchResult> {
  const model = new ChatDeepSeek({ model: "deepseek-chat", temperature: 0.5 });
  const agent = createAgent({
    model,
    tools: [tavilySearchTool],
    systemPrompt: buildFreeformSystemPrompt(brand),
  });

  const result = await agent.invoke({
    messages: [
      new HumanMessage(
        `Topik/pertanyaan: "${query}".\n\n` +
        `Cari data web kalau relevan, lalu susun jawaban sebagai blocks sesuai format yang sudah ditentukan. ` +
        `JANGAN berhenti sebelum menghasilkan JSON final.`
      ),
    ],
  });

  const messages = result.messages || [];
  const lastAiMsg = [...messages].reverse().find((m: any) => m._getType?.() === "ai" || m.type === "ai");
  if (!lastAiMsg) {
    throw new Error("No AI response from freeform agent");
  }

  const text = typeof lastAiMsg.content === "string"
    ? lastAiMsg.content
    : Array.isArray(lastAiMsg.content)
    ? lastAiMsg.content.map((c: any) => (typeof c === "string" ? c : c?.text || "")).join("")
    : "";

  const cleaned = text.replace(/```(?:json)?\s*/gi, "").replace(/```\s*$/gi, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error("Freeform agent did not return valid JSON. Response: " + cleaned.slice(0, 500));
  }

  const parsed = JSON.parse(match[0]);
  const blocks = sanitizeBlocks(parsed.blocks);
  if (blocks.length === 0) {
    throw new Error("Freeform agent returned no valid blocks");
  }

  return { blocks };
}
