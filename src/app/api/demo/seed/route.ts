// /api/demo/seed — POST: populate brand with realistic demo data
// Idempotent: detects prior demo data via SKU prefix "DEMO-" on products.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Demo data marker — used for idempotency check and reset safety.
export const DEMO_SKU_PREFIX = "DEMO-";

// ── date helpers (deterministic — no Math.random for dates) ─────────────────
const NOW = new Date();
function daysAgo(n: number, hour = 10, minute = 0): Date {
  const d = new Date(NOW);
  d.setDate(d.getDate() - n);
  d.setHours(hour, minute, 0, 0);
  return d;
}

// ── static research fallback (mirrors _pipeline.ts fallback shape) ──────────
const DEMO_RESEARCH_RESULT = {
  intent: "market_trend",
  target_audience: [
    {
      name: "Anak Muda",
      demography: "18-25 thn, kota besar",
      platform: "TikTok",
      pain: "Cemilan pedas murah buat hangs out",
      trigger: "Tren tantangan pedas di TikTok",
    },
    {
      name: "Mahasiswa",
      demography: "19-23 thn, kos",
      platform: "Instagram",
      pain: "Jajanan hemat tahan lama",
      trigger: "Lapar malam saat ngerjain tugas",
    },
    {
      name: "Ibu Rumah Tangga",
      demography: "30-45 thn",
      platform: "WhatsApp",
      pain: "Stok cemilan keluarga yang aman",
      trigger: "Belanja bulanan keluarga",
    },
  ],
  swot: {
    strengths: [
      "Resep rumahan autentik",
      "Harga terjangkau UMKM",
      "Rasa pedas khas",
      "Packaging menarik dan Instagramable",
    ],
    weaknesses: [
      "Distribusi masih terbatas Jabodetabek",
      "Belum ada branding kuat di marketplace",
      "Kapasitas produksi masih kecil",
    ],
    opportunities: [
      "Tren cemilan pedas naik 25% YoY",
      "Channel TikTok & Reels berkembang pesat",
      "Pasar UMKM online makin teredukasi",
    ],
    threats: [
      "Kompetitor besar (Maicih, Basreng Viral)",
      "Harga bahan baku (singkong, terigu) naik",
      "Tren pedas bisa cepat turun",
    ],
  },
  competitors: [
    {
      name: "Maicih",
      price_range: "Rp 15.000-25.000",
      social_activity: "Tinggi",
      marketplace_strength: "Kuat",
      threat_level: "tinggi",
    },
    {
      name: "Basreng Viral",
      price_range: "Rp 12.000-20.000",
      social_activity: "Sedang",
      marketplace_strength: "Sedang",
      threat_level: "sedang",
    },
  ],
  keywords: {
    hot: [
      "cemilanpedas",
      "keripikviral",
      "jajananmurah",
      "basrengkeju",
      "makaronimelting",
      "pedaslevel3",
    ],
    stable: [
      "keripikpedas",
      "basrengori",
      "makaronipedas",
      "cemilansiang",
      "jajanankos",
    ],
  },
  market_trend: {
    labels: ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun"],
    values: [50, 55, 60, 58, 70, 75],
    stats: { growth_pct: 25, peak: "Jun" },
  },
  content_recommendations: [
    {
      title: "Tantangan Level Pedas",
      platform: "TikTok",
      angle: "Berani coba level pedas tertinggi?",
      hashtags: ["#pedasbanget", "#cemilansiang", "#keripikviral"],
      best_time: "12-14 WIB",
    },
    {
      title: "Cemilan Hemat Anak Kos",
      platform: "Instagram",
      angle: "Rp 10rb udah rame-rame",
      hashtags: ["#jajananmurah", "#cemilankos"],
      best_time: "18-20 WIB",
    },
  ],
  pricing: {
    market_avg: "Rp 12.000-18.000",
    lowest: "Rp 8.000",
    highest: "Rp 25.000",
    recommendation:
      "Pertahankan harga di range Rp 12-15rb untuk segmen anak muda. Untuk paket jasa foto produk, harga Rp 250rb masih below market.",
  },
};

