"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  CheckCheck,
  Sparkles,
  Trash2,
  Check,
  Circle,
  ArrowRight,
  Package,
  CreditCard,
  Users,
  Search,
  Target,
  ShoppingCart,
  Megaphone,
  Settings,
  Mail,
  Smartphone,
  RefreshCw,
  Inbox,
  type LucideIcon,
} from "lucide-react";
import { useAppStore, getActiveBrand } from "@/lib/store";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { PageHeader, StatCard, EmptyState, SectionCard } from "@/components/nw/primitives";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { timeAgo, type SectionKey } from "@/lib/constants";

// ─────────────────────────────────────────────────────────────────────────────
// Types (mirror /api/notifications response)
// ─────────────────────────────────────────────────────────────────────────────
type NotificationType =
  | "low_stock"
  | "payment_pending"
  | "stale_lead"
  | "research_completed"
  | "goal_achieved"
  | "order_new"
  | "campaign_sent"
  | "system";

type Severity = "info" | "warning" | "success" | "error";

interface Notification {
  id: string;
  userId: string;
  brandId: string | null;
  type: NotificationType;
  title: string;
  message: string;
  severity: Severity;
  read: boolean;
  readAt: string | null;
  actionUrl: string | null;
  actionLabel: string | null;
  metadata: string | null;
  createdAt: string;
}

interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
  total: number;
}

interface GenerateResponse {
  generated: number;
  duplicates: number;
  scanned: {
    lowStock: number;
    pendingPayments: number;
    staleLeads: number;
    recentResearch: number;
    achievedGoals: number;
  };
}

interface NotificationPreferences {
  lowStock: boolean;
  paymentPending: boolean;
  staleLead: boolean;
  researchCompleted: boolean;
  goalAchieved: boolean;
  orderNew: boolean;
  campaignSent: boolean;
  system: boolean;
  emailEnabled: boolean;
  pushEnabled: boolean;
}

const DEFAULT_PREFS: NotificationPreferences = {
  lowStock: true,
  paymentPending: true,
  staleLead: true,
  researchCompleted: true,
  goalAchieved: true,
  orderNew: true,
  campaignSent: true,
  system: true,
  emailEnabled: true,
  pushEnabled: true,
};

const PREFS_LS_KEY = "nw_notif_prefs_v1";

// ─────────────────────────────────────────────────────────────────────────────
// Visual metadata per notification type
// ─────────────────────────────────────────────────────────────────────────────
interface TypeMeta {
  icon: LucideIcon;
  label: string;
  prefKey: keyof NotificationPreferences;
}

const TYPE_META: Record<NotificationType, TypeMeta> = {
  low_stock: { icon: Package, label: "Stok Menipis", prefKey: "lowStock" },
  payment_pending: { icon: CreditCard, label: "Pembayaran", prefKey: "paymentPending" },
  stale_lead: { icon: Users, label: "Lead Stale", prefKey: "staleLead" },
  research_completed: { icon: Search, label: "Riset Selesai", prefKey: "researchCompleted" },
  goal_achieved: { icon: Target, label: "Target Tercapai", prefKey: "goalAchieved" },
  order_new: { icon: ShoppingCart, label: "Order Baru", prefKey: "orderNew" },
  campaign_sent: { icon: Megaphone, label: "Campaign Terkirim", prefKey: "campaignSent" },
  system: { icon: Settings, label: "Sistem", prefKey: "system" },
};

