# Task 15-B — Goals/Targets Tracking

**Agent**: full-stack-developer (Goals/Targets)
**Task ID**: 15-B
**Date**: 2026 buildout

## What was built

End-to-end goals/targets tracking feature for "The Next Whiz" UMKM platform.

### Schema (Prisma)
- Added `Goal` model to `prisma/schema.prisma` after `OperationalCost`, before `CreditRate`.
  - Fields: `id, brandId, userId, type, period, target, current, startDate, endDate, status, notes, createdAt, updatedAt`
  - Indexes: `@@index([brandId])`, `@@index([status])`
  - Relations: `brand Brand @relation(...)`, `user User @relation(...)`, both with `onDelete: Cascade`.
- Added `goals Goal[]` to both `User` and `Brand` models.
- Ran `bun run db:push` (auto-runs `prisma generate`). Schema in sync.

### API routes (`src/app/api/goals/`)
1. **`route.ts`** — `GET ?brandId=X&status=active|all` lists goals for the active brand, with computed `progress` percentage (capped at 100, rounded to 1 decimal). `POST` creates a new goal with auto-computed date range based on `period` (`monthly` = current month, `quarterly` = current calendar quarter, `yearly` = current year). Validates `type` against `GOAL_TYPES` and `period` against `GOAL_PERIODS`. Brand ownership verified. Exports type + status enums for reuse.
2. **`[id]/route.ts`** — `PATCH` updates a goal (target, endDate, status, notes). Allows pausing/resuming via `status: "paused"|"active"`. `DELETE` hard-deletes a goal. Ownership verified via `goal.userId`.
3. **`refresh/route.ts`** — `POST { brandId }` recomputes `current` for all `active` + `paused` goals of the brand, using these formulas:
   - `revenue` → `_sum.amount` of income transactions in date range
   - `orders` → `count` of orders with `status != "Dibatalkan"` in range
   - `products` → `count` of active products with `createdAt` in range
   - `customers` → `count` of new customers in range
   - `content` → `count` of content in range
   - `research` → `count` of `status: "completed"` research in range
   
   Auto-status transitions: if `current >= target` → `"achieved"`; if `now > endDate` and not achieved → `"failed"`; otherwise keep previous status (active stays active, paused stays paused). Returns the updated goals + `refreshedAt` timestamp.

### Beranda widget (`src/sections/nw/beranda-section.tsx`)
- Added `GoalsWidget` component (inline) showing active goals whose date range contains "today".
- Each goal shows: type icon + label, current/target (formatRupiahShort for revenue), teal progress bar with percentage, "Tercapai" badge if achieved.
- Empty state: "Belum ada target bulan ini. Set target untuk motivasi!" with "Buat Target" button → navigates to Pengaturan > Target tab.
- "Atur Target" link in card header → setSection("pengaturan").
- TanStack Query: `queryKey: ["goals", brandId, "active"]`, 30s staleTime.
- Widget rendered after the alerts row, before the cross-module info section.
- Added `Target` to lucide-react imports.

### Pengaturan > Target tab (`src/sections/nw/pengaturan-section.tsx`)
- Added 6th tab `target` with `<Target />` icon. PageHeader subtitle updated.
- New `TargetTab()` component (~565 lines) with:
  - Header: "Target Bisnis" + Refresh button (POST /api/goals/refresh, disabled if no active goals) + "Buat Target" button.
  - Active + Paused goals rendered via `GoalCard` component.
  - Failed goals: compact rose-tinted list with delete buttons.
  - Achieved goals: Collapsible (collapsed by default), shows historical achievements with date range.
  - Create/Edit Dialog: 6 type selector cards (💰 Omzet, 🛒 Jumlah Order, 📦 Produk Baru, 👥 Customer Baru, 📝 Konten, 🔍 Riset) + 3 period selector (Bulanan/Kuartal/Tahunan) + auto-computed date range preview + target input (with Rp prefix for revenue type, formatRupiahShort live preview) + notes textarea. When editing, type & period are disabled (immutable after creation).
  - Delete confirmation via AlertDialog.
  - Empty state with "Buat Target Pertama" CTA.
