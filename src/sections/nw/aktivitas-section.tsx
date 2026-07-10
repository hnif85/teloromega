"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ClipboardList,
  Filter,
  RefreshCw,
  ChevronRight,
  ShoppingBag,
  CreditCard,
  Users,
  FileText,
  Search,
  DollarSign,
  Megaphone,
  Target,
  Calendar,
  type LucideIcon,
} from "lucide-react";
import { useAppStore, getActiveBrand } from "@/lib/store";
import { api } from "@/lib/api";
import { PageHeader, StatCard, EmptyState } from "@/components/nw/primitives";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatRupiahShort, timeAgo, type SectionKey } from "@/lib/constants";

// ─── Types (mirror /api/activity response) ────────────────────
type ActivityType =
  | "order"
  | "payment"
  | "lead"
  | "content"
  | "research"
  | "transaction"
  | "campaign"
  | "goal";

interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  amount?: number;
  status?: string;
  timestamp: string;
  referenceId: string;
  icon: string;
}

interface ActivityResponse {
  activities: ActivityItem[];
  total: number;
}

// ─── Type → style / navigation metadata ───────────────────────
interface TypeMeta {
  circle: string; // bg + text color for the icon circle
  icon: LucideIcon;
  section: SectionKey;
  label: string;
  glow: string; // ring glow on hover
}

const TYPE_STYLE: Record<ActivityType, TypeMeta> = {
  order: {
    circle: "bg-teal-100 text-teal-700",
    icon: ShoppingBag,
    section: "toko",
    label: "Order",
    glow: "group-hover:ring-teal-200",
  },
  payment: {
    circle: "bg-emerald-100 text-emerald-700",
    icon: CreditCard,
    section: "toko",
    label: "Pembayaran",
    glow: "group-hover:ring-emerald-200",
  },
  lead: {
    circle: "bg-sky-100 text-sky-700",
    icon: Users,
    section: "toko",
    label: "Lead",
    glow: "group-hover:ring-sky-200",
  },
  content: {
    circle: "bg-orange-100 text-orange-700",
    icon: FileText,
    section: "konten",
    label: "Konten",
    glow: "group-hover:ring-orange-200",
  },
  research: {
    circle: "bg-violet-100 text-violet-700",
    icon: Search,
    section: "riset",
    label: "Riset",
    glow: "group-hover:ring-violet-200",
  },
  transaction: {
    circle: "bg-amber-100 text-amber-700",
    icon: DollarSign,
    section: "keuangan",
    label: "Transaksi",
    glow: "group-hover:ring-amber-200",
  },
  campaign: {
    circle: "bg-rose-100 text-rose-700",
    icon: Megaphone,
    section: "toko",
    label: "Campaign",
    glow: "group-hover:ring-rose-200",
  },
  goal: {
    circle: "bg-teal-100 text-teal-700",
    icon: Target,
    section: "pengaturan",
    label: "Target",
    glow: "group-hover:ring-teal-200",
  },
};

// Status → badge color (covers order, payment, lead, research, campaign, goal)
const STATUS_BADGE: Record<string, string> = {
  // Order
  Baru: "bg-amber-100 text-amber-700 border-amber-200",
  Diproses: "bg-sky-100 text-sky-700 border-sky-200",
  Dikirim: "bg-violet-100 text-violet-700 border-violet-200",
  Selesai: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Dibatalkan: "bg-rose-100 text-rose-700 border-rose-200",
  // Payment
  Menunggu: "bg-amber-100 text-amber-700 border-amber-200",
  Diterima: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Ditolak: "bg-rose-100 text-rose-700 border-rose-200",
  // Lead stage (Baru/Deal/Closed shared with order where overlapping)
  Negosiasi: "bg-sky-100 text-sky-700 border-sky-200",
  Deal: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Closed: "bg-stone-100 text-stone-600 border-stone-200",
  // Research
  completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  failed: "bg-rose-100 text-rose-700 border-rose-200",
  // Campaign
  draft: "bg-stone-100 text-stone-600 border-stone-200",
  scheduled: "bg-sky-100 text-sky-700 border-sky-200",
  sent: "bg-emerald-100 text-emerald-700 border-emerald-200",
  // Goal
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  achieved: "bg-teal-100 text-teal-700 border-teal-200",
  paused: "bg-amber-100 text-amber-700 border-amber-200",
};

