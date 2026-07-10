# Task 13-A — Insights Analytics Module

**Agent**: full-stack-developer (Insights Analytics)
**Task**: Build new Insights section — aggregated analytics API, AI business summary, 6 chart types, metrics row, activity feed.

## Work Log

- Read `worklog.md` (last 3 entries: Task 12-A Produk, Task 12-B Styling+BrandDelete+Features, Task 12 main QA round) to understand the project state — app had 8 sections (Beranda, Produk, Riset, Konten, Toko, Keuangan, Credit, Pengaturan).
- Read pattern files to learn established conventions:
  - `src/lib/constants.ts` — SectionKey type, NAV_ITEMS, formatRupiah helpers, CREDIT_RATES.
  - `src/lib/store.ts` — useAppStore, getActiveBrand selector.
  - `src/lib/api.ts` — typed `api()` client with `json` shorthand.
  - `src/lib/ai.ts` — `llmJson` with try/catch fallback behavior.
  - `src/lib/auth.ts` — `getUserId(req)` cookie-based auth.
  - `src/lib/credit.ts` — `chargeCredit` central utility (atomic balance + log).
  - `src/components/nw/primitives.tsx` — PageHeader, StatCard, SectionCard, EmptyState (with AnimatedNumber).
  - `src/sections/nw/beranda-section.tsx` — TanStack Query + recharts pattern, getActiveBrand usage.
  - `src/sections/nw/keuangan/ringkasan-tab.tsx` — ComposedChart/PieChart/BarChart patterns with teal/orange palette.
  - `prisma/schema.prisma` — all models (Transaction, Order with JSON items, Customer, Lead, Content, Research).
- Confirmed sidebar + topbar auto-pick-up `NAV_ITEMS` from constants.ts, so adding `"insights"` to NAV_ITEMS automatically wires the sidebar entry.

### A. constants.ts edit
- Added `"insights"` to `SectionKey` type (positioned after `"beranda"`, before `"produk"`).
- Added `{ key: "insights", label: "Insights", icon: "📈" }` to `NAV_ITEMS` array (after Beranda, before Produk).

### B. page.tsx edit
- Imported `InsightsSection` from `@/sections/nw/insights-section`.
- Added render branch `{section === "insights" && <InsightsSection />}` (after beranda, before produk).
- Fixed a stray double-brace `}}` introduced during the multi-edit (replaced with single `}`).

### C. Insights API — `src/app/api/insights/route.ts` (GET)
- Auth: `getUserId(req)` + verify brand ownership (returns 404 if brand not found / not owned).
- Returns `InsightsResponse` with 7 sections:
  - `revenueTrend` — 6-month buckets from `Transaction` type=income, with order count per month & avg order value.
  - `topProducts` — aggregated from `Order.items` JSON (parsed, excluding cancelled orders), joined with `Product` for costPrice/margin. Sorted by revenue, top 5.
  - `customerGrowth` — cumulative `Customer.createdAt` per month, with "before window" baseline so cumulative is accurate.
  - `leadFunnel` — group `Lead.stage` into Baru/Negosiasi/Deal/Closed with conversion rates between stages.
  - `contentByType` — `Content.type` distribution with pct.
  - `salesByDay` — `Transaction` type=income grouped by `getDay()`, reordered to Mon–Sun with Indonesian day names.
  - `metrics` — avgOrderValue (this month), repeatCustomerRate, conversionRate, avgMarginPct, revenueGrowthPct (this vs last month), inventoryValue (Σ stock × costPrice for barang).
  - `recentActivity` — union of last 5 each of orders, payments, leads, content, research, transactions, sorted by timestamp desc, limited to 10.
- All 12 base queries run in `Promise.all` for performance.
- Empty brandId → returns zeroed `emptyInsights()` shape (no error).
- Empty data → returns zeros/empty arrays (graceful).

