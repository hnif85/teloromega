# The Next Whiz — Logic Flow (Alur Lengkap Step-by-Step)

> **Versi:** 0.1.1 · **Tanggal:** 10 Juli 2026\
> **Basis:** menggantikan v3.0. Penomoran di-reset ke 0.1.x untuk mencerminkan status produk yang sebenarnya (MVP awal, belum rilis).

***

## 📌 Changelog dari v3.0

| #  | Perubahan                                                                          | Alasan                                                                                                                                                                    |
| -- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1  | `subscription_tier`**&#x20;dihapus** — auth hanya membawa jumlah credit            | Tidak ada konsep tier; semua gating berbasis saldo credit. Lebih sederhana.                                                                                               |
| 2  | **Context di-generate otomatis saat riset selesai** (3 sekaligus)                  | Sebelumnya context baru lahir saat user klik → dashboard tidak punya rekomendasi untuk ditampilkan. Sekarang begitu riset kelar, dashboard langsung penuh aksi siap-klik. |
| 3  | **Context bersifat reusable** — `consumed_at` diganti event log                    | Satu riset bisa dipakai berkali-kali. Context tidak hilang setelah dipakai, cuma diberi badge "sudah dipakai".                                                            |
| 4  | **Tabel baru&#x20;**`shared.content`                                               | Konten hasil generate sekarang disimpan → bisa dipakai ulang di Toko Online & Campaign, tidak generate ulang (hemat credit).                                              |
| 5  | **Tabel baru&#x20;**`shared.customers`                                             | Pelanggan jadi entitas share → deteksi repeat order, riwayat, target campaign. Tidak ketik ulang.                                                                         |
| 6  | **Field&#x20;**`cost_price`**&#x20;di produk**                                     | Margin, laba rugi, dan proyeksi Keuangan terisi otomatis — bukan input manual.                                                                                            |
| 7  | **Satu sumber stok** — `products.stock` otoritatif; `inventory` hanya untuk varian | Menghapus drift/bug sinkronisasi dua tempat.                                                                                                                              |
| 8  | **Income diakui saat Payment = "Diterima"**, bukan saat order dibuat               | Laporan keuangan tidak over-stated; sinkron dengan status pembayaran.                                                                                                     |
| 9  | **Campaign lewat WhatsApp broadcast** (email opsional)                             | Prospek masuk lewat WA → kampanye keluar lewat WA juga. Tidak ada mismatch channel.                                                                                       |
| 10 | **Slug brand auto-suffix** kalau bentrok                                           | Dua "Keripik Ani" tidak tabrakan di URL toko online.                                                                                                                      |
| 11 | **Order jasa tanpa langkah shipping/resi**                                         | Jasa tidak dikirim. Cabang alur dipisah.                                                                                                                                  |
| 12 | **Aturan credit: mwxmarket = otoritatif, lokal cache + idempotency**               | Saldo tidak tampak beda-beda; aman dari race/kegagalan parsial.                                                                                                           |
| 13 | **Query riset pre-fill dari produk** (bukan cuma kategori)                         | Personalisasi murah tanpa arsitektur riset-per-produk penuh.                                                                                                              |

***

## 🗺️ Arsitektur Keseluruhan

```javascript
┌──────────────────────────────────────────────────────────────────────────┐
│                        THE NEXT WHIZ PLATFORM                              │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │              AUTH LAYER: SSO mwxmarket.ai                             │ │
│  │  Login/register via mwxmarket.ai → return JWT → Next Whiz session   │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │              CREDIT LAYER (inherited from mwxmarket.ai)              │ │
│  │  credit_balance otoritatif di mwxmarket · lokal = cache             │ │
│  │  top-up via Doku / mwxmarket — sistem existing                       │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │              MVP: ALUR DATA DARI BRAND                                │ │
│  │                                                                      │ │
│  │  ═══════════════════════════════════════════════════════════════    │ │
│  │  LANGKAH 1 — BRAND (wajib, fondasi semua)                           │ │
│  │  ═══════════════════════════════════════════════════════════════    │ │
│  │                                                                      │ │
│  │  ┌──────────────────────────────────────────────────────────┐      │ │
│  │  │              SETUP BRAND (Onboarding)                      │      │ │
│  │  │  • Nama brand, logo, deskripsi                            │      │ │
│  │  │  • Kategori usaha (Makanan, Fashion, Jasa, dll)           │      │ │
│  │  │  ▼  ▼  ▼  INSERT ke shared.brands                        │      │ │
│  │  └────────────────────────┬─────────────────────────────────┘      │ │
│  │                           │                                         │ │
│  │          ┌────────────────┴────────────────┐                        │ │
│  │          ▼                                 ▼                        │ │
│  │  ════════════════════════    ════════════════════════               │ │
│  │  JALUR A: PRODUK              JALUR B: RISET                        │ │
│  │  (input manual user)          (mandiri; query bisa pre-fill        │ │
│  │                                dari nama produk — MVP)              │ │
│  │  ════════════════════════    ════════════════════════               │ │
│  │          │                                 │                        │ │
│  │          ▼                                 ▼                        │ │
│  │  ┌────────────────────┐    ┌──────────────────────────────────┐    │ │
│  │  │ INPUT PRODUK        │    │ INPUT RISET                       │    │ │
│  │  │ Barang / Jasa       │    │ query → data real → LLM sintesis  │    │ │
│  │  │ (+ cost_price)      │    │ ▼ INSERT shared.research          │    │ │
│  │  │ ▼ INSERT products   │    └──────────────┬───────────────────┘    │ │
│  │  │   (+ inventory kalau│                   │                        │ │
│  │  │    varian)          │                   ▼                        │ │
│  │  └─────────┬───────────┘    ┌──────────────────────────────────┐    │ │
│  │            │                │ CONTEXT ENGINE (auto, 3 sekaligus)│    │ │
│  │            │                │ research → context_json           │    │ │
│  │            │                │ (konten + toko + keuangan)        │    │ │
│  │            │                │ ▼ INSERT shared.context (×3)      │    │ │
│  │            │                └──────────────┬───────────────────┘    │ │
│  │            └───────────────┬───────────────┘                        │ │
│  │                            │                                        │ │
│  │             ┌──────────────┼──────────────┐                         │ │
│  │             ▼              ▼              ▼                         │ │
│  │       ┌──────────┐ ┌──────────┐ ┌──────────────┐                  │ │
│  │       │  KONTEN  │ │   TOKO   │ │  KEUANGAN    │                  │ │
│  │       │ ide riset│ │rekomend. │ │ proyeksi     │                  │ │
│  │       │ + produk │ │harga/stok│ │ margin (pakai│                  │ │
│  │       │ user     │ │+ produk  │ │ cost_price)  │                  │ │
│  │       │ →content │ │ user     │ │ + transaksi  │                  │ │
│  │       └──────────┘ └──────────┘ └──────────────┘                  │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │                    SHARED DATA LAYER                                   │ │
│  │  users │ brands │ products │ inventory │ research │ context           │ │
│  │  content │ customers │ leads │ orders │ payments │ campaigns          │ │
│  │  transactions │ receivables │ payables │ operational_costs           │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

### Sidebar Menu:

```javascript
┌──────────────┐
│  THE NEXT    │
│    WHIZ      │
│──────────────│
│ 📊 Beranda   │
│ 🔍 Riset     │
│ 📝 Konten    │
│ 🛒 Toko      │
│ 💰 Keuangan  │
│──────────────│
│ ⚡ Credit    │
│ ⚙️ Pengaturan │
│──────────────│
│ 🏪 Brand:     │
│ [Keripik Ani▼]│  ← dropdown multi-brand
│──────────────│
│ 👤 Ibu Ani   │
└──────────────┘
```

***

## PHASE 0: AUTH — SSO mwxmarket.ai

> **Tidak ada form register/login terpisah.** Semua auth memakai sistem existing mwxmarket.ai.

### Step 0.1 — Login Flow

```javascript
USER                                  NEXT WHIZ                    mwxmarket.ai
────                                  ─────────                    ────────────