function statusBadgeClass(status?: string): string {
  if (!status) return "bg-stone-100 text-stone-600 border-stone-200";
  return STATUS_BADGE[status] ?? "bg-stone-100 text-stone-600 border-stone-200";
}

// Amount color: income=emerald, expense=rose, neutral=ink
function amountColor(item: ActivityItem): string {
  if (item.type === "transaction") {
    // title contains "Pemasukan" or "Pengeluaran"
    return /Pemasukan/i.test(item.title) ? "text-emerald-600" : "text-rose-600";
  }
  if (item.type === "payment") {
    if (item.status === "Diterima") return "text-emerald-600";
    if (item.status === "Ditolak") return "text-rose-600";
    return "text-ink";
  }
  if (item.type === "order") {
    if (item.status === "Dibatalkan") return "text-stone-400 line-through";
    return "text-emerald-600";
  }
  return "text-ink";
}

// ─── Date grouping ────────────────────────────────────────────
function dateLabel(ts: string): string {
  const d = new Date(ts);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const twoDaysAgo = new Date(today);
  twoDaysAgo.setDate(today.getDate() - 2);
  const itemDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (itemDay.getTime() === today.getTime()) return "Hari Ini";
  if (itemDay.getTime() === yesterday.getTime()) return "Kemarin";
  if (itemDay.getTime() === twoDaysAgo.getTime()) return "2 Hari Lalu";
  return d.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

interface DateGroup {
  label: string;
  items: ActivityItem[];
}

function groupByDate(items: ActivityItem[]): DateGroup[] {
  const groups: DateGroup[] = [];
  for (const item of items) {
    const label = dateLabel(item.timestamp);
    let g = groups.find((x) => x.label === label);
    if (!g) {
      g = { label, items: [] };
      groups.push(g);
    }
    g.items.push(item);
  }
  return groups;
}

// ─── Filter options ───────────────────────────────────────────
const FILTER_OPTIONS: { value: "all" | ActivityType; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "order", label: "Order" },
  { value: "payment", label: "Pembayaran" },
  { value: "lead", label: "Lead" },
  { value: "content", label: "Konten" },
  { value: "research", label: "Riset" },
  { value: "transaction", label: "Transaksi" },
  { value: "campaign", label: "Campaign" },
  { value: "goal", label: "Target" },
];

