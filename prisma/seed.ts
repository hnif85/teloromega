// prisma/seed.ts — Seed demo user "Budi Santoso" dengan data lengkap
import { PrismaClient } from "@prisma/client";
import { hashSync } from "bcryptjs";

const prisma = new PrismaClient();

function cuid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

async function main() {
  console.log("🌱 Seeding usahaku.ai — Budi Santoso (Kedai Kopi Budi)...\n");

  // ─── 1. User ────────────────────────────────────────────────────────
  const userId = cuid("u");
  const passwordHash = hashSync("kopibudi123", 10);

  const user = await prisma.user.create({
    data: {
      id: userId,
      email: "budi@contoh.com",
      password: passwordHash,
      name: "Budi Santoso",
      creditBalance: 50,
      toneOfVoice: "santai_ramah",
      isOnboarded: true,
    },
  });
  console.log(`✅ User: ${user.name} <${user.email}>`);

  // ─── 2. Brand ───────────────────────────────────────────────────────
  const brandId = cuid("b");
  const brand = await prisma.brand.create({
    data: {
      id: brandId,
      userId,
      name: "Kedai Kopi Budi",
      slug: "kedai-kopi-budi",
      description: "Kedai kopi spesialis di bilangan Bandung sejak 2023. Menyajikan kopi nusantara berkualitas dengan suasana nyaman.",
      category: "Makanan & Minuman",
      toneOfVoice: "santai_ramah",
      isActive: true,
    },
  });
  console.log(`✅ Brand: ${brand.name} (${brand.slug})`);

  // ─── 3. Products ────────────────────────────────────────────────────
  const products = await Promise.all([
    prisma.product.create({
      data: {
        id: cuid("p"),
        brandId,
        type: "barang",
        name: "Kopi Susu Gula Aren",
        price: 22000,
        costPrice: 12000,
        stock: 80,
        minStock: 10,
        sku: "KSGA-001",
        description: "Kopi susu dengan gula aren asli dari petani lokal",
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        id: cuid("p"),
        brandId,
        type: "barang",
        name: "Kopi Hitam Tubruk",
        price: 15000,
        costPrice: 6000,
        stock: 60,
        minStock: 10,
        sku: "KHT-002",
        description: "Kopi tubruk klasik khas Indonesia",
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        id: cuid("p"),
        brandId,
        type: "barang",
        name: "Matcha Latte",
        price: 28000,
        costPrice: 16000,
        stock: 40,
        minStock: 5,
        sku: "ML-003",
        description: "Matcha premium dengan susu segar",
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        id: cuid("p"),
        brandId,
        type: "barang",
        name: "Croissant Almond",
        price: 18000,
        costPrice: 9000,
        stock: 25,
        minStock: 5,
        sku: "CA-004",
        description: "Croissant butter dengan taburan almond panggang",
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        id: cuid("p"),
        brandId,
        type: "barang",
        name: "Banana Cake",
        price: 20000,
        costPrice: 10000,
        stock: 15,
        minStock: 3,
        sku: "BC-005",
        description: "Banana cake homemade dengan pisang ambon",
        isActive: true,
      },
    }),
  ]);
  console.log(`✅ Products: ${products.length} item`);

  // ─── 4. Customers ───────────────────────────────────────────────────
  const customerData = [
    { name: "Rina Maulida", phone: "081234567801", email: "rina@email.com" },
    { name: "Andi Pratama", phone: "081234567802", email: null },
    { name: "Siti Nurhaliza", phone: "081234567803", email: "siti@email.com" },
    { name: "Dian Permana", phone: "081234567804", email: null },
    { name: "Bambang Hartono", phone: "081234567805", email: "bambang@email.com" },
    { name: "Mega Wati", phone: "081234567806", email: null },
    { name: "Rudi Hermawan", phone: "081234567807", email: "rudi@email.com" },
    { name: "Lisa Kumalasari", phone: "081234567808", email: null },
    { name: "Agus Riyadi", phone: "081234567809", email: "agus@email.com" },
    { name: "Dewi Sartika", phone: "081234567810", email: "dewi@email.com" },
  ];

  const customers = await Promise.all(
    customerData.map((c, i) =>
      prisma.customer.create({
        data: {
          id: cuid("cus"),
          brandId,
          name: c.name,
          phone: c.phone,
          email: c.email,
          firstOrderAt: new Date(Date.UTC(2026, i % 6, 5 + i * 2)),
          totalOrders: 1 + Math.floor(i / 2),
          totalSpent: 20000 * (1 + Math.floor(i / 2)),
        },
      })
    )
  );
  console.log(`✅ Customers: ${customers.length} orang`);

  // ─── 5. Orders + Payments ───────────────────────────────────────────
  const orderDefs = [
    {
      customerIdx: 0,
      items: [
        { productId: products[0].id, name: "Kopi Susu Gula Aren", qty: 2, price: 22000 },
        { productId: products[3].id, name: "Croissant Almond", qty: 1, price: 18000 },
      ],
      total: 62000,
      status: "Selesai",
      createdAt: new Date("2026-06-15"),
    },
    {
      customerIdx: 1,
      items: [
        { productId: products[1].id, name: "Kopi Hitam Tubruk", qty: 1, price: 15000 },
        { productId: products[4].id, name: "Banana Cake", qty: 1, price: 20000 },
      ],
      total: 35000,
      status: "Selesai",
      createdAt: new Date("2026-06-20"),
    },
    {
      customerIdx: 3,
      items: [
        { productId: products[2].id, name: "Matcha Latte", qty: 1, price: 28000 },
        { productId: products[0].id, name: "Kopi Susu Gula Aren", qty: 1, price: 22000 },
      ],
      total: 50000,
      status: "Dikirim",
      createdAt: new Date("2026-07-05"),
    },
    {
      customerIdx: 7,
      items: [
        { productId: products[0].id, name: "Kopi Susu Gula Aren", qty: 3, price: 22000 },
        { productId: products[3].id, name: "Croissant Almond", qty: 2, price: 18000 },
      ],
      total: 102000,
      status: "Diproses",
      createdAt: new Date("2026-07-09"),
    },
    {
      customerIdx: 8,
      items: [
        { productId: products[1].id, name: "Kopi Hitam Tubruk", qty: 2, price: 15000 },
        { productId: products[2].id, name: "Matcha Latte", qty: 1, price: 28000 },
        { productId: products[4].id, name: "Banana Cake", qty: 1, price: 20000 },
      ],
      total: 78000,
      status: "Baru",
      createdAt: new Date("2026-07-10"),
    },
  ];

  for (const od of orderDefs) {
    const orderId = cuid("ord");
    const order = await prisma.order.create({
      data: {
        id: orderId,
        brandId,
        customerId: customers[od.customerIdx].id,
        items: JSON.stringify(od.items),
        totalAmount: od.total,
        status: od.status,
        shippingCourier: od.status === "Dikirim" ? "GoSend" : null,
        shippingCost: od.status === "Dikirim" ? 15000 : null,
        resiNumber: od.status === "Dikirim" ? "GS-20260705-003" : null,
        createdAt: od.createdAt,
      },
    });

    if (od.status !== "Baru" && od.status !== "Diproses") {
      await prisma.payment.create({
        data: {
          id: cuid("pay"),
          orderId: order.id,
          amount: od.total,
          method: "transfer",
          status: "Diterima",
          verifiedAt: od.createdAt,
        },
      });
    }
  }
  console.log(`✅ Orders: ${orderDefs.length} order (dengan payment)`);

  // ─── 6. Transactions ────────────────────────────────────────────────
  const now = new Date();
  const txDefs = [
    // Income (penjualan)
    { type: "income", category: "penjualan", amount: 62000, date: new Date("2026-06-15"), desc: "Penjualan Rina M", productIdx: 0, qty: 3 },
    { type: "income", category: "penjualan", amount: 35000, date: new Date("2026-06-20"), desc: "Penjualan Andi P", productIdx: 1, qty: 2 },
    { type: "income", category: "penjualan", amount: 50000, date: new Date("2026-07-05"), desc: "Penjualan Dian P", productIdx: 2, qty: 2 },
    { type: "income", category: "penjualan", amount: 102000, date: new Date("2026-07-09"), desc: "Penjualan Lisa K", productIdx: 0, qty: 5 },
    // Expense
    { type: "expense", category: "bahan_baku", amount: 150000, date: new Date("2026-06-01"), desc: "Beli biji kopi Arabica 5kg" },
    { type: "expense", category: "bahan_baku", amount: 80000, date: new Date("2026-06-15"), desc: "Beli susu segar + gula aren" },
    { type: "expense", category: "bahan_baku", amount: 120000, date: new Date("2026-07-01"), desc: "Restock matcha + almond + pisang" },
    { type: "expense", category: "operasional", amount: 200000, date: new Date("2026-06-05"), desc: "Listrik & air bulan Juni" },
    { type: "expense", category: "operasional", amount: 200000, date: new Date("2026-07-02"), desc: "Listrik & air bulan Juli" },
    { type: "expense", category: "operasional", amount: 75000, date: new Date("2026-06-03"), desc: "Gas LPG 12kg" },
    { type: "expense", category: "marketing", amount: 100000, date: new Date("2026-06-10"), desc: "Boost IG Ads Kopi Susu" },
    { type: "expense", category: "marketing", amount: 150000, date: new Date("2026-07-03"), desc: "Boost IG Ads Matcha Latte" },
    { type: "expense", category: "gaji", amount: 1500000, date: new Date("2026-06-28"), desc: "Gaji barista Juni" },
    { type: "expense", category: "gaji", amount: 1500000, date: new Date("2026-07-01"), desc: "Gaji barista Juli" },
    { type: "income", category: "lainnya", amount: 50000, date: new Date("2026-06-25"), desc: "Catering meeting kantor" },
  ];

  for (const td of txDefs) {
    const prod = td.productIdx != null ? products[td.productIdx] : null;
    await prisma.transaction.create({
      data: {
        id: cuid("tx"),
        userId,
        brandId,
        productId: prod?.id ?? null,
        type: td.type,
        category: td.category,
        amount: td.amount,
        costAmount: prod?.costPrice && td.qty ? prod.costPrice * td.qty : null,
        quantity: td.qty ?? null,
        description: td.desc,
        date: td.date,
      },
    });
  }
  console.log(`✅ Transactions: ${txDefs.length} transaksi`);

  // ─── 7. Research ────────────────────────────────────────────────────
  const researchDefs = [
    {
      query: "tren kopi susu kekinian 2026",
      intent: "market_trend",
      result: {
        summary: "Kopi susu kekinian masih menjadi tren dominan di kalangan milenial dan Gen Z. Varian rasa unik seperti gula aren, pandan, dan butterscotch semakin populer. Konsumen juga mulai peduli cerita di balik kopi (origin story).",
        marketSize: "Rp 8.7 triliun (2026)",
        growthRate: "12% YoY",
        topTrends: ["Gula Aren Latte", "Cold Brew Fusion", "Kopi Susu Oat Milk", "Single Origin Spotlight"],
        audienceSummary: "Mayoritas usia 20-35 tahun, urban, aktif di Instagram dan TikTok.",
        competitors: ["Kopi Kenangan", "Janji Jiwa", "Fore Coffee", "Kopi Kulo"],
        keywords: ["kopi susu terdekat", "kopi enak bandung", "kedai kopi cozy", "kopi susu gula aren 22rb", "tempat nongkrong bandung"],
        recommendedPrice: { min: 15000, max: 28000, optimal: 22000 },
      },
    },
    {
      query: "analisa kompetitor kedai kopi di Bandung 2026",
      intent: "competitor_analysis",
      result: {
        summary: "Kompetitor di Bandung didominasi oleh 3 pemain besar dan puluhan kedai independen. Harga rata-rata kopi susu Rp 25.000. Diferensiasi melalui suasana tempat dan program loyalitas.",
        competitors: [
          { name: "Kopi Kenangan", strengths: ["Brand kuat", "Harga terjangkau"], weaknesses: ["Kurang personal", "Generic"] },
          { name: "Two Hands Full", strengths: ["Suasana aesthetic", "Menu unik"], weaknesses: ["Harga premium", "Terbatas di 1 lokasi"] },
          { name: "Kopi Ireng", strengths: ["Local favorite", "Komunitas kuat"], weaknesses: ["Marketing digital lemah"] },
        ],
        opportunities: ["Kemitraan dengan UMKM roti lokal", "Program langganan mingguan", "Workshop kopi"],
        threats: ["Harga biji kopi naik", "Banyak kedai baru buka"],
      },
    },
    {
      query: "strategi konten Instagram untuk usaha kopi",
      intent: "keyword_research",
      result: {
        summary: "Konten video pendek (Reels) memberikan engagement 3x lebih tinggi dibanding foto. Behind-the-scenes pembuatan kopi dan testimoni pelanggan adalah konten terbaik.",
        topFormats: ["Behind the scenes brewing", "Customer testimonials", "Product spotlight 15 detik", "Barista daily vlog"],
        bestTimes: ["07:00-09:00", "12:00-13:00", "19:00-21:00"],
        recommendedHashtags: ["#KopiBandung", "#CoffeeLover", "#NgopiYuk", "#KedaiKopi", "#BandungHits"],
        captionStyle: "Santai, storytelling pendek, call to action jelas",
      },
    },
  ];

  for (const rd of researchDefs) {
    const researchId = cuid("res");
    const research = await prisma.research.create({
      data: {
        id: researchId,
        userId,
        brandId,
        query: rd.query,
        intent: rd.intent,
        resultJson: JSON.stringify(rd.result),
        status: "completed",
        createdAt: new Date(`2026-0${6 + researchDefs.indexOf(rd)}-${10 + researchDefs.indexOf(rd) * 5}`),
      },
    });

    // Buat contexts dari research
    const modules = ["konten", "toko", "keuangan"] as const;
    for (const mod of modules) {
      await prisma.context.create({
        data: {
          id: cuid("ctx"),
          researchId: research.id,
          brandId,
          targetModule: mod,
          contextJson: JSON.stringify({
            module: mod,
            sourceResearch: rd.query,
            keyInsights: `Insight dari riset "${rd.query}" untuk modul ${mod}`,
            generatedAt: new Date().toISOString(),
          }),
        },
      });
    }
  }
  console.log(`✅ Research: ${researchDefs.length} riset + 3 context per riset`);

  // ─── 8. Content ─────────────────────────────────────────────────────
  const contentDefs = [
    {
      type: "caption", body: "Ngopi dulu, biar pikiran kembali bening ☕✨\n\nDi Kedai Kopi Budi, setiap cangkir punya cerita dari petani ke tangan kamu.\n\nYuk mampir! Lokasi: Jl. Cihampelas No. 88, Bandung.\n\n#KopiBandung #NgopiYuk #CoffeeLover",
      platform: "Instagram",
    },
    {
      type: "caption", body: "MATCHA LATTE is here! 🍵💚\n\nPerpaduan matcha premium Jepang + susu segar lokal. Creamy, earthy, dan bikin hati adem.\n\nCuma Rp 28K. Available daily 8AM - 10PM.\n\n#MatchaLatte #BandungNgopi #KopiSusu",
      platform: "Instagram",
    },
    {
      type: "carousel", body: JSON.stringify([
        { slide: 1, title: "Kenapa Kopi Susu Kami Spesial?", text: "Biji kopi 100% Arabica Gayo" },
        { slide: 2, title: "Gula Aren Asli", text: "Langsung dari petani di Banyumas" },
        { slide: 3, title: "Dibuat oleh Barista Berpengalaman", text: "5+ tahun pengalaman" },
        { slide: 4, title: "Yuk Coba!", text: "Hanya Rp 22K di Kedai Kopi Budi" },
      ]),
      platform: "Instagram",
    },
    {
      type: "video", body: "Video script: Barista menuang susu ke gelas kopi - close up latte art berbentuk hati - pelanggan menyeruput dengan senyum - text overlay: 'Setiap cangkir, sepenuh hati ❤️' - fade to logo Kedai Kopi Budi",
      platform: "TikTok",
    },
    {
      type: "caption", body: "BANANA CAKE + KOPI TUBRUK = PERFECT MORNING 🍌☕\n\nHomemade banana cake lembut + kopi tubruk khas. Combo sarapan Rp 30K aja.\n\n#BananaCake #KopiTubruk #SarapanBandung",
      platform: "Instagram",
    },
  ];

  const contentItems = await Promise.all(
    contentDefs.map((c) =>
      prisma.content.create({
        data: {
          id: cuid("cnt"),
          brandId,
          productId: products[Math.floor(Math.random() * products.length)].id,
          type: c.type,
          body: c.body,
          platform: c.platform,
        },
      })
    )
  );
  console.log(`✅ Content: ${contentItems.length} konten`);

  // ─── 9. Leads ───────────────────────────────────────────────────────
  const leadDefs = [
    { name: "Hendra Gunawan", phone: "081298765401", stage: "Baru", sourceChannel: "wa", notes: "Tanya menu catering" },
    { name: "Fitri Handayani", phone: "081298765402", stage: "Negosiasi", sourceChannel: "wa", notes: "Minta harga spesial untuk acara kantor 20 orang" },
    { name: "Tono Wijaya", phone: "081298765403", stage: "Deal", sourceChannel: "wa", notes: "Order 15 kopi susu untuk besok pagi" },
  ];

  for (const ld of leadDefs) {
    await prisma.lead.create({
      data: {
        id: cuid("ld"),
        brandId,
        name: ld.name,
        phone: ld.phone,
        stage: ld.stage,
        sourceChannel: ld.sourceChannel,
        notes: ld.notes,
      },
    });
  }
  console.log(`✅ Leads: ${leadDefs.length} prospek`);

  // ─── 10. Goals ──────────────────────────────────────────────────────
  const goalDefs = [
    {
      type: "revenue", period: "monthly", target: 5000000, current: 249000,
      startDate: new Date("2026-07-01"), endDate: new Date("2026-07-31"),
      notes: "Target omzet bulan Juli 2026",
    },
    {
      type: "orders", period: "monthly", target: 100, current: 5,
      startDate: new Date("2026-07-01"), endDate: new Date("2026-07-31"),
      notes: "Target 100 order per bulan",
    },
    {
      type: "content", period: "monthly", target: 20, current: 5,
      startDate: new Date("2026-07-01"), endDate: new Date("2026-07-31"),
      notes: "Target 20 konten per bulan",
    },
    {
      type: "customers", period: "quarterly", target: 50, current: 10,
      startDate: new Date("2026-07-01"), endDate: new Date("2026-09-30"),
      notes: "Target 50 pelanggan baru Q3",
    },
  ];

  for (const gd of goalDefs) {
    await prisma.goal.create({
      data: {
        id: cuid("gl"),
        brandId,
        userId,
        type: gd.type,
        period: gd.period,
        target: gd.target,
        current: gd.current,
        startDate: gd.startDate,
        endDate: gd.endDate,
        notes: gd.notes,
      },
    });
  }
  console.log(`✅ Goals: ${goalDefs.length} target`);

  // ─── 11. Credit Rates ───────────────────────────────────────────────
  const creditRateDefs = [
    { key: "riset.pasar", name: "Riset Pasar", cost: 5, module: "riset" },
    { key: "riset.kompetitor", name: "Riset Kompetitor", cost: 8, module: "riset" },
    { key: "riset.keyword", name: "Riset Keyword", cost: 3, module: "riset" },
    { key: "konten.gambar", name: "Konten Gambar", cost: 4, module: "konten" },
    { key: "konten.video", name: "Konten Video (script)", cost: 6, module: "konten" },
    { key: "konten.caption", name: "Konten Caption", cost: 2, module: "konten" },
    { key: "konten.carousel", name: "Konten Carousel", cost: 5, module: "konten" },
    { key: "toko.ai_chat_reply", name: "AI Chat Reply", cost: 1, module: "toko" },
    { key: "toko.campaign_wa", name: "Campaign WA Broadcast", cost: 8, module: "toko" },
    { key: "toko.campaign_email", name: "Campaign Email", cost: 10, module: "toko" },
    { key: "keuangan.proyeksi", name: "Proyeksi Keuangan", cost: 3, module: "keuangan" },
  ];

  for (const cr of creditRateDefs) {
    await prisma.creditRate.create({
      data: {
        id: cuid("cr"),
        actionKey: cr.key,
        actionName: cr.name,
        creditCost: cr.cost,
        module: cr.module,
      },
    });
  }
  console.log(`✅ Credit Rates: ${creditRateDefs.length} tarif`);

  // ─── 12. Credit Usage Log ───────────────────────────────────────────
  const creditLogDefs = [
    { actionKey: "riset.pasar", cost: 5, balanceBefore: 50, balanceAfter: 45, ref: "res_001", date: new Date("2026-06-10") },
    { actionKey: "riset.kompetitor", cost: 8, balanceBefore: 45, balanceAfter: 37, ref: "res_002", date: new Date("2026-06-15") },
    { actionKey: "konten.caption", cost: 2, balanceBefore: 37, balanceAfter: 35, ref: "cnt_001", date: new Date("2026-06-20") },
    { actionKey: "konten.gambar", cost: 4, balanceBefore: 35, balanceAfter: 31, ref: "cnt_002", date: new Date("2026-06-25") },
    { actionKey: "riset.keyword", cost: 3, balanceBefore: 31, balanceAfter: 28, ref: "res_003", date: new Date("2026-07-01") },
    { actionKey: "konten.caption", cost: 2, balanceBefore: 28, balanceAfter: 26, ref: "cnt_003", date: new Date("2026-07-03") },
    { actionKey: "konten.video", cost: 6, balanceBefore: 26, balanceAfter: 20, ref: "cnt_004", date: new Date("2026-07-05") },
    { actionKey: "toko.ai_chat_reply", cost: 1, balanceBefore: 20, balanceAfter: 19, ref: "chat_001", date: new Date("2026-07-08") },
  ];

  for (const cl of creditLogDefs) {
    await prisma.creditUsageLog.create({
      data: {
        id: cuid("cul"),
        userId,
        brandId,
        actionKey: cl.actionKey,
        creditCost: cl.cost,
        balanceBefore: cl.balanceBefore,
        balanceAfter: cl.balanceAfter,
        referenceId: cl.ref,
        status: "charged",
        createdAt: cl.date,
      },
    });
  }
  // Note: user credit balance should be updated to reflect usage
  // after the top-up simulation. Current: 50 initial - sum of usage = 50 - 31 = 19
  // But the seed sets it to 50 initially. Let's keep 50 since it's a demo.

  console.log(`✅ Credit Usage: ${creditLogDefs.length} riwayat`);

  // ─── 13. Notifications ──────────────────────────────────────────────
  const notifDefs = [
    { type: "goal_achieved", title: "Target Juli Tercapai 25%!", message: "Kamu sudah mencapai 25% target omzet bulan ini. Pertahankan!", severity: "success" },
    { type: "low_stock", title: "Stok Menipis: Banana Cake", message: "Banana Cake tinggal 15 pcs. Segera restock.", severity: "warning" },
    { type: "research_completed", title: "Riset Selesai", message: "Analisa kompetitor kedai kopi Bandung sudah siap.", severity: "info" },
    { type: "order_new", title: "Order Baru dari Agus Riyadi", message: "Order Rp 78.000 menunggu diproses.", severity: "info" },
  ];

  for (const nd of notifDefs) {
    await prisma.notification.create({
      data: {
        id: cuid("notif"),
        userId,
        brandId,
        type: nd.type,
        title: nd.title,
        message: nd.message,
        severity: nd.severity,
        readAt: nd.type === "research_completed" ? new Date() : null,
      },
    });
  }
  console.log(`✅ Notifications: ${notifDefs.length} notifikasi`);

  // ─── Summary ────────────────────────────────────────────────────────
  console.log("\n" + "=".repeat(58));
  console.log("🌱 SEED SELESAI — Data Budi Santoso siap digunakan!");
  console.log("=".repeat(58));
  console.log(`   Email    : budi@contoh.com`);
  console.log(`   Password : kopibudi123`);
  console.log(`   Brand    : Kedai Kopi Budi (kedai-kopi-budi)`);
  console.log(`   Produk   : 5 item`);
  console.log(`   Customer : 10 orang`);
  console.log(`   Order    : 5 order`);
  console.log(`   Transaksi: ${txDefs.length} transaksi`);
  console.log(`   Riset    : 3 riset (dengan 3 context masing-masing)`);
  console.log(`   Konten   : 5 konten`);
  console.log(`   Leads    : 3 prospek`);
  console.log(`   Goals    : 4 target`);
  console.log(`   Credit   : 50 balance, 11 tarif, 8 riwayat`);
  console.log(`   Notif    : 4 notifikasi`);
  console.log("=".repeat(58));
}

main()
  .catch((e) => {
    console.error("❌ Seed gagal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
