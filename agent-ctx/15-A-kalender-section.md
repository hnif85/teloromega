# Task 15-A — Kalender Section

> Subagent: full-stack-developer (Kalender Section)
> Parent task: 15 (UMKM calendar view)
> Started: after Task 14 (cron review round 3 — onboarding tour + print invoice).

## Objective

Build a new **Kalender** section for The Next Whiz that visualises upcoming orders, payment timestamps, campaign schedules, and receivable/payable due dates in a monthly grid. Helps UMKM owners plan their operations in one consolidated view.

## Reference material read (prior agent work)

- `worklog.md` — last 3 task entries (13-A Insights, 13-B DemoSeed, 14 main QA round).
- `src/lib/constants.ts` — `SectionKey`, `NAV_ITEMS`, `formatRupiah`, `formatRupiahShort`, `timeAgo`.
- `src/lib/store.ts` — `useAppStore`, `getActiveBrand` selector, `setSection`.
- `src/lib/api.ts` — typed `api<T>()` client.
- `src/lib/auth.ts` — `getUserId(req)` cookie-based auth.
- `src/components/nw/primitives.tsx` — `PageHeader`, `StatCard`, `SectionCard`, `EmptyState`.
- `src/sections/nw/beranda-section.tsx` — TanStack Query + `useAppStore` pattern, StatCard grid.
- `src/sections/nw/insights-section.tsx` — complex layout with charts, badges, parallel queries.
- `prisma/schema.prisma` — Order, Payment, Campaign, Receivable, Payable models.
- `src/app/api/insights/route.ts` — `Promise.all([...])` parallel query pattern, date-range filtering, response typing.

## Files created

1. **`src/app/api/kalender/route.ts`** (~298 lines)
   - `GET /api/kalender?brandId=X&month=1-12&year=YYYY`
   - Auth: `getUserId(req)` + brand ownership verify (`brand.userId === userId`).
   - Date range: `[first day of month 00:00:00.000, last day of month 23:59:59.999]`.
   - Parallel `Promise.all` queries across 5 models:
     - `Order.findMany({ where: { brandId, createdAt: { gte, lte } } })` → includes `customer.name`, `lead.name`.
     - `Payment.findMany({ where: { order: { brandId }, createdAt: { gte, lte } } })` → includes `order.id`, `order.customer.name`, `order.lead.name`.
     - `Campaign.findMany({ where: { brandId, OR: [{ scheduledAt: in range }, { sentAt: in range }] } })`.
     - `Receivable.findMany({ where: { brandId, dueDate: in range } })` — sorted by dueDate asc.
     - `Payable.findMany({ where: { brandId, dueDate: in range } })` — sorted by dueDate asc.
   - Builds event objects for each record:
     - Order: `title = "Order #${shortId} · ${customerName}"`, `description = "Order ${status} — Rp X · N item"`, `amount = totalAmount`.
     - Payment: `title = "Pembayaran Rp X · ${method}"`, `description = "${status} · ${customer} · Order #Y"`, `amount = amount`.
     - Campaign: `title = "Campaign: ${name}"`, `description = "Channel: WA · ${status}${subject ? ' · ' + subject : ''}"`. Date = scheduledAt OR sentAt (whichever falls in month).
     - Receivable: `title = "Piutang: ${customerName}"`, `description = "Jatuh tempo · Rp X · ${status}"`, `amount`.
     - Payable: `title = "Hutang: ${supplierName}"`, `description = "Jatuh tempo · Rp X · ${status}"`, `amount`.
   - Returns:
     ```ts
     { events: KalenderEvent[], stats: KalenderStats, month, year, monthLabel: "Januari 2026" }
     ```
   - Stats: totalOrders, totalPayments, totalCampaigns, totalReceivables, totalPayables, totalRevenue (sum of verified payments — status === "Diterima"), totalDue (receivables + payables amount sum).
   - Exports `KalenderResponse`, `KalenderEvent`, `KalenderStats`, `KalenderEventType` types so the client can import them.
   - Defensive: invalid month/year falls back to current month. No brandId → returns empty events + empty stats.

