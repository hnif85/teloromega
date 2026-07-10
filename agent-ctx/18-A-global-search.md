# Task 18-A — Global Search (full-stack-developer)

## What was built
A Spotlight/Alfred-style global search across 6 business data models. Distinct
from the existing ⌘K Command Palette (which navigates sections) — Global Search
queries actual DATA (products, orders, customers, leads, transactions, content)
and lets users jump straight to the relevant section.

## Files created
- `src/app/api/search/route.ts` — GET endpoint that runs 6 parallel Prisma
  queries filtered by `brandId` + `OR contains q` across name/sku/description,
  customer/lead name + resi, customer phone/email, lead phone/notes,
  transaction description/category, and content body/platform/type. Returns a
  unified `{results, total, query}` payload.
- `src/components/nw/global-search.tsx` — `"use client"` dialog component
  with debounce, recent-searches, grouped results, keyboard nav, and the
  `openGlobalSearch()` event-bus function used by the topbar.

## Files edited
- `src/components/nw/topbar.tsx` — added the ⌘F search button next to the
  existing ⌘K command palette button, plus `<GlobalSearch />` mounted at the
  bottom of the header.

## Key decisions
- **Scoring**: exact name match = 100, starts-with = 80, contains = 60, other
  field match = 40. Computed post-fetch in JS so we don't need separate
  per-field queries. Tiebreaker is cross-model createdAt-desc via a position
  map built by walking each model's already-sorted result list.
- **Order ID matching**: SQLite can't easily do "ends-with 6 chars" on a CUID,
  so we filter orders by resi/customer-name/lead-name and then ALSO score the
  last-6 of the order id against the query client-side (exact short-ref match
  bumps score to 100).
- **Debounce**: 300ms in the component before firing the API call.
- **TanStack Query**: `placeholderData: (prev) => prev` keeps the previous
  results visible while fetching the next query — avoids the "no results" flash
  between keystrokes.
- **Dialog vs CommandDialog**: chose plain Dialog (not CommandDialog) so we
  can control the layout (grouped headers with counts, custom input row,
  footer with keyboard hints).
- **localStorage**: `nw:recent-searches` stores last 5 query strings, shown in
  the empty-query state along with search tips and source-data badges.
- **Keyboard**: ↑↓ navigate flat index across grouped results, ↵ opens, Esc
  closes (Radix Dialog default). Cmd+F / Ctrl+F opens the dialog globally via
  a `keydown` listener with `preventDefault` to override browser find.
- **Type → section map**: produk→produk, order→toko, customer→toko, lead→toko,
  transaksi→keuangan, konten→konten. Clicking a result calls `setSection()`
  and closes the dialog. The `referenceId` field is available for downstream
  deep-linking (not wired yet since section views don't have item-level routes
  — they use in-section state for selection).

## Lint / Type check
- `bun run lint`: 0 errors, 0 warnings.
- `bunx tsc --noEmit`: 0 errors.

## Patterns followed
- Cookie auth via `getUserId(req)` + brand ownership check (matches every
  other GET endpoint in the codebase).
- `Promise.all` parallel queries with per-model `take = limit` (mirrors
  `/api/activity/route.ts`).
- `formatRupiah` from `@/lib/constants` for price/amount formatting.
- CustomEvent bus (`OPEN_GLOBAL_SEARCH_EVENT`) for imperative open — same
  pattern as `openCommandPalette()`.
- Cream/teal palette, all Indonesian copy, shadcn/ui (Dialog, Input, Badge,
  Skeleton, ScrollArea), Lucide icons.