// ─── Main section ─────────────────────────────────────────────
export function AktivitasSection() {
  const setSection = useAppStore((s) => s.setSection);
  const activeBrand = getActiveBrand(useAppStore.getState());
  const [filter, setFilter] = useState<"all" | ActivityType>("all");
  const [visibleLimit, setVisibleLimit] = useState(50);

  const queryKey = ["activity", activeBrand?.id, filter, visibleLimit];
  const { data, isLoading, isError, refetch, isFetching } = useQuery<ActivityResponse>({
    queryKey,
    queryFn: () => {
      const params = new URLSearchParams({
        brandId: activeBrand!.id,
        limit: String(visibleLimit),
      });
      if (filter !== "all") params.set("type", filter);
      return api<ActivityResponse>(`/api/activity?${params.toString()}`);
    },
    enabled: !!activeBrand?.id,
    staleTime: 30_000,
  });

  const activities = data?.activities ?? [];
  const total = data?.total ?? 0;

  // Period stats — computed from fetched activities (capped at visibleLimit).
  const stats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    // Monday as start of week (Indonesian convention)
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    let hariIni = 0;
    let mingguIni = 0;
    let bulanIni = 0;
    for (const a of activities) {
      const d = new Date(a.timestamp);
      if (d >= today) hariIni++;
      if (d >= startOfWeek) mingguIni++;
      if (d >= startOfMonth) bulanIni++;
    }
    return { totalAll: total, hariIni, mingguIni, bulanIni };
  }, [activities, total]);

  function handleRefresh() {
    refetch();
    toast.success("Aktivitas dimuat ulang");
  }

  function handleFilterChange(v: string) {
    setFilter(v as "all" | ActivityType);
    setVisibleLimit(50); // reset pagination on filter change
  }

  function handleLoadMore() {
    setVisibleLimit((v) => Math.min(v + 50, 200));
  }

  const hasMore = total > activities.length;

  // ─── Render ─────────────────────────────────────────────────
  return (
    <div className="fade-in space-y-6 pb-4">
      <PageHeader
        icon={<ClipboardList className="size-5" />}
        title="Aktivitas"
        subtitle="Riwayat semua aktivitas brand kamu"
        actions={
          <>
            <Select value={filter} onValueChange={handleFilterChange}>
              <SelectTrigger className="w-[160px] h-9 gap-2">
                <Filter className="size-3.5 text-stone" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FILTER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleRefresh}
              disabled={isFetching}
            >
              <RefreshCw className={cn("size-3.5", isFetching && "animate-spin")} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </>
        }
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Total Aktivitas"
          value={stats.totalAll}
          icon={<ClipboardList className="size-4" />}
          accent="teal"
        />
        <StatCard
          label="Hari Ini"
          value={stats.hariIni}
          icon={<RefreshCw className="size-4" />}
          accent="success"
        />
        <StatCard
          label="Minggu Ini"
          value={stats.mingguIni}
          icon={<Calendar className="size-4" />}
          accent="orange"
        />
        <StatCard
          label="Bulan Ini"
          value={stats.bulanIni}
          icon={<ClipboardList className="size-4" />}
          accent="stone"
        />
      </div>

      <Separator className="bg-border/60" />

      {/* Timeline / states */}
      {isLoading ? (
        <TimelineSkeleton />
      ) : isError ? (
        <EmptyState
          icon="⚠️"
          title="Gagal memuat aktivitas"
          desc="Terjadi kesalahan saat memuat riwayat aktivitas. Coba refresh lagi."
          action={
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Coba Lagi
            </Button>
          }
        />
      ) : activities.length === 0 ? (
        <EmptyState
          icon="📋"
          title="Belum ada aktivitas"
          desc="Mulai tambah produk, bikin order, atau jalankan riset untuk melihat aktivitas di sini."
        />
      ) : (
        <Timeline
          activities={activities}
          onNavigate={(t) => setSection(TYPE_STYLE[t].section)}
          hasMore={hasMore}
          onLoadMore={handleLoadMore}
          loadingMore={isFetching && !isLoading}
        />
      )}
    </div>
  );
}

