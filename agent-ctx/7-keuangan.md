# Task ID: 7 — Agent: full-stack-developer (Keuangan)

## Module Built
Keuangan (Finance) module of The Next Whiz — Indonesian UMKM AI co-pilot.

## Scope
Full-stack module: backend API routes + frontend section with 5 tabs (Ringkasan, Transaksi, Piutang & Hutang, Biaya Operasional, Proyeksi).

## Files Created

### API Routes (`src/app/api/`)
- `transactions/route.ts` — GET (list, filter by date/type/category/search, cursor pagination) + POST (manual entry, auto-compute HPP from product.costPrice when type=income)
- `transactions/summary/route.ts` — GET aggregated P&L for period (month/quarter/year): totalIncome, totalExpense, totalHPP, grossProfit, netProfit, marginPct, byCategory, monthlyTrend (6 months), cashFlow (with warning if net<0), incompleteMarginCount, taxEstimate (PPh 0.5% + PPN 11%)
- `receivables/route.ts` — GET (filter by status, auto-mark overdue) + POST
- `receivables/[id]/route.ts` — PATCH mark paid (auto-creates income transaction)
- `payables/route.ts` — GET + POST
- `payables/[id]/route.ts` — PATCH mark paid (auto-creates expense transaction)
- `operational-costs/route.ts` — GET (with stats: totalThisMonth, totalMonthlyRecurring) + POST (auto-creates expense transaction category=operasional)
- `keuangan/contexts/route.ts` — GET list keuangan contexts (parses contextJson's `proyeksi_margin`)
- `keuangan/projection/route.ts` — POST: reads contextJson `proyeksi_margin`, optionally applies product.costPrice, charges 3 credits via `chargeCredit({actionKey: "keuangan.proyeksi"})`, computes break-even volume, enhances narrative via `llmJson`, marks context as used via `db.contextUsage.create({usedFor: "keuangan.view_projection"})`. Graceful fallback if LLM fails.

### Frontend Section (`src/sections/nw/`)
- `keuangan-section.tsx` — main "use client" component with PageHeader + period selector + 5 Tabs
- `keuangan/types.ts` — shared TypeScript interfaces and category label maps
- `keuangan/ringkasan-tab.tsx` — 4 stat cards, cash flow card with negative-warning banner, ComposedChart (Bar+Line) for 6-month trend, PieChart for expense breakdown, "margin belum lengkap" warning card listing affected products, tax estimation card (PPh 0.5% + PPN 11%)
- `keuangan/transaksi-tab.tsx` — filter row (type, category, date range, search), paginated table with type badges + entity links + HPP warning, add-transaction Dialog with income/expense toggle, category select, amount, product link (auto-HPP preview), description, date. Mock CSV export toast.
- `keuangan/piutang-hutang-tab.tsx` — 2-column layout: Piutang (left, teal accent) + Hutang (right, orange accent), each with totals banner, list with overdue highlighting (red), paid (faded), outstanding (amber) badges, add Dialog forms, mark-as-paid buttons (auto-trigger income/expense transaction)
- `keuangan/biaya-operasional-tab.tsx` — 4 stat cards (ThisMonth, RecurringMonthly, countThisMonth, countRecurring), list with recurring badge, add Dialog with category, amount, recurring toggle, date, description
- `keuangan/proyeksi-tab.tsx` — credit cost banner (3 credit / view), context list (left), projection panel (right): context detail + product selector (optional), "Lihat Proyeksi (3 credit)" button → renders ProjectionCard with: margin before/after bar comparison, product margin stats, break-even calculation, LLM narrative (teal), recommendation (cream), risks (rose), "Catat Budget" button → creates operational_cost via existing API

## Key Decisions
1. **Auto-HPP on transaction POST** — When type=income + productId provided, costAmount is computed as `product.costPrice * (quantity || 1)`. If product has no costPrice, costAmount=null and the transaction is flagged for "margin belum lengkap" warning.
2. **Operational costs auto-become transactions** — Each operational cost POST also creates a transaction {type:expense, category:"operasional"} so P&L is automatically up to date. No double-entry needed.
3. **Receivables/Payables PATCH creates transactions on payment** — Marking a piutang as paid auto-creates an income transaction; hutang creates an expense. This keeps the cash flow accurate.
4. **Cash flow includes HPP** — `cashFlow.outflow = totalExpense + totalHPP` to reflect actual cash out (HPP from inventory purchases isn't always recorded as explicit expense transactions).
5. **Projection endpoint handles missing asumsi_modal gracefully** — Falls back to brand's 6-month average monthly expense for break-even calculation.
6. **Tax estimation** — PPh Final 0.5% (PP 23/2018) + PPN 11% on income. Includes disclaimer that this is not formal tax advice.
7. **Contexts endpoint placed under `/api/keuangan/contexts`** (not `/api/contexts`) to comply with "only modify keuangan/" constraint. Frontend uses this path.
8. **Period selector only shown on Ringkasan tab** — Other tabs use their own time filters (Transaksi has its own date range; Piutang/Hutang/Biaya don't need period; Proyeksi is context-based).

## Verification
- `bun run lint`: 0 errors in keuangan files (only pre-existing page.tsx warning remains)
- `tsc --noEmit`: 0 errors in keuangan files (other modules' errors are unrelated)
- All components follow established palette: bg-card, text-ink, text-stone, bg-teal-100, text-teal-700, bg-emerald-100/700, bg-rose-100/700, bg-amber-100/700
- All copy in Indonesian
- Mobile responsive (grid-cols-1 lg:grid-cols-2 etc., flex-wrap, hidden sm:table-cell)
- TanStack Query for all data fetching, mutations with invalidateQueries
- sonner toast for user feedback
- recharts for ComposedChart (bar+line) and PieChart
- Lucide icons throughout
- shadcn/ui: Tabs, Card (via SectionCard), Button, Input, Select, Table, Badge, Dialog, Switch, Label, Skeleton

## Integration Notes
- Uses `/api/products?brandId=X` (existing) for product selection in transactions and projection tabs.
- Does NOT use `/api/customers` (folder exists but route not yet built by another agent) — transaction dialog only links products, customers can be referenced via description for now. When the customers API is built, the transaction dialog can be enhanced to include customer selection.
- Credit charges via existing `chargeCredit` from `@/lib/credit`. Frontend updates local store via `setCredit(balanceAfter)` after successful projection.
- All API routes use `getUserId(req)` from `@/lib/auth` for auth and verify brand ownership before any mutation.
