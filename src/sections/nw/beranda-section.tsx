"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { useAppStore, getActiveBrand } from "@/lib/store";
import { api } from "@/lib/api";
import { PageHeader, StatCard, SectionCard, EmptyState } from "@/components/nw/primitives";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRupiah, formatRupiahShort, timeAgo, type SectionKey } from "@/lib/constants";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Search,
  Package,
  TrendingUp,
  Zap,
  Users,
  ShoppingCart,
  FileText,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Target,
  Plus,
  Lightbulb,
  CalendarDays,
  Store,
} from "lucide-react";

// ─── Goal type ────────────────────────────────────────────────
interface Goal {
  id: string;
  brandId: string;
  type: string; // revenue | orders | products | customers | content | research
  period: string; // monthly | quarterly | yearly
  target: number;
  current: number;
  startDate: string;
  endDate: string;
  status: string; // active | achieved | failed | paused
  notes: string | null;
  progress: number;
  createdAt: string;
  updatedAt: string;
}

const GOAL_TYPE_META: Record<
  string,
  { icon: string; label: string; emoji: string }
> = {
  revenue: { icon: "💰", label: "Omzet", emoji: "💰" },
  orders: { icon: "🛒", label: "Order", emoji: "🛒" },
  products: { icon: "📦", label: "Produk Baru", emoji: "📦" },
  customers: { icon: "👥", label: "Customer Baru", emoji: "👥" },
  content: { icon: "📝", label: "Konten", emoji: "📝" },
  research: { icon: "🔍", label: "Riset", emoji: "🔍" },
};

function formatGoalValue(type: string, v: number): string {
  if (type === "revenue") return formatRupiahShort(v);
  return String(Math.round(v));
}

// ─── Tip of the day ───────────────────────────────────────────
const DAILY_TIPS: { emoji: string; title: string; body: string; tone: "teal" | "orange" | "violet" | "emerald" }[] = [
  {
    emoji: "🔍",
    title: "Riset kompetitor mingguan",
    body: "Luangkan 10 menit tiap Senin untuk cek harga & promosi kompetitor. Insight-nya bisa kamu pakai di konten & toko.",
    tone: "teal",
  },
  {
    emoji: "📸",
    title: "Foto produk dengan cahaya alami",
    body: "Foto dekat jendela di pagi hari bikin produk kelihatan premium tanpa perlu studio. Upload ke katalog produk.",
    tone: "orange",
  },
  {
    emoji: "💬",
    title: "Balas chat < 5 menit",
    body: "Customer yang dibalas cepat 5x lebih besar peluang order-nya. Aktifkan notifikasi WhatsApp di Toko.",
    tone: "emerald",
  },
  {
    emoji: "📦",
    title: "Cek stok setiap pagi",
    body: "Stok menipis = order batal = review buruk. Restok sebelum habis — atur minimum stok di detail produk.",
    tone: "violet",
  },
  {
    emoji: "💰",
    title: "Pisahkan uang pribadi & usaha",
    body: "Catat semua pemasukan & pengeluaran di modul Keuangan. Laporan keuangan rapi bikin mudah apply modal.",
    tone: "teal",
  },
];

function tipOfDay() {
  const dayIndex = new Date().getDate() % DAILY_TIPS.length;
  return DAILY_TIPS[dayIndex];
}