// ── inline context generation (mirrors _pipeline.generateContexts) ──────────
function buildContexts(researchId: string, brandName: string, brandCategory: string, brandTone: string) {
  const brandContext = { nama: brandName, kategori: brandCategory, tone: brandTone };
  const r = DEMO_RESEARCH_RESULT;

  const kontenContext = {
    research_id: researchId,
    brand_context: brandContext,
    recommendations: r.content_recommendations,
    keyword_suggestions: r.keywords.hot,
    target_audience: r.target_audience,
  };

  const tokoContext = {
    research_id: researchId,
    harga_pasar: {
      rata_rata: r.pricing.market_avg,
      termurah: r.pricing.lowest,
      termahal: r.pricing.highest,
    },
    produk_trending: r.keywords.hot.slice(0, 5),
    rekomendasi_umum: r.pricing.recommendation,
    competitors: r.competitors.map((c) => ({
      name: c.name,
      price_range: c.price_range,
      threat_level: c.threat_level,
    })),
  };

  const growthPct = r.market_trend.stats.growth_pct;
  const marginSebelum = 30;
  const marginSesudah = Math.min(80, Math.max(15, marginSebelum + Math.round(growthPct / 3)));
  const estimasiVolume = Math.max(50, Math.round(100 + growthPct * 2));
  const keuanganContext = {
    research_id: researchId,
    proyeksi_margin: {
      skenario: `Optimasi harga + tren pasar ${growthPct}%`,
      asumsi_modal: r.pricing.lowest,
      margin_sebelum: `${marginSebelum}%`,
      margin_sesudah: `${marginSesudah}%`,
      estimasi_volume: `${estimasiVolume} unit/bulan`,
      kesimpulan:
        `Dengan harga jual rata-rata ${r.pricing.market_avg} dan tren naik ${growthPct}%, ` +
        `estimasi margin naik dari ${marginSebelum}% ke ${marginSesudah}% pada volume ${estimasiVolume} unit/bulan.`,
    },
    rekomendasi_budget: r.pricing.recommendation,
    warning: r.swot.threats[0] || "Pantau kompetitor yang masuk pasar.",
  };

  return [
    { targetModule: "konten", contextJson: JSON.stringify(kontenContext) },
    { targetModule: "toko", contextJson: JSON.stringify(tokoContext) },
    { targetModule: "keuangan", contextJson: JSON.stringify(keuanganContext) },
  ];
}

