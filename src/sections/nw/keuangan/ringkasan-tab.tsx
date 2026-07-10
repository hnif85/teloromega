"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { StatCard, SectionCard, EmptyState } from "@/components/nw/primitives";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  Wallet,
  Receipt,
  AlertTriangle,
  Calculator,
  ArrowUpRight,
  ArrowDownRight,
  PiggyBank,
} from "lucide-react";
import { api } from "@/lib/api";
import { formatRupiah, formatRupiahShort } from "@/lib/constants";
import type { SummaryResponse } from "./types";

const EXPENSE_COLORS = ["#0D9488", "#F97316", "#A855F7", "#EAB308", "#EF4444", "#6B7280", "#06B6D4"];

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

  const expenseData = data.byCategory
    .filter((c) => c.expense > 0)
    .map((c) => ({ name: c.category, value: c.expense }));

  const trendData = data.monthlyTrend.map((m) => ({
    ...m,
    profitLabel: formatRupiahShort(m.profit),
  }));

  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Total Pendapatan"
          value={formatRupiahShort(data.totalIncome)}
          icon={<ArrowUpRight className="size-4" />}
          accent="success"
        />
        <StatCard
          label="Total Pengeluaran"
          value={formatRupiahShort(data.totalExpense + data.totalHPP)}
          icon={<ArrowDownRight className="size-4" />}
          accent="warning"
        />
        <StatCard
          label="Laba Kotor"
          value={formatRupiahShort(data.grossProfit)}
          icon={<TrendingUp className="size-4" />}
          accent="teal"
          trend={{
            value: `${data.marginPct}%`,
            up: data.marginPct >= 0,
          }}
        />
        <StatCard
          label="Laba Bersih"
          value={formatRupiahShort(data.netProfit)}
          icon={<Wallet className="size-4" />}
          accent={data.netProfit >= 0 ? "success" : "warning"}
          trend={{
            value: `${((data.netProfit / Math.max(data.totalIncome, 1)) * 100).toFixed(0)}%`,
            up: data.netProfit >= 0,
          }}
        />
      </div>

      {/* Cash flow + Pajak */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SectionCard
          title="Arus Kas"
          desc="Cash flow periode ini"
          className={data.cashFlow.warning ? "border-rose-300" : ""}
        >
          <div className="space-y-3">
            {data.cashFlow.warning && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2.5 flex items-start gap-2">
                <AlertTriangle className="size-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="text-xs text-rose-700">
                  <div className="font-bold">Arus kas negatif</div>
                  <div className="mt-0.5">
                    Pengeluaran melebihi pemasukan periode ini. Pertimbangkan menunda pengeluaran
                    non-urgent atau percepat penagihan piutang.
                  </div>
                </div>
              </div>
            )}
            <CashFlowRow label="Pemasukan" value={data.cashFlow.inflow} type="in" />
            <CashFlowRow label="Pengeluaran" value={data.cashFlow.outflow} type="out" />
            <div className="border-t border-border pt-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-ink">Arus Kas Bersih</span>
              <span
                className={`text-lg font-extrabold tabular-nums ${
                  data.cashFlow.net >= 0 ? "text-emerald-700" : "text-rose-700"
                }`}
              >
                {formatRupiah(data.cashFlow.net)}
              </span>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Estimasi Pajak"
          desc="PPh 0,5% UMKM + PPN 11%"
          className="lg:col-span-2"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <TaxCard
              label="PPh Final 0,5%"
              value={data.taxEstimate.pphUmkm}
              desc="PP 23/2018 (UMKM)"
            />
            <TaxCard
              label="PPN 11%"
              value={data.taxEstimate.ppnEstimate}
              desc="Atas penjualan kena pajak"
            />
            <TaxCard
              label="Total Estimasi"
              value={data.taxEstimate.total}
              desc="Sediakan dana bulanan"
              highlight
            />
          </div>
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
            <Calculator className="size-3.5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-700 leading-relaxed">{data.taxEstimate.note}</p>
          </div>
        </SectionCard>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <SectionCard
          title="Tren 6 Bulan"
          desc="Pendapatan vs Pengeluaran vs Laba"
          className="lg:col-span-3"
        >
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trendData} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#78716C" }} axisLine={false} tickLine={false} />
                <YAxis
                  tickFormatter={(v) => formatRupiahShort(Number(v))}
                  tick={{ fontSize: 11, fill: "#78716C" }}
                  axisLine={false}
                  tickLine={false}
                  width={64}
                />
                <RTooltip
                  formatter={(v: number, n: string) => [formatRupiah(Number(v)), n]}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid #E7E5E4",
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="income" name="Pendapatan" fill="#0D9488" radius={[6, 6, 0, 0]} barSize={14} />
                <Bar dataKey="expense" name="Pengeluaran" fill="#F97316" radius={[6, 6, 0, 0]} barSize={14} />
                <Line
                  type="monotone"
                  dataKey="profit"
                  name="Laba"
                  stroke="#7C3AED"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#7C3AED" }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard
          title="Breakdown Pengeluaran"
          desc="Per kategori"
          className="lg:col-span-2"
        >
          {expenseData.length === 0 ? (
            <div className="h-72 flex flex-col items-center justify-center text-center">
              <Receipt className="size-8 text-stone mb-2" />
              <p className="text-sm text-stone">Belum ada pengeluaran tercatat</p>
              <p className="text-xs text-stone mt-1">Catat biaya untuk melihat breakdown.</p>
            </div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={40}
                    paddingAngle={2}
                  >
                    {expenseData.map((_, i) => (
                      <Cell key={i} fill={EXPENSE_COLORS[i % EXPENSE_COLORS.length]} />
                    ))}
                  </Pie>
                  <RTooltip
                    formatter={(v: number, n: string) => [formatRupiah(Number(v)), n]}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #E7E5E4",
                      fontSize: 12,
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 11 }}
                    formatter={(value) => (
                      <span className="text-[11px] text-ink">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>
      </div>

      {/* Incomplete margin warning */}
      {data.incompleteMarginCount > 0 && (
        <SectionCard
          title="⚠️ Margin Belum Lengkap"
          desc={`${data.incompleteMarginCount} transaksi penjualan tanpa data HPP`}
        >
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
                <Button
                  size="sm"
                  variant="outline"
                  className="border-amber-300 text-amber-700 hover:bg-amber-100 h-7 text-xs"
                >
                  Tambah Modal
                </Button>
              </div>
            ))}
          </div>
        </SectionCard>
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

function CashFlowRow({
  label,
  value,
  type,
}: {
  label: string;
  value: number;
  type: "in" | "out";
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-stone">{label}</span>
      <span
        className={`text-sm font-bold tabular-nums flex items-center gap-1 ${
          type === "in" ? "text-emerald-700" : "text-rose-700"
        }`}
      >
        {type === "in" ? "+" : "−"}
        {formatRupiah(value)}
      </span>
    </div>
  );
}

function TaxCard({
  label,
  value,
  desc,
  highlight,
}: {
  label: string;
  value: number;
  desc: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        highlight
          ? "border-teal-300 bg-teal-50"
          : "border-border bg-background"
      }`}
    >
      <div className="text-xs text-stone">{label}</div>
      <div
        className={`text-lg font-extrabold tabular-nums mt-1 ${
          highlight ? "text-teal-700" : "text-ink"
        }`}
      >
        {formatRupiah(value)}
      </div>
      <div className="text-[11px] text-stone mt-0.5">{desc}</div>
    </div>
  );
}
