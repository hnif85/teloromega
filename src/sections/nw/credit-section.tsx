"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { PageHeader, SectionCard, EmptyState } from "@/components/nw/primitives";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Zap,
  Plus,
  Crown,
  History,
  TrendingUp,
  Search,
  Sparkles,
  ArrowDownRight,
  ArrowUpRight,
  Gift,
  Info,
} from "lucide-react";
import {
  CREDIT_RATES,
  CREDIT_PACKAGES,
  formatRupiah,
  timeAgo,
  type CreditActionKey,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface UsageLog {
  id: string;
  actionKey: string;
  creditCost: number;
  balanceBefore: number;
  balanceAfter: number;
  referenceId: string | null;
  status: string;
  createdAt: string;
}

interface PackagesResponse {
  packages: typeof CREDIT_PACKAGES;
}

interface UsageLogResponse {
  logs: UsageLog[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const ACTION_NAME_MAP: Record<string, string> = CREDIT_RATES.reduce(
  (acc, r) => ({ ...acc, [r.key]: r.name }),
  {} as Record<string, string>
);

const MODULE_LABEL: Record<string, string> = {
  riset: "Riset",
  konten: "Konten",
  toko: "Toko",
  keuangan: "Keuangan",
};

const MODULE_COLOR: Record<string, string> = {
  riset: "bg-teal-100 text-teal-600",
  konten: "bg-orange-100 text-orange-700",
  toko: "bg-violet-100 text-violet-700",
  keuangan: "bg-emerald-100 text-emerald-700",
};

const MODULE_ICON: Record<string, string> = {
  riset: "🔍",
  konten: "📝",
  toko: "🛒",
  keuangan: "💰",
};

function isTopup(log: UsageLog): boolean {
  return !!log.referenceId?.startsWith("topup_");
}

function friendlyAction(log: UsageLog): string {
  if (isTopup(log)) return "Top Up Credit";
  return ACTION_NAME_MAP[log.actionKey] ?? log.actionKey;
}

// ─────────────────────────────────────────────────────────────────────────────
// Count-up animation hook
// ─────────────────────────────────────────────────────────────────────────────
function useCountUp(target: number, durationMs = 800) {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      const v = Math.round(from + (target - from) * eased);
      setValue(v);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      fromRef.current = target;
    };
  }, [target, durationMs]);

  return value;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hero balance card
// ─────────────────────────────────────────────────────────────────────────────
function HeroBalance({
  balance,
  lastUpdated,
  onTopUp,
}: {
  balance: number;
  lastUpdated: string;
  onTopUp: () => void;
}) {
  const animated = useCountUp(balance, 900);
  const empty = balance === 0;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl border p-6 md:p-8 mesh-hero",
        empty ? "border-rose-200 bg-rose-50/40" : "border-teal/20 bg-card"
      )}
    >
      <div className="absolute -right-10 -top-10 size-40 rounded-full bg-teal/5 blur-2xl pointer-events-none" />
      <div className="absolute -left-8 -bottom-12 size-40 rounded-full bg-orange/5 blur-2xl pointer-events-none" />

      <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div
              className={cn(
                "size-9 rounded-xl flex items-center justify-center",
                empty ? "bg-rose-100 text-rose-600" : "bg-teal text-white"
              )}
            >
              <Zap className={cn("size-5", !empty && "fill-white")} />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider font-bold text-stone">
                Saldo Credit
              </div>
              <div className="text-[11px] text-stone-300">
                Diperbarui {timeAgo(lastUpdated)}
              </div>
            </div>
          </div>
          <div className="flex items-end gap-2">
            <div
              className={cn(
                "text-5xl md:text-6xl font-extrabold tabular-nums leading-none",
                empty ? "text-rose-600" : "text-ink"
              )}
            >
              {animated.toLocaleString("id-ID")}
            </div>
            <div className="text-sm font-semibold text-stone mb-2">credit</div>
          </div>
          <p className={cn("text-sm mt-3 max-w-md", empty ? "text-rose-700" : "text-ink-500")}>
            {empty
              ? "Credit habis. Beberapa fitur AI tidak bisa dipakai sampai kamu top up."
              : "Pakai credit untuk riset, generate konten, broadcast WA, dan proyeksi keuangan."}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 shrink-0">
          {empty ? (
            <Button
              size="lg"
              onClick={onTopUp}
              className="bg-rose-600 hover:bg-rose-700 text-white gap-1.5 shadow-sm"
            >
              <Plus className="size-4" /> Top Up Sekarang
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={onTopUp}
              className="bg-teal hover:bg-teal-600 text-white gap-1.5 shadow-sm"
            >
              <Plus className="size-4" /> Top Up
            </Button>
          )}
          <Button
            size="lg"
            variant="outline"
            className="bg-card/70 backdrop-blur border-border gap-1.5"
            onClick={() => {
              document
                .getElementById("rates-info")
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          >
            <Info className="size-4" /> Lihat Tarif
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Package card
// ─────────────────────────────────────────────────────────────────────────────
function PackageCard({
  pkg,
  recommended,
  onBuy,
  buying,
}: {
  pkg: (typeof CREDIT_PACKAGES)[number];
  recommended: boolean;
  onBuy: () => void;
  buying: boolean;
}) {
  const totalCredits = pkg.credits + pkg.bonus;
  return (
    <div
      className={cn(
        "relative rounded-2xl border p-5 flex flex-col transition-all",
        recommended
          ? "border-teal bg-gradient-to-b from-teal-100/60 to-card shadow-sm"
          : "border-border bg-card hover:border-teal/30"
      )}
    >
      {recommended && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
          <Badge className="bg-teal text-white border-teal gap-1 shadow-sm">
            <Crown className="size-3" /> Populer
          </Badge>
        </div>
      )}

      <div className="text-sm font-bold text-ink">{pkg.label}</div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-3xl font-extrabold text-ink tabular-nums">
          {pkg.credits}
        </span>
        <span className="text-xs text-stone font-medium">credit</span>
      </div>
      {pkg.bonus > 0 && (
        <div className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-orange bg-orange-100 px-2 py-0.5 rounded-md w-fit">
          <Gift className="size-3" /> +{pkg.bonus} bonus
        </div>
      )}

      <div className="mt-3 text-2xl font-extrabold text-ink tabular-nums">
        {formatRupiah(pkg.price)}
      </div>
      <div className="text-[11px] text-stone mt-0.5">
        {pkg.bonus > 0
          ? `${formatRupiah(pkg.price / totalCredits)}/credit (dgn bonus)`
          : `${formatRupiah(pkg.price / pkg.credits)}/credit`}
      </div>

      <Button
        onClick={onBuy}
        disabled={buying}
        className={cn(
          "mt-4 w-full gap-1.5",
          recommended
            ? "bg-teal hover:bg-teal-600 text-white"
            : "bg-ink text-white hover:bg-ink-700"
        )}
      >
        {buying ? (
          <>
            <span className="size-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            Memproses…
          </>
        ) : (
          <>Beli {pkg.label}</>
        )}
      </Button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Rates info card
// ─────────────────────────────────────────────────────────────────────────────
function RatesInfoCard() {
  const grouped = useMemo(() => {
    const g: Record<string, typeof CREDIT_RATES> = {};
    for (const r of CREDIT_RATES) {
      (g[r.module] ||= []).push(r);
    }
    return g;
  }, []);

  return (
    <SectionCard
      title="Tarif Credit per Aksi"
      desc="Biaya credit untuk setiap operasi AI di seluruh modul"
      right={
        <Badge variant="outline" className="text-[10px] gap-1 border-teal/30 text-teal">
          <Sparkles className="size-3" /> Context creation = 0
        </Badge>
      }
      bodyClassName="p-0"
    >
      <div className="divide-y divide-border">
        {Object.entries(grouped).map(([mod, rates]) => (
          <div key={mod} className="px-5 py-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base">{MODULE_ICON[mod] ?? "•"}</span>
              <h4 className="font-bold text-ink text-sm">{MODULE_LABEL[mod] ?? mod}</h4>
              <Badge
                variant="outline"
                className={cn("text-[10px] ml-auto", MODULE_COLOR[mod])}
              >
                {rates.length} aksi
              </Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {rates.map((r) => (
                <div
                  key={r.key}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-cream-100/60 border border-border/60"
                >
                  <div className="text-sm font-medium text-ink-700 truncate">{r.name}</div>
                  <div className="inline-flex items-center gap-1 text-xs font-bold text-teal bg-teal-100 px-2 py-0.5 rounded-md shrink-0">
                    <Zap className="size-3 fill-teal" /> {r.cost}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="px-5 py-3 bg-cream-100/60 border-t border-border text-xs text-stone flex items-start gap-2">
        <Info className="size-3.5 mt-0.5 shrink-0 text-teal" />
        <span>
          <b className="text-ink-700">Context creation = 0 credit</b> — turunan konten
          otomatis dari hasil riset selalu gratis. Kamu cuma bayar saat generate output
          baru.
        </span>
      </div>
    </SectionCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Usage history table
// ─────────────────────────────────────────────────────────────────────────────
type FilterKey = "all" | "charged" | "refunded" | "topup";

function UsageHistory({ logs }: { logs: UsageLog[] }) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [q, setQ] = useState("");

  const monthChargedTotal = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return logs
      .filter(
        (l) =>
          !isTopup(l) &&
          l.status === "charged" &&
          new Date(l.createdAt) >= startOfMonth
      )
      .reduce((sum, l) => sum + l.creditCost, 0);
  }, [logs]);

  const filtered = useMemo(() => {
    let list = logs;
    if (filter === "topup") list = list.filter((l) => isTopup(l));
    else if (filter === "charged") list = list.filter((l) => !isTopup(l) && l.status === "charged");
    else if (filter === "refunded") list = list.filter((l) => l.status === "refunded");

    const query = q.trim().toLowerCase();
    if (query) {
      list = list.filter((l) => {
        const name = friendlyAction(l).toLowerCase();
        return name.includes(query) || l.actionKey.toLowerCase().includes(query);
      });
    }
    return list;
  }, [logs, filter, q]);

  return (
    <SectionCard
      title="Riwayat Pemakaian"
      desc="Semua transaksi credit (top up, terpakai, refund)"
      right={
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-stone font-bold">
            Terpakai Bulan Ini
          </div>
          <div className="text-lg font-extrabold text-ink tabular-nums leading-tight">
            {monthChargedTotal}{" "}
            <span className="text-xs font-semibold text-stone">credit</span>
          </div>
        </div>
      }
      bodyClassName="p-0"
    >
      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-2 px-5 py-3 border-b border-border bg-cream-100/40">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-stone" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari aksi (mis. caption, riset, top up)…"
            className="pl-8 h-8 text-sm bg-card"
          />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as FilterKey)}>
          <SelectTrigger size="sm" className="w-full sm:w-40 h-8 bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua</SelectItem>
            <SelectItem value="topup">Top Up</SelectItem>
            <SelectItem value="charged">Terpakai</SelectItem>
            <SelectItem value="refunded">Refund</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="max-h-[480px] overflow-y-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10">
            <TableRow>
              <TableHead className="pl-5">Tanggal</TableHead>
              <TableHead>Aksi</TableHead>
              <TableHead className="text-right">Credit</TableHead>
              <TableHead className="text-right">Sisa</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="pr-5">Referensi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-stone">
                  <div className="text-2xl mb-1">🪹</div>
                  <div className="text-sm font-medium">Tidak ada transaksi</div>
                  <div className="text-xs">Coba ubah filter atau kata kunci pencarian.</div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((log) => {
                const topup = isTopup(log);
                const positive = topup || log.status === "refunded";
                const delta = topup ? log.creditCost : log.creditCost;
                return (
                  <TableRow key={log.id} className="text-sm">
                    <TableCell className="pl-5 text-xs text-stone whitespace-nowrap">
                      <div>{new Date(log.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</div>
                      <div className="text-[10px] text-stone-300">
                        {new Date(log.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-ink-700">
                      {friendlyAction(log)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span
                        className={cn(
                          "inline-flex items-center gap-0.5 font-bold",
                          positive ? "text-emerald-700" : "text-rose-600"
                        )}
                      >
                        {positive ? (
                          <ArrowUpRight className="size-3" />
                        ) : (
                          <ArrowDownRight className="size-3" />
                        )}
                        {positive ? "+" : "−"}
                        {delta}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-ink-700 font-medium">
                      {log.balanceAfter}
                    </TableCell>
                    <TableCell>
                      {topup ? (
                        <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 gap-1">
                          <TrendingUp className="size-3" /> Top Up
                        </Badge>
                      ) : log.status === "charged" ? (
                        <Badge className="bg-rose-100 text-rose-700 border border-rose-200">
                          Terpakai
                        </Badge>
                      ) : log.status === "refunded" ? (
                        <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200">
                          Refund
                        </Badge>
                      ) : (
                        <Badge variant="outline">{log.status}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="pr-5 text-xs text-stone-300 font-mono truncate max-w-[160px]">
                      {log.referenceId ?? "—"}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </SectionCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main section
// ─────────────────────────────────────────────────────────────────────────────
export function CreditSection() {
  const { user, setCredit } = useAppStore();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [buyingId, setBuyingId] = useState<string | null>(null);

  const { data: pkgData, isLoading: pkgLoading } = useQuery<PackagesResponse>({
    queryKey: ["credit-packages"],
    queryFn: () => api<PackagesResponse>("/api/credit/packages"),
    staleTime: 5 * 60 * 1000,
  });

  const { data: logData, isLoading: logLoading } = useQuery<UsageLogResponse>({
    queryKey: ["credit-usage-log"],
    queryFn: () => api<UsageLogResponse>("/api/credit/usage-log"),
    refetchInterval: 30_000,
  });

  const balance = user?.creditBalance ?? 0;
  const lastUpdated = logData?.logs?.[0]?.createdAt ?? new Date().toISOString();

  async function handleBuy(pkg: (typeof CREDIT_PACKAGES)[number]) {
    if (buyingId) return;
    setBuyingId(pkg.id);
    try {
      const r = await api<{ balance: number; packageId: string; price: number }>(
        "/api/credit/topup",
        {
          method: "POST",
          json: { packageId: pkg.id, credits: pkg.credits, price: pkg.price },
        }
      );
      setCredit(r.balance);
      await qc.invalidateQueries({ queryKey: ["credit-usage-log"] });
      toast({
        title: "Top Up berhasil 🎉",
        description: `+${pkg.credits + (pkg.bonus || 0)} credit · ${formatRupiah(pkg.price)}`,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal top up";
      toast({ title: "Top Up gagal", description: msg, variant: "destructive" });
    } finally {
      setBuyingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Credit"
        subtitle="Saldo & riwayat pemakaian credit"
        icon="⚡"
        actions={
          <Badge variant="outline" className="gap-1 border-teal/30 text-teal">
            <Zap className="size-3 fill-teal" /> {balance} credit
          </Badge>
        }
      />

      {/* Hero */}
      <HeroBalance
        balance={balance}
        lastUpdated={lastUpdated}
        onTopUp={() =>
          document
            .getElementById("packages")
            ?.scrollIntoView({ behavior: "smooth", block: "start" })
        }
      />

      {/* Empty state CTA */}
      {balance === 0 && (
        <div className="rounded-2xl border border-dashed border-rose-200 bg-rose-50/40 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="size-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center text-xl shrink-0">
            ⚠️
          </div>
          <div className="flex-1">
            <div className="font-bold text-ink">Credit habis — Top Up sekarang</div>
            <p className="text-sm text-stone mt-0.5">
              Beberapa fitur AI (riset, konten, broadcast, proyeksi) tidak bisa dipakai
              sampai saldo terisi. Pilih paket di bawah untuk langsung lanjut kerja.
            </p>
          </div>
          <Button
            className="bg-rose-600 hover:bg-rose-700 text-white shrink-0"
            onClick={() =>
              document
                .getElementById("packages")
                ?.scrollIntoView({ behavior: "smooth", block: "start" })
            }
          >
            Pilih Paket
          </Button>
        </div>
      )}

      {/* Packages grid */}
      <div id="packages" className="scroll-mt-4">
        <div className="flex items-end justify-between mb-3">
          <div>
            <h3 className="font-bold text-ink">Paket Credit</h3>
            <p className="text-xs text-stone mt-0.5">
              Sekali beli, langsung masuk ke saldo. Tanpa kedaluwarsa.
            </p>
          </div>
          <Badge variant="outline" className="text-[10px] gap-1">
            <Sparkles className="size-3" /> Bonus credit untuk paket besar
          </Badge>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {pkgLoading || !pkgData
            ? [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-44 rounded-2xl" />)
            : pkgData.packages.map((pkg) => (
                <PackageCard
                  key={pkg.id}
                  pkg={pkg}
                  recommended={pkg.id === "growth"}
                  onBuy={() => handleBuy(pkg)}
                  buying={buyingId === pkg.id}
                />
              ))}
        </div>
      </div>

      {/* Usage history */}
      {logLoading ? (
        <SectionCard title="Riwayat Pemakaian" bodyClassName="p-0">
          <div className="p-5 space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </SectionCard>
      ) : logData && logData.logs.length > 0 ? (
        <UsageHistory logs={logData.logs} />
      ) : (
        <SectionCard title="Riwayat Pemakaian" bodyClassName="p-0">
          <div className="p-10">
            <EmptyState
              icon={<History className="size-6 text-stone" />}
              title="Belum ada transaksi"
              desc="Saat kamu top up atau memakai fitur AI, semua transaksi credit akan muncul di sini."
            />
          </div>
        </SectionCard>
      )}

      {/* Rates info */}
      <div id="rates-info" className="scroll-mt-4">
        <RatesInfoCard />
      </div>
    </div>
  );
}

export default CreditSection;
