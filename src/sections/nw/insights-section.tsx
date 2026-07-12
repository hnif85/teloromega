"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  Award,
  Brain,
  Calendar,
  CheckCircle2,
  Clock,
  Crown,
  DollarSign,
  Flame,
  Grid3x3,
  Lightbulb,
  Minus,
  Package,
  Percent,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Star,
  TrendingDown,
  TrendingUp,
  Users,
  Zap,
  FileText,
  Search,
  Wallet,
  X,
} from "lucide-react";
import { useAppStore, getActiveBrand } from "@/lib/store";
import { api } from "@/lib/api";
import { PageHeader, StatCard, SectionCard, EmptyState } from "@/components/nw/primitives";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatRupiah, formatRupiahShort, timeAgo } from "@/lib/constants";

// ─── Types ────────────────────────────────────────────────────
interface RevenueTrendPoint {
  month: string;
  revenue: number;
  orders: number;
  avgOrderValue: number;
}
interface TopProduct {
  productId: string;
  name: string;
  unitsSold: number;
  revenue: number;
  margin: number;
}
interface CustomerGrowthPoint {
  month: string;
  newCustomers: number;
  totalCustomers: number;
}
interface LeadFunnelStage {
  stage: string;
  count: number;
  conversionRate: number;
}
interface ContentByType {
  type: string;
  count: number;
  pct: number;
}
interface SalesByDay {
  day: string;
  sales: number;
}
interface InsightsMetrics {
  avgOrderValue: number;
  repeatCustomerRate: number;
  conversionRate: number;
  avgMarginPct: number;
  revenueGrowthPct: number;
  inventoryValue: number;
}
interface RecentActivityItem {
  type: "order" | "payment" | "lead" | "content" | "research" | "transaction";
  description: string;
  amount?: number;
  timestamp: string;
}
interface InsightsResponse {
  revenueTrend: RevenueTrendPoint[];
  topProducts: TopProduct[];
  customerGrowth: CustomerGrowthPoint[];
  leadFunnel: LeadFunnelStage[];
  contentByType: ContentByType[];
  salesByDay: SalesByDay[];
  metrics: InsightsMetrics;
  recentActivity: RecentActivityItem[];
}
interface AISummary {
  headline: string;
  strengths: string[];
  concerns: string[];
  recommendations: string[];
  healthScore: number;
  trend: "up" | "down" | "stable";
}
interface SummaryResponse {
  summary: AISummary;
  balanceAfter: number;
  usedFallback: boolean;
}

// ─── Advanced analytics types (Task 20-B) ─────────────────────
interface CLVTopCustomer {
  id: string;
  name: string;
  phone: string;
  totalSpent: number;
  orderCount: number;
  avgOrderValue: number;
  firstOrder: string | null;
  lastOrder: string | null;
  daysActive: number;
  predictedCLV: number;
}
interface CLVDistributionBucket {
  bucket: string;
  count: number;
  pct: number;
}
interface CLVResponse {
  avgCLV: number;
  topCustomers: CLVTopCustomer[];
  distribution: CLVDistributionBucket[];
  retentionRate: number;
  avgDaysBetweenOrders: number;
}

interface CohortRetentionPoint {
  monthOffset: number;
  label: string;
  activeCustomers: number;
  retentionRate: number;
}
interface CohortEntry {
  cohortMonth: string;
  cohortLabel: string;
  size: number;
  retention: CohortRetentionPoint[];
}
interface CohortResponse {
  cohorts: CohortEntry[];
}

interface SeasonalByMonth {
  month: string;
  revenue: number;
  orders: number;
  avgOrderValue: number;
}
interface SeasonalByDay {
  day: string;
  revenue: number;
  orders: number;
}
interface SeasonalByHour {
  hour: string;
  orders: number;
}
interface SeasonalResponse {
  byMonth: SeasonalByMonth[];
  byDayOfWeek: SeasonalByDay[];
  byHour: SeasonalByHour[];
  bestMonth: { month: string; revenue: number };
  worstMonth: { month: string; revenue: number };
  peakDay: { day: string; revenue: number };
  peakHour: { hour: string; orders: number };
  seasonality: "high" | "medium" | "low";
}

type BCGQuadrant = "star" | "cash_cow" | "question_mark" | "dog";
interface ProductPerfRow {
  id: string;
  name: string;
  type: string;
  price: number;
  costPrice: number;
  margin: number;
  unitsSold: number;
  revenue: number;
  cost: number;
  profit: number;
  marginPct: number;
  orderCount: number;
  uniqueCustomers: number;
  avgQtyPerOrder: number;
  lastSoldAt: string | null;
  daysSinceLastSale: number | null;
  performance: BCGQuadrant;
}
interface ProductPerfSummary {
  totalProducts: number;
  starProducts: number;
  cashCowProducts: number;
  avgMargin: number;
  topPerformer: { name: string; revenue: number } | null;
  underperformer: { name: string; revenue: number } | null;
}
interface ProductPerfResponse {
  products: ProductPerfRow[];
  summary: ProductPerfSummary;
}

// ─── Chart palette ────────────────────────────────────────────
const CHART_COLORS = ["#0D9488", "#F97316", "#A855F7", "#EAB308", "#EF4444", "#06B6D4"];
const CONTENT_TYPE_LABEL: Record<string, string> = {
  caption: "Caption",
  gambar: "Gambar",
  video: "Video",
  carousel: "Carousel",
};
const CONTENT_TYPE_ICON: Record<string, string> = {
  caption: "✍️",
  gambar: "🎨",
  video: "🎬",
  carousel: "📃",
};

const ACTIVITY_STYLE: Record<
  RecentActivityItem["type"],
  { icon: React.ReactNode; color: string; bg: string }
> = {
  order: { icon: <ShoppingBag className="size-3.5" />, color: "text-violet-700", bg: "bg-violet-100" },
  payment: { icon: <DollarSign className="size-3.5" />, color: "text-emerald-700", bg: "bg-emerald-100" },
  lead: { icon: <Users className="size-3.5" />, color: "text-sky-700", bg: "bg-sky-100" },
  content: { icon: <FileText className="size-3.5" />, color: "text-orange-700", bg: "bg-orange-100" },
  research: { icon: <Search className="size-3.5" />, color: "text-teal-700", bg: "bg-teal-100" },
  transaction: { icon: <Wallet className="size-3.5" />, color: "text-amber-700", bg: "bg-amber-100" },
};