1. Buka nextwhiz.id
                              ──▶   2. Cek session (JWT cookie)
                                      ├── Valid? YA → Dashboard
                                      └── TIDAK → redirect ▼
                              ──▶   3. Redirect ke:
                                      mwxmarket.ai/auth/login
                                      ?redirect_uri=nextwhiz.id/callback
                                                             ──▶  4. User login/register
                                                             ◀──  5. Return JWT + user data
                              ◀──   6. Terima callback:
                                      • Simpan JWT di cookie
                                      • Extract: user_id, email, name
                                      • UPSERT user + cache credit
                                      ▼
                              ──▶   7. Redirect:
                                      • First time? → Onboarding (Phase 1)
                                      • Returning? → Dashboard (Phase 4)
```

### Step 0.2 — Data yang Diterima dari mwxmarket.ai

| Field            | Source           | Dipakai untuk                           |
| ---------------- | ---------------- | --------------------------------------- |
| `user_id`        | JWT claim        | Primary key user di Next Whiz           |
| `email`          | JWT claim        | Identitas user                          |
| `name`           | JWT claim        | Nama tampilan di sidebar & dashboard    |
| `credit_balance` | API mwxmarket.ai | Saldo credit (dipakai untuk semua aksi) |

> **Catatan:** tidak ada `subscription_tier`. Gating fitur sepenuhnya berbasis saldo credit — kalau credit cukup, aksi jalan; kalau tidak, modal top-up.

### Step 0.3 — Sync User ke Next Whiz DB

| Aspek               | Detail                                                                             |
| ------------------- | ---------------------------------------------------------------------------------- |
| **Kapan**           | Setiap kali user login via SSO callback                                            |
| **System action**   | `UPSERT` ke `shared.users`. Update `credit_balance` (cache), `name`, `last_login`. |
| **First-time user** | `INSERT` user row. Belum ada brand → redirect onboarding (Phase 1).                |
| **Data minimal**    | `{ user_id, email, name, credit_balance, last_login }`                             |

***

## PHASE 1: SETUP BRAND (Wajib — First-Time User)

> User baru pertama login → belum punya brand → wajib setup brand sebelum bisa akses apa pun.

### Step 1.1 — Form Setup Brand

| Aspek                | Detail                                                                                                                                                    |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **User sees**        | Halaman onboarding: Welcome + form brand                                                                                                                  |
| **Field**            | • Nama brand * (wajib) • Logo (opsional) • Deskripsi singkat • Kategori usaha * (wajib): Makanan & Minuman, Fashion, Kerajinan, Jasa, Kecantikan, Lainnya |
| **System action**    | **INSERT** ke `shared.brands`                                                                                                                             |
| **Slug**             | Auto dari nama. Kalau slug sudah dipakai user lain → auto-suffix (`keripik-ani-2`). Slug dipakai untuk URL toko online, jadi wajib unik global.           |
| **After save**       | Lanjut ke Phase 2: Produk                                                                                                                                 |
| **⚠️ Tone of voice** | **Tidak ditanyakan saat onboarding.** Ditanyakan nanti saat user pertama kali generate konten. Default: "santai & ramah".                                 |

***

## PHASE 2: PRODUK — Barang atau Jasa

> Setelah brand, user bisa tambah produk. BARANG (ada stok) atau JASA (deskripsi saja).\
> **Opsional** — bisa skip dan langsung riset, tapi disarankan diisi.

### Step 2.1 — Pilih Tipe Produk

| Aspek         | Detail                                                                                    |
| ------------- | ----------------------------------------------------------------------------------------- |
| **User sees** | 📦 **Barang** — "Saya jualan produk fisik" · 💼 **Jasa** — "Saya menawarkan jasa/layanan" |
| **Why beda**  | Barang perlu tracking stok. Jasa tidak — cukup deskripsi, dan tidak masuk alur shipping.  |

### Step 2.2 — Form Barang

| Field                | Wajib? | Detail                                                                             |
| -------------------- | ------ | ---------------------------------------------------------------------------------- |
| Nama Produk          | ✅      | "Keripik Pedas Level 3"                                                            |
| Harga Jual (Rp)      | ✅      | 15.000                                                                             |
| **Harga Modal (Rp)** | ❌      | 9.000 — **kalau diisi, margin & laba rugi otomatis terhitung** di Keuangan & Riset |
| Stok Awal            | ✅      | 50                                                                                 |
| Stok Minimum         | ❌      | 10 (alert kalau stok ≤ ini)                                                        |
| Deskripsi            | ❌      | AI pakai untuk generate konten                                                     |
| Foto Produk          | ❌      | Tampil di katalog & toko online                                                    |

**System action:** `INSERT` ke `shared.products` (`type='barang'`). `inventory` hanya di-INSERT kalau produk punya varian.

### Step 2.3 — Form Jasa

| Field                | Wajib? | Detail                             |
| -------------------- | ------ | ---------------------------------- |
| Nama Jasa            | ✅      | "Paket Foto Produk UMKM"           |
| Harga Jual (Rp)      | ✅      | 250.000                            |
| **Harga Modal (Rp)** | ❌      | 80.000 — untuk hitung margin jasa  |
| Deskripsi            | ✅      | "Sesi foto 2 jam, 20 foto edit..." |
| Foto Portofolio      | ❌      | Contoh hasil                       |

**System action:** `INSERT` ke `shared.products` (`type='jasa'`, `stock=NULL`, `sku=NULL`). Tidak insert ke inventory. Tidak masuk alur shipping.

### Step 2.4 — Data Model Produk

```sql
shared.products (
  id UUID PK,
  brand_id UUID FK,
  type TEXT CHECK(type IN ('barang','jasa')),  -- ★ pembeda
  name TEXT NOT NULL,
  price INT NOT NULL,        -- harga jual
  cost_price INT NULL,       -- ★ harga modal → margin/laba otomatis
  stock INT NULL,            -- ★ SUMBER STOK OTORITATIF (barang). NULL untuk jasa
  min_stock INT NULL,
  sku TEXT NULL,
  description TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP
)