- New `GoalCard` component: shows type emoji + label, period badge, status badge, current vs target (large formatRupiah for revenue), progress bar with percentage + days remaining countdown (or "Waktu habis" if overdue), Edit/Pause/Resume/Delete action buttons, notes italic blockquote.
- Status metadata: `active` (emerald "Aktif"), `achieved` (teal "Tercapai"), `failed` (rose "Gagal"), `paused` (amber "Pause").
- Mutations: create, update (target + notes), status (pause/resume), delete, refresh — all invalidate `["goals", brandId]` query.
- All copy in Indonesian. Mobile responsive throughout.
- Added imports: `useQuery` (TanStack), `Collapsible/CollapsibleContent/CollapsibleTrigger`, icons `Target, RefreshCw, Pause, Play, Calendar, Clock, ChevronDown, TrendingUp`, constants `formatRupiah, formatRupiahShort`.

## Important decisions
1. **Auto-compute date range from period**: `monthly` = current calendar month, `quarterly` = current calendar quarter, `yearly` = current calendar year. Server-side in POST handler. UI shows a live preview.
2. **Type & period immutable on edit**: editing only allows changing `target`, `notes`. Changing `type` or `period` mid-stream would distort progress comparison, so the UI disables those selectors when `editingGoal` is set.
3. **`shape()` helper** computes `progress` percentage server-side so the frontend never has to derive it. Returns 1-decimal precision capped at 100.
4. **Refresh endpoint sets auto-status**: `achieved` when `current >= target`, `failed` when `now > endDate` and not achieved. This means a `paused` goal that hits its target will be moved to `achieved` on next refresh (intentional — you can't pause success).
5. **Beranda widget filters by date range overlap**: even if status=active, only goals whose `startDate <= now <= endDate` are shown — this avoids showing quarterly/yearly goals as "Bulan Ini" when they happen to be active.
6. **Insights integration skipped** per task constraints: "Do NOT modify ... other section files (except beranda-section.tsx and pengaturan-section.tsx for wiring)" — insights-section.tsx is off limits. The Beranda widget + Pengaturan tab cover the user-facing goals UX.

## Files created
- `src/app/api/goals/route.ts` (GET list + POST create)
- `src/app/api/goals/[id]/route.ts` (PATCH update + DELETE)
- `src/app/api/goals/refresh/route.ts` (POST recompute `current`)

## Files modified
- `prisma/schema.prisma` — added `Goal` model + `goals Goal[]` relations on `User` and `Brand`. Pushed to DB.
- `src/sections/nw/beranda-section.tsx` — added `GoalsWidget` component, placed after alerts row.
- `src/sections/nw/pengaturan-section.tsx` — added `TargetTab()` + `GoalCard()` components, 6th `target` tab trigger/content, expanded imports.

## Lint / TS status
- `bun run lint`: 0 errors, 0 warnings.
- `bunx tsc --noEmit`: 0 errors in project files (only pre-existing errors in `examples/` and `skills/`).
- Dev server runtime: `db.goal.findMany` initially failed because the long-lived PrismaClient instance held the old schema in memory. Regenerated via `bunx prisma generate` — new requests will use the refreshed client on next dev-server restart.

## What downstream agents should know
- Goal API base path: `/api/goals`. Use `?brandId=X&status=active|all` for list.
- Refresh endpoint is `/api/goals/refresh` (POST `{ brandId }`) — recompute is *manual* (no scheduler); trigger on user click or after a relevant mutation (e.g., after creating a new transaction, order, product, customer, content, or research).
- Goal shape returned by API:
  ```ts
  {
    id, brandId, userId, type, period,
    target: number, current: number,
    startDate: string, endDate: string, // ISO
    status: "active"|"achieved"|"failed"|"paused",
    notes: string | null,
    progress: number, // 0-100, 1 decimal
    createdAt: string, updatedAt: string
  }
  ```
- `GoalType` union is exported from `/api/goals/route.ts`: `"revenue" | "orders" | "products" | "customers" | "content" | "research"`.
- Status color map (for badges):
  - `active` → emerald "Aktif"
  - `achieved` → teal "Tercapai"
  - `failed` → rose "Gagal"
  - `paused` → amber "Pause"
