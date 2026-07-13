# Changelog — usahaku.ai

> Semua perubahan yang signifikan terhadap project ini akan dicatat dalam file ini.
>
> Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) — `Added`, `Changed`, `Fixed`, `Removed`.
> Versi: [Semantic Versioning](https://semver.org/) — `MAJOR.MINOR.PATCH`.

---

## [0.16.0] — 2026-07-13

### ✨ Added
- add customer identification dialog to storefront



## [0.15.1] — 2026-07-13

### 🐛 Fixed
- remove auto-open customer identification dialog on Toko page



## [0.15.0] — 2026-07-13

### ✨ Added
- add shipping support fields to database



## [0.14.0] — 2026-07-13

### ✨ Added
- integrate RajaOngkir shipping API



## [0.13.1] — 2026-07-13

### 📝 Documentation
- add RajaOngkir API documentation



## [0.13.0] — 2026-07-13

### ✨ Added
- mobile navigation + dashboard simplification + customer identification



## [0.12.0] — 2026-07-12

### ✨ Added
- auto-detect stuck research jobs, merge active jobs into list, polling every 10s



## [0.11.1] — 2026-07-12

### 🐛 Fixed
- dark mode — bg-white→bg-card, missing dark gradient variants, onboarding riset-first



## [0.11.0] — 2026-07-12

### ✨ Added
- mobile accordion for Riset results, hide sidebar on mobile, auto-expand new result



## [0.10.2] — 2026-07-12

### ♻️ Refactored
- light sidebar theme, inline account menu, CSS variable text colors



## [0.10.1] — 2026-07-12

### ♻️ Refactored
- Beranda redesign — stat tiles with sparklines, insight panel, clean layout



## [0.10.0] — 2026-07-12

### ✨ Added
- public order lookup — /t/[slug]/cek — customer checks orders by phone



## [0.9.1] — 2026-07-12

### ⚡ Performance
- optimize AI context token size (10 products, 3 orders, 50 char desc)



## [0.9.0] — 2026-07-12

### ✨ Added
- intent detection on chat messages + auto lead stage update



## [0.8.0] — 2026-07-12

### ✨ Added
- split Toko & AI Chat sections, add customer order context to AI



## [0.7.0] — 2026-07-12

### ✨ Added
- public store commerce flow + AI payment verification



## [0.6.2] — 2026-07-12



## [0.6.1] — 2026-07-12

### 🐛 Fixed
- auto-generate query from brand data instead of suggestion chip; update year 2025→2026


## [0.7.0] — 2026-07-12

### ✨ Added
- image-to-image generation — product photo dikirim sebagai reference ke AI module (endpoint `/images/generation/reference` + `ref_task=ip`) agar hasil generate sesuai bentuk/warna produk
- quick add produk — "+ Tambah" button di FilterBar konten, langsung buka dialog input produk tanpa perlu ke halaman Produk
- dismissible AI insights CTA — tombol close pada "Ringkasan Bisnis dari AI" card, state disimpan di localStorage
- `supabaseAdmin` client — server-only Supabase client pakai service_role key untuk storage ops

### 🎨 Changed
- Beranda: hapus decorative blobs, gradient, mesh-hero, DashboardHero, tip-of-day, brand badges, quick stats; bersihkan imports
- Topbar: greeting "Halo, Nama" di sebelah kiri, hapus duplikasi dari kanan
- Konten detail view: layout desktop jadi `flex-row` (gambar kiri, caption+edit kanan) — no scroll; mobile tetap stack
- Konten composer: dari centered overlay dialog jadi inline expand di bawah textarea
- Target audience: ganti Select dropdown jadi chip buttons + free text input
- Riset: perbaiki alignment layout tabel hasil riset
- Image di detail view: pake `max-h-[70vh] object-contain` biar pas tidak kepotong

### 🐛 Fixed
- generateImage() sekarang parse `b64_json` dengan benar dari response AI module
- `json.usage` path diperbaiki jadi `json.data.usage` (pre-existing bug)
- content route upload base64 image ke Supabase storage sebelum simpan assetUrl
- product image fallback: pake initials kalau image gagal load
- QuickProductDialog panggil `onProductCreated` untuk invalidate query produk
- Supabase bucket `product-images` di-set `public: true` via REST API
- Product `imageUrl` di-include dalam query content generation

## [0.6.0] — 2026-07-11

### ✨ Added
- hybrid research — first research forced basic_research (4-tab view + 3 contexts), subsequent use freeform agent (ContentBlock[] output); dynamic intent dispatch with HTML fallback for custom intents



## [0.5.0] — 2026-07-11

### ✨ Added
- LangChain agentic pipeline — DeepSeek + Tavily tool, agent decides search strategy autonomously



## [0.4.0] — 2026-07-11

### ✨ Added
- POC async pipeline with real Tavily web search + job queue + polling UI



## [0.3.0] — 2026-07-11

### ✨ Added
- quick-add transaction FAB + photo receipt upload

### 🐛 Fixed
- keuangan compact cards, remove pajak/tren charts, transaksi table→card, period selector grid



## [0.2.2] — 2026-07-11

### 🐛 Fixed
- add demo tab back to Pengaturan hub



## [0.2.1] — 2026-07-11



## [0.2.0] — 2026-07-11

### ✨ Added
- edit konten via PATCH, regenerate image/caption with AI, deduct credit



## [0.1.0] — 2026-07-11

### ✨ Added
- mobile redesign — bottom tab bar, trimmed nav, hidden texts
- upload button + thumbnail preview in product form
- safer image compression with graceful fallback
- client-side image compression for upload
- Supabase Storage for product images
- MWX AI image generation via AI module
- integrate MWX AI Module + prompt audit logging
- App Router navigation for all sections
- auth module, onboarding wizard, responsive tour, brand edit

### 🐛 Fixed
- add session hydration to dashboard layout, restore store types
- move supabase createClient inside function to avoid build error
- repair self-referencing declarations from replaceAll
- full null-safety for research result sub-objects
- null-safe market_trend access in riset ResearchView
- use supabase-js client instead of ssr for storage
- use JWT anon key for Supabase Storage REST API
- bypass Supabase client RLS — use raw REST API for uploads



## [0.2.0] — 2026-07-11 (Current Alpha)

### ✨ Added — Fitur Baru

**Auth & User Flow:**
- Login/logout flow dengan auto-login demo user (Ibu Ani)
- `LoginScreen` component dengan preview 6 fitur utama
- `UserMenu` dropdown di sidebar (Pengaturan, Bantuan, Logout)
- "Coba Onboarding dari Awal" — reset brand & ulangi onboarding

**Dashboard (Beranda):**
- `DashboardHero` — hero section dengan gradient mesh-hero, sapaan personal, badge brand, quick stats, CTA buttons
- Tip of the Day widget (5 tips dalam Bahasa Indonesia, rotasi harian)
- Decorative emoji cluster dengan float animation (📊🔍📝🛒💰📅)
- `GoalsWidget` — progress bar target bulanan (4 card di dashboard)
- 7 stat cards menjadi clickable (navigasi ke section sumber)

**Produk:**
- Full CRUD module (`produk-section.tsx`, ~770 lines)
- StatCards: Total Produk, Barang, Jasa, Total Nilai Stok
- Filter tabs (Semua/Barang/Jasa) + search (nama/SKU)
- Product grid cards dengan type badge, margin info, stock status (Aman/Menipis/Kritis/Habis)
- Add/Edit Dialog dengan TypeCard picker (Barang vs Jasa) + live margin preview
- Bulk select mode + bulk delete dengan AlertDialog konfirmasi
- CSV export (12 kolom)
- Low stock amber banner → link ke Toko
- `ProductDetailDialog` — sales history, stock movement timeline, related content

**Insights & Analytics:**
- `InsightsSection` (~830 lines) — analytics dashboard
- AI Business Summary (LLM + template fallback, 3 credit)
- Custom SVG HealthGauge dengan threshold warna (merah/amber/hijau)
- 6 chart types: Revenue Trend (AreaChart), Top Products (BarChart), Customer Growth (LineChart), Lead Funnel (custom div), Content by Type (PieChart donut), Sales by Day (BarChart)
- 4 Advanced Analytics tabs: **CLV** (Customer Lifetime Value, top 10, distribusi), **Cohort** (retention heatmap M0-M6), **Seasonal** (12-month, day-of-week, hour-of-day), **Produk** (BCG matrix: Star/Cash Cow/Question Mark/Dog, scatter chart)

**Riset (SmartWhiz):**
- Full research pipeline: web search → LLM classify → LLM synthesize → save
- Auto-generate 3 contexts (konten, toko, keuangan) per research — GRATIS (0 credit)
- Result view: 4 tabs (Pasar/Audiens/Kompetitor & SWOT/Konten & Harga)
- Recharts BarChart + keyword cloud
- Sticky CTA bar (Simpan/Bikin Konten/Atur Toko/Proyeksi Keuangan)
- Comprehensive fallback result dari web search snippets saat LLM unavailable

**Konten (CreateWhiz):**
- 4 content types: Caption (2 cr), Gambar (4 cr), Video Script (6 cr), Carousel (5 cr)
- Content library dengan saved items
- Fallback generators (template-based) saat AI token unavailable
- Integrasi Context — pre-filled angle/tone/platform dari hasil riset

**Toko (SalesWhiz):**
- 6 sub-tabs: Inbox, AI Chat, Leads, Orders (merged Pembayaran+Pengiriman), Stok, Campaigns
- `CustomerDetailDialog` — order history, transactions, campaigns received, receivables
- `InvoiceDialog` + `InvoicePrint` — printable A4 invoice dengan brand identity
- Leads Kanban dengan @dnd-kit drag & drop + DragOverlay
- Auto-lead from inbound chat, auto-customer on Deal
- Stock decrement/restore on order create/cancel
- Income auto-created at Payment = "Diterima" (HPP auto dari cost_price)
- CSV export: Orders (15 kolom), Leads (9 kolom)
- Bulk payment verify ("Terima Semua")

**Keuangan (FinanceWhiz):**
- 5 sub-tabs: Ringkasan (P&L + charts), Transaksi, Piutang & Hutang, Biaya Operasional, Proyeksi
- ComposedChart 6-month trend, PieChart expense breakdown, cash flow
- Tax estimate: PPh Final 0.5% UMKM + PPN 11%
- CSV export: Transaksi (10 kolom)
- Auto-HPP: costAmount = product.costPrice × qty
- Mark-as-paid auto-creates income/expense transactions

**Kalender:**
- Monthly calendar grid (7×6, Senin-Minggu) + mobile list view
- 5 event types dengan color-coded chips: Order (teal), Payment (emerald/amber), Campaign (violet), Receivable (orange), Payable (rose)
- Day Detail Dialog dengan semua event pada tanggal tersebut
- Upcoming events sidebar (7 hari ke depan)

**Notifikasi:**
- Prisma `Notification` model + 4 API routes (CRUD + generate + read-all)
- Notifikasi section (3 tabs: Semua, Belum Dibaca, Preferensi)
- Topbar bell dropdown (persistent + derived notifications)
- Auto-generate dari dashboard data (low stock, pending payments, stale leads, achieved goals)
- Dedup system: skip jika type+referenceId yang sama sudah UNREAD

**Credit System:**
- 11 credit rates across 4 modules
- 4 credit packages: Starter (50cr/Rp 49k), Growth (120cr/Rp 99k), Pro (300cr/Rp 249k), Scale (800cr/Rp 599k)
- Usage history dengan filter + search
- Rate info cards grouped by module

**Pengaturan:**
- 7 tabs: Brand, Profil, Tone of Voice, Notifikasi, Target, Backup, Data Demo
- Brand CRUD + soft-delete (last brand protection)
- Goals/Targets tracking — 6 goal types (💰🛒📦👥📝🔍), 3 periods (monthly/quarterly/yearly), progress bars
- Goals auto-refresh dari data aktual (revenue/orders/products/customers/content/research)
- Export/Import data backup (JSON, merge strategy, cross-brand migration)
- Demo data seeding/reset (4 produk, 5 leads, 6 orders, 4 payments, 6 transactions, 1 research + 3 contexts)
- Tour Berpanduan button

**Bantuan:**
- FAQ accordion (10 questions dalam Bahasa Indonesia)
- Keyboard shortcuts grid (⌘K, Esc, ←/→, Tab, Enter)
- Contact section (email/WA/docs links)
- About card dengan tech stack info

**Aktivitas:**
- Unified timeline dari 8 models (Order, Payment, Lead, Content, Research, Transaction, Campaign, Goal)
- Filter by type + Load More
- 4 StatCards: Total, Hari Ini, Minggu Ini, Bulan Ini
- Date-grouped timeline ("Hari Ini"/"Kemarin"/tanggal Indonesian)
- Clickable items → navigasi ke section terkait

**Global Search:**
- Cmd+F/Ctrl+F shortcut (override browser find)
- 6 models: Products, Orders, Customers, Leads, Transactions, Content
- Scoring: exact=100, starts-with=80, contains=60, other-field=40
- Grouped results dengan sticky headers per tipe + keyboard nav (↑↓ Enter Esc)
- Recent searches (localStorage)

**Command Palette (⌘K):**
- 3 groups: Navigasi (7 sections), Aksi Cepat (Tambah Produk, Mulai Riset, Generate Konten, Top Up, Buat Brand), Brand
- Recent commands (localStorage, last 5)

**PWA:**
- `manifest.json` — standalone display, teal theme (#0D9488), 3 icons (SVG + 192 + 512 PNG)
- Service Worker (`sw.js`) — route-aware caching: network-first (API), cache-first (static/fonts), offline shell fallback
- `OfflineIndicator` — banner + sonner toast saat offline/online
- Apple Web App capable + touch icon

**Demo Data:**
- `POST /api/demo/seed` — idempotent (DEMO- SKU marker), realistic Indonesian data (4 produk, 5 leads, 2 customers, 6 orders, 4 payments, 6 transactions, 3 content, 3 inbox, 1 research + 3 contexts, 1 campaign)
- `POST /api/demo/reset` — FK-safe deletion (preserves brand)
- UI di Pengaturan > Data Demo

**Styling & UX:**
- Dark mode (next-themes, toggle di topbar + sidebar)
- Framer-motion section transitions (fade + slide, 0.25s ease-out)
- Animated number counters (requestAnimationFrame + easeOutCubic)
- Card hover effects: `.card-hover`, `.card-shimmer`
- Gradient text, glass morphism, toast slide-in, pulse glow, gradient border
- Smooth scroll (`html { scroll-behavior: smooth }`)
- Focus-visible: teal ring (keyboard only)
- Selection color: teal tint
- Skeleton loading (6+ variants)
- Empty states (4+ variants, enhanced dengan mesh-hero glow)

**Onboarding:**
- 8-step guided tour dengan spotlight effect (4 dark divs + teal border highlight)
- Keyboard navigation (Esc=skip, ←/→=prev/next)
- Auto-start on first visit (localStorage, 5s delay)
- Manual restart dari Pengaturan > Profil

**Export/Import:**
- JSON backup: 19 models exported, userId stripped, pretty-printed, Content-Disposition header
- JSON import: merge strategy (skip by name/phone), FK remapping via Map, full transaction rollback
- Cross-brand migration support
- UI di Pengaturan > Backup tab dengan data count preview

### 🔧 Changed — Perubahan

- **App rename:** "The Next Whiz" → "usahaku.ai" (19+ source files + manifest)
- **Sidebar:** SECONDARY_NAV dipindahkan ke User dropdown (Profile menu), hanya 7 primary nav items
- **Brand selector:** dipindahkan ke bagian atas sidebar (setelah logo)
- **Kalender:** dihapus dari sidebar nav
- **Toko simplified:** Orders + Pembayaran + Pengiriman → 1 tab "Orders" (total 6 tabs, was 8)
- **Topbar:** ⌘K command button + ⌘F search button + ThemeToggle + Notifications bell
- **Auth:** cookie-based (`nw_user_id` httpOnly) — belum SSO mwxmarket.ai
- **Dashboard:** StatCard primitive enhanced (AnimatedNumber + card-hover + card-shimmer + clickable wrapper)

### 🐛 Fixed — Bug Fixes

- **LLM API 401:** Semua AI features (Riset, Konten, AI Chat, Projections, Insights) sekarang punya intelligent template fallback. Kredit tidak hangus saat LLM gagal.
- **TypeScript errors:** 16 TS errors di `_pipeline.ts` — `Record<string, unknown>` → nested property fixed
- **401 after logout:** TanStack Query cache di-clear saat `isLoggedIn` jadi false
- **Goals dialog reactivity:** `getActiveBrand(getState())` → `useAppStore()` hook
- **`react-hooks/set-state-in-effect`:** Semua instance (notification preferences, offline indicator, command palette) di-refactor ke lazy `useState` initializer
- **Invoice print CSS:** Radix Dialog neutralization rules ditambahkan agar `.invoice-print` absolute positioning bekerja dengan benar di print context
- **Toast import conflict:** 3 files migrated dari sonner ke shadcn toast pattern

### ⚠️ Known Limitations

- **LLM API token** (`z-ai-web-dev-sdk` X-Token) tidak tersedia di sandbox environment. Semua fitur AI menggunakan intelligent template fallback yang menghasilkan output valid dan kontekstual.
- **Product image upload** — URL-only atau SVG placeholder, belum ada file upload ke storage.
- **WhatsApp Integration** — Campaigns via WA simulated (belum WhatsApp Business API).
- **Multi-user collaboration** — belum diimplementasikan.
- **Supabase utils** — 3 files di `src/utils/supabase/` sebagian unused (mwxmarket SSO target belum terhubung).
- **Middleware route protection** — belum ada `middleware.ts` (planned for Beta v0.3.x).

---

## [0.1.1] — 2026-07-10 (Logic Flow Final)

### ✨ Added

- Logic flow v0.1.1 (924 lines) — alur lengkap step-by-step: Brand → Produk → Riset → Context Engine → Konten/Toko/Keuangan
- 13 perubahan besar dari v3.0 (sebelumnya aplikasi terpisah):
  - `subscription_tier` dihapus — gating berbasis saldo credit
  - Context auto-generate saat riset selesai (3 sekaligus)
  - Context bersifat reusable (event log, bukan consumable)
  - Tabel baru `shared.content` — konten hasil generate disimpan
  - Tabel baru `shared.customers` — pelanggan sebagai entitas terpusat
  - Field `cost_price` di produk → margin otomatis
  - Satu sumber stok: `products.stock`
  - Income diakui saat Payment = "Diterima"
  - Campaign via WhatsApp broadcast
  - Slug brand auto-suffix kalau bentrok
  - Order jasa tanpa shipping/resi
  - Aturan credit: mwxmarket = otoritatif, lokal = cache + idempotency
  - Query riset pre-fill dari produk

### 📝 Documentation

- `LOGIC_FLOW_v0.1.1.md` — 924 lines, referensi utama developer
- `POC_Context.md` — 207 lines, konteks POC awal
- `NEXT_WHIZ_STARTUP_PLAN.md` — 237 lines, ICP, competitive landscape, 90-day roadmap
- `PROJECT_RESUME.md` — 190 lines, high-level overview
- `AI_LAYER.md` — 641 lines, 6 AI touch points, credit costs, risk matrix
- `DEVELOPMENT_PLAN.md` — 589 lines, version roadmap Alpha→Beta→Pre-Prod→Production
- `GTM_PLAN.md` — 243 lines, go-to-market strategy
- Wireframes: 4 HTML files (dashboard, onboarding, riset pertama + mobile)

---

## [0.0.0] — Sebelumnya (Apps Terpisah)

### Legacy — Aplikasi MWX Lama

- **SmartWhiz** — Riset pasar mandiri
- **CreateWhiz** — Generate konten mandiri
- **SalesWhiz** — Manajemen toko mandiri
- **FinanceWhiz** — Akuntansi UMKM mandiri

Semua aplikasi terpisah, login berbeda, data tidak terhubung. Digantikan oleh usahaku.ai (The Next Whiz).

---

## Cara Update Changelog

Setiap kali ada perubahan signifikan (feature, bug fix, breaking change), tambahkan entry di bagian atas dengan format:

```markdown
## [X.Y.Z] — YYYY-MM-DD

### ✨ Added
- Fitur baru yang ditambahkan

### 🔧 Changed
- Perubahan pada fitur existing

### 🐛 Fixed
- Bug yang diperbaiki

### 🗑️ Removed
- Fitur yang dihapus

### ⚠️ Known Issues
- Isu yang diketahui
```

Lihat file `.github/hooks/CHANGELOG_TEMPLATE.md` untuk panduan lengkap.

**Proses Auto-Update via Git Hook:**
1. Developer menulis deskripsi perubahan di commit message dengan prefix konvensional:
   - `feat:` → ✨ Added
   - `fix:` → 🐛 Fixed
   - `change:` → 🔧 Changed
   - `remove:` → 🗑️ Removed
   - `docs:` → 📝 Documentation
   - `chore:` → 🛠 Maintenance
2. Pre-push hook otomatis mengekstrak commit messages sejak tag terakhir
3. Hook menambahkan entry baru di `CHANGELOG.md` dengan versi yang di-bump otomatis
4. Jika tidak ada tag, semua commit sejak awal project dimasukkan

**Untuk release maintainer:** Setelah fitur besar selesai, buat git tag sesuai versi:
```bash
git tag -a v0.3.0 -m "Beta release — usahaku.ai v0.3.0"
git push origin v0.3.0
```