2. **`src/sections/nw/kalender-section.tsx`** (~955 lines — formatted with each prop on its own line for readability)
   - `"use client"` Next.js section component.
   - State: `cursor` Date (default to first of current month), `selectedDate` (Date | null) for Day Detail Dialog.
   - TanStack Query: `queryKey: ["kalender", activeBrand?.id, month, year]`, `staleTime: 30s`.
   - **PageHeader**: title "Kalender", icon 📅, subtitle "Pantau order, pembayaran, campaign, & jatuh tempo dalam satu tampilan". Actions: ‹ Prev button + month/year label (with "kembali ke bulan ini" link if not current month) + Next › + "Hari Ini" button (teal) + refresh Tooltip button.
   - **Stats row** (5 StatCards): Total Event, Order, Pembayaran, Jatuh Tempo (receivables+payables count), Pendapatan Bulan Ini (`formatRupiahShort(totalRevenue)`).
   - **Calendar grid** (SectionCard, `hidden sm:block` — desktop/tablet only):
     - Weekday header: Sen, Sel, Rab, Kam, Jum, Sab, Min (Indonesian day names, Monday-first).
     - 6-week grid (42 cells) using `startOfWeek(monthStart, { weekStartsOn: 1 })` to `endOfWeek(monthEnd, { weekStartsOn: 1 })` from date-fns.
     - Each cell: min-height 88px, date number top-left (today = filled teal circle), event count badge top-right, up to 3 event chips color-coded by type, "+N lainnya" if > 3 events.
     - Today cell highlighted: `bg-teal-50 border-teal-300 ring-1 ring-teal-200`.
     - In-month days: `bg-card border-border`. Outside-month days: dimmed `bg-cream-100/40`.
     - Click cell → opens Day Detail Dialog.
     - Click event chip (stopPropagation) → `setSection(TYPE_STYLE[type].section)` navigates to relevant module.
     - Cell keyboard accessible (Enter/Space opens dialog).
   - **Mobile list view** (SectionCard, `sm:hidden` — replaces grid on small screens):
     - Groups events by day, shows date chip + capitalized Indonesian weekday + events as buttons with icon + truncated title + amount.
     - More mobile-friendly than horizontal-scroll grid.
     - Click day header → opens Day Detail Dialog.
     - Has its own empty state.
   - **Day Detail Dialog** (`Dialog` from shadcn/ui):
     - Triggered when `selectedDate !== null`.
     - Title: capitalized `format(date, "EEEE, d MMMM yyyy", { locale: idLocale })` (Indonesian full weekday + date).
     - Body: scrollable list of all events for that date as colored cards — each with icon, title, description, type badge, status badge, overdue indicator (AlertCircle icon for receivable/payable with status "overdue"), amount in `formatRupiah`, ArrowRight affordance.
     - Click event → closes dialog + navigates to module.
     - Empty state inside dialog if no events for date.
   - **Upcoming events sidebar** (SectionCard, right column on lg+, below grid on smaller):
     - Filters events where `parseISO(ev.date)` falls within `[startOfDay(today), startOfDay(today + 7 days)]`.
     - Groups by day, shows date chip + "Hari ini" label or capitalized weekday + events.
     - ScrollArea max-h 640px.
     - Empty state: "Minggu depan kosong ☕".
   - **Legend** below grid: order (teal), payment Diterima (emerald), payment Menunggu (amber), campaign (violet), receivable (orange), payable (rose).
   - **Empty state** (desktop grid view only): if no events in month — friendly "Tidak ada event bulan ini 🗓️" with quick-action buttons (Buat Order → toko, Catat Piutang/Hutang → keuangan, Bulan Lalu → prev).
   - Color coding (TYPE_STYLE map):
     - Order = teal: `bg-teal-100 text-teal-700 border-teal-200`
     - Payment Diterima = emerald, Menunggu = amber, Ditolak = rose (chipStyleFor function overrides based on status)
     - Campaign = violet
     - Receivable = orange
     - Payable = rose
   - Navigation map: order→toko, payment→toko, campaign→toko, receivable→keuangan, payable→keuangan.
   - Uses date-fns v4: `addDays`, `addMonths`, `eachDayOfInterval`, `endOfMonth`, `endOfWeek`, `format`, `isSameMonth`, `isToday`, `parseISO`, `startOfDay`, `startOfMonth`, `startOfWeek`, `subMonths`. Locale: `import { id as idLocale } from "date-fns/locale"` for Indonesian month/weekday names.
   - Lucide icons: AlertCircle, ArrowRight, CalendarIcon, ChevronLeft, ChevronRight, Clock, CreditCard, Megaphone, Package, Receipt, RefreshCw, TrendingUp, Wallet.
   - shadcn/ui components: Button, Badge, Skeleton, Dialog + DialogHeader/Title/Description/Footer/Content, ScrollArea, Tooltip + TooltipTrigger/Content.
   - All copy in Indonesian.

