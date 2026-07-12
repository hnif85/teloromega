# 📚 DOKUMENTASI CODEBASE — usahaku.ai (The Next Whiz)

> **Versi:** 0.7.0 (Alpha) · **Terakhir diperbarui:** 12 Juli 2026
> **Stack:** Next.js 16 + TypeScript + Tailwind CSS 4 + Prisma + shadcn/ui + LangChain
> **Tujuan:** AI Co-pilot all-in-one untuk UMKM Indonesia

---

## 📑 Daftar Isi

1. [Ringkasan & Filosofi Aplikasi](#1-ringkasan--filosofi-aplikasi)
2. [Flow Logic: Alur Bisnis Lintas Modul](#2-flow-logic-alur-bisnis-lintas-modul)
3. [Arsitektur AI & LLM](#3-arsitektur-ai--llm)
4. [UX Architecture & State Management](#4-ux-architecture--state-management)
5. [Data Model & Hubungan Antar Data](#5-data-model--hubungan-antar-data)
6. [API Reference: Semua Endpoint](#6-api-reference-semua-endpoint)
7. [Navigasi & Routing](#7-navigasi--routing)
8. [Credit System](#8-credit-system)
9. [PWA & Service Worker](#9-pwa--service-worker)
10. [Cara Baca & Kontribusi untuk AI/Developer](#10-cara-baca--kontribusi-untuk-aideveloper)

---

## 1. Ringkasan & Filosofi Aplikasi

### 1.1 Apa Itu usahaku.ai?

App **Next.js App Router multi-page** yang menggabungkan 4 aplikasi MWX lama (SmartWhiz, CreateWhiz, SalesWhiz, FinanceWhiz) menjadi satu platform terpadu. UMKM cukup daftar sekali, input data sekali, dan semua modul saling terhubung.

### 1.2 Prinsip Arsitektur Kunci

```
┌──────────────────────────────────────────────────────────────────┐
│              NEXT.JS APP ROUTER — FILE-BASED ROUTING              │
│                                                                   │
│  Setiap section adalah file page.tsx terpisah:                    │
│  /beranda  /insights  /produk  /riset  /konten  /toko  /keuangan │
│  /kalender /aichat /credit /pengaturan /bantuan /aktivitas/notifikasi │
│                                                                   │
│  Single Route Group: (dashboard)/layout.tsx → shared shell        │
│  Root / → auth landing → redirect ke /beranda                     │
│                                                                   │
│  Navigate Bridge (Zustand ↔ URL sync):                           │
│  Setiap section juga punya state di Zustand untuk backward compat │
│  Tapi navigasi PRIMER via Next.js router (browser URL berubah)    │
│                                                                   │
│  Keuntungan:                                                      │
│  • Bisa deep-link ke section spesifik (/produk, /toko)            │
│  • Back/Forward browser bekerja normal                            │
│  • TanStack Query cache tetap optimal via (dashboard) route group │
│  • Zustand store dipakai untuk state shared (brand, credit, dll)  │
└──────────────────────────────────────────────────────────────────┘
```

### 1.3 Tech Stack (Lengkap)

| Layer | Teknologi | Keterangan |
|-------|-----------|------------|
| Framework | Next.js 16 App Router | SSR + Client Components mixed |
| State Global | Zustand 5 | Session, navigation, onboarding |
| Server State | TanStack React Query 5 | Data fetching + caching + mutations |
| Database ORM | Prisma 6 | PostgreSQL (prod) / SQLite (dev) |
| UI Library | shadcn/ui + Radix | 48 komponen UI siap pakai |
| CSS | Tailwind CSS 4 | Dark mode via `class` strategy |
| Forms | React Hook Form + Zod 4 | Client + server validation |
| AI/LLM | LangChain + DeepSeek + Tavily | Agentic research pipeline |
| Image AI | MWX AI Module (Vertex/Gemini) | Image generation + OCR receipt |
| Charts | Recharts 2 | 6 chart types |
| Animasi | Framer Motion 12 | Section transitions, tour |
| Dates | date-fns 4 | Locale Indonesia (id) |
| Auth | Custom cookie-based | `nw_user_id` httpOnly, bcryptjs |
| Icons | Lucide React | ~50+ icon components |

---

## 2. Flow Logic: Alur Bisnis Lintas Modul

### 2.1 Diagram Alur Data Utama

```
ONBOARDING ──► Brand ──► Produk ──► Beranda (Dashboard)
                                    │
                  ┌─────────────────┼──────────────────┐
                  ▼                 ▼                   ▼
              ┌────────┐     ┌──────────┐    ┌──────────┐
              │ RISET  │     │ AI CHAT  │    │ KEUANGAN  │
              └───┬────┘     └────┬─────┘    └────┬─────┘
                  │               │               │
    ┌─────────────┼───────┐      │    ┌──────────┘
    ▼             ▼       ▼      ▼    ▼
 CONTEXT     CONTEXT  CONTEXT  ┌─────────┐
 (konten)    (toko)  (keuangan)│  TOKO   │
    │             │            │(Orders, │
    ▼             ▼            │ Stok,   │
 ┌────────┐ ┌─────────┐       │Bayar)   │
 │ KONTEN │ │ AI CHAT │       └────┬────┘
 │ (AI)   │ │(Inbox,   │           │
 └────────┘ │ Leads,   │      ┌────────┐
            │ Campaign)│      │ ORDER  │
            └────┬─────┘      └───┬────┘
                 │                │
                 │     ┌──────────┘
                 ▼     ▼
              ┌────────┐
              │PAYMENT │──Diterima──► KEUANGAN
              └────────┘  auto-HPP   (P&L, Transaksi)
```

### 2.2 Flow Per Modul (Detail)

#### 🔵 **Flow A: Onboarding → Produk → Riset → Action** (Loop Inti)

```
1. NEW USER LOGIN
   POST /api/init → create/get demo user (Ibu Ani)
   Store: setSession({ user, brands, activeBrandId })
   → isLoggedIn = true
   → Jika user.isOnboarded == false → onboardingOpen = true

2. ONBOARDING DIALOG (3 steps)
   Step 1: Brand (wajib) → nama + kategori
   Step 2: Produk (opsional) → type: barang/jasa → form
   Step 3: Selesai
   → POST /api/brands → addBrand(store)
   → POST /api/products → queryClient.invalidate

3. BERANDA (Dashboard)
   GET /api/dashboard?brandId=X
   → Returns stats, recommendations, recent research
   Display:
   - DashboardHero (greeting + date + brand + quick stats)
   - 7 StatCards (Riset, Produk, Penjualan, Credit, Leads, Orders, Konten)
   - GoalsWidget (progress bars, max 4)
   - Rekomendasi Aksi (max 3 AIRecommendationCards)
   - Riset Terbaru (list)
   - Low stock banner / pending payments alerts
   
4. RISET (Mengisi Context Engine)
   POST /api/research
   → chargeCredit("riset.pasar", 5)
   → runResearchPipeline(brand, query):
       try { LangChain Agentic } catch { Manual Pipeline }
     Pipeline:
       [searching] Tavily web search (8 results, 90 days)
       [analyzing] classifyIntent (LLM 60 tok, or fallback)
       [synthesizing] LLM synthesis (6000 tok, or fallback)
       [completed] db.research.create
       → generateContexts (3 FREE: konten/toko/keuangan)
   → Returns { research, contexts, creditBalanceAfter }
   Frontend: setCredit(balanceAfter)
   → Beranda now shows:
     - "Riset Tersedia" card
     - 3 Rekomendasi Aksi (dari 3 contexts)

5. CONTEXT ENGINE (Jembatan Riset → Aksi)
   3 contexts auto-created per research (GRATIS):
   
   a) Context "konten"
      → content_recommendations + keywords + target_audience
      → Digunakan di: Konten Section (pre-fill angle, platform, hashtags)
   
   b) Context "toko"
      → pricing data (rata2, termurah, termahal) + competitors
      → Digunakan di: Toko Section (harga review, stok pricing)
   
   c) Context "keuangan"
      → proyeksi margin + estimasi volume
      → Digunakan di: Keuangan Section (proyeksi budget)

6. KONTEN (Hasil Generate)
   POST /api/content
   → chargeCredit(actionKey sesuai type)
   → type Branch:
     caption → llmChat + fallbackCaption()
     gambar → generateImage + fallbackImage()
     video → llmJson + fallbackVideoScript()
     carousel → llmJson + fallbackCarousel()
   → db.content.create + contextUsage (if contextId)
   → On failure: refundCredit
```

#### 🟢 **Flow B: AI Chat + Toko (Pemisahan 2 Halaman)**

```
⚠️ AI CHAT dan TOKO adalah 2 halaman terpisah di sidebar:
   /aichat  → Inbox, AI Chat, Leads, Campaign
   /toko    → Orders, Stok, Pembayaran

Namun secara DATA FLOW, mereka tetap satu kesatuan:
```

**Halaman AI Chat (`/aichat` — route: `(dashboard)/aichat/page.tsx`):**

```
1. INBOX CHAT MASUK (Tab: Inbox)
   GET /api/inbox?brandId=X
   → List percakapan, unread badge (WA/Telegram)
   AI Reply: POST /api/inbox/ai-reply
   → chargeCredit("toko.ai_chat_reply", 1)
   → llmChat or fallback (detect keyword: harga/stok/ongkir/order)
   → Returns draft (editable before send)

2. AUTO-LEAD dari Chat
   Sistem auto-create Lead dari inbound message:
   Lead.stage = "Baru" (default), source dari channel
   → Lead muncul di tab "Leads"

3. LEAD PIPELINE (Tab: Leads)
   4 stages: Baru → Negosiasi → Deal → Closed
   Drag & drop (desktop) / sheet pindah (mobile)
   When "Deal":
   → Customer auto-created (or linked)
   → Order auto-created (dengan status "Baru")
   → Order bisa dilihat di /toko

4. CAMPAIGN (Tab: Campaign, di /aichat)
   POST /api/campaigns
   → chargeCredit("toko.campaign_wa", 8) / campaign_email (10)
   → Pilih recipient (customers + leads)
   → Kirim broadcast (mock WA/email)

5. AI CHAT TEMPLATE (Tab: AI Chat)
   POST /api/inbox/ai-reply + GET /api/inbox/templates
   → 5 template statis dengan tombol copy
   → AI auto-reply generator (1 credit)
```

**Halaman Toko (`/toko` — route: `(dashboard)/toko/page.tsx`):**

```
1. ORDER MANAGEMENT (Tab: Orders)
   POST /api/orders → stock decrement (barang only)
   PATCH /api/orders/[id] → update status, shipping
   → Invoice print (Invoice button per row)
   → CSV export (15 kolom)
   
2. PERSEDIAAN STOK (Tab: Stok)
   GET /api/inventory?brandId=X
   → Tabel stok dengan low-stock highlighting
   → Inline edit dialog + riwayat pergerakan

3. PEMBAYARAN (Tab: Pembayaran)
   GET /api/payments?orderId=X
   → Verifikasi: POST /api/payments/[id]/verify?action=accept|reject
   → AI Verify: POST /api/payments/[id]/ai-verify
   → Auto-create Transaction saat Diterima:
     type: "income", costAmount: HPP snapshot
   → Bulk verify: "Terima Semua (N)" via Promise.allSettled

4. STORE PREVIEW (Card info di atas tabs)
   → Tampilkan link toko: tokoku.nextwhiz.id/{slug}
   → Dialog preview toko online (mock storefront)

5. FLOW: CHAT → ORDER → PAYMENT → KEUANGAN (lintas halaman)
   /aichat (Inbox) → auto-lead → Deal → auto-order
     ↓ (order muncul di)
   /toko (Orders) → verifikasi pembayaran
     ↓ (payment Diterima → auto-transaction)
   /keuangan (Ringkasan) → P&L terupdate
   
   Pendapatan Rp 30.000 - HPP Rp 18.000 = Laba Kotor Rp 12.000
```

#### 🟡 **Flow C: Keuangan (Transaksi → P&L → Proyeksi)**

```
1. TRANSACTION (Income/Expense)
   POST /api/transactions
   → Jika type=income + productId → auto-HPP
   costAmount = product.costPrice × quantity
   
2. MARK AS PAID (Piutang/Hutang)
   PATCH /api/receivables/[id] (status: paid)
   → Auto-create income transaction
   PATCH /api/payables/[id] (status: paid)
   → Auto-create expense transaction

3. RINGKASAN (P&L)
   GET /api/transactions/summary
   → totalIncome, totalExpense, totalHPP
   → Laba/Rugi = Income - (Expense + HPP)
   
4. PROYEKSI KEUANGAN (AI)
   POST /api/keuangan/projection
   → chargeCredit("keuangan.proyeksi", 3)
   → Ambil context keuangan + data transaksi 6 bulan
   → LLM: narrative projection + break-even analysis
   → contextUsage.create ("keuangan.view_projection")
```

#### 🔴 **Flow D: Credit System (Pay-per-Action)**

```
SETIAP aksi AI memotong credit:
┌─────────────────────────────────────────────────┐
│ Action                    Cost  │  Module        │
├─────────────────────────────────────────────────┤
│ Riset Pasar               ⚡5   │  riset         │
│ Riset Kompetitor          ⚡8   │  riset         │
│ Generate Caption          ⚡2   │  konten        │
│ Generate Gambar           ⚡4   │  konten        │
│ Generate Video Script     ⚡6   │  konten        │
│ Generate Carousel         ⚡5   │  konten        │
│ AI Chat Reply             ⚡1   │  toko          │
│ WA Campaign               ⚡8   │  toko          │
│ Email Campaign            ⚡10  │  toko          │
│ Proyeksi Keuangan         ⚡3   │  keuangan      │
│ Import Transaksi Template ⚡3   │  keuangan      │
│ AI Insights Summary       ⚡3   │  insights      │
└─────────────────────────────────────────────────┘

Flow:
  chargeCredit(userId, actionKey)
  → cek balance ≥ cost
  → db.user.update creditBalance
  → db.creditUsageLog.create (status: "charged")
  → Return { ok, balanceAfter }

  refundCredit(userId, actionKey)
  → db.user.update creditBalance + cost
  → db.creditUsageLog.create (status: "refunded")

GRATIS: Context generation (3x per research, 0 credit)
TOPUP: POST /api/credit/topup (mock — langsung tambah balance)
```

### 2.3 Cross-Module Invariants (Wajib Dijaga)

| Invariant | Dilanggar? | Konsekuensi |
|-----------|-----------|-------------|
| `Payment.status = "Diterima"` → `Transaction.create(type=income)` | Auto | Keuangan tidak akurat |
| `Order.status = "Baru"` → stock decrement barang | Auto | Stok tidak sinkron |
| `Order.status = "Dibatalkan"` → stock restore | API handler | Stok minus terus |
| `Lead.stage = "Deal"` → Customer + Order create | Manual via UI | Pelanggan tidak tercatat |
| `Customer.phone` unique per brand | Prisma `@@unique` | Duplikasi pelanggan |
| Context create = 0 credit | `_pipeline.ts` hardcoded | Credit membengkak |
| Credit refund on AI call failure | `try/catch` + refund | User kehilangan credit |
| Last brand tidak bisa di-delete | API guard + UI guard | Data hilang |

---

## 3. Arsitektur AI & LLM

### 3.1 Diagram AI Pipeline

```
┌────────────────────────────────────────────────────────────────┐
│                    AI MODULE GATEWAY                            │
│           ai-module.mwxmarket.ai (Vertex/Gemini)                │
│                                                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │ llmChat   │  │ llmJson  │  │webSearch │  │ generateImage │   │
│  │ (text)    │  │ (JSON)   │  │ (Tavily) │  │ (Gemini Img)  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘   │
│       │              │              │              │           │
│       ▼              ▼              ▼              ▼           │
│  ┌────────────────────────────────────────────────────────┐    │
│  │              AiPromptLog (audit trail)                  │    │
│  │  Setiap AI call dicatat: feature, model, prompt,         │    │
│  │  response, tokens, latency, success/fail                │    │
│  └────────────────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────────┐
│                    INTELLIGENT FALLBACK SYSTEM                   │
│                                                                │
│  Setiap AI call dibungkus try/catch:                           │
│  try { return await llmXxx(...) }                              │
│  catch { return fallbackXxx(...) }  ← selalu valid output      │
│                                                                │
│  Fallback Types:                                               │
│  • fallbackCaption() ~ template-based caption                  │
│  • fallbackImage() ~ SVG placeholder (brand initials)          │
│  • fallbackVideoScript() ~ 5-scene structure                   │
│  • fallbackCarousel() ~ 5-slide carousel                       │
│  • deriveFallbackResult() ~ from web snippets                  │
│  • deriveFallbackSummary() ~ from actual data                  │
│  • template reply (AI Chat) ~ keyword detection                 │
└────────────────────────────────────────────────────────────────┘
```

### 3.2 AI Touch Points (6 Area + 1 Image)

| # | Touch Point | File | Function | Fallback |
|---|-------------|------|----------|----------|
| 1 | Intent Classifier | `api/research/_pipeline.ts` → `classifyIntent()` | llmJson 60 tok | Return "basic_research" |
| 2 | Research Synthesis | `api/research/_pipeline.ts` → `synthesizeResearch()` | llmJson 6000 tok | `deriveFallbackResult()` dari snippets |
| 3 | Context Generator | `api/research/_pipeline.ts` → `generateContexts()` | Deterministic (0 credit) | N/A (no LLM) |
| 4a | Content Caption | `api/content/route.ts` → generate | llmChat | `fallbackCaption()` |
| 4b | Content Image | `lib/ai.ts` → `generateImage()` | MWX AI Module | SVG placeholder |
| 4c | Content Video | `api/content/route.ts` → generate | llmJson | `fallbackVideoScript()` |
| 4d | Content Carousel | `api/content/route.ts` → generate | llmJson | `fallbackCarousel()` |
| 5 | AI Chat Reply | `api/inbox/ai-reply/route.ts` | llmChat | Keyword template |
| 6 | Insights Summary | `api/insights/summary/route.ts` | llmJson | `deriveFallbackSummary()` from data |
| 7 | Financial Projection | `api/keuangan/projection/route.ts` | llmJson | Deterministic dari growth_pct |
| 8 | Image-to-Image | `lib/ai.ts` → `generateImage()` | MWX AI Module (ref) | SVG placeholder |
| 9 | Receipt OCR | `lib/ai.ts` → `extractReceiptFromImage()` | Multimodal Gemini | null |

### 3.3 Research Pipeline (Dua Mode)

#### Mode A: LangChain Agentic (Primary — `_agent.ts`)

```
runAgenticResearch(brand, query)
  ↓
Create Agent: ChatDeepSeek + TavilySearchTool
  ↓
Agent.invoke({ messages: [HumanMessage(query)] })
  ↓
Agent LOOP:
  Think → Decide search queries → web_search tool → Observe → Think again
  (Agent decides autonomously how many searches)
  ↓
Extract JSON from final AI message
  ↓
Normalize with safe defaults
  ↓
Return AgentResearchResult
```

#### Mode B: Manual Pipeline (Fallback — `_pipeline.ts`)

```
runResearchPipeline(brand, query)
  ↓
try { Agentic } catch → Fallback
  ↓
[searching]  tavilySearch(query, 8 results, 90 days)
  ↓
[analyzing]  classifyIntent(query, snippets) → LLM 60 tok or "basic_research"
  ↓
[synthesizing]  synthesizeResearch(query, intent, brand, results)
  ↓
              LLM → llmJson 6000 tok   OR   Fallback from web snippets
  ↓
[completed]  Return { intent, result, searchCount }
```

### 3.4 LangChain Agent Detail (`_agent.ts`)

```typescript
// File: src/app/api/research/_agent.ts

// Tool yang tersedia untuk agent:
const tavilySearchTool = tool(
  async ({ query, maxResults }) => {
    // Memanggil Tavily API
    // Mengembalikan JSON { answer, results[] }
  },
  {
    name: "web_search",
    description: "Cari data real-time dari web...",
    schema: z.object({ query: z.string(), maxResults: z.number().optional() })
  }
);

// System prompt: mendefinisikan tugas riset, struktur output JSON
function buildSystemPrompt(brand): string {
  return `Kamu analis riset pasar... 
         Brand: ${brand.name} (${brand.category})
         
         TUGAS: Lakukan riset pasar menyeluruh.
         Gunakan tool web_search untuk data real-time.
         
         OUTPUT JSON WAJIB: {
           intent, market_trend, target_audience, swot,
           competitors, keywords, content_recommendations, pricing
         }`;
}

// Model: DeepSeek Chat, temperature 0.5
const model = new ChatDeepSeek({ model: "deepseek-chat", temperature: 0.5 });
const agent = createAgent({ model, tools: [tavilySearchTool], systemPrompt });
```

### 3.5 AI Module Gateway (`lib/ai.ts`)

```typescript
// File: src/lib/ai.ts — 450 lines

// 3 Core Functions:
export async function llmChat(messages: ChatMessage[], opts?): Promise<string>
  → callAiModule() → return content text

export async function llmJson<T>(messages: ChatMessage[], opts?): Promise<T>
  → llmChat → strip code fences → JSON.parse → regex fallback → throw

export async function webSearch(query, opts?): Promise<SearchResult[]>
  → callAiModule() → extract JSON array → return []

export async function generateImage(prompt, opts?): Promise<string|null>
  → FormData to MWX AI Module → return data:image/webp;base64,...

export async function extractReceiptFromImage(base64, mimeType): Promise<ReceiptData|null>
  → Multimodal prompt → JSON.parse → return structured receipt

// Internal:
callAiModule(messages, opts) → POST ${AI_BASE}/completions
  → Auto-log ke AiPromptLog (success/fail, tokens, latency)
  → setAiContext() dulu untuk metadata user/brand/feature

// Logging:
AiPromptLog model:
  userId, brandId, feature, ai, model, service,
  prompt, response, promptTokens, completionTokens,
  totalTokens, success, error, latencyMs
```

### 3.6 Fallback System (Critical Safety Net)

Karena `z-ai-web-dev-sdk` memerlukan `X-Token` yang tidak selalu tersedia, **semua** AI call punya fallback:

```typescript
// Pattern Umum (ada di semua route handler AI):
async function generateSomething(req: Request) {
  const userId = await getUserId(req);
  const balanceAfter = await chargeCredit(userId, "action.key");
  
  try {
    result = await llmXxx(prompt, schema);
  } catch (error) {
    result = fallbackXxx(brand, product, context);
    usedFallback = true;
  }
  
  if (usedFallback) {
    // refund credit karena output dari template
    await refundCredit(userId, "action.key");
  }
  
  return NextResponse.json({ result, balanceAfter, usedFallback });
}
```

Daftar lengkap fallback:

| Fallback Function | Output | Sumber Data |
|---|---|---|
| `fallbackCaption()` | Teks caption ~1500 chars | Brand, product, tone, angle, hashtags |
| `fallbackVideoScript()` | 5 scene + hooks | Brand + context |
| `fallbackCarousel()` | 5 slide + CTA | Brand + context |
| `fallbackImage()` | SVG data URI (initials + gradient) | Brand name |
| `deriveFallbackResult()` | Full ResearchResult | Web search snippets |
| `deriveFallbackSummary()` | AISummary (headline, strengths, health score) | Actual data metrics |
| Template AI Reply | Detected keyword → template | Keyword map |

---

## 4. UX Architecture & State Management

### 4.1 Routing Architecture (Next.js App Router)

```
ROOT PAGE: / (src/app/page.tsx)
  "use client" — hanya untuk auth
  ├── if (!hydrated) → Skeleton loading
  ├── if (!isLoggedIn) → <LoginScreen />
  └── if (hydrated && isLoggedIn) → router.replace("/beranda")

DASHBOARD ROUTE GROUP: (dashboard)/
  └── layout.tsx  ← shared shell untuk SEMUA halaman dashboard
      ├── <Sidebar />           (desktop 248px)
      ├── <Topbar />            (greeting, search, ⌘K, notif, credit, theme)
      ├── <main>{children}</main>  ← Next.js renders page.tsx here
      ├── <BottomTabBar />      (mobile)
      ├── <OnboardingDialog />  (modal 3-step wizard, conditional)
      ├── <OnboardingTour />    (8-step guided tour)
      ├── <CommandPalette />    (⌘K)
      └── <OfflineIndicator />  (offline banner)

  └── SETIAP SECTION PUNYA PAGE.TSX SENDIRI:
      ├── beranda/page.tsx   → <BerandaSection />
      ├── insights/page.tsx  → <InsightsSection />
      ├── produk/page.tsx    → <ProdukSection />
      ├── riset/page.tsx     → <RisetSection />
      ├── konten/page.tsx    → <KontenSection />
      ├── toko/page.tsx      → <TokoSection />
      ├── keuangan/page.tsx  → <KeuanganSection />
      ├── kalender/page.tsx  → (via Zustand — belum punya page.tsx sendiri)
      ├── credit/page.tsx    → <CreditSection />
      ├── pengaturan/page.tsx → <PengaturanSection />
      ├── bantuan/page.tsx   → <BantuanSection />
      ├── aktivitas/page.tsx → <AktivitasSection />
      └── notifikasi/page.tsx → <NotifikasiSection />

PUBLIC TOKO: /t/[slug] (ROUTE GROUP TERPISAH — tanpa dashboard shell)
  └── page.tsx    → Server Component: fetch brand by slug → <StoreClient />
  └── checkout/[orderId]/page.tsx  → Checkout flow publik
```

### 4.2 Navigate Bridge (Zustand ↔ URL Compatibility Layer)

```typescript
// src/lib/store.ts

// ⚠️ Catatan penting: Navigasi PRIMER sekarang via Next.js App Router.
// Navigate Bridge adalah LAPISAN KOMPATIBILITAS untuk kode lama yang
// masih panggil setSection() langsung ke Zustand.
//
// Cara kerja dual routing:
//
//   ┌─────────────────────────────────────────────────────┐
//   │                                                     │
//   │  A. NAVIGASI BARU (preferred) — Next.js Router      │
//   │     <Link href="/produk"> atau router.push("/toko")  │
//   │     → URL berubah → page.tsx baru di-render          │
//   │     → (dashboard)/layout.tsx detects pathname change  │
//   │     → sync ke Zustand setSection() untuk state        │
//   │                                                     │
//   │  B. NAVIGASI LAMA (legacy) — Zustand setSection()     │
//   │     setSection("toko")                                │
//   │     → store.section di-update                         │
//   │     → Navigate Bridge: _navigate("/toko")             │
//   │     → router.push("/toko") — URL berubah              │
//   │     → Next.js render page.tsx yang benar              │
//   │                                                     │
//   └─────────────────────────────────────────────────────┘
//
// Keduanya converge ke hasil yang SAMA.
// Kode baru DISARANKAN pakai Next.js Link/router langsung.

let _navigate: ((path: string) => void) | null = null;
export function registerNavigate(fn) { _navigate = fn; }

export function pathToSection(path: string): SectionKey {
  const key = path.replace(/^\//, "").split("/")[0];
  const known: SectionKey[] = [
    "beranda", "insights", "produk", "riset", "konten", "toko", "aichat",
    "keuangan", "credit", "pengaturan", "bantuan", "aktivitas", "notifikasi",
  ];
  return known.includes(key as SectionKey) ? (key as SectionKey) : "beranda";
}

// Flow:
// 1. Initial load / refresh → layout.tsx reads pathname
// 2. pathToSection(pathname) → returns matching SectionKey
// 3. setSection(sec) → updates Zustand store
// 4. Komponen section membaca dari Zustand → render sesuai section
```

### 4.3 Zustand Store (Global State)

```typescript
// src/lib/store.ts — 137 lines
interface SessionState {
  // Auth
  user: { id, name, email, creditBalance, toneOfVoice, isOnboarded } | null;
  isLoggedIn: boolean;
  
  // Brand
  brands: Brand[];
  activeBrandId: string | null;
  
  // UI
  section: SectionKey;         // "beranda" | "insights" | "produk" | ...
  hydrated: boolean;           // session sudah di-load?
  onboardingOpen: boolean;
  onboardingStep: number;
  
  // Actions
  setSession(s) → hydrates user + brands + sets isLoggedIn
  setSection(s) → updates section + calls _navigate(path)
  setActiveBrand(id) → switches brand
  updateCredit(delta) → modifies user.creditBalance
  setCredit(balance) → sets exact balance
  addBrand(b) → push to brands[], set active
  updateBrand(b) → replace in brands[]
  logout() → clear all, isLoggedIn=false, hydrated=true
  clearBrands() → empty brands, open onboarding
}
```

### 4.4 TanStack Query Patterns

```typescript
// Pattern standar di semua section components:

const { data, isLoading, error, refetch } = useQuery({
  queryKey: ["resource", activeBrand?.id],      // cache key
  queryFn: () => api<Type[]>(`/api/resource?brandId=${activeBrand?.id}`),
  staleTime: 30_000,      // 30 detik sebelum refetch
  enabled: !!activeBrand?.id,  // jangan fetch tanpa brand
  placeholderData: (prev) => prev,  // prevent flash (search, dll)
});

// Mutation pattern:
const mutation = useMutation({
  mutationFn: (body) => api("/api/resource", { method: "POST", json: body }),
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: ["resource"] });
    toast({ title: "Berhasil!" });
    setCredit(balanceAfter);  // sync credit
  },
});
```

### 4.5 Component Tree

```
src/
├── app/
│   ├── page.tsx                          # Root (Login screen atau redirect)
│   ├── layout.tsx                        # Root layout (fonts, ThemeProvider, SW register)
│   └── (dashboard)/
│       └── layout.tsx                    # Dashboard layout (sidebar + topbar + footer)
│
├── components/
│   ├── nw/                               # App-specific (17 files)
│   │   ├── sidebar.tsx                   # Desktop sidebar (248px)
│   │   ├── topbar.tsx                    # Top bar: credit, search, ⌘K, notif, theme
│   │   ├── bottom-tab-bar.tsx            # Mobile bottom nav (5 items)
│   │   ├── login-screen.tsx             # Full page login + 6 fitur preview
│   │   ├── user-menu.tsx                # User dropdown (settings, logout)
│   │   ├── onboarding.tsx               # 3-step brand/product setup wizard
│   │   ├── onboarding-tour.tsx          # 8-step guided tour + spotlight
│   │   ├── command-palette.tsx          # ⌘K: navigasi, aksi cepat, brand
│   │   ├── global-search.tsx            # Cmd+F: search 6 models
│   │   ├── primitives.tsx               # PageHeader, StatCard, SectionCard, EmptyState
│   │   ├── animated-number.tsx          # Count-up animation
│   │   ├── section-transition.tsx       # Framer-motion wrapper
│   │   ├── offline-indicator.tsx        # Offline/online banner
│   │   ├── theme-toggle.tsx             # Light/dark toggle (topbar)
│   │   ├── sidebar-theme-toggle.tsx     # Theme toggle (sidebar)
│   │   ├── theme-provider.tsx           # next-themes wrapper
│   │   └── sw-register.tsx              # Service worker registration
│   │
│   └── ui/                              # 48 shadcn/ui components (button, dialog, dll)
│
├── sections/nw/                          # 14 section components + sub-components + shared toko/
│   ├── beranda-section.tsx              # Dashboard (DashboardHero, stats, goals, recs)
│   ├── insights-section.tsx             # Analytics (AI summary, 6 charts, metrics)
│   ├── produk-section.tsx               # Product CRUD (grid, bulk, detail)
│   ├── riset-section.tsx                # Research (search, pipeline, 4-tab result)
│   ├── konten-section.tsx               # Content (generate 4 types, library)
│   ├── toko-section.tsx                 # Toko shell (3 tabs: Orders, Stok, Pembayaran)
│   │   ├── orders-tab.tsx
│   │   ├── inventory-tab.tsx
│   │   ├── payments-tab.tsx
│   │   ├── store-preview.tsx
│   │   ├── invoice-dialog.tsx
│   │   └── invoice-print.tsx
│   ├── aichat-section.tsx               # AI Chat shell (4 tabs: Inbox, AI Chat, Leads, Campaign)
│   │   └── (shared dari toko/ — file FISIK di toko/ di-import oleh aichat-section)
│   │       ├── inbox-tab.tsx             # Inbox chat + AI reply
│   │       ├── aichat-tab.tsx            # AI Chat templates
│   │       ├── leads-tab.tsx             # Lead pipeline (Kanban)
│   │       ├── campaigns-tab.tsx         # Campaign broadcast
│   │       └── customer-detail-dialog.tsx
│   ├── keuangan-section.tsx             # Keuangan shell (5 tabs)
│   │   ├── ringkasan-tab.tsx            # P&L, charts, tax
│   │   ├── transaksi-tab.tsx            # Transactions CRUD
│   │   ├── piutang-hutang-tab.tsx       # Receivables/payables
│   │   ├── biaya-operasional-tab.tsx    # Operational costs
│   │   └── proyeksi-tab.tsx             # AI projections
│   ├── kalender-section.tsx             # Calendar (monthly grid)
│   ├── credit-section.tsx               # Credit (balance, packages, history)
│   ├── pengaturan-section.tsx           # Settings (7 tabs)
│   ├── bantuan-section.tsx              # Help (FAQ, shortcuts, contact)
│   ├── aktivitas-section.tsx            # Activity timeline
│   └── notifikasi-section.tsx           # Notifications
│
├── lib/                                 # 14 utility modules
│   ├── store.ts                         # Zustand global store
│   ├── constants.ts                     # SectionKey, NAV_ITEMS, CREDIT_RATES, dll
│   ├── api.ts                           # Typed fetch helper api<T>()
│   ├── db.ts                            # Prisma client singleton
│   ├── auth.ts                          # getUserId() from cookie
│   ├── ai.ts                            # llmChat, llmJson, generateImage + logging
│   ├── credit.ts                        # chargeCredit / refundCredit
│   ├── csv.ts                           # CSV export utilities
│   ├── utils.ts                         # cn() tailwind merger
│   ├── query-provider.tsx               # TanStack Query provider
│   ├── image-compress.ts                # Client-side image compression
│   ├── supabase-admin.ts                # Server-only Supabase admin client
│   └── content-blocks.ts               # Content block definitions
│   └── research-normalize.ts            # Research result normalizer
│
├── hooks/                               # Custom hooks
├── utils/supabase/                      # Supabase clients (partially unused — SSO target)
└── ...
```

---

## 5. Data Model & Hubungan Antar Data

### 5.1 Complete Prisma Schema (24 Models)

```
PostgreSQL (prod) / SQLite (dev)
Provider: postgresql (prisma/schema.prisma — 512 lines)
```

### 5.2 Entity Relationship Diagram (ERD)

```
User (1) ───────────< Brand (N)
  │                     │
  │                     ├──< Product (N)
  │                     │     └──< Inventory (N) — untuk varian produk
  │                     │
  │                     ├──< Research (N) ──< Context (N) ──< ContextUsage (N)
  │                     │                              └──< Content (N)
  │                     │     └──< ResearchJob (N) — async job tracking
  │                     │
  │                     ├──< Customer (N) ──< Lead (N)
  │                     │       │               └──< Order (N)
  │                     │       │                     └──< Payment (N)
  │                     │       │                     └──< Transaction (N)
  │                     │       └──< CampaignRecipient (N) ──< Campaign (N)
  │                     │
  │                     ├──< Transaction (N)
  │                     ├──< Receivable (N)
  │                     ├──< Payable (N)
  │                     ├──< OperationalCost (N)
  │                     ├──< Goal (N)
  │                     ├──< InboxMessage (N)
  │                     └──< Notification (N)
  │
  ├──< CreditUsageLog (N)
  ├──< AiPromptLog (N)
  ├──< Goal (N)
  └──< Notification (N)
```

### 5.3 Detail Setiap Model

#### **User** — Auth lokal (mock SSO mwxmarket)
| Field | Type | Keterangan |
|-------|------|------------|
| id | String (cuid) | Primary key |
| email | String (unique) | Unique login identifier |
| password | String | bcrypt hash (default "") |
| name | String | Nama pengguna |
| creditBalance | Int (default 50) | Saldo credit lokal |
| toneOfVoice | String (default "santai_ramah") | Default tone |
| isOnboarded | Boolean (default false) | Onboarding selesai? |
| lastLogin | DateTime | Timestamp login terakhir |

#### **Brand** — Identitas usaha
| Field | Type | Keterangan |
|-------|------|------------|
| id | String (cuid) | |
| userId | String → User | FK |
| name | String | Nama brand |
| slug | String (unique) | Untuk URL toko |
| logoUrl | String? | |
| description | String? | |
| category | String | Makanan & Minuman, Fashion, dll |
| phone | String? | Nomor WA toko |
| toneOfVoice | String (default "santai_ramah") | Per-brand override |
| storeSettings | Json? | { checkoutEnabled, paymentMethods[], dll } |
| isActive | Boolean (default true) | Soft-delete flag |

#### **Product** — Barang/Jasa
| Field | Type | Keterangan |
|-------|------|------------|
| id | String (cuid) | |
| brandId | String → Brand | FK |
| type | String ("barang" | "jasa") |
| name | String | Nama produk |
| price | Int | Harga jual (dalam rupiah) |
| promoPrice | Int? | Harga promo |
| costPrice | Int? | Harga modal → margin otomatis |
| stock | Int? | Sumber stok otoritatif (barang). NULL = jasa |
| minStock | Int? | Batas minimum stok |
| sku | String? | SKU barang |
| description | String? | |
| imageUrl | String? | URL gambar (dari Supabase Storage) |
| isActive | Boolean (default true) | |

**Relasi kunci:** Product → Order.items via JSON parse (items field di Order)

#### **Research** — Hasil riset
| Field | Type | Keterangan |
|-------|------|------------|
| id | String (cuid) | |
| userId | String → User | FK |
| brandId | String → Brand | FK |
| query | String | Query riset |
| intent | String? | basic_research (saat ini) |
| resultJson | String | JSON string dari ResearchResult |
| status | String (default "completed") | pending | completed | failed |
| jobId | String? | Link ke ResearchJob (async) |

**ResearchResult shape:**
```typescript
{
  target_audience: [{ name, demography, platform, pain, trigger }],
  swot: { strengths[], weaknesses[], opportunities[], threats[] },
  competitors: [{ name, price_range, social_activity, marketplace_strength, threat_level }],
  keywords: { hot[], stable[] },
  market_trend: { labels[], values[], stats: { growth_pct, peak } },
  content_recommendations: [{ title, platform, angle, hashtags, best_time }],
  pricing: { market_avg, lowest, highest, recommendation }
}
```

#### **Context** — Jembatan Riset → Aksi (3 per research)
| Field | Type | Keterangan |
|-------|------|------------|
| id | String (cuid) | |
| researchId | String → Research | FK |
| brandId | String → Brand | FK |
| targetModule | String | "konten" | "toko" | "keuangan" |
| contextJson | String | JSON (shape tergantung module) |

**ContextUsage** — Log pemakaian context (reusable — tidak dihapus setelah dipakai)
| Field | Type | Keterangan |
|-------|------|------------|
| contextId | String → Context | FK |
| usedFor | String | konten.generate | toko.apply_price | keuangan.view_projection |
| referenceId | String? | Link ke content/action ID |

#### **Content** — Hasil generate
| Field | Type | Keterangan |
|-------|------|------------|
| id | String (cuid) | |
| brandId | String → Brand | FK |
| productId | String? → Product | FK (SetNull) |
| contextId | String? → Context | FK (SetNull) |
| type | String | "gambar" | "video" | "caption" | "carousel" |
| body | String? | Teks konten |
| assetUrl | String? | URL gambar (disimpan di Supabase Storage) |
| platform | String? | TikTok, Instagram, dll |

#### **Customer** — Pelanggan terpusat (anti ketik ulang)
| Field | Type | Keterangan |
|-------|------|------------|
| id | String (cuid) | |
| brandId | String → Brand | FK |
| name | String | |
| phone | String | Unique per brand (`@@unique([brandId, phone])`) |
| email | String? | |
| totalOrders | Int (default 0) | Counter (diupdate manual) |
| totalSpent | Int (default 0) | Counter |

#### **Order** — Pesanan
| Field | Type | Keterangan |
|-------|------|------------|
| id | String (cuid) | |
| brandId | String → Brand | FK |
| customerId | String? → Customer | FK |
| leadId | String? → Lead | FK |
| items | String | JSON: [{ productId, name, qty, price }] |
| totalAmount | Int | Total pesanan |
| status | String | Baru | Diproses | Dikirim | Selesai | Dibatalkan |
| resiNumber | String? | Nomor resi |
| shippingCourier | String? | Kurir |
| shippingCost | Int? | Ongkos kirim |

**Business Logic:**
- **Barang:** stok di-decrement saat create, di-restore saat Dibatalkan
- **Jasa:** tidak perlu shipping/resi, tidak punya stok

#### **Payment** — Pembayaran
| Field | Type | Keterangan |
|-------|------|------------|
| id | String (cuid) | |
| orderId | String → Order | FK |
| amount | Int | |
| method | String (default "transfer") | |
| status | String | Menunggu | Diterima | Ditolak |
| proofImageUrl | String? | Bukti transfer (future) |

**Business Logic:** Saat `status = "Diterima"` → auto-create Transaction (income + HPP snapshot)

#### **Transaction** — Catatan keuangan
| Field | Type | Keterangan |
|-------|------|------------|
| id | String (cuid) | |
| userId | String → User | FK |
| brandId | String → Brand | FK |
| productId | String? → Product | FK |
| customerId | String? → Customer | FK |
| orderId | String? → Order | FK |
| type | String | "income" | "expense" |
| category | String | penjualan | bahan_baku | operasional | marketing | gaji | lainnya |
| amount | Int | |
| costAmount | Int? | HPP snapshot (costPrice × qty) |
| quantity | Int? | |
| unitPrice | Int? | Harga satuan (manual entry) |
| description | String? | |
| date | DateTime | Tanggal transaksi (bukan createdAt) |

#### **Campaign** — Broadcast promosi
| Field | Type | Keterangan |
|-------|------|------------|
| id | String (cuid) | |
| brandId | String → Brand | FK |
| channel | String | "wa" | "email" |
| name | String | Nama campaign |
| subject | String? | Subject (email) |
| body | String | Isi pesan |
| status | String | draft | scheduled | sent | failed |

#### **Goal** — Target bisnis
| Field | Type | Keterangan |
|-------|------|------------|
| id | String (cuid) | |
| brandId | String → Brand | FK |
| userId | String → User | FK |
| type | String | revenue | orders | products | customers | content | research |
| period | String | monthly | quarterly | yearly |
| target | Float | Nilai target |
| current | Float (default 0) | Progress saat ini |
| startDate | DateTime | |
| endDate | DateTime | |
| status | String | active | achieved | failed | paused |

#### **Notification** — Notifikasi sistem
| Field | Type | Keterangan |
|-------|------|------------|
| id | String (cuid) | |
| userId | String → User | FK |
| brandId | String? → Brand | FK |
| type | String | low_stock | payment_pending | stale_lead | dll |
| title | String | |
| message | String | |
| severity | String (default "info") | info | warning | success | error |
| readAt | DateTime? | Null = belum dibaca |

#### **CreditRate** — Tarif credit (11 action keys)
| Field | Type |
|-------|------|
| actionKey | String (unique) |
| creditCost | Int |
| module | String |

#### **CreditUsageLog** — Audit trail credit
| Field | Type |
|-------|------|
| userId | String → User |
| actionKey | String |
| creditCost | Int |
| balanceBefore | Int |
| balanceAfter | Int |
| status | "charged" | "refunded" |

#### **AiPromptLog** — Log semua AI call
| Field | Type |
|-------|------|
| userId / brandId | String? |
| feature | String (research, content_caption, dll) |
| ai | String (vertex) |
| model | String (gemini-3.5-flash) |
| service | String (Marketing Strategi, dll) |
| prompt / response | Text |
| prompt/completion/total tokens | Int? |
| success | Boolean |
| error | String? |
| latencyMs | Int? |

---

## 6. API Reference: Semua Endpoint

### 6.1 Auth & Session (4 endpoints)

| Method | Path | Function | Deskripsi |
|--------|------|----------|-----------|
| POST | `/api/init` | Create/get user, set cookie | Entry point setelah login |
| POST | `/api/auth/login` | bcrypt verify + set cookie | Login |
| POST | `/api/auth/register` | bcrypt hash + create user | Register |
| POST | `/api/logout` | Clear cookie | Logout |

### 6.2 Dashboard & Insights (3 endpoints)

| Method | Path | Function |
|--------|------|----------|
| GET | `/api/dashboard?brandId=X` | Stats, recommendations, recent research (9 parallel queries) |
| GET | `/api/insights?brandId=X` | 12 parallel queries: revenue trend, top products, customer growth, lead funnel, content, sales-by-day, metrics, activity |
| POST | `/api/insights/summary` | AI summary (3 credit) with fallback |

### 6.3 Brands (2 endpoints)

| Method | Path | Function |
|--------|------|----------|
| GET/POST | `/api/brands` | List all / create brand |
| PATCH/DELETE | `/api/brands/[id]` | Update / soft-delete (last brand protected) |

### 6.4 Products (3 endpoints)

| Method | Path | Function |
|--------|------|----------|
| GET/POST | `/api/products?brandId=X` | List / create |
| PATCH/DELETE | `/api/products/[id]` | Update / hard-delete |
| GET | `/api/products/[id]/details` | Sales stats, stock movements, related content |

### 6.5 Research (4 endpoints)

| Method | Path | Function |
|--------|------|----------|
| POST | `/api/research` | Run full pipeline (5 credit) |
| GET | `/api/research?brandId=X` | List results |
| GET | `/api/research/[id]` | Single result + 3 contexts |
| GET | `/api/contexts?brandId=X` | List contexts |

### 6.6 Content (4 endpoints)

| Method | Path | Function |
|--------|------|----------|
| GET/POST | `/api/content?brandId=X` | List / generate (2-6 credit) |
| GET/DELETE | `/api/content/[id]` | Single / hard-delete |
| PATCH | `/api/content/[id]` | Edit konten + regenerate |

### 6.7 AI Chat (shared sub-components — di bawah /aichat route)

| Method | Path | Function | Shared dari Toko? |
|--------|------|----------|-------------------|
| GET/POST | `/api/inbox?brandId=X` | List messages / send | ✅ Ya |
| POST | `/api/inbox/ai-reply` | AI auto-reply (1 credit) | ✅ Ya |
| POST | `/api/inbox/reply` | Manual reply | ✅ Ya |
| GET | `/api/inbox/templates` | Template statis AI Chat | ✅ Ya |
| GET/POST | `/api/leads?brandId=X` | List / create lead | ✅ Ya |
| PATCH | `/api/leads/[id]` | Update stage/notes | ✅ Ya |
| GET/POST | `/api/campaigns?brandId=X` | List / create (8-10 credit) | ✅ Ya |
| PATCH/DELETE | `/api/campaigns/[id]` | Update / delete | ✅ Ya |

### 6.9 Toko (10 endpoints — terpisah dari AI Chat)

| Method | Path | Function |
|--------|------|----------|
| GET/POST | `/api/orders?brandId=X` | List / create (stock decrement) |
| PATCH | `/api/orders/[id]` | Update status, shipping |
| GET/POST | `/api/payments?orderId=X` | List / create payment |
| POST | `/api/payments/[id]/verify` | Accept/reject (auto-transaction) |
| POST | `/api/payments/[id]/ai-verify` | AI-powered payment verification |
| GET/POST | `/api/inventory?brandId=X` | List / update stock |
| GET/POST | `/api/shipping?brandId=X` | Shipping management |
| GET/POST | `/api/customers?brandId=X` | List / create |
| GET | `/api/customers/[id]` | Detail (orders, transactions, campaigns, receivables) |
| GET/POST | `/api/shipping?brandId=X` | Shipping management |

### 6.11 Keuangan (12 endpoints)

| Method | Path | Function |
|--------|------|----------|
| GET/POST | `/api/transactions?brandId=X` | List / create |
| GET | `/api/transactions/summary` | P&L summary |
| GET/POST | `/api/receivables?brandId=X` | List / create |
| PATCH | `/api/receivables/[id]` | Mark as paid → auto-income |
| GET/POST | `/api/payables?brandId=X` | List / create |
| PATCH | `/api/payables/[id]` | Mark as paid → auto-expense |
| GET/POST | `/api/operational-costs?brandId=X` | List / create |
| POST | `/api/keuangan/projection` | AI projection (3 credit) |
| GET | `/api/keuangan/contexts?brandId=X` | List finance contexts |
| POST | `/api/keuangan/extract-receipt` | OCR receipt dari foto (multimodal AI) |
| GET | `/api/keuangan/import-template` | AI mapping CSV header → field |
| POST | `/api/keuangan/import-template/confirm` | Confirm + execute import |

### 6.13 Goals (3 endpoints)

| Method | Path | Function |
|--------|------|----------|
| GET/POST | `/api/goals?brandId=X` | List / create |
| PATCH/DELETE | `/api/goals/[id]` | Update / delete |
| POST | `/api/goals/refresh` | Recompute `current` from actual data |

### 6.14 Analytics (4 endpoints)

| Method | Path | Function |
|--------|------|----------|
| GET | `/api/analytics/clv?brandId=X` | Customer Lifetime Value analysis |
| GET | `/api/analytics/cohort?brandId=X` | Cohort retention (M0-M6) |
| GET | `/api/analytics/seasonal?brandId=X` | Seasonal/monthly trends |
| GET | `/api/analytics/products?brandId=X` | Product performance (BCG matrix) |

### 6.15 Brand Settings (2 endpoints)

| Method | Path | Function |
|--------|------|----------|
| PATCH | `/api/brands/[id]/store-settings` | Update toko online settings |
| POST | `/api/products/[id]/image` | Upload product image (Supabase Storage) |

### 6.16 Public Store (4 endpoints — tanpa auth)

| Method | Path | Function |
|--------|------|----------|
| GET | `/api/public/store/[slug]` | Get public brand + products |
| GET | `/api/public/store/[slug]/settings` | Get store settings |
| POST | `/api/public/order` | Create order from public store |
| GET | `/api/public/order/[orderId]` | Get public order status |
| POST | `/api/public/order/[orderId]/payment-proof` | Upload payment proof |

| Method | Path | Function |
|--------|------|----------|
| GET/POST | `/api/goals?brandId=X` | List / create |
| PATCH/DELETE | `/api/goals/[id]` | Update / delete |
| POST | `/api/goals/refresh` | Recompute `current` from actual data |

### 6.18 Utility (7 endpoints)

| Method | Path | Function |
|--------|------|----------|
| GET | `/api/activity?brandId=X` | Unified timeline (8 models) |
| GET | `/api/search?brandId=X&q=...` | Global search (6 models) |
| GET | `/api/kalender?brandId=X&month=&year=` | Calendar events (5 models) |
| GET/POST | `/api/notifications?userId=X` | CRUD notifications |
| POST | `/api/demo/seed` | Seed demo data (idempotent) |
| POST | `/api/demo/reset` | Clear demo data |
| POST | `/api/upload` | File upload (Supabase Storage) |

---

## 7. Navigasi & Routing

### 7.1 Struktur Routing File-based

```
src/app/
├── page.tsx                                    # Route: / — Auth landing
├── layout.tsx                                  # Root layout (fonts, theme, SW)
│
├── (dashboard)/                                # Route Group — shared shell
│   ├── layout.tsx                              # Sidebar + Topbar + Footer
│   │
│   ├── beranda/page.tsx                        # Route: /beranda
│   ├── insights/page.tsx                       # Route: /insights
│   ├── produk/page.tsx                         # Route: /produk
│   ├── riset/page.tsx                          # Route: /riset
│   ├── konten/page.tsx                         # Route: /konten
│   ├── toko/page.tsx                           # Route: /toko
│   ├── aichat/page.tsx                         # Route: /aichat
│   ├── keuangan/page.tsx                       # Route: /keuangan
│   ├── pengaturan/page.tsx                     # Route: /pengaturan
│   ├── bantuan/page.tsx                        # Route: /bantuan
│   ├── aktivitas/page.tsx                      # Route: /aktivitas
│   ├── credit/page.tsx                         # Route: /credit
│   └── notifikasi/page.tsx                     # Route: /notifikasi
│
└── t/                                          # Route Group — PUBLIC (no auth)
    ├── [slug]/page.tsx                          # Route: /t/[slug] — Toko Online
    └── [slug]/checkout/
        ├── page.tsx                            # Route: /t/[slug]/checkout
        └── [orderId]/page.tsx                  # Route: /t/[slug]/checkout/[id]
```

### 7.2 Section Map — Route vs Component vs Sidebar

| # | Route | SectionKey | File (page.tsx) | Component | Sidebar |
|---|-------|------------|-----------------|-----------|---------|
| 1 | `/beranda` | `beranda` | `(dashboard)/beranda/page.tsx` | `<BerandaSection />` | ✅ Primary #1 |
| 2 | `/insights` | `insights` | `(dashboard)/insights/page.tsx` | `<InsightsSection />` | ✅ Primary #2 |
| 3 | `/produk` | `produk` | `(dashboard)/produk/page.tsx` | `<ProdukSection />` | ✅ Primary #3 |
| 4 | `/riset` | `riset` | `(dashboard)/riset/page.tsx` | `<RisetSection />` | ✅ Primary #4 |
| 5 | `/konten` | `konten` | `(dashboard)/konten/page.tsx` | `<KontenSection />` | ✅ Primary #5 |
| 6 | `/toko` | `toko` | `(dashboard)/toko/page.tsx` | `<TokoSection />` | ✅ Primary #6 |
| 7 | `/aichat` | `aichat` | `(dashboard)/aichat/page.tsx` | `<AiChatSection />` | ✅ Primary #7 |
| 8 | `/keuangan` | `keuangan` | `(dashboard)/keuangan/page.tsx` | `<KeuanganSection />` | ✅ Primary #8 |
| 9 | `/credit` | `credit` | `(dashboard)/credit/page.tsx` | `<CreditSection />` | ⚡ Topbar |
| 10 | `/notifikasi` | `notifikasi` | `(dashboard)/notifikasi/page.tsx` | `<NotifikasiSection />` | 🔔 Topbar |
| 11 | `/pengaturan` | `pengaturan` | `(dashboard)/pengaturan/page.tsx` | `<PengaturanSection />` | Profile Menu |
| 12 | `/bantuan` | `bantuan` | `(dashboard)/bantuan/page.tsx` | `<BantuanSection />` | Profile Menu |
| 13 | `/aktivitas` | `aktivitas` | `(dashboard)/aktivitas/page.tsx` | `<AktivitasSection />` | Profile Menu |
| — | *(Zustand only)* | `kalender` | *(tidak ada — via Zustand store)* | `<KalenderSection />` | ⚙️ Dalam menu |
| — | `/t/[slug]` | *(toko publik)* | `t/[slug]/page.tsx` | `<StoreClient />` | ❌ Public |

### 7.3 Dual Navigation Flow

```
┌───────────────────┐          ┌───────────────────────┐
│  SIDEBAR CLICK     │          │  BROWSER BACK/FORWARD │
│  (Zustand legacy)   │          │  (Next.js Router)     │
└────────┬──────────┘          └───────────┬───────────┘
         │                                 │
         ▼                                 ▼
  setSection("produk")              pathname changes
         │                                 │
         ▼                                 ▼
  _navigate("/produk")              layout.tsx effect
         │                          pathToSection()
         ▼                                 │
  router.push("/produk")                    ▼
         │                          setSection("produk")
         ▼                                 │
  Next.js renders                          ▼
  (dashboard)/produk/page.tsx       render <ProdukSection />
         │
         ▼
  <ProdukSection /> di-render
  di dalam <main>{children}</main>
```

### 7.4 Nav Items Array (constants.ts)

```typescript
export const NAV_ITEMS = [
  { key: "beranda", label: "Beranda", icon: "📊" },     // #1
  { key: "insights", label: "Insights", icon: "📈" },   // #2
  { key: "produk", label: "Produk", icon: "📦" },       // #3
  { key: "riset", label: "Riset", icon: "🔍" },          // #4
  { key: "konten", label: "Konten", icon: "📝" },       // #5
  { key: "toko", label: "Toko", icon: "🛒" },           // #6
  { key: "aichat", label: "AI Chat", icon: "💬" },      // #7
  { key: "keuangan", label: "Keuangan", icon: "💰" },   // #8
];

export const PROFILE_MENU = [
  { key: "aktivitas", label: "Aktivitas", icon: "📋" },  // Profile #1
  { key: "pengaturan", label: "Pengaturan", icon: "⚙️" }, // Profile #2
  { key: "bantuan", label: "Bantuan", icon: "❓" },      // Profile #3
];
```

### 7.3 Keyboard Shortcuts

| Shortcut | Action | Component |
|----------|--------|-----------|
| `⌘K` / `Ctrl+K` | Command Palette | `command-palette.tsx` |
| `⌘F` / `Ctrl+F` | Global Search (override browser) | `global-search.tsx` |
| `Esc` | Close dialog / skip tour | Semua dialog |
| `←` `→` | Tour prev/next | `onboarding-tour.tsx` |
| `Tab` | Navigate form fields | Browser default |
| `Enter` | Confirm / submit | Browser default |

---

## 8. Credit System

### 8.1 Data Flow

```
User Action → API Route
  ↓
chargeCredit(userId, actionKey)
  ↓
db.$transaction([
  db.user.update(creditBalance -= cost),
  db.creditUsageLog.create({ status: "charged" })
])
  ↓
If AI fails → refundCredit(userId, actionKey)
  ↓
db.$transaction([
  db.user.update(creditBalance += cost),
  db.creditUsageLog.create({ status: "refunded" })
])
  ↓
Frontend: setCredit(balanceAfter) → Zustand → Credit badge updates
```

### 8.2 Packages

| Package | Credits | Price | Harga per Credit | Bonus |
|---------|---------|-------|-----------------|-------|
| Starter | 50 | Rp 49.000 | Rp 980 | 0 |
| Growth | 120 | Rp 99.000 | Rp 825 | 10 |
| Pro | 300 | Rp 249.000 | Rp 830 | 30 |
| Scale | 800 | Rp 599.000 | Rp 749 | 100 |

### 8.3 Top-Up Mock

Saat ini top-up adalah **mock** — langsung menambah balance tanpa integrasi payment:
```typescript
POST /api/credit/topup
Body: { userId, packageId }
→ db.user.update(creditBalance += package.credits)
→ db.creditUsageLog.create({ status: "charged", referenceId: "topup_..." })
```

---

## 9. PWA & Service Worker

### 9.1 Files

| File | Fungsi |
|------|--------|
| `public/manifest.json` | PWA manifest (standalone, teal theme, 3 icons) |
| `public/sw.js` | Vanilla SW (190 lines, route-aware caching) |
| `public/icon.svg` | Scalable icon (teal gradient + "NW") |
| `public/icon-192.png` | Raster 192×192 |
| `public/icon-512.png` | Raster 512×512 |
| `src/components/nw/sw-register.tsx` | SW registration (production only) |
| `src/components/nw/offline-indicator.tsx` | Offline/online banner + toast |

### 9.2 Caching Strategies

| Resource | Strategy | Behavior |
|----------|----------|----------|
| API calls (`/api/*`) | Network-first | Fresh when online, cached fallback when offline |
| Navigations | Cache-first + background refresh | Instant load, updates on next visit |
| Static (JS/CSS/images) | Cache-first | Next.js hashed filenames = safe |
| Fonts | Cache-first | Rarely change |

### 9.3 SW Activation Rules

- Hanya register saat `NODE_ENV === "production"` (dev: SW akan cache chunk HMR)
- `skipWaiting()` + `clients.claim()` untuk aktivasi instan
- Cache name `nextwhiz-v1`: versi bump = cache baru, yang lama di-delete

---

## 10. Cara Baca & Kontribusi untuk AI/Developer

### 10.1 File Entry Points per Tugas

```
Tugas: "Menambah fitur baru"
Langkah:
  1. Database: prisma/schema.prisma → bun run db:push
  2. API Route: src/app/api/{resource}/route.ts
  3. Lib helper: src/lib/{helper}.ts
  4. Section Component: src/sections/nw/{nama}-section.tsx
  5. Constants: src/lib/constants.ts → SectionKey + NAV_ITEMS
  6. **Page route: src/app/(dashboard)/{nama}/page.tsx** → import + export section component
  7. Primitives: components/nw/primitives.tsx

Tugas: "Memperbaiki AI fallback"
  File: src/app/api/content/route.ts   (fallbackCaption, dll)
  File: src/app/api/research/_pipeline.ts  (deriveFallbackResult)
  File: src/lib/ai.ts  (generateImage, llmChat, llmJson)

Tugas: "Menelusuri alur data X"
  Mulai dari URL: src/app/(dashboard)/{section}/page.tsx → src/sections/nw/{modul}-section.tsx
  → API call: api<T>(`/api/{resource}`)
  → Route handler: src/app/api/{resource}/route.ts
  → DB query: db.{model}.findMany(...)
  → Response → TanStack Query cache → UI render

Tugas: "Debug credit issue"
  File: src/lib/credit.ts  (chargeCredit, refundCredit)
  File: src/lib/constants.ts  (CREDIT_RATES, CREDIT_COST)
  File: src/app/api/{resource}/route.ts  (setCredit / updateCredit)

Tugas: "Debug state / navigation"
  File: src/lib/store.ts  (Zustand store)
  File: src/app/(dashboard)/layout.tsx  (dashboard shell)
```

### 10.2 Aturan Penting (Jangan Dilanggar)

1. **Jangan hardcode hex color** — selalu pakai CSS variables dari `globals.css`:
   ```
   ✓ bg-background, text-foreground, border-border
   ✗ bg-#F6F4EF, text-#0A2647
   ```

2. **Jangan skip fallback AI** — setiap LLM call harus punya `try/catch` + fallback:
   ```
   ✓ try { return await llmJson(prompt) } catch { return fallbackFunction() }
   ✗ return await llmJson(prompt)  (akan 500 kalau token unavailable)
   ```

3. **Jangan mutate Prisma tanpa validasi ownership** — setiap API route harus:
   ```
   ✓ const userId = await getUserId(req);
     const brand = await db.brand.findUnique({ where: { id: brandId } });
     if (!brand || brand.userId !== userId) return 401;
   ```

4. **Credit charge selalu sebelum aksi**, refund kalau gagal:
   ```
   ✓ charge() → do work → catch → refund()
   ✗ do work → charge()  (kalau gagal, credit tetap kepotong)
   ```

5. **Jangan hapus last brand** — guard `brands.length > 1` di UI + API.

### 10.3 Pola Kode Umum

#### Server Route Pattern
```typescript
// src/app/api/{resource}/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = req.nextUrl;
  const brandId = searchParams.get("brandId");
  if (!brandId) return NextResponse.json({ error: "brandId required" }, { status: 400 });
  // verify ownership
  const brand = await db.brand.findUnique({ where: { id: brandId } });
  if (!brand || brand.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // query
  const data = await db.resource.findMany({ where: { brandId }, orderBy: { createdAt: "desc" }, take: 50 });
  return NextResponse.json(data);
}
```

#### Client Component Pattern
```tsx
"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { PageHeader, StatCard, SectionCard, EmptyState } from "@/components/nw/primitives";

export function MySection() {
  const { brands, activeBrandId, setSection } = useAppStore();
  const activeBrand = brands.find(b => b.id === activeBrandId);
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["resource", activeBrand?.id],
    queryFn: () => api<Type[]>(`/api/resource?brandId=${activeBrand?.id}`),
    staleTime: 30_000,
    enabled: !!activeBrand?.id,
  });

  const createMut = useMutation({
    mutationFn: (body) => api("/api/resource", { method: "POST", json: body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["resource"] });
      toast({ title: "Berhasil!" });
    },
  });

  if (isLoading) return <div className="grid grid-cols-1 gap-4">{/* Skeletons */}</div>;
  if (error) return <div className="text-center py-12">Gagal memuat. <button onClick={refetch}>Coba Lagi</button></div>;
  if (!data?.length) return <EmptyState icon="📦" title="Belum ada data." cta="Tambah Baru" onClick={() => {}} />;

  return <div>{/* content */}</div>;
}
```

### 10.4 Konvensi File & Naming

| Konvensi | Aturan |
|----------|--------|
| File prefix `_` | Not a route (dilewati Next.js App Router) — contoh: `_pipeline.ts` |
| API Route | `src/app/api/{resource}/route.ts` |
| Section Component | `src/sections/nw/{nama}-section.tsx` |
| Sub-component | `src/sections/nw/{modul}/{nama}.tsx` |
| Lib helper | `src/lib/{helper}.ts` |
| UI Component | `src/components/nw/{component}.tsx` (app-specific) |
| shadcn/ui | `src/components/ui/{component}.tsx` (48 components) |
| TypeScript | `strict: true` tapi `noImplicitAny: false` |
| Bahasa | Selalu Bahasa Indonesia di UI, error messages, copy |
| Colors | CSS variables di `globals.css`, jangan hardcode |

### 10.5 Environment Variables (`.env.local`)

```
DATABASE_URL="file:../../db/custom.db"  (dev: SQLite)
DATABASE_URL="postgresql://..."         (prod: PostgreSQL)
AI_MODULE_URL="https://ai-module.mwxmarket.ai"
AI_MODULE_KEY="..."
TAVILY_API_KEY="..."
SUPABASE_URL="..."
SUPABASE_SERVICE_ROLE_KEY="..."
```

---

> **Dokumentasi ini dibuat untuk developer dan AI agent — semua file source of truth ada di codebase.**
> **Jika ada yang kurang jelas, baca file terkait langsung.**
>
> _Dibuat dengan ❤️ oleh MWI (Solo Founder) · support@usahaku.ai_
