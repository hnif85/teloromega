# Task ID: 14-B — Onboarding Tour + Print Invoice

**Agent**: full-stack-developer (Onboarding Tour + Print Invoice)
**Date**: 2025-07-10

## Task
Build an 8-step guided onboarding tour with spotlight effect (highlights key UI sections on first visit + manual restart from Pengaturan) and a print invoice / struk penjualan feature with A4 layout (triggered from Orders tab, supports Cetak / Simpan PDF via `window.print()`).

## Files Created

### `src/components/nw/onboarding-tour.tsx` (~560 lines)
- "use client" component, exports `OnboardingTour` (mounted in page.tsx) and `startTour()` (called from Pengaturan > Profil button — mirrors `openCommandPalette()` pattern from command-palette.tsx).
- 8 steps with Indonesian copy: Welcome (modal) → Sidebar nav → Brand switcher → Credit → Command palette → Notifications → Theme toggle → Get started (modal).
- **Spotlight effect**: 4 fixed-position dark divs (`bg-black/50`) forming a rectangular hole around the target element + teal border highlight with subtle box-shadow ring.
- **Tooltip positioning**: Below the target if its midpoint is in the top half of viewport, above otherwise. Centered horizontally, clamped to viewport. CSS triangle arrow pointing at the target.
- **Framer Motion**: AnimatePresence for prompt/overlay fade, motion.div with `initial/animate` (scale + fade + y-offset) for tooltip and modal entrances.
- **Auto-start on first visit**: After hydration + 5s delay, checks `localStorage["nw_tour_completed"]`; if not set, shows a bottom-right prompt card with "Mulai Tour" / "Nanti saja" buttons.
- **Manual start**: Listens for `nw:start-tour` CustomEvent (dispatched by `startTour()`).
- **State management**: `step` (0-7 or null), `showPrompt` boolean, internal `tick` counter for re-renders on scroll/resize.
- **Rect computation**: Done during render (read-only DOM access via `document.querySelector` + `getBoundingClientRect()`) to avoid the React `setState-in-effect` anti-pattern. A `tick` counter is bumped by resize/scroll/interval listeners to trigger re-renders that pick up fresh rect coordinates.
- **Keyboard nav**: Esc = skip/finish, ← = previous, → = next.
- **Completion**: Writes `localStorage["nw_tour_completed"] = "true"` on finish/skip, closes overlay.
- **Polish**: Progress dots at the bottom of each tooltip, step counter badge (e.g. "3 / 8"), Lewati (skip) link in tooltip variant, X button in modal variant.
- **Fallback**: If target element not found (e.g. mobile where some topbar elements are hidden), renders a full-screen dark overlay with centered modal card instead of spotlight — prevents the tour from breaking on small screens.