// ─── Main section ─────────────────────────────────────────────
export function InsightsSection() {
  const qc = useQueryClient();
  const { user, setCredit, setSection } = useAppStore();
  const activeBrand = getActiveBrand(useAppStore.getState());
  const [aiSummary, setAiSummary] = useState<AISummary | null>(null);
  const [ctaDismissed, setCtaDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("insights_cta_dismissed") === "true";
  });

  const { data, isLoading, isError, refetch, isFetching } = useQuery<InsightsResponse>({
    queryKey: ["insights", activeBrand?.id],
    queryFn: () => api<InsightsResponse>(`/api/insights?brandId=${activeBrand?.id}`),
    enabled: !!activeBrand?.id,
    staleTime: 60_000,
  });

  const summaryMutation = useMutation({
    mutationFn: () =>
      api<SummaryResponse>("/api/insights/summary", {
        method: "POST",
        json: { brandId: activeBrand?.id },
      }),
    onSuccess: (res) => {
      setAiSummary(res.summary);
      setCredit(res.balanceAfter);
      if (res.usedFallback) {
        toast.success("Ringkasan AI dibuat (mode offline) · 3 credit dipakai");
      } else {
        toast.success("Ringkasan AI dibuat · 3 credit dipakai");
      }
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Gagal membuat ringkasan AI");
    },
  });

  const dismissCta = () => {
    setCtaDismissed(true);
    localStorage.setItem("insights_cta_dismissed", "true");
  };

  if (!activeBrand) {
    return (
      <div>
        <PageHeader title="Insights" subtitle="Analisis mendalam bisnis kamu" icon="📈" />
        <EmptyState
          icon="📈"
          title="Belum ada brand"
          desc="Buat brand pertama kamu untuk mulai melihat insights dan analisis bisnis."
          action={<Button className="bg-teal hover:bg-teal-600">+ Buat Brand</Button>}
        />
      </div>
    );
  }

  const m = data?.metrics;
  const hasData =
    !!data &&
    (data.revenueTrend.some((p) => p.revenue > 0) ||
      data.topProducts.length > 0 ||
      data.recentActivity.length > 0 ||
      (m && (m.inventoryValue > 0 || m.avgOrderValue > 0)));

  return (
    <div>
      <PageHeader
        title="Insights"
        subtitle={`Analisis mendalam & rekomendasi AI untuk ${activeBrand.name}`}
        icon="📈"
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              size="sm"
              className="gap-1.5 bg-teal hover:bg-teal-600"
              onClick={() => summaryMutation.mutate()}
              disabled={summaryMutation.isPending || !!aiSummary}
            >
              <Sparkles className="size-3.5" />
              Ringkasan AI
              <Badge className="bg-white/20 text-white border-0 ml-1 px-1.5 py-0 h-4 text-[10px]">
                <Zap className="size-2.5 mr-0.5" /> 3
              </Badge>
            </Button>
          </>
        }
      />

      {/* AI Summary Card */}
      <div className="mb-6">
        {aiSummary ? (
          <AISummaryCard summary={aiSummary} onReset={() => setAiSummary(null)} />
        ) : summaryMutation.isPending ? (
          <SummarySkeleton />
        ) : ctaDismissed ? null : (
          <CTACard
            creditBalance={user?.creditBalance ?? 0}
            onGenerate={() => summaryMutation.mutate()}
            disabled={summaryMutation.isPending}
            onDismiss={dismissCta}
          />
        )}
      </div>

      {/* Loading state */}
      {isLoading && <LoadingState />}

      {/* Error */}
      {isError && !isLoading && (
        <EmptyState
          icon="⚠️"
          title="Gagal memuat insights"
          desc="Coba refresh halaman atau periksa koneksi internet kamu."
          action={
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="size-4" /> Coba lagi
            </Button>
          }
        />
      )}

      {/* Empty state */}
      {!isLoading && !isError && !hasData && (
        <EmptyState
          icon="📊"
          title="Belum cukup data untuk insights"
          desc="Mulai jualan atau tambah transaksi untuk melihat analisis. Insights akan otomatis muncul setelah ada aktivitas penjualan, lead, atau konten."
          action={
            <div className="flex flex-wrap gap-2 justify-center">
              <Button className="bg-teal hover:bg-teal-600" onClick={() => setSection("toko")}>
                🛒 Mulai Jualan
              </Button>
              <Button variant="outline" onClick={() => setSection("keuangan")}>
                💰 Catat Transaksi
              </Button>
            </div>
          }
        />
      )}

      {/* Main content */}
      {!isLoading && !isError && hasData && data && (
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mb-4 h-auto flex-wrap">
            <TabsTrigger value="overview" className="gap-1.5">
              <Activity className="size-3.5" /> Overview
            </TabsTrigger>
            <TabsTrigger value="clv" className="gap-1.5">
              <Crown className="size-3.5" /> CLV
            </TabsTrigger>
            <TabsTrigger value="cohort" className="gap-1.5">
              <Grid3x3 className="size-3.5" /> Cohort
            </TabsTrigger>
            <TabsTrigger value="seasonal" className="gap-1.5">
              <Calendar className="size-3.5" /> Seasonal
            </TabsTrigger>
            <TabsTrigger value="produk" className="gap-1.5">
              <Package className="size-3.5" /> Produk
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
          {/* Metrics row */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            <StatCard
              label="Avg Order Value"
              value={formatRupiahShort(m?.avgOrderValue ?? 0)}
              icon={<DollarSign className="size-4" />}
              accent="teal"
            />
            <StatCard
              label="Repeat Customer"
              value={`${m?.repeatCustomerRate ?? 0}%`}
              icon={<Users className="size-4" />}
              accent="orange"
              trend={{
                value: m && m.repeatCustomerRate >= 30 ? "sehat" : "rendah",
                up: (m?.repeatCustomerRate ?? 0) >= 30,
              }}
            />
            <StatCard
              label="Konversi Lead"
              value={`${m?.conversionRate ?? 0}%`}
              icon={<Percent className="size-4" />}
              accent="success"
              trend={{
                value: m && m.conversionRate >= 25 ? "sehat" : "rendah",
                up: (m?.conversionRate ?? 0) >= 25,
              }}
            />
            <StatCard
              label="Avg Margin"
              value={`${m?.avgMarginPct ?? 0}%`}
              icon={<TrendingUp className="size-4" />}
              accent="teal"
              trend={{
                value: m && m.avgMarginPct >= 30 ? "sehat" : "tipis",
                up: (m?.avgMarginPct ?? 0) >= 30,
              }}
            />
            <StatCard
              label="Growth Bulan Ini"
              value={`${m && m.revenueGrowthPct > 0 ? "+" : ""}${m?.revenueGrowthPct ?? 0}%`}
              icon={m && m.revenueGrowthPct > 0 ? <TrendingUp className="size-4" /> : m && m.revenueGrowthPct < 0 ? <TrendingDown className="size-4" /> : <Minus className="size-4" />}
              accent={(m?.revenueGrowthPct ?? 0) >= 0 ? "success" : "warning"}
              trend={{
                value: m && m.revenueGrowthPct > 0 ? "naik" : m && m.revenueGrowthPct < 0 ? "turun" : "stabil",
                up: (m?.revenueGrowthPct ?? 0) >= 0,
              }}
            />
            <StatCard
              label="Nilai Stok"
              value={formatRupiahShort(m?.inventoryValue ?? 0)}
              icon={<Package className="size-4" />}
              accent="stone"
            />
          </div>

          {/* Charts grid (2-col) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {/* Revenue Trend */}
            <SectionCard title="Tren Pendapatan" desc="6 bulan terakhir · pendapatan & order">
              <RevenueTrendChart data={data.revenueTrend} />
            </SectionCard>

            {/* Top Products */}
            <SectionCard title="Produk Terlaris" desc="Top 5 berdasarkan omzet">
              <TopProductsChart data={data.topProducts} />
            </SectionCard>

            {/* Customer Growth */}
            <SectionCard title="Pertumbuhan Pelanggan" desc="Total pelanggan kumulatif 6 bulan">
              <CustomerGrowthChart data={data.customerGrowth} />
            </SectionCard>

            {/* Lead Funnel */}
            <SectionCard title="Funnel Lead" desc="Konversi dari lead ke deal">
              <LeadFunnelViz data={data.leadFunnel} />
            </SectionCard>

            {/* Content by Type */}
            <SectionCard title="Distribusi Konten" desc="Berdasarkan tipe konten">
              <ContentByTypeChart data={data.contentByType} />
            </SectionCard>

            {/* Sales by Day */}
            <SectionCard title="Pola Penjualan per Hari" desc="Senin–Minggu · dari transaksi income">
              <SalesByDayChart data={data.salesByDay} />
            </SectionCard>
          </div>

          {/* Recent Activity */}
          <SectionCard
            title="Aktivitas Terbaru"
            desc="10 aktivitas lintas modul terakhir"
            right={
              <Button
                variant="ghost"
                size="sm"
                className="text-teal"
                onClick={() => qc.invalidateQueries({ queryKey: ["insights"] })}
              >
                <RefreshCw className="size-3.5" /> Muat ulang
              </Button>
            }
            bodyClassName="p-0"
          >
            <RecentActivityFeed items={data.recentActivity} />
          </SectionCard>
          </TabsContent>

          <TabsContent value="clv">
            <CLVTab brandId={activeBrand.id} />
          </TabsContent>

          <TabsContent value="cohort">
            <CohortTab brandId={activeBrand.id} />
          </TabsContent>

          <TabsContent value="seasonal">
            <SeasonalTab brandId={activeBrand.id} />
          </TabsContent>

          <TabsContent value="produk">
            <ProductsPerfTab brandId={activeBrand.id} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

// ─── AI Summary CTA Card ─────────────────────────────────────
function CTACard({
  creditBalance,
  onGenerate,
  disabled,
  onDismiss,
}: {
  creditBalance: number;
  onGenerate: () => void;
  disabled: boolean;
  onDismiss?: () => void;
}) {
  const canAfford = creditBalance >= 3;
  return (
    <div className="relative rounded-2xl bg-gradient-to-br from-teal-100 via-cream-100 to-orange-100/40 border border-teal/20 p-6 md:p-8">
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="absolute top-3 right-3 size-6 rounded-full flex items-center justify-center text-stone hover:text-ink hover:bg-card/60 transition-colors"
          aria-label="Tutup"
        >
          <X className="size-4" />
        </button>
      )}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
        <div className="size-12 rounded-2xl bg-teal text-white flex items-center justify-center shrink-0">
          <Brain className="size-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-ink text-lg flex items-center gap-2 flex-wrap">
            Ringkasan Bisnis dari AI
            <Badge className="bg-amber-100 text-amber-700 border-amber-200 border">
              <Zap className="size-3" /> 3 credit
            </Badge>
          </div>
          <p className="text-sm text-ink-500 mt-1 leading-relaxed">
            AI akan menganalisis pendapatan, margin, konversi lead, dan pola pelanggan kamu,
            lalu memberikan headline, kekuatan, area perhatian, serta rekomendasi aksi konkret.
          </p>
          <div className="text-xs text-stone mt-2">
            Credit kamu saat ini: <b className="text-ink">{creditBalance}</b>
          </div>
        </div>
        <Button
          className="bg-teal hover:bg-teal-600 gap-1.5 shrink-0"
          onClick={onGenerate}
          disabled={disabled || !canAfford}
        >
          <Sparkles className="size-4" />
          {canAfford ? "Dapatkan Ringkasan" : "Credit tidak cukup"}
        </Button>
      </div>
    </div>
  );
}

// ─── Summary Skeleton ─────────────────────────────────────────
function SummarySkeleton() {
  return (
    <div className="rounded-2xl bg-card border border-border p-6">
      <div className="flex items-center gap-3 mb-4">
        <Skeleton className="size-12 rounded-2xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="size-16 rounded-full" />
      </div>
      <Skeleton className="h-6 w-full mb-4" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
      </div>
    </div>
  );
}

// ─── AI Summary Card ──────────────────────────────────────────
function AISummaryCard({ summary, onReset }: { summary: AISummary; onReset: () => void }) {
  const score = summary.healthScore;
  const scoreColor =
    score >= 70 ? "#0D9488" : score >= 40 ? "#D97706" : "#DC2626";
  const scoreLabel = score >= 70 ? "Sehat" : score >= 40 ? "Cukup" : "Perlu Perhatian";
  const trendCfg = {
    up: { icon: <TrendingUp className="size-4" />, color: "text-emerald-700", bg: "bg-emerald-100", label: "Naik" },
    down: { icon: <TrendingDown className="size-4" />, color: "text-rose-700", bg: "bg-rose-100", label: "Turun" },
    stable: { icon: <Minus className="size-4" />, color: "text-stone-600", bg: "bg-stone-100", label: "Stabil" },
  }[summary.trend];

  return (
    <div className="rounded-2xl bg-card border border-border p-5 md:p-6">
      <div className="flex items-start gap-4 mb-4">
        <div className="size-12 rounded-2xl bg-teal text-white flex items-center justify-center shrink-0">
          <Brain className="size-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-bold text-ink text-base">Ringkasan AI</h3>
            <Badge className={`${trendCfg.bg} ${trendCfg.color} border-0`}>
              {trendCfg.icon} {trendCfg.label}
            </Badge>
          </div>
          <p className="text-base font-semibold text-ink leading-snug">{summary.headline}</p>
        </div>
        {/* Health score gauge */}
        <div className="flex flex-col items-center shrink-0">
          <HealthGauge score={score} color={scoreColor} />
          <div className="text-[10px] font-semibold mt-1" style={{ color: scoreColor }}>
            {scoreLabel}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Strengths */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
          <div className="text-xs font-bold text-emerald-700 mb-2 flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5" /> Kekuatan
          </div>
          <ul className="space-y-1.5">
            {summary.strengths.length === 0 ? (
              <li className="text-xs text-stone">Tidak ada kekuatan yang terdeteksi.</li>
            ) : (
              summary.strengths.map((s, i) => (
                <li key={i} className="text-xs text-ink flex items-start gap-1.5">
                  <CheckCircle2 className="size-3 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{s}</span>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* Concerns */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3">
          <div className="text-xs font-bold text-amber-700 mb-2 flex items-center gap-1.5">
            <AlertTriangle className="size-3.5" /> Perlu Perhatian
          </div>
          <ul className="space-y-1.5">
            {summary.concerns.length === 0 ? (
              <li className="text-xs text-stone">Tidak ada area perhatian.</li>
            ) : (
              summary.concerns.map((c, i) => (
                <li key={i} className="text-xs text-ink flex items-start gap-1.5">
                  <AlertTriangle className="size-3 text-amber-600 shrink-0 mt-0.5" />
                  <span>{c}</span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      {/* Recommendations */}
      <div className="rounded-xl border border-teal/30 bg-teal-50/40 p-3">
        <div className="text-xs font-bold text-teal-700 mb-2 flex items-center gap-1.5">
          <Lightbulb className="size-3.5" /> Rekomendasi Aksi
        </div>
        <ol className="space-y-1.5">
          {summary.recommendations.length === 0 ? (
            <li className="text-xs text-stone">Belum ada rekomendasi.</li>
          ) : (
            summary.recommendations.map((r, i) => (
              <li key={i} className="text-xs text-ink flex items-start gap-2">
                <span className="size-4 rounded-full bg-teal text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span>{r}</span>
              </li>
            ))
          )}
        </ol>
      </div>

      <div className="flex justify-end mt-3">
        <Button variant="ghost" size="sm" className="text-stone h-7 text-xs" onClick={onReset}>
          Tutup
        </Button>
      </div>
    </div>
  );
}

// ─── Health Score Gauge (circular SVG) ───────────────────────
function HealthGauge({ score, color }: { score: number; color: string }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="relative size-16">
      <svg className="size-16 -rotate-90" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={radius} fill="none" stroke="#E7E5E4" strokeWidth="6" />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-extrabold tabular-nums" style={{ color }}>
          {score}
        </span>
      </div>
    </div>
  );
}

// ─── Loading state ────────────────────────────────────────────
function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-72 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

// ─── Revenue Trend Chart ──────────────────────────────────────
function RevenueTrendChart({ data }: { data: RevenueTrendPoint[] }) {
  if (data.length === 0 || data.every((d) => d.revenue === 0 && d.orders === 0)) {
    return <ChartEmpty msg="Belum ada pendapatan tercatat 6 bulan terakhir." />;
  }
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
          <defs>
            <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0D9488" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#0D9488" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#78716C" }} axisLine={false} tickLine={false} />
          <YAxis
            tickFormatter={(v) => formatRupiahShort(Number(v))}
            tick={{ fontSize: 11, fill: "#78716C" }}
            axisLine={false}
            tickLine={false}
            width={56}
          />
          <RTooltip
            formatter={(v: number, n: string) =>
              n === "revenue" ? [formatRupiah(Number(v)), "Pendapatan"] : [`${v} order`, "Order"]
            }
            contentStyle={{ borderRadius: 12, border: "1px solid #E7E5E4", fontSize: 12 }}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            name="revenue"
            stroke="#0D9488"
            strokeWidth={2}
            fill="url(#revGradient)"
            dot={{ r: 3, fill: "#0D9488" }}
          />
          <Line type="monotone" dataKey="orders" name="orders" stroke="#F97316" strokeWidth={2} dot={{ r: 3, fill: "#F97316" }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Top Products Chart ───────────────────────────────────────
function TopProductsChart({ data }: { data: TopProduct[] }) {
  if (data.length === 0) {
    return <ChartEmpty msg="Belum ada penjualan produk tercatat." />;
  }
  const chartData = data.map((p) => ({
    name: p.name.length > 18 ? p.name.slice(0, 18) + "…" : p.name,
    fullName: p.name,
    revenue: p.revenue,
    margin: p.margin,
  }));
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={(v) => formatRupiahShort(Number(v))}
            tick={{ fontSize: 11, fill: "#78716C" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11, fill: "#78716C" }}
            axisLine={false}
            tickLine={false}
            width={100}
          />
          <RTooltip
            formatter={(v: number, n: string) => [formatRupiah(Number(v)), n === "revenue" ? "Omzet" : "Margin"]}
            labelFormatter={(_, p) => (p && p[0] ? (p[0].payload as { fullName: string }).fullName : "")}
            contentStyle={{ borderRadius: 12, border: "1px solid #E7E5E4", fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} formatter={(v) => (v === "revenue" ? "Omzet" : "Margin")} />
          <Bar dataKey="revenue" name="revenue" fill="#0D9488" radius={[0, 6, 6, 0]} barSize={12} />
          <Bar dataKey="margin" name="margin" fill="#F97316" radius={[0, 6, 6, 0]} barSize={12} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Customer Growth Chart ────────────────────────────────────
function CustomerGrowthChart({ data }: { data: CustomerGrowthPoint[] }) {
  const hasData = data.some((d) => d.totalCustomers > 0);
  if (!hasData) {
    return <ChartEmpty msg="Belum ada pelanggan terdaftar." />;
  }
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#78716C" }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fontSize: 11, fill: "#78716C" }}
            axisLine={false}
            tickLine={false}
            width={32}
            allowDecimals={false}
          />
          <RTooltip
            formatter={(v: number, n: string) =>
              n === "totalCustomers" ? [`${v} pelanggan`, "Total"] : [`${v} baru`, "Baru"]
            }
            contentStyle={{ borderRadius: 12, border: "1px solid #E7E5E4", fontSize: 12 }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11 }}
            formatter={(v) => (v === "totalCustomers" ? "Total Pelanggan" : "Pelanggan Baru")}
          />
          <Line
            type="monotone"
            dataKey="totalCustomers"
            name="totalCustomers"
            stroke="#0D9488"
            strokeWidth={2.5}
            dot={{ r: 4, fill: "#0D9488" }}
          />
          <Line
            type="monotone"
            dataKey="newCustomers"
            name="newCustomers"
            stroke="#A855F7"
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={{ r: 3, fill: "#A855F7" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Lead Funnel Visualization ───────────────────────────────
function LeadFunnelViz({ data }: { data: LeadFunnelStage[] }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const funnelColors = ["#F97316", "#0D9488", "#10B981", "#78716C"];
  if (data.every((d) => d.count === 0)) {
    return <ChartEmpty msg="Belum ada lead tercatat." />;
  }
  return (
    <div className="space-y-2 py-2">
      {data.map((stage, i) => {
        const widthPct = Math.max(15, (stage.count / maxCount) * 100);
        const color = funnelColors[i] ?? "#0D9488";
        return (
          <div key={stage.stage}>
            <div className="flex items-center justify-between mb-1 text-xs">
              <span className="font-medium text-ink">{stage.stage}</span>
              <span className="text-stone">
                {stage.count} lead
                {i > 0 && (
                  <span className="text-stone/70 ml-1.5">· {stage.conversionRate}%</span>
                )}
              </span>
            </div>
            <div className="h-8 bg-cream-100 rounded-lg overflow-hidden flex items-center">
              <div
                className="h-full rounded-lg flex items-center justify-end px-2 transition-all duration-700"
                style={{ width: `${widthPct}%`, backgroundColor: color }}
              >
                <span className="text-[10px] font-bold text-white">{stage.count}</span>
              </div>
            </div>
          </div>
        );
      })}
      <div className="text-[11px] text-stone pt-2 border-t border-border mt-3">
        Konversi total: <b className="text-ink">{overallConversion(data)}%</b> dari lead ke Deal/Closed.
      </div>
    </div>
  );
}

function overallConversion(data: LeadFunnelStage[]): number {
  const total = data.reduce((s, d) => s + d.count, 0);
  const won = data.filter((d) => d.stage === "Deal" || d.stage === "Closed").reduce((s, d) => s + d.count, 0);
  return total > 0 ? Math.round((won / total) * 100) : 0;
}

// ─── Content by Type Pie Chart ───────────────────────────────
function ContentByTypeChart({ data }: { data: ContentByType[] }) {
  if (data.length === 0) {
    return <ChartEmpty msg="Belum ada konten dibuat." />;
  }
  const chartData = data.map((d) => ({
    name: CONTENT_TYPE_LABEL[d.type] ?? d.type,
    value: d.count,
    icon: CONTENT_TYPE_ICON[d.type] ?? "📄",
  }));
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={80}
            innerRadius={42}
            paddingAngle={2}
            label={(e: { name: string; value: number }) => `${e.name} (${e.value})`}
            labelLine={false}
          >
            {chartData.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          <RTooltip
            formatter={(v: number, n: string) => [`${v} konten`, n]}
            contentStyle={{ borderRadius: 12, border: "1px solid #E7E5E4", fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Sales by Day Bar Chart ──────────────────────────────────
function SalesByDayChart({ data }: { data: SalesByDay[] }) {
  if (data.length === 0 || data.every((d) => d.sales === 0)) {
    return <ChartEmpty msg="Belum ada transaksi penjualan." />;
  }
  const max = Math.max(...data.map((d) => d.sales), 1);
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" vertical={false} />
          <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#78716C" }} axisLine={false} tickLine={false} />
          <YAxis
            tickFormatter={(v) => formatRupiahShort(Number(v))}
            tick={{ fontSize: 11, fill: "#78716C" }}
            axisLine={false}
            tickLine={false}
            width={56}
          />
          <RTooltip
            formatter={(v: number) => [formatRupiah(Number(v)), "Penjualan"]}
            contentStyle={{ borderRadius: 12, border: "1px solid #E7E5E4", fontSize: 12 }}
          />
          <Bar dataKey="sales" name="Penjualan" radius={[6, 6, 0, 0]} barSize={28}>
            {data.map((d, i) => {
              const isPeak = d.sales === max && d.sales > 0;
              return <Cell key={i} fill={isPeak ? "#0D9488" : "#5EEAD4"} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Recent Activity Feed ────────────────────────────────────
function RecentActivityFeed({ items }: { items: RecentActivityItem[] }) {
  if (items.length === 0) {
    return (
      <div className="p-8 text-center">
        <Activity className="size-8 text-stone mx-auto mb-2" />
        <p className="text-sm text-stone">Belum ada aktivitas tercatat.</p>
      </div>
    );
  }
  return (
    <div className="divide-y divide-border max-h-[440px] overflow-y-auto">
      {items.map((item, i) => {
        const style = ACTIVITY_STYLE[item.type];
        return (
          <div
            key={`${item.type}-${i}`}
            className="px-5 py-3 hover:bg-cream-100/50 transition-colors flex items-start gap-3"
          >
            <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${style.bg} ${style.color}`}>
              {style.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-ink leading-snug">{item.description}</div>
              <div className="text-[11px] text-stone mt-0.5 flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] py-0 h-4 capitalize">
                  {item.type}
                </Badge>
                <span>{timeAgo(item.timestamp)}</span>
              </div>
            </div>
            {item.amount != null && (
              <div className="text-sm font-bold tabular-nums text-ink shrink-0">
                {formatRupiahShort(item.amount)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Chart empty state ────────────────────────────────────────
function ChartEmpty({ msg }: { msg: string }) {
  return (
    <div className="h-64 flex flex-col items-center justify-center text-center px-4">
      <div className="text-3xl mb-2">📊</div>
      <p className="text-sm text-stone">{msg}</p>
    </div>
  );
}

// ─── BCG Quadrant helpers ─────────────────────────────────────
const BCG_CONFIG: Record<BCGQuadrant, { label: string; color: string; bg: string; border: string; desc: string }> = {
  star: {
    label: "Star",
    color: "text-emerald-700",
    bg: "bg-emerald-100",
    border: "border-emerald-200",
    desc: "Omzet tinggi · margin tinggi",
  },
  cash_cow: {
    label: "Cash Cow",
    color: "text-amber-700",
    bg: "bg-amber-100",
    border: "border-amber-200",
    desc: "Omzet tinggi · margin tipis",
  },
  question_mark: {
    label: "Question Mark",
    color: "text-sky-700",
    bg: "bg-sky-100",
    border: "border-sky-200",
    desc: "Omzet rendah · margin tinggi",
  },
  dog: {
    label: "Dog",
    color: "text-rose-700",
    bg: "bg-rose-100",
    border: "border-rose-200",
    desc: "Omzet rendah · margin tipis",
  },
};

function BCGBadge({ quadrant }: { quadrant: BCGQuadrant }) {
  const cfg = BCG_CONFIG[quadrant];
  return (
    <Badge variant="outline" className={`${cfg.bg} ${cfg.color} ${cfg.border} text-[10px] font-semibold`}>
      {cfg.label}
    </Badge>
  );
}

// ─── Tab skeleton (shared) ────────────────────────────────────
function TabSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-2xl" />
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

// ─── CLV Tab ──────────────────────────────────────────────────
function CLVTab({ brandId }: { brandId: string }) {
  const { data, isLoading, isError, refetch, isFetching } = useQuery<CLVResponse>({
    queryKey: ["analytics-clv", brandId],
    queryFn: () => api<CLVResponse>(`/api/analytics/clv?brandId=${brandId}`),
    enabled: !!brandId,
    staleTime: 60_000,
  });

  if (isLoading) return <TabSkeleton />;
  if (isError) {
    return (
      <EmptyState
        icon="⚠️"
        title="Gagal memuat data CLV"
        desc="Coba muat ulang."
        action={
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="size-4" /> Coba lagi
          </Button>
        }
      />
    );
  }
  if (!data || (data.topCustomers.length === 0 && data.avgCLV === 0)) {
    return (
      <EmptyState
        icon="👑"
        title="Belum ada data CLV"
        desc="Catat order & transaksi penjualan untuk melihat analisis Customer Lifetime Value."
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Stat row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Avg CLV"
          value={formatRupiahShort(data.avgCLV)}
          icon={<Crown className="size-4" />}
          accent="teal"
        />
        <StatCard
          label="Retention Rate"
          value={`${data.retentionRate}%`}
          icon={<RefreshCw className="size-4" />}
          accent={data.retentionRate >= 30 ? "success" : "warning"}
          trend={{ value: data.retentionRate >= 30 ? "sehat" : "rendah", up: data.retentionRate >= 30 }}
        />
        <StatCard
          label="Avg Days / Order"
          value={`${data.avgDaysBetweenOrders} hari`}
          icon={<Clock className="size-4" />}
          accent="orange"
        />
        <StatCard
          label="Top Customer Spent"
          value={data.topCustomers[0] ? formatRupiahShort(data.topCustomers[0].totalSpent) : "—"}
          icon={<Award className="size-4" />}
          accent="stone"
        />
      </div>

      {/* Top customers table */}
      <SectionCard
        title="Top 10 Pelanggan (berdasarkan total belanja)"
        desc="Pelanggan paling berharga — fokus retensi & upsell"
        right={
          <Button
            variant="ghost"
            size="sm"
            className="text-teal"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} /> Refresh
          </Button>
        }
        bodyClassName="p-0"
      >
        {data.topCustomers.length === 0 ? (
          <div className="p-8 text-center text-sm text-stone">Belum ada pelanggan dengan order.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">#</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Telepon</TableHead>
                <TableHead className="text-right">Total Spent</TableHead>
                <TableHead className="text-right">Order</TableHead>
                <TableHead className="text-right">AOV</TableHead>
                <TableHead className="text-right">Hari Aktif</TableHead>
                <TableHead className="text-right pr-5">Prediksi CLV</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.topCustomers.map((c, i) => (
                <TableRow key={c.id}>
                  <TableCell className="pl-5 font-bold text-stone">{i + 1}</TableCell>
                  <TableCell className="font-medium text-ink">{c.name}</TableCell>
                  <TableCell className="text-stone">{c.phone}</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold text-ink">
                    {formatRupiah(c.totalSpent)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{c.orderCount}</TableCell>
                  <TableCell className="text-right tabular-nums text-stone">
                    {formatRupiahShort(c.avgOrderValue)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-stone">{c.daysActive}</TableCell>
                  <TableCell className="text-right pr-5 tabular-nums font-semibold text-teal">
                    {formatRupiahShort(c.predictedCLV)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SectionCard>

      {/* Distribution chart */}
      <SectionCard title="Distribusi CLV" desc="Sebaran pelanggan berdasarkan total belanja lifetime">
        <CLVDistributionChart data={data.distribution} />
      </SectionCard>
    </div>
  );
}

function CLVDistributionChart({ data }: { data: CLVDistributionBucket[] }) {
  if (data.length === 0 || data.every((d) => d.count === 0)) {
    return <ChartEmpty msg="Belum ada distribusi CLV." />;
  }
  return (
    <div className="h-64 w-full chart-animate">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" vertical={false} />
          <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: "#78716C" }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fontSize: 11, fill: "#78716C" }}
            axisLine={false}
            tickLine={false}
            width={32}
            allowDecimals={false}
          />
          <RTooltip
            formatter={(v: number, n: string) =>
              n === "count" ? [`${v} pelanggan`, "Jumlah"] : [`${v}%`, "Persentase"]
            }
            contentStyle={{ borderRadius: 12, border: "1px solid #E7E5E4", fontSize: 12 }}
          />
          <Bar dataKey="count" name="count" radius={[6, 6, 0, 0]} barSize={48}>
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Cohort Tab ───────────────────────────────────────────────
function CohortTab({ brandId }: { brandId: string }) {
  const { data, isLoading, isError, refetch, isFetching } = useQuery<CohortResponse>({
    queryKey: ["analytics-cohort", brandId],
    queryFn: () => api<CohortResponse>(`/api/analytics/cohort?brandId=${brandId}&months=6`),
    enabled: !!brandId,
    staleTime: 60_000,
  });

  if (isLoading) return <TabSkeleton />;
  if (isError) {
    return (
      <EmptyState
        icon="⚠️"
        title="Gagal memuat cohort"
        desc="Coba muat ulang."
        action={
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="size-4" /> Coba lagi
          </Button>
        }
      />
    );
  }
  if (!data || data.cohorts.length === 0) {
    return (
      <EmptyState
        icon="🔢"
        title="Belum ada data cohort"
        desc="Cohort retention muncul setelah ada pelanggan dengan order di 6 bulan terakhir."
      />
    );
  }

  // Determine max offset across cohorts (number of month columns to render)
  const maxOffset = Math.max(...data.cohorts.map((c) => c.retention.length - 1), 0);

  // Summary: avg retention at M1, M3, M6
  const avgAt = (offset: number): number => {
    const vals = data.cohorts
      .map((c) => c.retention.find((r) => r.monthOffset === offset))
      .filter((r): r is CohortRetentionPoint => !!r && r.activeCustomers > 0);
    if (vals.length === 0) return 0;
    return Math.round(vals.reduce((s, r) => s + r.retentionRate, 0) / vals.length);
  };
  const avgM1 = avgAt(1);
  const avgM3 = avgAt(3);
  const avgM6 = avgAt(6);

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Jumlah Cohort" value={data.cohorts.length} icon={<Grid3x3 className="size-4" />} accent="teal" />
        <StatCard label="Avg Retention M1" value={`${avgM1}%`} icon={<TrendingUp className="size-4" />} accent={avgM1 >= 30 ? "success" : "warning"} />
        <StatCard label="Avg Retention M3" value={`${avgM3}%`} icon={<TrendingUp className="size-4" />} accent={avgM3 >= 20 ? "success" : "warning"} />
        <StatCard label="Avg Retention M6" value={`${avgM6}%`} icon={<TrendingUp className="size-4" />} accent={avgM6 >= 10 ? "success" : "warning"} />
      </div>

      <SectionCard
        title="Heatmap Retensi Cohort"
        desc="Pelanggan dikelompokkan per bulan first-order. Sel = % yang order lagi di bulan ke-N."
        right={
          <Button variant="ghost" size="sm" className="text-teal" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} /> Refresh
          </Button>
        }
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5 sticky left-0 bg-card z-10">Cohort</TableHead>
                <TableHead className="text-right">Size</TableHead>
                {Array.from({ length: maxOffset + 1 }, (_, i) => (
                  <TableHead key={i} className="text-center">{`M${i}`}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.cohorts.map((c) => (
                <TableRow key={c.cohortMonth}>
                  <TableCell className="pl-5 sticky left-0 bg-card z-10 font-medium text-ink whitespace-nowrap">
                    {c.cohortLabel}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">{c.size}</TableCell>
                  {Array.from({ length: maxOffset + 1 }, (_, i) => {
                    const r = c.retention.find((x) => x.monthOffset === i);
                    if (!r) {
                      return (
                        <TableCell key={i} className="text-center">
                          <span className="text-stone/40 text-xs">—</span>
                        </TableCell>
                      );
                    }
                    const rate = r.retentionRate;
                    const bg =
                      rate > 50
                        ? "bg-emerald-100 text-emerald-700"
                        : rate >= 25
                          ? "bg-amber-100 text-amber-700"
                          : rate > 0
                            ? "bg-rose-100 text-rose-700"
                            : "bg-stone-100 text-stone-500";
                    return (
                      <TableCell key={i} className="text-center p-1.5">
                        <div
                          className={`heatmap-cell size-12 rounded-lg ${bg} flex flex-col items-center justify-center cursor-default`}
                          title={`${c.cohortLabel} · M${i}: ${r.activeCustomers}/${c.size} (${rate}%)`}
                        >
                          <span className="text-sm font-bold tabular-nums">{rate}%</span>
                          <span className="text-[9px] opacity-70">{r.activeCustomers}</span>
                        </div>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 px-5 py-3 border-t border-border text-xs text-stone">
          <span className="font-semibold text-ink">Legenda:</span>
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded bg-emerald-100 border border-emerald-200" /> &gt; 50% (sehat)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded bg-amber-100 border border-amber-200" /> 25–50% (cukup)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded bg-rose-100 border border-rose-200" /> &lt; 25% (rendah)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded bg-stone-100 border border-stone-200" /> 0%
          </span>
        </div>
      </SectionCard>
    </div>
  );
}

// ─── Seasonal Tab ─────────────────────────────────────────────
function SeasonalTab({ brandId }: { brandId: string }) {
  const { data, isLoading, isError, refetch, isFetching } = useQuery<SeasonalResponse>({
    queryKey: ["analytics-seasonal", brandId],
    queryFn: () => api<SeasonalResponse>(`/api/analytics/seasonal?brandId=${brandId}`),
    enabled: !!brandId,
    staleTime: 60_000,
  });

  if (isLoading) return <TabSkeleton />;
  if (isError) {
    return (
      <EmptyState
        icon="⚠️"
        title="Gagal memuat data seasonal"
        desc="Coba muat ulang."
        action={
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="size-4" /> Coba lagi
          </Button>
        }
      />
    );
  }
  if (!data || data.byMonth.every((m) => m.revenue === 0 && m.orders === 0)) {
    return (
      <EmptyState
        icon="📅"
        title="Belum ada data seasonal"
        desc="Pola musiman akan muncul setelah ada transaksi penjualan 12 bulan terakhir."
      />
    );
  }

  const seasonalityLabel =
    data.seasonality === "high" ? "Tinggi" : data.seasonality === "medium" ? "Sedang" : "Rendah";
  const seasonalityColor =
    data.seasonality === "high" ? "text-rose-700 bg-rose-100" : data.seasonality === "medium" ? "text-amber-700 bg-amber-100" : "text-emerald-700 bg-emerald-100";

  return (
    <div className="space-y-4">
      {/* Key insights row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Bulan Terbaik"
          value={data.bestMonth.month}
          icon={<Award className="size-4" />}
          accent="success"
          trend={{ value: formatRupiahShort(data.bestMonth.revenue), up: true }}
        />
        <StatCard
          label="Bulan Terlemah"
          value={data.worstMonth.month}
          icon={<TrendingDown className="size-4" />}
          accent="warning"
          trend={{ value: formatRupiahShort(data.worstMonth.revenue), up: false }}
        />
        <StatCard
          label="Hari Teramai"
          value={data.peakDay.day}
          icon={<Calendar className="size-4" />}
          accent="teal"
          trend={{ value: formatRupiahShort(data.peakDay.revenue), up: true }}
        />
        <StatCard
          label="Jam Puncak Order"
          value={`${data.peakHour.hour}:00`}
          icon={<Clock className="size-4" />}
          accent="orange"
          trend={{ value: `${data.peakHour.orders} order`, up: true }}
        />
      </div>

      {/* Seasonality banner */}
      <div className="rounded-2xl bg-card border border-border p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center">
            <Flame className="size-4" />
          </div>
          <div>
            <div className="text-sm font-bold text-ink">Indeks Seasonalitas</div>
            <div className="text-xs text-stone">Variasi pendapatan bulanan (coefficient of variation)</div>
          </div>
        </div>
        <Badge variant="outline" className={`${seasonalityColor} text-xs font-semibold`}>
          {seasonalityLabel}
        </Badge>
      </div>

      {/* Monthly revenue chart */}
      <SectionCard
        title="Pendapatan per Bulan"
        desc="12 bulan terakhir · dari transaksi income"
        right={
          <Button variant="ghost" size="sm" className="text-teal" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} /> Refresh
          </Button>
        }
      >
        <SeasonalMonthlyChart data={data.byMonth} />
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="Pendapatan per Hari" desc="Senin–Minggu">
          <SeasonalDayChart data={data.byDayOfWeek} />
        </SectionCard>
        <SectionCard title="Order per Jam" desc="Distribusi 0–23 (dari createdAt order)">
          <SeasonalHourChart data={data.byHour} />
        </SectionCard>
      </div>
    </div>
  );
}

function SeasonalMonthlyChart({ data }: { data: SeasonalByMonth[] }) {
  if (data.every((d) => d.revenue === 0)) return <ChartEmpty msg="Belum ada pendapatan." />;
  const max = Math.max(...data.map((d) => d.revenue), 1);
  return (
    <div className="h-64 w-full chart-animate">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#78716C" }} axisLine={false} tickLine={false} />
          <YAxis
            tickFormatter={(v) => formatRupiahShort(Number(v))}
            tick={{ fontSize: 11, fill: "#78716C" }}
            axisLine={false}
            tickLine={false}
            width={56}
          />
          <RTooltip
            formatter={(v: number) => [formatRupiah(Number(v)), "Pendapatan"]}
            contentStyle={{ borderRadius: 12, border: "1px solid #E7E5E4", fontSize: 12 }}
          />
          <Bar dataKey="revenue" name="Pendapatan" radius={[6, 6, 0, 0]} barSize={22}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.revenue === max && d.revenue > 0 ? "#0D9488" : "#5EEAD4"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function SeasonalDayChart({ data }: { data: SeasonalByDay[] }) {
  if (data.every((d) => d.revenue === 0)) return <ChartEmpty msg="Belum ada transaksi." />;
  const max = Math.max(...data.map((d) => d.revenue), 1);
  return (
    <div className="h-64 w-full chart-animate">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" vertical={false} />
          <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#78716C" }} axisLine={false} tickLine={false} />
          <YAxis
            tickFormatter={(v) => formatRupiahShort(Number(v))}
            tick={{ fontSize: 11, fill: "#78716C" }}
            axisLine={false}
            tickLine={false}
            width={56}
          />
          <RTooltip
            formatter={(v: number) => [formatRupiah(Number(v)), "Pendapatan"]}
            contentStyle={{ borderRadius: 12, border: "1px solid #E7E5E4", fontSize: 12 }}
          />
          <Bar dataKey="revenue" name="Pendapatan" radius={[6, 6, 0, 0]} barSize={26}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.revenue === max && d.revenue > 0 ? "#EA580C" : "#FED7AA"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function SeasonalHourChart({ data }: { data: SeasonalByHour[] }) {
  if (data.every((d) => d.orders === 0)) return <ChartEmpty msg="Belum ada order." />;
  // Only show hours 6–22 for readability (typical business hours); keep all if outside has data
  const filtered = data.filter((d) => Number(d.hour) >= 6 && Number(d.hour) <= 22);
  const showData = filtered.some((d) => d.orders > 0) ? filtered : data;
  return (
    <div className="h-64 w-full chart-animate">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={showData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" vertical={false} />
          <XAxis
            dataKey="hour"
            tick={{ fontSize: 10, fill: "#78716C" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}`}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#78716C" }}
            axisLine={false}
            tickLine={false}
            width={28}
            allowDecimals={false}
          />
          <RTooltip
            formatter={(v: number) => [`${v} order`, "Order"]}
            labelFormatter={(l) => `Jam ${l}:00`}
            contentStyle={{ borderRadius: 12, border: "1px solid #E7E5E4", fontSize: 12 }}
          />
          <Line
            type="monotone"
            dataKey="orders"
            name="Order"
            stroke="#0D9488"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "#0D9488" }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Products Performance Tab ─────────────────────────────────
function ProductsPerfTab({ brandId }: { brandId: string }) {
  const { data, isLoading, isError, refetch, isFetching } = useQuery<ProductPerfResponse>({
    queryKey: ["analytics-products", brandId],
    queryFn: () => api<ProductPerfResponse>(`/api/analytics/products?brandId=${brandId}`),
    enabled: !!brandId,
    staleTime: 60_000,
  });

  if (isLoading) return <TabSkeleton />;
  if (isError) {
    return (
      <EmptyState
        icon="⚠️"
        title="Gagal memuat data produk"
        desc="Coba muat ulang."
        action={
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="size-4" /> Coba lagi
          </Button>
        }
      />
    );
  }
  if (!data || data.products.length === 0) {
    return (
      <EmptyState
        icon="📦"
        title="Belum ada produk"
        desc="Tambahkan produk di modul Produk untuk melihat analisis performa & BCG matrix."
      />
    );
  }

  const { summary } = data;
  const soldProducts = data.products.filter((p) => p.revenue > 0);

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Total Produk"
          value={summary.totalProducts}
          icon={<Package className="size-4" />}
          accent="teal"
        />
        <StatCard
          label="Star Produk"
          value={summary.starProducts}
          icon={<Star className="size-4" />}
          accent="success"
          trend={{ value: "omzet+margin", up: true }}
        />
        <StatCard
          label="Cash Cow Produk"
          value={summary.cashCowProducts}
          icon={<DollarSign className="size-4" />}
          accent="warning"
          trend={{ value: "omzet tinggi", up: true }}
        />
        <StatCard
          label="Avg Margin"
          value={`${summary.avgMargin}%`}
          icon={<Percent className="size-4" />}
          accent={summary.avgMargin >= 30 ? "success" : "warning"}
          trend={{ value: summary.avgMargin >= 30 ? "sehat" : "tipis", up: summary.avgMargin >= 30 }}
        />
      </div>

      {/* BCG scatter chart */}
      <SectionCard
        title="BCG Matrix"
        desc="Sumbu X = omzet · Y = margin % · ukuran bubble = unit terjual · warna = kuadran"
        right={
          <Button variant="ghost" size="sm" className="text-teal" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} /> Refresh
          </Button>
        }
      >
        <BCGScatterChart products={data.products} />
      </SectionCard>

      {/* Top performer / underperformer row */}
      {(summary.topPerformer || summary.underperformer) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {summary.topPerformer && (
            <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 p-4 flex items-center gap-3">
              <div className="size-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Award className="size-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-stone">Top Performer</div>
                <div className="font-bold text-ink truncate">{summary.topPerformer.name}</div>
                <div className="text-xs text-emerald-700 font-semibold">
                  {formatRupiah(summary.topPerformer.revenue)}
                </div>
              </div>
            </div>
          )}
          {summary.underperformer && (
            <div className="rounded-2xl bg-gradient-to-br from-rose-50 to-orange-50 border border-rose-200 p-4 flex items-center gap-3">
              <div className="size-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                <TrendingDown className="size-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-stone">Perlu Perhatian</div>
                <div className="font-bold text-ink truncate">{summary.underperformer.name}</div>
                <div className="text-xs text-rose-700 font-semibold">
                  {formatRupiah(summary.underperformer.revenue)}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Product performance table */}
      <SectionCard
        title="Tabel Performa Produk"
        desc="Diurutkan berdasarkan omzet · klasifikasi BCG matrix"
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead className="pl-5">Produk</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead className="text-right">Harga</TableHead>
                <TableHead className="text-right">Unit Terjual</TableHead>
                <TableHead className="text-right">Omzet</TableHead>
                <TableHead className="text-right">Profit</TableHead>
                <TableHead className="text-right">Margin</TableHead>
                <TableHead className="text-center">Order</TableHead>
                <TableHead className="text-center">Pelanggan</TableHead>
                <TableHead className="text-center pr-5">BCG</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.products.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="pl-5 font-medium text-ink max-w-[180px] truncate" title={p.name}>
                    {p.name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {p.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-stone">
                    {formatRupiahShort(p.price)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{p.unitsSold}</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold text-ink">
                    {formatRupiahShort(p.revenue)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-emerald-700">
                    {formatRupiahShort(p.profit)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    <span className={p.marginPct >= 30 ? "text-emerald-700 font-semibold" : "text-stone"}>
                      {p.marginPct}%
                    </span>
                  </TableCell>
                  <TableCell className="text-center tabular-nums">{p.orderCount}</TableCell>
                  <TableCell className="text-center tabular-nums">{p.uniqueCustomers}</TableCell>
                  <TableCell className="text-center pr-5">
                    <BCGBadge quadrant={p.performance} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </SectionCard>

      {/* Legend */}
      <div className="rounded-2xl bg-cream-100 border border-border p-4">
        <div className="text-xs font-bold text-ink mb-2">Klasifikasi BCG Matrix</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {(Object.keys(BCG_CONFIG) as BCGQuadrant[]).map((q) => (
            <div key={q} className="flex items-start gap-2">
              <BCGBadge quadrant={q} />
              <span className="text-[11px] text-stone leading-tight">{BCG_CONFIG[q].desc}</span>
            </div>
          ))}
        </div>
        {soldProducts.length === 0 && (
          <div className="text-[11px] text-stone mt-2">
            Belum ada produk yang terjual — semua diklasifikasikan sebagai Dog.
          </div>
        )}
      </div>
    </div>
  );
}

function BCGScatterChart({ products }: { products: ProductPerfRow[] }) {
  // Filter out products with zero revenue (they cluster at x=0 and add noise)
  const sold = products.filter((p) => p.revenue > 0);
  if (sold.length === 0) {
    return <ChartEmpty msg="Belum ada penjualan untuk membuat BCG matrix." />;
  }

  // Bubble colors per BCG quadrant (semantic: emerald/amber/sky/rose)
  const BCG_COLOR: Record<BCGQuadrant, string> = {
    star: "#10B981", // emerald
    cash_cow: "#F59E0B", // amber
    question_mark: "#0EA5E9", // sky
    dog: "#F43F5E", // rose
  };

  // Group by quadrant for legend rendering
  const quadrants: BCGQuadrant[] = ["star", "cash_cow", "question_mark", "dog"];
  const quadrantData = quadrants
    .map((q) => ({
      name: BCG_CONFIG[q].label,
      color: BCG_COLOR[q],
      data: sold
        .filter((p) => p.performance === q)
        .map((p) => ({
          name: p.name,
          x: p.revenue,
          y: p.marginPct,
          z: Math.max(20, p.unitsSold),
          units: p.unitsSold,
          revenue: p.revenue,
          marginPct: p.marginPct,
        })),
    }))
    .filter((g) => g.data.length > 0);

  return (
    <div className="h-80 w-full chart-animate">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 16, right: 24, bottom: 16, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" />
          <XAxis
            type="number"
            dataKey="x"
            name="Omzet"
            tickFormatter={(v) => formatRupiahShort(Number(v))}
            tick={{ fontSize: 11, fill: "#78716C" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="number"
            dataKey="y"
            name="Margin %"
            unit="%"
            tick={{ fontSize: 11, fill: "#78716C" }}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <ZAxis type="number" dataKey="z" range={[40, 360]} name="Unit Terjual" />
          <RTooltip
            cursor={{ strokeDasharray: "3 3" }}
            content={({ active, payload }) => {
              if (!active || !payload || payload.length === 0) return null;
              const d = payload[0].payload as {
                name: string;
                revenue: number;
                marginPct: number;
                units: number;
              };
              return (
                <div className="rounded-lg border border-border bg-card p-2.5 shadow-md text-xs">
                  <div className="font-bold text-ink mb-1">{d.name}</div>
                  <div className="text-stone">Omzet: <b className="text-ink">{formatRupiah(d.revenue)}</b></div>
                  <div className="text-stone">Margin: <b className="text-ink">{d.marginPct}%</b></div>
                  <div className="text-stone">Unit: <b className="text-ink">{d.units}</b></div>
                </div>
              );
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {quadrantData.map((g) => (
            <Scatter
              key={g.name}
              name={g.name}
              data={g.data}
              fill={g.color}
              fillOpacity={0.7}
              stroke={g.color}
            />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
