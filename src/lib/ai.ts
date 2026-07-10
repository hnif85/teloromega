// AI helpers — thin wrappers around z-ai-web-dev-sdk
// These run server-side only.

import ZAI from "z-ai-web-dev-sdk";

let _zai: Awaited<ReturnType<typeof ZAI.create>> | null = null;

async function getClient() {
  if (_zai) return _zai;
  _zai = await ZAI.create();
  return _zai;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** Stream-free chat completion that returns plain text. */
export async function llmChat(
  messages: ChatMessage[],
  opts?: { temperature?: number; max_tokens?: number }
): Promise<string> {
  const client = await getClient();
  const resp = await client.chat.completions.create({
    messages,
    temperature: opts?.temperature ?? 0.7,
    max_tokens: opts?.max_tokens ?? 2000,
  });
  return resp.choices?.[0]?.message?.content ?? "";
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

/** Web search wrapper for research module. */
export async function webSearch(query: string, opts?: { num?: number; recency_days?: number }) {
  const client = await getClient();
  try {
    const results = await client.functions.invoke("web_search", {
      query,
      num: opts?.num ?? 8,
      ...(opts?.recency_days ? { recency_days: opts.recency_days } : {}),
    });
    // SDK returns SearchFunctionResultItem[] directly
    return results as { url: string; name: string; snippet: string; host_name: string; date: string }[];
  } catch {
    return [];
  }
}

/** Image generation wrapper for konten module. Returns data URL (base64). */
export async function generateImage(
  prompt: string,
  opts?: { size?: "1024x1024" | "768x1344" | "864x1152" | "1344x768" | "1152x864" | "1440x720" | "720x1440" }
) {
  const client = await getClient();
  const resp = await client.images.generations.create({
    prompt,
    size: opts?.size ?? "1024x1024",
  });
  const b64 = resp.data?.[0]?.base64;
  if (b64) return `data:image/png;base64,${b64}`;
  return null;
}
