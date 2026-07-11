// Real web search via Tavily API.
// Replaces the LLM-hallucinated "web search" in lib/ai.ts.

const TAVILY_URL = "https://api.tavily.com/search";
const TAVILY_KEY = "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";

export interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

interface TavilyResponse {
  query: string;
  answer?: string;
  results: TavilyResult[];
  response_time: number;
}

/**
 * Search the real web via Tavily.
 * Returns structured results with title, url, content, and relevance score.
 */
export async function tavilySearch(
  query: string,
  opts?: { maxResults?: number; days?: number; depth?: "basic" | "advanced" }
): Promise<TavilyResult[]> {
  const maxResults = opts?.maxResults ?? 8;
  const depth = opts?.depth ?? "basic";

  try {
    const res = await fetch(TAVILY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TAVILY_KEY}`,
      },
      body: JSON.stringify({
        query,
        search_depth: depth,
        include_answer: depth === "advanced",
        max_results: maxResults,
        days: opts?.days ?? 90,
        topic: "general",
      }),
    });

    if (!res.ok) {
      console.error("[tavily] search failed:", res.status, await res.text().catch(() => ""));
      return [];
    }

    const data = (await res.json()) as TavilyResponse;
    return data.results ?? [];
  } catch (err) {
    console.error("[tavily] network error:", err);
    return [];
  }
}

/**
 * Convert Tavily results to the format expected by the pipeline
 * (matching the old webSearch return type).
 */
export function toSearchResultFormat(results: TavilyResult[]) {
  return results.map((r) => ({
    name: r.title,
    url: r.url,
    snippet: r.content,
    host_name: extractHost(r.url),
    date: "",
  }));
}

function extractHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
