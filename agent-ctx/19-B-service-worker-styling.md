# Task 19-B — Service Worker + Styling Polish

**Agent**: full-stack-developer (Service Worker + Styling)
**Task**: Add service worker for offline PWA caching, offline indicator banner, toast animations, card shimmer effect, gradient border, pulse glow, smooth scroll, selection color.

## Files Created

1. `public/sw.js` (~190 lines) — vanilla service worker:
   - `install` event: precaches app shell (`/`, `/manifest.json`, `/icon.svg`, `/icon-192.png`, `/icon-512.png`) into `nextwhiz-v1` cache. Uses `cache.addAll` for atomicity. Calls `self.skipWaiting()`.
   - `activate` event: deletes any cache whose name doesn't match `nextwhiz-v1`. Calls `self.clients.claim()`.
   - `fetch` event — route-aware stale-while-revalidate:
     - **GET-only** (mutations pass through)
     - **Same-origin only** (cross-origin requests bypass SW)
     - **API (`/api/*`)** → network-first (fresh data when online, cache fallback when offline). Only 200s cached.
     - **Navigations (HTML)** → cache-first with background refresh; offline + cache miss falls back to cached `/` app shell.
     - **Fonts (`destination === "font"`)** → cache-first, long-lived.
     - **Static assets (style/script/image/empty destination)** → cache-first. Next.js hashed filenames make this safe.
   - `message` event: handles `"SKIP_WAITING"` for future "new version available" flow.

2. `src/components/nw/sw-register.tsx` — `"use client"` component. Registers `/sw.js` only in `process.env.NODE_ENV === "production"` (avoids dev server chunk-caching conflicts). Errors swallowed (non-fatal). Renders `null`.

3. `src/components/nw/offline-indicator.tsx` — `"use client"` component:
   - `useState` lazy initializer reads `navigator.onLine` (guarded for SSR).
   - `useEffect` subscribes to `window` `"offline"`/`"online"` events.
   - Offline → `AnimatePresence` renders a fixed bottom-center banner (rose→amber gradient, WifiOff icon, "Mode offline — perubahan disimpan lokal, sync saat online kembali") with spring slide-up entrance.
   - Online → `toast.success("🟢 Kembali online!", { description: "Sinkronisasi data aktif kembali." })` from sonner + banner exits (slide-down).
   - `role="status"` + `aria-live="polite"` for screen readers.

## Files Edited

4. `src/app/layout.tsx` — added `import { SWRegister } from "@/components/nw/sw-register";`. Mounted `<SWRegister />` inside `<body>` after `</ThemeProvider>` (so it renders once at root, after theme/query providers).

5. `src/app/page.tsx` — added `import { OfflineIndicator } from "@/components/nw/offline-indicator";`. Rendered `<OfflineIndicator />` inside the logged-in return block (after `<CommandPalette />`). Only mounted when `isLoggedIn` is true (the `!isLoggedIn` early-return shows `<LoginScreen />` first), satisfying "only when logged in, not on login screen".

6. `src/app/globals.css` — appended Task 19-B section with:
   - `@keyframes toast-slide-in` + `.toast-slide-in` utility (translateX 120% → 0, opacity 0 → 1, 0.3s cubic-bezier).
   - `.card-shimmer` + `::before` pseudo (gradient sweep, left -100% → 100% on hover, 0.6s ease, pointer-events none).
   - `@keyframes pulse-glow` + `.pulse-glow` utility (teal box-shadow ring expand, 2s infinite).
   - `.gradient-border` utility (mask-composite trick for teal→orange gradient border on `var(--card)` bg).
   - `html { scroll-behavior: smooth; }` for in-page nav.
   - `:focus-visible { outline: 2px solid #0D9488; outline-offset: 2px; }` for keyboard users.
   - `::selection { background: rgba(13, 148, 136, 0.2); color: #171412; }` for teal-tinted text selection.

7. `src/components/nw/primitives.tsx` — added `card-shimmer` class to `StatCard` root div (now `card-hover card-shimmer rounded-2xl ...`). Stat cards get both the lift effect and the shimmer sweep on hover.