shared.inventory (           -- ★ HANYA kalau produk punya varian
  id UUID PK,                -- (mis. ukuran/rasa). Tanpa varian, tabel ini
  product_id UUID FK,        -- tidak dipakai; products.stock yang berlaku.
  variant TEXT NOT NULL,
  stock INT,
  updated_at TIMESTAMP
)
```

> **Aturan stok (satu sumber):** produk tanpa varian → `products.stock` satu-satunya sumber. Produk dengan varian → `products.stock` = SUM(`inventory.stock`) (derived, di-recompute tiap perubahan varian). Tidak pernah ada dua angka stok yang di-update independen.

### Step 2.5 — Tambah Lagi / Skip

| User action                | Result                                                  |
| -------------------------- | ------------------------------------------------------- |
| **"+ Tambah Produk Lagi"** | Kembali ke Step 2.1                                     |
| **"Simpan & Lanjut"**      | Lanjut ke Phase 3: Riset Pertama                        |
| **"Skip, nanti aja"**      | Langsung ke Dashboard (produk bisa ditambah kapan saja) |

***

## PHASE 3: RISET PERTAMA (Disarankan — Bisa Skip)

> Setelah brand + produk (kalau ada), sistem menyarankan riset pertama.\
> Riset **tidak** dianalisis per produk user (masih MVP), tapi **query bisa di-pre-fill dari nama produk**.

### Step 3.1 — Riset Suggestion Screen

| Aspek                 | Detail                                                                                                                                                                                                                                                                      |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **User sees**         | Card: "✨ Yuk riset pasar dulu! Biar tau tren, kompetitor, dan peluang buat [nama brand] kamu."                                                                                                                                                                              |
| **Suggested queries** | Kalau **ada produk** → pre-fill pakai nama produk: "Tren [nama produk]", "Harga pasaran [nama produk]", "Kompetitor [nama produk]". Kalau **belum ada produk** → fallback ke kategori brand: "Tren [kategori] 2026", "Keyword trending [kategori]". Plus search bar manual. |
| **User action**       | Klik suggestion / ketik manual → "Riset"                                                                                                                                                                                                                                    |

### Step 3.2 — Pipeline Riset

| Step                           | System Action                                                                                                                                                                                                 |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Cek credit**              | `credit_balance >= credit_rates['riset.pasar']`? Kalau tidak → modal top-up (lihat Phase 5).                                                                                                                  |
| **2. Klasifikasi intent**      | LLM: `market_trend` / `competitor_analysis` / `keyword_research` / `pricing`                                                                                                                                  |
| **3. Kumpulkan data real**     | **Parallel:** Google Trends (pytrends) + Tavily (web + social) + marketplace scrape (Shopee/Tokopedia)                                                                                                        |
| **4. Kirim ke LLM**            | Prompt: data real + konteks brand (kategori, nama, tone) → SWOT, persona, kompetitor, keyword, rekomendasi                                                                                                    |
| **5. Simpan riset**            | `INSERT` ke `shared.research` (`status='completed'`, `result_json`)                                                                                                                                           |
| **6. Potong credit**           | Potong via API mwxmarket + `INSERT` `credit_usage_log` (lihat aturan idempotency Phase 5)                                                                                                                     |
| **7. ★ Auto-generate context** | Context Engine langsung bikin **3 context** (konten, toko, keuangan) dari riset ini → `INSERT` `shared.context` ×3. **Tanpa potong credit** (turunan gratis). Ini yang mengisi Rekomendasi Aksi di dashboard. |

### Step 3.3 — Hasil Riset (UI)

| Section                      | Isi                                                                | Sumber Data                |
| ---------------------------- | ------------------------------------------------------------------ | -------------------------- |
| **Target Audiens**           | 3 persona (nama, demografi, platform, pain, trigger)               | LLM sintesis               |
| **SWOT**                     | 4 kuadran                                                          | LLM dari kompetitor + tren |
| **Kompetitor**               | Tabel: nama, harga, sosmed activity, marketplace strength, ancaman | Scrape + web               |
| **Keyword Trending**         | Cloud tags (hot/stable)                                            | Tavily social              |
| **Tren Pasar**               | Bar chart 6 bulan + stats                                          | Google Trends + Tavily     |
| **Rekomendasi Konten**       | 3-4 ide (angle, persona, hashtag, platform)                        | LLM                        |
| **Rekomendasi Harga & Stok** | Perbandingan harga pasar, saran (generik, bukan per produk)        | Scrape                     |
| **Sticky CTA**               | "Simpan" · "Bikin Konten" · "Atur Toko" · "Proyeksi Keuangan"      | —                          |

### Step 3.4 — Setelah Riset

| User action        | Result                                                                            |
| ------------------ | --------------------------------------------------------------------------------- |
| **"Ke Dashboard"** | Ke Phase 4. Riset + 3 context sudah tersimpan → Rekomendasi Aksi langsung muncul. |
| **"Bikin Konten"** | Langsung ke modul Konten dengan context konten aktif                              |
| **"Atur Toko"**    | Langsung ke modul Toko dengan context toko aktif                                  |

***

## PHASE 4: DASHBOARD (Beranda — Home Base)

> Landing page tiap login. Semua ringkasan per brand aktif. Navigasi ke mana saja dari sini.

### Step 4.1 — First-Time vs Returning

| Kondisi                                      | Yang Muncul                                     |
| -------------------------------------------- | ----------------------------------------------- |
| **First-time, lengkap (brand+produk+riset)** | Dashboard penuh + Rekomendasi Aksi dari context |
| **First-time, skip produk & riset**          | Dashboard kosong + prompt onboarding            |
| **Returning**                                | Data terbaru brand aktif                        |

### Step 4.2 — Dashboard Cards (State Penuh)

```javascript
┌────────────┬────────────┬────────────┬────────────┐
│  RISET     │  PRODUK    │  PENJUALAN │  CREDIT    │
│  Tersedia  │  Aktif     │  Bln Ini   │  Tersisa   │
│     3      │    12      │ Rp 2.4jt   │    47      │
└────────────┴────────────┴────────────┴────────────┘
┌────────────┬────────────┬────────────┐
│  LEADS     │  ORDERS    │  KONTEN    │
│  Aktif     │  Pending   │  Dibuat    │
│     5      │     3      │     8      │
└────────────┴────────────┴────────────┘
```

| Card              | Data Source                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------------- |
| Riset Tersedia    | `shared.research` COUNT WHERE brand_id = active                                                         |
| Produk Aktif      | `shared.products` COUNT WHERE brand_id = active AND is_active                                           |
| Penjualan Bln Ini | `shared.transactions` SUM amount WHERE type='income' AND bulan ini                                      |
| Credit Tersisa    | API mwxmarket.ai (`credit_balance`), fallback cache `users.credit_balance`                              |
| Leads Aktif       | `shared.leads` COUNT WHERE stage NOT IN ('Closed','Deal')                                               |
| Orders Pending    | `shared.orders` COUNT WHERE status IN ('Baru','Diproses')                                               |
| **Konten Dibuat** | `shared.content`**&#x20;COUNT WHERE brand_id = active** ← dihitung dari konten sungguhan, bukan context |

### Step 4.3 — Riset Terbaru + Rekomendasi Aksi (2 Kolom)

**Kolom Kiri — Riset Terbaru:**

| Riset                                    | Meta                                  |
| ---------------------------------------- | ------------------------------------- |
| "Tren cemilan pedas 2026"                | 2 jam lalu · 3 kompetitor · 5 keyword |
| "Analisis kompetitor: Maicih vs Basreng" | Kemarin                               |

**Kolom Kanan — Rekomendasi Aksi** (dari context yang **belum pernah dipakai**; context yang sudah dipakai tetap ada tapi diberi badge "sudah dipakai"):

| Aksi                                      | Dari               | Tombol       |
| ----------------------------------------- | ------------------ | ------------ |
| "Bikin konten TikTok: angle siap pakai"   | Context → Konten   | **Buat**     |
| "Turunkan harga Keripik Lv3 ke Rp 13.500" | Context → Toko     | **Review**   |
| "Tambah stok +20 pcs"                     | Context → Toko     | **Terapkan** |
| "Proyeksi: diskon 10% → laba tetap naik"  | Context → Keuangan | **Lihat**    |
| "Follow-up 3 leads > 3 hari"              | Toko → Leads       | **Hubungi**  |

### Step 4.4 — Dashboard Kosong (First-Time)

| Kondisi              | Yang Ditampilkan                                        |
| -------------------- | ------------------------------------------------------- |
| **Belum ada produk** | "📦 Kamu belum punya produk..." → **"+ Tambah Produk"** |
| **Belum ada riset**  | "🔍 Kamu belum pernah riset..." → **"Mulai Riset"**     |
| **Credit habis**     | "⚡ Credit kamu habis..." → **"Top Up Credit"**          |

***

## CROSS-MODULE DATA FLOW: Satu Data, Dipakai di Mana Saja

> **Ini yang bikin Next Whiz berbeda.** Data tidak diketik ulang. Satu input, mengalir ke banyak modul.

### 🔄 PRODUCT LIFECYCLE

```javascript
USER INPUT: "Keripik Pedas Level 3, jual 15.000, modal 9.000, stok 50"
         │
         ▼
  ┌──────────────────────────────────────────────────────────────────────┐
  │  shared.products                                                      │
  │  { id:"p_001", name, price:15000, cost_price:9000, stock:50,        │
  │    type:"barang", brand_id:"b_001" }                                 │
  └───────┬──────────────┬──────────────┬──────────────┬─────────────────┘
          ▼              ▼              ▼              ▼
   ┌──────────┐  ┌──────────┐  ┌──────────────┐  ┌──────────────┐
   │  KONTEN  │  │   TOKO   │  │   KEUANGAN   │  │  (FUTURE)    │
   │ pilih    │  │ katalog  │  │ margin =     │  │  RISET       │
   │ produk → │  │ toko     │  │ price-cost   │  │ "posisi Lv3  │
   │ AI baca  │  │ online   │  │ = 6.000/pcs  │  │  vs kompetit"│
   │ nama,    │  │ + stok   │  │ laba rugi    │  │              │
   │ harga,   │  │ + order  │  │ per produk   │  │              │
   │ deskripsi│  │ catat    │  │ otomatis     │  │              │
   │ → simpan │  │ product  │  │              │  │              │
   │ ke       │  │ _id      │  │              │  │              │
   │ content  │  │          │  │              │  │              │
   └────┬─────┘  └────┬─────┘  └──────┬───────┘  └──────────────┘
        └─────────────┼──────────────┘
                      ▼
              ┌──────────────┐
              │  DASHBOARD   │
              │ Produk Aktif │
              │ Penjualan    │
              │ Stok Menipis │
              └──────────────┘
