"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  AlertCircle,
  ArrowRight,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Megaphone,
  Package,
  Receipt,
  RefreshCw,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { api } from "@/lib/api";
import { useAppStore, getActiveBrand } from "@/lib/store";
import {
  formatRupiah,
  formatRupiahShort,
  type SectionKey,
} from "@/lib/constants";
import {
  EmptyState,
  PageHeader,
  SectionCard,
  StatCard,
} from "@/components/nw/primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// ─── Types (mirror /api/kalender response) ────────────────────────────────────
type EventType = "order" | "payment" | "campaign" | "receivable" | "payable";

interface KalenderEvent {
  id: string;
  date: string;
  type: EventType;
  title: string;
  description: string;
  amount?: number;
  status: string;
  referenceId: string;
}

interface KalenderStats {
  totalOrders: number;
  totalPayments: number;
  totalCampaigns: number;
  totalReceivables: number;
  totalPayables: number;
  totalRevenue: number;
  totalDue: number;
}

interface KalenderResponse {
  events: KalenderEvent[];
  stats: KalenderStats;
  month: number;
  year: number;
  monthLabel: string;
}

// ─── Visual config ───────────────────────────────────────────────────────────
const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

interface TypeStyle {
  label: string;
  chip: string; // tailwind classes for chip in calendar cell
  dot: string; // dot color for upcoming list
  icon: React.ComponentType<{ className?: string }>;
  section: SectionKey;
}

const TYPE_STYLE: Record<EventType, TypeStyle> = {
  order: {
    label: "Order",
    chip: "bg-teal-100 text-teal-700 border border-teal-200",
    dot: "bg-teal",
    icon: Package,
    section: "toko",
  },
  payment: {
    label: "Pembayaran",
    chip: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    dot: "bg-emerald-500",
    icon: CreditCard,
    section: "toko",
  },
  campaign: {
    label: "Campaign",
    chip: "bg-violet-100 text-violet-700 border border-violet-200",
    dot: "bg-violet-500",
    icon: Megaphone,
    section: "toko",
  },
  receivable: {
    label: "Piutang",
    chip: "bg-orange-100 text-orange-700 border border-orange-200",
    dot: "bg-orange-500",
    icon: Receipt,
    section: "keuangan",
  },
  payable: {
    label: "Hutang",
    chip: "bg-rose-100 text-rose-700 border border-rose-200",
    dot: "bg-rose-500",
    icon: Wallet,
    section: "keuangan",
  },
};

function chipStyleFor(ev: KalenderEvent): string {
  if (ev.type === "payment") {
    if (ev.status === "Menunggu") {
      return "bg-amber-100 text-amber-700 border border-amber-200";
    }
    if (ev.status === "Ditolak") {
      return "bg-rose-100 text-rose-700 border border-rose-200";
    }
    return TYPE_STYLE.payment.chip;
  }
  return TYPE_STYLE[ev.type].chip;
}