// ─── Dashboard Hero ───────────────────────────────────────────
function DashboardHero({
  firstName,
  brandName,
  brandCategory,
  stats,
  isLoading,
  onMulaiRiset,
  onTambahProduk,
}: {
  firstName: string;
  brandName: string;
  brandCategory: string;
  stats: {
    products: number;
    orders: number;
    salesMonth: number;
  };
  isLoading: boolean;
  onMulaiRiset: () => void;
  onTambahProduk: () => void;
}) {
  const isMobile = useIsMobile();
  const now = new Date();
  const dateLabel = format(now, "EEEE, d MMMM yyyy", { locale: idLocale });
  const tip = tipOfDay();
  const toneClasses: Record<typeof tip.tone, string> = {
    teal: "from-teal-100 to-teal-50 text-teal-600 border-teal/20",
    orange: "from-orange-100 to-orange-50 text-orange-600 border-orange/20",
    violet: "from-violet-100 to-violet-50 text-violet-600 border-violet/20",
    emerald: "from-emerald-100 to-emerald-50 text-emerald-600 border-emerald/20",
  };

  // Decorative emoji cluster (circular arrangement)
  const emojis = ["📊", "🔍", "📝", "🛒", "💰", "📅"];
  const ring = emojis.map((e, i) => {
    const angle = (i / emojis.length) * Math.PI * 2 - Math.PI / 2;
    const r = 64; // px radius
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    return { emoji: e, x, y, delay: i * 0.08 };
  });

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-3xl border border-teal/15 mb-6 mesh-hero"
      style={{
        background:
          "linear-gradient(135deg, #F0FBF9 0%, #FCFBF9 45%, #FFF3EA 100%)",
      }}
      aria-label="Selamat datang"
    >
      {/* Decorative blurred blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 -right-16 size-56 rounded-full bg-teal-200/40 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-20 -left-10 size-56 rounded-full bg-orange-200/30 blur-3xl"
      />

      <div className="relative grid grid-cols-1 lg:grid-cols-5 gap-6 p-5 sm:p-7">
        {/* Left column */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="gap-1 bg-card/70 backdrop-blur border-teal/30 text-teal-700 text-[11px] py-1"
            >
              <CalendarDays className="size-3" />
              <span className="capitalize">{dateLabel}</span>
            </Badge>
            <Badge className="gap-1 bg-teal text-white border-teal text-[11px] py-1">
              <Store className="size-3" />
              {brandName}
            </Badge>
            <Badge variant="outline" className="bg-card/70 backdrop-blur text-[11px] py-1">
              {brandCategory}
            </Badge>
          </div>

          <div>
            <motion.h1
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="text-3xl sm:text-4xl font-extrabold tracking-tight text-ink"
            >
              Halo, {firstName} <span className="inline-block">👋</span>
            </motion.h1>
            <p className="text-sm sm:text-base text-ink-500 mt-1.5 leading-relaxed">
              {isMobile
                ? `Ringkasan ${brandName} hari ini.`
                : <>Berikut ringkasan <span className="font-semibold text-ink">{brandName}</span> hari ini. Yuk lanjut tumbuhkan usahamu bersama usahaku.ai.</>
              }
            </p>
          </div>

          {/* Quick stats inline */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <div className="flex items-center gap-1.5">
              <Package className="size-4 text-orange-600" />
              <span className="font-bold text-ink tabular-nums">
                {isLoading ? "…" : stats.products}
              </span>
              <span className="text-stone">produk</span>
            </div>
            <span className="text-cream-400" aria-hidden>·</span>
            <div className="flex items-center gap-1.5">
              <ShoppingCart className="size-4 text-violet-600" />
              <span className="font-bold text-ink tabular-nums">
                {isLoading ? "…" : stats.orders}
              </span>
              <span className="text-stone">order bulan ini</span>
            </div>
            <span className="text-cream-400" aria-hidden>·</span>
            <div className="flex items-center gap-1.5">
              <TrendingUp className="size-4 text-teal-600" />
              <span className="font-bold text-ink tabular-nums">
                {isLoading ? "…" : formatRupiahShort(stats.salesMonth)}
              </span>
              <span className="text-stone">omzet</span>
            </div>
          </div>

          {/* CTA buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button
              className="bg-teal hover:bg-teal-600 gap-1.5 shadow-sm shadow-teal/20"
              onClick={onMulaiRiset}
            >
              <Sparkles className="size-3.5" />
              Mulai Riset
            </Button>
            <Button
              variant="outline"
              className="gap-1.5 bg-card/70 backdrop-blur"
              onClick={onTambahProduk}
            >
              <Plus className="size-3.5" />
              Tambah Produk
            </Button>
          </div>
        </div>

        {/* Right column — decorative + tip of day */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Decorative emoji cluster (hidden on small screens) */}
          <div
            aria-hidden
            className="hidden lg:block relative h-32 mx-auto"
            style={{ width: 192 }}
          >
            {/* Center NW badge */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.25, duration: 0.4, type: "spring", stiffness: 200 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-14 rounded-2xl bg-teal text-white font-extrabold flex items-center justify-center shadow-lg shadow-teal/30"
            >
              U
            </motion.div>
            {ring.map((node, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  x: node.x,
                  y: node.y,
                }}
                transition={{ delay: 0.3 + node.delay, duration: 0.45, ease: "easeOut" }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
              >
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={{
                    duration: 2.4 + i * 0.2,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: i * 0.15,
                  }}
                  className="size-10 rounded-xl bg-card/90 backdrop-blur border border-border shadow-sm flex items-center justify-center text-lg"
                >
                  {node.emoji}
                </motion.div>
              </motion.div>
            ))}
          </div>

          {/* Tip of the day card — desktop only */}
          {!isMobile && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className={`rounded-2xl border bg-gradient-to-br ${toneClasses[tip.tone]} p-4`}
          >
            <div className="flex items-start gap-3">
              <div className="size-9 rounded-lg bg-card/80 flex items-center justify-center text-lg shrink-0 shadow-sm">
                {tip.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <Lightbulb className="size-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-wide">
                    Tip Hari Ini
                  </span>
                </div>
                <div className="text-sm font-bold text-ink leading-snug">
                  {tip.title}
                </div>
                <p className="text-xs text-ink-500 mt-1 leading-relaxed">
                  {tip.body}
                </p>
              </div>
            </div>
          </motion.div>
          )}
        </div>
      </div>
    </motion.section>
  );
}

// ─── Enhanced stat card wrapper (hover gradient + active scale) ─
function HeroStatCard({
  children,
  onClick,
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  ariaLabel?: string;
}) {
  const Wrap = onClick ? motion.button : motion.div;
  return (
    <Wrap
      type={onClick ? "button" : undefined}
      aria-label={ariaLabel}
      onClick={onClick}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      className="group block text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-teal/40 rounded-2xl"
    >
      <div className="relative rounded-2xl transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-[0_8px_24px_rgba(13,148,136,0.12)]">
        {/* Gradient overlay reveals on hover */}
        <div
          aria-hidden
          className="absolute inset-0 rounded-2xl bg-gradient-to-br from-teal-100/0 via-teal-100/0 to-orange-100/0 group-hover:from-teal-100/60 group-hover:via-transparent group-hover:to-orange-100/40 transition-opacity duration-300 pointer-events-none"
        />
        <div className="relative">{children}</div>
      </div>
    </Wrap>
  );
}

// ─── Goals widget (Beranda) ───────────────────────────────────
function GoalsWidget({ brandId }: { brandId: string }) {
  const { setSection } = useAppStore();
  const { data, isLoading } = useQuery<{ goals: Goal[] }>({
    queryKey: ["goals", brandId, "active"],
    queryFn: () => api(`/api/goals?brandId=${brandId}&status=active`),
    enabled: !!brandId,
    staleTime: 30_000,
  });

  // Show only goals whose date range includes "today"
  const now = new Date();
  const todayGoals = (data?.goals ?? []).filter((g) => {
    const s = new Date(g.startDate);
    const e = new Date(g.endDate);
    return now >= s && now <= e;
  });

  return (
    <SectionCard
      title="🎯 Target Bulan Ini"
      desc="Pantau progres target bisnis kamu"
      right={
        <Button
          variant="ghost"
          size="sm"
          className="text-teal"
          onClick={() => setSection("pengaturan")}
        >
          Atur Target <ArrowRight className="size-3.5" />
        </Button>
      }
      bodyClassName="p-0"
    >
      {isLoading ? (
        <div className="p-5 space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : todayGoals.length === 0 ? (
        <div className="p-8 text-center">
          <div className="size-12 rounded-2xl bg-cream-200 text-stone mx-auto flex items-center justify-center mb-2">
            <Target className="size-6" />
          </div>
          <div className="text-sm font-semibold text-ink">Belum ada target bulan ini</div>
          <p className="text-xs text-stone mt-1 mb-3 max-w-sm mx-auto">
            Set target omzet, order, atau produk baru untuk motivasi & lacak progress bisnis kamu.
          </p>
          <Button
            size="sm"
            className="bg-teal hover:bg-teal-600"
            onClick={() => setSection("pengaturan")}
          >
            <Target className="size-3.5 mr-1" /> Buat Target
          </Button>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {todayGoals.slice(0, 4).map((g) => {
            const meta = GOAL_TYPE_META[g.type] ?? { icon: "🎯", label: g.type };
            const pct = Math.min(100, g.progress ?? 0);
            const isAchieved = g.status === "achieved";
            return (
              <div key={g.id} className="px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center text-base shrink-0">
                    {meta.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-ink truncate">
                        {meta.label}
                      </div>
                      <div className="text-xs font-bold text-teal tabular-nums">
                        {pct}%
                      </div>
                    </div>
                    <div className="text-[11px] text-stone mt-0.5 tabular-nums">
                      {formatGoalValue(g.type, g.current)} / {formatGoalValue(g.type, g.target)}
                    </div>
                  </div>
                  {isAchieved && (
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 border text-[10px] gap-1 shrink-0">
                      <CheckCircle2 className="size-2.5" /> Tercapai
                    </Badge>
                  )}
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-cream-200 overflow-hidden">
                  <div
                    className="h-full bg-teal transition-all duration-500 rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}

interface DashboardData {
  stats: {
    research: number;
    products: number;
    salesMonth: number;
    credit: number;
    leads: number;
    orders: number;
    content: number;
  };
  recentResearch: { id: string; query: string; intent: string | null; createdAt: string }[];
  recommendations: {
    id: string;
    title: string;
    source: "konten" | "toko" | "keuangan" | "leads" | "stok";
    action: "Buat" | "Review" | "Terapkan" | "Lihat" | "Hubungi" | "Restok";
    used: boolean;
    contextId?: string;
    contextModule?: string;
  }[];
  lowStock: { id: string; name: string; stock: number | null; minStock: number | null }[];
  pendingPaymentsCount: number;
}

const SOURCE_STYLE: Record<string, { icon: string; color: string }> = {
  konten: { icon: "📝", color: "bg-orange-100 text-orange-700" },
  toko: { icon: "🛒", color: "bg-violet-100 text-violet-700" },
  keuangan: { icon: "💰", color: "bg-emerald-100 text-emerald-700" },
  leads: { icon: "👥", color: "bg-sky-100 text-sky-700" },
  stok: { icon: "📦", color: "bg-amber-100 text-amber-700" },
};

export function BerandaSection() {
  const { user, brands, setSection, setActiveBrand } = useAppStore();
  const activeBrand = getActiveBrand(useAppStore.getState());

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["dashboard", activeBrand?.id],
    queryFn: () => api<DashboardData>(`/api/dashboard?brandId=${activeBrand?.id}`),
    enabled: !!activeBrand?.id,
    refetchInterval: 30_000,
  });

  if (!activeBrand) {
    return (
      <div>
        <PageHeader title="Beranda" subtitle="Selamat datang di usahaku.ai" icon="📊" />
        <EmptyState
          icon="🏪"
          title="Belum ada brand"
          desc="Buat brand pertama kamu untuk mulai menggunakan semua modul usahaku.ai."
          action={<Button className="bg-teal hover:bg-teal-600">+ Buat Brand</Button>}
        />
      </div>
    );
  }

  const firstName = user?.name?.split(" ")[0] ?? "Sob";

  return (
    <div>
      {/* Dashboard Hero — replaces plain PageHeader */}
      <DashboardHero
        firstName={firstName}
        brandName={activeBrand.name}
        brandCategory={activeBrand.category}
        stats={{
          products: data?.stats.products ?? 0,
          orders: data?.stats.orders ?? 0,
          salesMonth: data?.stats.salesMonth ?? 0,
        }}
        isLoading={isLoading}
        onMulaiRiset={() => setSection("riset")}
        onTambahProduk={() => setSection("produk")}
      />

      {/* Stats grid — enhanced with hover gradient + active scale */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <HeroStatCard onClick={() => setSection("riset")} ariaLabel="Lihat detail Riset Tersedia">
          <StatCard
            label="Riset Tersedia"
            value={isLoading ? "…" : data?.stats.research ?? 0}
            icon={<Search className="size-4" />}
            accent="teal"
          />
        </HeroStatCard>
        <HeroStatCard onClick={() => setSection("produk")} ariaLabel="Lihat detail Produk Aktif">
          <StatCard
            label="Produk Aktif"
            value={isLoading ? "…" : data?.stats.products ?? 0}
            icon={<Package className="size-4" />}
            accent="orange"
          />
        </HeroStatCard>
        <HeroStatCard onClick={() => setSection("toko")} ariaLabel="Lihat detail Penjualan Bulan Ini">
          <StatCard
            label="Penjualan Bln Ini"
            value={isLoading ? "…" : formatRupiahShort(data?.stats.salesMonth ?? 0)}
            icon={<TrendingUp className="size-4" />}
            accent="success"
          />
        </HeroStatCard>
        <HeroStatCard onClick={() => setSection("credit")} ariaLabel="Lihat detail Credit Tersisa">
          <StatCard
            label="Credit Tersisa"
            value={user?.creditBalance ?? 0}
            icon={<Zap className="size-4 fill-teal" />}
            accent="warning"
          />
        </HeroStatCard>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <HeroStatCard onClick={() => setSection("toko")} ariaLabel="Lihat detail Leads Aktif">
          <StatCard
            label="Leads Aktif"
            value={isLoading ? "…" : data?.stats.leads ?? 0}
            icon={<Users className="size-4" />}
            accent="teal"
          />
        </HeroStatCard>
        <HeroStatCard onClick={() => setSection("toko")} ariaLabel="Lihat detail Orders Pending">
          <StatCard
            label="Orders Pending"
            value={isLoading ? "…" : data?.stats.orders ?? 0}
            icon={<ShoppingCart className="size-4" />}
            accent="orange"
          />
        </HeroStatCard>
        <HeroStatCard onClick={() => setSection("konten")} ariaLabel="Lihat detail Konten Dibuat">
          <StatCard
            label="Konten Dibuat"
            value={isLoading ? "…" : data?.stats.content ?? 0}
            icon={<FileText className="size-4" />}
            accent="success"
          />
        </HeroStatCard>
      </div>

      {/* Empty state if no research & no products */}
      {!isLoading && data && data.stats.research === 0 && data.stats.products === 0 && (
        <div className="mb-6">
          <EmptyState
            icon="✨"
            title="Yuk mulai dari riset atau produk"
            desc="Dashboard kosong dulu. Tambahkan produk atau jalankan riset pasar pertama kamu — rekomendasi aksi akan otomatis muncul di sini."
            action={
              <div className="flex flex-wrap gap-2 justify-center">
                <Button className="bg-teal hover:bg-teal-600" onClick={() => setSection("riset")}>
                  🔍 Mulai Riset
                </Button>
                <Button variant="outline" onClick={() => setSection("produk")}>
                  📦 Tambah Produk
                </Button>
                <Button variant="outline" onClick={() => setSection("toko")}>
                  🛒 Atur Toko
                </Button>
              </div>
            }
          />
        </div>
      )}

      {/* 2-column: Recent research + Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent research */}
        <SectionCard
          title="Riset Terbaru"
          desc="Histori riset pasar untuk brand ini"
          right={
            <Button variant="ghost" size="sm" className="text-teal" onClick={() => setSection("riset")}>
              Lihat semua <ArrowRight className="size-3.5" />
            </Button>
          }
          bodyClassName="p-0"
        >
          {isLoading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : data?.recentResearch && data.recentResearch.length > 0 ? (
            <div className="divide-y divide-border">
              {data.recentResearch.map((r) => (
                <div
                  key={r.id}
                  className="px-5 py-3 hover:bg-cream-100/50 transition-colors cursor-pointer flex items-start gap-3"
                  onClick={() => setSection("riset")}
                >
                  <div className="size-8 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center shrink-0">
                    <Search className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-ink truncate">{r.query}</div>
                    <div className="text-xs text-stone mt-0.5 flex items-center gap-2">
                      <span>{timeAgo(r.createdAt)}</span>
                      {r.intent && (
                        <Badge variant="outline" className="text-[10px] py-0 h-4 border-teal/30 text-teal">
                          {r.intent.replace("_", " ")}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="size-4 text-stone shrink-0 mt-1" />
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <div className="text-3xl mb-2">🔍</div>
              <div className="text-sm font-semibold text-ink">Belum ada riset</div>
              <p className="text-xs text-stone mt-1 mb-3">Mulai riset pasar pertama untuk dapat rekomendasi otomatis.</p>
              <Button size="sm" className="bg-teal hover:bg-teal-600" onClick={() => setSection("riset")}>
                + Mulai Riset
              </Button>
            </div>
          )}
        </SectionCard>

        {/* Recommendations */}
        <SectionCard
          title="Rekomendasi Aksi"
          desc="Dari context yang belum dipakai + stok & leads"
          right={
            <Badge variant="outline" className="text-[10px]">
              {data?.recommendations?.length ?? 0} aksi
            </Badge>
          }
          bodyClassName="p-0"
        >
          {isLoading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : data?.recommendations && data.recommendations.length > 0 ? (
            <div className="divide-y divide-border max-h-[420px] overflow-y-auto">
              {data.recommendations.map((rec) => {
                const s = SOURCE_STYLE[rec.source];
                return (
                  <div
                    key={rec.id}
                    className="px-5 py-3 hover:bg-cream-100/50 transition-colors flex items-start gap-3"
                  >
                    <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 text-base ${s.color}`}>
                      {s.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-ink leading-snug">{rec.title}</div>
                      <div className="text-[11px] text-stone mt-0.5">
                        Dari {rec.source} {rec.used && "· sudah dipakai"}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={rec.used ? "outline" : "default"}
                      className={
                        rec.used
                          ? "h-7 text-xs"
                          : "h-7 text-xs bg-teal hover:bg-teal-600"
                      }
                      onClick={() => {
                        if (rec.source === "konten") setSection("konten");
                        else if (rec.source === "toko" || rec.source === "leads" || rec.source === "stok")
                          setSection("toko");
                        else if (rec.source === "keuangan") setSection("keuangan");
                      }}
                    >
                      {rec.action}
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center">
              <div className="text-3xl mb-2">💡</div>
              <div className="text-sm font-semibold text-ink">Belum ada rekomendasi</div>
              <p className="text-xs text-stone mt-1">Jalankan riset — context engine akan generate rekomendasi otomatis.</p>
            </div>
          )}
        </SectionCard>
      </div>

      {/* Alerts row */}
      {!isLoading && data && (data.lowStock.length > 0 || data.pendingPaymentsCount > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {data.lowStock.length > 0 && (
            <SectionCard
              title="⚠️ Stok Menipis"
              desc={`${data.lowStock.length} produk perlu restok`}
              bodyClassName="p-0"
            >
              <div className="divide-y divide-border">
                {data.lowStock.slice(0, 4).map((p) => (
                  <div key={p.id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-ink">{p.name}</div>
                      <div className="text-[11px] text-stone">Sisa {p.stock ?? 0} · min {p.minStock ?? 0}</div>
                    </div>
                    <Badge className="bg-amber-100 text-amber-700 border-amber-200 border">
                      <AlertTriangle className="size-3 mr-1" /> Restok
                    </Badge>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
          {data.pendingPaymentsCount > 0 && (
            <SectionCard
              title="💳 Pembayaran Pending"
              desc={`${data.pendingPaymentsCount} pembayaran menunggu verifikasi`}
              bodyClassName="p-4"
            >
              <Button size="sm" className="bg-teal hover:bg-teal-600" onClick={() => setSection("toko")}>
                Verifikasi di Toko <ArrowRight className="size-3.5" />
              </Button>
            </SectionCard>
          )}
        </div>
      )}

      {/* Goals widget */}
      <div className="mt-4">
        <GoalsWidget brandId={activeBrand.id} />
      </div>

      {/* Cross-module info — desktop only */}
      {!isLoading && data && data.stats.research > 0 && (
        <div className="hidden md:block mt-6 rounded-2xl bg-gradient-to-br from-teal-100 via-cream-100 to-orange-100/40 border border-teal/20 p-5">
          <div className="flex items-start gap-4">
            <div className="size-10 rounded-xl bg-teal text-white flex items-center justify-center shrink-0">
              <Sparkles className="size-5" />
            </div>
            <div className="flex-1">
              <div className="font-bold text-ink mb-1">Satu data, dipakai di mana saja</div>
              <p className="text-sm text-ink-500 leading-relaxed">
                Riset, produk, dan transaksi kamu otomatis mengalir ke konten, toko, dan keuangan.
                Tidak perlu ketik ulang — itu prinsip utama usahaku.ai.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {(["riset", "konten", "toko", "keuangan"] as SectionKey[]).map((s) => (
                  <Button
                    key={s}
                    variant="outline"
                    size="sm"
                    className="bg-card/80 backdrop-blur text-xs"
                    onClick={() => setSection(s)}
                  >
                    Buka {s.charAt(0).toUpperCase() + s.slice(1)} <ArrowRight className="size-3" />
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