### D. AI Summary API — `src/app/api/insights/summary/route.ts` (POST)
- Body: `{ brandId }`.
- Auth: `getUserId(req)` + verify brand ownership.
- Charges 3 credits via `chargeCredit({ actionKey: "keuangan.proyeksi" })` (reused as analytical action per spec). Returns 402 if insufficient balance.
- Gathers a focused subset of insights data via `gatherInsightsForAI()` helper (revenue trend, top 3 products, lead funnel, customer growth, 13-field metrics object including totalRevenueThisMonth, newCustomersThisMonth, totalLeads, dealsCount, etc.).
- Calls `llmJson<AISummary>` with system prompt requiring exact JSON shape: `{ headline, strengths[2-3], concerns[2-3], recommendations[3-4], healthScore 0-100, trend up|down|stable }`.
- **CRITICAL fallback**: Wrapped in try/catch. On LLM failure (401, timeout, invalid JSON, network), `deriveFallbackSummary()` produces a valid `AISummary` purely from the data:
  - Strengths: revenue growth >10% → "Pendapatan naik X%", margin ≥30% → "Margin sehat", repeat rate ≥30% → "Loyalitas bagus", top product mention, conversion ≥30%.
  - Concerns: revenue decline, conversion <20% → "Konversi rendah", margin <20% → "Margin tipis", repeat <20% → "Repeat rendah", stale leads.
  - Recommendations: data-driven — "Target +20% revenue", "Hubungi lead dalam 24 jam", "Buat program loyalti", "Review harga jual", "Fokus promosi produk terlaris", capped at 4.
  - Health score: weighted (growth ±15, margin ±12, conversion ±10, repeat ±10, inventory penalty -10 if no sales).
  - Trend: derived from revenueGrowthPct (>5 = up, <-5 = down, else stable).
  - Headline: bucketed by score (≥70 sehat, ≥40 stabil, <40 perlu perhatian) with brand name + actual revenue.
- `normalizeSummary()` clamps healthScore to 0–100, validates trend enum, caps arrays.
- Returns `{ summary, balanceAfter, usedFallback }`.
- All Rupiah formatting uses `"Rp " + n.toLocaleString("id-ID")`.

### E. InsightsSection component — `src/sections/nw/insights-section.tsx`
- Full "use client" section (~830 lines).
- **PageHeader**: "Insights" with 📈 icon, subtitle "Analisis mendalam & rekomendasi AI untuk [brand name]". Actions: Refresh button (refetch + spinner) + "Ringkasan AI" button (teal, with 3-credit badge, disabled after first generation).
- **AI Summary Card** (top, prominent):
  - Initial: `CTACard` — gradient teal→cream→orange, Brain icon, "Ringkasan Bisnis dari AI" + 3-credit badge + description + credit balance display + "Dapatkan Ringkasan" button (disabled if balance < 3).
  - Loading: `SummarySkeleton` — header, headline, 2-col grid, recommendations.
  - Success: `AISummaryCard` — Brain icon + headline + trend badge (up/down/stable with color) + circular SVG `HealthGauge` (red <40, amber 40-70, green ≥70) with animated stroke-dashoffset. 2-col grid: Kekuatan (emerald checkmarks) | Perlu Perhatian (amber warnings). Rekomendasi section (teal, numbered list). "Tutup" button to dismiss.
  - Fallback: gracefully displays the derived summary (same shape) — toast informs user "mode offline".
