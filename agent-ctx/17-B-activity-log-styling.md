# Task 17-B — Activity Log + Styling Polish

> Subagent: full-stack-developer (Activity Log + Styling)
> Parent task: 17 (Activity Log feature + styling polish)
> Started: after Task 16 (login/logout flow + reset onboarding).

## Objective

Build a new **Aktivitas** section for The Next Whiz that shows a unified chronological timeline of all brand events (orders, payments, leads, content, research, transactions, campaigns, goals). Also enhance the global `EmptyState` primitive with gradient/glow polish and add a `skeleton-pulse` CSS animation for richer loading states.

## Reference material read (prior agent work)

- `worklog.md` — last 3 task entries (15-A Kalender, 15-B Goals, 16 Login/logout).
- `src/lib/constants.ts` — `SectionKey`, `NAV_ITEMS`, `SECONDARY_NAV`, `formatRupiah`, `formatRupiahShort`, `timeAgo`.
- `src/lib/store.ts` — `useAppStore`, `getActiveBrand` selector, `setSection`.
- `src/lib/api.ts` — typed `api<T>()` client.
- `src/lib/auth.ts` — `getUserId(req)` cookie-based auth.
- `src/components/nw/primitives.tsx` — `PageHeader`, `StatCard`, `SectionCard`, `EmptyState`.
- `src/components/nw/topbar.tsx` — notifications dropdown pattern (derives alerts from dashboard data).
- `src/app/api/insights/route.ts` — `recentActivity` field pattern (union of events from multiple models, merged + sorted by timestamp).
- `src/sections/nw/insights-section.tsx` — `RecentActivityFeed` rendering, `ACTIVITY_STYLE` map, `timeAgo` + `formatRupiahShort` usage.
- `prisma/schema.prisma` — Order, Payment, Lead, Content, Research, Transaction, Campaign (+CampaignRecipient), Goal models.

## Files created

1. **`src/app/api/activity/route.ts`** (~330 lines)
   - `GET /api/activity?brandId=X&limit=50&type=order`
   - Auth: `getUserId(req)` + brand ownership verify (`brand.userId === userId`).
   - Query params: `brandId` (required), `limit` (default 50, max 200), `type` (optional comma-separated filter).
   - Parallel `Promise.all` across 8 models — each queried with `take=limit` when its type is wanted, `Promise.resolve([])` otherwise.
   - Per-model field selection optimized to only what's needed for the activity description.
   - Maps each record to `ActivityItem` shape:
     - Order: `🛒 Order #${shortRef} dibuat` — customer name · item count · total.
     - Payment: `💳 Pembayaran ${status}` — amount · method · Order #ref · customer.
     - Lead: `👥 Lead baru: ${name}` — stage · source channel.
     - Content: `📝 Konten dibuat: ${type}` — platform · product · body excerpt (60 chars).
     - Research: `🔍 Riset selesai: ${query}` — intent · status.
     - Transaction: `💰 Transaksi: Pemasukan/Pengeluaran` — category · description.
     - Campaign: `📣 Campaign dikirim: ${name}` — channel · recipient count · status.
     - Goal: `🎯 Target dibuat: ${type}` — period · target.
   - Campaign timestamp = `sentAt ?? scheduledAt ?? createdAt`.
   - Transaction timestamp = `date` field (business date, not createdAt).
   - Merges all, sorts by timestamp desc, slices to `limit`.
   - Returns `{ activities, total }` where `total` = count after filter before slice.

2. **`src/sections/nw/aktivitas-section.tsx`** (~580 lines)
   - `"use client"` component.
   - `PageHeader` with ClipboardList icon, Select filter dropdown (9 options), Refresh button.
   - 4 `StatCard`s: Total Aktivitas (API total), Hari Ini, Minggu Ini, Bulan Ini.
   - `Separator` between stats and timeline.
   - `Timeline` (Card container): vertical teal gradient line, `ScrollArea` max-h-70vh, activities grouped by date.
   - `TimelineItem`: clickable button → navigates to type's section. Icon circle (colored by type) with emoji from API. Title + description + amount (colored) + status badge + timeAgo. Hover reveals type label + Lucide icon + chevron.
   - `TimelineSkeleton`: 6 placeholder cards using `Skeleton` component + `skeleton-pulse` CSS.
   - Empty state + error state with retry.
   - Load More button (increments limit by 50, capped at 200).
   - TanStack Query: `queryKey ["activity", brandId, filter, visibleLimit]`, `staleTime 30s`.
   - All copy in Indonesian. Mobile responsive.
   - Uses shadcn/ui: Button, Card, Badge, Select, Skeleton, ScrollArea, Separator.
   - Uses Lucide: ClipboardList, Filter, RefreshCw, ChevronRight, ShoppingBag, CreditCard, Users, FileText, Search, DollarSign, Megaphone, Target, Calendar.

