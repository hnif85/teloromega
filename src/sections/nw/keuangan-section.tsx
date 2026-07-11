"use client";

// ─────────────────────────────────────────────────────────────────────────────
// KeuanganSection — single‑page mobile‑first financial dashboard
// Collapsible sections: summary → expanded tab content
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppStore, getActiveBrand } from "@/lib/store";
import { api } from "@/lib/api";
import { PageHeader, EmptyState } from "@/components/nw/primitives";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatRupiah, formatRupiahShort } from "@/lib/constants";
import {
  ChevronDown,
  Plus,
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowRightLeft,
  Receipt,
  FileText,
  Sparkles,
  Calculator,
} from "lucide-react";
import { RingkasanTab } from "./keuangan/ringkasan-tab";
import { TransaksiTab } from "./keuangan/transaksi-tab";
import { PiutangHutangTab } from "./keuangan/piutang-hutang-tab";
import { BiayaOperasionalTab } from "./keuangan/biaya-operasional-tab";
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

// ─── Section: Ringkasan ─────────────────────────────────────────────────────
function RingkasanSection({ brandId, period, open, onToggle }: { brandId: string; period: PeriodKey; open: boolean; onToggle: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["keuangan-summary", brandId, period],
    queryFn: () => api<{ totalIncome: number; totalExpense: number; netProfit: number; cashFlow: { net: number }; grossProfit: number; marginPct: number }>(`/api/transactions/summary?brandId=${brandId}&period=${period}`),
    enabled: !!brandId,
  });

  const s = data;
  const laba = s?.netProfit ?? 0;

  const summary = (
    <div className="grid grid-cols-2 gap-2">
      <StatMini label="Pendapatan" value={isLoading ? "..." : formatRupiahShort(s?.totalIncome ?? 0)} icon={<TrendingUp className="size-4" />} green />
      <StatMini label="Pengeluaran" value={isLoading ? "..." : formatRupiahShort(s?.totalExpense ?? 0)} icon={<TrendingDown className="size-4" />} red />
      <StatMini label={laba >= 0 ? "Laba Bersih" : "Rugi Bersih"} value={isLoading ? "..." : formatRupiahShort(laba)} icon={<Wallet className="size-4" />} green={laba >= 0} red={laba < 0} />
      <StatMini label="Arus Kas" value={isLoading ? "..." : (s?.cashFlow?.net ?? 0) >= 0 ? `+${formatRupiahShort(s?.cashFlow?.net ?? 0)}` : formatRupiahShort(s?.cashFlow?.net ?? 0)} icon={<ArrowRightLeft className="size-4" />} />
    </div>
  );

  return (
    <CollapsibleSection open={open} onToggle={onToggle} title="Ringkasan" icon="📊" summary={summary}>
      <RingkasanTab brandId={brandId} period={period} />
    </CollapsibleSection>
  );
}

// ─── Section: Piutang & Hutang ──────────────────────────────────────────────
function PiutangHutangSection({ brandId, open, onToggle }: { brandId: string; open: boolean; onToggle: () => void }) {
  const { data: rec } = useQuery({
    queryKey: ["keuangan-receivables", brandId],
    queryFn: () => api<{ receivables: { amount: number; status: string }[] }>(`/api/receivables?brandId=${brandId}&status=outstanding`),
    enabled: !!brandId,
  });
  const { data: pay } = useQuery({
    queryKey: ["keuangan-payables", brandId],
    queryFn: () => api<{ payables: { amount: number; status: string }[] }>(`/api/payables?brandId=${brandId}&status=outstanding`),
    enabled: !!brandId,
  });

  const piutangTotal = rec?.receivables?.reduce((s, r) => s + r.amount, 0) ?? 0;
  const piutangCount = rec?.receivables?.length ?? 0;
  const hutangTotal = pay?.payables?.reduce((s, p) => s + p.amount, 0) ?? 0;
  const hutangCount = pay?.payables?.length ?? 0;

  const summary = (
    <div className="grid grid-cols-2 gap-2">
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50/60">
        <span className="text-sm">📥</span>
        <div>
          <div className="text-xs font-bold text-emerald-700">{formatRupiahShort(piutangTotal)}</div>
          <div className="text-[10px] text-stone">Piutang ({piutangCount})</div>
        </div>
      </div>
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50/60">
        <span className="text-sm">📤</span>
        <div>
          <div className="text-xs font-bold text-amber-700">{formatRupiahShort(hutangTotal)}</div>
          <div className="text-[10px] text-stone">Hutang ({hutangCount})</div>
        </div>
      </div>
    </div>
  );

  if (piutangCount === 0 && hutangCount === 0) {
    return (
      <CollapsibleSection open={open} onToggle={onToggle} title="Piutang & Hutang" icon="📥">
        <div className="text-center py-6 text-sm text-stone">Belum ada piutang atau hutang tercatat</div>
      </CollapsibleSection>
    );
  }

  return (
    <CollapsibleSection open={open} onToggle={onToggle} title="Piutang & Hutang" icon="📥" summary={summary}>
      <PiutangHutangTab brandId={brandId} />
    </CollapsibleSection>
  );
}

