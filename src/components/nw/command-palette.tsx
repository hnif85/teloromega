"use client";

import { useEffect, useState, useCallback } from "react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import {
  BarChart3,
  Search,
  PenLine,
  Store,
  Wallet,
  Zap,
  Settings,
  Package,
  Sparkles,
  Image as ImageIcon,
  Plus,
  Building2,
  Clock,
  TrendingUp,
  Bell,
  HelpCircle,
  ClipboardList,
  MessageCircle,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import type { SectionKey } from "@/lib/constants";

// Module-level event so the Topbar "⌘K" badge can open the palette without
// needing to plumb new state through the global Zustand store.
export const OPEN_COMMAND_PALETTE_EVENT = "nw:open-command-palette";

export function openCommandPalette() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(OPEN_COMMAND_PALETTE_EVENT));
  }
}

interface RecentCommand {
  id: string;
  label: string;
  icon: string; // lucide icon name lookup key
  group: string;
}

const RECENT_KEY = "nw:recent-commands";
const RECENT_MAX = 5;

const NAV_ITEMS: { key: SectionKey; label: string; icon: typeof BarChart3 }[] = [
  { key: "beranda", label: "Beranda", icon: BarChart3 },
  { key: "insights", label: "Insights", icon: TrendingUp },
  { key: "produk", label: "Produk", icon: Package },
  { key: "riset", label: "Riset", icon: Search },
  { key: "konten", label: "Konten", icon: PenLine },
  { key: "toko", label: "Toko", icon: Store },
  { key: "aichat", label: "AI Chat", icon: MessageCircle },
  { key: "keuangan", label: "Keuangan", icon: Wallet },
  { key: "credit", label: "Credit", icon: Zap },
  { key: "notifikasi", label: "Notifikasi", icon: Bell },
  { key: "pengaturan", label: "Pengaturan", icon: Settings },
  { key: "bantuan", label: "Bantuan", icon: HelpCircle },
  { key: "aktivitas", label: "Aktivitas", icon: ClipboardList },
];

const ICON_LOOKUP: Record<string, typeof BarChart3> = {
  BarChart3,
  Search,
  PenLine,
  Store,
  Wallet,
  Zap,
  Settings,
  Package,
  Sparkles,
  ImageIcon,
  Plus,
  Building2,
  TrendingUp,
  Bell,
  HelpCircle,
  ClipboardList,
};

const QUICK_ACTIONS: {
  id: string;
  label: string;
  icon: typeof Package;
  section: SectionKey;
}[] = [
  { id: "qa-add-product", label: "Tambah Produk", icon: Package, section: "toko" },
  { id: "qa-start-research", label: "Mulai Riset", icon: Search, section: "riset" },
  { id: "qa-generate-content", label: "Generate Konten", icon: ImageIcon, section: "konten" },
  { id: "qa-topup-credit", label: "Top Up Credit", icon: Zap, section: "credit" },
  { id: "qa-new-brand", label: "Buat Brand Baru", icon: Building2, section: "pengaturan" },
];

