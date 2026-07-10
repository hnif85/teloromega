# Task 12-B — Styling polish, brand soft-delete, new features

**Agent**: full-stack-developer (Styling + Brand Delete + Features)
**Date**: continuation of The Next Whiz MVP build
**Scope**: visual polish (animations, micro-interactions), brand DELETE API + UI wiring, framer-motion section transitions, Cmd+K command palette, notifications bell dropdown, animated number counters.

## Work log

1. **Read project state** — `worklog.md`, `globals.css`, `primitives.tsx`, `topbar.tsx`, `page.tsx`, `beranda-section.tsx`, `pengaturan-section.tsx`, `api/brands/[id]/route.ts`, `prisma/schema.prisma`, `api/dashboard/route.ts`, `command.tsx`, `dropdown-menu.tsx`, `alert-dialog.tsx`, `store.ts`, `api.ts`, `constants.ts`, `onboarding.tsx`, `dev.log`. Confirmed `framer-motion ^12.23.2` already in `package.json`, `Brand.isActive` field exists in schema (soft-delete ready), `setSession` in store is the only way to replace the brands array in one shot (no `removeBrand` action — and `store.ts` was outside my allowed-to-modify list).

2. **A. Brand soft-delete API** (`src/app/api/brands/[id]/route.ts`) — added `DELETE` handler alongside the existing `PATCH`. Verifies ownership, refuses to delete the user's last active brand (returns 400 with friendly message), otherwise sets `isActive=false`. No schema change needed since `Brand.isActive` already exists.

3. **B. Wire brand delete in Pengaturan UI** (`src/sections/nw/pengaturan-section.tsx`) — replaced the "Hapus brand belum tersedia" placeholder note with a real "Danger zone" panel inside the edit-brand card. Added `AlertDialog` imports. Button is `variant="destructive"` (rose), disabled when only one brand remains. Confirm dialog text matches spec exactly: "Yakin hapus [brand name]? Brand akan diarsipkan bersama semua data terkait (produk, riset, konten, transaksi). Aksi ini tidak bisa dibatalkan." On confirm → `DELETE /api/brands/[id]` → on success removes the brand from the Zustand store by calling `setSession({user, brands: filtered, activeBrandId})`. If the deleted brand was active, switches to the first remaining brand. Toast feedback on success + failure (API's "last brand" error is surfaced verbatim via the existing `api()` helper that throws with the server's `error` field).

4. **C. Global styling polish** (`src/app/globals.css`) — appended utility classes after the existing `.live-dot` block: `.card-hover` (+ `:hover` state with teal-tinted shadow lift), `.fade-in`, `.slide-in-right`, `.scale-in` keyframed entrances, `.gradient-text` (teal gradient text clip), `.glass` (cream translucent + blur, with `.dark .glass` variant), `.skeleton-shimmer` (re-export of `.shimmer` so callers can use either name). Verified existing scrollbar styling still in place.

5. **D. Framer-motion section transitions** — created `src/components/nw/section-transition.tsx` exporting `SectionTransition` (motion.div with `initial/animate/exit` opacity+y, 0.25s ease-out). The `key={sectionKey}` prop forces re-mount on section change, triggering the enter animation. Wired into `src/app/page.tsx` by wrapping the section switch in `<SectionTransition sectionKey={section}>`.

6. **E. Cmd+K command palette** — created `src/components/nw/command-palette.tsx`. Uses shadcn `CommandDialog` (built on cmdk). Listens for `Cmd+K` / `Ctrl+K` to toggle. Groups: **Terakhir** (recent commands, last 5, persisted to `localStorage` under `nw:recent-commands`), **Navigasi** (7 sections), **Aksi Cepat** (Tambah Produk, Mulai Riset, Generate Konten, Top Up Credit, Buat Brand Baru — the last one opens `OnboardingDialog` via `setOnboardingOpen(true)`), **Brand** (lists all brands; active brand is disabled with "Aktif" badge; clicking switches via `setActiveBrand`). Exports `openCommandPalette()` that dispatches a `CustomEvent` so the topbar's ⌘K badge can open it imperatively without plumbing new state through the global store.

7. **F. Notifications bell dropdown** (`src/components/nw/topbar.tsx`) — replaced the simple bell button with a `DropdownMenu`. Fetches `/api/dashboard` via TanStack Query (same `["dashboard", activeBrand.id]` queryKey as `BerandaSection` so the request is deduped). Derives notifications on the fly: low-stock products (📦), pending payments (💳), stale leads from recommendations where source==="leads" (👥), most-recent research (🔍). Bell badge count = total non-dismissed notifications; caps display at "9+". "Tandai semua dibaca" pushes all current notification IDs into a local `dismissed` Set so the badge drops to 0 until a refetch surfaces a new item. Each item has icon + title + time-ago and navigates to the relevant section via `setSection`. Empty state: "Tidak ada notifikasi baru 🎉". Footer: "Lihat semua" button (closes dropdown — no dedicated notifications view).