// ─── Section: Biaya Operasional ─────────────────────────────────────────────
function BiayaSection({ brandId, open, onToggle }: { brandId: string; open: boolean; onToggle: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["keuangan-opcost", brandId],
    queryFn: () => api<{ stats: { bulanIni: { total: number; itemCount: number } } }>(`/api/operational-costs?brandId=${brandId}`),
    enabled: !!brandId,
  });

  const stats = data?.stats?.bulanIni;
  const summary = (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-cream-50/60">
      <Receipt className="size-4 text-stone" />
      <span className="text-sm font-bold text-ink">{isLoading ? "..." : formatRupiahShort(stats?.total ?? 0)}</span>
      <span className="text-xs text-stone">· {stats?.itemCount ?? 0} item bulan ini</span>
    </div>
  );

  return (
    <CollapsibleSection open={open} onToggle={onToggle} title="Biaya Operasional" icon="💸" summary={summary}>
      <BiayaOperasionalTab brandId={brandId} />
    </CollapsibleSection>
  );
}

// ─── Section: Transaksi Terbaru ─────────────────────────────────────────────
function TransaksiRecentSection({ brandId, open, onToggle }: { brandId: string; open: boolean; onToggle: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["keuangan-recent-tx", brandId],
    queryFn: () => api<{ transactions: { id: string; type: string; category: string; description: string | null; amount: number; date: string }[] }>(`/api/transactions?brandId=${brandId}&limit=5`),
    enabled: !!brandId,
  });

  const txs = data?.transactions ?? [];

  const summary = isLoading ? (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full rounded-lg" />)}
    </div>
  ) : txs.length === 0 ? (
    <div className="text-center py-3 text-xs text-stone">Belum ada transaksi</div>
  ) : (
    <div className="space-y-1">
      {txs.slice(0, 3).map((tx) => (
        <div key={tx.id} className="flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-cream-50 transition-colors">
          <div className="flex items-center gap-2 min-w-0">
            <span>{tx.type === "income" ? "📥" : "📤"}</span>
            <span className="text-xs text-ink truncate">{tx.description || tx.category}</span>
          </div>
          <span className={cn("text-xs font-bold tabular-nums shrink-0", tx.type === "income" ? "text-emerald-600" : "text-rose-600")}>
            {tx.type === "income" ? "+" : "-"}{formatRupiahShort(tx.amount)}
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <CollapsibleSection open={open} onToggle={onToggle} title="Transaksi Terbaru" icon="🧾" summary={summary}>
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
const SECTION_KEYS = ["ringkasan", "piutang", "biaya", "transaksi", "proyeksi"] as const;

export function KeuanganSection() {
  const activeBrand = getActiveBrand(useAppStore.getState());
  const [period, setPeriod] = useState<PeriodKey>("month");
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["ringkasan"]));

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
          <div className="flex rounded-lg bg-cream-100 p-0.5">
            {(["month", "quarter", "year"] as PeriodKey[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors",
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
        <PiutangHutangSection brandId={activeBrand.id} open={expanded.has("piutang")} onToggle={() => toggle("piutang")} />
        <BiayaSection brandId={activeBrand.id} open={expanded.has("biaya")} onToggle={() => toggle("biaya")} />
        <TransaksiRecentSection brandId={activeBrand.id} open={expanded.has("transaksi")} onToggle={() => toggle("transaksi")} />
        <ProyeksiSection brandId={activeBrand.id} open={expanded.has("proyeksi")} onToggle={() => toggle("proyeksi")} />
      </div>
    </div>
  );
}

export default KeuanganSection;
