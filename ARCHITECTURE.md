# 🏗️ ARCHITECTURE.md — usahaku.ai

> **Developer Onboarding Guide** — Semua yang perlu kamu tahu untuk mulai ngoding di codebase ini.
>
> **Terakhir diupdate:** 2026-07-11 · **Versi Project:** v0.2.0 (Alpha)

---

## 📑 Daftar Isi

1. [Quick Start (5 Menit)](#-quick-start-5-menit)
2. [Tech Stack](#-tech-stack)
3. [Struktur Folder](#-struktur-folder)
4. [Arsitektur Aplikasi](#-arsitektur-aplikasi)
5. [Data Model (Prisma)](#-data-model-prisma)
6. [Navigation & Routing](#-navigation--routing)
7. [State Management (Zustand)](#-state-management-zustand)
8. [API Patterns](#-api-patterns)
9. [AI / LLM Architecture](#-ai--llm-architecture)
10. [Credit System](#-credit-system)
11. [Cross-Module Data Flow](#-cross-module-data-flow)
12. [PWA & Service Worker](#-pwa--service-worker)
13. [Styling & Design System](#-styling--design-system)
14. [Development Workflow](#-development-workflow)
15. [Known Issues & Gotchas](#-known-issues--gotchas)
16. [Related Documentation](#-related-documentation)

---

## 🚀 Quick Start (5 Menit)

### Prasyarat

- **Node.js** v18+
- **Bun** (package manager, direkomendasikan) atau npm
- Database lokal (SQLite via Prisma, auto-generated)

### Install & Run

```bash
cd usahaku.ai

# 1. Install dependencies
bun install

# 2. Push Prisma schema ke local DB (SQLite)
bun run db:push

# 3. Jalankan dev server
bun run dev
# → http://localhost:3000

# 4. (Opsional) Seed demo data
# Buka browser → Setup Brand → Pengaturan > Data Demo > Muat Data Demo
```

### Perintah Umum

| Command | Deskripsi |
|---------|-----------|
| `bun run dev` | Dev server di port 3000 |
| `bun run build` | Production build |
| `bun run db:push` | Sync Prisma schema ke database |
| `bun run db:migrate` | Buat migration file + apply |
| `bun run db:reset` | Reset database |
| `bun run lint` | Run ESLint |

---

## 🔧 Tech Stack

| Layer | Teknologi | Versi | Catatan |
|-------|-----------|-------|---------|
| **Framework** | Next.js (App Router) | ^16.1.1 | SSR + client components mixed |
| **Bahasa** | TypeScript | ^5 | `strict: true`, `noImplicitAny: false` |
| **Database** | PostgreSQL (prod) / SQLite (dev) | — | Via Supabase di production |
| **ORM** | Prisma | ^6.11.1 | `prisma/schema.prisma` (486 lines, 24 models) |
| **Auth** | Custom (cookie-based) | — | `nw_user_id` httpOnly cookie, bcryptjs hash |
| **CSS** | Tailwind CSS | ^4 | `darkMode: "class"`, CSS variables |
| **UI** | shadcn/ui (New York) + Radix | — | 48 components di `src/components/ui/` |
| **State** | Zustand | ^5.0.6 | Global store — session, navigation, onboarding |
| **Server State** | TanStack React Query | ^5.82.0 | Semua data fetching + caching |
| **Forms** | React Hook Form + Zod | ^7.60.0 / ^4.0.2 | Client + server validation |
| **Charts** | Recharts | ^2.15.4 | AreaChart, BarChart, LineChart, PieChart, ScatterChart |
| **Animasi** | Framer Motion | ^12.23.2 | Section transitions, ghost indicators, tour |
| **Drag & Drop** | @dnd-kit/core | ^6.3.1 | Leads Kanban board |
| **AI/LLM** | z-ai-web-dev-sdk | ^0.0.18 | Riset, konten, AI chat, projections |
| **Icons** | Lucide React | ^0.525.0 | ~50+ icons digunakan |
| **Dates** | date-fns | ^4.1.0 | Formatting + locale Indonesia (`id`) |
| **Theme** | next-themes | ^0.4.6 | Light/dark toggle |
| **Toast** | Sonner + shadcn toast | ^2.0.6 | Mixed usage (prefer shadcn pattern) |

---

## 📁 Struktur Folder

```
usahaku.ai/
├── prisma/
│   ├── schema.prisma          # ★ 24 models (486 lines). Source of truth database.
│   └── seed.ts                # Database seed script
│
├── src/
│   ├── app/
│   │   ├── (dashboard)/       # Route group untuk halaman authenticated
│   │   │   ├── layout.tsx     # Dashboard layout: sidebar + topbar + onboarding
│   │   │   ├── beranda/       # Dashboard/Home (★ entry point setelah login)
│   │   │   ├── insights/      # Analytics
│   │   │   ├── produk/        # Products
│   │   │   ├── riset/         # Research
│   │   │   ├── konten/        # Content
│   │   │   ├── toko/          # Store
│   │   │   ├── keuangan/      # Finance
│   │   │   ├── credit/        # Credit
│   │   │   ├── pengaturan/    # Settings
│   │   │   ├── bantuan/       # Help
│   │   │   ├── aktivitas/     # Activity log
│   │   │   └── notifikasi/    # Notifications
│   │   ├── api/               # ★ 40+ API route handlers
│   │   │   ├── activity/      # Unified activity timeline
│   │   │   ├── analytics/     # CLV, cohort, seasonal, products
│   │   │   ├── auth/          # login, logout, register
│   │   │   ├── brands/        # Brand CRUD
│   │   │   ├── campaigns/     # WA/Email campaigns
│   │   │   ├── content/       # AI content generation
│   │   │   ├── contexts/      # Research context management
│   │   │   ├── credit/        # Credit balance + topup
│   │   │   ├── customers/     # Customer detail
│   │   │   ├── dashboard/     # Dashboard stats + recommendations
│   │   │   ├── demo/          # seed + reset
│   │   │   ├── export/        # JSON backup
│   │   │   ├── goals/         # Goals CRUD + refresh
│   │   │   ├── import/        # JSON restore
│   │   │   ├── inbox/         # Chat inbox + AI reply
│   │   │   ├── init/          # Session initialization
│   │   │   ├── insights/      # Analytics data + AI summary
│   │   │   ├── inventory/     # Inventory management
│   │   │   ├── kalender/      # Calendar events (5 models)
│   │   │   ├── keuangan/      # contexts + projection
│   │   │   ├── leads/         # Lead CRUD
│   │   │   ├── logout/        # Clear session
│   │   │   ├── notifications/ # Notification CRUD + generate
│   │   │   ├── notification-preferences/
│   │   │   ├── operational-costs/
│   │   │   ├── orders/        # Order CRUD + shipping
│   │   │   ├── payables/      # Accounts payable
│   │   │   ├── payments/      # Payment verification
│   │   │   ├── products/      # Product CRUD + details
│   │   │   ├── receivables/   # Accounts receivable
│   │   │   ├── research/      # Research pipeline + context
│   │   │   ├── reset-onboarding/
│   │   │   ├── search/        # Global search (6 models)
│   │   │   ├── shipping/      # Shipping management
│   │   │   ├── transactions/  # Transaction CRUD + summary
│   │   │   ├── upload/        # File upload
│   │   │   └── user/          # User profile
│   │   ├── globals.css        # Global styles + CSS vars + animations
│   │   ├── layout.tsx         # Root layout (ThemeProvider, fonts, PWA meta)
│   │   └── page.tsx           # ★ Entry point — login screen OR main app switch
│   │
│   ├── components/
│   │   ├── nw/                # ★ 17 app-specific components
│   │   │   ├── sidebar.tsx    # Main sidebar + brand switcher + nav
│   │   │   ├── topbar.tsx     # Top bar: credit badge, search, ⌘K, notifications, theme
│   │   │   ├── bottom-tab-bar.tsx  # Mobile bottom nav
│   │   │   ├── primitives.tsx # PageHeader, StatCard, SectionCard, EmptyState
│   │   │   ├── onboarding.tsx      # Brand/product setup dialog
│   │   │   ├── onboarding-tour.tsx  # 8-step guided tour
│   │   │   ├── login-screen.tsx    # Full-page login
│   │   │   ├── user-menu.tsx       # Profile dropdown
│   │   │   ├── command-palette.tsx  # ⌘K
│   │   │   ├── global-search.tsx   # Cmd+F
│   │   │   ├── theme-toggle.tsx    # Topbar toggle
│   │   │   ├── sidebar-theme-toggle.tsx
│   │   │   ├── theme-provider.tsx  # next-themes wrapper
│   │   │   ├── section-transition.tsx  # Framer motion
│   │   │   ├── animated-number.tsx    # Count-up animation
│   │   │   ├── offline-indicator.tsx  # Offline banner
│   │   │   └── sw-register.tsx        # Service Worker registration
│   │   └── ui/                # ★ 48 shadcn/ui components
│   │       └── (button, dialog, table, tabs, card, ...)
│   │
│   ├── sections/nw/           # ★ 13 section components (main UI per halaman)
│   │   ├── beranda-section.tsx    # Dashboard hero, stats, goals, recommendations
│   │   ├── insights-section.tsx   # 5 tabs: Overview, CLV, Cohort, Seasonal, Produk
│   │   ├── produk-section.tsx     # Product CRUD, grid, bulk actions
│   │   ├── riset-section.tsx      # Research pipeline UI
│   │   ├── konten-section.tsx     # Content generation + library
│   │   ├── toko-section.tsx       # Store shell (6 sub-tabs)
│   │   ├── keuangan-section.tsx   # Finance shell (5 sub-tabs)
│   │   ├── kalender-section.tsx   # Monthly calendar
│   │   ├── credit-section.tsx     # Credit balance + packages
│   │   ├── pengaturan-section.tsx # Settings (7 tabs)
│   │   ├── bantuan-section.tsx    # Help center
│   │   ├── aktivitas-section.tsx  # Activity timeline
│   │   ├── notifikasi-section.tsx # Notifications
│   │   ├── toko/                  # ★ 13 sub-components
│   │   │   ├── inbox-tab.tsx
│   │   │   ├── aichat-tab.tsx
│   │   │   ├── leads-tab.tsx
│   │   │   ├── orders-tab.tsx     # ★ Merged Payments + Shipping
│   │   │   ├── inventory-tab.tsx
│   │   │   ├── campaigns-tab.tsx
│   │   │   ├── customer-detail-dialog.tsx
│   │   │   ├── invoice-dialog.tsx
│   │   │   ├── invoice-print.tsx
│   │   │   ├── store-preview.tsx
│   │   │   └── types.ts
│   │   ├── keuangan/              # ★ 6 sub-components
│   │   │   ├── ringkasan-tab.tsx
│   │   │   ├── transaksi-tab.tsx
│   │   │   ├── piutang-hutang-tab.tsx
│   │   │   ├── biaya-operasional-tab.tsx
│   │   │   ├── proyeksi-tab.tsx
│   │   │   └── types.ts
│   │   └── produk/
│   │       └── product-detail-dialog.tsx
│   │
│   ├── hooks/                 # 2 custom hooks
│   ├── lib/                   # ★ 11 utility modules (CORE — baca semua!)
│   │   ├── store.ts           # Zustand global store
│   │   ├── constants.ts       # SectionKey, NAV_ITEMS, TONES, credit rates, formatters
│   │   ├── api.ts             # Typed fetch helper api<T>() with cookie auth
│   │   ├── db.ts              # Prisma client singleton
│   │   ├── auth.ts            # getUserId() from httpOnly cookie
│   │   ├── ai.ts              # llmChat, llmJson, generateImage + AI prompt logging
│   │   ├── credit.ts          # chargeCredit / refundCredit with idempotency
│   │   ├── csv.ts             # CSV export utilities (client-side Blob download)
│   │   ├── utils.ts           # cn() classname merger (clsx + tailwind-merge)
│   │   ├── query-provider.tsx  # TanStack Query provider
│   │   └── image-compress.ts  # Image compression
│   └── utils/supabase/        # Supabase client (3 files — partially unused)
│
├── public/
│   ├── manifest.json          # PWA manifest
│   ├── sw.js                  # Service Worker
│   ├── icon.svg / icon-192.png / icon-512.png
│   └── logo.svg, robots.txt
│
├── agent-ctx/                 # 21 agent context records (development session logs)
├── db/                        # custom.db (SQLite local dev)
├── .zscripts/                 # Shell scripts
├── .env / .env.local          # ★ JANGAN commit. Berisi DATABASE_URL, AI_MODULE_URL, dll.
├── next.config.ts             # Next.js config (strictMode: false, ignoreBuildErrors: true)
├── tsconfig.json              # TypeScript config (path alias @/ → ./src/*)
├── tailwind.config.ts         # Tailwind config (darkMode: "class", CSS vars)
├── postcss.config.mjs
├── eslint.config.mjs          # Permissive rules (rapid dev)
├── components.json            # shadcn/ui "new-york" style
├── vercel.json                # Deploy config (region: sin1)
└── package.json               # v0.2.0
```

---

## 🧠 Arsitektur Aplikasi

### High-Level

```
┌────────────────────────────────────────────────────────────────┐
│                     BROWSER (Next.js App)                        │
│                                                                  │
│  ┌────────────┐  ┌──────────────────────────────────────────┐ │
│  │  Zustand    │  │  TanStack React Query                     │ │
│  │  (global    │  │  (server state — cache, refetch, dedupe) │ │
│  │   state)    │  │                                            │ │
│  └─────┬──────┘  └──────────────────┬───────────────────────┘ │
│        │                            │                           │
│        │    ┌───────────────────────┼───────────────────────┐  │
│        │    │  api<T>() helper      │                       │  │
│        │    │  (typed fetch +       │                       │  │
│        │    │   cookie auth)        │                       │  │
│        │    └───────────┬───────────┘                       │  │
│        │                │                                     │  │
│  ┌─────┴────────────────┴──────────────────────────────────┐ │
│  │                   PAGE.TSX                                │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │  Render Switch: section === "X" ? <XSection />       │ │ │
│  │  │  (Zustand store.activeSection)                       │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  └──────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│              NEXT.JS API ROUTES (40+ endpoints)                  │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  Auth: getUserId(req) → cookie nw_user_id                │  │
│  │  Pattern: src/app/api/{resource}/route.ts               │  │
│  │  Request → Verify Auth → Validate → Prisma Query → JSON  │  │
│  └─────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│                     PRISMA ORM                                  │
│  24 models di prisma/schema.prisma                              │
│  PostgreSQL (prod) / SQLite (dev)                               │
└────────────────────────────────────────────────────────────────┘
```

### Single-Route Architecture

Aplikasi ini menggunakan **single-route architecture**:
- Hanya ada **satu URL**: `/` (root)
- Semua section/halaman di-render berdasarkan **Zustand store `activeSection`**
- Navigasi internal via `useAppStore().setSection("beranda")`
- Tidak ada Next.js page routing (kecuali untuk auth flow)

```typescript
// src/app/page.tsx (simplified)
function HomePage() {
  const { section, isLoggedIn } = useAppStore();

  if (!isLoggedIn) return <LoginScreen />;

  return (
    <>
      {section === "beranda" && <BerandaSection />}
      {section === "insights" && <InsightsSection />}
      {section === "produk" && <ProdukSection />}
      {section === "riset" && <RisetSection />}
      {section === "konten" && <KontenSection />}
      {section === "toko" && <TokoSection />}
      {section === "keuangan" && <KeuanganSection />}
      {section === "kalender" && <KalenderSection />}
      {section === "credit" && <CreditSection />}
      {section === "notifikasi" && <NotifikasiSection />}
      {section === "pengaturan" && <PengaturanSection />}
      {section === "bantuan" && <BantuanSection />}
      {section === "aktivitas" && <AktivitasSection />}
    </>
  );
}
```

**Kenapa seperti ini?** Supaya semua data tetap di-memory (tidak reload halaman), termasuk ketika berpindah antar section.

---

## 🗄️ Data Model (Prisma)

### 24 Models

| Model | File (schema.prisma) | Deskripsi |
|-------|---------------------|-----------|
| **User** | line ~18 | Auth lokal, creditBalance, toneOfVoice |
| **Brand** | line ~38 | Multi-brand, slug (unique), category |
| **Product** | line ~70 | Barang/Jasa, costPrice, stock, SKU |
| **Inventory** | line ~94 | Hanya untuk varian produk |
| **Research** | line ~108 | Hasil riset (query + resultJson) |
| **Context** | line ~130 | 3 auto-generated contexts (konten/toko/keuangan) |
| **ContextUsage** | line ~148 | Log pemakaian context (reusable) |
| **Content** | line ~162 | Konten hasil generate (caption/gambar/video/carousel) |
| **Customer** | line ~190 | Entitas pelanggan (phone unique per brand) |
| **InboxMessage** | line ~212 | Chat WA/Telegram |
| **Lead** | line ~235 | Pipeline: Baru→Negosiasi→Deal→Closed |
| **Order** | line ~258 | Items JSON, shipping, status |
| **Payment** | line ~290 | Verifikasi: Menunggu→Diterima→Ditolak |
| **Campaign** | line ~310 | WA/Email broadcast |
| **CampaignRecipient** | line ~335 | Recipients + open/click tracking |
| **Transaction** | line ~352 | Income/expense + HPP snapshot |
| **Receivable** | line ~373 | Piutang |
| **Payable** | line ~388 | Hutang |
| **OperationalCost** | line ~402 | Biaya operasional |
| **Goal** | line ~415 | Target bisnis (6 types, 3 periods) |
| **Notification** | line ~430 | Notifikasi sistem |
| **CreditRate** | line ~445 | 11 tarif credit per action |
| **CreditUsageLog** | line ~465 | Audit trail credit |
| **AiPromptLog** | line ~482 | Log semua AI calls |

### Relasi Kunci

```
User ──< Brand ──< Product ──< Inventory
  │        │
  │        ├──< Research ──< Context ──< ContextUsage
  │        ├──< Content
  │        ├──< Customer
  │        ├──< Lead ──< Order ──< Payment
  │        ├──< Campaign ──< CampaignRecipient
  │        ├──< Transaction
  │        ├──< Receivable
  │        ├──< Payable
  │        ├──< OperationalCost
  │        ├──< Goal
  │        └──< Notification
  └──< CreditUsageLog, AiPromptLog
```

---

## 🧭 Navigation & Routing

### Primary Nav (Sidebar)

| # | Key | Label | Icon | Route |
|---|-----|-------|------|-------|
| 1 | `beranda` | Beranda | 🏠 | `page.tsx` (Home) |
| 2 | `insights` | Insights | 📈 | `page.tsx` |
| 3 | `produk` | Produk | 📦 | `page.tsx` |
| 4 | `riset` | Riset | 🔍 | `page.tsx` |
| 5 | `konten` | Konten | 📝 | `page.tsx` |
| 6 | `toko` | Toko | 🛒 | `page.tsx` |
| 7 | `keuangan` | Keuangan | 💰 | `page.tsx` |

### Profile Menu (User Dropdown)

| # | Key | Label | Icon |
|---|-----|-------|------|
| 1 | `credit` | Credit | ⚡ |
| 2 | `notifikasi` | Notifikasi | 🔔 |
| 3 | `aktivitas` | Aktivitas | 📋 |
| 4 | `pengaturan` | Pengaturan | ⚙️ |
| 5 | `bantuan` | Bantuan | ❓ |

### Bottom Tab Bar (Mobile)

Sama dengan Primary Nav + Profile Menu, ditampilkan sebagai bottom navigation bar pada mobile.

### Constants (lib/constants.ts)

```typescript
// Type yang digunakan semua component untuk navigasi
type SectionKey = "beranda" | "insights" | "produk" | "riset" | "konten"
  | "toko" | "keuangan" | "kalender" | "credit" | "notifikasi"
  | "aktivitas" | "pengaturan" | "bantuan";

// Primary nav items
const NAV_ITEMS = [
  { key: "beranda", label: "Beranda", icon: "🏠" },
  // ...
];

// Profile menu items
const PROFILE_MENU = [
  { key: "credit", label: "Credit", icon: "Zap" },
  // ...
];
```

---

## 🏪 State Management (Zustand)

### Store Shape (`lib/store.ts`)

```typescript
interface AppState {
  // Hydration
  hydrated: boolean;

  // Auth
  isLoggedIn: boolean;
  user: { id, name, email, creditBalance, toneOfVoice } | null;

  // Brand
  brands: Brand[];
  activeBrandId: string | null;

  // UI State
  section: SectionKey;
  onboardingOpen: boolean;

  // Actions
  setSession: (session) => void;
  setSection: (section) => void;
  setCredit: (balance) => void;
  updateBrand: (brand) => void;
  logout: () => void;
  clearBrands: () => void;
}
```

### Cara Pakai

```typescript
import { useAppStore } from "@/lib/store";

function MyComponent() {
  const { section, setSection, user, activeBrandId } = useAppStore();
  const activeBrand = useAppStore(state =>
    state.brands.find(b => b.id === state.activeBrandId)
  );
  // ...
}
```

### Hydration Flow

1. App mounts → `page.tsx` calls `POST /api/init`
2. `/api/init` → gets or creates demo user (Ibu Ani)
3. Sets `nw_user_id` cookie
4. Returns `{ user, brands }`
5. Frontend calls `useAppStore().setSession({ user, brands, activeBrandId })`

---

## 🌐 API Patterns

### Standard Pattern (GET List)

```typescript
// src/app/api/{resource}/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export async function GET(req: NextRequest) {
  // 1. Auth
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 2. Query params
  const { searchParams } = req.nextUrl;
  const brandId = searchParams.get("brandId");

  // 3. Validate
  if (!brandId) return NextResponse.json({ error: "brandId is required" }, { status: 400 });

  // 4. Verify ownership
  const brand = await db.brand.findUnique({ where: { id: brandId } });
  if (!brand || brand.userId !== userId)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  // 5. Query
  const data = await db.resource.findMany({
    where: { brandId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // 6. Return
  return NextResponse.json(data);
}
```

### API Client (`lib/api.ts`)

```typescript
import { api } from "@/lib/api";

// GET
const { data } = await api<MyType[]>("/api/resource", {
  params: { brandId: "xxx" }
});

// POST
const result = await api<CreateResponse>("/api/resource", {
  method: "POST",
  json: { name: "..." }
});
```

### TanStack Query Pattern

```typescript
// Di semua section components
const { data, isLoading, error, refetch } = useQuery({
  queryKey: ["resource", activeBrand?.id],
  queryFn: () => api<DataType[]>(`/api/resource?brandId=${activeBrand?.id}`),
  staleTime: 30_000,  // 30 detik
  enabled: !!activeBrand?.id,
});
```

---

## 🤖 AI / LLM Architecture

### 6 AI Touch Points + Template Fallback

| # | Touch Point | Credit Cost | Fallback |
|---|------------|-------------|----------|
| 1 | Intent Classifier (Research) | 0 | N/A (part of synthesis) |
| 2 | Research Synthesis | 5-8 | `deriveFallbackResult()` from web snippets |
| 3 | Context Generator | 0 (free) | Template-based from research data |
| 4a | Content Generator | 2-6 | `fallbackCaption()` / `fallbackVideoScript()` / `fallbackCarousel()` |
| 4b | AI Chat Reply | 0-1 | Template-based (detects keywords) |
| 4c | Financial Projection | 0-3 | Deterministic from growth_pct + pricing |
| 5 | Insights Summary | 3 | `deriveFallbackSummary()` from actual data |
| 6 | Image Generation | 4 | SVG placeholder data URI (brand initials + gradient) |

### Pattern

```typescript
// src/app/api/content/route.ts
try {
  // Coba LLM call
  result = await llmJson({ prompt, schema });
} catch {
  // Fallback ke template
  result = fallbackCaption({ brand, product, tone, angle, hashtags });
  usedFallback = true;
}
```

### ⚠️ LLM Token Issue

`z-ai-web-dev-sdk` memerlukan `X-Token` yang **tidak tersedia** di sandbox environment.
Semua AI call akan **selalu fallback ke template** sampai token tersedia.

---

## 💳 Credit System

### 11 Credit Rates (lib/constants.ts)

```typescript
const CREDIT_RATES = [
  { actionKey: "riset.pasar",        label: "Riset Pasar",          credits: 5,  module: "riset" },
  { actionKey: "riset.kompetitor",   label: "Riset Kompetitor",     credits: 8,  module: "riset" },
  { actionKey: "konten.caption",     label: "Generate Caption",     credits: 2,  module: "konten" },
  { actionKey: "konten.gambar",      label: "Generate Gambar",      credits: 4,  module: "konten" },
  { actionKey: "konten.video",       label: "Generate Video Script", credits: 6, module: "konten" },
  { actionKey: "konten.carousel",    label: "Generate Carousel",    credits: 5,  module: "konten" },
  { actionKey: "toko.ai_reply",      label: "AI Chat Reply",        credits: 1,  module: "toko" },
  { actionKey: "toko.campaign.wa",   label: "Kirim WA Campaign",   credits: 8,  module: "toko" },
  { actionKey: "toko.campaign.email", label: "Kirim Email Campaign", credits: 10, module: "toko" },
  { actionKey: "keuangan.proyeksi",  label: "Proyeksi Keuangan",    credits: 3,  module: "keuangan" },
  { actionKey: "insights.summary",   label: "Ringkasan AI Insight", credits: 3,  module: "insights" },
];
```

### Credit Flow

1. **Charge**: `chargeCredit(userId, actionKey)` → cek saldo ≥ rate → potong → log
2. **Refund**: `refundCredit(userId, actionKey)` → tambah saldo → log
3. **Context generation**: 0 credit (bonus dari riset)
4. **Top-up**: Saat ini **mock** (POST `/api/credit/topup` ↔ langsung tambah saldo)

### Pattern di API

```typescript
const balanceAfter = await chargeCredit(userId, "konten.caption");
// ... do work ...
if (error) {
  await refundCredit(userId, "konten.caption");
  return NextResponse.json({ error }, { status: 500 });
}
return NextResponse.json({ balanceAfter });
```

---

## 🔄 Cross-Module Data Flow

### Riset → Context → Semua Modul

```
RISET MARKET
    │
    ▼
Hasil Riset (Research)
    │
    ├── Context "konten" ───▶ KONTEN ───▶ Content (saved library)
    │                                      │
    ├── Context "toko"   ───▶ TOKO ──────▶ Toko Online
    │                                      │ Campaign
    └── Context "keuangan" ─▶ KEUANGAN ──▶ Proyeksi
```

### Product → Order → Payment → Transaction

```
PRODUK (costPrice = 9000)
    │
    ▼
ORDER (2 pcs × 15000 = 30000)
    │ stock decrement: 50 → 48
    ▼
PAYMENT (30000, status = "Diterima")
    │
    ▼
TRANSACTION (type=income, amount=30000, costAmount=18000)
    │ HPP auto: 2 × 9000 = 18000
    ▼
KEUANGAN → P&L: Pendapatan 30rb - HPP 18rb = Laba Kotor 12rb (40%)
```

### Chat → Lead → Customer → Order

```
INBOX MESSAGE (inbound WA)
    │
    ▼
LEAD (auto-created, stage = "Baru")
    │
    ├── stage = "Negosiasi" → "Deal"
    │       │
    │       ▼
    │   CUSTOMER (auto-created on Deal)
    │       │
    │       ▼
    │   ORDER (dengan customerId)
    │
    └── stage = "Closed"
```

---

## 📱 PWA & Service Worker

### Files

| File | Purpose |
|------|---------|
| `public/manifest.json` | PWA config: standalone, teal theme, 3 icons |
| `public/sw.js` | ~190 lines vanilla SW, route-aware caching |
| `public/icon.svg` | Scalable PWA icon (teal gradient "U") |
| `public/icon-192.png` | 192×192 raster icon |
| `public/icon-512.png` | 512×512 raster icon |

### Caching Strategies

| Resource | Strategy | Rationale |
|----------|----------|-----------|
| API (`/api/*`) | **Network-first** | Data freshness is critical |
| Navigations | **Cache-first** + background refresh | Instant load, offline shell |
| Static assets | **Cache-first** | Next.js hashed filenames |
| Fonts | **Cache-first** | Rarely change |

### ⚠️ SW only in production

`sw-register.tsx` hanya mendaftarkan SW saat `NODE_ENV === "production"`.
Di dev, Next.js HMR akan conflict dengan caching SW.

---

## 🎨 Styling & Design System

### Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| Cream Background | `#F6F4EF` | Global background |
| Teal Primary | `#0D9488` | Primary actions, headers, active states |
| Dark Ink | `#171412` | Text, strong elements |
| Orange Accent | `#F97316` | Secondary accent, jasa type badge |
| Emerald | `#10B981` | Success, income, positive states |
| Amber | `#F59E0B` | Warning, pending, menipis |
| Rose | `#F43F5E` | Error, destructive, habis |
| Violet | `#8B5CF6` | Campaigns, informational |
| Stone | `#78716C` | Neutral, secondary text |

### Typography

- **Primary:** Manrope (Google Fonts, variable)
- **Code/Mono:** Geist Mono (Google Fonts, variable)
- **Fallback:** system-ui, sans-serif

### CSS Utilities

| Class | Effect |
|-------|--------|
| `.card-hover` | Teal-tinted shadow lift on hover |
| `.card-shimmer` | Gradient sweep `::before` on hover (8% opacity, 0.6s) |
| `.fade-in` | Opacity 0 → 1 keyframe entrance |
| `.slide-in-right` | TranslateX + opacity entrance |
| `.scale-in` | Scale 0.95 → 1 entrance |
| `.gradient-text` | Teal gradient clipped text |
| `.glass` | Translucent cream bg + blur backdrop |
| `.skeleton-shimmer` | Fixed-hex shimmer (legacy) |
| `.skeleton-pulse` | Theme-aware gradient sweep (CSS vars) |
| `.pulse-glow` | Teal box-shadow ring pulse (2s infinite) |
| `.gradient-border` | Teal→orange gradient border (mask-composite) |
| `.chart-animate` | Chart entrance (0.5s fade+translateY) |
| `.table-row-hover` | Teal-tinted row hover (scoped to tbody tr) |
| `.heatmap-cell` | Scale(1.05) on hover |
| `.toast-slide-in` | Toast slide-in from right |

### Theme (Dark Mode)

- Powered by `next-themes` (attribute="class")
- Toggle di topbar (`ThemeToggle`) + sidebar (`SidebarThemeToggle`)
- CSS custom properties untuk semua warna → auto-adapt di dark mode

---

## 🔄 Development Workflow

### File Creation Pattern

Saat menambah fitur baru, ikuti pola ini:

1. **Database**: Edit `prisma/schema.prisma` → `bun run db:push`
2. **API Route**: Buat file di `src/app/api/{resource}/route.ts`
3. **Lib helper**: Jika perlu, tambahkan di `src/lib/`
4. **Section Component**: Buat di `src/sections/nw/{nama}-section.tsx`
5. **Constants**: Tambahkan `SectionKey` + `NAV_ITEMS` / `PROFILE_MENU`
6. **Page route**: Import + render branch di `src/app/page.tsx`
7. **Primitives**: Gunakan `PageHeader`, `StatCard`, `SectionCard`, `EmptyState` dari `components/nw/primitives.tsx`

### Data Fetching Pattern

```typescript
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";

export function MySection() {
  const { brands, activeBrandId } = useAppStore();
  const activeBrand = brands.find(b => b.id === activeBrandId);
  const qc = useQueryClient();

  // Query
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["my-data", activeBrand?.id],
    queryFn: () => api<MyType[]>(`/api/my-resource?brandId=${activeBrand?.id}`),
    staleTime: 30_000,
    enabled: !!activeBrand?.id,
  });

  // Mutation
  const createMut = useMutation({
    mutationFn: (body: CreateBody) =>
      api<MyType>("/api/my-resource", { method: "POST", json: body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-data"] });
      toast({ title: "Berhasil dibuat!" });
    },
  });

  if (isLoading) return <Skeleton />;
  if (error) return <ErrorState onRetry={refetch} />;
  if (!data?.length) return <EmptyState />;

  return <div>{/* ... */}</div>;
}
```

### Commit Convention

Gunakan conventional commits untuk auto-update CHANGELOG:

```
feat: tambah fitur baru
fix: perbaiki bug
change: ubah fitur yang sudah ada
remove: hapus fitur
docs: update dokumentasi
chore: maintenance
```

---

## ⚠️ Known Issues & Gotchas

### 1. LLM API Token Tidak Tersedia
- `z-ai-web-dev-sdk` butuh `X-Token` yang tidak ada di sandbox
- Semua AI call fallback ke template → output valid tapi bukan AI-generated
- **Fix**: Dapatkan token dan set di environment variable saat production deploy

### 2. Auth Belum SSO
- Saat ini: custom email/password + bcryptjs + cookie (`nw_user_id`)
- Target (Pre-Prod v0.4.x): SSO mwxmarket.ai via JWT
- User table di-create secara lokal, belum sync ke mwxmarket

### 3. Supabase Utils Unused
- 3 files di `src/utils/supabase/` dibuat untuk integrasi SSO mwxmarket.ai
- Saat ini tidak digunakan. Jangan dihapus — akan dipakai saat integrasi SSO.

### 4. Single-Route Architecture
- Tidak ada Next.js file-based routing untuk section
- Semua via Zustand `activeSection`
- URL tidak berubah saat navigasi → tidak bisa deep-link ke section spesifik
- Jika ingin deep-linking, perlu refactor ke file-based routing

### 5. TypeScript Strict Mode
- `strict: true` tapi `noImplicitAny: false`
- `ignoreBuildErrors: true` di next.config → build tidak akan gagal karena TS errors
- Beberapa file menggunakan `any` untuk LLM output yang unpredictable (disengaja)

### 6. React Strict Mode Disabled
- `reactStrictMode: false` di next.config
- Diaktifkan bisa menyebabkan double-render yang aneh di beberapa component

### 7. Database: SQLite di Dev, PostgreSQL di Production
- SQLite tidak support concurrent writes (cukup untuk dev single user)
- Prisma schema dibuat untuk PostgreSQL → perlu test di PostgreSQL sebelum production

### 8. Service Worker di Dev
- SW hanya register di production (`NODE_ENV === "production"`)
- Bisa dicek via `bun run build && bun run start` (production mode local)

### 9. State Hydration Race
- Zustand store di-hydrate async via `/api/init`
- Component yang mount sebelum hydration selesai → `hydrated === false`
- Gunakan guard: `if (!hydrated) return null;`

---

## 📚 Related Documentation

| Dokumen | Path | Deskripsi |
|---------|------|-----------|
| **CHANGELOG.md** | `usahaku.ai/CHANGELOG.md` | Riwayat perubahan versi |
| **worklog.md** | `usahaku.ai/worklog.md` | Log build detail (1375+ lines, 21 task entries) |
| **LOGIC_FLOW_v0.1.1.md** | Root project | Alur logika lengkap (924 lines) |
| **AI_LAYER.md** | Root project | 6 AI touch points, prompt design |
| **DEVELOPMENT_PLAN.md** | Root project | Version roadmap Alpha→Beta→Pre-Prod→Production |
| **PROJECT_RESUME.md** | Root project | High-level overview untuk stakeholder |
| **GTM_PLAN.md** | Root project | Go-to-market strategy |
| **POC_Context.md** | Root project | POC context + decision log |
| **NEXT_WHIZ_STARTUP_PLAN.md** | Root project | Business plan + ICP |

---

## 🚀 Next Steps (Beta v0.3.x)

Lihat `DEVELOPMENT_PLAN.md` untuk daftar lengkap. Prioritas utama:

1. **Middleware route protection** — autentikasi di level Next.js middleware
2. **Product image upload** — file upload ke storage service
3. **Real WhatsApp integration** — WhatsApp Business API untuk Campaigns
4. **Email notification system** — notifikasi untuk event kritis
5. **Beta invite system** — invite code untuk akses beta
6. **Deploy ke beta.usahaku.ai** — production-like environment
7. **Audit keamanan** — auth, CSRF, rate limiting

---

> **Built with ❤️ by MWI (Solo Founder)** · **Contact:** support@usahaku.ai