// ─── Timeline ─────────────────────────────────────────────────
function Timeline({
  activities,
  onNavigate,
  hasMore,
  onLoadMore,
  loadingMore,
}: {
  activities: ActivityItem[];
  onNavigate: (t: ActivityType) => void;
  hasMore: boolean;
  onLoadMore: () => void;
  loadingMore: boolean;
}) {
  const groups = groupByDate(activities);
  return (
    <Card className="rounded-2xl p-4 sm:p-6 py-4 gap-0 shadow-sm">
      <div className="relative">
        {/* Vertical teal gradient line */}
        <div
          className="absolute left-[19px] sm:left-[23px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-teal-300 via-teal-100 to-transparent"
          aria-hidden
        />
        <ScrollArea className="max-h-[70vh]">
          <div className="space-y-6 pr-2">
            {groups.map((g) => (
              <div key={g.label} className="relative">
                {/* Date label */}
                <div className="flex items-center gap-2 mb-3 ml-12 sm:ml-14">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone bg-cream-100 px-2 py-1 rounded-md">
                    {g.label}
                  </span>
                  <span className="text-[11px] text-stone/70">
                    {g.items.length} aktivitas
                  </span>
                </div>
                <div className="space-y-1">
                  {g.items.map((item) => (
                    <TimelineItem
                      key={item.id}
                      item={item}
                      onNavigate={onNavigate}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
      {hasMore && (
        <div className="mt-6 flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={onLoadMore}
            disabled={loadingMore}
            className="gap-1.5"
          >
            {loadingMore ? (
              <>
                <RefreshCw className="size-3.5 animate-spin" />
                Memuat...
              </>
            ) : (
              <>
                Muat Lebih Banyak
                <ChevronRight className="size-3.5" />
              </>
            )}
          </Button>
        </div>
      )}
    </Card>
  );
}

function TimelineItem({
  item,
  onNavigate,
}: {
  item: ActivityItem;
  onNavigate: (t: ActivityType) => void;
}) {
  const meta = TYPE_STYLE[item.type];
  const Icon = meta.icon;
  return (
    <button
      type="button"
      onClick={() => onNavigate(item.type)}
      className="group w-full text-left flex items-start gap-3 sm:gap-4 p-2.5 rounded-xl hover:bg-cream-100/70 transition-colors relative focus:outline-none focus-visible:ring-2 focus-visible:ring-teal/40"
      aria-label={`${item.title} — buka ${meta.label}`}
    >
      {/* Icon circle — sits on the timeline line */}
      <div
        className={cn(
          "size-10 sm:size-12 rounded-full flex items-center justify-center shrink-0 ring-4 ring-card transition-shadow relative z-10",
          meta.circle,
          meta.glow
        )}
      >
        {/* Show the emoji from the API for visual distinctiveness */}
        <span className="text-base sm:text-lg leading-none">{item.icon}</span>
      </div>
      {/* Content */}
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-ink leading-snug">
              {item.title}
            </div>
            <div className="text-xs text-stone mt-0.5 leading-relaxed line-clamp-2">
              {item.description}
            </div>
          </div>
          {item.amount != null && (
            <div
              className={cn(
                "text-sm font-bold tabular-nums shrink-0 whitespace-nowrap",
                amountColor(item)
              )}
            >
              {formatRupiahShort(item.amount)}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {item.status && (
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] py-0 h-5 px-1.5 font-medium capitalize",
                statusBadgeClass(item.status)
              )}
            >
              {item.status}
            </Badge>
          )}
          <span className="text-[11px] text-stone/80">
            {timeAgo(item.timestamp)}
          </span>
          <span className="ml-auto flex items-center gap-0.5 text-[11px] text-teal/70 opacity-0 group-hover:opacity-100 transition-opacity">
            <Icon className="size-3" />
            <span className="hidden sm:inline">{meta.label}</span>
            <ChevronRight className="size-3" />
          </span>
        </div>
      </div>
    </button>
  );
}

// ─── Skeleton loading state ───────────────────────────────────
function TimelineSkeleton() {
  return (
    <Card className="rounded-2xl p-4 sm:p-6 py-4 gap-0 shadow-sm">
      <div className="relative">
        <div
          className="absolute left-[19px] sm:left-[23px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-teal-200 via-teal-100 to-transparent"
          aria-hidden
        />
        <div className="space-y-4 pr-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 sm:gap-4 p-2.5">
              <Skeleton className="size-10 sm:size-12 rounded-full skeleton-pulse shrink-0 ring-4 ring-card" />
              <div className="flex-1 space-y-2 pt-1">
                <Skeleton className="h-3.5 w-2/3 rounded skeleton-pulse" />
                <Skeleton className="h-3 w-full rounded skeleton-pulse" />
                <Skeleton className="h-3 w-1/3 rounded skeleton-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
