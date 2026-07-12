# The Next Whiz — Design System & UX Architecture

> **Versi:** 1.0 · **Tanggal:** 12 Juli 2026
> **Basis produk:** `LOGIC_FLOW_v0.1.1.md` · **Basis brand:** MWX Whiz design reference (navy + orange)
> **Stack target:** Next.js (App Router) + Tailwind CSS + shadcn/ui + Recharts
> **Bahasa UI:** Bahasa Indonesia, sapaan "kamu"

---

## 0. Cara Memakai Dokumen Ini (untuk Developer Agent)

Dokumen ini adalah **satu-satunya sumber kebenaran desain**. Aturan main:

1. **Jangan menebak.** Kalau sebuah keputusan visual/UX tidak ada di sini, cari pola terdekat di dokumen ini dan ikuti alasannya ("Kenapa:") — jangan mengarang gaya baru.
2. **Token dulu, nilai mentah tidak pernah.** Semua warna, jarak, radius, shadow WAJIB lewat token (Bagian C). Hardcode hex/px arbitrer = bug.
3. **Komponen shadcn/ui adalah basis.** Kustomisasi lewat CSS variable & varian, bukan menulis komponen paralel.
4. **Setiap layar wajib punya 4 kondisi:** normal, kosong (empty), memuat (loading), gagal (error). Katalognya di Bagian H. Layar tanpa 4 kondisi ini dianggap belum selesai.
5. **Copywriting mengikuti Bagian K** (glossary istilah + tone). Teks UI berbahasa teknis = bug.
6. **Dark mode: DI LUAR SCOPE v1.** Light theme saja. Jangan membangun toggle dark mode.

---

# A. Product Experience Vision

## A.1 Positioning

**The Next Whiz = asisten bisnis AI untuk UMKM Indonesia.** Ia mengubah sinyal pasar (riset) menjadi tindakan siap-klik di tiga area: bikin konten, jualan di toko, dan mengatur uang — tanpa pindah aplikasi dan tanpa mengetik data yang sama dua kali.

Bukan ERP. Bukan dashboard analitik. Kompetitor sesungguhnya adalah **"menebak-nebak manual yang terasa cukup"** (scroll Instagram kompetitor 5 menit). Maka setiap alur harus **lebih cepat dan lebih meyakinkan daripada menebak sendiri** — kalau tidak, produk kalah.

## A.2 UX Vision

Kalimat yang harus dirasakan pengguna di setiap layar:

> **"Saya tinggal mengikuti langkah-langkahnya, dan pekerjaan saya selesai."**

Tiga pilar pengalaman:

| Pilar | Arti | Wujud di UI |
|---|---|---|
| **Dituntun** (Guided) | Sistem selalu menawarkan langkah berikutnya; pengguna tidak pernah menatap layar sambil bingung "terus ngapain?" | Rekomendasi Aksi di Beranda, wizard bertahap, CTA tunggal yang menonjol per layar |
| **Beralasan** (Grounded) | Setiap saran AI menyebut sumber & alasannya | Chip "📎 Dari riset: …" + tautan "Kenapa saran ini?" di semua kartu AI |
| **Mengalir** (Connected) | Satu input dipakai semua modul; tidak ada ketik ulang | Produk yang diinput sekali muncul di Konten, Toko, Keuangan; badge "otomatis terisi" |

## A.3 Filosofi User Journey: "Reactive Rescue", bukan "Research Discipline"

Pemilik UMKM **bertindak dulu, lihat data belakangan**. Mereka tidak akan mengadopsi kebiasaan "riset dulu sebelum posting". Maka:

- **Jangan pernah** membuat riset terasa seperti PR/kewajiban ("Kamu belum riset minggu ini!").
- **Selalu** selipkan riset di momen pengguna sudah mau melakukan sesuatu: saat mau bikin konten → "Mau lihat dulu apa yang lagi tren untuk produk kamu?"; saat stok menipis → "Cek dulu harga pasaran sebelum restock?".
- Loop inti produk: **Sinyal → Rekomendasi → Satu klik → Hasil kelihatan.** Semakin pendek jarak "rekomendasi → hasil", semakin tinggi retensi.

## A.4 Satu UI, Tiga Kedalaman (strategi 3 level pengguna)

Jangan membuat "mode pemula/mahir". Satu antarmuka, dengan kedalaman yang terbuka bertahap:

| Level | Kebiasaan | Yang mereka pakai | Prinsip desain |
|---|---|---|---|
| 1 — Awam (patokan utama) | WhatsApp, tidak paham istilah teknis | Beranda + Rekomendasi Aksi + wizard | **Jalur default**: tombol besar, satu keputusan per layar, bahasa sehari-hari. Semua fitur inti harus bisa diselesaikan lewat jalur ini saja |
| 2 — Menengah | Marketplace, aplikasi kasir, Excel | Daftar produk, pesanan, laporan bulanan | List/tabel responsif, filter sederhana, pencarian |
| 3 — Mahir | Multi-tools, dashboard | Filter lanjutan, export, rentang tanggal kustom | Disembunyikan di balik "Filter" / menu ⋯ — ada, tapi tidak memenuhi layar |

**Aturan emas:** fitur untuk Level 3 tidak boleh menambah satu pun elemen yang terlihat oleh Level 1 pada kondisi default. Kalau ragu, sembunyikan di balik satu klik.

**Kenapa:** desain untuk Level 1 sebagai default membuat produk bisa dipakai semua orang; kedalaman opt-in membuat Level 3 tidak merasa dibatasi. Ini implementasi langsung Progressive Disclosure.

---

# B. Information Architecture

## B.1 Sitemap

```
nextwhiz (app, butuh login SSO mwxmarket)
│
├── /onboarding                  Wizard: Brand → Produk (skip ok) → Riset pertama (skip ok)
│
├── /  ......................... 📊 Beranda (dashboard per brand aktif)
│
├── /riset ...................... 🔍 Riset
│   ├── /riset                   Daftar riset + saran query + search bar
│   └── /riset/[id]             Hasil riset (persona, SWOT, kompetitor, keyword, tren, rekomendasi)
│
├── /konten ..................... 📝 Konten
│   ├── /konten                  Galeri konten tersimpan (shared.content)
│   └── /konten/buat            Generator (tipe + produk + angle → preview)
│
├── /toko ....................... 🛒 Toko (hub — 8 submodul)
│   ├── /toko/chat              Inbox Terpadu (WA + Telegram) + AI balas
│   ├── /toko/calon-pembeli     Pipeline calon pembeli (Kanban: Baru → Deal)
│   ├── /toko/pesanan           Daftar & detail pesanan
│   ├── /toko/pembayaran        Cek pembayaran (Menunggu / Diterima / Ditolak)
│   ├── /toko/pengiriman        Resi & lacak (hanya produk barang)
│   ├── /toko/stok              Stok & koreksi stok (+ varian)
│   ├── /toko/promosi           Promosi WA broadcast (+ email opsional)
│   └── /toko/halaman-toko      Pengaturan toko online publik
│
├── /keuangan ................... 💰 Keuangan
│   ├── /keuangan               Ringkasan (masuk/keluar/laba bulan ini)
│   ├── /keuangan/catat         Catat pemasukan / pengeluaran (manual)
│   ├── /keuangan/tagihan       Piutang & hutang ("Belum Dibayar" / "Harus Dibayar")
│   ├── /keuangan/laporan       Laba Rugi · Arus Kas · Neraca
│   └── /keuangan/pajak         Estimasi PPh UMKM 0,5%
│
├── /produk ..................... 📦 Data Produk (barang & jasa) — diakses dari Beranda/Toko/Pengaturan
├── /credit ..................... ⚡ Credit (saldo live, paket top-up → mwxmarket, riwayat pemakaian)
├── /pengaturan ................. ⚙️ Pengaturan (brand, tone of voice, akun)
│
└── tokoku.nextwhiz.id/[slug]    Toko online publik (tanpa login; di luar shell app)
```

**Kenapa `/produk` tidak jadi menu utama:** produk adalah data fondasi, bukan aktivitas harian. Ia dijangkau dari konteks pemakaian (tambah produk dari Toko/Stok, pilih produk dari Konten) — sesuai prinsip Guided Workflow, bukan struktur-dulu.

