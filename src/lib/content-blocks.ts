// Shared content-block schema for "non-basic" research output.
//
// Basic research (the first, forced comprehensive run per brand) always
// produces the rigid ResearchResult shape (@/lib/research-normalize) and
// renders via the fixed 4-tab view. Every research after that is free-form —
// the user can ask about anything, and the shape of a good answer varies a
// lot (a list here, a comparison table there, a single stat elsewhere).
//
// Rather than let the agent emit raw HTML (an injection surface — this is
// AI output seeded from web search results, i.e. untrusted input) or force
// it into the basic shape (wrong fit), the agent emits an array of these
// blocks. Content is always plain text/arrays; markup is never trusted from
// the model — the renderer owns every HTML element.
export type ContentBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "stat"; label: string; value: string }
  | { type: "quote"; text: string };

export function isContentBlockArray(v: unknown): v is ContentBlock[] {
  return (
    Array.isArray(v) &&
    v.every(
      (b) =>
        b &&
        typeof b === "object" &&
        typeof (b as { type?: unknown }).type === "string" &&
        ["heading", "paragraph", "list", "table", "stat", "quote"].includes((b as { type: string }).type)
    )
  );
}
