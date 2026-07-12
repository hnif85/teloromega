"use client";

// ─────────────────────────────────────────────────────────────────────────────
// KeuanganSection — single‑page mobile‑first financial dashboard
// Collapsible sections: summary → expanded tab content
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore, getActiveBrand } from "@/lib/store";
import { api } from "@/lib/api";
import type { ProductLite } from "./keuangan/transaksi-tab";
import { PageHeader, EmptyState } from "@/components/nw/primitives";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatRupiah, formatRupiahShort, timeAgo } from "@/lib/constants";
import {
  ChevronDown,
  Plus,
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowRightLeft,
  Calculator,
} from "lucide-react";
import { RingkasanTab } from "./keuangan/ringkasan-tab";
import { TransaksiTab, AddTransactionDialog } from "./keuangan/transaksi-tab";
import { ProyeksiTab } from "./keuangan/proyeksi-tab";
import type { PeriodKey } from "./keuangan/types";

// ─── Collapsible Section ────────────────────────────────────────────────────
function CollapsibleSection({
  open,
  onToggle,
  title,
  icon,
  children,
  summary,
}: {
  open: boolean;
  onToggle: () => void;
  title: string;
  icon: string;
  children: React.ReactNode;
  summary?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-cream-50/50 transition-colors text-left"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-lg">{icon}</span>
          <span className="text-sm font-bold text-ink">{title}</span>
        </div>
        <ChevronDown
          className={cn("size-4 text-stone/50 transition-transform", open && "rotate-180")}
        />
      </button>
      {!open && summary && <div className="px-4 pb-3">{summary}</div>}
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

// ─── Stat Card Mini ─────────────────────────────────────────────────────────
function StatMini({
  label,
  value,
  icon,
  green,
  red,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  green?: boolean;
  red?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 p-3 rounded-lg bg-cream-50/60">
      <div className={cn("size-9 rounded-lg flex items-center justify-center shrink-0", green ? "bg-emerald-100 text-emerald-600" : red ? "bg-rose-100 text-rose-600" : "bg-teal-100 text-teal-600")}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[10px] text-stone font-medium">{label}</div>
        <div className={cn("text-sm font-bold tabular-nums", green && "text-emerald-700", red && "text-rose-700")}>{value}</div>
      </div>
    </div>
  );
}

// ─── Section: Ringkasan (4 stats + piutang/biaya inline) ────────────────────
function RingkasanSection({ brandId, period, open, onToggle }: { brandId: string; period: PeriodKey; open: boolean; onToggle: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["keuangan-summary", brandId, period],
    queryFn: () => api<{ totalIncome: number; totalExpense: number; netProfit: number; cashFlow: { net: number } }>(`/api/transactions/summary?brandId=${brandId}&period=${period}`),
    enabled: !!brandId,
  });
  const { data: rec } = useQuery({
    queryKey: ["keuangan-receivables", brandId],
    queryFn: () => api<{ receivables: { amount: number }[] }>(`/api/receivables?brandId=${brandId}&status=outstanding`),
    enabled: !!brandId,
  });
  const { data: pay } = useQuery({
    queryKey: ["keuangan-payables", brandId],
    queryFn: () => api<{ payables: { amount: number }[] }>(`/api/payables?brandId=${brandId}&status=outstanding`),
    enabled: !!brandId,
  });
  const { data: op } = useQuery({
    queryKey: ["keuangan-opcost", brandId],
    queryFn: () => api<{ stats: { bulanIni: { total: number; itemCount: number } } }>(`/api/operational-costs?brandId=${brandId}`),
    enabled: !!brandId,
  });

  const s = data;
  const laba = s?.netProfit ?? 0;
  const piutangTotal = rec?.receivables?.reduce((a, r) => a + r.amount, 0) ?? 0;
  const piutangCount = rec?.receivables?.length ?? 0;
  const hutangTotal = pay?.payables?.reduce((a, p) => a + p.amount, 0) ?? 0;
  const hutangCount = pay?.payables?.length ?? 0;
  const biayaTotal = op?.stats?.bulanIni?.total ?? 0;
  const biayaCount = op?.stats?.bulanIni?.itemCount ?? 0;

  const summary = (
    <div>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <StatMini label="Pendapatan" value={isLoading ? "..." : formatRupiahShort(s?.totalIncome ?? 0)} icon={<TrendingUp className="size-4" />} green />
        <StatMini label="Pengeluaran" value={isLoading ? "..." : formatRupiahShort(s?.totalExpense ?? 0)} icon={<TrendingDown className="size-4" />} red />
        <StatMini label={laba >= 0 ? "Laba Bersih" : "Rugi Bersih"} value={isLoading ? "..." : formatRupiahShort(laba)} icon={<Wallet className="size-4" />} green={laba >= 0} red={laba < 0} />
        <StatMini label="Arus Kas" value={isLoading ? "..." : (s?.cashFlow?.net ?? 0) >= 0 ? `+${formatRupiahShort(s?.cashFlow?.net ?? 0)}` : formatRupiahShort(s?.cashFlow?.net ?? 0)} icon={<ArrowRightLeft className="size-4" />} />
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs text-stone">
        {piutangCount > 0 && (
          <div className="flex flex-col items-center p-2 rounded-lg bg-emerald-50/60">
            <span>📥 Piutang</span>
            <strong className="text-emerald-700">{formatRupiahShort(piutangTotal)}</strong>
            <span>({piutangCount})</span>
          </div>
        )}
        {hutangCount > 0 && (
          <div className="flex flex-col items-center p-2 rounded-lg bg-amber-50/60">
            <span>📤 Hutang</span>
            <strong className="text-amber-700">{formatRupiahShort(hutangTotal)}</strong>
            <span>({hutangCount})</span>
          </div>
        )}
        {biayaCount > 0 && (
          <div className="flex flex-col items-center p-2 rounded-lg bg-cream-50/60">
            <span>💸 Biaya</span>
            <strong className="text-ink">{formatRupiahShort(biayaTotal)}</strong>
            <span>/bln ({biayaCount} item)</span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <CollapsibleSection open={open} onToggle={onToggle} title="Ringkasan" icon="📊" summary={summary}>
      <RingkasanTab brandId={brandId} period={period} />
    </CollapsibleSection>
  );
}

// ─── Section: Transaksi (cards + sub-tabs: semua / piutang & hutang / biaya) ─
function TransaksiSection({ brandId, open, onToggle }: { brandId: string; open: boolean; onToggle: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["keuangan-recent-tx", brandId],
    queryFn: () => api<{ transactions: { id: string; type: string; category: string; description: string | null; amount: number; date: string }[] }>(`/api/transactions?brandId=${brandId}&limit=5`),
    enabled: !!brandId,
  });

  const txs = data?.transactions ?? [];

  const summary = isLoading ? (
    <div className="space-y-2">{[1,2,3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
  ) : txs.length === 0 ? (
    <div className="text-center py-4 text-xs text-stone">Belum ada transaksi</div>
  ) : (
    <div className="space-y-2">
      {txs.map((tx) => (
        <div key={tx.id} className="rounded-xl border border-border bg-cream-50/50 px-3 py-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className={cn("size-7 rounded-lg flex items-center justify-center", tx.type === "income" ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600")}>
                {tx.type === "income" ? "📥" : "📤"}
              </span>
              <div>
                <div className="text-sm font-semibold text-ink truncate">{tx.description || tx.category.replace(/_/g, " ")}</div>
                <div className="text-[10px] text-stone">{timeAgo(tx.date)}</div>
              </div>
            </div>
            <span className={cn("text-sm font-bold tabular-nums shrink-0 ml-2", tx.type === "income" ? "text-emerald-600" : "text-rose-600")}>
              {tx.type === "income" ? "+" : "-"}{formatRupiahShort(tx.amount)}
            </span>
          </div>
        </div>
      ))}
      {txs.length > 0 && (
        <button onClick={onToggle} className="w-full text-center text-xs text-teal font-medium py-1 hover:underline">
          Lihat Semua ({txs.length}+ transaksi) →
        </button>
      )}
    </div>
  );

  return (
    <CollapsibleSection open={open} onToggle={onToggle} title="Transaksi" icon="🧾" summary={summary}>
      <TransaksiTab brandId={brandId} />
    </CollapsibleSection>
  );
}

// ─── Section: Proyeksi ──────────────────────────────────────────────────────
function ProyeksiSection({ brandId, open, onToggle }: { brandId: string; open: boolean; onToggle: () => void }) {
  return (
    <CollapsibleSection
      open={open}
      onToggle={onToggle}
      title="Proyeksi Keuangan"
      icon="🔮"
      summary={
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-50/60">
          <Calculator className="size-4 text-violet-500" />
          <span className="text-xs text-violet-700 font-medium">Proyeksi laba rugi & break‑even (3 credit)</span>
        </div>
      }
    >
      <ProyeksiTab brandId={brandId} />
    </CollapsibleSection>
  );
}


// ─── Main Component ─────────────────────────────────────────────────────────
const SECTION_KEYS = ["ringkasan", "transaksi", "proyeksi"] as const;

export function KeuanganSection() {
  const activeBrand = getActiveBrand(useAppStore.getState());
  const [period, setPeriod] = useState<PeriodKey>("month");
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["ringkasan"]));
  const [addOpen, setAddOpen] = useState(false);
  const qc = useQueryClient();

  function onQuickCreated() {
    qc.invalidateQueries({ queryKey: ["keuangan-summary"] });
    qc.invalidateQueries({ queryKey: ["keuangan-recent-tx"] });
  }

  function toggle(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function expandAll() {
    setExpanded(new Set(SECTION_KEYS));
  }

  function collapseAll() {
    setExpanded(new Set());
  }

  const { data: productsData } = useQuery<{ products: ProductLite[] }>({
    queryKey: ["keuangan-products", activeBrand?.id],
    queryFn: () => api(`/api/products?brandId=${activeBrand?.id}`),
    enabled: !!activeBrand?.id,
  });
  const products = productsData?.products ?? [];

  if (!activeBrand) {
    return (
      <div>
        <PageHeader title="Keuangan" subtitle="Catat transaksi & analisa laba rugi" icon="💰" />
        <EmptyState icon="🏪" title="Belum ada brand" desc="Buat brand terlebih dahulu di Beranda." />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <PageHeader title="Keuangan" icon="💰" subtitle={`${activeBrand.name}`} />
        <div className="flex items-center gap-2 shrink-0">
          <div className="grid grid-cols-3 gap-1 bg-cream-100 p-1 rounded-lg">
            {(["month", "quarter", "year"] as PeriodKey[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  "py-1.5 rounded-md text-[11px] font-semibold transition-colors",
                  period === p ? "bg-white text-teal shadow-sm" : "text-stone hover:text-ink"
                )}
              >
                {p === "month" ? "Bln" : p === "quarter" ? "Krtl" : "Thn"}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={expandAll}>Buka Semua</Button>
            <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={collapseAll}>Tutup</Button>
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-2">
        <RingkasanSection brandId={activeBrand.id} period={period} open={expanded.has("ringkasan")} onToggle={() => toggle("ringkasan")} />
        <TransaksiSection brandId={activeBrand.id} open={expanded.has("transaksi")} onToggle={() => toggle("transaksi")} />
        <ProyeksiSection brandId={activeBrand.id} open={expanded.has("proyeksi")} onToggle={() => toggle("proyeksi")} />
      </div>

      {/* FAB */}
      <button onClick={() => setAddOpen(true)} className="fixed bottom-20 right-4 z-30 size-14 rounded-full bg-teal hover:bg-teal-600 text-white shadow-lg flex items-center justify-center transition-all active:scale-95 md:bottom-8" aria-label="Tambah transaksi">
        <Plus className="size-7" />
      </button>

      <AddTransactionDialog
        brandId={activeBrand.id}
        products={products}
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={onQuickCreated}
      />
    </div>
  );
}

export default KeuanganSection;