## B.2 Hierarki Navigasi

### Desktop — sidebar tetap (lebar 248px)

```
┌──────────────────────┐
│ ⚡ The Next Whiz      │  logo area
│──────────────────────│
│ 🏪 [Keripik Ani  ▾]  │  Brand switcher (Bagian D.16)
│──────────────────────│
│ MENU                  │
│ 📊 Beranda            │
│ 🔍 Riset              │
│ 📝 Konten             │
│ 🛒 Toko               │  → expand: 8 submenu
│ 💰 Keuangan           │
│──────────────────────│
│ ⚡ Credit    [47]     │  saldo tampil sebagai badge
│ ⚙️ Pengaturan         │
│──────────────────────│
│ 👤 Ibu Ani            │
└──────────────────────┘
```

- Item aktif: latar `--sidebar-active` + rail kiri 3px warna modul + teks 600.
- Submenu Toko hanya expand saat modul Toko aktif (accordion tunggal) — sidebar tidak pernah menampilkan >13 item sekaligus.

### Mobile — bottom navigation (5 item) + top bar

```
Top bar:    [🏪 Keripik Ani ▾]                [⚡ 47]
Bottom nav: 📊 Beranda │ 🔍 Riset │ 📝 Konten │ 🛒 Toko │ 💰 Keuangan
```

- Credit selalu terlihat sebagai chip di top bar (tap → /credit). **Kenapa:** credit adalah "bensin" semua aksi; kalau tersembunyi, kegagalan aksi karena credit habis terasa seperti bug.
- Pengaturan & profil: lewat tap Brand switcher → sheet berisi daftar brand + "Pengaturan" + "Keluar".
- Toko di mobile = **halaman hub** berisi grid 8 kartu submodul (bukan tab). **Kenapa:** 8 tab horizontal tidak muat & menuntut pemahaman struktur; grid kartu dengan ikon + label bisa dipindai sekilas.

### Aturan kedalaman

Maksimal **2 level navigasi** (modul → submodul). Level ke-3 selalu berupa halaman detail dengan tombol "← Kembali" yang jelas, bukan navigasi baru.

## B.3 Pengelompokan Fitur

| Kelompok | Isi | Alasan pengelompokan |
|---|---|---|
| Beranda | Ringkasan + Rekomendasi Aksi | Home base; menjawab "hari ini saya harus ngapain?" |
| Riset | Cari tahu pasar | Sumber semua rekomendasi (Context Engine) |
| Konten | Bikin materi promosi | Output kreatif; peta ke CreateWhiz |
| Toko | Semua yang berhubungan dengan pembeli: chat, calon pembeli, pesanan, bayar, kirim, stok, promosi | Dikelompokkan berdasarkan **siapa yang dihadapi (pembeli)**, bukan berdasarkan tabel database |
| Keuangan | Semua yang berhubungan dengan uang | Dikelompokkan berdasarkan **objek (uang)** |
| Credit & Pengaturan | Sistem | Dipisah dari menu kerja supaya menu utama tetap 5 |

## B.4 User Flow Inti (4 alur)

**Flow 1 — Onboarding (Phase 0–3 Logic Flow):**
Login SSO mwxmarket → (user baru) wizard 3 langkah: ① Brand (nama*, kategori*, logo/deskripsi opsional) → ② Produk (pilih Barang/Jasa → form; bisa "Nanti aja") → ③ Riset pertama (query ter-pre-fill dari nama produk; bisa "Nanti aja") → Beranda.
*Aturan: wizard menunjukkan progres ("Langkah 1 dari 3"), setiap langkah opsional kecuali Brand, dan skip tidak pernah menghukum — Beranda kosong akan menawarkan lagi.*

**Flow 2 — Riset → Aksi (loop inti produk):**
Ketik/klik saran query → cek credit (kurang? modal top-up) → **layar progres pipeline** (Bagian D.20) → hasil riset → 3 context otomatis lahir → Beranda penuh Rekomendasi Aksi → klik "Buat"/"Terapkan"/"Lihat" → modul terkait terbuka dengan context aktif (ContextBar) → hasil tersimpan → kartu diberi badge "✓ sudah dipakai" (tetap bisa dipakai lagi).

**Flow 3 — Chat → Pesanan → Uang (Phase 7B):**
Chat WA masuk inbox → AI menjawab (template + link toko) → AI auto-buat calon pembeli (stage Baru) → pemilik geser ke "Deal" → sistem auto-buat Pelanggan + Pesanan (status Baru) → pembeli upload bukti transfer → pemilik **Cek Pembayaran** → tap "Terima" → income otomatis tercatat di Keuangan (+HPP dari harga modal) → (barang) input resi → status Dikirim.
*Aturan UI: setiap perpindahan otomatis diberi konfirmasi visual ("✓ Pesanan dibuat otomatis dari chat ini") supaya pengguna paham sistem bekerja untuknya, bukan terjadi misterius.*

**Flow 4 — Credit habis:**
Klik aksi berbayar → saldo kurang → modal: butuh X, saldo Y, tombol "Top Up Sekarang" (→ halaman credit mwxmarket, buka tab baru) / "Batal" → kembali dari top-up → saldo di-refresh otomatis → aksi bisa diulang dari tempat semula (state form tidak hilang).

---

# C. Design Tokens

## C.1 Warna — Semantik Dasar

Diturunkan dari brand MWX Whiz (navy ink + orange accent), disetel untuk aplikasi (bukan deck).

| Token | Hex | HSL (untuk CSS var) | Fungsi |
|---|---|---|---|
| `--background` | `#F4F6FA` | `220 43% 97%` | Latar app (cool light) |
| `--card` | `#FFFFFF` | `0 0% 100%` | Permukaan kartu/panel |
| `--foreground` / ink | `#0A2647` | `213 75% 16%` | Heading & teks utama (navy) |
| `--ink-soft` | `#51617A` | `217 20% 40%` | Teks body sekunder |
| `--muted-foreground` | `#8A97A8` | `214 15% 60%` | Caption, placeholder, meta |
| `--border` / line | `#E5E9F1` | `220 30% 92%` | Border kartu, pemisah |
| `--input` | `#D7DEE9` | `217 29% 88%` | Border field (lebih tegas dari `--border`) |
| `--sidebar` | `#FFFFFF` | `0 0% 100%` | Latar sidebar (dipisah dari bg dengan border) |
| `--sidebar-active` | `#F1F4FA` | `220 43% 96%` | Latar item nav aktif |

## C.2 Warna — Brand & Aksi

| Token | Hex | HSL | Fungsi | Kontras di putih |
|---|---|---|---|---|
| `--brand` | `#FF7A00` | `29 100% 50%` | **Dekoratif saja**: ikon, ilustrasi, glow, logo. ❌ Jangan untuk teks / tombol berlabel | 2,4:1 (gagal — makanya dekoratif) |
| `--brand-ink` | `#DB6400` | `27 100% 43%` | Teks aksen oranye berukuran besar (≥19px bold), angka highlight | 3,6:1 (AA large only) |
| `--primary` | `#C2560E` | `24 87% 41%` | **Isi tombol utama** + link aksi. Teks di atasnya selalu putih | 4,5:1 ✅ AA |
| `--primary-hover` | `#A84A0C` | `24 87% 35%` | Hover tombol utama | — |
| `--orange-tint` | `rgba(255,122,0,.10)` | — | Latar permukaan AI, badge, callout | — |
| `--orange-border` | `rgba(255,122,0,.28)` | — | Border permukaan AI/callout | — |

**Kenapa dua oranye:** `#FF7A00` adalah identitas brand tapi gagal kontras untuk teks; `#C2560E` versi "bisa dipakai kerja" yang lolos WCAG AA dengan teks putih. Developer agent tidak boleh menukar keduanya.

**Peran navy vs oranye:** Navy = struktur & isi (heading, teks, ikon nav). Oranye = **aksi & AI** (CTA utama, semua permukaan AI). Pengguna belajar refleks: "yang oranye = yang bisa saya klik untuk maju / yang disarankan AI".

## C.3 Warna — Modul (identitas 4 modul)