## Files edited

1. **`src/lib/constants.ts`** (+2 lines)
   - Added `"kalender"` to `SectionKey` union type (after `"keuangan"`, before `"credit"`).
   - Added `{ key: "kalender", label: "Kalender", icon: "📅" }` to `NAV_ITEMS` array (after Keuangan, before the `SECONDARY_NAV` separator).

2. **`src/app/page.tsx`** (+2 lines)
   - Added import: `import { KalenderSection } from "@/sections/nw/kalender-section";`
   - Added render branch: `{section === "kalender" && <KalenderSection />}` (after keuangan, before credit).

## Decisions

1. **Two-view responsive design**: chose to render a proper 7×6 calendar grid on `sm+` screens and a grouped list view on mobile (`sm:hidden` / `hidden sm:block` toggle). Spec said "your choice — list view is more mobile-friendly", and a stacked list is dramatically better UX on phones than a horizontally-scrolled grid where each cell becomes ~50px wide. Both views share the same `events` array + `DayDetailDialog` so the experience is consistent.

2. **Week starts on Monday (Senin)**: matches Indonesian business convention. Used date-fns `startOfWeek(date, { weekStartsOn: 1 })` + `endOfWeek(date, { weekStartsOn: 1 })` to compute grid bounds. WEEKDAYS array = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].

3. **Campaign event date resolution**: Campaign has two optional date fields (`scheduledAt` for drafts/scheduled, `sentAt` for sent ones). The Prisma OR clause matches either field in range. In the event builder, picks the one that actually falls in the month (scheduledAt first, then sentAt). This means a campaign scheduled on Jan 31 and sent on Feb 1 will appear in BOTH Jan (as scheduled) and Feb (as sent) — which is correct behaviour for a planning calendar.

4. **Payment chip color depends on status**: `chipStyleFor(ev)` function returns:
   - Menunggu → amber (`bg-amber-100 text-amber-700`)
   - Ditolak → rose (`bg-rose-100 text-rose-700`)
   - Diterima (or anything else) → emerald (default payment color)
   This lets users visually triage pending payments from the calendar without opening the dialog.

5. **Stat row layout**: 5 StatCards (Total Event, Order, Pembayaran, Jatuh Tempo, Pendapatan Bulan Ini) on a 2-col mobile / 5-col desktop grid. "Jatuh Tempo" combines receivables + payables count for one quick "what's due this month" number. "Pendapatan" uses `formatRupiahShort` since verified payment totals can be large (Rp 5.2jt reads cleaner than the full number in a stat card).

