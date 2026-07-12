"use client";

import { useQuery } from "@tanstack/react-query";
import { useAppStore, getActiveBrand } from "@/lib/store";
import { api } from "@/lib/api";
import { PageHeader, SectionCard, EmptyState } from "@/components/nw/primitives";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRupiahShort, timeAgo } from "@/lib/constants";
import {
  Search,
  Zap,
  Users,
  ShoppingCart,
  FileText,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Target,
} from "lucide-react";

// ─── Goal type ────────────────────────────────────────────────
interface Goal {
  id: string;
  brandId: string;
  type: string;
  period: string;
  target: number;
  current: number;
  startDate: string;
  endDate: string;
  status: string;
  notes: string | null;
  progress: number;
  createdAt: string;
  updatedAt: string;
}

const GOAL_TYPE_META: Record<string, { icon: string; label: string }> = {
  revenue: { icon: "💰", label: "Omzet" },
  orders: { icon: "🛒", label: "Order" },
  products: { icon: "📦", label: "Produk Baru" },
  customers: { icon: "👥", label: "Customer Baru" },
  content: { icon: "📝", label: "Konten" },
  research: { icon: "🔍", label: "Riset" },
};

function formatGoalValue(type: string, v: number): string {
  if (type === "revenue") return formatRupiahShort(v);
  return String(Math.round(v));
}