// Severity → icon-circle bg/text color (no indigo/blue per design rules).
const SEVERITY_STYLE: Record<Severity, { circle: string; dot: string; badge: string }> = {
  info: {
    circle: "bg-teal-100 text-teal-700",
    dot: "bg-teal",
    badge: "bg-teal-100 text-teal-700 border-teal-200",
  },
  warning: {
    circle: "bg-amber-100 text-amber-700",
    dot: "bg-amber-500",
    badge: "bg-amber-100 text-amber-700 border-amber-200",
  },
  success: {
    circle: "bg-emerald-100 text-emerald-700",
    dot: "bg-emerald-500",
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  error: {
    circle: "bg-rose-100 text-rose-700",
    dot: "bg-rose-500",
    badge: "bg-rose-100 text-rose-700 border-rose-200",
  },
};

// Map notification actionUrl (e.g. "/toko") → SectionKey for navigation.
const URL_TO_SECTION: Record<string, SectionKey> = {
  "/beranda": "beranda",
  "/insights": "insights",
  "/produk": "produk",
  "/riset": "riset",
  "/konten": "konten",
  "/toko": "toko",
  "/keuangan": "keuangan",
  "/kalender": "kalender",
  "/credit": "credit",
  "/pengaturan": "pengaturan",
  "/bantuan": "bantuan",
  "/aktivitas": "aktivitas",
  "/notifikasi": "notifikasi",
};

function sectionFromActionUrl(url: string | null): SectionKey | null {
  if (!url) return null;
  return URL_TO_SECTION[url] ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Preferences persistence (localStorage with API mirror via cookie)
// ─────────────────────────────────────────────────────────────────────────────
function loadPrefs(): NotificationPreferences {
  if (typeof window === "undefined") return { ...DEFAULT_PREFS };
  try {
    const raw = window.localStorage.getItem(PREFS_LS_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PREFS, ...parsed };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

function savePrefs(prefs: NotificationPreferences) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFS_LS_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore quota errors */
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main section
// ─────────────────────────────────────────────────────────────────────────────
export function NotifikasiSection() {
  const setSection = useAppStore((s) => s.setSection);
  const activeBrand = getActiveBrand(useAppStore.getState());
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<"all" | "unread" | "prefs">("all");
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_PREFS);
  const [prefsHydrated, setPrefsHydrated] = useState(false);

  // Hydrate preferences from localStorage on client mount.
  // One-shot external store sync — not a cascading render.
  useEffect(() => {
    setPrefs(loadPrefs());
    setPrefsHydrated(true);
  }, []);

  // ── Queries ───────────────────────────────────────────────────────────────
  const queryKey = useMemo(
    () => ["notifications", activeBrand?.id, tab] as const,
    [activeBrand?.id, tab]
  );

  const { data, isLoading, isFetching, refetch } = useQuery<NotificationsResponse>({
    queryKey,
    queryFn: () => {
      const params = new URLSearchParams({ limit: "100" });
      if (tab === "unread") params.set("unreadOnly", "true");
      if (activeBrand?.id) params.set("brandId", activeBrand.id);
      return api<NotificationsResponse>(`/api/notifications?${params.toString()}`);
    },
    enabled: !!activeBrand?.id,
    staleTime: 15_000,
  });

  // Fetch unread count for the "Belum Dibaca" tab badge — separate query so
  // it doesn't reset when the tab switches.
  const { data: unreadData } = useQuery<{ unreadCount: number }>({
    queryKey: ["notifications", "unread-count", activeBrand?.id],
    queryFn: () =>
      api<{ unreadCount: number }>(
        `/api/notifications?unreadOnly=true&limit=1${activeBrand?.id ? `&brandId=${activeBrand.id}` : ""}`
      ),
    enabled: !!activeBrand?.id,
    staleTime: 15_000,
  });

  const notifications = data?.notifications ?? [];
  const unreadCount = unreadData?.unreadCount ?? 0;
  const totalCount = data?.total ?? 0;

  // Stats — count today and this week from the fetched list.
  const stats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    let hariIni = 0;
    let mingguIni = 0;
    for (const n of notifications) {
      const d = new Date(n.createdAt);
      if (d >= today) hariIni++;
      if (d >= startOfWeek) mingguIni++;
    }
    return {
      total: totalCount,
      unread: unreadCount,
      hariIni,
      mingguIni,
    };
  }, [notifications, totalCount, unreadCount]);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const markReadMut = useMutation({
    mutationFn: ({ id, read }: { id: string; read: boolean }) =>
      api<{ notification: Notification }>(`/api/notifications/${id}`, {
        method: "PATCH",
        json: { read },
      }),
    onSuccess: () => invalidateAll(),
    onError: (e: Error) =>
      toast({ title: "Gagal", description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) =>
      api(`/api/notifications/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Notifikasi dihapus", description: "Notifikasi berhasil dihapus." });
    },
    onError: (e: Error) =>
      toast({ title: "Gagal", description: e.message, variant: "destructive" }),
  });

  const readAllMut = useMutation({
    mutationFn: () =>
      api<{ updated: number }>(`/api/notifications/read-all${activeBrand?.id ? `?brandId=${activeBrand.id}` : ""}`, {
        method: "POST",
      }),
    onSuccess: (r) => {
      invalidateAll();
      toast({
        title: "Semua ditandai dibaca",
        description: `${r.updated} notifikasi ditandai sudah dibaca.`,
      });
    },
    onError: (e: Error) =>
      toast({ title: "Gagal", description: e.message, variant: "destructive" }),
  });

  const generateMut = useMutation({
    mutationFn: () =>
      api<GenerateResponse>("/api/notifications/generate", {
        method: "POST",
        json: { brandId: activeBrand?.id, preferences: prefs },
      }),
    onSuccess: (r) => {
      invalidateAll();
      const total = r.generated + r.duplicates;
      if (r.generated > 0) {
        toast({
          title: `${r.generated} notifikasi baru dibuat`,
          description: `Scan menemukan ${total} alert${r.duplicates > 0 ? ` (${r.duplicates} duplikat dilewati)` : ""}.`,
        });
      } else if (total === 0) {
        toast({
          title: "Tidak ada alert baru",
          description: "Semua data sudah aman — stok cukup, tidak ada pembayaran tertunda, dst.",
        });
      } else {
        toast({
          title: `${r.duplicates} notifikasi sudah ada`,
          description: "Semua alert sudah ada di daftar notifikasi (belum dibaca).",
        });
      }
    },
    onError: (e: Error) =>
      toast({ title: "Gagal generate", description: e.message, variant: "destructive" }),
  });

  const syncPrefsMut = useMutation({
    mutationFn: (next: NotificationPreferences) =>
      api<{ preferences: NotificationPreferences }>("/api/notification-preferences", {
        method: "PATCH",
        json: next,
      }),
    // Fire-and-forget — client localStorage is the source of truth.
    onError: () => {
      /* non-fatal — prefs still saved locally */
    },
  });

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleToggleRead(n: Notification) {
    markReadMut.mutate({ id: n.id, read: !n.read });
  }

  function handleCardClick(n: Notification) {
    // Mark as read + navigate if actionUrl maps to a section.
    if (!n.read) {
      markReadMut.mutate({ id: n.id, read: true });
    }
    const sec = sectionFromActionUrl(n.actionUrl);
    if (sec) setSection(sec);
  }

  function handleActionClick(e: React.MouseEvent, n: Notification) {
    e.stopPropagation();
    handleCardClick(n);
  }

  function handleTogglePref(key: keyof NotificationPreferences, value: boolean) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    savePrefs(next);
    syncPrefsMut.mutate(next);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fade-in space-y-6 pb-4">
      <PageHeader
        icon={<Bell className="size-5" />}
        title="Notifikasi"
        subtitle="Pusat notifikasi & preferensi"
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => readAllMut.mutate()}
              disabled={readAllMut.isPending || unreadCount === 0}
            >
              <CheckCheck className="size-3.5" />
              <span className="hidden sm:inline">Tandai Semua Dibaca</span>
              <span className="sm:hidden">Tandai Dibaca</span>
            </Button>
            <Button
              size="sm"
              className="gap-1.5 bg-teal hover:bg-teal-600 text-white"
              onClick={() => generateMut.mutate()}
              disabled={generateMut.isPending || !activeBrand?.id}
            >
              {generateMut.isPending ? (
                <RefreshCw className="size-3.5 animate-spin" />
              ) : (
                <Sparkles className="size-3.5" />
              )}
              <span className="hidden sm:inline">Generate Notifikasi</span>
              <span className="sm:hidden">Generate</span>
            </Button>
          </>
        }
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Total Notifikasi"
          value={stats.total}
          icon={<Bell className="size-4" />}
          accent="teal"
        />
        <StatCard
          label="Belum Dibaca"
          value={stats.unread}
          icon={<Circle className="size-4 fill-current" />}
          accent="warning"
        />
        <StatCard
          label="Hari Ini"
          value={stats.hariIni}
          icon={<RefreshCw className="size-4" />}
          accent="orange"
        />
        <StatCard
          label="Minggu Ini"
          value={stats.mingguIni}
          icon={<Inbox className="size-4" />}
          accent="stone"
        />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="bg-cream-200/60 h-auto p-1">
          <TabsTrigger value="all" className="gap-1.5">
            <Inbox className="size-3.5" />
            Semua
          </TabsTrigger>
          <TabsTrigger value="unread" className="gap-1.5 relative">
            <Circle className="size-3.5" />
            Belum Dibaca
            {unreadCount > 0 && (
              <Badge
                variant="outline"
                className="ml-1 h-4 px-1 text-[10px] bg-rose-100 text-rose-700 border-rose-200 tabular-nums"
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="prefs" className="gap-1.5">
            <Settings className="size-3.5" />
            Preferensi
          </TabsTrigger>
        </TabsList>

        {/* ── Semua / Belum Dibaca ──────────────────────────────────────── */}
        <TabsContent value="all" className="mt-4">
          <NotificationList
            notifications={notifications}
            isLoading={isLoading}
            isFetching={isFetching}
            onRefresh={() => refetch()}
            onCardClick={handleCardClick}
            onActionClick={handleActionClick}
            onToggleRead={handleToggleRead}
            onDelete={(id) => deleteMut.mutate(id)}
            emptyTitle="Tidak ada notifikasi"
            emptyDesc="Klik 'Generate Notifikasi' untuk scan data terbaru dan dapatkan alert otomatis tentang stok, pembayaran, leads, dan target."
            pendingMark={markReadMut.isPending}
            pendingDelete={deleteMut.isPending}
          />
        </TabsContent>

        <TabsContent value="unread" className="mt-4">
          <NotificationList
            notifications={notifications}
            isLoading={isLoading}
            isFetching={isFetching}
            onRefresh={() => refetch()}
            onCardClick={handleCardClick}
            onActionClick={handleActionClick}
            onToggleRead={handleToggleRead}
            onDelete={(id) => deleteMut.mutate(id)}
            emptyTitle="Semua sudah dibaca 🎉"
            emptyDesc="Tidak ada notifikasi yang belum dibaca. Generate ulang nanti untuk scan alert baru."
            pendingMark={markReadMut.isPending}
            pendingDelete={deleteMut.isPending}
          />
        </TabsContent>

        {/* ── Preferensi ───────────────────────────────────────────────── */}
        <TabsContent value="prefs" className="mt-4">
          <PreferencesTab
            prefs={prefs}
            hydrated={prefsHydrated}
            onToggle={handleTogglePref}
            isSyncing={syncPrefsMut.isPending}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Notification list — renders skeleton / empty / list states.
// ─────────────────────────────────────────────────────────────────────────────
function NotificationList({
  notifications,
  isLoading,
  isFetching,
  onRefresh,
  onCardClick,
  onActionClick,
  onToggleRead,
  onDelete,
  emptyTitle,
  emptyDesc,
  pendingMark,
  pendingDelete,
}: {
  notifications: Notification[];
  isLoading: boolean;
  isFetching: boolean;
  onRefresh: () => void;
  onCardClick: (n: Notification) => void;
  onActionClick: (e: React.MouseEvent, n: Notification) => void;
  onToggleRead: (n: Notification) => void;
  onDelete: (id: string) => void;
  emptyTitle: string;
  emptyDesc: string;
  pendingMark: boolean;
  pendingDelete: boolean;
}) {
  if (isLoading) return <NotificationListSkeleton />;

  if (notifications.length === 0) {
    return (
      <EmptyState
        icon="🔔"
        title={emptyTitle}
        desc={emptyDesc}
        action={
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={onRefresh}
            disabled={isFetching}
          >
            <RefreshCw className={cn("size-3.5", isFetching && "animate-spin")} />
            Refresh
          </Button>
        }
      />
    );
  }

  return (
    <Card className="rounded-2xl p-0 sm:p-2 gap-0 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 sm:px-4 sm:py-3 border-b border-border">
        <div className="text-xs text-stone">
          Menampilkan <span className="font-semibold text-ink">{notifications.length}</span> notifikasi
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 gap-1 text-xs text-stone hover:text-ink"
          onClick={onRefresh}
          disabled={isFetching}
        >
          <RefreshCw className={cn("size-3", isFetching && "animate-spin")} />
          Refresh
        </Button>
      </div>
      <ScrollArea className="max-h-[68vh]">
        <div className="divide-y divide-border">
          {notifications.map((n) => (
            <NotificationCard
              key={n.id}
              n={n}
              onCardClick={onCardClick}
              onActionClick={onActionClick}
              onToggleRead={onToggleRead}
              onDelete={onDelete}
              pendingMark={pendingMark}
              pendingDelete={pendingDelete}
            />
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Single notification row
// ─────────────────────────────────────────────────────────────────────────────
function NotificationCard({
  n,
  onCardClick,
  onActionClick,
  onToggleRead,
  onDelete,
  pendingMark,
  pendingDelete,
}: {
  n: Notification;
  onCardClick: (n: Notification) => void;
  onActionClick: (e: React.MouseEvent, n: Notification) => void;
  onToggleRead: (n: Notification) => void;
  onDelete: (id: string) => void;
  pendingMark: boolean;
  pendingDelete: boolean;
}) {
  const typeMeta = TYPE_META[n.type] ?? TYPE_META.system;
  const Icon = typeMeta.icon;
  const sev = SEVERITY_STYLE[n.severity] ?? SEVERITY_STYLE.info;
  const actionSection = sectionFromActionUrl(n.actionUrl);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onCardClick(n)}
      onKeyDown={(e) => e.key === "Enter" && onCardClick(n)}
      className={cn(
        "group relative flex items-start gap-3 sm:gap-4 px-3 py-3 sm:px-4 sm:py-3.5 cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal/40",
        n.read ? "hover:bg-cream-100/50" : "bg-teal-50/30 hover:bg-teal-50/60"
      )}
      aria-label={`${n.title} — buka ${actionSection ?? "notifikasi"}`}
    >
      {/* Unread dot — left side */}
      <div className="absolute left-1 top-1/2 -translate-y-1/2 hidden sm:block">
        {!n.read && <span className={cn("size-2 rounded-full", sev.dot)} aria-label="belum dibaca" />}
      </div>

      {/* Icon circle */}
      <div
        className={cn(
          "size-10 sm:size-11 rounded-xl flex items-center justify-center shrink-0",
          sev.circle
        )}
      >
        <Icon className="size-5" />
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={cn(
                  "text-sm leading-snug",
                  n.read ? "font-medium text-ink" : "font-bold text-ink"
                )}
              >
                {n.title}
              </span>
              {!n.read && (
                <span className="sm:hidden">
                  <span className={cn("size-1.5 rounded-full inline-block", sev.dot)} />
                </span>
              )}
            </div>
            <p className="text-xs text-stone mt-1 leading-relaxed line-clamp-2">{n.message}</p>
          </div>
        </div>

        {/* Meta row: type badge + time-ago + actions */}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <Badge
            variant="outline"
            className="text-[10px] py-0 h-5 px-1.5 font-medium border-border text-stone"
          >
            {typeMeta.label}
          </Badge>
          <span className="text-[11px] text-stone/80">{timeAgo(n.createdAt)}</span>
          {!n.read && (
            <Badge
              variant="outline"
              className="text-[10px] py-0 h-5 px-1.5 font-medium bg-teal-50 text-teal-700 border-teal-200"
            >
              Baru
            </Badge>
          )}

          <div className="ml-auto flex items-center gap-1">
            {n.actionUrl && n.actionLabel && actionSection && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 gap-1 text-xs text-teal hover:bg-teal-100 hover:text-teal-700"
                onClick={(e) => onActionClick(e, n)}
              >
                {n.actionLabel}
                <ArrowRight className="size-3" />
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-stone hover:bg-cream-200 hover:text-ink"
              onClick={(e) => {
                e.stopPropagation();
                onToggleRead(n);
              }}
              disabled={pendingMark}
              aria-label={n.read ? "Tandai belum dibaca" : "Tandai sudah dibaca"}
              title={n.read ? "Tandai belum dibaca" : "Tandai sudah dibaca"}
            >
              {n.read ? <Circle className="size-3.5" /> : <Check className="size-3.5" />}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-stone hover:bg-rose-100 hover:text-rose-600"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(n.id);
              }}
              disabled={pendingDelete}
              aria-label="Hapus notifikasi"
              title="Hapus notifikasi"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Preferences tab — toggle switches for each notification type + channels
// ─────────────────────────────────────────────────────────────────────────────
const PREF_ROWS: {
  key: keyof NotificationPreferences;
  type: NotificationType;
  desc: string;
}[] = [
  { key: "lowStock", type: "low_stock", desc: "Stok produk mencapai batas minimum" },
  { key: "paymentPending", type: "payment_pending", desc: "Pembayaran menunggu verifikasi > 2 hari" },
  { key: "staleLead", type: "stale_lead", desc: "Lead belum di-follow-up > 3 hari" },
  { key: "researchCompleted", type: "research_completed", desc: "Riset pasar selesai dan siap dilihat" },
  { key: "goalAchieved", type: "goal_achieved", desc: "Target bulanan/kuartalan tercapai" },
  { key: "orderNew", type: "order_new", desc: "Order baru masuk dari customer" },
  { key: "campaignSent", type: "campaign_sent", desc: "Campaign WA/Email berhasil terkirim" },
  { key: "system", type: "system", desc: "Pengumuman & update sistem Next Whiz" },
];

function PreferencesTab({
  prefs,
  hydrated,
  onToggle,
  isSyncing,
}: {
  prefs: NotificationPreferences;
  hydrated: boolean;
  onToggle: (key: keyof NotificationPreferences, value: boolean) => void;
  isSyncing: boolean;
}) {
  const enabledCount = PREF_ROWS.filter((r) => prefs[r.key]).length;

  return (
    <div className="space-y-4">
      <SectionCard
        title="Jenis Notifikasi"
        desc="Pilih jenis alert yang ingin kamu terima"
        right={
          <Badge variant="outline" className="text-[10px] gap-1">
            <Bell className="size-3" /> {hydrated ? enabledCount : "…"} / {PREF_ROWS.length} aktif
          </Badge>
        }
      >
        {!hydrated ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-10 rounded-xl skeleton-pulse" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-1/3 rounded skeleton-pulse" />
                  <Skeleton className="h-3 w-2/3 rounded skeleton-pulse" />
                </div>
                <Skeleton className="h-5 w-9 rounded-full skeleton-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {PREF_ROWS.map((row, idx) => {
              const meta = TYPE_META[row.type];
              const Icon = meta.icon;
              const enabled = prefs[row.key];
              return (
                <div key={row.key}>
                  {idx > 0 && <Separator className="bg-border/60 my-0.5" />}
                  <div className="flex items-center gap-3 py-2.5 px-1 rounded-lg hover:bg-cream-100/50 transition-colors">
                    <div
                      className={cn(
                        "size-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                        enabled
                          ? "bg-teal-100 text-teal-700"
                          : "bg-stone-100 text-stone-400"
                      )}
                    >
                      <Icon className="size-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-ink">{meta.label}</div>
                      <div className="text-xs text-stone mt-0.5">{row.desc}</div>
                    </div>
                    <Switch
                      checked={enabled}
                      onCheckedChange={(v) => onToggle(row.key, v)}
                      aria-label={`Aktifkan notifikasi ${meta.label}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Channel Pengiriman"
        desc="Pilih bagaimana notifikasi dikirim ke kamu"
      >
        {!hydrated ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-10 rounded-xl skeleton-pulse" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-1/4 rounded skeleton-pulse" />
                  <Skeleton className="h-3 w-1/2 rounded skeleton-pulse" />
                </div>
                <Skeleton className="h-5 w-9 rounded-full skeleton-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            <ChannelRow
              icon={Mail}
              label="Email"
              desc="Terima notifikasi via email (demo: belum terhubung ke SMTP)"
              enabled={prefs.emailEnabled}
              onToggle={(v) => onToggle("emailEnabled", v)}
            />
            <Separator className="bg-border/60 my-0.5" />
            <ChannelRow
              icon={Smartphone}
              label="Push Notification"
              desc="Notifikasi push di browser (demo: belum terhubung ke FCM)"
              enabled={prefs.pushEnabled}
              onToggle={(v) => onToggle("pushEnabled", v)}
            />
          </div>
        )}
      </SectionCard>

      <div className="flex items-center gap-2 text-xs text-stone px-1">
        <span className={cn("size-1.5 rounded-full", isSyncing ? "bg-amber-500 animate-pulse" : "bg-emerald-500")} />
        <span>
          {isSyncing
            ? "Menyinkronkan preferensi ke server…"
            : "Preferensi disimpan di browser (localStorage) dan disinkronkan ke server via cookie."}
        </span>
      </div>
    </div>
  );
}

function ChannelRow({
  icon: Icon,
  label,
  desc,
  enabled,
  onToggle,
}: {
  icon: LucideIcon;
  label: string;
  desc: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5 px-1 rounded-lg hover:bg-cream-100/50 transition-colors">
      <div
        className={cn(
          "size-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
          enabled ? "bg-teal-100 text-teal-700" : "bg-stone-100 text-stone-400"
        )}
      >
        <Icon className="size-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-ink">{label}</div>
        <div className="text-xs text-stone mt-0.5">{desc}</div>
      </div>
      <Switch checked={enabled} onCheckedChange={onToggle} aria-label={`Aktifkan channel ${label}`} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton loading state
// ─────────────────────────────────────────────────────────────────────────────
function NotificationListSkeleton() {
  return (
    <Card className="rounded-2xl p-0 sm:p-2 gap-0 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 sm:px-4 sm:py-3 border-b border-border">
        <Skeleton className="h-3 w-32 rounded skeleton-pulse" />
        <Skeleton className="h-6 w-16 rounded skeleton-pulse" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 sm:gap-4 px-3 py-3 sm:px-4 sm:py-3.5">
            <Skeleton className="size-10 sm:size-11 rounded-xl skeleton-pulse shrink-0" />
            <div className="flex-1 space-y-2 pt-1">
              <Skeleton className="h-3.5 w-2/3 rounded skeleton-pulse" />
              <Skeleton className="h-3 w-full rounded skeleton-pulse" />
              <Skeleton className="h-3 w-1/3 rounded skeleton-pulse" />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