```

### 🔄 BRAND LIFECYCLE

```javascript
USER INPUT: "Keripik Mbak Ani", kategori "Makanan & Minuman"
         │
         ▼
  shared.brands { id:"b_001", name, category, slug:"keripik-ani", tone_of_voice }
         │
   ┌─────┼───────────┬───────────┬────────────┐
   ▼     ▼           ▼           ▼            ▼
 RISET KONTEN       TOKO      KEUANGAN    SIDEBAR
 auto- AI baca      nama →    semua       brand
 suggest nama+tone  judul     laporan     switcher →
 query  → gaya      toko      filter      UI reload
        bahasa      online    brand_id    brand_id
                    + slug URL
```

### 🔄 CONTEXT LIFECYCLE (auto-generate + reusable)

```javascript
RISET: "tren camilan pedas"  ──▶  shared.research (result_json)
         │
         ▼  ★ OTOMATIS saat riset selesai (tanpa klik, tanpa credit)
  ┌──────────────── CONTEXT ENGINE ────────────────┐
  │  1 riset → 3 context sekaligus:                 │
  └──┬──────────────────┬──────────────────┬────────┘
     ▼                  ▼                  ▼
 context:konten    context:toko      context:keuangan
 4 ide, angle,     harga pasar,      proyeksi margin
 hashtag, waktu    produk trending,  (pakai cost_price),
 posting, platform rekomendasi umum  budget, warning
     │                  │                  │
     ▼                  ▼                  ▼
 User generate     User "Terapkan"   User "Lihat" →
 konten (bisa      harga/stok        catat budget
 berkali-kali)     (bisa berulang)   pengeluaran
     │                  │                  │
     └──────────────────┼──────────────────┘
                        ▼
             Catat di shared.context_usage (event log)
             Context TIDAK dihapus — dashboard beri
             badge "sudah dipakai", tetap bisa dipakai lagi