// ─── Sparkline (decorative trend line) ─────────────────────────
function Sparkline({ color, points }: { color: string; points: number[] }) {
  const w = 72;
  const h = 34;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const step = w / (points.length - 1);
  const d = points
    .map((p, i) => {
      const x = i * step;
      const y = h - ((p - min) / range) * (h - 8) - 4;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" className="shrink-0" aria-hidden>
      <path d={d} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />
    </svg>
  );
}

// ─── Stat tile ─────────────────────────────────────────────────
function StatTile({
  label,
  value,
  caption,
  icon,
  boxClass,
  iconClass,
  sparkColor,
  points,
  onClick,
}: {
  label: string;
  value: React.ReactNode;
  caption: string;
  icon: React.ReactNode;
  boxClass: string;
  iconClass: string;
  sparkColor: string;
  points: number[];
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="text-left w-full rounded-2xl bg-card border border-border p-4 md:p-5 hover:shadow-md hover:border-stone-300 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-teal/40"
    >
      <div className="flex items-center gap-2.5 mb-3">
        <div className={`size-9 md:size-10 rounded-xl flex items-center justify-center shrink-0 ${boxClass} ${iconClass}`}>
          {icon}
        </div>
        <span className="text-sm font-medium text-stone truncate">{label}</span>
      </div>
      <div className="flex items-end justify-between gap-2">
        <div className="min-w-0">
          <div className="text-2xl md:text-3xl font-extrabold text-ink tabular-nums leading-none">{value}</div>
          <div className="text-[11px] text-stone mt-1.5 truncate">{caption}</div>
        </div>
        <Sparkline color={sparkColor} points={points} />
      </div>
    </button>
  );
}

// ─── Daily insight panel ───────────────────────────────────────
function InsightPanel() {
  const { setSection } = useAppStore();
  return (
    <div className="relative h-full rounded-2xl bg-gradient-to-br from-teal-50 to-emerald-100/50 border border-teal/15 p-5 overflow-hidden">
      <div className="absolute -right-6 -bottom-6 size-28 rounded-full bg-teal/10 blur-xl pointer-events-none" />
      <div className="relative">
        <div className="flex items-center gap-2 mb-2">
          <div className="size-8 rounded-lg bg-teal text-white flex items-center justify-center shrink-0">
            <Sparkles className="size-4" />
          </div>
          <span className="font-bold text-ink">Insight Harian</span>
        </div>
        <p className="text-sm text-ink-soft leading-relaxed max-w-sm">
          Waktu terbaik posting konten makanan ringan di TikTok adalah jam{" "}
          <span className="font-semibold text-ink">11.00 – 13.00</span> dan{" "}
          <span className="font-semibold text-ink">18.00 – 20.00</span>.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4 bg-card/70 border-teal/30 text-teal hover:bg-teal-50 gap-1.5"
          onClick={() => setSection("insights")}
        >
          Lihat Insight Lainnya <ArrowRight className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ─── Target widget (goals + daily insight) ─────────────────────
function TargetSection({ brandId }: { brandId: string }) {
  const { setSection } = useAppStore();
  const { data, isLoading } = useQuery<{ goals: Goal[] }>({
    queryKey: ["goals", brandId, "active"],
    queryFn: () => api(`/api/goals?brandId=${brandId}&status=active`),
    enabled: !!brandId,
    staleTime: 30_000,
  });

  const now = new Date();
  const todayGoals = (data?.goals ?? []).filter((g) => {
    const s = new Date(g.startDate);
    const e = new Date(g.endDate);
    return now >= s && now <= e;
  });

  return (
    <SectionCard
      title="🎯 Target Bulan Ini"
      desc="Pantau progres target bisnismu"
      right={
        <Button variant="ghost" size="sm" className="text-teal" onClick={() => setSection("pengaturan")}>
          Atur Target <ArrowRight className="size-3.5" />
        </Button>
      }
      bodyClassName="p-0"
    >
      <div className="grid lg:grid-cols-2">
        {/* Left — goals or empty state */}
        <div className="p-5 flex items-center">
          {isLoading ? (
            <div className="w-full space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : todayGoals.length === 0 ? (
            <div className="w-full flex items-center gap-4">
              <div className="size-16 rounded-2xl bg-cream-200 text-teal flex items-center justify-center shrink-0">
                <Target className="size-8" />
              </div>
              <div>
                <div className="text-sm font-bold text-ink">Belum ada target bulan ini</div>
                <p className="text-xs text-stone mt-1 mb-3 max-w-xs leading-relaxed">
                  Set target omzet, order, atau produk baru untuk motivasi & lacak progres bisnismu.
                </p>
                <Button size="sm" className="bg-teal hover:bg-teal-600" onClick={() => setSection("pengaturan")}>
                  <Target className="size-3.5 mr-1" /> Buat Target
                </Button>
              </div>
            </div>
          ) : (
            <div className="w-full space-y-3">
              {todayGoals.slice(0, 4).map((g) => {
                const meta = GOAL_TYPE_META[g.type] ?? { icon: "🎯", label: g.type };
                const pct = Math.min(100, g.progress ?? 0);
                const isAchieved = g.status === "achieved";
                return (
                  <div key={g.id}>
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center text-base shrink-0">
                        {meta.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm font-semibold text-ink truncate">{meta.label}</div>
                          <div className="text-xs font-bold text-teal tabular-nums">{pct}%</div>
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
                      <div className="h-full bg-teal transition-all duration-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right — daily insight */}
        <div className="p-3 lg:pl-0">
          <InsightPanel />
        </div>
      </div>
    </SectionCard>
  );
}

// ─── Dashboard data ────────────────────────────────────────────
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
  const { user, setSection } = useAppStore();
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

  const greetingName = user?.name ?? activeBrand.name;

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-xl md:text-2xl font-extrabold text-ink">
          Halo, {greetingName} <span className="inline-block">👋</span>
        </h1>
        <p className="text-sm text-stone mt-0.5">Semangat! Kelola bisnismu hari ini</p>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatTile
          label="Leads Aktif"
          value={isLoading ? "…" : data?.stats.leads ?? 0}
          caption="Calon pembeli aktif"
          icon={<Users className="size-4 md:size-5" />}
          boxClass="bg-emerald-50"
          iconClass="text-emerald-600"
          sparkColor="#10b981"
          points={[3, 4, 3.5, 5, 4.5, 6, 5.5, 7]}
          onClick={() => setSection("toko")}
        />
        <StatTile
          label="Orders Pending"
          value={isLoading ? "…" : data?.stats.orders ?? 0}
          caption="Menunggu diproses"
          icon={<ShoppingCart className="size-4 md:size-5" />}
          boxClass="bg-orange-50"
          iconClass="text-orange-600"
          sparkColor="#f97316"
          points={[4, 3, 5, 4, 6, 5, 6.5, 6]}
          onClick={() => setSection("toko")}
        />
        <StatTile
          label="Konten Dibuat"
          value={isLoading ? "…" : data?.stats.content ?? 0}
          caption="Total konten dibuat"
          icon={<FileText className="size-4 md:size-5" />}
          boxClass="bg-violet-50"
          iconClass="text-violet-600"
          sparkColor="#8b5cf6"
          points={[2, 3, 2.5, 4, 3.5, 4.5, 5, 6]}
          onClick={() => setSection("konten")}
        />
        <StatTile
          label="Credit Tersisa"
          value={user?.creditBalance ?? 0}
          caption="Sisa credit"
          icon={<Zap className="size-4 md:size-5 fill-current" />}
          boxClass="bg-amber-50"
          iconClass="text-amber-600"
          sparkColor="#f59e0b"
          points={[5, 4.5, 5.5, 5, 6, 5.5, 6.5, 6]}
          onClick={() => setSection("credit")}
        />
      </div>

      {/* 2-column: Recent research + Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent research */}
        <SectionCard
          title="Riset Terbaru"
          desc="Cari tahu peluang terbaik untuk bisnismu"
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
                  className="px-5 py-3.5 hover:bg-cream-100/50 transition-colors cursor-pointer flex items-center gap-3"
                  onClick={() => setSection("riset")}
                >
                  <div className="size-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                    <Search className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-ink truncate">{r.query}</div>
                    <div className="text-xs text-stone mt-0.5 flex items-center gap-2">
                      <span>{timeAgo(r.createdAt)}</span>
                      {r.intent && (
                        <Badge variant="outline" className="text-[10px] py-0 h-4 border-teal/30 text-teal">
                          {r.intent.replace(/_/g, " ")}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="size-4 text-stone shrink-0" />
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
          desc="Langkah yang bisa kamu ambil sekarang"
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
              {data.recommendations.map((rec, idx) => {
                const s = SOURCE_STYLE[rec.source];
                const primary = idx === 0 && !rec.used;
                return (
                  <div key={rec.id} className="px-5 py-3.5 hover:bg-cream-100/50 transition-colors flex items-start gap-3">
                    <div className={`size-9 rounded-xl flex items-center justify-center shrink-0 text-base ${s.color}`}>
                      {s.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-ink leading-snug">{rec.title}</div>
                      <div className="text-[11px] text-stone mt-0.5 capitalize">
                        Dari {rec.source} {rec.used && "· sudah dipakai"}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={primary ? "default" : "outline"}
                      className={
                        primary
                          ? "h-7 text-xs bg-teal hover:bg-teal-600 shrink-0"
                          : "h-7 text-xs border-teal/40 text-teal hover:bg-teal-50 shrink-0"
                      }
                      onClick={() => {
                        if (rec.source === "konten") setSection("konten");
                        else if (rec.source === "toko" || rec.source === "leads" || rec.source === "stok") setSection("toko");
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

      {/* Target + daily insight */}
      <TargetSection brandId={activeBrand.id} />
    </div>
  );
}
