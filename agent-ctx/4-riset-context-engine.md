# Task 4 — Riset + Context Engine

**Agent:** full-stack-developer (Riset + Context Engine)
**Task ID:** 4
**Date:** 2025-07-10

## What I Built

### A. API Routes (all server-side, `force-dynamic`, cookie-auth via `getUserId`)

1. **`POST /api/research`** (`src/app/api/research/route.ts`)
   - Body: `{ brandId, query }`
   - Pipeline: verify brand ownership → charge 5 credit (`riset.pasar`) → `webSearch(query, {num:8, recency_days:90})` → `classifyIntent` (llmJson) → `synthesizeResearch` (llmJson with full shape normalization) → `db.research.create` → `generateContexts` (3 FREE contexts) → return `{ research, contexts, creditBalanceAfter }`
   - On failure after charge: `refundCredit` + 500 error
   - On insufficient balance: 402 with `{ error, reason: "insufficient_balance", required: 5 }`

2. **`GET /api/research?brandId=X`** (`src/app/api/research/route.ts`)
   - List newest 50 research with `intent`, `query`, `createdAt`, `contextsCount`, parsed `result`
   - Brand ownership verified

3. **`GET /api/research/[id]`** (`src/app/api/research/[id]/route.ts`)
   - Single research + its 3 contexts (with `usageCount`)
   - Ownership verified via `research.userId === userId`

4. **`GET /api/contexts?brandId=X`** (`src/app/api/contexts/route.ts`)
   - List 100 contexts with `contextUsage` count, `research.query`, `research.intent`
   - Brand ownership verified

5. **`POST /api/contexts/[id]/use`** (`src/app/api/contexts/[id]/use/route.ts`)
   - Body: `{ usedFor: "konten.generate" | "toko.apply_price" | "keuangan.view_projection", referenceId? }`
   - Validates `usedFor` against enum, verifies ownership via `context.brand.userId`
   - Creates `ContextUsage` row

### B. Pipeline Helper (`src/app/api/research/_pipeline.ts`)
- `_pipeline.ts` is ignored by Next.js App Router (underscore prefix) but importable
- Exports: `classifyIntent`, `synthesizeResearch`, `generateContexts`, `runResearchPipeline`, `BrandLite`, `ResearchResult`
- All LLM output is normalized with safe fallbacks (`safeStr`, `safeArr`, `safeNum`, `safeIntent`) — no crashes on malformed JSON
- **3 contexts auto-generated per research** (FREE):
  - `konten`: `{ research_id, brand_context, recommendations, keyword_suggestions, target_audience }`
  - `toko`: `{ research_id, harga_pasar: {rata_rata, termurah, termahal}, produk_trending, rekomendasi_umum, competitors }`
  - `keuangan`: `{ research_id, proyeksi_margin: {skenario, asumsi_modal, margin_sebelum, margin_sesudah, estimasi_volume, kesimpulan}, rekomendasi_budget, warning }` — margin projection derived from `pricing.lowest` + `market_trend.stats.growth_pct`

### C. Frontend (`src/sections/nw/riset-section.tsx` — 971 lines)
- `useAppStore` for `activeBrand`, `user`, `setSection`
- `useQuery` fetches `/api/research?brandId=X`
- `useMutation` POSTs to `/api/research` → invalidates `["research", brandId]` + `["dashboard", brandId]` + syncs credit via `setCredit(balanceAfter)`
- **PageHeader** with "Riset Pasar" + 🔍 + credit badge in actions
- **Search panel**: Input + 5-credit amber badge on button + 4 suggestion chips (from brand category)
- **Loading skeleton** with 3 pipeline steps + animated cards
- **Left sidebar** (lg+) for history when research exists — clickable items load that research
- **Results view** — 4 tabs:
  1. **Pasar**: recharts BarChart (6-month trend, teal→orange gradient bars) + stats card + keyword cloud (hot=orange, stable=stone)
  2. **Audiens**: 3 persona cards with avatar initials, platform icon/badge, pain (rose), trigger (teal)
  3. **Kompetitor & SWOT**: competitor table (responsive, threat badge colored) + SWOT 2x2 grid (S=emerald, W=rose, O=sky, T=amber)
  4. **Konten & Harga**: content rec cards (platform icon, angle, hashtag chips, best-time badge) + pricing 3-cell comparison (lowest/avg/highest) + recommendation box
