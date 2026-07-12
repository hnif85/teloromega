"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useAppStore, getActiveBrand } from "@/lib/store";
import { api } from "@/lib/api";
import { PageHeader, StatCard, SectionCard, EmptyState } from "@/components/nw/primitives";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRupiah, formatRupiahShort, timeAgo, ORDER_STATUS, PAYMENT_STATUS, type SectionKey } from "@/lib/constants";
import {
  Search,
  Package,
  TrendingUp,
  Zap,
  Users,
  ShoppingCart,
  FileText,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Target,
  Plus,
} from "lucide-react";

// ─── Goal type ────────────────────────────────────────────────
interface Goal {
  id: string;
  brandId: string;
  type: string; // revenue | orders | products | customers | content | research
  period: string; // monthly | quarterly | yearly
  target: number;
  current: number;
  startDate: string;
  endDate: string;
  status: string; // active | achieved | failed | paused
  notes: string | null;
  progress: number;
  createdAt: string;
  updatedAt: string;
}

const GOAL_TYPE_META: Record<
  string,
  { icon: string; label: string; emoji: string }
> = {
  revenue: { icon: "💰", label: "Omzet", emoji: "💰" },
  orders: { icon: "🛒", label: "Order", emoji: "🛒" },
  products: { icon: "📦", label: "Produk Baru", emoji: "📦" },
  customers: { icon: "👥", label: "Customer Baru", emoji: "👥" },
  content: { icon: "📝", label: "Konten", emoji: "📝" },
  research: { icon: "🔍", label: "Riset", emoji: "🔍" },
};

function formatGoalValue(type: string, v: number): string {
  if (type === "revenue") return formatRupiahShort(v);
  return String(Math.round(v));
}

// ─── Stat card wrapper ─
function HeroStatCard({
  children,
  onClick,
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  ariaLabel?: string;
}) {
  const Wrap = onClick ? motion.button : motion.div;
  return (
    <Wrap
      type={onClick ? "button" : undefined}
      aria-label={ariaLabel}
      onClick={onClick}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      className="block text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-teal/40 rounded-2xl"
    >
      <div className="rounded-2xl">{children}</div>
    </Wrap>
  );
}

