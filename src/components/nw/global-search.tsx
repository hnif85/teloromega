"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppStore, getActiveBrand } from "@/lib/store";
import { api } from "@/lib/api";
import type { SectionKey } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  Package,
  ShoppingCart,
  User,
  Users,
  DollarSign,
  FileText,
  ChevronRight,
  Clock,
  X,
  Sparkles,
} from "lucide-react";

// ─── Public event API (mirrors openCommandPalette pattern) ──────
// Lets the Topbar trigger the global search dialog imperatively.
export const OPEN_GLOBAL_SEARCH_EVENT = "nw:open-global-search";

export function openGlobalSearch() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(OPEN_GLOBAL_SEARCH_EVENT));
  }
}

// ─── Types (mirrors API response shape) ────────────────────────
type SearchResultType =
  | "produk"
  | "order"
  | "customer"
  | "lead"
  | "transaksi"
  | "konten";

interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle: string;
  icon: string;
  section: SectionKey;
  referenceId: string;
  score: number;
}

interface SearchResponse {
  results: SearchResult[];
  total: number;
  query: string;
}

// ─── Type metadata: emoji, label, Lucide icon, accent color ─────
const TYPE_META: Record<
  SearchResultType,
  { label: string; emoji: string; icon: typeof Package; accent: string }
> = {
  produk: { label: "Produk", emoji: "📦", icon: Package, accent: "text-teal" },
  order: {
    label: "Order",
    emoji: "🛒",
    icon: ShoppingCart,
    accent: "text-violet-600",
  },
  customer: {
    label: "Customer",
    emoji: "👤",
    icon: User,
    accent: "text-sky-600",
  },
  lead: { label: "Lead", emoji: "👥", icon: Users, accent: "text-amber-600" },
  transaksi: {
    label: "Transaksi",
    emoji: "💰",
    icon: DollarSign,
    accent: "text-emerald-600",
  },
  konten: {
    label: "Konten",
    emoji: "📝",
    icon: FileText,
    accent: "text-rose-600",
  },
};

// Display order for grouped headers (matches the spec).
const TYPE_ORDER: SearchResultType[] = [
  "produk",
  "order",
  "customer",
  "lead",
  "transaksi",
  "konten",
];

// ─── Recent searches (localStorage, last 5) ────────────────────
const RECENT_KEY = "nw:recent-searches";
const RECENT_MAX = 5;

interface RecentSearch {
  q: string;
  ts: number;
}

function loadRecentSearches(): RecentSearch[] {
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

function saveRecentSearch(q: string) {
  if (typeof window === "undefined") return;
  const trimmed = q.trim();
  if (!trimmed) return;
  const current = loadRecentSearches().filter((r) => r.q !== trimmed);
  const next = [{ q: trimmed, ts: Date.now() }, ...current].slice(0, RECENT_MAX);
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
}

function clearRecentSearches() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(RECENT_KEY);
  } catch {
    /* ignore */
  }
}

