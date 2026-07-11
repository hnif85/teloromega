"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore, getActiveBrand } from "@/lib/store";
import { type SectionKey, timeAgo } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Bell, Zap, Plus, Command, LogOut, Search, Sparkles, ArrowRight, RefreshCw, ChevronDown, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";
import { openCommandPalette } from "@/components/nw/command-palette";
import { GlobalSearch, openGlobalSearch } from "@/components/nw/global-search";
import { CREDIT_PACKAGES, formatRupiah } from "@/lib/constants";

// Mirrors the Pengaturan hub's top-level menu (see pengaturan-section.tsx),
// minus Credit/Notifikasi (which have their own topbar entry points) — this
// is the trimmed list that appears in the mobile account flyout.
const PROFIL_MENU_ITEMS = [
  { key: "profil", icon: "👤", label: "Profil" },
  { key: "brand", icon: "📦", label: "Brand" },
  { key: "tone", icon: "🎨", label: "Tone Suara" },
  { key: "aktivitas", icon: "📋", label: "Aktivitas" },
  { key: "target", icon: "🎯", label: "Target Bisnis" },
  { key: "bantuan", icon: "❓", label: "Bantuan" },
  { key: "backup", icon: "💾", label: "Backup & Restore" },
];

// Shape returned by /api/dashboard — only the fields the topbar needs.
interface DashboardData {
  lowStock: { id: string; name: string; stock: number | null; minStock: number | null }[];
  pendingPaymentsCount: number;
  recentResearch: { id: string; query: string; createdAt: string }[];
  recommendations: { id: string; source: string; title: string; used: boolean }[];
}

// Shape returned by /api/notifications?unreadOnly=true — only the count is
// used by the topbar badge (the full list lives in the Notifikasi section).
interface NotificationsCountResponse {
  unreadCount: number;
}

// Response from /api/notifications/generate — used for toast messaging.
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

interface NotificationItem {
  id: string;
  icon: string;
  title: string;
  time: string;
  section: SectionKey;
}