function loadRecent(): RecentCommand[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

function saveRecent(entry: RecentCommand) {
  if (typeof window === "undefined") return;
  const current = loadRecent().filter((r) => r.id !== entry.id);
  const next = [entry, ...current].slice(0, RECENT_MAX);
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota errors */
  }
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  // Lazy initializer reads from localStorage exactly once on mount without
  // triggering an extra render via useEffect+setState.
  const [recent, setRecent] = useState<RecentCommand[]>(() => loadRecent());
  const { setSection, brands, activeBrandId, setActiveBrand, setOnboardingOpen } = useAppStore();

  // Cmd+K (mac) / Ctrl+K (others) toggles the palette.
  // Also listen for the OPEN_COMMAND_PALETTE_EVENT so external triggers
  // (like the Topbar ⌘K badge button) can open it imperatively.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_COMMAND_PALETTE_EVENT, onOpen as EventListener);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_COMMAND_PALETTE_EVENT, onOpen as EventListener);
    };
  }, []);

  const runNav = useCallback(
    (key: SectionKey, label: string) => {
      setSection(key);
      saveRecent({
        id: `nav-${key}`,
        label,
        icon: "BarChart3",
        group: "Navigasi",
      });
      setRecent(loadRecent());
      setOpen(false);
    },
    [setSection]
  );

  const runQuick = useCallback(
    (action: (typeof QUICK_ACTIONS)[number]) => {
      // "Buat Brand Baru" opens the onboarding dialog instead of just navigating.
      if (action.id === "qa-new-brand") {
        setOnboardingOpen(true);
      } else {
        setSection(action.section);
      }
      saveRecent({
        id: action.id,
        label: action.label,
        icon: action.icon.name,
        group: "Aksi Cepat",
      });
      setRecent(loadRecent());
      setOpen(false);
    },
    [setSection, setOnboardingOpen]
  );

  const runBrand = useCallback(
    (brandId: string, name: string) => {
      setActiveBrand(brandId);
      saveRecent({
        id: `brand-${brandId}`,
        label: `Brand: ${name}`,
        icon: "Building2",
        group: "Brand",
      });
      setRecent(loadRecent());
      setOpen(false);
    },
    [setActiveBrand]
  );

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="usahaku.ai — Command Palette"
      description="Cari perintah atau navigasi cepat"
      className="sm:max-w-xl"
    >
      <CommandInput placeholder="Ketik perintah atau cari…" />
      <CommandList>
        <CommandEmpty>Tidak ada hasil.</CommandEmpty>

        {recent.length > 0 && (
          <>
            <CommandGroup heading="Terakhir">
              {recent.map((r) => {
                const Icon = ICON_LOOKUP[r.icon] ?? Clock;
                return (
                  <CommandItem
                    key={`recent-${r.id}`}
                    value={`recent ${r.label}`}
                    onSelect={() => {
                      // Re-run by simulating the original action — best-effort
                      // mapping by id prefix.
                      if (r.id.startsWith("nav-")) {
                        const k = r.id.replace("nav-", "") as SectionKey;
                        runNav(k, r.label);
                      } else if (r.id.startsWith("qa-")) {
                        const a = QUICK_ACTIONS.find((q) => q.id === r.id);
                        if (a) runQuick(a);
                      } else if (r.id.startsWith("brand-")) {
                        const bid = r.id.replace("brand-", "");
                        runBrand(bid, r.label.replace(/^Brand:\s*/, ""));
                      }
                    }}
                  >
                    <Clock className="size-4 text-stone" />
                    <span className="flex-1">{r.label}</span>
                    <span className="text-[10px] text-stone uppercase tracking-wider">
                      {r.group}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        <CommandGroup heading="Navigasi">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <CommandItem
                key={`nav-${item.key}`}
                value={`navigasi ${item.label}`}
                onSelect={() => runNav(item.key, item.label)}
              >
                <Icon className="size-4 text-teal" />
                <span>{item.label}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Aksi Cepat">
          {QUICK_ACTIONS.map((a) => {
            const Icon = a.icon;
            return (
              <CommandItem
                key={a.id}
                value={`aksi ${a.label}`}
                onSelect={() => runQuick(a)}
              >
                <Icon className="size-4 text-orange" />
                <span>{a.label}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>

        {brands.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Brand">
              {brands.map((b) => {
                const isActive = b.id === activeBrandId;
                return (
                  <CommandItem
                    key={`brand-${b.id}`}
                    value={`brand ${b.name}`}
                    onSelect={() => runBrand(b.id, b.name)}
                    disabled={isActive}
                  >
                    <Building2 className="size-4 text-teal" />
                    <span className="flex-1 truncate">{b.name}</span>
                    {isActive && (
                      <span className="text-[10px] text-teal font-semibold uppercase tracking-wider">
                        Aktif
                      </span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