```

### 🔄 TRANSAKSI LIFECYCLE (income diakui saat pembayaran diterima)

```javascript
ORDER DI TOKO: "Keripik Lv3, 2 pcs, Rp 30.000"
         │
         ▼
  ┌──────────────────────────────────────────────┐
  │ 1. TOKO: shared.orders                       │
  │    status: "Baru" → "Diproses"                │
  │    (BELUM ada transaksi income di sini)       │
  └────────────┬─────────────────────────────────┘
               ▼
  ┌──────────────────────────────────────────────┐
  │ 2. PAYMENT: shared.payments                   │
  │    status "Menunggu" → user verifikasi →      │
  │    "Diterima"                                │
  └────────────┬─────────────────────────────────┘
               ▼  ★ hanya saat Payment = "Diterima"
  ┌──────────────────────────────────────────────┐
  │ 3. KEUANGAN: shared.transactions              │
  │    type="income", amount=30000,              │
  │    product_id="p_001", category="penjualan"  │
  │    → HPP otomatis = cost_price×qty (18.000)  │
  └────────────┬─────────────────────────────────┘
               ▼  saat order "Diproses"/fulfillment
  ┌──────────────────────────────────────────────┐
  │ 4. STOK: products.stock 50 → 48               │
  │    (order dibatalkan → stok balik)            │
  └────────────┬─────────────────────────────────┘
               ▼
  ┌──────────────────────────────────────────────┐
  │ 5. LAPORAN + DASHBOARD otomatis               │
  │    Laba Rugi: laba +12.000 (30k-18k HPP)     │
  │    Arus Kas: +30.000 · Penjualan Bln Ini +30k│
  └──────────────────────────────────────────────┘
```

### 🔄 CUSTOMER LIFECYCLE (entitas baru — anti ketik ulang)

```javascript
LEAD masuk (chat WA) ──▶ shared.leads (stage "Baru")
         │  saat stage → "Deal"
         ▼
  shared.customers { id, brand_id, name, phone, first_order_at, total_orders, total_spent }
         │
   ┌─────┼──────────────┬──────────────┐
   ▼     ▼              ▼              ▼
 ORDER  KEUANGAN     CAMPAIGN       (FUTURE) RISET
 link   piutang per  target "repeat  segmentasi
 cust.  pelanggan    order" / WA     pelanggan
 _id                 broadcast
```

### 🔄 DATA FLOW MAP — Siapa Pakai Data Siapa

```javascript
╔════════════╦═══════╦════════╦═══════╦══════════╦═══════════╗
║  DATA ↓    ║ RISET ║ KONTEN ║ TOKO  ║ KEUANGAN ║ DASHBOARD ║
╠════════════╬═══════╬════════╬═══════╬══════════╬═══════════╣
║ Brand      ║  ✅   ║   ✅   ║  ✅   ║    ✅    ║    ✅     ║
║ Produk     ║ ⚠️FUT ║   ✅   ║  ✅   ║    ✅    ║    ✅     ║
║ (+cost)    ║       ║ bahan  ║katalog║ margin   ║ count     ║
║ Research   ║  —    ║   ✅   ║  ✅   ║    ✅    ║    ✅     ║
║ Context    ║  —    ║   ✅   ║  ✅   ║    ✅    ║    ✅     ║
║ Content    ║  ❌   ║   —    ║  ✅   ║    ❌    ║    ✅     ║
║ (konten)   ║       ║        ║ toko+ ║          ║ count     ║
║            ║       ║        ║ campgn║          ║           ║
║ Customers  ║ ⚠️FUT ║   ❌   ║  ✅   ║    ✅    ║    ✅     ║
║ Orders     ║  ❌   ║   ❌   ║  —    ║    ✅    ║    ✅     ║
║ Transaksi  ║  ❌   ║   ❌   ║  ❌   ║    —     ║    ✅     ║
╚════════════╩═══════╩════════╩═══════╩══════════╩═══════════╝
  ✅ dipakai   ❌ tidak   — sumber data   ⚠️FUT future
```

***

## PHASE 5: CREDIT SYSTEM (Inherited from mwxmarket.ai)

> **Credit tidak dibangun dari nol.** Saldo otoritatif ada di mwxmarket.ai. Next Whiz hanya **membaca saldo** dan **memotong sesuai pemakaian**. Top-up via Doku / mwxmarket existing.

### Step 5.1 — Prinsip Sumber Kebenaran

| Aspek                 | Aturan                                                                                                                                                                                                |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Sumber otoritatif** | `credit_balance` di mwxmarket.ai. **Selalu** dicek live via API sebelum aksi.                                                                                                                         |
| **Cache lokal**       | `shared.users.credit_balance` hanya cache untuk tampilan cepat/fallback. Tidak pernah jadi dasar keputusan potong.                                                                                    |
| **Idempotency**       | Tiap aksi punya `reference_id` unik. Potong credit dikirim dengan idempotency key → kalau retry, tidak dobel potong.                                                                                  |
| **Urutan aman**       | (1) cek saldo → (2) potong via API mwxmarket (dapat `balance_after`) → (3) baru jalankan aksi → (4) log. Kalau aksi gagal setelah potong → **refund** via API. Kalau potong gagal → aksi tidak jalan. |

### Step 5.2 — Credit Rates (Next Whiz config)

```javascript
Action                  │ Credit Cost
─────────────────────── │ ────────────
riset.pasar             │ 5
riset.kompetitor        │ 8
riset.keyword           │ 3
konten.gambar           │ 4
konten.video            │ 6
konten.caption          │ 2
konten.carousel         │ 5
toko.ai_chat_reply      │ 1
toko.campaign_wa        │ 8   (WA broadcast)
toko.campaign_email     │ 10  (opsional)
keuangan.proyeksi       │ 3
```

> Context creation = **0 credit** (turunan gratis dari riset).

### Step 5.3 — Alur Pemotongan Credit

```javascript
USER KLIK AKSI ──▶ CEK credit_balance live (API mwxmarket.ai)
                        │
                 ┌──────┴──────┐
                 ▼             ▼
                CUKUP       TIDAK CUKUP
                 │             │
                 ▼             ▼
      1. Potong via API   Modal: "Credit kurang.
         (idempotency key) Butuh X credit.
      2. INSERT log        Top up sekarang?"
      3. Jalankan aksi     ├─ "Top Up" → redirect
         (gagal? refund)   │   halaman credit mwxmarket
      4. Return hasil      └─ "Batal"