export function Topbar() {
  const {
    section,
    setSection,
    user,
    brands,
    activeBrandId,
    setActiveBrand,
    setCredit,
    addBrand,
  } = useAppStore();
  const activeBrand = getActiveBrand(useAppStore.getState());
  // Track dismissed notification IDs for this session — "Tandai semua dibaca"
  // pushes every current notification id into this set so the badge count drops
  // to 0 until the next dashboard refetch surfaces new items.
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { resolvedTheme, setTheme } = useTheme();

  const { data } = useQuery<DashboardData>({
    queryKey: ["dashboard", activeBrand?.id],
    queryFn: () => api<DashboardData>(`/api/dashboard?brandId=${activeBrand?.id}`),
    enabled: !!activeBrand?.id,
    refetchInterval: 60_000,
  });

  // Persistent notifications unread count — drives the bell badge alongside the
  // derived quick-view notifications below. Falls back to derived count when
  // the user hasn't generated any persistent notifications yet.
  const { data: notifCountData } = useQuery<NotificationsCountResponse>({
    queryKey: ["notifications", "unread-count", activeBrand?.id],
    queryFn: () =>
      api<NotificationsCountResponse>(
        `/api/notifications?unreadOnly=true&limit=1${activeBrand?.id ? `&brandId=${activeBrand.id}` : ""}`
      ),
    enabled: !!activeBrand?.id,
    refetchInterval: 60_000,
  });

  // Generate notifications from current dashboard data — surfaces low stock,
  // pending payments, stale leads, recent research, achieved goals.
  const generateMut = useMutation({
    mutationFn: () =>
      api<GenerateResponse>("/api/notifications/generate", {
        method: "POST",
        json: { brandId: activeBrand?.id },
      }),
    onSuccess: (r) => {
      // Refresh the unread count + the Notifikasi section's list.
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      if (r.generated > 0) {
        toast({
          title: `${r.generated} notifikasi baru dibuat`,
          description: `${r.duplicates} duplikat dilewati. Lihat di Notifikasi.`,
        });
      } else if (r.duplicates > 0) {
        toast({
          title: `${r.duplicates} notifikasi sudah ada`,
          description: "Semua alert sudah ada di daftar notifikasi (belum dibaca).",
        });
      } else {
        toast({
          title: "Tidak ada alert baru",
          description: "Stok aman, tidak ada pembayaran tertunda, leads up-to-date.",
        });
      }
    },
    onError: (e: Error) =>
      toast({ title: "Gagal generate", description: e.message, variant: "destructive" }),
  });

  // Derive notifications from dashboard data — no DB notification table, so we
  // build them on the fly from low stock, pending payments, stale leads, and
  // recently-completed research.
  const notifications: NotificationItem[] = [];
  if (data) {
    for (const p of data.lowStock.slice(0, 5)) {
      notifications.push({
        id: `lowstock-${p.id}`,
        icon: "📦",
        title: `Stok ${p.name} menipis (sisa ${p.stock ?? 0} pcs)`,
        time: "baru saja",
        section: "toko",
      });
    }
    if (data.pendingPaymentsCount > 0) {
      notifications.push({
        id: `pending-payments-${data.pendingPaymentsCount}`,
        icon: "💳",
        title: `${data.pendingPaymentsCount} pembayaran menunggu verifikasi`,
        time: "baru saja",
        section: "toko",
      });
    }
    // Stale leads → surfaced via recommendations with source === "leads".
    const staleLeadRec = data.recommendations.find(
      (r) => r.source === "leads" && /3 hari/i.test(r.title)
    );
    if (staleLeadRec) {
      notifications.push({
        id: `stale-leads-${staleLeadRec.id}`,
        icon: "👥",
        title: staleLeadRec.title.replace(/^Follow-up\s*/i, "") + " belum di-follow-up",
        time: "baru saja",
        section: "toko",
      });
    }
    // Most-recent research completed.
    const lastResearch = data.recentResearch[0];
    if (lastResearch) {
      notifications.push({
        id: `research-${lastResearch.id}`,
        icon: "🔍",
        title: `Riset "${lastResearch.query}" selesai`,
        time: timeAgo(lastResearch.createdAt),
        section: "riset",
      });
    }
  }

  const visibleNotifications = notifications.filter((n) => !dismissed.has(n.id));
  // Badge reflects BOTH derived quick-view alerts AND persistent DB notifications.
  // We take the max so the badge never under-reports — if the user has 5 unread
  // in the DB and 3 derived alerts on screen, the badge shows 5 (the larger set).
  const persistentUnread = notifCountData?.unreadCount ?? 0;
  const unread = Math.max(visibleNotifications.length, persistentUnread);

  // Async mark-as-read for the persistent set — called by "Tandai semua dibaca".
  async function dismissAll() {
    setDismissed(new Set(notifications.map((n) => n.id)));
    // Also mark persistent DB notifications as read.
    if (persistentUnread > 0) {
      try {
        const r = await api<{ updated: number }>(
          `/api/notifications/read-all${activeBrand?.id ? `?brandId=${activeBrand.id}` : ""}`,
          { method: "POST" }
        );
        if (r.updated > 0) {
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
        }
      } catch {
        /* non-fatal */
      }
    }
  }

  // Credit dropdown — shows balance + lets the user top up right here, instead
  // of the old behavior where tapping the balance silently bought 120 credit.
  const { data: creditPackages } = useQuery<{ packages: typeof CREDIT_PACKAGES }>({
    queryKey: ["credit-packages"],
    queryFn: () => api<{ packages: typeof CREDIT_PACKAGES }>("/api/credit/packages"),
  });

  async function topup(pkg: (typeof CREDIT_PACKAGES)[number]) {
    try {
      const r = await api<{ balance: number }>("/api/credit/topup", {
        method: "POST",
        json: { packageId: pkg.id, credits: pkg.credits, price: pkg.price },
      });
      setCredit(r.balance);
      toast({ title: "Top-up berhasil", description: `+${pkg.credits} credit ditambahkan` });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal top-up";
      toast({ title: "Gagal top-up", description: msg, variant: "destructive" });
    }
  }

  // Brand quick-create — same flow as the sidebar's brand switcher, mirrored
  // here so mobile (which has no sidebar) can create a brand from one place.
  async function quickCreateBrand() {
    const name = window.prompt("Nama brand baru?");
    if (!name) return;
    try {
      const r = await api<{ brand: any }>("/api/brands", {
        method: "POST",
        json: { name, category: "Lainnya" },
      });
      addBrand({
        id: r.brand.id,
        name: r.brand.name,
        slug: r.brand.slug,
        logoUrl: r.brand.logoUrl,
        description: r.brand.description,
        category: r.brand.category,
        toneOfVoice: r.brand.toneOfVoice,
        isActive: r.brand.isActive,
      });
      toast({ title: "Brand dibuat", description: r.brand.name });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal membuat brand";
      toast({ title: "Gagal", description: msg, variant: "destructive" });
    }
  }

  async function handleLogout() {
    try {
      await api("/api/logout", { method: "POST" });
    } catch {
      /* ignore — clear local state anyway */
    }
    useAppStore.getState().logout();
    toast({ title: "Berhasil logout", description: "Sampai jumpa lagi! 👋" });
  }

  return (
    <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="flex items-center gap-3 px-4 md:px-6 py-3">
        {/* Mobile: one combined identity chip — brand switcher + account
            access folded into a single dropdown, instead of two separate
            circles (avatar + brand pill) sitting side by side doing
            overlapping jobs. Desktop doesn't need this at all: the sidebar
            already has its own brand switcher (top) and account menu
            (bottom), so this whole block is mobile-only. */}
        <div className="md:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-cream-100 transition-colors">
                <div className="size-8 rounded-lg bg-teal text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {activeBrand?.name?.[0]?.toUpperCase() ?? "?"}
                </div>
                <div className="text-left">
                  <div className="text-sm font-bold text-ink leading-none flex items-center gap-1">
                    {activeBrand?.name ?? "Belum ada brand"}
                    <ChevronDown className="size-3.5 text-stone" />
                  </div>
                  <div className="text-[10px] text-stone mt-0.5">{activeBrand?.category ?? "—"}</div>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-60">
              <div className="px-2 py-1.5 text-[10px] uppercase tracking-wider text-stone font-semibold">
                Pilih brand
              </div>
              {brands.map((b) => (
                <DropdownMenuItem
                  key={b.id}
                  onClick={() => setActiveBrand(b.id)}
                  className="cursor-pointer gap-2"
                >
                  <div className="size-6 rounded bg-teal/10 text-teal text-[10px] font-bold flex items-center justify-center">
                    {b.name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{b.name}</div>
                    <div className="text-[10px] text-stone truncate">{b.category}</div>
                  </div>
                  {b.id === activeBrandId && <Check className="size-3.5 text-teal" />}
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem onClick={quickCreateBrand} className="cursor-pointer gap-2 text-teal">
                <Plus className="size-4" />
                Brand baru
              </DropdownMenuItem>
              <DropdownMenuSeparator />

              {/* Account flyout — a submenu so it opens without leaving the
                  page. Starts straight at "Profil" — no repeated "Pengaturan"
                  title or name/email card, since the trigger row right below
                  already shows who's logged in. */}
              <DropdownMenuSub open={accountMenuOpen} onOpenChange={setAccountMenuOpen}>
                <DropdownMenuSubTrigger className="cursor-pointer gap-2.5">
                  <div className="size-6 rounded-full bg-gradient-to-br from-teal to-teal-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                    {user?.name?.[0]?.toUpperCase() ?? "U"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{user?.name ?? "Profil"}</div>
                    <div className="text-[10px] text-stone truncate">Profil & Pengaturan</div>
                  </div>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-56">
                  <div className="flex items-center justify-end px-1 pb-1">
                    <button
                      type="button"
                      onClick={() => setAccountMenuOpen(false)}
                      aria-label="Tutup"
                      className="text-stone hover:text-ink transition-colors p-0.5"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                  {PROFIL_MENU_ITEMS.map((item) => (
                    <DropdownMenuItem
                      key={item.key}
                      onClick={() => setSection("pengaturan")}
                      className="cursor-pointer gap-2.5"
                    >
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  {/* Theme toggle inline — tapping it shouldn't close the menu. */}
                  <div
                    onClick={(e) => e.preventDefault()}
                    className="flex items-center justify-between px-2 py-1.5 rounded-sm text-sm"
                  >
                    <span className="flex items-center gap-2.5">
                      <span>{resolvedTheme === "dark" ? "🌙" : "🌞"}</span> Tema
                    </span>
                    <button
                      type="button"
                      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                      className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors bg-cream-300"
                    >
                      <span
                        className={`inline-block size-4 rounded-full bg-white shadow-sm transition-transform ${
                          resolvedTheme === "dark" ? "translate-x-[18px]" : "translate-x-[2px]"
                        }`}
                      />
                    </button>
                  </div>
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer gap-2.5 text-rose-600 focus:text-rose-700 focus:bg-rose-50"
                  >
                    <LogOut className="size-4" /> Keluar
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Global search trigger — ⌘F badge */}
          <Button
            variant="outline"
            size="sm"
            data-tour="global-search"
            className="hidden sm:flex gap-1.5 border-border text-stone hover:text-ink hover:bg-cream-100 px-2 h-8"
            onClick={() => openGlobalSearch()}
            aria-label="Cari data (Cmd+F)"
          >
            <Search className="size-3.5" />
            <span className="text-xs">Cari...</span>
            <kbd className="text-[10px] font-mono text-stone">⌘F</kbd>
          </Button>

          {/* Command palette trigger — ⌘K badge */}
          <Button
            variant="outline"
            size="sm"
            data-tour="command-palette"
            className="hidden sm:flex gap-1.5 border-border text-stone hover:text-ink hover:bg-cream-100 px-2 h-8"
            onClick={() => openCommandPalette()}
            aria-label="Buka command palette (Cmd+K)"
          >
            <Command className="size-3.5" />
            <kbd className="text-[10px] font-mono text-stone">⌘K</kbd>
          </Button>

          {/* Notifications dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                data-tour="notifications"
                className="relative"
                aria-label="Notifikasi"
              >
                <Bell className="size-4" />
                {unread > 0 && (
                  <span className="absolute -top-0 -right-0 min-w-[16px] h-4 px-1 bg-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-0">
              <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                <DropdownMenuLabel className="p-0 text-sm font-bold text-ink">
                  Notifikasi
                  {persistentUnread > 0 && (
                    <span className="ml-1.5 text-[10px] font-semibold text-teal bg-teal-50 px-1.5 py-0.5 rounded">
                      {persistentUnread} baru
                    </span>
                  )}
                </DropdownMenuLabel>
                {unread > 0 && (
                  <button
                    type="button"
                    onClick={dismissAll}
                    className="text-[11px] text-teal hover:underline font-medium"
                  >
                    Tandai semua dibaca
                  </button>
                )}
              </div>

              <div className="max-h-96 overflow-y-auto">
                {visibleNotifications.length === 0 && persistentUnread === 0 ? (
                  <div className="px-3 py-8 text-center text-sm text-stone">
                    Tidak ada notifikasi baru 🎉
                  </div>
                ) : visibleNotifications.length === 0 ? (
                  // No derived alerts but persistent notifications exist — nudge
                  // the user to open the Notifikasi section for the full list.
                  <div className="px-3 py-6 text-center text-sm text-stone">
                    <div className="mb-1">🔔 {persistentUnread} notifikasi belum dibaca</div>
                    <button
                      type="button"
                      onClick={() => setSection("notifikasi")}
                      className="text-[11px] text-teal hover:underline font-medium"
                    >
                      Lihat semua notifikasi →
                    </button>
                  </div>
                ) : (
                  visibleNotifications.map((n) => (
                    <DropdownMenuItem
                      key={n.id}
                      onSelect={() => setSection(n.section)}
                      className="items-start gap-2 py-2.5 px-3 cursor-pointer"
                    >
                      <span className="text-lg shrink-0 leading-none">{n.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-ink leading-snug">
                          {n.title}
                        </div>
                        <div className="text-[10px] text-stone mt-0.5">{n.time}</div>
                      </div>
                    </DropdownMenuItem>
                  ))
                )}
              </div>

              <DropdownMenuSeparator className="m-0" />
              <div className="px-2 py-2 flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="flex-1 h-8 gap-1.5 text-[11px] text-stone hover:text-ink"
                  onClick={() => generateMut.mutate()}
                  disabled={generateMut.isPending || !activeBrand?.id}
                  aria-label="Generate notifikasi dari data terbaru"
                >
                  {generateMut.isPending ? (
                    <RefreshCw className="size-3 animate-spin" />
                  ) : (
                    <Sparkles className="size-3" />
                  )}
                  <span>Generate</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="flex-1 h-8 gap-1 text-[11px] text-teal hover:bg-teal-50 hover:text-teal-700"
                  onClick={() => setSection("notifikasi")}
                  aria-label="Lihat semua notifikasi"
                >
                  <span>Lihat Semua</span>
                  <ArrowRight className="size-3" />
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Credit — single home for balance + top-up. Used to instantly buy
              120 credit on tap; now it opens a proper panel so tapping to
              check your balance can't accidentally spend money. */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                data-tour="credit-button"
                className="gap-1.5 border-teal/30 text-teal hover:bg-teal-100 hover:text-teal-600"
              >
                <Zap className="size-3.5 fill-teal" />
                <span className="font-bold tabular-nums">{user?.creditBalance ?? 0}</span>
                <span className="hidden sm:inline text-[11px] text-stone font-medium">credit</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 p-0">
              <div className="px-3 py-3 border-b border-border flex items-center gap-3">
                <div className="size-10 rounded-xl bg-teal-100 text-teal flex items-center justify-center shrink-0">
                  <Zap className="size-5 fill-teal" />
                </div>
                <div>
                  <div className="text-xl font-extrabold text-ink tabular-nums leading-none">
                    {user?.creditBalance ?? 0}
                  </div>
                  <div className="text-[11px] text-stone mt-0.5">Credit tersedia</div>
                </div>
              </div>
              <div className="p-2 grid grid-cols-2 gap-1.5">
                {(creditPackages?.packages ?? CREDIT_PACKAGES).map((pkg) => (
                  <button
                    key={pkg.id}
                    onClick={() => topup(pkg)}
                    className="flex flex-col items-center gap-0.5 py-2.5 rounded-lg border border-teal/20 hover:bg-teal-50 transition-colors"
                  >
                    <span className="text-sm font-bold text-teal">{pkg.credits}</span>
                    <span className="text-[10px] text-stone">{formatRupiah(pkg.price)}</span>
                  </button>
                ))}
              </div>
              <DropdownMenuSeparator className="m-0" />
              <button
                type="button"
                onClick={() => setSection("credit")}
                className="w-full px-3 py-2.5 flex items-center justify-center gap-1 text-[11px] text-teal hover:bg-teal-50 font-medium transition-colors"
              >
                <span>Lihat riwayat lengkap</span>
                <ArrowRight className="size-3" />
              </button>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Global search dialog — mounted once, opened via Cmd+F or the search button. */}
      <GlobalSearch />
    </header>
  );
}