8. **G. Animated number counter** — created `src/components/nw/animated-number.tsx` exporting `AnimatedNumber`. Counts up from 0 to `value` over `duration` ms using `requestAnimationFrame` + easeOutCubic. Optional `format` prop renders via `toLocaleString("id-ID")`. Cleanup cancels the RAF on unmount.

9. **H. Wire AnimatedNumber + card-hover into primitives** (`src/components/nw/primitives.tsx`) — `StatCard` now detects when `value` is a `number` and wraps it in `<AnimatedNumber>`. Non-numeric values (formatted strings like "Rp 1.2jt", or "…" while loading) pass through unchanged — backward compatible, no caller edits required. Added `card-hover` class to both `StatCard` and `SectionCard` root divs (replacing the previous `hover:border-teal/30 transition-colors` on StatCard).

10. **Also wired into `page.tsx`** — imported `SectionTransition` + `CommandPalette`, wrapped section switch in `<SectionTransition sectionKey={section}>`, and mounted `<CommandPalette />` after the OnboardingDialog.

11. **Topbar cleanup** — removed unused `X` (lucide-react) and `CREDIT_PACKAGES` (constants) imports that were in the previous topbar. Added `useQuery` from `@tanstack/react-query`, `timeAgo` from constants, `Command` from lucide-react, and the `openCommandPalette` helper from the command-palette module.

12. **Lint fix** — initial `bun run lint` flagged one error: `react-hooks/set-state-in-effect` on the `setRecent(loadRecent())` call inside `CommandPalette`'s mount effect. Fixed by switching to a lazy `useState` initializer: `useState<RecentCommand[]>(() => loadRecent())`. No effect needed. Lint now clean (0 errors, 0 warnings).

## Stage Summary

### Files created
- `src/components/nw/animated-number.tsx`
- `src/components/nw/section-transition.tsx`
- `src/components/nw/command-palette.tsx`

### Files edited
- `src/app/api/brands/[id]/route.ts` — added `DELETE` handler (soft-delete with last-brand guard)
- `src/sections/nw/pengaturan-section.tsx` — AlertDialog confirm flow + `confirmDelete()` + `setSession`-based store update; added AlertDialog imports
- `src/app/globals.css` — appended `.card-hover`, `.fade-in`, `.slide-in-right`, `.scale-in`, `.gradient-text`, `.glass`, `.skeleton-shimmer` utilities
- `src/components/nw/primitives.tsx` — `StatCard` uses `AnimatedNumber` for numeric values; both `StatCard` & `SectionCard` get `card-hover` class
- `src/components/nw/topbar.tsx` — full rewrite: notifications `DropdownMenu` with dynamic badge count, ⌘K outline button that opens the palette, cleaned unused imports
- `src/app/page.tsx` — wrapped section switch in `<SectionTransition>`, mounted `<CommandPalette />`

### Decisions
- **No `store.ts` modification** — task scope explicitly listed allowed files (primitives, topbar, page.tsx, globals.css, pengaturan-section, new files under `src/components/nw/`). Brand deletion uses the existing `setSession` action to replace the brands array in one shot.
- **Imperative palette open via `CustomEvent`** — avoids polluting the global Zustand store with `commandPaletteOpen` state. The topbar dispatches `window.dispatchEvent(new CustomEvent("nw:open-command-palette"))` and `CommandPalette` listens for it.
- **Notifications are derived, not stored** — no DB notification table; we synthesize them on each dashboard refetch. "Tandai semua dibaca" uses a local in-memory Set for session-level dismissal. Stable IDs (per-product, per-recommendation, per-research) ensure dismissed items stay dismissed across refetches.
- **AnimatedNumber is opt-in via type** — `StatCard` only animates when `value` is a literal `number`. Callers that pass formatted strings (e.g. `formatRupiahShort`) are unaffected, so no section files needed editing.
- **TanStack Query dedupe** — topbar uses the same `["dashboard", activeBrand.id]` queryKey as `BerandaSection`, so the dashboard fetch is shared between both components.
- **Last-brand guard is double-layered** — UI button is disabled when `brands.length <= 1`, AND the API returns 400 if the user somehow bypasses the UI. Both messages are friendly and Indonesian.