Dipetakan dari warna produk ekosistem Whiz — konsisten dengan brand MWX yang sudah dikenal pengguna CreateWhiz dkk.

| Modul | Token | Hex | HSL | Tint (latar ikon/badge) |
|---|---|---|---|---|
| 🔍 Riset (SmartWhiz) | `--mod-riset` | `#7C3AED` | `262 83% 58%` | `rgba(124,58,237,.12)` |
| 📝 Konten (CreateWhiz) | `--mod-konten` | `#E87A3A` | `22 79% 57%` | `rgba(232,122,58,.12)` |
| 🛒 Toko (SalesWhiz) | `--mod-toko` | `#2563EB` | `221 83% 53%` | `rgba(37,99,235,.12)` |
| 💰 Keuangan (FinanceWhiz) | `--mod-keuangan` | `#0D7377` | `182 80% 26%` | `rgba(13,115,119,.12)` |

Pemakaian: ikon modul, rail kiri item nav aktif, border-top kartu rekomendasi per modul, header halaman modul. **Bukan** untuk tombol (tombol selalu `--primary` / varian netral) — supaya bahasa aksi tetap satu.

## C.4 Warna — Status Semantik

| Token | Hex | HSL | Pakai untuk |
|---|---|---|---|
| `--success` | `#15803D` | `142 72% 29%` | Pembayaran diterima, tersimpan, stok aman |
| `--success-tint` | `#E8F6EE` | — | Latar badge/alert sukses |
| `--warning` | `#B45309` | `28 80% 37%` | Stok menipis, pembayaran menunggu >2 hari, credit hampir habis |
| `--warning-tint` | `#FDF3E7` | — | Latar badge/alert peringatan |
| `--destructive` | `#DC2626` | `0 72% 51%` | Gagal, ditolak, hapus, arus kas negatif |
| `--destructive-tint` | `#FDECEC` | — | Latar badge/alert bahaya |
| `--info` | `#2563EB` | `221 83% 53%` | Informasi netral, tips |
| `--info-tint` | `#EAF1FE` | — | Latar badge/alert info |

Aturan: warna status **selalu** hadir bersama ikon + kata (✓ Diterima / ⏳ Menunggu / ✕ Ditolak) — tidak pernah warna saja. **Kenapa:** buta warna + literasi rendah; warna adalah penguat, bukan pembawa makna tunggal.

## C.5 Blok `:root` siap-tempel (globals.css, format shadcn)

```css
:root {
  --background: 220 43% 97%;
  --foreground: 213 75% 16%;
  --card: 0 0% 100%;
  --card-foreground: 213 75% 16%;
  --popover: 0 0% 100%;
  --popover-foreground: 213 75% 16%;
  --primary: 24 87% 41%;            /* #C2560E — CTA, AA di teks putih */
  --primary-foreground: 0 0% 100%;
  --secondary: 220 43% 96%;         /* tombol sekunder: navy-tint lembut */
  --secondary-foreground: 213 75% 16%;
  --muted: 220 40% 95%;
  --muted-foreground: 214 15% 47%;  /* #6A7891 — versi muted yang masih AA utk teks 14px */
  --accent: 29 100% 96%;            /* orange-tint utk hover item */
  --accent-foreground: 24 87% 41%;
  --destructive: 0 72% 51%;
  --destructive-foreground: 0 0% 100%;
  --border: 220 30% 92%;
  --input: 217 29% 88%;
  --ring: 24 87% 41%;               /* focus ring = primary */
  --radius: 0.75rem;                /* 12px */

  /* Non-shadcn (custom) */
  --brand: 29 100% 50%;
  --brand-ink: 27 100% 43%;
  --ink-soft: 217 20% 40%;
  --mod-riset: 262 83% 58%;
  --mod-konten: 22 79% 57%;
  --mod-toko: 221 83% 53%;
  --mod-keuangan: 182 80% 26%;
  --success: 142 72% 29%;
  --warning: 28 80% 37%;
  --info: 221 83% 53%;

  --shadow-sm: 0 1px 2px rgba(10,38,71,.05), 0 4px 14px rgba(10,38,71,.05);
  --shadow-md: 0 1px 3px rgba(10,38,71,.06), 0 12px 30px rgba(10,38,71,.07);
  --shadow-lg: 0 2px 6px rgba(10,38,71,.07), 0 20px 48px rgba(10,38,71,.10);

  --chart-1: 262 83% 58%;  /* riset */
  --chart-2: 221 83% 53%;  /* toko */
  --chart-3: 182 80% 26%;  /* keuangan */
  --chart-4: 22 79% 57%;   /* konten */
  --chart-5: 214 15% 60%;  /* netral */
}
```

Shadow selalu berbasis navy `rgba(10,38,71,…)` alpha rendah, bukan hitam netral — menyatu dengan palet.

## C.6 Tipografi

**Font:** `Plus Jakarta Sans` untuk heading/display (hangat, geometris-humanis, karya desainer Indonesia — cocok dengan identitas produk), `Inter` untuk body & UI (keterbacaan angka/tabel). Muat via `next/font/google`, `display: swap`. Fallback: `-apple-system, 'Segoe UI', sans-serif`.

| Peran | Font | Size / LH | Weight | Warna | Catatan |
|---|---|---|---|---|---|
| Display (angka besar dashboard) | Jakarta | 28 / 34 | 800 | `--foreground` | `font-variant-numeric: tabular-nums` |
| H1 (judul halaman) | Jakarta | 24 / 30 | 800 | `--foreground` | Satu H1 per halaman |
| H2 (judul seksi/kartu) | Jakarta | 18 / 24 | 700 | `--foreground` | |
| H3 (sub-item) | Inter | 15 / 22 | 600 | `--foreground` | |
| Body | Inter | 15 / 24 | 400 | `--ink-soft` | Ukuran dasar; LH 1.6 utk keterbacaan |
| Body strong | Inter | 15 / 24 | 600 | `--foreground` | |
| Small / meta | Inter | 13 / 18 | 400 | `--muted-foreground` | Timestamp, helper text |
| Label form | Inter | 14 / 20 | 600 | `--foreground` | Selalu di ATAS field |
| Button | Inter | 15 / 20 | 600 | per varian | Tidak pernah uppercase |
| Badge / tag | Inter | 12 / 16 | 700 | per status | Uppercase hanya untuk badge sistem, bukan status |
| Uang (Rp) | Inter | ukuran konteks | 700 | per konteks | Selalu tabular-nums; format Bagian K.4 |

**Kenapa base 15px & LH 1.6:** pengguna banyak berumur 35+ dan memakai HP murah dengan layar padat; teks kecil ala SaaS barat (13px) tidak manusiawi di sini. Mobile: base tetap ≥15px (mencegah zoom-in otomatis iOS gunakan ≥16px pada input).

## C.7 Spacing

