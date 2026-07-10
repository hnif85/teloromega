"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppStore, getActiveBrand } from "@/lib/store";
import { NAV_ITEMS, SECONDARY_NAV, type SectionKey, timeAgo } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Bell, Menu, Zap, Plus, Command } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/nw/theme-toggle";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { openCommandPalette } from "@/components/nw/command-palette";

// Shape returned by /api/dashboard — only the fields the topbar needs.
interface DashboardData {
  lowStock: { id: string; name: string; stock: number | null; minStock: number | null }[];
  pendingPaymentsCount: number;
  recentResearch: { id: string; query: string; createdAt: string }[];
  recommendations: { id: string; source: string; title: string; used: boolean }[];
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
    setOnboardingOpen,
    setCredit,
  } = useAppStore();
  const activeBrand = getActiveBrand(useAppStore.getState());
  const [open, setOpen] = useState(false);
  // Track dismissed notification IDs for this session — "Tandai semua dibaca"
  // pushes every current notification id into this set so the badge count drops
  // to 0 until the next dashboard refetch surfaces new items.
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const { data } = useQuery<DashboardData>({
    queryKey: ["dashboard", activeBrand?.id],
    queryFn: () => api<DashboardData>(`/api/dashboard?brandId=${activeBrand?.id}`),
    enabled: !!activeBrand?.id,
    refetchInterval: 60_000,
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
  const unread = visibleNotifications.length;

  function dismissAll() {
    setDismissed(new Set(notifications.map((n) => n.id)));
  }

  async function quickTopup() {
    try {
      const r = await api<{ balance: number }>("/api/credit/topup", {
        method: "POST",
        json: { packageId: "growth", credits: 120, price: 99000 },
      });
      setCredit(r.balance);
      toast({ title: "Top-up berhasil", description: "+120 credit ditambahkan" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal top-up";
      toast({ title: "Gagal top-up", description: msg, variant: "destructive" });
    }
  }

  function MobileNav() {
    return (
      <div className="flex flex-col gap-1">
        {[...NAV_ITEMS, ...SECONDARY_NAV].map((item) => (
          <button
            key={item.key}
            onClick={() => {
              setSection(item.key as SectionKey);
              setOpen(false);
            }}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left",
              section === item.key
                ? "bg-teal text-white"
                : "text-ink hover:bg-cream-200"
            )}
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.label}</span>
            {item.key === "credit" && (
              <span className="ml-auto text-[11px] font-bold bg-cream-200 px-1.5 py-0.5 rounded-md text-teal">
                {user?.creditBalance ?? 0}
              </span>
            )}
          </button>
        ))}
        <div className="h-px bg-border my-2" />
        <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-stone font-semibold">
          Brand aktif
        </div>
        {brands.map((b) => (
          <button
            key={b.id}
            onClick={() => {
              setActiveBrand(b.id);
              setOpen(false);
            }}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left",
              b.id === activeBrandId ? "bg-cream-200" : "hover:bg-cream-100"
            )}
          >
            <div className="size-6 rounded bg-teal/10 text-teal text-[10px] font-bold flex items-center justify-center">
              {b.name[0]?.toUpperCase()}
            </div>
            <span className="flex-1 truncate">{b.name}</span>
            {b.id === activeBrandId && <span className="text-teal text-xs">✓</span>}
          </button>
        ))}
      </div>
    );
  }

  return (
    <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="flex items-center gap-3 px-4 md:px-6 py-3">
        {/* Mobile menu */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-4">
            <SheetHeader className="mb-3">
              <SheetTitle className="flex items-center gap-2">
                <div className="size-8 rounded-xl bg-teal text-white font-extrabold flex items-center justify-center text-xs">
                  NW
                </div>
                Next Whiz
              </SheetTitle>
            </SheetHeader>
            <MobileNav />
          </SheetContent>
        </Sheet>

        {/* Brand pill */}
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-teal text-white text-xs font-bold flex items-center justify-center">
            {activeBrand?.name?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="hidden sm:block">
            <div className="text-sm font-bold text-ink leading-none">
              {activeBrand?.name ?? "Belum ada brand"}
            </div>
            <div className="text-[10px] text-stone mt-0.5">{activeBrand?.category ?? "—"}</div>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
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

          {/* Theme toggle */}
          <div data-tour="theme-toggle">
            <ThemeToggle />
          </div>

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
                {visibleNotifications.length === 0 ? (
                  <div className="px-3 py-8 text-center text-sm text-stone">
                    Tidak ada notifikasi baru 🎉
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
              <div className="px-3 py-2">
                <button
                  type="button"
                  className="w-full text-center text-[11px] text-teal hover:underline font-medium"
                >
                  Lihat semua
                </button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            size="sm"
            variant="outline"
            data-tour="credit-button"
            className="gap-1.5 border-teal/30 text-teal hover:bg-teal-100 hover:text-teal-600"
            onClick={quickTopup}
          >
            <Zap className="size-3.5 fill-teal" />
            <span className="font-bold tabular-nums">{user?.creditBalance ?? 0}</span>
            <span className="hidden sm:inline text-[11px] text-stone font-medium">credit</span>
          </Button>

          <Button
            size="sm"
            className="bg-teal hover:bg-teal-600 text-white gap-1.5"
            onClick={() => setOnboardingOpen(true)}
          >
            <Plus className="size-3.5" />
            <span className="hidden sm:inline">Brand baru</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
