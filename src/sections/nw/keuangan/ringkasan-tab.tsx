"use client";

import { useQuery } from "@tanstack/react-query";
import { EmptyState } from "@/components/nw/primitives";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  PiggyBank,
} from "lucide-react";
import { api } from "@/lib/api";
import { formatRupiah, formatRupiahShort } from "@/lib/constants";
import type { SummaryResponse } from "./types";

export function RingkasanTab({
  brandId,
  period,
}: {
  brandId: string;
  period: "month" | "quarter" | "year";
}) {
  const { data, isLoading, isError } = useQuery<SummaryResponse>({
    queryKey: ["keuangan-summary", brandId, period],
    queryFn: () =>
      api<SummaryResponse>(`/api/transactions/summary?brandId=${brandId}&period=${period}`),
    enabled: !!brandId,
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }
  if (isError || !data) {
    return (
      <EmptyState
        icon="⚠️"
        title="Gagal memuat ringkasan"
        desc="Coba refresh halaman atau periksa koneksi internet kamu."
      />
    );
  }

  return (
    <div className="space-y-3">
      {/* Compact stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {/* Pendapatan */}
        <div className="rounded-xl border border-border bg-cream-50/50 p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="size-6 rounded-md bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <ArrowUpRight className="size-3.5" />
            </div>
            <span className="text-[10px] text-stone font-medium">Pendapatan</span>
          </div>
          <div className="text-lg font-extrabold text-ink tabular-nums">{formatRupiahShort(data.totalIncome)}</div>
        </div>
        {/* Pengeluaran */}
        <div className="rounded-xl border border-border bg-cream-50/50 p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="size-6 rounded-md bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <ArrowDownRight className="size-3.5" />
            </div>
            <span className="text-[10px] text-stone font-medium">Pengeluaran</span>
          </div>
          <div className="text-lg font-extrabold text-ink tabular-nums">{formatRupiahShort(data.totalExpense + data.totalHPP)}</div>
        </div>
        {/* Laba Kotor */}
        <div className="rounded-xl border border-border bg-cream-50/50 p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="size-6 rounded-md bg-teal-100 text-teal-600 flex items-center justify-center shrink-0">
              <TrendingUp className="size-3.5" />
            </div>
            <span className="text-[10px] text-stone font-medium">Laba Kotor</span>
          </div>
          <div className="text-lg font-extrabold text-ink tabular-nums">{formatRupiahShort(data.grossProfit)}</div>
        </div>
        {/* Laba Bersih + Arus Kas */}
        <div className={`rounded-xl border p-3 ${data.cashFlow.net >= 0 ? "border-emerald-200 bg-emerald-50/40" : "border-rose-200 bg-rose-50/40"}`}>
          <div className="flex items-center gap-2 mb-1">
            <div className={`size-6 rounded-md flex items-center justify-center shrink-0 ${data.netProfit >= 0 ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"}`}>
              <Wallet className="size-3.5" />
            </div>
            <span className="text-[10px] text-stone font-medium">Laba Bersih</span>
          </div>
          <div className={`text-lg font-extrabold tabular-nums ${data.netProfit >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
            {formatRupiahShort(data.netProfit)}
          </div>
          <div className={`text-[10px] font-medium mt-0.5 ${data.cashFlow.net >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {data.cashFlow.net >= 0 ? "▲" : "▼"} Arus Kas: {formatRupiahShort(data.cashFlow.net)}
          </div>
        </div>
      </div>

      {/* Incomplete margin warning */}
      {data.incompleteMarginCount > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-sm font-bold text-ink mb-1">⚠️ Margin Belum Lengkap</div>
          <div className="text-xs text-stone mb-3">{data.incompleteMarginCount} transaksi penjualan tanpa data HPP</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.incompleteMarginProducts.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5"
              >
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                    <PiggyBank className="size-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-ink">{p.name}</div>
                    <div className="text-[11px] text-stone">
                      {p.count} transaksi · modal belum diisi
                    </div>
                  </div>
                </div>
                <button className="text-xs text-amber-700 font-medium hover:underline">Tambah Modal</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state when no data */}
      {data.totalIncome === 0 && data.totalExpense === 0 && (
        <EmptyState
          icon="📊"
          title="Belum ada transaksi"
          desc="Catat transaksi pertama kamu di tab Transaksi untuk melihat ringkasan keuangan."
        />
      )}
    </div>
  );
}


