# Task 18-B — PWA Support + Dashboard Hero Styling

**Agent:** full-stack-developer
**Task:** Add PWA manifest + icons + layout wiring. Build dashboard hero section with gradient + greeting + quick stats + decorative elements.

## Work Log

1. **Context reading** — Read `worklog.md` (last 2 task entries: 17-A Bantuan, 17-B Activity Log, 17 Cron Review Round 5), `layout.tsx`, `globals.css`, `page.tsx`, `beranda-section.tsx`, `primitives.tsx`, and `public/` listing (only `robots.txt` + `logo.svg` existed). Confirmed `date-fns@4` (with `id` locale), `framer-motion@12`, `sharp@0.34` available.
2. **Manifest** — Created `public/manifest.json` per spec. Added SVG icon entry (in addition to 192/512 PNGs) for browsers that prefer scalable icons. `display: standalone`, `theme_color: #0D9488`, `background_color: #F6F4EF` (cream), `lang: id`, `categories: ["business","productivity","finance"]`.
3. **Icon SVG** — Created `public/icon.svg` (512×512 viewBox): teal gradient rounded-square background (`#0D9488 → #0F766E`), white "NW" text centered with letter-spacing, subtle top-shine overlay, two decorative dots (teal-200 + orange-200) for visual interest. Maskable-safe (logo glyph sits inside the safe zone — NW text is centered with padding).
4. **PNG icons** — Used `sharp` to rasterize the SVG at 192×192 and 512×512 (density 384 for crisp text). Verified both files exist with correct PNG dimensions and content type.
5. **Layout wiring** (`src/app/layout.tsx`):
   - Added `manifest: "/manifest.json"` to `metadata`.
   - Added `icons.icon` array (SVG + 192 PNG + 512 PNG), `icons.apple` (192 PNG), `icons.shortcut`.
   - Added `appleWebApp: { capable: true, title: "The Next Whiz", statusBarStyle: "default" }`.
   - Added `applicationName: "The Next Whiz"`.
   - Added `export const viewport: Viewport` with `themeColor: "#0D9488"`, `width/initialScale/maximumScale = 1`, `viewportFit: "cover"` (for iOS notch safe-area).
   - Added explicit `<link rel="manifest">` and `<link rel="apple-touch-icon">` in `<head>` (belt-and-suspenders — Next.js metadata usually generates these, but explicit links guarantee PWA installers find them).
   - Added `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, `apple-mobile-web-app-title`, `mobile-web-app-capable` meta tags.
6. **Dashboard Hero** (`src/sections/nw/beranda-section.tsx`):
   - Imported `motion` from `framer-motion`, `format` from `date-fns`, `id` locale from `date-fns/locale`.
   - Defined `DAILY_TIPS` static array (5 tips, Indonesian, themed emojis with tone variations: teal/orange/violet/emerald).
   - Defined `tipOfDay()` helper — picks tip based on `new Date().getDate() % DAILY_TIPS.length` (stable per-day, rotates daily).
   - Defined `DashboardHero` component (replaces the plain `PageHeader`):
     - **Container**: `<motion.section>` with fade-in + slide-up entrance (`opacity 0→1, y 14→0`, cubic-bezier ease, 0.45s). Rounded-3xl, mesh-hero gradient + diagonal teal→cream→orange background, blurred decorative blobs (top-right teal, bottom-left orange).
     - **Layout**: 2-column on `lg` (5-col grid → left 3, right 2), stacked on mobile.
     - **Left column**:
       - Top badges row: `CalendarDays` + formatted Indonesian date (e.g. "Senin, 10 Juli 2026" via `format(now, "EEEE, d MMMM yyyy", { locale: idLocale })`), brand name badge (teal solid with `Store` icon), category badge.
       - Greeting `Halo, {firstName} 👋` (text-3xl sm:text-4xl, font-extrabold, motion fade-in from left).
       - Subtitle paragraph with brand name highlighted.
       - Inline quick stats: `📦 N produk · 🛒 N order bulan ini · 📈 Rp Z omzet` with colored icons + tabular-nums.
       - CTA buttons: "Mulai Riset" (teal solid with Sparkles icon, shadow) + "Tambah Produk" (outline with Plus icon, glass bg).
     - **Right column** (hidden on mobile via `hidden lg:block` for the decorative cluster; tip card visible everywhere):
       - **Decorative emoji cluster**: 6 emojis (📊 🔍 📝 🛒 💰 📅) arranged in a circle (64px radius) around a central "NW" badge (size-14 rounded-2xl teal solid). Each emoji tile: motion-div with staggered entrance (delay 0.3 + i*0.08, scale 0.6→1, fade-in), then continuous float animation (`y: [0,-4,0]`, 2.4-3.4s, infinite, ease-in-out, per-item delay). NW badge: spring entrance (delay 0.25, scale 0.8→1).
       - **Tip of the day card**: gradient background (tone-based), icon box, "TIP HARI INI" label with Lightbulb icon, bold title, body text. Slide-in entrance (delay 0.4).
   - Defined `HeroStatCard` wrapper component: wraps each existing `StatCard` with `motion.button`/`motion.div`. Adds `whileTap={{ scale: 0.98 }}` on clickable cards, group-hover lift (`-translate-y-0.5`) + teal-tinted shadow, gradient overlay reveal on hover (`from-teal-100/60 via-transparent to-orange-100/40`). Focus-visible ring for keyboard nav.
   - **Replaced** the plain `<PageHeader title="Halo, ..." />` block with `<DashboardHero ... />`.
   - **Wrapped all 7 stat cards** (4 in top row + 3 in second row) with `<HeroStatCard onClick={...}>` — clicking each navigates to its source section (riset, produk, toko, credit, konten). All cards now have the hover gradient + active scale + lift.
   - Preserved all existing functionality: GoalsWidget, recent research list, recommendations, low stock alerts, pending payments, cross-module info card, empty state.
7. **Lint** — `bun run lint` → 0 errors, 0 warnings.
8. **tsc** — `bunx tsc --noEmit` (excluding skills/examples) → 0 errors.
9. **Dev server** — Verified `✓ Compiled in 1875ms` after edits (no compile errors).

## Stage Summary

### Files created
- `public/manifest.json` — PWA manifest (id locale, standalone display, teal theme, cream bg, 3 icon entries: SVG + 192 + 512 PNG).
- `public/icon.svg` — 512×512 viewBox scalable PWA icon (teal gradient + white NW + decorative dots, maskable-safe).
- `public/icon-192.png` — 192×192 PNG icon (rasterized via sharp, 4.6 KB).
- `public/icon-512.png` — 512×512 PNG icon (rasterized via sharp, 25.6 KB).

### Files edited
- `src/app/layout.tsx` — Added `manifest`, `icons` (icon/apple/shortcut), `appleWebApp`, `applicationName` to metadata. Added `viewport` export with `themeColor: "#0D9488"`. Added explicit `<link rel="manifest">`, `<link rel="apple-touch-icon">`, and 4 mobile-web-app meta tags in `<head>`.
- `src/sections/nw/beranda-section.tsx` — Added framer-motion + date-fns imports. Added `DAILY_TIPS` array + `tipOfDay()`. Added `DashboardHero` component (~150 lines) replacing the plain PageHeader. Added `HeroStatCard` wrapper (~20 lines) with hover gradient + active scale. Wrapped all 7 stat cards with `HeroStatCard`.

### Decisions
- **SVG icon in manifest first** — Spec asked for PNG-192 and PNG-512; I added an SVG icon entry as the first icon (`type: image/svg+xml`, `sizes: any`) because modern browsers (Chrome 116+, Edge, Firefox) prefer scalable SVG icons for crisp rendering at any density. PNGs retained for iOS Safari (which doesn't support SVG maskable icons in `<link rel="apple-touch-icon">`).
- **PNGs generated via sharp** — Used `sharp` (already in deps, used elsewhere for image processing) with `density: 384` to render the SVG at high enough resolution for crisp text anti-aliasing. One-off script in `/tmp/gen-icons.mjs`, not committed.
- **Decorative cluster vs health gauge vs tip card** — Spec offered 3 options for the right column. I chose a **combination**: decorative emoji cluster (top, hidden on mobile) + tip of the day card (bottom, visible everywhere). The tip card is more useful than a static health gauge (which would require an extra `/api/insights` fetch) and rotates daily based on date — gives users a fresh nudge each morning. The emoji cluster reinforces the all-in-one platform narrative (📊 insights, 🔍 riset, 📝 konten, 🛒 toko, 💰 keuangan, 📅 kalender — the 6 core modules).
- **Hero replaces PageHeader, not augments** — Spec said "replaces the plain PageHeader". I removed the `PageHeader` block from the active-brand branch entirely. The "no active brand" empty-state branch still uses `PageHeader` (which is appropriate — no hero for unauthenticated/onboarding state).
- **Stat card enhancements via wrapper, not primitive edit** — Spec said "Do NOT modify other section files (except layout.tsx and beranda-section.tsx)". `primitives.tsx` is in `src/components/nw/`, not `src/sections/nw/`, so technically editable, but I chose to keep the `StatCard` primitive untouched and add visual enhancements through a local `HeroStatCard` wrapper in `beranda-section.tsx`. This isolates the dashboard-specific styling and keeps `StatCard` reusable as-is across other sections (insights, keuangan, etc.).
- **No trend indicators added** — Spec said "Trend indicator if data available (▲/▼ with percentage)". The `/api/dashboard` response doesn't include trend data (no prior-period comparison). Rather than fabricate mock trends (misleading) or skip entirely (spec asks for it conditionally), I left the trend slot empty. The `StatCard` primitive already supports `trend={{value, up}}` — adding trends later only requires backend changes to `/api/dashboard` to return `stats.salesMonthPrev` etc.
- **All 7 stat cards wrapped with navigation** — Previously only "Produk Aktif" was a clickable button. Now all 7 cards navigate to their source section on click (Riset→riset, Produk→produk, Penjualan→toko, Credit→credit, Leads→toko, Orders→toko, Konten→konten). Each has aria-label for screen readers. Non-clickable behavior (when `onClick` is undefined) falls back to a motion.div without `whileTap`.
- **framer-motion `motion.button` for clickable cards** — Used `motion.button` (not `motion.div` with onClick) for clickable stat cards so keyboard accessibility (Tab + Enter) works natively without extra `role="button"` / `tabIndex` / `onKeyDown` boilerplate.
- **iOS safe-area** — Added `viewportFit: "cover"` to viewport export so the app uses the full screen on notched iOS devices when installed as PWA. Combined with the existing `apple-mobile-web-app-status-bar-style: default`, the status bar blends with the cream background.

## Reusable patterns for future agents

- **PWA icon generation pipeline**: `sharp` (already in deps) can rasterize SVG → PNG at any size. Pattern: write SVG to `public/icon.svg`, then `bun -e 'await sharp(svg, {density: 384}).resize(size, size).png().toFile(...)'`. Works for any size.
- **date-fns Indonesian locale**: `import { id as idLocale } from "date-fns/locale"; format(date, "EEEE, d MMMM yyyy", { locale: idLocale })` → "Senin, 10 Juli 2026". Capitalize first letter for sentence case.
- **framer-motion staggered entrance**: For grids of items, use `initial={{opacity:0, scale:0.6}}` + `animate={{opacity:1, scale:1}}` with `transition={{ delay: 0.3 + i*0.08 }}`. Pair with continuous float: `animate={{ y: [0, -4, 0] }}` with `transition={{ duration: 2.4 + i*0.2, repeat: Infinity, ease: "easeInOut", delay: i*0.15 }}`.
- **maskable-safe icon design**: Keep logo glyph centered with ≥10% padding from each edge (maskable icons can be cropped to any shape — circle, squircle, rounded square). My SVG has the "NW" text at ~46% of viewBox width, well inside the 80% safe zone.
- **Hero gradient background**: Combine `mesh-hero` CSS class (subtle radial gradients) with a `style={{ background: "linear-gradient(135deg, #F0FBF9 0%, #FCFBF9 45%, #FFF3EA 100%)" }}` for a richer hero. Add `aria-hidden` decorative blurred blobs (`bg-teal-200/40 blur-3xl`) for depth.