// ─── Goals widget (Beranda) ───────────────────────────────────
function GoalsWidget({ brandId }: { brandId: string }) {
  const { setSection } = useAppStore();
  const { data, isLoading } = useQuery<{ goals: Goal[] }>({
    queryKey: ["goals", brandId, "active"],
    queryFn: () => api(`/api/goals?brandId=${brandId}&status=active`),
    enabled: !!brandId,
    staleTime: 30_000,
  });

  // Show only goals whose date range includes "today"
  const now = new Date();
  const todayGoals = (data?.goals ?? []).filter((g) => {
    const s = new Date(g.startDate);
    const e = new Date(g.endDate);
    return now >= s && now <= e;
  });

  return (
    <SectionCard
      title="🎯 Target Bulan Ini"
      desc="Pantau progres target bisnis kamu"
      right={
        <Button
          variant="ghost"
          size="sm"
          className="text-teal"
          onClick={() => setSection("pengaturan")}
        >
          Atur Target <ArrowRight className="size-3.5" />
        </Button>
      }
      bodyClassName="p-0"
    >
      {isLoading ? (
        <div className="p-5 space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : todayGoals.length === 0 ? (
        <div className="p-8 text-center">
          <div className="size-12 rounded-2xl bg-cream-200 text-stone mx-auto flex items-center justify-center mb-2">
            <Target className="size-6" />
          </div>
          <div className="text-sm font-semibold text-ink">Belum ada target bulan ini</div>
          <p className="text-xs text-stone mt-1 mb-3 max-w-sm mx-auto">
            Set target omzet, order, atau produk baru untuk motivasi & lacak progress bisnis kamu.
          </p>
          <Button
            size="sm"
            className="bg-teal hover:bg-teal-600"
            onClick={() => setSection("pengaturan")}
          >
            <Target className="size-3.5 mr-1" /> Buat Target
          </Button>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {todayGoals.slice(0, 4).map((g) => {
            const meta = GOAL_TYPE_META[g.type] ?? { icon: "🎯", label: g.type };
            const pct = Math.min(100, g.progress ?? 0);
            const isAchieved = g.status === "achieved";
            return (
              <div key={g.id} className="px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center text-base shrink-0">
                    {meta.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-ink truncate">
                        {meta.label}
                      </div>
                      <div className="text-xs font-bold text-teal tabular-nums">
                        {pct}%
                      </div>
                    </div>
                    <div className="text-[11px] text-stone mt-0.5 tabular-nums">
                      {formatGoalValue(g.type, g.current)} / {formatGoalValue(g.type, g.target)}
                    </div>
                  </div>
                  {isAchieved && (
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 border text-[10px] gap-1 shrink-0">
                      <CheckCircle2 className="size-2.5" /> Tercapai
                    </Badge>
                  )}
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-cream-200 overflow-hidden">
                  <div
                    className="h-full bg-teal transition-all duration-500 rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}

interface OrderItem {
  productId: string;
  name: string;
  qty: number;
  price: number;
  type: string;
}

interface OrderRow {
  id: string;
  brandId: string;
  customerId: string | null;
  leadId: string | null;
  items: string;
  totalAmount: number;
  status: string;
  shippingCost: number | null;
  resiNumber: string | null;
  shippingCourier: string | null;
  notes: string | null;
  createdAt: string;
  customer?: { id: string; name: string; phone: string } | null;
  lead?: { id: string; name: string; phone: string } | null;
  payments?: { id: string; method: string; amount: number; status: string }[];
}

interface TransactionRow {
  id: string;
  type: string;
  category: string;
  amount: number;
  quantity: number | null;
  unitPrice: number | null;
  buyerName: string | null;
  paymentMethod: string | null;
  description: string | null;
  date: string;
  product?: { id: string; name: string; price: number } | null;
  customer?: { id: string; name: string } | null;
}

interface FlatRow {
  no: number;
  tanggal: string;
  namaProduk: string;
  kuantitas: number;
  hargaSatuan: number;
  totalHarga: number;
  namaPembeli: string;
  metodeBayar: string;
  status: string;
  source: "order" | "manual";
}

function RecentSalesTable({ brandId, isLoading: dashLoading }: { brandId: string; isLoading: boolean }) {
  const { setSection } = useAppStore();

  const { data: ordersData, isLoading: ordersLoading } = useQuery<{ orders: OrderRow[] }>({
    queryKey: ["orders", brandId],
    queryFn: () => api(`/api/orders?brandId=${brandId}`),
    enabled: !!brandId,
  });

  const { data: txData, isLoading: txLoading } = useQuery<{ transactions: TransactionRow[] }>({
    queryKey: ["transactions", brandId, "income"],
    queryFn: () => api(`/api/transactions?brandId=${brandId}&type=income&limit=50`),
    enabled: !!brandId,
  });

  const isLoading = ordersLoading || txLoading;

  function parseItems(s: string): OrderItem[] {
    try { return JSON.parse(s); } catch { return []; }
  }

  function flattenOrders(): FlatRow[] {
    const rows: FlatRow[] = [];
    const orders = ordersData?.orders ?? [];
    let no = 1;

    for (const order of orders) {
      const items = parseItems(order.items);
      const buyerName = order.customer?.name ?? order.lead?.name ?? "Walk-in";
      const paidMethods = (order.payments ?? [])
        .filter((p) => p.status === "Diterima")
        .map((p) => p.method);
      const metodeBayar = paidMethods.length > 0 ? paidMethods.join(", ") : "-";

      for (const item of items) {
        rows.push({
          no: no++,
          tanggal: new Date(order.createdAt).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }),
          namaProduk: item.name,
          kuantitas: item.qty,
          hargaSatuan: item.price,
          totalHarga: item.price * item.qty,
          namaPembeli: buyerName,
          metodeBayar,
          status: order.status,
          source: "order",
        });
      }
    }
    return rows;
  }

  function flattenTransactions(startNo: number): FlatRow[] {
    const rows: FlatRow[] = [];
    const txs = txData?.transactions ?? [];
    let no = startNo;

    for (const tx of txs) {
      const qty = tx.quantity ?? 1;
      const price = tx.unitPrice ?? tx.amount / qty;
      rows.push({
        no: no++,
        tanggal: new Date(tx.date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }),
        namaProduk: tx.product?.name ?? tx.description ?? tx.category,
        kuantitas: qty,
        hargaSatuan: price,
        totalHarga: tx.amount,
        namaPembeli: tx.buyerName ?? tx.customer?.name ?? "-",
        metodeBayar: tx.paymentMethod ?? "Manual",
        status: "Dicatat",
        source: "manual",
      });
    }
    return rows;
  }

  const orderRows = flattenOrders();
  const manualRows = flattenTransactions(orderRows.length + 1);
  const rows = [...orderRows, ...manualRows];

  const statusColor = (s: string): string => {
    const found = ORDER_STATUS.find((o) => o.key === s);
    if (found) return found.color;
    if (s === "Dicatat") return "bg-sky-100 text-sky-700 border-sky-200 border";
    return "bg-stone-100 text-stone-600";
  };

  return (
    <SectionCard
      title="📋 Penjualan Terbaru"
      desc="Informasi dasar penjualan brand ini (order + pencatatan manual)"
      right={
        rows.length > 0 ? (
          <Button variant="ghost" size="sm" className="text-teal" onClick={() => setSection("toko")}>
            Lihat semua <ArrowRight className="size-3.5" />
          </Button>
        ) : undefined
      }
      bodyClassName="p-0"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-cream-100/60">
              <th className="px-4 py-3 text-left text-xs font-semibold text-stone uppercase tracking-wide">No</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-stone uppercase tracking-wide">Tanggal</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-stone uppercase tracking-wide">Nama Produk</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-stone uppercase tracking-wide">Kuantitas (Pcs)</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-stone uppercase tracking-wide">Harga Satuan (Rp)</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-stone uppercase tracking-wide">Total Harga (Rp)</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-stone uppercase tracking-wide">Nama Pembeli</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-stone uppercase tracking-wide">Metode Pembayaran</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-stone uppercase tracking-wide">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading || dashLoading ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-stone">Memuat data penjualan…</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center">
                  <div className="text-3xl mb-2">🛒</div>
                  <div className="text-sm font-semibold text-ink">Belum ada penjualan</div>
                  <p className="text-xs text-stone mt-1 mb-3">Buat order baru di Toko atau catat manual di Keuangan.</p>
                  <Button size="sm" className="bg-teal hover:bg-teal-600" onClick={() => setSection("toko")}>
                    Buka Toko <ArrowRight className="size-3.5" />
                  </Button>
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={i} className="border-b border-border last:border-0 hover:bg-cream-100/40 transition-colors">
                  <td className="px-4 py-3 text-stone tabular-nums">{r.no}</td>
                  <td className="px-4 py-3 text-stone whitespace-nowrap">{r.tanggal}</td>
                  <td className="px-4 py-3 font-medium text-ink max-w-[200px] truncate">{r.namaProduk}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.kuantitas}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatRupiah(r.hargaSatuan)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-ink tabular-nums">{formatRupiah(r.totalHarga)}</td>
                  <td className="px-4 py-3 text-stone">{r.namaPembeli}</td>
                  <td className="px-4 py-3 text-stone">{r.metodeBayar}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusColor(r.status)}`}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

interface DashboardData {
  stats: {
    research: number;
    products: number;
    salesMonth: number;
    credit: number;
    leads: number;
    orders: number;
    content: number;
  };
  recentResearch: { id: string; query: string; intent: string | null; createdAt: string }[];
  recommendations: {
    id: string;
    title: string;
    source: "konten" | "toko" | "keuangan" | "leads" | "stok";
    action: "Buat" | "Review" | "Terapkan" | "Lihat" | "Hubungi" | "Restok";
    used: boolean;
    contextId?: string;
    contextModule?: string;
  }[];
  lowStock: { id: string; name: string; stock: number | null; minStock: number | null }[];
  pendingPaymentsCount: number;
}

const SOURCE_STYLE: Record<string, { icon: string; color: string }> = {
  konten: { icon: "📝", color: "bg-orange-100 text-orange-700" },
  toko: { icon: "🛒", color: "bg-violet-100 text-violet-700" },
  keuangan: { icon: "💰", color: "bg-emerald-100 text-emerald-700" },
  leads: { icon: "👥", color: "bg-sky-100 text-sky-700" },
  stok: { icon: "📦", color: "bg-amber-100 text-amber-700" },
};

export function BerandaSection() {
  const { user, brands, setSection, setActiveBrand } = useAppStore();
  const activeBrand = getActiveBrand(useAppStore.getState());

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["dashboard", activeBrand?.id],
    queryFn: () => api<DashboardData>(`/api/dashboard?brandId=${activeBrand?.id}`),
    enabled: !!activeBrand?.id,
    refetchInterval: 30_000,
  });

  if (!activeBrand) {
    return (
      <div>
        <PageHeader title="Beranda" subtitle="Selamat datang di usahaku.ai" icon="📊" />
        <EmptyState
          icon="🏪"
          title="Belum ada brand"
          desc="Buat brand pertama kamu untuk mulai menggunakan semua modul usahaku.ai."
          action={<Button className="bg-teal hover:bg-teal-600">+ Buat Brand</Button>}
        />
      </div>
    );
  }

  return (
    <div>

      {/* Stats grid — enhanced with hover gradient + active scale */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <HeroStatCard onClick={() => setSection("riset")} ariaLabel="Lihat detail Riset Tersedia">
          <StatCard
            label="Riset Tersedia"
            value={isLoading ? "…" : data?.stats.research ?? 0}
            icon={<Search className="size-4" />}
            accent="teal"
          />
        </HeroStatCard>
        <HeroStatCard onClick={() => setSection("produk")} ariaLabel="Lihat detail Produk Aktif">
          <StatCard
            label="Produk Aktif"
            value={isLoading ? "…" : data?.stats.products ?? 0}
            icon={<Package className="size-4" />}
            accent="orange"
          />
        </HeroStatCard>
        <HeroStatCard onClick={() => setSection("toko")} ariaLabel="Lihat detail Penjualan Bulan Ini">
          <StatCard
            label="Penjualan Bln Ini"
            value={isLoading ? "…" : formatRupiahShort(data?.stats.salesMonth ?? 0)}
            icon={<TrendingUp className="size-4" />}
            accent="success"
          />
        </HeroStatCard>
        <HeroStatCard onClick={() => setSection("credit")} ariaLabel="Lihat detail Credit Tersisa">
          <StatCard
            label="Credit Tersisa"
            value={user?.creditBalance ?? 0}
            icon={<Zap className="size-4 fill-teal" />}
            accent="warning"
          />
        </HeroStatCard>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <HeroStatCard onClick={() => setSection("toko")} ariaLabel="Lihat detail Leads Aktif">
          <StatCard
            label="Leads Aktif"
            value={isLoading ? "…" : data?.stats.leads ?? 0}
            icon={<Users className="size-4" />}
            accent="teal"
          />
        </HeroStatCard>
        <HeroStatCard onClick={() => setSection("toko")} ariaLabel="Lihat detail Orders Pending">
          <StatCard
            label="Orders Pending"
            value={isLoading ? "…" : data?.stats.orders ?? 0}
            icon={<ShoppingCart className="size-4" />}
            accent="orange"
          />
        </HeroStatCard>
        <HeroStatCard onClick={() => setSection("konten")} ariaLabel="Lihat detail Konten Dibuat">
          <StatCard
            label="Konten Dibuat"
            value={isLoading ? "…" : data?.stats.content ?? 0}
            icon={<FileText className="size-4" />}
            accent="success"
          />
        </HeroStatCard>
      </div>

      {/* Recent Sales Table */}
      <RecentSalesTable brandId={activeBrand.id} isLoading={isLoading} />

      {/* Empty state if no research & no products */}
      {!isLoading && data && data.stats.research === 0 && data.stats.products === 0 && (
        <div className="mb-6">
          <EmptyState
            icon="✨"
            title="Yuk mulai dari riset atau produk"
            desc="Dashboard kosong dulu. Tambahkan produk atau jalankan riset pasar pertama kamu — rekomendasi aksi akan otomatis muncul di sini."
            action={
              <div className="flex flex-wrap gap-2 justify-center">
                <Button className="bg-teal hover:bg-teal-600" onClick={() => setSection("riset")}>
                  🔍 Mulai Riset
                </Button>
                <Button variant="outline" onClick={() => setSection("produk")}>
                  📦 Tambah Produk
                </Button>
                <Button variant="outline" onClick={() => setSection("toko")}>
                  🛒 Atur Toko
                </Button>
              </div>
            }
          />
        </div>
      )}

      {/* 2-column: Recent research + Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent research */}
        <SectionCard
          title="Riset Terbaru"
          desc="Histori riset pasar untuk brand ini"
          right={
            <Button variant="ghost" size="sm" className="text-teal" onClick={() => setSection("riset")}>
              Lihat semua <ArrowRight className="size-3.5" />
            </Button>
          }
          bodyClassName="p-0"
        >
          {isLoading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : data?.recentResearch && data.recentResearch.length > 0 ? (
            <div className="divide-y divide-border">
              {data.recentResearch.map((r) => (
                <div
                  key={r.id}
                  className="px-5 py-3 hover:bg-cream-100/50 transition-colors cursor-pointer flex items-start gap-3"
                  onClick={() => setSection("riset")}
                >
                  <div className="size-8 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center shrink-0">
                    <Search className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-ink truncate">{r.query}</div>
                    <div className="text-xs text-stone mt-0.5 flex items-center gap-2">
                      <span>{timeAgo(r.createdAt)}</span>
                      {r.intent && (
                        <Badge variant="outline" className="text-[10px] py-0 h-4 border-teal/30 text-teal">
                          {r.intent.replace("_", " ")}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="size-4 text-stone shrink-0 mt-1" />
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <div className="text-3xl mb-2">🔍</div>
              <div className="text-sm font-semibold text-ink">Belum ada riset</div>
              <p className="text-xs text-stone mt-1 mb-3">Mulai riset pasar pertama untuk dapat rekomendasi otomatis.</p>
              <Button size="sm" className="bg-teal hover:bg-teal-600" onClick={() => setSection("riset")}>
                + Mulai Riset
              </Button>
            </div>
          )}
        </SectionCard>

        {/* Recommendations */}
        <SectionCard
          title="Rekomendasi Aksi"
          desc="Dari context yang belum dipakai + stok & leads"
          right={
            <Badge variant="outline" className="text-[10px]">
              {data?.recommendations?.length ?? 0} aksi
            </Badge>
          }
          bodyClassName="p-0"
        >
          {isLoading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : data?.recommendations && data.recommendations.length > 0 ? (
            <div className="divide-y divide-border max-h-[420px] overflow-y-auto">
              {data.recommendations.map((rec) => {
                const s = SOURCE_STYLE[rec.source];
                return (
                  <div
                    key={rec.id}
                    className="px-5 py-3 hover:bg-cream-100/50 transition-colors flex items-start gap-3"
                  >
                    <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 text-base ${s.color}`}>
                      {s.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-ink leading-snug">{rec.title}</div>
                      <div className="text-[11px] text-stone mt-0.5">
                        Dari {rec.source} {rec.used && "· sudah dipakai"}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={rec.used ? "outline" : "default"}
                      className={
                        rec.used
                          ? "h-7 text-xs"
                          : "h-7 text-xs bg-teal hover:bg-teal-600"
                      }
                      onClick={() => {
                        if (rec.source === "konten") setSection("konten");
                        else if (rec.source === "toko" || rec.source === "leads" || rec.source === "stok")
                          setSection("toko");
                        else if (rec.source === "keuangan") setSection("keuangan");
                      }}
                    >
                      {rec.action}
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center">
              <div className="text-3xl mb-2">💡</div>
              <div className="text-sm font-semibold text-ink">Belum ada rekomendasi</div>
              <p className="text-xs text-stone mt-1">Jalankan riset — context engine akan generate rekomendasi otomatis.</p>
            </div>
          )}
        </SectionCard>
      </div>

      {/* Alerts row */}
      {!isLoading && data && (data.lowStock.length > 0 || data.pendingPaymentsCount > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {data.lowStock.length > 0 && (
            <SectionCard
              title="⚠️ Stok Menipis"
              desc={`${data.lowStock.length} produk perlu restok`}
              bodyClassName="p-0"
            >
              <div className="divide-y divide-border">
                {data.lowStock.slice(0, 4).map((p) => (
                  <div key={p.id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-ink">{p.name}</div>
                      <div className="text-[11px] text-stone">Sisa {p.stock ?? 0} · min {p.minStock ?? 0}</div>
                    </div>
                    <Badge className="bg-amber-100 text-amber-700 border-amber-200 border">
                      <AlertTriangle className="size-3 mr-1" /> Restok
                    </Badge>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
          {data.pendingPaymentsCount > 0 && (
            <SectionCard
              title="💳 Pembayaran Pending"
              desc={`${data.pendingPaymentsCount} pembayaran menunggu verifikasi`}
              bodyClassName="p-4"
            >
              <Button size="sm" className="bg-teal hover:bg-teal-600" onClick={() => setSection("toko")}>
                Verifikasi di Toko <ArrowRight className="size-3.5" />
              </Button>
            </SectionCard>
          )}
        </div>
      )}

      {/* Goals widget */}
      <div className="mt-4">
        <GoalsWidget brandId={activeBrand.id} />
      </div>

      {/* Cross-module info — desktop only */}
      {!isLoading && data && data.stats.research > 0 && (
        <div className="hidden md:block mt-6 rounded-2xl bg-gradient-to-br from-teal-100 via-cream-100 to-orange-100/40 border border-teal/20 p-5">
          <div className="flex items-start gap-4">
            <div className="size-10 rounded-xl bg-teal text-white flex items-center justify-center shrink-0">
              <Sparkles className="size-5" />
            </div>
            <div className="flex-1">
              <div className="font-bold text-ink mb-1">Satu data, dipakai di mana saja</div>
              <p className="text-sm text-ink-500 leading-relaxed">
                Riset, produk, dan transaksi kamu otomatis mengalir ke konten, toko, dan keuangan.
                Tidak perlu ketik ulang — itu prinsip utama usahaku.ai.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {(["riset", "konten", "toko", "keuangan"] as SectionKey[]).map((s) => (
                  <Button
                    key={s}
                    variant="outline"
                    size="sm"
                    className="bg-card/80 backdrop-blur text-xs"
                    onClick={() => setSection(s)}
                  >
                    Buka {s.charAt(0).toUpperCase() + s.slice(1)} <ArrowRight className="size-3" />
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
