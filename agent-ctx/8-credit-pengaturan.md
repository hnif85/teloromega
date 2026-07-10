# Task ID: 8 — Credit + Pengaturan modules

**Agent**: full-stack-developer (Credit + Pengaturan)
**Date**: 2025-07-10
**Scope**: Build the Credit (balance, top-up packages, usage history, rate info) and Pengaturan (Brand CRUD, Profil, Tone of Voice, Notifikasi) sections of The Next Whiz.

## Files Created / Modified

### Created
- `src/app/api/user/route.ts` — PATCH endpoint to update current user's `name` and/or `toneOfVoice`. Uses `getUserId(req)` from `@/lib/auth`. Validates toneOfVoice against TONES list, trims name to 100 chars. Returns the updated user (id, name, email, creditBalance, toneOfVoice).

### Overwritten
- `src/sections/nw/credit-section.tsx` — Full "use client" CreditSection.
- `src/sections/nw/pengaturan-section.tsx` — Full "use client" PengaturanSection.

## Key Decisions

1. **Animated count-up**: implemented a small custom `useCountUp` hook using `requestAnimationFrame` + easeOutCubic — no extra dependency. Animates balance from previous value to new value across ~900ms.

2. **Top-up log differentiation**: The `/api/credit/topup` route stores top-ups as `status: "charged"` with `referenceId: "topup_{pkg}_{ts}"` and `actionKey: "toko.campaign_wa"` (a dummy hack noted in the existing route). I detect top-up entries via `referenceId.startsWith("topup_")` and render them as `+N` (green, "Top Up" badge) instead of the misleading `-N` (red). Added a 4th filter option (`topup`) for cleaner UX alongside the spec's `all/charged/refunded`.

3. **Per-tone example snippets**: Added a static `TONE_EXAMPLES: Record<ToneKey, string>` map with sample caption text per tone (Keripik Pedas scenario) so the Tone of Voice tab shows a concrete preview of how each tone sounds, not just labels.

4. **User store update without modifying store.ts**: The spec forbade editing `lib/store.ts`, but no `updateUser` action exists for the Profile tab's name edit. I used `useAppStore.setState((st) => st.user ? { user: { ...st.user, name: r.user.name } } : {})` to update the user object directly — a valid Zustand pattern.

5. **Notifikasi persistence**: Mock toggle switches persisted to `localStorage` under `nw_notif_settings_v1`. Hydrates on mount via useEffect. Wrapped the setState calls in `eslint-disable react-hooks/set-state-in-effect` since this is a one-shot external-store sync (legitimate hydration pattern).

6. **Slug preview**: Real-time slug preview using `slugify()` from constants during typing in both the Add Brand dialog and the Edit Brand form.

7. **Brand delete**: No DELETE API exists; per spec, show a disabled "Coming soon" notice instead of a button.

8. **Color palette**: Used the established cream/teal palette (`bg-teal`, `text-teal-600`, `bg-teal-100`, `bg-cream-100`, `bg-cream-200`, `bg-cream-300`, `bg-orange-100`, `bg-emerald-100`, `bg-amber-100`, `bg-rose-100`, `bg-violet-100`, `bg-sky-100`) — no indigo/blue.

9. **Mobile responsive**: All grids use `grid-cols-1 sm:grid-cols-2 lg:grid-cols-X`. Tables wrapped in `overflow-x-auto` and max-height scroll containers for long lists.

## What was NOT modified
- `src/app/page.tsx`
- `src/lib/*` (constants, store, auth, api, db, etc.)
- `src/components/nw/*` (primitives, sidebar, topbar, onboarding)
- Other section files (beranda, riset, konten, toko, keuangan)
- Existing API routes

## Lint Result
- 0 errors in my files.
- 0 warnings in my files.
- 2 pre-existing warnings in `page.tsx` and `toko/store-preview.tsx` (other agents' code) — not my concern.
- TypeScript: 0 errors in my files (verified via `bunx tsc --noEmit | grep -E credit-section|pengaturan-section|api/user/route`).

## API endpoints consumed
- `GET /api/credit/balance` (existing)
- `POST /api/credit/topup` (existing) — used for "Beli" button
- `GET /api/credit/usage-log` (existing) — TanStack Query with 30s refetch
- `GET /api/credit/packages` (existing) — TanStack Query with 5min stale time
- `GET /api/brands` (existing — not consumed directly, brands come from store)
- `POST /api/brands` (existing) — used for "Tambah Brand"
- `PATCH /api/brands/[id]` (existing) — used for Edit Brand + Tone of Voice update
- `PATCH /api/user` (NEW — created in this task) — used for name update in Profil tab

## How to test (in Preview Panel)
1. App auto-boots with demo user "Ibu Ani" (47 credit balance) via `/api/init`.
2. Click "Credit" in secondary nav (bottom of sidebar) → see hero balance with count-up animation, package grid (Growth highlighted as "Populer"), and (initially empty) usage history.
3. Click "Beli" on any package → toast, balance updates in topbar, usage log refreshes with a "Top Up" entry.
4. Click "Pengaturan" → 4 tabs:
   - Brand: see active brand highlighted, edit form below, "Tambah Brand" dialog
   - Profil: edit name → saves via PATCH /api/user, store updates reactively
   - Tone of Voice: 6 cards with example snippets, click to change active brand's tone
   - Notifikasi: 5 toggles, persisted to localStorage