## Files edited

3. **`src/lib/constants.ts`** (+2 lines)
   - Added `"aktivitas"` to `SectionKey` type (after `"bantuan"`).
   - Added `{ key: "aktivitas", label: "Aktivitas", icon: "📋" }` to `SECONDARY_NAV` (after `"bantuan"`, per spec).

4. **`src/app/page.tsx`** (+2 lines)
   - Added `import { AktivitasSection } from "@/sections/nw/aktivitas-section";`
   - Added render branch `{section === "aktivitas" && <AktivitasSection />}`

5. **`src/components/nw/primitives.tsx`** (EmptyState enhanced)
   - Added `fade-in` animation class on root.
   - Added `mesh-hero` subtle gradient background.
   - Bumped icon container from `size-14 text-2xl` → `size-16 text-3xl`.
   - Added soft teal glow via `shadow-[0_4px_16px_rgba(13,148,136,0.18)]` on icon container.
   - Added `leading-relaxed` on description.
   - Wrapped action in `flex justify-center` container with `hover:shadow-[0_0_0_3px_rgba(13,148,136,0.15)]` border-glow transition.

6. **`src/app/globals.css`** (+9 lines)
   - Added `.skeleton-pulse` class: gradient sweep (muted → card → muted, 200% bg-size, 1.5s ease-in-out infinite).
   - Added `@keyframes skeleton-pulse` (background-position 200% → -200%).
   - Uses CSS vars (`--muted`, `--card`) — theme-aware (adapts to light/dark automatically).

## Decisions

- **Per-model take = limit** (not limit/8): a single dominant model can't starve the merged feed. If 50 orders exist but only 3 payments, querying 50 from each then merge-sort-slice ensures the 50 most-recent across all types surface.
- **TypeScript auto-narrows** `Promise<A[]> | Promise<never[]>` → `A[]` in Promise.all destructuring (never[] is assignable to A[]), so no explicit casts needed on the for...of loops.
- **Campaign timestamp** = `sentAt ?? scheduledAt ?? createdAt` — sent campaign shows at send time, scheduled-unsent at scheduled time, draft at creation.
- **Transaction timestamp** = `date` field (business date), not `createdAt` — matches Keuangan module display convention.
- **Amount color logic**: transactions split by title regex (Pemasukan=emerald / Pengeluaran=rose); payments by status (Diterima=emerald, Ditolak=rose, Menunggu=neutral); orders by status (Dibatalkan=stone+strikethrough, else emerald); other types neutral ink.
- **Total Aktivitas stat** uses API `total` field (true count after filter, pre-slice) — not `activities.length` (capped at visibleLimit). Period stats computed from fetched activities — accurate as long as visibleLimit covers the period.
- **Filter change resets visibleLimit to 50** — prevents showing "Load More" with stale count after switching filter.
- **ScrollArea with max-h-70vh** — consistent with kalender-section's ScrollArea max-h pattern.
- **Icon circle uses API emoji** (`item.icon`) for visual distinctiveness. Lucide icons from TYPE_STYLE map used in hover-reveal affordance + available for future legend/filter-chip UI.
- **Skeleton uses shadcn Skeleton component + skeleton-pulse CSS class** — Skeleton provides rounded-md base + animate-pulse fallback; skeleton-pulse overrides with theme-aware gradient sweep.
- **Card component** used for timeline + skeleton containers — satisfies shadcn/ui Card requirement while matching established visual style.
- **EmptyState enhancement backward-compatible**: existing callers pass emoji icons (ignore text color) or Lucide icons (get stone color + teal glow). mesh-hero bg + fade-in apply to all EmptyState instances app-wide.

## Verification

- `bun run lint`: 0 errors, 0 warnings.
- `bunx tsc --noEmit` (excluding skills/ and examples/): 0 errors in app code.
- Dev server log: successful compilation after file creation (`✓ Compiled in 204ms / 466ms`). Earlier transient "Module not found" errors were from the brief window between editing page.tsx and creating the section file — resolved once file existed.

## Cross-module data flow

The Aktivitas section is a read-only aggregate view — it surfaces events created in other modules:
- **Toko** → Orders, Payments, Leads, Campaigns (createdAt / sentAt)
- **Konten** → Content (createdAt)
- **Riset** → Research (createdAt)
- **Keuangan** → Transactions (date)
- **Pengaturan** → Goals (createdAt)

Clicking any timeline item navigates back to the source module via `setSection(TYPE_STYLE[type].section)`. This gives UMKM owners a single chronological feed of everything happening across their brand without jumping between 6 modules.