Skala 4px: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64`.

| Konteks | Nilai |
|---|---|
| Padding kartu | 20 (mobile: 16) |
| Gap antar kartu / grid | 16 |
| Gap heading → konten | 12 |
| Padding halaman desktop | 32 (kanan-kiri), konten max-width 1200px center |
| Padding halaman mobile | 16 |
| Jarak antar field form | 20 |
| Jarak seksi besar | 32 |

## C.8 Radius, Elevasi, Border

| Elemen | Radius | Elevasi |
|---|---|---|
| Kartu, modal, sheet | 16px | shadow-sm (kartu) / shadow-lg (modal) |
| Tombol, input, select | 10px | tanpa shadow; input focus: ring |
| Badge status | 8px | — |
| Chip/pill (keyword, filter) | pill (999px) | — |
| Avatar | 50% | — |
| Kartu rekomendasi AI | 16px + border `--orange-border` | shadow-sm |

Aturan: elevasi menandai **lapisan interaksi** (kartu < dropdown < modal), bukan dekorasi. Maksimal 3 tingkat shadow di satu layar.

## C.9 Motion

| Token | Nilai | Pakai |
|---|---|---|
| `--dur-fast` | 150ms | hover, toggle, fokus |
| `--dur-base` | 250ms | buka dropdown/sheet, expand accordion, toast masuk |
| `--dur-slow` | 400ms | modal masuk, transisi halaman wizard |
| Easing | `cubic-bezier(0.2, 0, 0, 1)` (ease-out) | semua |

- Elemen masuk: fade + translateY(8px). Keluar: fade saja (lebih cepat, 150ms).
- Angka dashboard baru (mis. penjualan naik): count-up singkat 400ms sekali saat mount, tidak berulang.
- **Wajib** hormati `prefers-reduced-motion: reduce` → semua jadi fade 0–100ms.
- ❌ Tidak ada animasi dekoratif berulang (pulse abadi, gradient bergerak) kecuali indikator loading.

## C.10 Grid & Breakpoint

| Breakpoint | Rentang | Layout |
|---|---|---|
| Mobile | < 640px | 1 kolom, bottom nav, padding 16 |
| Tablet | 640–1023px | 2 kolom kartu, sidebar collapse jadi ikon (72px) |
| Desktop | ≥ 1024px | Sidebar 248px + konten max 1200px; grid 12 kolom gap 24 |

Semua tabel/daftar lebar wajib punya strategi mobile sendiri (Bagian D.8) — **horizontal scroll halaman tidak pernah boleh terjadi.**

---

# D. Component Library

Semua komponen berbasis shadcn/ui; nama file mengikuti konvensi shadcn (`components/ui/*`). Di bawah ini spесifikasi varian, state, dan aksesibilitas yang WAJIB dipenuhi.

## D.1 Button

| Varian | Tampilan | Pakai untuk |
|---|---|---|
| `primary` | Fill `--primary`, teks putih | **Satu per layar/kartu** — aksi maju utama ("Riset Sekarang", "Simpan") |
| `secondary` | Fill `--secondary`, teks navy | Aksi pendamping ("Nanti aja", "Kembali") |
| `outline` | Border `--input`, teks navy | Aksi netral di dalam kartu/tabel |
| `ghost` | Transparan, teks navy | Aksi ringan (ikon, menu ⋯) |
| `destructive` | Fill `--destructive`, teks putih | Hapus/batalkan — selalu di belakang konfirmasi |
| `ai` | Fill `--orange-tint`, border `--orange-border`, teks `--primary`, ikon ✨ | Aksi yang menjalankan AI ("✨ Buatkan Caption") |

| Size | Tinggi | Padding-x | Catatan |
|---|---|---|---|
| `lg` | 48px | 24 | Default untuk CTA utama & semua tombol mobile |
| `md` | 40px | 16 | Default desktop dalam kartu |
| `sm` | 32px | 12 | Dalam baris tabel saja |

**States:** default → hover (fill −8% lightness) → active (scale .98) → focus-visible (ring 2px `--ring`, offset 2px) → disabled (opacity .5, cursor-not-allowed) → **loading** (spinner menggantikan ikon, teks berubah jadi bentuk progresif: "Menyimpan…", tombol tetap selebar semula, `disabled`).

**Aturan aksi berbayar credit:** tombol yang memotong credit WAJIB menampilkan biayanya di dalam label — `[ Riset Sekarang · ⚡5 ]` (chip kecil di kanan label). **Kenapa:** transparansi biaya sebelum klik = kepercayaan; tidak ada "kaget kepotong".

**A11y:** elemen `<button>` asli; ikon-saja wajib `aria-label`; area sentuh min 44×44.

**Do / Don't:** ✅ Label kata kerja ("Simpan Produk") · ❌ "OK"/"Submit" · ❌ dua tombol primary bersebelahan · ❌ tombol yang hanya ikon untuk aksi penting di mobile.

## D.2 Input (Text Field)

Anatomi: Label (atas, 14/600) → Field (48px mobile / 44px desktop, radius 10, border `--input`) → Helper text ATAU error (13px, di bawah).

**States:** default → focus (border `--primary` + ring) → filled → error (border & teks `--destructive`, ikon ⚠, pesan menggantikan helper) → disabled (bg `--muted`) → **prefilled-AI** (bg `--orange-tint` tipis + chip "✨ otomatis" — nilai dari context/AI, bisa diedit).

Varian khusus (wajib dibuat):

| Varian | Perilaku |
|---|---|
| `RpInput` | Prefix tetap "Rp", `inputmode="numeric"`, auto-format titik ribuan saat ketik (15000 → 15.000), simpan integer |
| `PhoneInput` | Prefix "+62", `inputmode="tel"`, normalisasi 08xx → 628xx |
| `SearchInput` | Ikon 🔍 kiri, tombol ✕ clear, debounce 300ms |
| `Textarea` | Auto-grow sampai 6 baris; counter karakter hanya jika ada batas |

**A11y:** `<label for>` selalu ter-associate; error pakai `aria-describedby` + `aria-invalid`; jangan pernah placeholder sebagai pengganti label.

**Do / Don't:** ✅ helper text memberi contoh ("Contoh: Keripik Pedas Level 3") · ❌ label di dalam field yang hilang saat diketik · ❌ meminta format yang bisa dinormalisasi mesin.

## D.3 Select & Pilihan

- ≤ 4 opsi → **segmented control / kartu pilihan** (radio besar bergambar, seperti pilih "📦 Barang / 💼 Jasa"), bukan dropdown. **Kenapa:** dropdown menyembunyikan opsi; pengguna Level 1 tidak mengeksplor.
- 5–15 opsi → Select shadcn (48px, radius 10). Mobile: render sebagai **bottom sheet** dengan opsi 48px, bukan popover kecil.
- > 15 opsi (pilih produk, pelanggan) → Combobox dengan pencarian + "＋ Tambah baru" di baris terakhir (mencegah buntu).

## D.4 Kartu Pilihan (ChoiceCard)

Untuk keputusan besar (tipe produk, tone of voice): kartu 2 kolom (mobile 1), berisi emoji/ikon besar + judul 15/700 + deskripsi 13. State selected: border 2px `--primary` + bg `--accent` + ✓ pojok. Ini komponen kunci wizard.

## D.5 Card

Dasar semua permukaan: bg `--card`, border 1px `--border`, radius 16, shadow-sm, padding 20.
Varian: `interactive` (hover: shadow-md + border sedikit gelap; seluruh kartu klik-able dengan satu `<a>` overlay), `module` (border-top 3px warna modul), `ai` (lihat D.13).

## D.6 StatCard (angka ringkasan dashboard)

Anatomi: label 13/600 `--muted-foreground` (mis. "Penjualan Bulan Ini") → nilai Display 28/800 tabular → meta opsional (delta "↑ 12% dari bulan lalu" hijau/merah + kata, atau sublabel).
Grid: mobile 2 kolom; desktop 4 kolom. Nilai uang pakai format ringkas ("Rp 2,4jt" — aturan K.4). Kartu bisa diklik → modul terkait (seluruh kartu adalah link, ada ikon → kecil).

## D.7 Badge / Tag

| Jenis | Bentuk | Contoh |
|---|---|---|
| Status | radius 8, tint + teks status + ikon | `✓ Diterima` `⏳ Menunggu` `✕ Ditolak` `● Baru` |
| Modul | tint warna modul | `🔍 Dari Riset` |
| AI | `--orange-tint` + ✨ | `✨ Saran AI` `✨ otomatis terisi` |
| Pemakaian | abu netral | `✓ sudah dipakai` |
| Jumlah (count) | pill kecil solid | badge angka di nav/inbox |

Semua badge status punya mapping tetap (jangan improvisasi): Baru=info, Diproses/Menunggu=warning, Diterima/Selesai/Dikirim=success, Ditolak/Batal/Gagal=destructive.

## D.8 Table → ResponsiveList

Desktop (≥1024): tabel biasa — header 13/600 uppercase `--muted-foreground`, baris 52px, zebra off, hover bg `--muted`, kolom angka rata kanan tabular, baris klik-able → detail.
**Mobile: tabel WAJIB berubah jadi daftar kartu** — tiap baris jadi kartu: baris-1 (nama 15/600 + badge status kanan), baris-2 (meta 13: tanggal · jumlah), baris-3 opsional (nilai uang 15/700 kanan). Tidak pernah tabel yang di-scroll horizontal.
Fitur Level 2/3: search selalu tampak; filter & sort di balik tombol "Filter" (sheet di mobile); export CSV di menu ⋯ (desktop saja).
Pagination: "Muat lebih banyak" (bukan nomor halaman) — model mental infinite-feed lebih akrab.

## D.9 Modal (Dialog)

Pakai untuk: konfirmasi (hapus, terima pembayaran, potong credit) dan form mikro (1–3 field). Max-width 440px, radius 16, shadow-lg, overlay `rgba(10,38,71,.4)`.
Anatomi konfirmasi: ikon konteks → judul pertanyaan jelas ("Terima pembayaran Rp 30.000?") → konsekuensi 1 kalimat ("Pemasukan akan otomatis tercatat di Keuangan.") → tombol [primary konfirmasi] [secondary "Batal"].
Destructive: tombol merah + kalimat konsekuensi eksplisit; hapus permanen tidak ada di produk (semua soft-delete/"nonaktifkan").
A11y: focus-trap, Esc menutup, fokus kembali ke pemicu, `aria-labelledby`.

## D.10 Drawer / Sheet

- Desktop: sheet kanan 480px — untuk detail cepat tanpa pindah halaman (detail pesanan dari tabel, detail lead dari Kanban).
- Mobile: bottom sheet (radius atas 16, drag-handle) — pengganti SEMUA popover/dropdown kompleks di mobile.
- Maksimal 1 sheet terbuka; sheet tidak menumpuk modal.

## D.11 Toast

Posisi: atas-tengah (mobile), kanan-bawah (desktop). Durasi 4 detik; error 6 detik + tombol aksi.
Anatomi: ikon status + pesan 1 kalimat + aksi opsional ("Lihat", "Coba Lagi", "Urungkan").
Aturan: toast untuk **konfirmasi hasil aksi pengguna** ("✓ Produk tersimpan"). BUKAN untuk error form (inline), bukan untuk info penting yang harus dibaca (banner). Maks 1 toast tampil; yang baru mengganti yang lama.
`aria-live="polite"`; error `assertive`.

## D.12 EmptyState

Komponen wajib dengan 3 elemen: ilustrasi/emoji besar (48px) → 1 kalimat ramah menjelaskan kenapa kosong → 1 CTA primary langkah pertama. Katalog isi per layar ada di Bagian H.1. Tidak pernah kosong tanpa CTA. Tidak pernah kata "data" ("Belum ada data" ❌ → "Kamu belum punya produk" ✅).

## D.13 AIRecommendationCard (Rekomendasi Aksi) — komponen paling penting

Kartu yang menampilkan context siap-klik di Beranda & modul.

```
┌──────────────────────────────────────────────┐
│ [ikon modul dalam tint]  ✨ Saran dari riset  │ ← header 12px
│ Bikin konten TikTok: "Tantangan Level Pedas" │ ← judul aksi 15/700 navy
│ Angle & hashtag sudah disiapkan dari riset    │ ← 1 kalimat nilai 13 ink-soft
│ "tren cemilan pedas" · 2 jam lalu             │
│ ┌─────────────────┐  Kenapa saran ini? ▸     │
│ │  Buat · ⚡4      │                          │ ← CTA + biaya credit
│ └─────────────────┘                          │
└──────────────────────────────────────────────┘
```

- Border `--orange-border`, bg putih, border-top 3px warna modul tujuan.
- Label CTA per target: Konten="Buat", Toko harga/stok="Review"/"Terapkan", Keuangan="Lihat". CTA membuka modul dengan context aktif — **tidak pernah langsung mengeksekusi perubahan data**.
- "Kenapa saran ini?" → popover/sheet berisi alasan (D.15).
- Setelah dipakai: badge `✓ sudah dipakai` + CTA berubah "Pakai Lagi" (varian outline). Kartu tidak hilang.
- Skeleton state saat context sedang dibuat pasca-riset.

## D.14 ContextActiveBar

Bar tipis di atas area kerja modul saat pengguna datang dari rekomendasi:
`📎 Pakai riset: "tren cemilan pedas" — Angle: "Berani coba level 3?" · TikTok  [Lepas ✕]`
Bg `--orange-tint`, border-bottom `--orange-border`. "Lepas" mengembalikan mode manual tanpa kehilangan isian lain. Kalau tidak ada context, bar tidak ada (bukan bar kosong).

## D.15 WhyPopover ("Kenapa saran ini?")

Isi maks 3 baris terstruktur: **Dari data apa** ("Pencarian 'keripik pedas' naik 40% sebulan terakhir — Google Trends") → **Apa artinya buat kamu** ("Lagi banyak yang cari; momen bagus untuk posting") → **Risiko/syarat** kalau ada ("Kalau volume tidak naik ≥15%, laba justru turun"). Sumber ditulis dalam kurung. Bahasa non-teknis. Mobile: bottom sheet.

## D.16 BrandSwitcher

Tombol di sidebar/topbar: logo kecil + nama brand + ▾. Klik → daftar brand (radio) + "＋ Tambah Brand" + link Pengaturan. Ganti brand = reload data seluruh app (tampilkan overlay loading singkat "Membuka Keripik Ani…"). Kalau ada proses berjalan → modal konfirmasi dulu (edge case Logic Flow).

## D.17 CreditChip & CreditCost

- `CreditChip` (topbar): `⚡ 47` — fill `--orange-tint`, teks `--primary` 13/700. Saldo <10: berubah warning + ikon ⚠. Klik → /credit.
- `CreditCost` (dalam tombol/kartu): `⚡5` inline sebelum aksi berbayar.
- Setelah aksi sukses, toast menyertakan sisa: "✓ Riset selesai · Sisa credit 42".

## D.18 AIChat (Inbox Toko)

Bubble pelanggan kiri (bg putih border), bubble pemilik kanan (bg `--mod-toko` tint), **bubble AI** kanan dengan badge kecil `✨ dibalas AI` — pemilik harus selalu bisa membedakan mana balasan AI vs manusia.
Composer: input + tombol kirim + tombol `✨ Balas Otomatis` (varian ai) yang menampilkan draft dulu (editable) sebelum terkirim.
Baris item inbox: avatar inisial, nama/nomor, cuplikan 1 baris, waktu, badge channel (WA/Telegram), badge unread.

## D.19 KanbanBoard (Calon Pembeli)

Kolom = stage (Baru → Dihubungi → Negosiasi → Deal / Batal). Kartu: nama, cuplikan kebutuhan, umur lead ("3 hari" — >3 hari jadi warning), sumber channel.
Desktop: drag & drop antar kolom. **Mobile: TANPA drag** — tap kartu → sheet detail → tombol "Pindah ke ▾". **Kenapa:** drag horizontal di layar sempit rawan salah sentuh dan tidak discoverable.
Pindah ke "Deal" → modal konfirmasi yang menjelaskan otomasi: "Pelanggan & pesanan akan dibuat otomatis."

## D.20 AIPipelineProgress (loading riset)

Riset makan 15–60 detik. TIDAK pakai spinner polos. Layar/panel progres bertahap dengan ceklis hidup:

```
Lagi riset "tren cemilan pedas" …
✓ Membaca tren pencarian
✓ Mengintip kompetitor
● Merangkum jadi rekomendasi …   ← step aktif: pulse
○ Menyiapkan aksi buat kamu
```

Tiap step punya durasi estimasi; kalau >90 detik → tawaran "Tinggalkan halaman ini — nanti kami kabari kalau selesai" (hasil tetap tersimpan). **Kenapa:** menunjukkan kerja nyata mengurangi persepsi lama & membangun kepercayaan bahwa credit tidak hangus sia-sia.

## D.21 Charts (aturan grafik)

Library: Recharts. Aturan keras:
- Maks **1 grafik per layar mobile**, 2 per layar desktop. Selebihnya angka (StatCard).
- Jenis yang boleh: bar (tren bulanan, default), line (arus kas), donut maks 5 slice (komposisi pengeluaran). ❌ scatter, radar, stacked kompleks.
- Setiap grafik wajib: judul kalimat manusia ("Penjualan 6 bulan terakhir"), 1 kalimat takeaway otomatis di bawahnya ("Paling ramai bulan Mei"), dan nilai saat tap/hover.
- Warna: `--chart-*`; satu seri = satu warna, jangan pelangi.
- Sumbu uang pakai format ringkas (2,4jt). Grid line tipis `--border`.
- **Kenapa:** untuk Level 1 grafik adalah ilustrasi dari kalimat takeaway — kalimatnya yang wajib, grafiknya pelengkap.

## D.22 Skeleton

Setiap layar punya skeleton yang meniru layout aslinya (bukan spinner tengah layar) untuk load <3 detik. Shimmer halus, bg `--muted`. Spinner hanya untuk aksi dalam tombol. Pipeline AI pakai D.20.

## D.23 StepIndicator (wizard)

"Langkah 2 dari 3" (teks) + bar progres tipis `--primary`. Bukan lingkaran-lingkaran bernomor ala enterprise. Selalu ada "← Kembali" (kecuali langkah 1) dan skip eksplisit "Nanti aja →" bila langkah opsional.

---

# E. Screen Pattern Library

## E.1 Dashboard (Beranda)

**Urutan seksi (mobile & desktop sama, desktop 2 kolom di seksi 3):**
1. Sapaan + konteks: "Halo Bu Ani 👋" + 1 kalimat status terpenting hari ini ("3 pembayaran menunggu dicek").
2. **StatCard grid** — 4 kartu utama: Penjualan Bulan Ini · Pesanan Perlu Diproses · Calon Pembeli Aktif · Stok Menipis. (Riset/Konten/Credit count sekunder, desktop-only baris kedua.) Kartu yang butuh tindakan (pesanan pending) diberi badge angka warning.
3. **Rekomendasi Aksi** (kolom kanan desktop / seksi utama mobile): maks **3 kartu D.13 tampil**, sisanya "Lihat semua (5)". **Kenapa dibatasi:** >3 saran = kembali jadi beban pilihan.
4. **Riset Terbaru** (kolom kiri): list ringkas 3 item + CTA "🔍 Riset Baru".
5. Aktivitas terakhir (feed ringan, desktop-only).

**Prioritas kondisi:** banner peringatan (credit habis / pembayaran >2 hari) selalu paling atas, maks 1 banner (yang paling penting).

## E.2 List Page (Produk, Pesanan, Konten, Transaksi)

Header: H1 + jumlah ("Pesanan · 12") + CTA primary kanan ("＋ Tambah") — mobile: CTA jadi tombol lebar sticky bawah ATAU FAB (pilih satu per layar, konsisten: FAB hanya di list).
Baris kontrol: SearchInput + tombol "Filter" (badge jumlah filter aktif) + sort default yang masuk akal (terbaru).
Isi: ResponsiveList (D.8). Empty state per katalog H.1. Tap baris → detail (halaman untuk objek kompleks; sheet untuk objek ringan).

## E.3 Detail Page (Hasil Riset — pola detail terkaya)

- Header: "← Kembali" + judul query + meta (waktu, ⚡ terpakai).
- Konten dipotong jadi **seksi kartu yang bisa dilipat** urut prioritas: ① Ringkasan & Rekomendasi (terbuka) ② Tren Pasar (grafik+takeaway) ③ Kompetitor (kartu, bukan tabel di mobile) ④ Target Audiens (persona cards) ⑤ SWOT (4 kuadran 2×2) ⑥ Keyword (chips).
- **Sticky action bar bawah**: [✨ Bikin Konten] [Atur Toko] [Proyeksi Uang] — jembatan riset→aksi tidak boleh hilang saat scroll.
- Detail pesanan/lead memakai pola sama yang lebih pendek: status timeline di atas (Baru → Dibayar → Dikirim → Selesai), lalu isi, lalu aksi status sticky.

## E.4 Wizard Page (Onboarding, buat promosi)

Satu pertanyaan besar per layar. Card terpusat max-width 560px. StepIndicator atas. Isi: H1 pertanyaan ("Usaha kamu jualan apa?") → kontrol besar (ChoiceCard/Input) → tombol lanjut lebar penuh + skip bila opsional. Data tersimpan per langkah (kembali tidak menghapus). Selesai → layar sukses singkat dengan konfeti kecil satu kali + "Lihat hasilnya" .

## E.5 Chat Page (Inbox Terpadu)

Desktop: 2 panel (daftar 360px + ruang chat). Mobile: 2 layar (daftar → chat, back button).
Ruang chat: header kontak (+ tombol "Lihat sebagai Calon Pembeli/Pesanan" bila tertaut), riwayat bubble (D.18), composer.
Panel konteks kanan (desktop ≥1280px): ringkasan lead/pesanan tertaut — auto-update saat AI membuat lead dari chat, dengan highlight kuning sekejap.

## E.6 Approval Page (Cek Pembayaran)

Pola "kotak masuk keputusan": daftar item menunggu → tap → layar/sheet fokus berisi **bukti (gambar transfer, zoomable)** di atas, data pembanding di bawah (jumlah tagihan vs transfer, nama pengirim, pesanan terkait), dua tombol besar sejajar: [✓ Terima] (success) [✕ Tolak] (outline destructive). Terima → modal konfirmasi 1 kalimat konsekuensi ("Pemasukan Rp 30.000 akan tercatat otomatis") → toast + item berikutnya otomatis tampil (mode beruntun). **Kenapa:** verifikasi adalah tugas harian berulang; setiap detik friksi terasa.

## E.7 Reporting Page (Keuangan)

- Header: pemilih periode segmented [Bulan Ini | Bulan Lalu | ▾ Pilih] — bukan date-range picker mentah.
- Seksi 1 "Uangmu bulan ini" — 3 StatCard: Masuk · Keluar · **Untung/Rugi** (hijau/merah + kalimat: "Untung Rp 1,2jt — lebih baik dari bulan lalu 👍").
- Seksi 2: grafik tunggal + takeaway.
- Seksi 3: rincian (ResponsiveList transaksi, filter kategori chips).
- Istilah teknis diterjemahkan di permukaan: "Laba Rugi" → tab "Untung-Rugi"; "Arus Kas" → "Keluar-Masuk Uang"; "Neraca" & export ada untuk Level 3 di tab "Lainnya". Angka tanpa `cost_price` → badge "belum lengkap" + CTA "Isi harga modal" (bukan angka salah diam-diam).

---

# F. Mobile Design Rules

Mobile adalah kondisi utama (mayoritas UMKM = HP). Desain mobile-first, desktop adalah perluasan.

## F.1 Bottom Navigation

- 5 item tetap (B.2), tinggi 64px + safe-area, ikon 24px + label 11px selalu tampil (ikon tanpa label ❌).
- Item aktif: ikon + label `--primary` + titik indikator. Badge angka merah untuk inbox/pesanan baru.
- Bottom nav hilang saat: wizard, layar chat aktif, sheet penuh — supaya fokus.

## F.2 Mobile Dashboard

Urutan E.1; StatCard 2×2; Rekomendasi Aksi carousel horizontal snap (peek 15% kartu berikut — isyarat bisa digeser) ATAU stack vertikal maks 3 — pilih **stack vertikal** sebagai default (scroll vertikal lebih akrab daripada horizontal).

## F.3 Mobile Forms

- 1 kolom penuh; label atas; field 48px; jarak 20px.
- Keyboard sesuai isi: `numeric` (Rp, stok), `tel` (WA), `email`. Enter = lanjut field.
- Form >5 field dipecah jadi langkah wizard, atau seksi accordion.
- Tombol simpan: sticky bawah, lebar penuh, di atas keyboard.
- Upload foto: kamera langsung + galeri; kompres client-side; preview + hapus.

## F.4 Mobile AI Interaction

- Semua interaksi AI kompleks = **bottom sheet** (bukan modal kecil): draft balasan AI, WhyPopover, hasil generate.
- Sheet hasil generate: preview atas, aksi bawah [Pakai] [🔁 Buat Ulang] [Edit].
- Pipeline riset (D.20) = layar penuh dengan opsi keluar; kalau keluar, chip status "⏳ Riset jalan…" muncul di Beranda dan berubah "✓ Selesai — lihat" saat kelar.

## F.5 Aturan sentuh & jangkauan

Target sentuh min 44×44 dengan jarak antar target ≥8px. Aksi utama diletakkan di paruh bawah layar (zona jempol). Aksi destruktif dijauhkan dari zona jempol (pojok kanan atas / balik konfirmasi). Tidak ada hover-only affordance — semua yang penting terlihat tanpa hover.

---

# G. AI Experience Design

AI adalah inti produk, tapi **pengguna tidak sedang membeli "AI" — mereka membeli hasil**. Maka AI hadir sebagai asisten yang sopan: muncul saat berguna, diam saat tidak, selalu bisa dicek, tidak pernah bertindak sendiri.

## G.1 Kapan AI Muncul

| Momen | Wujud |
|---|---|
| Selesai riset | 3 context otomatis → Rekomendasi Aksi di Beranda (push paling kuat yang diizinkan) |
| Masuk modul dengan context tersedia | ContextActiveBar tawaran (dismissible), bukan auto-apply |
| Momen niat: mau bikin konten / restock / ubah harga | 1 kartu saran kontekstual inline ("Mau lihat harga pasaran dulu?") |
| Chat pelanggan masuk | Draft balasan AI siap di composer (perlu 1 tap kirim) |
| Field yang bisa diisi dari data | Prefill + chip "✨ otomatis" (editable) |

## G.2 Kapan AI Diam (sama pentingnya)

- Saat pengguna sedang mengetik/mengedit — tidak ada saran menyela di tengah input.
- Tidak ada notifikasi push/banner berbunyi "AI" tanpa nilai konkret & baru.
- Saran yang sama yang sudah di-dismiss tidak muncul lagi ≤7 hari.
- Di alur uang (verifikasi pembayaran, catat transaksi) AI hanya menghitung & menampilkan — **tidak pernah menyarankan dengan nada mendesak** di area uang.
- Maks 3 saran tampil per layar. Tidak ada autoplay, tidak ada popup saran.

## G.3 Cara AI Memberi Rekomendasi

Selalu format kartu D.13: **[aksi konkret] + [1 kalimat nilai] + [sumber] + [biaya credit] + [1 tombol]**. Kalimat aksi selalu spesifik & bisa dieksekusi ("Turunkan harga Keripik Lv3 ke Rp 13.500", bukan "Optimalkan strategi harga"). Bahasa: seperti teman yang paham dagang, bukan konsultan ("Lagi rame yang nyari cemilan pedas — gas bikin konten sekarang").

## G.4 Cara AI Meminta Konfirmasi

Prinsip: **AI mengusulkan, manusia memutuskan, sistem mengeksekusi.**
- Perubahan data nyata (harga, stok, kirim broadcast, kirim balasan) → selalu **preview dulu** dengan nilai lama→baru ("Harga: ~~Rp 15.000~~ → **Rp 13.500**") + tombol konfirmasi eksplisit.
- Tidak ada "auto-apply" bahkan sebagai setting di v1. Tidak ada publish otomatis ke kanal publik, titik.
- Aksi beruntun (broadcast ke 40 pelanggan) → konfirmasi menyebut skala: "Kirim ke **40 pelanggan** sekarang? · ⚡8".

## G.5 Cara AI Menjelaskan Alasan

Setiap saran punya "Kenapa saran ini?" (D.15): data → arti → risiko, sumber disebut, maksimal 3 baris. Angka proyeksi selalu ditandai sebagai perkiraan ("kira-kira", "sekitar") dan menyertakan syaratnya ("kalau penjualan tetap seperti bulan ini"). ❌ kata "AI kami yang canggih", "berdasarkan algoritma" — jelaskan datanya, bukan teknologinya.

## G.6 Cara AI Menangani Kesalahan

| Kegagalan | Perilaku UI |
|---|---|
| Riset gagal/timeout | Layar error ramah: "Riset kali ini gagal — credit kamu sudah dikembalikan (⚡5)." + [Coba Lagi]. Refund WAJIB disebut eksplisit |
| Hasil generate jelek | Selalu ada [🔁 Buat Ulang] (generate ulang pertama dari context yang sama = gratis) + [Edit] — pengguna tidak pernah buntu dengan hasil jelek |
| AI tidak yakin / data tipis | Katakan jujur: "Datanya masih sedikit untuk kategori ini — saran ini masih kasar." Jangan berpura-pura presisi |
| Balasan chat AI salah konteks | Pemilik bisa edit draft sebelum kirim (default), dan tombol "Jangan balas otomatis untuk kontak ini" |
| Saran ditolak user | Tombol dismiss ✕ + opsional "Kenapa? [Nggak relevan / Udah tahu / Lainnya]" — 1 tap, boleh dilewati |

Nada pesan error AI: menyalahkan sistem, bukan pengguna; sebut kompensasi (refund); beri jalan keluar. Tidak pernah kode error mentah di permukaan (taruh di detail kecil "kode: RSCH-504" untuk support).

## G.7 Kepercayaan & batas

- Data pengguna tidak dipakai lintas-brand/lintas-user secara terlihat ("berdasarkan penjual lain" ❌ kecuali dari data pasar publik).
- Konten hasil AI di toko publik tidak diberi cap AI ke pembeli — cap "✨" hanya untuk mata pemilik.
- Semua pemotongan credit oleh aksi AI tercatat & bisa dilihat di riwayat credit (transparansi = retensi).

---

# H. States Catalog (Empty · Loading · Error)

## H.1 Empty States (teks final — pakai apa adanya)

| Layar | Emoji | Teks | CTA |
|---|---|---|---|
| Beranda (baru, belum apa-apa) | 👋 | "Selamat datang, [nama]! Mulai dari sini ya." | Checklist 3 langkah: Tambah Produk · Riset Pertama · Lihat Toko Online |
| Riset | 🔍 | "Kamu belum pernah riset. Sekali klik, kamu bisa tahu tren, harga pasaran, dan kompetitor." | "Riset Sekarang · ⚡5" + chips saran query |
| Konten | 📝 | "Belum ada konten. Yuk bikin konten pertama — ada saran dari riset kamu." | "✨ Bikin Konten" |
| Produk | 📦 | "Kamu belum punya produk. Tambah dulu biar bisa jualan & bikin konten." | "＋ Tambah Produk" |
| Inbox | 💬 | "Belum ada chat masuk. Sambungkan WhatsApp kamu dulu yuk." / (tersambung) "Chat dari pembeli bakal muncul di sini." | "Sambungkan WA" / bagikan link toko |
| Calon Pembeli | 🤝 | "Belum ada calon pembeli. Chat yang masuk akan otomatis tercatat di sini." | "Lihat Cara Kerjanya" (tur 3 langkah) |
| Pesanan | 🧾 | "Belum ada pesanan. Bagikan link toko kamu biar mulai ramai." | "Salin Link Toko" |
| Keuangan | 💰 | "Belum ada catatan uang. Pesanan yang dibayar akan tercatat otomatis — atau catat manual." | "Catat Pemasukan" |
| Hasil pencarian/filter kosong | 🔎 | "Nggak ketemu '[query]'. Coba kata lain?" | "Hapus Filter" |
| Credit riwayat | ⚡ | "Belum ada pemakaian credit." | — |

## H.2 Loading

| Situasi | Pola |
|---|---|
| Buka halaman (<3 dt) | Skeleton meniru layout (D.22) |
| Aksi tombol | Spinner dalam tombol + label progresif ("Menyimpan…") |
| Riset / generate AI (15–60 dt) | Pipeline progres (D.20), bisa ditinggal |
| Ganti brand | Overlay penuh singkat "Membuka [brand]…" |
| Refresh data ringan | Indikator halus di header seksi, konten lama tetap tampil (stale-while-revalidate) |

## H.3 Error

| Situasi | Pola | Teks contoh |
|---|---|---|
| Error validasi form | Inline di bawah field + fokus pindah ke field pertama yang error | "Harga jual wajib diisi" |
| Aksi gagal (server) | Toast error + [Coba Lagi]; state form dipertahankan | "Gagal menyimpan. Coba lagi ya." |
| Halaman gagal dimuat | Kartu error tengah + ilustrasi + [Muat Ulang] | "Halamannya nggak kebuka. Cek internet kamu, lalu muat ulang." |
| Offline | Banner atas kuning persisten | "Kamu lagi offline — perubahan akan tersimpan setelah tersambung." |
| Aksi AI gagal | G.6 (refund disebut) | — |
| Credit kurang | Modal top-up (Flow 4) | "Credit kamu kurang. Butuh ⚡5, sisa ⚡2." |
| Sesi habis (SSO) | Redirect login mwxmarket + kembali ke URL semula | — |
| 404 | "Halaman ini nggak ada." + [Ke Beranda] | — |

---

# I. Notification Patterns

Hierarki kanal (dari paling mengganggu — pakai yang paling rendah yang cukup):

| Kanal | Pakai untuk | Aturan |
|---|---|---|
| Badge angka (nav/bottom nav) | Item menunggu: chat baru, pesanan baru, pembayaran perlu dicek | Angka nyata, hilang saat dilihat |
| Dot indikator | Ada yang baru tapi tidak mendesak (rekomendasi baru) | — |
| Toast | Konfirmasi hasil aksi barusan | 4 dt, maks 1 |
| Banner in-app (atas konten) | Kondisi berlanjut yang butuh tindakan: credit habis, pembayaran menunggu >2 hari, WA terputus | Maks 1 banner; ada CTA; dismissible kecuali blocking |
| Modal | Hanya konfirmasi aksi & blocking error | Tidak pernah untuk promosi |
| (Fase 2) Notif WhatsApp | Kejadian penting saat user di luar app: pesanan baru, pembayaran masuk, riset selesai | Opt-in per jenis; WA dipilih karena itu habitat pengguna — bukan email |

❌ Tidak ada notification center di v1 (sumber kebenaran = badge di tempat kerjanya). ❌ Tidak ada notifikasi gamifikasi kosong ("Sudah 3 hari tidak login!").

---

# J. Accessibility Guidelines

Target: **WCAG 2.1 AA**.

1. **Kontras:** teks normal ≥4,5:1; teks besar/ikon ≥3:1. Kombinasi yang sudah diverifikasi: navy/putih ✅, `#C2560E`/putih ✅ (4,5:1), `--muted-foreground` `#6A7891` di putih ✅ untuk ≥13px. ❌ `#FF7A00` & `#DB6400` untuk teks normal.
2. **Sentuh & fokus:** target ≥44px; `:focus-visible` ring 2px `--ring` di SEMUA interaktif; urutan tab mengikuti urutan visual; skip-to-content di desktop.
3. **Semantik:** heading berjenjang (1 H1/halaman), landmark (`nav` `main` `aside`), tombol = `<button>`, link = `<a>` (link berpindah halaman, button beraksi — jangan tertukar).
4. **Form:** label ter-associate, error `aria-invalid` + `aria-describedby`, jangan auto-submit saat pilih.
5. **Dinamis:** toast `aria-live=polite`, error `assertive`; modal & sheet focus-trap + Esc; progress pipeline `role=status`.
6. **Media & warna:** status tidak pernah warna-saja (C.4); gambar bermakna beri `alt`; ikon dekoratif `aria-hidden`.
7. **Gerak:** hormati `prefers-reduced-motion` (C.9).
8. **Bahasa:** `lang="id"`; kalimat pendek; angka & tanggal format Indonesia (K.4) — keterbacaan adalah fitur aksesibilitas utama untuk audiens ini.

---

# K. Copywriting & Bahasa (wajib dipatuhi semua teks UI)

## K.1 Suara produk

Seperti **teman yang paham dagang**: hangat, singkat, percaya diri, tidak menggurui. Sapaan "kamu" (konsisten, jangan campur "Anda"). Boleh partikel ringan ("ya", "yuk", "dulu") di teks pendamping; JANGAN di label tombol & angka. Emoji: boleh 1 di sapaan/empty state; tidak di label tombol, tabel, atau pesan error uang.

## K.2 Glossary — istilah terlarang → istilah produk

| ❌ Jangan (teknis/ERP) | ✅ Pakai |
|---|---|
| Master Data | Data Produk |
| Inventory / Inventory Adjustment | Stok / Koreksi Stok |
| CRM Pipeline / Leads | Calon Pembeli |
| Procurement | Belanja Barang |
| Order Management | Pesanan |
| Payment Verification | Cek Pembayaran |
| Fulfillment / Shipping | Pengiriman |
| Campaign / Broadcast | Promosi |
| Revenue / Income | Pemasukan / Penjualan |
| Expense | Pengeluaran |
| Receivables / Payables | Belum Dibayar (piutang) / Harus Dibayar (hutang) |
| P&L / Laba Rugi (di permukaan) | Untung-Rugi |
| Cash Flow | Keluar-Masuk Uang |
| COGS / HPP (di permukaan) | Modal Terpakai |
| Margin | Untung per Produk |
| Dashboard | Beranda |
| Generate | Buatkan / Bikin |
| Submit | Simpan / Kirim |
| Cancel | Batal |
| Error / Failed | Gagal |
| Insight | (jelaskan isinya langsung) |
| Sync | Tersambung / Diperbarui |

Istilah baku yang sudah dikenal (Transfer, Resi, Ongkir, Stok, Diskon, Riset, Credit) dipertahankan. Istilah akuntansi formal tetap tersedia sebagai label sekunder di laporan Level 3 ("Untung-Rugi *(Laba Rugi)*") supaya bisa dibawa ke akuntan.

## K.3 Pola kalimat

- Tombol: kata kerja + objek, maks 3 kata ("Simpan Produk", "Cek Pembayaran").
- Judul halaman: kata benda ("Pesanan"); judul empty state: situasi + ajakan.
- Error: apa yang terjadi → efeknya → jalan keluar. Tanpa "Oops/Ups/Whoops", tanpa istilah teknis, tanpa menyalahkan.
- Konfirmasi: pertanyaan lengkap dengan objek & nilai ("Hapus produk 'Keripik Lv3'?") — jangan "Apakah Anda yakin?".
- Angka penting selalu diberi pembanding/arti ("Untung Rp 1,2jt — naik dari bulan lalu").

## K.4 Format angka, uang, waktu

| Hal | Format |
|---|---|
| Uang penuh | `Rp 15.000` (spasi setelah Rp, titik ribuan, tanpa desimal) |
| Uang ringkas (dashboard/chart) | `Rp 2,4jt` · `Rp 850rb` (satu desimal koma) |
| Uang minus | `-Rp 300.000` warna destructive |
| Tanggal | "12 Jul 2026"; relatif untuk <7 hari ("2 jam lalu", "Kemarin") |
| Waktu | 24 jam + WIB bila perlu ("14.30") |
| Persen | "40%" ; delta "↑ 12%" / "↓ 8%" + warna + kata |

---

# L. Checklist Implementasi (urutan kerja developer agent)

1. **Fondasi:** pasang `:root` C.5 ke globals.css; font (C.6) via next/font; util format uang/tanggal/telepon (K.4); komponen shadcn dasar (button, input, dialog, sheet, toast, badge, select, tabs, skeleton) disetel ke token.
2. **Shell:** AppShell (sidebar desktop + bottom nav & topbar mobile, B.2), BrandSwitcher (D.16), CreditChip (D.17).
3. **Komponen kunci produk:** AIRecommendationCard (D.13), ContextActiveBar (D.14), WhyPopover (D.15), AIPipelineProgress (D.20), StatCard (D.6), ResponsiveList (D.8), EmptyState (D.12), ChoiceCard (D.4), RpInput/PhoneInput (D.2).
4. **Alur sesuai fase Logic Flow:** Onboarding wizard (E.4) → Riset (E.2+E.3+D.20) → Beranda (E.1) → Konten → Toko (E.5, D.19, E.6) → Keuangan (E.7) → Credit.
5. **Gerbang kualitas per layar:** ✅ 4 state (H) · ✅ mobile tanpa scroll horizontal · ✅ semua teks lolos K.2 · ✅ aksi berbayar menampilkan ⚡ · ✅ aksi AI selalu preview-dulu (G.4) · ✅ fokus & kontras (J).

---

*Akhir dokumen — Design System v1.0. Perubahan terhadap token/pola wajib memperbarui dokumen ini dulu, baru kode.*