## Decisions

- **SW registered in production only**: dev server recompiles chunks on every change; a caching SW would serve stale code and break HMR. The `process.env.NODE_ENV === "production"` gate (evaluated at build time) means the register call is tree-shaken in dev — no `navigator.serviceWorker.register` ever fires.
- **SW mounted outside `ThemeProvider`**: keeps the registration orthogonal to theme/query state. The component renders `null` so it doesn't affect layout.
- **Vanilla SW (no workbox)**: spec required vanilla Cache Storage + Fetch APIs. Routing logic lives in three small helpers (`cacheFirst`, `navigationHandler`, `networkFirst`) for readability.
- **`cache.addAll` for app shell**: atomic — if any of the 5 precache URLs fails (e.g. icon missing), install fails and the SW stays in waiting state. Safer than per-URL `cache.put` which would silently leave the cache half-populated.
- **API requests network-first**: data freshness is critical for an inventory/finance app. Cache is only a fallback when offline, never the primary source. Non-200 responses are NOT cached (don't want to serve a 500 from cache later).
- **Cross-origin bypass**: Next.js fonts come from Google Fonts CDN; caching them would require opaque-response handling. Letting them pass through keeps the SW simple. The browser HTTP cache already handles them well.
- **Offline indicator uses lazy `useState` initializer**: avoids the `react-hooks/set-state-in-effect` lint error (cascading renders) that the original synchronous `setIsOffline` in the effect body would trigger. The component only mounts after hydration (gated behind `isLoggedIn`), so `navigator` is guaranteed available — no SSR mismatch.
- **`AnimatePresence` for banner**: needed for a clean exit animation (slide-down + fade). CSS-only can't do unmount animations without manual transition-state plumbing.
- **`card-shimmer` on StatCard only (not SectionCard)**: per spec ("add card-shimmer class to StatCard root div"). StatCards are the small KPI tiles that benefit most from the premium hover affordance; SectionCards are larger containers where the sweep would feel busy.
- **`card-shimmer` `::before` uses teal gradient at 8% opacity**: subtle enough to read as "premium sheen" not "glitchy overlay". The 0.6s ease timing matches `.card-hover`'s 0.2s lift — combined, the hover feels layered (lift first, shimmer follows).
- **`focus-visible` (not `focus`)**: only shows the teal ring for keyboard navigation, not mouse clicks. Matches shadcn/ui's a11y convention.
- **`::selection` uses rgba teal at 20%**: subtle teal tint on selected text — reinforces brand without obscuring readability. `color: #171412` (ink) keeps text legible on the tinted bg.

## Verification

- `bun run lint` → 0 errors, 0 warnings.
- `bunx tsc --noEmit` (excluding skills/ + examples/) → 0 errors.
- Dev server log: HTTP 200 responses continue (no compile errors after edits).
- The service worker itself only activates in production builds; in dev (`NODE_ENV === "development"`), `SWRegister` no-ops, so the dev server's HMR is unaffected.

## Reusable Patterns

- **Vanilla SW route-aware fetch**: split by `request.mode` (navigate), `request.destination` (font/style/script/image), and URL prefix (`/api/`). Three helpers: `cacheFirst`, `navigationHandler` (cache-first + bg refresh + offline shell fallback), `networkFirst` (API).
- **Lazy `useState` initializer for browser-only state**: when a `"use client"` component reads `navigator`/`window` for its initial state, use `useState(() => typeof navigator !== "undefined" ? ... : default)` instead of `useState(default)` + `useEffect` setState sync. Avoids the `set-state-in-effect` lint error and the cascading render it warns about.
- **`AnimatePresence` for fixed-position banners**: mount/unmount with entrance+exit animations. Pattern: `key` prop on the motion child + `initial`/`animate`/`exit` variants.
- **Sonner toast from a non-UI event handler**: `import { toast } from "sonner"` works anywhere in client code, including `window` event listeners. No need to thread a callback prop.