// ─── Main component ──────────────────────────────────────────────────────────
export function KalenderSection() {
  const setSection = useAppStore((s) => s.setSection);
  const activeBrand = getActiveBrand(useAppStore.getState());

  const today = new Date();
  const [cursor, setCursor] = useState<Date>(new Date(today.getFullYear(), today.getMonth(), 1));
  // selectedDate: when set, opens the Day Detail Dialog
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const month = cursor.getMonth() + 1;
  const year = cursor.getFullYear();

  const { data, isLoading, isFetching, isError, refetch } = useQuery<KalenderResponse>({
    queryKey: ["kalender", activeBrand?.id, month, year],
    queryFn: () =>
      api<KalenderResponse>(
        `/api/kalender?brandId=${activeBrand?.id}&month=${month}&year=${year}`
      ),
    enabled: !!activeBrand?.id,
    staleTime: 30_000,
  });

  const events = data?.events ?? [];
  const stats = data?.stats;

  // Group events by yyyy-MM-dd for fast cell lookup
  const eventsByDay = useMemo(() => {
    const map = new Map<string, KalenderEvent[]>();
    for (const ev of events) {
      const key = format(parseISO(ev.date), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }
    return map;
  }, [events]);

  // Build the 6-week calendar grid (start Monday of week containing day 1 → Sunday of week containing last day)
  const gridDays = useMemo(() => {
    const monthStart = startOfMonth(cursor);
    const monthEnd = endOfMonth(cursor);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [cursor]);

  // Upcoming events (next 7 days from today)
  const upcoming = useMemo(() => {
    const startLimit = startOfDay(today);
    const endLimit = startOfDay(addDays(today, 7));
    return events
      .filter((ev) => {
        const d = parseISO(ev.date);
        return d >= startLimit && d <= endLimit;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [events, today]);

  // Navigation handlers
  const goPrev = () => setCursor((c) => subMonths(c, 1));
  const goNext = () => setCursor((c) => addMonths(c, 1));
  const goToday = () => {
    setCursor(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  const navigateToEvent = (ev: KalenderEvent) => {
    setSection(TYPE_STYLE[ev.type].section);
  };

  // ─── Loading state ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div>
        <PageHeader
          title="Kalender"
          subtitle="Pantau order, pembayaran, campaign, & jatuh tempo dalam satu tampilan"
          icon="📅"
        />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-[480px] rounded-2xl lg:col-span-2" />
          <Skeleton className="h-[480px] rounded-2xl" />
        </div>
      </div>
    );
  }

  // ─── No brand guard ───────────────────────────────────────────────────────
  if (!activeBrand) {
    return (
      <div>
        <PageHeader title="Kalender" icon="📅" />
        <EmptyState
          icon="🏪"
          title="Belum ada brand"
          desc="Buat brand pertama kamu untuk mulai menggunakan Kalender."
        />
      </div>
    );
  }

  // ─── Error state ──────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div>
        <PageHeader title="Kalender" icon="📅" />
        <EmptyState
          icon="⚠️"
          title="Gagal memuat kalender"
          desc="Coba muat ulang halaman ini atau periksa koneksi internet kamu."
          action={
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="size-4" /> Coba lagi
            </Button>
          }
        />
      </div>
    );
  }

  const totalEvents = events.length;
  const isCurrentMonth =
    cursor.getMonth() === today.getMonth() &&
    cursor.getFullYear() === today.getFullYear();

  return (
    <div>
      <PageHeader
        title="Kalender"
        subtitle="Pantau order, pembayaran, campaign, & jatuh tempo dalam satu tampilan"
        icon="📅"
        actions={
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={goPrev}
              aria-label="Bulan sebelumnya"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <div className="min-w-[140px] text-center">
              <div className="text-sm font-bold text-ink capitalize">
                {format(cursor, "MMMM yyyy", { locale: idLocale })}
              </div>
              {!isCurrentMonth && (
                <button
                  type="button"
                  onClick={goToday}
                  className="text-[10px] text-teal hover:underline"
                >
                  kembali ke bulan ini
                </button>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={goNext}
              aria-label="Bulan berikutnya"
            >
              <ChevronRight className="size-4" />
            </Button>
            <Button
              size="sm"
              className="gap-1.5 bg-teal hover:bg-teal-600 ml-1"
              onClick={goToday}
            >
              <CalendarIcon className="size-3.5" />
              Hari Ini
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="size-8 p-0"
                  onClick={() => refetch()}
                  disabled={isFetching}
                  aria-label="Muat ulang"
                >
                  <RefreshCw className={cn("size-4", isFetching && "animate-spin")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Muat ulang</TooltipContent>
            </Tooltip>
          </div>
        }
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <StatCard
          label="Total Event"
          value={totalEvents}
          icon={<CalendarIcon className="size-4" />}
          accent="teal"
        />
        <StatCard
          label="Order"
          value={stats?.totalOrders ?? 0}
          icon={<Package className="size-4" />}
          accent="teal"
        />
        <StatCard
          label="Pembayaran"
          value={stats?.totalPayments ?? 0}
          icon={<CreditCard className="size-4" />}
          accent="success"
        />
        <StatCard
          label="Jatuh Tempo"
          value={(stats?.totalReceivables ?? 0) + (stats?.totalPayables ?? 0)}
          icon={<Clock className="size-4" />}
          accent="warning"
        />
        <StatCard
          label="Pendapatan Bulan Ini"
          value={formatRupiahShort(stats?.totalRevenue ?? 0)}
          icon={<TrendingUp className="size-4" />}
          accent="success"
        />
      </div>

      {/* Main layout: calendar grid + upcoming sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calendar grid + mobile list */}
        <div className="lg:col-span-2 space-y-4">
          {/* Desktop/tablet calendar grid (sm and up) */}
          <SectionCard
            title={format(cursor, "MMMM yyyy", { locale: idLocale })}
            desc="Klik tanggal untuk lihat detail · klik event untuk pindah ke modul terkait"
            right={
              <Badge variant="outline" className="text-[10px]">
                {totalEvents} event
              </Badge>
            }
            className="hidden sm:block"
            bodyClassName="p-3"
          >
            <CalendarGrid
              days={gridDays}
              cursor={cursor}
              eventsByDay={eventsByDay}
              onSelectDate={setSelectedDate}
              onEventClick={navigateToEvent}
            />
            <Legend />
          </SectionCard>

          {/* Mobile list view (below sm) */}
          <SectionCard
            title={format(cursor, "MMMM yyyy", { locale: idLocale })}
            desc="Daftar event bulan ini · urut tanggal"
            className="sm:hidden"
            bodyClassName="p-0"
          >
            <MobileEventList
              events={events}
              onEventClick={navigateToEvent}
              onSelectDate={setSelectedDate}
            />
            <div className="px-4 pb-4 pt-2">
              <Legend />
            </div>
          </SectionCard>
        </div>

        {/* Upcoming events sidebar */}
        <SectionCard
          title="Event Mendatang"
          desc="7 hari ke depan"
          right={
            <Badge variant="outline" className="text-[10px]">
              {upcoming.length}
            </Badge>
          }
          bodyClassName="p-0"
        >
          <UpcomingList
            events={upcoming}
            onEventClick={navigateToEvent}
            isLoading={isLoading}
          />
        </SectionCard>
      </div>

      {/* Empty state for the month (desktop grid view only — mobile list shows its own empty) */}
      {totalEvents === 0 && !isLoading && (
        <div className="mt-4 hidden sm:block">
          <EmptyState
            icon="🗓️"
            title="Tidak ada event bulan ini"
            desc="Coba pindah ke bulan lain atau tambahkan transaksi, order, atau campaign. Event akan otomatis muncul di kalender begitu data tersedia."
            action={
              <div className="flex flex-wrap gap-2 justify-center">
                <Button
                  className="bg-teal hover:bg-teal-600"
                  onClick={() => setSection("toko")}
                >
                  🛒 Buat Order
                </Button>
                <Button variant="outline" onClick={() => setSection("keuangan")}>
                  💰 Catat Piutang/Hutang
                </Button>
                <Button variant="outline" onClick={goPrev}>
                  <ChevronLeft className="size-3.5" /> Bulan Lalu
                </Button>
              </div>
            }
          />
        </div>
      )}

      {/* Day detail dialog */}
      <DayDetailDialog
        date={selectedDate}
        events={selectedDate ? eventsByDay.get(format(selectedDate, "yyyy-MM-dd")) ?? [] : []}
        onOpenChange={(open) => {
          if (!open) setSelectedDate(null);
        }}
        onEventClick={(ev) => {
          setSelectedDate(null);
          navigateToEvent(ev);
        }}
      />
    </div>
  );
}

// ─── Calendar grid (desktop/tablet) ───────────────────────────────────────────
function CalendarGrid({
  days,
  cursor,
  eventsByDay,
  onSelectDate,
  onEventClick,
}: {
  days: Date[];
  cursor: Date;
  eventsByDay: Map<string, KalenderEvent[]>;
  onSelectDate: (d: Date) => void;
  onEventClick: (ev: KalenderEvent) => void;
}) {
  return (
    <div>
      {/* Weekday header */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="text-center text-[11px] font-semibold text-stone uppercase tracking-wide py-1"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayEvents = eventsByDay.get(key) ?? [];
          const inMonth = isSameMonth(day, cursor);
          const today_ = isToday(day);
          const shown = dayEvents.slice(0, 3);
          const extra = dayEvents.length - shown.length;

          return (
            <div
              key={key}
              role="button"
              tabIndex={0}
              onClick={() => onSelectDate(day)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectDate(day);
                }
              }}
              className={cn(
                "group relative min-h-[88px] rounded-lg border p-1.5 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-teal/40",
                today_
                  ? "bg-teal-50 border-teal-300 ring-1 ring-teal-200"
                  : inMonth
                    ? "bg-card border-border hover:border-teal/40 hover:bg-cream-100/60"
                    : "bg-cream-100/40 border-transparent hover:bg-cream-200/60"
              )}
              aria-label={`${format(day, "d MMMM yyyy", { locale: idLocale })}, ${dayEvents.length} event`}
            >
              {/* Date number */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={cn(
                    "text-xs font-semibold tabular-nums",
                    today_
                      ? "size-5 rounded-full bg-teal text-white flex items-center justify-center"
                      : inMonth
                        ? "text-ink"
                        : "text-stone-300"
                  )}
                >
                  {format(day, "d")}
                </span>
                {dayEvents.length > 0 && (
                  <span
                    className={cn(
                      "text-[9px] font-bold rounded-full px-1.5",
                      today_
                        ? "bg-teal-100 text-teal-700"
                        : "bg-cream-200 text-stone"
                    )}
                  >
                    {dayEvents.length}
                  </span>
                )}
              </div>

              {/* Event chips */}
              <div className="space-y-0.5">
                {shown.map((ev) => (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(ev);
                    }}
                    className={cn(
                      "block w-full text-left text-[10px] font-medium px-1.5 py-0.5 rounded truncate transition-transform hover:scale-[1.02]",
                      chipStyleFor(ev)
                    )}
                    title={ev.title}
                  >
                    <span className="truncate">{ev.title}</span>
                  </button>
                ))}
                {extra > 0 && (
                  <div className="text-[10px] font-medium text-stone px-1.5 hover:text-teal cursor-pointer">
                    +{extra} lainnya
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────
function Legend() {
  const items: { type: EventType; note?: string }[] = [
    { type: "order" },
    { type: "payment", note: "Diterima" },
    { type: "payment", note: "Menunggu" },
    { type: "campaign" },
    { type: "receivable" },
    { type: "payable" },
  ];
  return (
    <div className="mt-3 pt-3 border-t border-border flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-stone">
      <span className="font-semibold text-ink">Legenda:</span>
      {items.map((it, idx) => {
        const style =
          it.type === "payment" && it.note === "Menunggu"
            ? "bg-amber-100 text-amber-700 border border-amber-200"
            : it.type === "payment" && it.note === "Ditolak"
              ? "bg-rose-100 text-rose-700 border border-rose-200"
              : TYPE_STYLE[it.type].chip;
        const label =
          it.type === "payment" && it.note
            ? `Bayar ${it.note}`
            : TYPE_STYLE[it.type].label;
        return (
          <div key={`${it.type}-${it.note ?? "default"}-${idx}`} className="flex items-center gap-1.5">
            <span className={cn("inline-block h-2.5 w-2.5 rounded-sm", style)} />
            <span>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Mobile event list ────────────────────────────────────────────────────────
function MobileEventList({
  events,
  onEventClick,
  onSelectDate,
}: {
  events: KalenderEvent[];
  onEventClick: (ev: KalenderEvent) => void;
  onSelectDate: (d: Date) => void;
}) {
  if (events.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="text-3xl mb-2">🗓️</div>
        <div className="text-sm font-semibold text-ink">Tidak ada event bulan ini</div>
        <p className="text-xs text-stone mt-1">
          Coba bulan lain atau tambah transaksi/order/campaign.
        </p>
      </div>
    );
  }

  // Group by yyyy-MM-dd
  const byDay = new Map<string, KalenderEvent[]>();
  for (const ev of events) {
    const key = format(parseISO(ev.date), "yyyy-MM-dd");
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(ev);
  }

  return (
    <ScrollArea className="max-h-[520px]">
      <div className="divide-y divide-border">
        {Array.from(byDay.entries()).map(([key, dayEvents]) => {
          const d = parseISO(key);
          return (
            <div key={key} className="px-4 py-3">
              <button
                type="button"
                onClick={() => onSelectDate(d)}
                className="flex items-center gap-2 mb-2 w-full text-left"
              >
                <div
                  className={cn(
                    "size-9 rounded-lg flex flex-col items-center justify-center shrink-0",
                    isToday(d)
                      ? "bg-teal text-white"
                      : "bg-cream-200 text-ink"
                  )}
                >
                  <span className="text-[10px] uppercase leading-none">
                    {format(d, "EEE", { locale: idLocale })}
                  </span>
                  <span className="text-sm font-bold leading-none">
                    {format(d, "d")}
                  </span>
                </div>
                <div className="text-xs text-stone capitalize">
                  {format(d, "EEEE, d MMMM yyyy", { locale: idLocale })}
                </div>
              </button>
              <div className="space-y-1.5 pl-1">
                {dayEvents.map((ev) => {
                  const Icon = TYPE_STYLE[ev.type].icon;
                  return (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => onEventClick(ev)}
                      className={cn(
                        "w-full text-left text-xs font-medium px-2 py-1.5 rounded-md flex items-center gap-2 hover:scale-[1.01] transition-transform",
                        chipStyleFor(ev)
                      )}
                    >
                      <Icon className="size-3.5 shrink-0" />
                      <span className="truncate">{ev.title}</span>
                      {ev.amount != null && (
                        <span className="ml-auto font-bold tabular-nums">
                          {formatRupiahShort(ev.amount)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}

// ─── Upcoming events sidebar ──────────────────────────────────────────────────
function UpcomingList({
  events,
  onEventClick,
  isLoading,
}: {
  events: KalenderEvent[];
  onEventClick: (ev: KalenderEvent) => void;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="p-4 space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }
  if (events.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="text-3xl mb-2">☕</div>
        <div className="text-sm font-semibold text-ink">Minggu depan kosong</div>
        <p className="text-xs text-stone mt-1">
          Tidak ada event terjadwal dalam 7 hari ke depan.
        </p>
      </div>
    );
  }

  // Group by day
  const byDay = new Map<string, KalenderEvent[]>();
  for (const ev of events) {
    const key = format(parseISO(ev.date), "yyyy-MM-dd");
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(ev);
  }

  return (
    <ScrollArea className="max-h-[640px]">
      <div className="divide-y divide-border">
        {Array.from(byDay.entries()).map(([key, dayEvents]) => {
          const d = parseISO(key);
          const today_ = isToday(d);
          return (
            <div key={key} className="px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <div
                  className={cn(
                    "size-9 rounded-lg flex flex-col items-center justify-center shrink-0",
                    today_ ? "bg-teal text-white" : "bg-cream-200 text-ink"
                  )}
                >
                  <span className="text-[10px] uppercase leading-none">
                    {format(d, "EEE", { locale: idLocale })}
                  </span>
                  <span className="text-sm font-bold leading-none">
                    {format(d, "d")}
                  </span>
                </div>
                <div className="text-xs text-stone capitalize">
                  {today_
                    ? "Hari ini"
                    : format(d, "EEEE, d MMM", { locale: idLocale })}
                </div>
              </div>
              <div className="space-y-1.5 pl-1">
                {dayEvents.map((ev) => {
                  const Icon = TYPE_STYLE[ev.type].icon;
                  return (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => onEventClick(ev)}
                      className={cn(
                        "w-full text-left text-xs font-medium px-2 py-1.5 rounded-md flex items-center gap-2 hover:scale-[1.01] transition-transform",
                        chipStyleFor(ev)
                      )}
                    >
                      <Icon className="size-3.5 shrink-0" />
                      <span className="truncate">{ev.title}</span>
                      {ev.amount != null && (
                        <span className="ml-auto font-bold tabular-nums shrink-0">
                          {formatRupiahShort(ev.amount)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}

// ─── Day detail dialog ────────────────────────────────────────────────────────
function DayDetailDialog({
  date,
  events,
  onOpenChange,
  onEventClick,
}: {
  date: Date | null;
  events: KalenderEvent[];
  onOpenChange: (open: boolean) => void;
  onEventClick: (ev: KalenderEvent) => void;
}) {
  const open = date !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 capitalize">
            <CalendarIcon className="size-5 text-teal" />
            {date
              ? format(date, "EEEE, d MMMM yyyy", { locale: idLocale })
              : ""}
          </DialogTitle>
          <DialogDescription>
            {events.length === 0
              ? "Tidak ada event pada tanggal ini."
              : `${events.length} event pada tanggal ini · klik untuk pindah ke modul terkait`}
          </DialogDescription>
        </DialogHeader>

        {events.length === 0 ? (
          <div className="rounded-lg bg-cream-100/60 border border-dashed border-border p-6 text-center">
            <CalendarIcon className="size-6 text-stone mx-auto mb-2" />
            <p className="text-sm text-stone">
              Hari ini kosong. Coba pilih tanggal lain.
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh] -mx-1">
            <div className="space-y-2 px-1">
              {events.map((ev) => {
                const Icon = TYPE_STYLE[ev.type].icon;
                const isOverdue =
                  (ev.type === "receivable" || ev.type === "payable") &&
                  ev.status === "overdue";
                return (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => onEventClick(ev)}
                    className={cn(
                      "w-full text-left p-3 rounded-lg border transition-all hover:scale-[1.01] hover:shadow-sm flex items-start gap-3",
                      chipStyleFor(ev)
                    )}
                  >
                    <Icon className="size-4 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold truncate">{ev.title}</div>
                      <div className="text-[11px] opacity-80 mt-0.5">
                        {ev.description}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <Badge
                          variant="outline"
                          className="text-[10px] py-0 h-4 bg-white/60 border-current/30"
                        >
                          {TYPE_STYLE[ev.type].label}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="text-[10px] py-0 h-4 bg-white/60 border-current/30"
                        >
                          {ev.status}
                        </Badge>
                        {isOverdue && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-rose-700">
                            <AlertCircle className="size-3" /> Jatuh tempo
                          </span>
                        )}
                        {ev.amount != null && (
                          <span className="ml-auto text-sm font-extrabold tabular-nums">
                            {formatRupiah(ev.amount)}
                          </span>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="size-4 shrink-0 mt-1 opacity-60" />
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            className="gap-1.5"
            onClick={() => onOpenChange(false)}
          >
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