### `src/sections/nw/toko/invoice-print.tsx` (~400 lines)
- "use client" component, renders A4-sized (210mm × 297mm) printable invoice with inline styles (survives the @media print visibility toggling).
- **Layout**: Header (brand name + "INVOICE" + # + date) → From/To (brand info + customer info) → Items table (No, Nama Produk, Qty, Harga, Subtotal with teal header row) → Summary (Subtotal, Ongkir, Total in large bold teal) → Payment info (teal-tinted card with method, status, amount, total paid + remaining balance) → Order meta (kurir, resi, status, notes) → Footer ("Terima kasih sudah berbelanja di [brand]! 🙏" + brand slug `tokoku.nextwhiz.id/[slug]` + auto-generated doc note).
- **Brand/customer resolution**: Takes `brand: { name, slug, description, category } | null` and `customer: { name, phone } | null` as props. Walk-in customer fallback when both null.
- **Items parsing**: `JSON.parse(order.items)` with try/catch fallback to `[]`.
- **Payment calculations**: `totalPaid = sum of payments where status === "Diterima"`, `hasUnpaidBalance = totalPaid < total`. Shows "Sisa Pembayaran" in red when applicable.
- **Printability**: Black text on white background, teal accents only for headers/total/brand name. All colors are explicit hex (`#0D9488`, `#171412`, etc.) — no Tailwind class color references (which would resolve to CSS vars that might not be set in print context).

### `src/sections/nw/toko/invoice-dialog.tsx` (~110 lines)
- "use client" Dialog wrapper.
- Resolves brand from `useAppStore.brands` via `order.brandId` (falls back to `activeBrandId`).
- Resolves customer from `order.customer` (or `order.lead` if customer null, or "Walk-in Customer" if both null).
- **Layout**: Sticky header (title + order # + customer name), scrollable gray-backed preview area (max-width 210mm shadow card containing `<InvoicePrint />`), sticky footer with "Tutup" + "Cetak / Simpan PDF" buttons.
- **Print trigger**: `onClick={() => window.print()}` — relies on the @media print CSS in globals.css to hide everything except `.invoice-print`.
- **Disabled state**: "Cetak / Simpan PDF" disabled when `order` is null (defensive).

## Files Edited (minimal attribute/wiring additions only)

### `src/components/nw/sidebar.tsx`
- Added `data-tour="sidebar-nav"` to the primary `<nav>` element (the one wrapping NAV_ITEMS + SECONDARY_NAV + brand switcher dropdown).
- Added `data-tour="brand-switcher"` to the brand DropdownMenuTrigger `<button>` (so the spotlight highlights just the button, not the entire dropdown menu container).

### `src/components/nw/topbar.tsx`
- Added `data-tour="command-palette"` to the ⌘K outline Button.
- Wrapped `<ThemeToggle />` in a `<div data-tour="theme-toggle">` wrapper (since ThemeToggle renders its own Button and we can't easily add a data attribute to a third-party component prop without modifying it).
- Added `data-tour="notifications"` to the bell DropdownMenuTrigger Button.
- Added `data-tour="credit-button"` to the credit outline Button (with the Zap icon + credit balance).

### `src/app/page.tsx`
- Imported `OnboardingTour` from `@/components/nw/onboarding-tour`.
- Mounted `<OnboardingTour />` immediately after the conditional `<OnboardingDialog />` and before `<CommandPalette />`.

### `src/sections/nw/pengaturan-section.tsx`
- Imported `startTour` from `@/components/nw/onboarding-tour`.
- Added a new `<SectionCard title="Tour Berpanduan">` to the `ProfilTab` function (after the "Coming soon" card, before the closing `</div>`). Card contains: 🎯 icon, "Mulai Tour Berpanduan" title, helper text "8 langkah singkat · ± 1 menit · bisa dilewati kapan saja", and a teal "Mulai Tour" button with Sparkles icon that calls `startTour()`.

### `src/sections/nw/toko/orders-tab.tsx`
- Imported `Printer` from lucide-react.
- Imported `InvoiceDialog` from `@/sections/nw/toko/invoice-dialog`.
- Added two state vars: `invoiceOrder: OrderRow | null`, `invoiceOpen: boolean`.
- Added a "Invoice" outline button (with Printer icon) as the FIRST button in the order action cell — available for orders in any status (per spec). The button sets `invoiceOrder` and opens the dialog.
- Added `<InvoiceDialog order={invoiceOrder} open={invoiceOpen} onOpenChange={setInvoiceOpen} />` at the bottom of the component (sibling to the existing create-order Dialog).

### `src/app/globals.css`
- Added a new `@media print { ... }` block at the end of the file (~40 lines).
- Core rules: `body * { visibility: hidden }` (hide everything), `.invoice-print, .invoice-print * { visibility: visible }` (show invoice subtree), `.invoice-print { position: absolute; left: 0; top: 0; width: 100%; padding: 20mm; ... }` (reposition invoice at page top-left with 20mm safe margin), `@page { margin: 0 }` (remove browser print margins).
- **Critical addition** (beyond spec's CSS): neutralize the Radix Dialog portal positioning (`[data-slot="dialog-content"], [data-slot="dialog-portal"], [data-slot="dialog-overlay"]`) by forcing `position: static !important; transform: none !important; inset: auto !important; ...` in print mode. Without this, the `.invoice-print`'s `position: absolute` would be relative to the dialog's fixed+translated containing block (since fixed elements create containing blocks for absolute descendants), causing the invoice to render offset from the page corner. Also hides the dialog overlay (`display: none !important`) so it doesn't darken the printed page.

## Decisions

### Spotlight approach: 4 dark divs vs SVG mask vs box-shadow
- Chose 4 dark divs (top/bottom/left/right strips around the target rect) over the alternatives:
  - **SVG mask with rect hole**: Cleaner conceptually but harder to animate transitions between steps; SVG masks don't transition smoothly between rect positions.
  - **Single div with `box-shadow: 0 0 0 9999px rgba(0,0,0,0.5)`**: Simplest, but the giant box-shadow can cause performance issues on low-end devices and doesn't allow per-edge click-blocking (clicks anywhere on the shadow still hit the same div).
  - **4 dark divs**: Allows independent pointer-events handling on each strip, smooth CSS transitions on each div's position (top/left/width/height), and easy to reason about. Chosen.

### Rect computation: render-time vs effect-time
- Initial implementation stored rect in state and updated via `setRect()` inside a `useEffect` with resize/scroll listeners. This triggered the `react-hooks/set-state-in-effect` lint error.
- Refactored to compute rect during render (read-only `document.querySelector().getBoundingClientRect()`), with a separate `tick` state bumped by event listeners to trigger re-renders. This avoids the anti-pattern entirely and is cleaner code. The tick counter is modded by 1_000_000 to prevent integer overflow on long sessions.

### Mobile fallback for spotlight steps
- On small screens, the topbar's ⌘K button (`hidden sm:flex`) and notifications bell are still visible, but if any target element is hidden via responsive classes, the spotlight would have nothing to highlight. The fallback renders a centered modal card over a full dark overlay instead, preventing the tour from breaking on mobile. (All current targets are visible at all breakpoints, so this is defensive.)

### Invoice data-tour / brand resolution
- The invoice needs brand info (name, slug, description, category). The OrdersTab doesn't have brand info directly — only `brandId`. Resolution path: `useAppStore.brands.find(b => b.id === order.brandId)` (with active-brand fallback). This avoids a new API call and stays consistent with the rest of the app (which uses the same store-side brand cache).

### Customer resolution for invoice
- `order.customer?.name ?? order.lead?.name ?? "Walk-in Customer"`. The Order schema allows both customerId and leadId to be null (walk-in scenario). When lead exists but customer doesn't, use lead's name/phone.

### Print CSS: position: absolute vs fixed
- Spec specifies `position: absolute` (not `fixed`). `position: fixed` in print mode renders the element on every printed page (bad for multi-page invoices). `position: absolute` (relative to the initial containing block = page) flows naturally across pages. The catch: Radix Dialog uses `position: fixed` + `translate(-50%, -50%)` for centering, which creates a containing block for absolute descendants. The neutralization rules (`[data-slot="dialog-content"] { position: static !important; ... }`) revert this so the invoice's absolute positioning is relative to the page.

### Invoice inline styles vs Tailwind classes
- Used inline styles (explicit hex colors, mm units, table cell styles) instead of Tailwind classes for the InvoicePrint component. Reason: Tailwind classes resolve to CSS variables (`var(--teal)`, `var(--ink)`, etc.) which depend on a `:root`/`.dark` ancestor. Inside a Radix Dialog portal rendered into `document.body`, those vars are still set, so it would work in theory — but for print output, the explicit hex values guarantee identical rendering regardless of theme/print context. The 20mm padding also can't be expressed cleanly in Tailwind (no `p-[20mm]` utility by default).

### Print button placement: order action cell
- Added the "Invoice" button as the FIRST action button (before "Proses"/"Selesai"/"Batal" status buttons) so it's always visible regardless of order status. Per spec: "The button should be available for orders in any status."

### Skip-on-prompt behavior
- "Nanti saja" button on the first-visit prompt also writes `localStorage["nw_tour_completed"] = "true"` (same as finishing the tour). This means the prompt won't re-appear on the next visit — users who dismiss it have explicitly opted out. The Pengaturan > Profil "Mulai Tour" button still works regardless of localStorage state (the `startTour()` event bypasses the prompt).

## Test Results

### Lint
- `bun run lint`: 0 errors, 0 warnings ✓

### TypeScript
- `bunx tsc --noEmit`: 0 errors in app code ✓

### Dev server
- Dev server compiled successfully (`✓ Compiled in 219ms`) after the file edits. GET `/api/init` returns 200. No compile errors in dev.log.

## Files Touched
- Created: `src/components/nw/onboarding-tour.tsx`, `src/sections/nw/toko/invoice-print.tsx`, `src/sections/nw/toko/invoice-dialog.tsx`, `agent-ctx/14-B-onboarding-tour-print-invoice.md`
- Edited: `src/components/nw/sidebar.tsx`, `src/components/nw/topbar.tsx`, `src/app/page.tsx`, `src/sections/nw/pengaturan-section.tsx`, `src/sections/nw/toko/orders-tab.tsx`, `src/app/globals.css`