```

### Step 5.4 — Data Model Credit (Next Whiz side only)

```sql
shared.credit_rates (
  id UUID PK, action_key TEXT UNIQUE, action_name TEXT,
  credit_cost INT, module TEXT, is_active BOOLEAN, created_at TIMESTAMP
)

shared.credit_usage_log (
  id UUID PK, user_id UUID, brand_id UUID,
  action_key TEXT, credit_cost INT,
  balance_before INT, balance_after INT,   -- dari API mwxmarket.ai
  reference_id UUID,                        -- ID riset/konten/order (idempotency)
  status TEXT,                              -- 'charged' | 'refunded'
  created_at TIMESTAMPTZ
)
```

### Step 5.5 — Halaman Credit

| Aspek                   | Detail                                                                                        |
| ----------------------- | --------------------------------------------------------------------------------------------- |
| **User sees**           | Saldo live (API mwxmarket) di tengah. Daftar paket credit (dari mwxmarket).                   |
| **Top-up**              | Klik paket → redirect halaman pembayaran Doku / mwxmarket (existing).                         |
| **Riwayat**             | Tabel dari `credit_usage_log`: tanggal, aksi, credit dipakai, sisa, status (termasuk refund). |
| **Return after top-up** | mwxmarket update balance → Next Whiz refresh via API.                                         |

***

## PHASE 6: CONTEXT ENGINE

> Research mentah → Context terstruktur per modul. **Auto-generate 3 context** saat riset selesai. Context **reusable** (tidak sekali pakai). **MVP: context tidak meng-attach produk user** — user pilih produk sendiri saat eksekusi.

### Step 6.1 — Auto-Generation (tanpa klik user)

| Aspek       | Detail                                                                                                                                                     |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Trigger** | Otomatis di akhir pipeline riset (Step 3.2 #7).                                                                                                            |
| **Credit**  | 0 — gratis.                                                                                                                                                |
| **System**  | Baca `research.result_json` → mapping → **INSERT** 3 baris `shared.context` (`target_module` = konten/toko/keuangan).                                      |
| **Reuse**   | Context tidak dihapus setelah dipakai. Pemakaian dicatat di `shared.context_usage`. Dashboard tandai "sudah dipakai" tapi tetap tampil untuk dipakai lagi. |

### Step 6.2 — Context untuk Konten

```json
{
  "research_id": "r_001",
  "target_module": "konten",
  "brand_context": { "nama": "Keripik Mbak Ani", "kategori": "Makanan & Minuman", "tone": "santai_ramah" },
  "konten_recommendations": [
    { "judul": "Tantangan Level Pedas", "platform": "tiktok", "angle": "Berani coba level 3?", "hashtags": ["#pedasbanget","#cemilansiang"], "waktu_posting": "12-14 WIB" },
    { "judul": "Cemilan Hemat Anak Kos", "platform": "instagram", "angle": "Rp 10rb udah rame-rame", "hashtags": ["#jajananmurah"] }
  ],
  "keyword_suggestions": ["#cemilansiang", "#pedasbanget", "#jajananmurah"],
  "note": "User memilih produk sendiri saat generate. Produk tidak di-attach di MVP."
}
```

### Step 6.3 — Context untuk Toko

```json
{
  "research_id": "r_001",
  "target_module": "toko",
  "harga_pasar": { "rata_rata": "Rp 12.000-14.000", "termurah": "Rp 10.000", "termahal": "Rp 18.000" },
  "produk_trending": ["keripik pedas level 3", "basreng original", "makaroni pedas"],
  "rekomendasi_umum": "Fokus TikTok & Instagram. Jaga harga di range Rp 12-14rb."
}
```

### Step 6.4 — Context untuk Keuangan

```json
{
  "research_id": "r_001",
  "target_module": "keuangan",
  "proyeksi_margin": {
    "skenario": "Turunkan harga Keripik Lv3 dari 15.000 ke 13.500",
    "asumsi_modal": "pakai cost_price produk (9.000) kalau tersedia",
    "margin_sebelum": "6.000/pcs (40%)",
    "margin_sesudah": "4.500/pcs (33%)",
    "estimasi_volume": "+25-30% (dari tren)",
    "kesimpulan": "Margin turun 7pp tapi laba absolut naik karena volume."
  },
  "rekomendasi_budget": { "produksi_tambahan": "20 pcs", "estimasi_biaya": "Rp 180.000" },
  "warning": "Kalau volume tidak naik ≥15%, laba justru turun."
}
```

***

## PHASE 7A: KONTEN (CreateWhiz)

### Step 7A.1 — Masuk Modul Konten (Pertama Kali: Setup Tone of Voice)

| Aspek                  | Detail                                                                                                                                                                                                           |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **First-time**         | Sebelum generate, ditanya **Tone of Voice**: 😄 Santai & Ramah · 💼 Profesional · 🔥 Enerjik & Bold · 🤗 Hangat & Personal · 😂 Humoris · 🎓 Edukatif. Default "Santai & Ramah". Bisa skip & ubah di Pengaturan. |
| **Why di sini**        | Tone hanya relevan saat generate konten.                                                                                                                                                                         |
| **Disimpan**           | `shared.brands.tone_of_voice` → dipakai semua generate berikutnya.                                                                                                                                               |
| **Context Active Bar** | Kalau ada context: `📎 Riset: "tren cemilan pedas" → Angle: "lebih pedas" · Tone: casual · Platform: TikTok`                                                                                                     |
| **Tanpa context**      | Tetap bisa generate — prompt generik (brand + produk + tone).                                                                                                                                                    |

### Step 7A.2 — Generate Konten

| Aspek              | Detail                                                                                                                                                    |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **User sees**      | Panel kiri: pilih tipe (Gambar/Video/Caption/Carousel) + **pilih produk dari list brand** + angle (context/manual). Panel kanan: preview.                 |
| **Credit**         | Potong sesuai `credit_rates` (2-6).                                                                                                                       |
| **System**         | Baca context (kalau ada) + produk + brand → prompt AI → hasil.                                                                                            |
| **★ Simpan**       | Hasil di-**INSERT ke&#x20;**`shared.content` (dengan `product_id`, `context_id`, `type`, `body`/`asset_url`). Catat pemakaian context di `context_usage`. |
| **Output & reuse** | Konten tersimpan → bisa dipasang di Toko Online, dipakai di Campaign, muncul di Dashboard. Tidak perlu generate ulang.                                    |

***

## PHASE 7B: TOKO (SalesWhiz) — ALUR LENGKAP

### 8 Modul Toko

| # | Modul                  | Fungsi Singkat                                                           |
| - | ---------------------- | ------------------------------------------------------------------------ |
| 1 | **Inbox Terpadu**      | WA + Telegram masuk satu dashboard                                       |
| 2 | **AI Chat & Template** | Auto-reply AI, template respons, link toko online                        |
| 3 | **Lead Management**    | Pipeline Kanban (Baru → Deal), auto-capture dari chat                    |
| 4 | **Order Management**   | Lifecycle order, input resi, tracking                                    |
| 5 | **Payment**            | Verifikasi (Menunggu/Diterima/Ditolak) → **memicu income di Keuangan**   |
| 6 | **Shipping**           | Kurir, cek ongkir, lacak — **hanya untuk produk barang**                 |
| 7 | **Inventory**          | Auto-update `products.stock` per order, min-stock alert                  |
| 8 | **Campaign**           | **WA broadcast** (utama) / email (opsional), template, jadwal, analytics |

### Alur Chat → Order → Pembayaran

```javascript
PELANGGAN                 AI/SYSTEM                       USER (PEMILIK)
─────────                 ─────────                       ──────────────
1. Chat WA:
   "Keripik lv3 berapa?"
                          2. AI intent → template
                             "Halo Kak! Rp 15.000.
                             Toko: [link]"