// ─── Debounce hook ─────────────────────────────────────────────
function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ─── Component ─────────────────────────────────────────────────
export function GlobalSearch() {
  const { setSection } = useAppStore();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0); // flat index across grouped results
  const [recent, setRecent] = useState<RecentSearch[]>(() => loadRecentSearches());

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const activeBrand = getActiveBrand(useAppStore.getState());

  // Debounce the query so we don't fire an API request on every keystroke.
  const debouncedQuery = useDebounced(query, 300);
  const trimmedDebounced = debouncedQuery.trim();

  const { data, isLoading, isFetching } = useQuery<SearchResponse>({
    queryKey: ["global-search", activeBrand?.id, trimmedDebounced],
    queryFn: () =>
      api<SearchResponse>(
        `/api/search?brandId=${activeBrand?.id}&q=${encodeURIComponent(trimmedDebounced)}&limit=20`
      ),
    enabled: !!activeBrand?.id && trimmedDebounced.length >= 2,
    // Keep previous results visible while fetching the next query — avoids
    // the jarring "no results" flash between keystrokes.
    placeholderData: (prev) => prev,
  });

  const results = data?.results ?? [];

  // Group results by type for display.
  const grouped = useMemo(() => {
    const map = new Map<SearchResultType, SearchResult[]>();
    for (const r of results) {
      const list = map.get(r.type) ?? [];
      list.push(r);
      map.set(r.type, list);
    }
    return map;
  }, [results]);

  // Flat list (used for keyboard navigation index math).
  const flatResults = useMemo(() => results, [results]);

  // ── Keyboard shortcut: Cmd+F / Ctrl+F ──────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setOpen(true);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_GLOBAL_SEARCH_EVENT, onOpen as EventListener);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_GLOBAL_SEARCH_EVENT, onOpen as EventListener);
    };
  }, []);

  // ── Reset state when dialog opens/closes ───────────────────
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      setRecent(loadRecentSearches());
      // Autofocus the input on next tick (Dialog animation needs to settle).
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  // ── Clamp activeIndex when results change ──────────────────
  useEffect(() => {
    if (activeIndex >= flatResults.length) {
      setActiveIndex(0);
    }
  }, [flatResults.length, activeIndex]);

  // ── Scroll active item into view ───────────────────────────
  useEffect(() => {
    const el = itemRefs.current[activeIndex];
    if (el) {
      el.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  const navigateToResult = useCallback(
    (r: SearchResult) => {
      // Persist the search to recent searches so the empty state can show it.
      saveRecentSearch(trimmedDebounced || query);
      setSection(r.section);
      setOpen(false);
    },
    [setSection, trimmedDebounced, query]
  );

  const runRecentSearch = useCallback((q: string) => {
    setQuery(q);
    inputRef.current?.focus();
  }, []);

  const clearRecent = useCallback(() => {
    clearRecentSearches();
    setRecent([]);
  }, []);

  // ── Keyboard navigation inside the dialog ──────────────────
  function handleListKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(flatResults.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const r = flatResults[activeIndex];
      if (r) navigateToResult(r);
    }
  }

  // Track per-result flat index for aria + ref binding.
  let runningIndex = -1;

  const showEmptyState =
    !isLoading &&
    !isFetching &&
    trimmedDebounced.length >= 2 &&
    results.length === 0;
  const showRecent =
    trimmedDebounced.length < 2 && recent.length > 0;
  const showTips = trimmedDebounced.length < 2;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="sm:max-w-2xl p-0 gap-0 max-h-[85vh] overflow-hidden"
        // Trap keyboard events on the content so our arrow-key handler runs
        // before Radix's own focus-trap cycling.
        onKeyDown={handleListKeyDown}
      >
        {/* Visually-hidden accessible title/description (Dialog requires them) */}
        <DialogTitle className="sr-only">Pencarian Global</DialogTitle>
        <DialogDescription className="sr-only">
          Cari produk, order, customer, lead, transaksi, dan konten dari brand aktif Anda.
        </DialogDescription>

        {/* ── Search input row ─────────────────────────────── */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-cream-50">
          <Search className="size-4 text-stone shrink-0" />
          <Input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari produk, order, customer, transaksi…"
            className="border-0 shadow-none focus-visible:ring-0 h-9 bg-transparent px-0 text-base placeholder:text-stone"
            aria-label="Kueri pencarian"
            autoComplete="off"
            spellCheck={false}
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="text-stone hover:text-ink transition-colors p-1"
              aria-label="Hapus kueri"
            >
              <X className="size-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 h-5 rounded border border-border bg-cream-100 text-[10px] font-mono text-stone shrink-0">
            Esc
          </kbd>
        </div>

        {/* ── Results body ─────────────────────────────────── */}
        <ScrollArea className="h-[55vh] sm:h-[60vh]">
          <div ref={listRef} className="p-2">
            {/* Loading state */}
            {(isLoading || isFetching) && trimmedDebounced.length >= 2 && (
              <div className="space-y-1 p-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-2">
                    <Skeleton className="size-9 rounded-lg shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-2/3" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty results state */}
            {showEmptyState && (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <div className="size-12 rounded-full bg-cream-100 flex items-center justify-center mb-3">
                  <Search className="size-5 text-stone" />
                </div>
                <div className="text-sm font-semibold text-ink">
                  Tidak ada hasil untuk &ldquo;{trimmedDebounced}&rdquo;
                </div>
                <div className="text-xs text-stone mt-1 max-w-sm">
                  Coba kata kunci lain, periksa ejaan, atau pastikan brand yang
                  aktif benar. Pencarian mencakup nama, SKU, deskripsi, nomor
                  telepon, dan banyak lagi.
                </div>
                <div className="flex flex-wrap items-center justify-center gap-1.5 mt-4">
                  {["Kopi", "Order", "TikTok", "transfer", "+62"].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setQuery(s);
                        inputRef.current?.focus();
                      }}
                      className="text-[11px] px-2 py-1 rounded-md border border-border bg-cream-50 text-stone hover:text-ink hover:bg-cream-100 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Recent searches + tips (empty query state) */}
            {showTips && !isLoading && !isFetching && (
              <div className="p-2 space-y-4">
                {showRecent && (
                  <div>
                    <div className="flex items-center justify-between px-2 py-1.5">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-stone">
                        <Clock className="size-3" />
                        Pencarian terakhir
                      </div>
                      <button
                        type="button"
                        onClick={clearRecent}
                        className="text-[11px] text-stone hover:text-rose-600 transition-colors"
                      >
                        Hapus
                      </button>
                    </div>
                    {recent.map((r) => (
                      <button
                        key={`${r.q}-${r.ts}`}
                        type="button"
                        onClick={() => runRecentSearch(r.q)}
                        className="w-full flex items-center gap-3 px-2 py-2 rounded-md hover:bg-cream-100 transition-colors text-left group"
                      >
                        <Clock className="size-3.5 text-stone shrink-0" />
                        <span className="flex-1 text-sm text-ink truncate">
                          {r.q}
                        </span>
                        <ChevronRight className="size-3.5 text-stone opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-stone">
                    <Sparkles className="size-3" />
                    Tips pencarian
                  </div>
                  <div className="px-2 py-2 space-y-2">
                    {[
                      "Cari nama produk, SKU, atau deskripsi",
                      "Cari nomor telepon customer atau lead",
                      "Cari 6 digit terakhir ID order untuk lompat ke order",
                      "Cari nomor resi untuk cek status pengiriman",
                      "Cari kategori transaksi (penjualan, operasional, dll.)",
                    ].map((tip) => (
                      <div
                        key={tip}
                        className="flex items-start gap-2 text-xs text-stone"
                      >
                        <span className="text-teal mt-0.5">•</span>
                        <span>{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="px-2 py-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-stone mb-1.5">
                    Sumber data
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {TYPE_ORDER.map((t) => {
                      const meta = TYPE_META[t];
                      return (
                        <Badge
                          key={t}
                          variant="outline"
                          className="gap-1 border-border bg-cream-50 text-stone"
                        >
                          <span>{meta.emoji}</span>
                          {meta.label}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Grouped results */}
            {!isLoading &&
              !isFetching &&
              trimmedDebounced.length >= 2 &&
              results.length > 0 && (
                <div className="space-y-3 p-2">
                  {/* Total count header */}
                  <div className="px-2 py-1 text-[11px] text-stone">
                    {results.length} hasil ditemukan untuk &ldquo;
                    <span className="font-medium text-ink">{trimmedDebounced}</span>
                    &rdquo;
                  </div>

                  {TYPE_ORDER.map((type) => {
                    const list = grouped.get(type);
                    if (!list || list.length === 0) return null;
                    const meta = TYPE_META[type];
                    const Icon = meta.icon;
                    return (
                      <div key={type}>
                        {/* Group header */}
                        <div className="flex items-center justify-between px-2 py-1.5 sticky top-0 bg-background z-10">
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-stone">
                            <Icon className={cn("size-3", meta.accent)} />
                            {meta.emoji} {meta.label}
                          </div>
                          <Badge
                            variant="secondary"
                            className="bg-cream-100 text-stone text-[10px] h-4 px-1.5"
                          >
                            {list.length}
                          </Badge>
                        </div>

                        {/* Group items */}
                        {list.map((r) => {
                          runningIndex += 1;
                          const flatIdx = runningIndex;
                          const isActive = flatIdx === activeIndex;
                          return (
                            <button
                              key={r.id}
                              ref={(el) => {
                                itemRefs.current[flatIdx] = el;
                              }}
                              type="button"
                              onMouseEnter={() => setActiveIndex(flatIdx)}
                              onClick={() => navigateToResult(r)}
                              className={cn(
                                "w-full flex items-center gap-3 px-2 py-2 rounded-md transition-colors text-left",
                                isActive ? "bg-cream-100" : "hover:bg-cream-50"
                              )}
                              aria-selected={isActive}
                              role="option"
                            >
                              <div
                                className={cn(
                                  "size-9 rounded-lg flex items-center justify-center text-base shrink-0",
                                  isActive
                                    ? "bg-background"
                                    : "bg-cream-100"
                                )}
                              >
                                {r.icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-ink truncate">
                                  {r.title}
                                </div>
                                <div className="text-xs text-stone truncate">
                                  {r.subtitle}
                                </div>
                              </div>
                              <ChevronRight
                                className={cn(
                                  "size-4 shrink-0 transition-colors",
                                  isActive ? "text-ink" : "text-stone/50"
                                )}
                              />
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
          </div>
        </ScrollArea>

        {/* ── Footer ───────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-2 px-4 py-2 border-t border-border bg-cream-50">
          <div className="flex items-center gap-3 text-[10px] text-stone">
            <span className="flex items-center gap-1">
              <kbd className="px-1 h-4 inline-flex items-center rounded border border-border bg-background font-mono">
                ↑
              </kbd>
              <kbd className="px-1 h-4 inline-flex items-center rounded border border-border bg-background font-mono">
                ↓
              </kbd>
              navigasi
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 h-4 inline-flex items-center rounded border border-border bg-background font-mono">
                ↵
              </kbd>
              buka
            </span>
            <span className="hidden sm:flex items-center gap-1">
              <kbd className="px-1 h-4 inline-flex items-center rounded border border-border bg-background font-mono">
                Esc
              </kbd>
              tutup
            </span>
          </div>
          <div className="text-[10px] text-stone">
            Pencarian merangkum 6 sumber data brand aktif
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