6. **Day Detail Dialog opens by clicking day cell, not by clicking the "+N lainnya" text**: the spec said "+N lainnya" should open a popover/dialog showing all events, but I made the entire day cell clickable (cursor-pointer + Enter/Space keyboard support) which opens the dialog. This is more intuitive — users can click anywhere on a day to see its events, not just hunt for the tiny "+N lainnya" link. The "+N lainnya" text is still rendered as a visual indicator that more events exist.

7. **Upcoming events scope = next 7 days from today**: spec said "next 7 days of events sorted by date". I filter `parseISO(ev.date) ∈ [startOfDay(today), startOfDay(today+7)]` — this means if user is viewing last month's calendar, they still see real upcoming events in the sidebar (not just events in the current month view). More useful operationally. Empty state shows "Minggu depan kosong ☕" if nothing scheduled.

8. **Event chip click = navigate to module, NOT open detail**: spec said "Click an event chip → navigates to the relevant section". Implemented as `setSection(TYPE_STYLE[type].section)` — order/payment/campaign → toko, receivable/payable → keuangan. Clicking the day cell (parent) opens the dialog instead. Both interactions are intuitive and don't conflict (chip click uses `e.stopPropagation()`).

9. **No credit charge for calendar view**: reading calendar events is a free operation (data aggregation only, no LLM call). Consistent with other dashboard/list views.

10. **Indonesian locale via date-fns**: imported `id as idLocale` from `date-fns/locale` for proper Indonesian month names ("Januari", "Februari", ..., "Desember") and weekday names ("Senin", "Selasa", ..., "Minggu"). Used `format(date, "MMMM yyyy", { locale: idLocale })` and `format(date, "EEEE, d MMMM yyyy", { locale: idLocale })`. Verified `node_modules/date-fns/locale/id.d.ts` exists in date-fns v4.

11. **No new lib/* files**: per spec, only edited `constants.ts` (SectionKey + NAV_ITEMS) and `page.tsx` (route). All other code lives in `src/app/api/kalender/` and `src/sections/nw/kalender-section.tsx`.

12. **Pre-existing `/api/goals` 500 error noted**: dev.log shows `TypeError: Cannot read properties of undefined (reading 'findMany')` at `src/app/api/goals/route.ts:65` because `db.goal` doesn't exist (Goal model not in schema.prisma). This is a pre-existing issue from another task — NOT touched by this work (out of scope for 15-A).

## Test results

- **`bun run lint`**: 0 errors, 0 warnings (exit 0).
- **`bunx tsc --noEmit`**: 0 errors in `src/` (exit 2 overall, but all remaining errors are in `examples/websocket/` and `skills/*` which are out of scope per spec).
- **Dev server**: server was down at end of session (last dev.log entry at 22:09, agent-browser started at 21:59). Per spec `bun run dev` runs automatically — did not manually restart. Code compiles cleanly (tsc + eslint pass).
- Initial tsc error: `Cannot find name 'Receipt'` — accidentally removed the `Receipt` lucide import while removing unused `TrendingDown`/`isSameDay`. Re-added `Receipt` (it's used as the receivable type's icon). Re-verified: clean.

## Cross-module data flow

- **Order events** (created in Toko > Orders tab) → appear on calendar at order's `createdAt`. Click → goes back to Toko.
- **Payment events** (recorded in Toko > Orders tab when customer uploads proof) → appear at payment's `createdAt`. Click → goes to Toko.
- **Campaign events** (scheduled in Toko > Campaigns tab, sent via WA/Email broadcast) → appear at `scheduledAt` (planned) or `sentAt` (executed). Click → goes to Toko.
- **Receivable events** (recorded in Keuangan > Piutang/Hutang tab) → appear at `dueDate`. Click → goes to Keuangan.
- **Payable events** (recorded in Keuangan > Piutang/Hutang tab) → appear at `dueDate`. Click → goes to Keuangan.

All 5 source models surface in a single calendar grid — UMKM owner gets a 30-day operational view without jumping between 4 modules.