3. "Order 2, kirim
   Bandung"
                          4. AI auto-create LEAD
                             stage "Negosiasi"            5. Lihat lead baru
                             + balasan ongkir
6. "OK transfer"
                          7. AI kirim info rekening       8. Lead → "Deal"
                                                             → auto-create CUSTOMER
                                                             → buat ORDER (status Baru)
9. Upload bukti TF
                          10. AI konfirmasi terima        11. Verifikasi PAYMENT
                                                             → "Diterima"
                                                             ★ income tercatat di
                                                                Keuangan (bukan
                                                                sebelumnya)
                                                          12. Barang? input resi →
                                                             status "Dikirim"
                                                             (Jasa? skip langkah ini)
                          13. AI kirim update resi/status
```

### Toko Online (Auto-generated)

| Aspek           | Detail                                                                                                                                       |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **URL**         | `tokoku.nextwhiz.id/{brand-slug}` (slug unik, auto-suffix kalau bentrok)                                                                     |
| **Isi**         | Logo, nama brand, deskripsi, grid produk (foto/nama/harga), tombol "Chat via WA". **Foto bisa pakai konten dari&#x20;**`shared.content`**.** |
| **Auto-update** | Setiap tambah/edit produk.                                                                                                                   |

***

## PHASE 7C: KEUANGAN (FinanceWhiz)

### Fungsi Utama

| Fungsi                    | Detail                                                                        |
| ------------------------- | ----------------------------------------------------------------------------- |
| **Catat pemasukan**       | Auto dari Payment "Diterima" (link ke order + customer). Manual juga bisa.    |
| **Catat pengeluaran**     | Bahan baku, operasional, marketing.                                           |
| **Piutang & Hutang**      | Piutang per customer (COD/tempo). Jatuh tempo reminder.                       |
| **Laba Rugi**             | Auto: Pendapatan − HPP (dari `cost_price`) − Biaya = Laba. Bulanan & kuartal. |
| **Neraca**                | Aset / Liabilitas / Ekuitas.                                                  |
| **Arus Kas**              | Warning kalau negatif.                                                        |
| **Pajak**                 | Estimasi PPh 0.5% UMKM + PPN.                                                 |
| **Proyeksi dari Context** | Margin forecast + budget (Step 6.4), pakai `cost_price`.                      |

> **HPP otomatis:** karena produk punya `cost_price`, setiap transaksi income tahu modalnya → laba rugi & margin tidak perlu input manual. Produk tanpa `cost_price` → margin ditandai "belum lengkap" dan minta user isi modal.

***

## 📊 FULL DATA MODEL (Schema `shared`)

```sql
-- User (sync dari mwxmarket.ai — TANPA subscription_tier)
shared.users               (user_id UUID PK, email TEXT, name TEXT,
                            credit_balance INT,        -- cache; otoritatif di mwxmarket
                            last_login TIMESTAMPTZ)

-- Brand & Product
shared.brands              (id UUID PK, user_id FK, name, slug UNIQUE, logo_url,
                            description, category, tone_of_voice, is_active, created_at)
shared.products            (id UUID PK, brand_id FK, type TEXT CHECK(type IN('barang','jasa')),
                            name, price INT, cost_price INT NULL,   -- ★ modal
                            stock INT NULL, min_stock INT NULL, sku TEXT NULL,
                            description, image_url, is_active, created_at)
shared.inventory           (id UUID PK, product_id FK, variant TEXT NOT NULL, stock INT, updated_at)
                            -- ★ hanya untuk produk bervarian

-- Research & Context
shared.research            (id UUID PK, user_id, brand_id, query TEXT, result_json JSONB,
                            status TEXT, created_at)
shared.context             (id UUID PK, research_id FK, target_module TEXT,
                            context_json JSONB, created_at)     -- ★ tanpa consumed_at
shared.context_usage       (id UUID PK, context_id FK, brand_id, used_for TEXT,
                            reference_id UUID, created_at)      -- ★ event log, reusable

-- ★ Content (baru) — konten hasil generate, bisa dipakai ulang
shared.content             (id UUID PK, brand_id FK, product_id FK NULL, context_id FK NULL,
                            type TEXT,           -- gambar/video/caption/carousel
                            body TEXT NULL, asset_url TEXT NULL,
                            created_at)

-- ★ Customers (baru) — anti ketik ulang, lintas modul
shared.customers           (id UUID PK, brand_id FK, name, phone, email TEXT NULL,
                            first_order_at TIMESTAMPTZ NULL, total_orders INT DEFAULT 0,
                            total_spent INT DEFAULT 0, created_at)

-- Toko
shared.inbox_messages      (id UUID PK, brand_id FK, channel, from_number, message_text,
                            direction, replied_by, lead_id FK NULL, created_at)
