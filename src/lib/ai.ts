// AI helpers — call MWX AI Module (ai-module.mwxmarket.ai)
// These run server-side only. All calls are auto-logged to AiPromptLog.
// Routes can call setAiContext() to add user/brand/feature metadata.

import { db } from "@/lib/db";

// ── AI Module config ─────────────────────────────────────────────────────────
const AI_BASE = process.env.AI_MODULE_URL ?? "https://ai-module.mwxmarket.ai";
const AI_KEY = process.env.AI_MODULE_KEY ?? "";
const AI_DEFAULT_MODEL = "gemini-3.5-flash";
const AI_DEFAULT_PROVIDER = "vertex";

// ── Context (module-level — safe on Vercel serverless: each request isolated) ─
interface AiContext {
  userId?: string;
  brandId?: string;
  feature: string;
  service?: string;
}
let _ctx: AiContext | null = null;

/** Set AI context BEFORE calling llmChat/llmJson. Used for logging. */
export function setAiContext(ctx: AiContext | null) {
  _ctx = ctx;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface AiModuleResponse {
  status: number;
  data: {
    content: string;
    usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  };
}

// ── Core: raw call to AI module ─────────────────────────────────────────────
async function callAiModule(
  messages: ChatMessage[],
  opts?: { temperature?: number; max_tokens?: number; model?: string; service?: string }
): Promise<AiModuleResponse> {
  const ctx = _ctx;
  const service = opts?.service ?? ctx?.service ?? "General Assistant";
  const model = opts?.model ?? AI_DEFAULT_MODEL;

  const body = JSON.stringify({
    service,
    ai: AI_DEFAULT_PROVIDER,
    model,
    messages,
    temperature: opts?.temperature ?? 0.7,
    top_p: 1,
    max_tokens: opts?.max_tokens,
    debug: false,
  });

  const t0 = Date.now();
  let res: Response;
  try {
    res = await fetch(`${AI_BASE}/completions`, {
      method: "POST",
      headers: {
        "accept": "application/json",
        "x-key": AI_KEY,
        "Content-Type": "application/json",
      },
      body,
    });
  } catch (err: any) {
    // Network error — log and throw
    const latencyMs = Date.now() - t0;
    await _logAiCall({
      feature: ctx?.feature ?? "unknown",
      ai: AI_DEFAULT_PROVIDER,
      model,
      service,
      prompt: body,
      success: false,
      error: `Network error: ${err.message}`,
      latencyMs,
    });
    throw err;
  }

  const latencyMs = Date.now() - t0;

  if (!res.ok) {
    const errorText = await res.text().catch(() => "Unknown error");
    await _logAiCall({
      feature: ctx?.feature ?? "unknown",
      ai: AI_DEFAULT_PROVIDER,
      model,
      service,
      prompt: body,
      success: false,
      error: `HTTP ${res.status}: ${errorText.slice(0, 500)}`,
      latencyMs,
    });
    throw new Error(`AI module error (${res.status}): ${errorText.slice(0, 200)}`);
  }

  const json = (await res.json()) as AiModuleResponse;

  // Log successful call
  await _logAiCall({
    feature: ctx?.feature ?? "unknown",
    ai: AI_DEFAULT_PROVIDER,
    model,
    service,
    prompt: body,
    response: json.data?.content ?? "",
    promptTokens: json.data?.usage?.prompt_tokens,
    completionTokens: json.data?.usage?.completion_tokens,
    totalTokens: json.data?.usage?.total_tokens,
    success: true,
    latencyMs,
  });

  return json;
}

// ── Log helper ───────────────────────────────────────────────────────────────
async function _logAiCall(p: {
  feature: string;
  ai: string;
  model: string;
  service: string;
  prompt: string;
  response?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  success: boolean;
  error?: string;
  latencyMs?: number;
}) {
  const ctx = _ctx;
  try {
    await db.aiPromptLog.create({
      data: {
        userId: ctx?.userId ?? null,
        brandId: ctx?.brandId ?? null,
        feature: p.feature,
        ai: p.ai,
        model: p.model,
        service: p.service,
        prompt: p.prompt,
        response: p.response ?? null,
        promptTokens: p.promptTokens ?? null,
        completionTokens: p.completionTokens ?? null,
        totalTokens: p.totalTokens ?? null,
        success: p.success,
        error: p.error ?? null,
        latencyMs: p.latencyMs ?? null,
      },
    });
  } catch {
    // Logging should never fail the main request
    console.error("[ai] failed to write AiPromptLog:", p.feature);
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

/** Stream-free chat completion that returns plain text. */
export async function llmChat(
  messages: ChatMessage[],
  opts?: { temperature?: number; max_tokens?: number }
): Promise<string> {
  const resp = await callAiModule(messages, {
    temperature: opts?.temperature ?? 0.7,
    max_tokens: opts?.max_tokens ?? 2000,
  });
  return resp.data?.content ?? "";
}

/** Chat completion that returns parsed JSON. Falls back gracefully. */
export async function llmJson<T = unknown>(
  messages: ChatMessage[],
  opts?: { temperature?: number; max_tokens?: number }
): Promise<T> {
  const text = await llmChat(messages, opts);
  // Strip markdown code fences if present
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Try to extract the largest JSON-looking block
    const m = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (m) {
      try {
        return JSON.parse(m[0]) as T;
      } catch {
        /* fall through */
      }
    }
    throw new Error("LLM did not return valid JSON: " + cleaned.slice(0, 300));
  }
}

/** Web search via AI module (limited — falls back to empty results). */
export async function webSearch(query: string, opts?: { num?: number; recency_days?: number }) {
  try {
    const resp = await callAiModule(
      [
        {
          role: "system",
          content: `Kamu adalah search engine. Cari informasi terbaru tentang query berikut. Balas dengan daftar hasil pencarian dalam format JSON array: [{"name": "...", "url": "...", "snippet": "...", "host_name": "..."}]. Maksimal ${opts?.num ?? 8} hasil.`,
        },
        { role: "user", content: query },
      ],
      { temperature: 0.3, max_tokens: 3000, service: "Web Search" }
    );
    const text = resp.data?.content ?? "";
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      return JSON.parse(match[0]) as { url: string; name: string; snippet: string; host_name: string; date: string }[];
    }
    return [];
  } catch {
    return [];
  }
}

/** Image generation via AI module. Returns base64 data URL, or null on failure. */
export async function generateImage(
  prompt: string,
  opts?: { size?: string; imageUrl?: string }
): Promise<string | null> {
  const ctx = _ctx;
  const model = "gemini-2.5-flash-image";
  const service = ctx?.service ?? "Image Generator";
  const size = toRatioSize(opts?.size ?? "1024x1024");
  const t0 = Date.now();

  try {
    const form = new FormData();
    form.append("ai", AI_DEFAULT_PROVIDER);
    form.append("model", model);
    form.append("prompt", prompt);
    form.append("size", size);

    // Use reference endpoint if a product image is provided
    const endpoint = opts?.imageUrl
      ? `${AI_BASE}/images/generation/reference`
      : `${AI_BASE}/images/generation`;

    if (opts?.imageUrl) {
      const imgRes = await fetch(opts.imageUrl);
      const imgBlob = await imgRes.blob();
      const ext = opts.imageUrl.match(/\.(png|jpe?g|webp)/i)?.[1] ?? "webp";
      const mime = ext === "png" ? "image/png" : ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "image/webp";
      form.append("image", imgBlob, `reference.${ext}`);
      form.append("ref_task", "ip");
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "accept": "application/json",
        "x-key": AI_KEY,
      },
      body: form,
    });

    const latencyMs = Date.now() - t0;
    const json = await res.json() as { status: number; message: string; data?: { data?: { b64_json?: string }[]; usage?: { total_tokens?: number } } };

    const b64 = json.data?.data?.[0]?.b64_json;
    if (!res.ok || !b64) {
      await _logAiCall({
        feature: ctx?.feature ?? "unknown",
        ai: AI_DEFAULT_PROVIDER,
        model,
        service,
        prompt,
        success: false,
        error: `Image generation failed: ${JSON.stringify(json).slice(0, 300)}`,
        latencyMs,
      });
      return null;
    }

    const imageUrl = `data:image/webp;base64,${b64}`;

    await _logAiCall({
      feature: ctx?.feature ?? "unknown",
      ai: AI_DEFAULT_PROVIDER,
      model,
      service,
      prompt,
      response: "[image]",
      totalTokens: json.data?.usage?.total_tokens ?? undefined,
      success: true,
      latencyMs,
    });

    return imageUrl;
  } catch (err: any) {
    const latencyMs = Date.now() - t0;
    await _logAiCall({
      feature: ctx?.feature ?? "unknown",
      ai: AI_DEFAULT_PROVIDER,
      model,
      service,
      prompt,
      success: false,
      error: `Network error: ${err.message}`,
      latencyMs,
    });
    return null;
  }
}

/** Convert pixel size like "1024x1024" to ratio format like "1:1" */
function toRatioSize(size: string): string {
  const map: Record<string, string> = {
    "1024x1024": "1:1",
    "1344x768": "16:9",
    "1440x720": "2:1",
    "768x1344": "9:16",
    "1152x864": "4:3",
    "864x1152": "3:4",
    "720x1440": "1:2",
  };
  return map[size] ?? "1:1";
}