- **Metrics row** (6 StatCards, 2-col mobile, 3-col md, 6-col lg): Avg Order Value, Repeat Customer %, Konversi Lead %, Avg Margin %, Growth Bulan Ini %, Nilai Stok. Each with trend indicator where applicable.
- **Charts grid** (2-col desktop, 1-col mobile):
  - **Revenue Trend** — `AreaChart` with teal gradient fill for revenue + orange Line for orders. 6-month x-axis. Rupiah-short y-axis.
  - **Top Products** — horizontal `BarChart` (layout="vertical") with two series (revenue teal + margin orange) side by side. Y-axis truncates long product names to 18 chars.
  - **Customer Growth** — `LineChart` with solid teal line for total + dashed purple line for new customers per month.
  - **Lead Funnel** — custom div-based visualization with decreasing-width colored bars (orange→teal→emerald→stone for Baru→Negosiasi→Deal→Closed). Each stage shows count + inter-stage conversion rate. Footer shows overall conversion (Deal+Closed)/total.
  - **Content by Type** — `PieChart` donut with 6-color palette, label inside slices showing name+count. Indonesian labels (Caption/Gambar/Video/Carousel).
  - **Sales by Day** — `BarChart` Mon–Sun with peak day highlighted in teal (#0D9488) and others in light teal (#5EEAD4).
- **Recent Activity feed** (full width, bottom): timeline list of last 10 cross-module events. Each item: colored icon badge by type (order/payment/lead/content/research/transaction), description, type badge + relative time, amount (if any) in Rupiah-short. Max height 440px with overflow scroll.
- **Empty state**: friendly "Belum cukup data untuk insights" with CTA buttons to Toko (Mulai Jualan) and Keuangan (Catat Transaksi). Triggered when no revenue, no top products, no recent activity, no inventory value.
- **Loading state**: 6 skeleton StatCards + 4 skeleton chart cards + skeleton activity card.
- **Error state**: EmptyState with "Coba lagi" button.
- TanStack Query: `useQuery(["insights", brandId])` with 60s staleTime. `useMutation` for AI summary POST.
- `useAppStore`: `user`, `setCredit`, `setSection`. `getActiveBrand(useAppStore.getState())`.
- `sonner` toast for feedback (success/error).
- All copy in Indonesian. Mobile responsive (charts stack 1-col on mobile, metrics wrap 2-per-row, AI card flex-col on mobile).
- Established palette: teal #0D9488 primary, orange #F97316 secondary, emerald/amber/rose for semantic, cream background. Lucide icons used throughout (Brain, Sparkles, TrendingUp/Down/Minus, RefreshCw, Activity, Users, ShoppingBag, DollarSign, Percent, Package, CheckCircle2, AlertTriangle, Lightbulb, etc.).

### F. Lint + tsc
- `bun run lint` — 0 errors, 0 warnings.
- `bunx tsc --noEmit` — 0 errors (after excluding skills/ and examples/).
- No dev server errors observed.

## Stage Summary

### Files created
- `src/app/api/insights/route.ts` — GET endpoint, ~360 lines, 12 parallel Prisma queries + aggregations.
- `src/app/api/insights/summary/route.ts` — POST endpoint, ~370 lines, credit charge + LLM call + comprehensive fallback.
- `src/sections/nw/insights-section.tsx` — Full client section, ~830 lines, 6 chart types + AI summary + activity feed.
- `agent-ctx/13-A-insights-analytics.md` — this work record.

### Files edited
- `src/lib/constants.ts` — added `"insights"` to SectionKey type + NAV_ITEMS array.
- `src/app/page.tsx` — imported InsightsSection + added render branch.

### Decisions
- **Credit action key reuse**: Used `keuangan.proyeksi` (3 credits) for the AI summary per spec instruction (analytical action). Did not add a new `insights.summary` action key — would have required editing CREDIT_RATES/CREDIT_COST in constants.ts which is allowed but spec said "reuse since it's an analytical action".
- **Recharts chart type mixing**: Used `AreaChart` with both `<Area>` (revenue) and `<Line>` (orders) children — recharts 2.15 supports any Cartesian series inside any Cartesian chart type. Alternative would have been `ComposedChart` but AreaChart is more semantic.
- **Lead funnel as custom divs**: Avoided recharts FunnelChart (less common, harder to label) in favor of simple div-based bars with decreasing widths. Easier to add inter-stage conversion rates and total conversion footer.
- **Health gauge as SVG**: Implemented custom SVG circle with `stroke-dasharray`/`strokeDashoffset` rather than recharts RadialBarChart — gives precise control over color thresholds (red/amber/green) and animated count-up effect via CSS transition.
- **AI summary data subset**: The summary endpoint re-gathers a focused subset of insights (not all 7 sections) to keep the LLM prompt concise — top 3 products instead of 5, focused metrics object with 13 fields, 6-month trend. The full insights data stays in the GET endpoint for the chart rendering.
- **Fallback derivation logic**: Built 6 strength patterns, 6 concern patterns, 6 recommendation patterns, each triggered by data thresholds (revenue growth >10%, margin <20%, conversion <20%, etc.). Health score weighted-sum from 50 baseline, clamped to 0-100. Trend derived from revenueGrowthPct. Headline bucketed by score with actual revenue figure embedded.
- **No command-palette update**: Per spec constraint "Only create files under src/app/api/insights/ and src/sections/nw/insights-section.tsx, plus edit constants.ts and page.tsx" — did NOT touch command-palette.tsx (which has hardcoded section list without insights). Topbar nav dropdown + sidebar DO pick up the new entry automatically since they map over NAV_ITEMS.
- **Empty brandId handling**: Returns zeroed `emptyInsights()` shape (200 status) rather than 400 — matches dashboard route pattern of gracefully handling missing brandId.
- **Customer growth baseline**: Computed customers-before-window count so cumulative total is accurate across the 6-month view (otherwise first month would show only its new customers as "total").
- **Inventory value filter**: Only `barang` products with non-null stock AND non-null costPrice contribute to inventory value (jasa has no stock, and barang without costPrice has unknown value).

### Spec compliance
- ✅ SectionKey + NAV_ITEMS updated (after Beranda, before Produk).
- ✅ Page router render branch in correct position.
- ✅ GET /api/insights returns all 8 specified data sections + metrics + recentActivity.
- ✅ POST /api/insights/summary charges 3 credits, calls llmJson, has comprehensive try/catch fallback.
- ✅ InsightsSection: PageHeader with Refresh + Ringkasan AI buttons, AI summary card with gauge/trend/headline/strengths/concerns/recommendations, 6 StatCards, 6 chart types in 2-col grid, recent activity feed.
- ✅ Empty state, loading state, error state, mobile responsive, Indonesian copy, established palette, TanStack Query + useMutation, useAppStore, sonner toast.
- ✅ All Lucide icons from spec used.
- ✅ Did NOT modify any existing API routes, lib/* (except constants.ts), or other section files (except page.tsx).