// Small SVG placeholder for demo content images.
function svgPlaceholder(label: string, color: string): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'>
    <defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0%' stop-color='${color}' stop-opacity='0.9'/>
      <stop offset='100%' stop-color='#0D9488' stop-opacity='0.7'/>
    </linearGradient></defs>
    <rect width='400' height='400' fill='url(#g)'/>
    <text x='200' y='210' font-family='Manrope, sans-serif' font-size='28' font-weight='800' fill='white' text-anchor='middle'>${label}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { brandId } = body as { brandId?: string };
    if (!brandId) {
      return NextResponse.json({ error: "brandId wajib" }, { status: 400 });
    }

    const brand = await db.brand.findUnique({ where: { id: brandId } });
    if (!brand || brand.userId !== userId) {
      return NextResponse.json({ error: "brand tidak ditemukan" }, { status: 404 });
    }

    // ── Idempotency check: any product with DEMO- SKU prefix ──────────────
    const existingDemo = await db.product.findFirst({
      where: { brandId, sku: { startsWith: DEMO_SKU_PREFIX } },
      select: { id: true },
    });
    if (existingDemo) {
      return NextResponse.json({ alreadySeeded: true, seeded: false });
    }

    // ════════════════════════════════════════════════════════════════════
    // 1) PRODUCTS (4) — barang × 3, jasa × 1
    // ════════════════════════════════════════════════════════════════════
    const [keripik, basreng, makaroni, paketFoto] = await Promise.all([
      db.product.create({
        data: {
          brandId,
          type: "barang",
          name: "Keripik Singkong Pedas",
          price: 15000,
          costPrice: 9000,
          stock: 80,
          minStock: 15,
          sku: `${DEMO_SKU_PREFIX}KRK-001`,
          description:
            "Keripik singkong renyah dengan bumbu pedas level 3. Dibuat dari singkong pilihan, digoreng dengan minyak baru setiap batch.",
          imageUrl: svgPlaceholder("Keripik Pedas", "#F97316"),
          isActive: true,
        },
      }),
      db.product.create({
        data: {
          brandId,
          type: "barang",
          name: "Basreng Keju",
          price: 18000,
          costPrice: 11000,
          stock: 8,
          minStock: 10, // low stock (8 < 10) — demo trigger
          sku: `${DEMO_SKU_PREFIX}BSR-002`,
          description:
            "Basreng keju pedas, tekstur renyah dengan rasa keju yang kuat. Best seller untuk anak kos.",
          imageUrl: svgPlaceholder("Basreng Keju", "#FB923C"),
          isActive: true,
        },
      }),
      db.product.create({
        data: {
          brandId,
          type: "barang",
          name: "Makaroni Melting",
          price: 12000,
          costPrice: 7000,
          stock: 45,
          minStock: 10,
          sku: `${DEMO_SKU_PREFIX}MKR-003`,
          description:
            "Makaroni goreng pedas dengan sensasi melting di mulut. Camilan favorit untuk nemenin ngopi sore.",
          imageUrl: svgPlaceholder("Makaroni", "#F59E0B"),
          isActive: true,
        },
      }),
      db.product.create({
        data: {
          brandId,
          type: "jasa",
          name: "Paket Foto Produk UMKM",
          price: 250000,
          costPrice: 80000,
          stock: null,
          minStock: null,
          sku: `${DEMO_SKU_PREFIX}JSA-FOTO`,
          description:
            "Jasa fotografi produk UMKM (10 produk, 5 foto per produk). Termasuk editing basic & watermark brand.",
          imageUrl: svgPlaceholder("Paket Foto", "#14B8A6"),
          isActive: true,
        },
      }),
    ]);

    // ════════════════════════════════════════════════════════════════════
    // 2) CUSTOMERS (2) — linked from Deal/Closed leads
    // ════════════════════════════════════════════════════════════════════
    // totalSpent/totalOrders will be updated after verified payments are inserted.
    const [andiCust, mayaCust] = await Promise.all([
      db.customer.create({
        data: {
          brandId,
          name: "Andi Wijaya",
          phone: "6281234567891",
          email: "andi.w@example.com",
          firstOrderAt: daysAgo(12, 9, 30),
          totalOrders: 0,
          totalSpent: 0,
        },
      }),
      db.customer.create({
        data: {
          brandId,
          name: "Maya Putri",
          phone: "6281234567892",
          email: null,
          firstOrderAt: daysAgo(6, 14, 15),
          totalOrders: 0,
          totalSpent: 0,
        },
      }),
    ]);

    // ════════════════════════════════════════════════════════════════════
    // 3) LEADS (5) across stages
    // ════════════════════════════════════════════════════════════════════
    const [leadBudi, leadSiti, leadAndi, leadMaya, leadRudi] = await Promise.all([
      db.lead.create({
        data: {
          brandId,
          name: "Budi Santoso",
          phone: "6281234567881",
          sourceChannel: "wa",
          stage: "Baru",
          notes: "Tanya harga keripik pedas. Tertarik borongan untuk acara kantor.",
          lastContactedAt: daysAgo(1, 11, 0),
        },
      }),
      db.lead.create({
        data: {
          brandId,
          name: "Siti Rahayu",
          phone: "6281234567882",
          sourceChannel: "ig",
          stage: "Negosiasi",
          notes: "Mau borong 10 pack untuk acara ulang tahun. Negosiasi harga.",
          lastContactedAt: daysAgo(2, 15, 30),
        },
      }),
      db.lead.create({
        data: {
          brandId,
          customerId: andiCust.id,
          name: "Andi Wijaya",
          phone: "6281234567891",
          sourceChannel: "wa",
          stage: "Deal",
          notes: "Sudah transfer, tunggu kirim. Repeat customer potensial.",
          lastContactedAt: daysAgo(12, 10, 0),
        },
      }),
      db.lead.create({
        data: {
          brandId,
          customerId: mayaCust.id,
          name: "Maya Putri",
          phone: "6281234567892",
          sourceChannel: "wa",
          stage: "Closed",
          notes: "Repeat order bulan lalu. Puas dengan rasa & packaging.",
          lastContactedAt: daysAgo(6, 14, 0),
        },
      }),
      db.lead.create({
        data: {
          brandId,
          name: "Rudi Hartono",
          phone: "6281234567883",
          sourceChannel: "telegram",
          stage: "Baru",
          notes: "Tanya ketersediaan basreng. Stok lagi menipis, perlu restok.",
          lastContactedAt: daysAgo(0, 9, 0),
        },
      }),
    ]);

    // ════════════════════════════════════════════════════════════════════
    // 4) ORDERS (6) + PAYMENTS (4) + verified-payment TRANSACTIONS (3)
    // We DO decrement stock for non-cancelled barang orders, mirroring the
    // /api/orders POST behavior. Cancelled orders leave stock untouched.
    // ════════════════════════════════════════════════════════════════════
    type EnrichedItem = { productId: string; name: string; qty: number; price: number; type: string };

    // Order #1: Andi, 2× Keripik, Dikirim, paid + verified
    const o1Items: EnrichedItem[] = [
      { productId: keripik.id, name: keripik.name, qty: 2, price: keripik.price, type: "barang" },
    ];
    const o1Total = 30000;
    const o1 = await db.order.create({
      data: {
        brandId,
        customerId: andiCust.id,
        leadId: leadAndi.id,
        items: JSON.stringify(o1Items),
        totalAmount: o1Total,
        status: "Dikirim",
        resiNumber: "JNE12345",
        shippingCourier: "JNE",
        shippingCost: null,
        notes: "Kirim ke Bandung, alamat ada di WA.",
        createdAt: daysAgo(12, 9, 30),
      },
    });
    await db.product.update({
      where: { id: keripik.id },
      data: { stock: (keripik.stock ?? 0) - 2 },
    });
    const p1 = await db.payment.create({
      data: {
        orderId: o1.id,
        amount: o1Total,
        method: "transfer",
        status: "Diterima",
        verifiedAt: daysAgo(12, 10, 15),
        createdAt: daysAgo(12, 9, 45),
      },
    });
    const t1 = await db.transaction.create({
      data: {
        userId,
        brandId,
        orderId: o1.id,
        customerId: andiCust.id,
        productId: keripik.id,
        type: "income",
        category: "penjualan",
        amount: o1Total,
        costAmount: (keripik.costPrice ?? 0) * 2, // HPP 18.000
        quantity: 2,
        description: `Pembayaran diterima — Order #${o1.id.slice(-6)}`,
        date: daysAgo(12, 10, 15),
      },
    });

    // Order #2: Andi, 1× Basreng, Selesai, paid + verified
    const o2Items: EnrichedItem[] = [
      { productId: basreng.id, name: basreng.name, qty: 1, price: basreng.price, type: "barang" },
    ];
    const o2Total = 18000;
    const o2 = await db.order.create({
      data: {
        brandId,
        customerId: andiCust.id,
        leadId: null,
        items: JSON.stringify(o2Items),
        totalAmount: o2Total,
        status: "Selesai",
        resiNumber: "JNE12346",
        shippingCourier: "JNE",
        shippingCost: null,
        notes: null,
        createdAt: daysAgo(8, 13, 0),
      },
    });
    await db.product.update({
      where: { id: basreng.id },
      data: { stock: (basreng.stock ?? 0) - 1 },
    });
    const p2 = await db.payment.create({
      data: {
        orderId: o2.id,
        amount: o2Total,
        method: "qris",
        status: "Diterima",
        verifiedAt: daysAgo(8, 13, 20),
        createdAt: daysAgo(8, 13, 5),
      },
    });
    const t2 = await db.transaction.create({
      data: {
        userId,
        brandId,
        orderId: o2.id,
        customerId: andiCust.id,
        productId: basreng.id,
        type: "income",
        category: "penjualan",
        amount: o2Total,
        costAmount: (basreng.costPrice ?? 0) * 1, // HPP 11.000
        quantity: 1,
        description: `Pembayaran diterima — Order #${o2.id.slice(-6)}`,
        date: daysAgo(8, 13, 20),
      },
    });

    // Order #3: Maya, 1× Makaroni, Selesai, paid + verified
    const o3Items: EnrichedItem[] = [
      { productId: makaroni.id, name: makaroni.name, qty: 1, price: makaroni.price, type: "barang" },
    ];
    const o3Total = 12000;
    const o3 = await db.order.create({
      data: {
        brandId,
        customerId: mayaCust.id,
        leadId: leadMaya.id,
        items: JSON.stringify(o3Items),
        totalAmount: o3Total,
        status: "Selesai",
        resiNumber: "TIKI77889",
        shippingCourier: "TIKI",
        shippingCost: null,
        notes: null,
        createdAt: daysAgo(6, 14, 0),
      },
    });
    await db.product.update({
      where: { id: makaroni.id },
      data: { stock: (makaroni.stock ?? 0) - 1 },
    });
    const p3 = await db.payment.create({
      data: {
        orderId: o3.id,
        amount: o3Total,
        method: "transfer",
        status: "Diterima",
        verifiedAt: daysAgo(6, 14, 20),
        createdAt: daysAgo(6, 14, 5),
      },
    });
    const t3 = await db.transaction.create({
      data: {
        userId,
        brandId,
        orderId: o3.id,
        customerId: mayaCust.id,
        productId: makaroni.id,
        type: "income",
        category: "penjualan",
        amount: o3Total,
        costAmount: (makaroni.costPrice ?? 0) * 1, // HPP 7.000
        quantity: 1,
        description: `Pembayaran diterima — Order #${o3.id.slice(-6)}`,
        date: daysAgo(6, 14, 20),
      },
    });

    // Order #4: Walk-in, 3× Keripik, Diproses, pending payment (Menunggu)
    const o4Items: EnrichedItem[] = [
      { productId: keripik.id, name: keripik.name, qty: 3, price: keripik.price, type: "barang" },
    ];
    const o4Total = 45000;
    const o4 = await db.order.create({
      data: {
        brandId,
        customerId: null,
        leadId: null,
        items: JSON.stringify(o4Items),
        totalAmount: o4Total,
        status: "Diproses",
        resiNumber: null,
        shippingCourier: null,
        shippingCost: null,
        notes: "Walk-in customer dari IG DM.",
        createdAt: daysAgo(2, 16, 0),
      },
    });
    await db.product.update({
      where: { id: keripik.id },
      // keripik started at 80; -2 from o1, now -3 more from o4 → 75
      data: { stock: (keripik.stock ?? 0) - 2 - 3 },
    });
    const p4 = await db.payment.create({
      data: {
        orderId: o4.id,
        amount: o4Total,
        method: "transfer",
        status: "Menunggu",
        verifiedAt: null,
        createdAt: daysAgo(2, 16, 5),
      },
    });

    // Order #5: Walk-in, 1× Paket Foto (jasa), Baru, no payment yet
    const o5Items: EnrichedItem[] = [
      { productId: paketFoto.id, name: paketFoto.name, qty: 1, price: paketFoto.price, type: "jasa" },
    ];
    const o5Total = 250000;
    const o5 = await db.order.create({
      data: {
        brandId,
        customerId: null,
        leadId: null,
        items: JSON.stringify(o5Items),
        totalAmount: o5Total,
        status: "Baru",
        resiNumber: null,
        shippingCourier: null,
        shippingCost: null,
        notes: "Jasa foto produk — schedule next week.",
        createdAt: daysAgo(1, 11, 0),
      },
    });
    // No payment for o5 (no payment row, no transaction).

    // Order #6: Walk-in, 2× Basreng, Dibatalkan — stock NOT decremented
    const o6Items: EnrichedItem[] = [
      { productId: basreng.id, name: basreng.name, qty: 2, price: basreng.price, type: "barang" },
    ];
    const o6Total = 36000;
    const o6 = await db.order.create({
      data: {
        brandId,
        customerId: null,
        leadId: null,
        items: JSON.stringify(o6Items),
        totalAmount: o6Total,
        status: "Dibatalkan",
        resiNumber: null,
        shippingCourier: null,
        shippingCost: null,
        notes: "Customer batal — stok dikembalikan.",
        createdAt: daysAgo(4, 10, 0),
      },
    });
    // No payment for o6.

    // ════════════════════════════════════════════════════════════════════
    // 5) Update customer totals from verified payments
    // ════════════════════════════════════════════════════════════════════
    await db.customer.update({
      where: { id: andiCust.id },
      data: { totalOrders: 2, totalSpent: o1Total + o2Total }, // 48.000
    });
    await db.customer.update({
      where: { id: mayaCust.id },
      data: { totalOrders: 1, totalSpent: o3Total }, // 12.000
    });

    // ════════════════════════════════════════════════════════════════════
    // 6) MANUAL EXPENSE TRANSACTIONS (3) — spread over last 5 days
    // ════════════════════════════════════════════════════════════════════
    const [expBahan, expOperasional, expMarketing] = await Promise.all([
      db.transaction.create({
        data: {
          userId,
          brandId,
          type: "expense",
          category: "bahan_baku",
          amount: 50000,
          description: "Beli singkong 5kg + bumbu pedas",
          date: daysAgo(5, 8, 0),
        },
      }),
      db.transaction.create({
        data: {
          userId,
          brandId,
          type: "expense",
          category: "operasional",
          amount: 25000,
          description: "Listrik & gas untuk produksi mingguan",
          date: daysAgo(3, 9, 0),
        },
      }),
      db.transaction.create({
        data: {
          userId,
          brandId,
          type: "expense",
          category: "marketing",
          amount: 15000,
          description: "Boost IG post Keripik Pedas",
          date: daysAgo(1, 17, 0),
        },
      }),
    ]);

    // ════════════════════════════════════════════════════════════════════
    // 7) CONTENT (10) — gambar × 7, video × 1, caption × 2
    // ════════════════════════════════════════════════════════════════════
    const pic = (seed: string) => `https://picsum.photos/seed/${seed}/512/512`;
    const [c1, c2, c3, c4, c5, c6, c7, c8, c9, c10] = await Promise.all([
      // ── Gambar (7) ──────────────────────────────────────────────────
      db.content.create({
        data: { brandId, productId: keripik.id, type: "gambar",
          assetUrl: pic("keripikpedas1"),
          body: "Siapa yang kuat level 3? 🔥🌶️ Keripik Singkong Pedas kami bukan mainan — renyah, gurih, pedasnya nempel di lidah! Cocok buat nemenin sore sambil ngopi atau ngemil santai.\n\n#keripikpedas #pedasviral #snackindo #keripiksingkong",
          platform: "Instagram", createdAt: daysAgo(10, 12, 0) },
      }),
      db.content.create({
        data: { brandId, productId: basreng.id, type: "gambar",
          assetUrl: pic("basrengkeju1"),
          body: "Basreng Keju — perpaduan sempurna antara gurihnya basreng dan lumer nya keju! 🧀✨ Satu gigitan langsung nagih.\n\n#basrengkeju #snackviral #cemilankekinian #jajanmurah",
          platform: "TikTok", createdAt: daysAgo(9, 14, 0) },
      }),
      db.content.create({
        data: { brandId, productId: makaroni.id, type: "gambar",
          assetUrl: pic("makaroni1"),
          body: "Makaroni Melting favorit sejuta umat! 🍝 Renyah di luar, lumer di dalem. Auto repeat order tiap minggu. Cobain deh!\n\n#makaronimelting #snackpedas #pedasmurah #makaroniviral",
          platform: "Instagram", createdAt: daysAgo(7, 10, 0) },
      }),
      db.content.create({
        data: { brandId, productId: keripik.id, type: "gambar",
          assetUrl: pic("chips1"),
          body: "Paket hemat 3 rasa — Pedas, Balado, BBQ. Tinggal pilih mood kamu hari ini! 💥 Cuma Rp 15rb-an udah dapet 3 varian.\n\n#pakethemat #snackbox #hadiahunik #oleholeh",
          platform: "Facebook", createdAt: daysAgo(5, 16, 0) },
      }),
      db.content.create({
        data: { brandId, productId: basreng.id, type: "gambar",
          assetUrl: pic("snackbox1"),
          body: "Mau ngirim hadiah buat temen? Snack Box spesial dari kami solusinya 🎁✨ Isinya full snack best-seller, packaging kece, siap kirim seluruh Indonesia!\n\n#snackbox #giftideas #hadiahunik #boxsnack",
          platform: "Instagram", createdAt: daysAgo(4, 9, 0) },
      }),
      db.content.create({
        data: { brandId, productId: makaroni.id, type: "gambar",
          assetUrl: pic("pedas1"),
          body: "Yang suka pedes merapat! 🔥 Makaroni level max — pedesnya bikin merinding tapi nagih pol! Berani coba? Share foto kamu makan ini ya!\n\n#pedasbanget #tantanganpedas #makaroniviral #makanpedas",
          platform: "TikTok", createdAt: daysAgo(2, 20, 0) },
      }),
      db.content.create({
        data: { brandId, productId: keripik.id, type: "gambar",
          assetUrl: pic("snackdisplay1"),
          body: "Ready stok penuh nih! 📦 Cek etalase kami buat liat semua varian. Bisa custom isi juga lho — cocok buat jualan lagi atau hampers.\n\n#readyStok #grosirSnack #snackmurah #etalasesnack",
          platform: "Instagram", createdAt: daysAgo(1, 11, 0) },
      }),
      // ── Video Script (1) ────────────────────────────────────────────
      db.content.create({
        data: { brandId, productId: keripik.id, type: "video",
          body: JSON.stringify({
            script: "Video 24 detik review Keripik Singkong Pedas level 3 — opening dengan reaksi pedas, close-up kerenyahan, dan CTA di akhir.",
            scenes: [
              { duration_sec: 3, visual: "Close-up tangan buka kemasan keripik, slow motion", voiceover: "Wait... ini pedas banget gak sih?", text_overlay: "Level 3 🔥" },
              { duration_sec: 5, visual: "Shot keripik diangkat, lighting dramatis, tekstur renyah terlihat jelas", voiceover: "Lihat teksturnya — renyah maksimal, bukan keripik biasa!", text_overlay: "" },
              { duration_sec: 6, visual: "Seseorang makan, reaksi kaget tapi senang, mata melebar", voiceover: "Pedasnya nampol tapi nagih! Sekali coba pasti repeat.", text_overlay: "Nampol! 🌶️" },
              { duration_sec: 5, visual: "B-roll berbagai varian di meja dengan dekorasi estetik", voiceover: "Ada level 1, 2, 3. Semua pakai resep rumahan asli.", text_overlay: "3 Level Pedas" },
              { duration_sec: 5, visual: "CTA dengan logo brand, nomor WA, dan produk display", voiceover: "Pesan sekarang! Stok terbatas tiap batch. DM/WA ya kak 👆", text_overlay: "DM/WA Sekarang!" },
            ],
            hashtags: ["#keripikpedas", "#reviewmakanan", "#fyp", "#snackviral", "#umkm"],
            hooks: ["Wait... ini pedas banget?", "Keripik singkong tapi level dewa?", "Jangan salah pilih level!", "Ini snack paling berbahaya yang pernah ada 😱"],
          }),
          platform: "TikTok", createdAt: daysAgo(6, 19, 0) },
      }),
      // ── Caption (2) ─────────────────────────────────────────────────
      db.content.create({
        data: { brandId, productId: keripik.id, type: "caption",
          body: "Hai Sob! 🔥 Yuk cobain Keripik Singkong Pedas level 3 kami — renyahnya juara, pedasnya nampol! 🌶️\n\nPerfect banget buat nemenin ngopi sore atau maraton Netflix malam. Stok 80 pack ready, buruan checkout sebelum habis! 🏃‍♂️💨\n\nHanya Rp 15.000/pack. DM atau WA aja ya kak 📲\n\n#keripikpedas #cemilansiang #jajananviral #pedasbanget #keripikviral",
          platform: "Instagram", createdAt: daysAgo(10, 12, 0) },
      }),
      db.content.create({
        data: { brandId, productId: makaroni.id, type: "caption",
          body: "Cemilan anak kos paling worth it! 🍝🔥 Makaroni Melting kami dijamin nagih — renyah di luar, melting di dalam.\n\nCuma Rp 12rb udah dapet rasa bintang 5 ⭐⭐⭐⭐⭐\n\nYang udah cobain komen di bawah ya! 👇\n\n#makaronimelting #cemilankos #jajananmurah #pedasviral",
          platform: "TikTok", createdAt: daysAgo(3, 18, 0) },
      }),
    ]);

    // ════════════════════════════════════════════════════════════════════
    // 8) INBOX MESSAGES (2 threads) — chronological within thread
    // ════════════════════════════════════════════════════════════════════
    // Thread A: Andi (existing customer) — inbound + AI outbound
    const msgA1 = await db.inboxMessage.create({
      data: {
        brandId,
        userId,
        channel: "wa",
        fromNumber: "6281234567891",
        fromName: "Andi Wijaya",
        messageText: "Kak, keripik pedasnya ready?",
        direction: "inbound",
        leadId: leadAndi.id,
        createdAt: daysAgo(3, 10, 0),
      },
    });
    const msgA2 = await db.inboxMessage.create({
      data: {
        brandId,
        userId,
        channel: "wa",
        fromNumber: "6281234567891",
        fromName: "Andi Wijaya",
        messageText:
          "Halo kak Andi! 😊 Ready banget keripik pedasnya. Stok masih 80 pack. Mau pesen berapa kak? Untuk borongan 10+ dapet diskon 5% lho 🎉",
        direction: "outbound",
        repliedBy: "ai",
        leadId: leadAndi.id,
        createdAt: daysAgo(3, 10, 2),
      },
    });
    // Thread B: new number (Rudi-like) — inbound only, lead linked above
    const msgB1 = await db.inboxMessage.create({
      data: {
        brandId,
        userId,
        channel: "wa",
        fromNumber: "6281234567893",
        fromName: null,
        messageText: "Harga basreng berapa kak? Minat mau borong",
        direction: "inbound",
        leadId: leadRudi.id,
        createdAt: daysAgo(1, 14, 30),
      },
    });

    // ════════════════════════════════════════════════════════════════════
    // 9) RESEARCH (1) + 3 CONTEXTS — uses fallback result shape
    // ════════════════════════════════════════════════════════════════════
    const research = await db.research.create({
      data: {
        userId,
        brandId,
        query: "Tren cemilan pedas Indonesia 2026",
        intent: "market_trend",
        resultJson: JSON.stringify(DEMO_RESEARCH_RESULT),
        status: "completed",
        createdAt: daysAgo(7, 9, 0),
      },
    });

    const ctxData = buildContexts(research.id, brand.name, brand.category, brand.toneOfVoice);
    const [ctxKonten, ctxToko, ctxKeuangan] = await Promise.all([
      db.context.create({
        data: { researchId: research.id, brandId, targetModule: ctxData[0].targetModule, contextJson: ctxData[0].contextJson, createdAt: daysAgo(7, 9, 1) },
      }),
      db.context.create({
        data: { researchId: research.id, brandId, targetModule: ctxData[1].targetModule, contextJson: ctxData[1].contextJson, createdAt: daysAgo(7, 9, 1) },
      }),
      db.context.create({
        data: { researchId: research.id, brandId, targetModule: ctxData[2].targetModule, contextJson: ctxData[2].contextJson, createdAt: daysAgo(7, 9, 1) },
      }),
    ]);

    // ════════════════════════════════════════════════════════════════════
    // 10) CAMPAIGN (1 sent) — WA, 2 recipients, mock 50% open / 25% click
    // ════════════════════════════════════════════════════════════════════
    const sentAt = daysAgo(2, 10, 0);
    const campaign = await db.campaign.create({
      data: {
        brandId,
        channel: "wa",
        name: "Promo Cemilan Pedas",
        subject: null,
        body:
          "Hai Sob! 🔥 Lagi promo nih — Keripik Singkong Pedas buy 2 get 1 mini pack! Berlaku sampai akhir pekan. Yuk checkout sebelum kehabisan 🏃‍♂️💨",
        scheduledAt: null,
        sentAt,
        status: "sent",
        createdAt: daysAgo(2, 9, 30),
      },
    });
    // Recipients: Andi (customer) + Budi (lead). Mock stats:
    //   Andi: opened + clicked (1 of 2 = 50% open, 1 of 2 clicked = 25%-of-sent equivalent)
    //   Budi: opened, not clicked.
    await db.campaignRecipient.createMany({
      data: [
        {
          campaignId: campaign.id,
          customerId: andiCust.id,
          leadId: null,
          contact: "6281234567891",
          sent: true,
          deliveredAt: sentAt,
          openedAt: sentAt,
          clickedAt: sentAt,
        },
        {
          campaignId: campaign.id,
          customerId: null,
          leadId: leadBudi.id,
          contact: "6281234567881",
          sent: true,
          deliveredAt: sentAt,
          openedAt: sentAt,
          clickedAt: null,
        },
      ],
    });

    // ════════════════════════════════════════════════════════════════════
    // Done — return counts
    // ════════════════════════════════════════════════════════════════════
    const counts = {
      products: 4,
      leads: 5,
      customers: 2,
      orders: 6,
      payments: 4, // p1-p4 (o5 and o6 have no payment)
      transactions: 3 + 3, // 3 income (t1-t3) + 3 manual expenses
      content: 10, // c1-c10 (7 gambar, 1 video, 2 caption)
      inbox: 3, // msgA1, msgA2, msgB1
      research: 1,
      campaigns: 1,
    };

    // Touch created rows so TS doesn't flag unused locals — they ARE used via
    // FK references persisted in the DB, but the variable bindings themselves
    // are only read inside this function for id references above.
    void [
      paketFoto, o5, o6, p1, p2, p3, p4, t1, t2, t3,
      expBahan, expOperasional, expMarketing, c1, c2, c3, c4, c5, c6, c7, c8, c9, c10,
      msgA1, msgA2, msgB1, ctxKonten, ctxToko, ctxKeuangan, leadSiti,
    ];

    return NextResponse.json({ seeded: true, alreadySeeded: false, counts });
  } catch (err) {
    console.error("[demo/seed] fatal:", err);
    return NextResponse.json(
      { error: "Gagal memuat data demo", detail: err instanceof Error ? err.message : "unknown_error" },
      { status: 500 }
    );
  }
}