- **Sticky CTA bar** (`sticky bottom-4`): "Simpan" (toast), "Bikin Konten" (orange → konten), "Atur Toko" (violet → toko), "Proyeksi Keuangan" (teal → keuangan)
- **Empty state** with friendly prompt + "Coba riset pertama" button
- **Insufficient credit**: toast with "Top up" action → `setSection("credit")`
- All copy in Indonesian, mobile responsive (stacks on small, grid on md+)

## Key Decisions

1. **`_pipeline.ts` lives inside `/api/research/`** — underscore prefix tells Next.js to ignore it for routing, but it's still importable by the route handler. Keeps research-specific logic co-located.

2. **LLM output normalized defensively** — `synthesizeResearch` runs every field through `safeStr`/`safeArr`/`safeNum` so even malformed LLM JSON won't crash the API. Falls back to sensible defaults (6-month trend array, empty arrays, "sedang" threat level).

3. **Intent classification is a separate cheap LLM call** before synthesis — costs only 60 max_tokens and lets the synthesis prompt be tailored. Falls back to keyword heuristic if LLM fails.

4. **3 contexts generated in parallel** (`Promise.all`) — 3 `db.context.create` calls run concurrently for speed.

5. **Margin projection derived deterministically** from `growth_pct` + `pricing.lowest` (no extra LLM call) — `marginSesudah = clamp(15, 80, 30 + round(growthPct/3))`, `estimasiVolume = max(50, 100 + growthPct*2)`.

6. **Refund on pipeline failure** — after credit charge, if webSearch/classify/synthesize/DB-write throws, we `refundCredit` with `originalBalanceBefore = balanceAfter + 5` (since we know cost is 5).

7. **Frontend uses `sonner` toast** (already mounted in layout.tsx) — not the radix toast. Consistent with the rest of the app.

8. **`setCredit(balanceAfter)` called on mutation success** — keeps Zustand store in sync with server's authoritative credit balance after charge.

## Files Created/Modified

```
src/app/api/research/_pipeline.ts          (NEW, 230 lines — pipeline helpers)
src/app/api/research/route.ts              (NEW, 165 lines — POST pipeline + GET list)
src/app/api/research/[id]/route.ts         (NEW, 60 lines — GET single research + contexts)
src/app/api/contexts/route.ts              (NEW, 55 lines — GET list contexts)
src/app/api/contexts/[id]/use/route.ts     (NEW, 55 lines — POST mark context used)
src/sections/nw/riset-section.tsx          (OVERWRITTEN, 971 lines — full client UI)
```

## What the Next Agent Should Know

1. **Context shape is documented in `_pipeline.ts`** — if the Konten/Toko/Keuangan agents need to know what `context.context` contains, read `generateContexts()` in `_pipeline.ts`. Each module's section should `GET /api/contexts?brandId=X&targetModule=...` (filter client-side) to find its relevant context.

2. **`ContextUsage` should be marked when a module actually USES the context** — e.g., when Konten agent generates content from a konten-context, it should `POST /api/contexts/[id]/use` with `{ usedFor: "konten.generate", referenceId: contentId }`. This is what powers the "used" state in Beranda's recommendations.

3. **Credit cost for `riset.pasar` is 5** (from `CREDIT_COST`). The 3 auto-generated contexts are FREE — no additional charge.

4. **The `resultJson` field on Research is a stringified `ResearchResult`** — the GET routes parse it back to `result` object. The frontend `ResearchResult` interface in `riset-section.tsx` is the source of truth for the shape.

5. **My files pass lint clean** — the lint errors currently shown (`pengaturan-section.tsx:820`, `toko/store-preview.tsx:138`, `page.tsx:44`) are NOT mine. The dev server also shows `toko-section` module-not-found errors from another agent's in-progress work.

6. **recharts is already in package.json** (`^2.15.4`) — no install needed. I use `BarChart`/`Bar`/`XAxis`/`YAxis`/`Tooltip`/`ResponsiveContainer`/`Cell` for the trend chart.