shared.leads               (id UUID PK, brand_id FK, customer_id FK NULL, name, phone,
                            source_channel, stage, notes, assigned_to, last_contacted_at, created_at)
shared.orders              (id UUID PK, brand_id FK, customer_id FK NULL, lead_id FK NULL,
                            items JSONB, total_amount INT, status,
                            resi_number NULL, shipping_courier NULL, shipping_cost INT NULL,
                            notes, created_at)   -- shipping* NULL untuk order jasa
shared.payments            (id UUID PK, order_id FK, amount INT, method, status,
                            proof_image_url, verified_at, created_at)
                            -- status "Diterima" → memicu INSERT transactions
shared.campaigns           (id UUID PK, brand_id FK, channel TEXT,   -- 'wa' | 'email'
                            name, subject NULL, body TEXT, scheduled_at, sent_at, status, created_at)
shared.campaign_recipients (id UUID PK, campaign_id FK, customer_id FK NULL, lead_id FK NULL,
                            contact TEXT,        -- phone (WA) atau email
                            sent BOOL, delivered_at NULL, opened_at NULL, clicked_at NULL)

-- Keuangan
shared.transactions        (id UUID PK, user_id, brand_id, product_id FK NULL, customer_id FK NULL,
                            order_id FK NULL, type TEXT, category, amount INT,
                            cost_amount INT NULL,  -- ★ HPP snapshot (cost_price×qty)
                            quantity INT NULL, description, date DATE, created_at)
shared.receivables         (id UUID PK, user_id, brand_id, customer_id FK NULL, customer_name,
                            amount INT, due_date DATE, status, created_at)
shared.payables            (id UUID PK, user_id, brand_id, supplier_name, amount INT,
                            due_date DATE, status, created_at)
shared.operational_costs   (id UUID PK, user_id, brand_id, category, amount INT,
                            recurring BOOL, date DATE, created_at)

-- Credit (Next Whiz side only — balance dari mwxmarket.ai API)
shared.credit_rates        (id UUID PK, action_key TEXT UNIQUE, action_name, credit_cost INT,
                            module, is_active, created_at)
shared.credit_usage_log    (id UUID PK, user_id, brand_id, action_key, credit_cost INT,
                            balance_before INT, balance_after INT, reference_id UUID,
                            status TEXT, created_at)   -- 'charged' | 'refunded'
```

***

## 🔁 INTER-MODULE COMMUNICATION MAP

```javascript
mwxmarket.ai ──(SSO)──▶ JWT + user data ──▶ Next Whiz session
mwxmarket.ai ──(API)──▶ credit_balance ──▶ Next Whiz credit check (otoritatif)
mwxmarket.ai ◀──(API, idempotent)── potong/refund credit ── Next Whiz tiap aksi
mwxmarket.ai ◀──(Doku/mwxmarket webhook)── top-up ─▶ credit_balance += N

RISET ──(INSERT)──▶ shared.research
     └──(Context Engine, OTOMATIS)──▶ shared.context ×3 (konten/toko/keuangan)
                                           │
              ┌────────────────────────────┼────────────────────────────┐
              ▼                            ▼                            ▼
           KONTEN                        TOKO                       KEUANGAN
       INSERT shared.content       INSERT leads/orders/         (baca context)
       INSERT context_usage        payments/campaigns
              │                          │
              │                          ▼ Payment "Diterima"
              │                    INSERT shared.transactions (income + HPP)
              │                    UPDATE products.stock (fulfillment)
              │                    Lead "Deal" → INSERT shared.customers
              ▼
     Content dipakai di TOKO (foto toko online) & CAMPAIGN

KEUANGAN ──(INSERT)──▶ transactions, receivables, payables, operational_costs
CREDIT   ──(INSERT)──▶ credit_usage_log (charged/refunded)

SEMUA ──(read)──▶ shared.brands, shared.products (filter brand_id)
DASHBOARD ──(aggregate)──▶ semua tabel, filter per brand_id
```

***

## 📋 EDGE CASES

| Skenario                                       | Handling                                                                                            |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| **SSO token expired**                          | Redirect mwxmarket re-auth. Simpan intended URL, balik setelah login.                               |
| **User belum setup brand**                     | Redirect onboarding Phase 1. Tidak bisa akses modul.                                                |
| **Credit habis di tengah aksi**                | Cek SEBELUM proses (saldo live). Tidak cukup → modal top-up. Tidak ada partial execution.           |
| **Potong credit sukses tapi aksi gagal**       | Refund via API mwxmarket (idempotency key). Log status='refunded'.                                  |
| **Retry aksi yang sama**                       | Idempotency key (`reference_id`) → tidak dobel potong.                                              |
| **Research gagal / timeout**                   | Error state + retry. Credit di-refund. Context tidak dibuat.                                        |
| **Produk jasa**                                | Tidak masuk inventory, tidak masuk alur shipping. Order jasa: `resi/courier/shipping_cost = NULL`.  |
| **Barang tanpa cost_price**                    | Margin/laba ditandai "belum lengkap" + prompt isi modal. Income tetap tercatat (tanpa HPP).         |
| **Barang tanpa foto**                          | Placeholder generik (inisial nama).                                                                 |
| **Stok bervarian**                             | `products.stock` = SUM(inventory.stock), di-recompute tiap perubahan. Bukan dua angka independen.   |
| **Slug brand bentrok**                         | Auto-suffix (`keripik-ani-2`).                                                                      |
| **Order tapi stok kurang**                     | Validasi sebelum order. Kalau kurang → warning + opsi pre-order.                                    |
| **Pembayaran tidak diverifikasi > 2 hari**     | Reminder dashboard. > 7 hari → auto-cancel order + stok balik. Income belum pernah tercatat (aman). |
| **Context dipakai berkali-kali**               | Diizinkan. Tiap pemakaian → `context_usage`. Context tidak dihapus.                                 |
| **Brand dihapus**                              | Soft delete (`is_active=false`). Data historis tetap.                                               |
| **User switch brand saat proses jalan**        | Modal konfirmasi. Proses tidak dibatalkan; UI reload brand baru.                                    |
| **Transaksi tanpa produk (biaya operasional)** | `product_id` nullable, `category` wajib.                                                            |
| **Customer duplikat (nomor sama)**             | Match by phone per brand → update customer existing, bukan bikin baru.                              |
| **Piutang/hutang jatuh tempo**                 | Cek harian. ≤ 3 hari → notifikasi dashboard.                                                        |

***

**Akhir dokumen — v0.1.1**
