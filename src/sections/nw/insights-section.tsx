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
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  Brain,
  CheckCircle2,
  DollarSign,
  Lightbulb,
  Minus,
  Package,
  Percent,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
  Zap,
  FileText,
  Search,
  Wallet,
} from "lucide-react";
import { useAppStore, getActiveBrand } from "@/lib/store";
import { api } from "@/lib/api";
import { PageHeader, StatCard, SectionCard, EmptyState } from "@/components/nw/primitives";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
        ) : (
          <CTACard
            creditBalance={user?.creditBalance ?? 0}
            onGenerate={() => summaryMutation.mutate()}
            disabled={summaryMutation.isPending}
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
        <>
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
        </>
      )}
    </div>
  );
}

// ─── AI Summary CTA Card ─────────────────────────────────────
function CTACard({
  creditBalance,
  onGenerate,
  disabled,
}: {
  creditBalance: number;
  onGenerate: () => void;
  disabled: boolean;
}) {
  const canAfford = creditBalance >= 3;
  return (
    <div className="rounded-2xl bg-gradient-to-br from-teal-100 via-cream-100 to-orange-100/40 border border-teal/20 p-6 md:p-8">
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
