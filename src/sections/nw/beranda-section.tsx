"use client";

import { useQuery } from "@tanstack/react-query";
import { useAppStore, getActiveBrand } from "@/lib/store";
import { api } from "@/lib/api";
import { PageHeader, StatCard, SectionCard, EmptyState } from "@/components/nw/primitives";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRupiah, formatRupiahShort, timeAgo, type SectionKey } from "@/lib/constants";
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
} from "lucide-react";

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
        <PageHeader title="Beranda" subtitle="Selamat datang di The Next Whiz" icon="📊" />
        <EmptyState
          icon="🏪"
          title="Belum ada brand"
          desc="Buat brand pertama kamu untuk mulai menggunakan semua modul The Next Whiz."
          action={<Button className="bg-teal hover:bg-teal-600">+ Buat Brand</Button>}
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`Halo, ${user?.name?.split(" ")[0] ?? "Sob"} 👋`}
        subtitle={`Ringkasan ${activeBrand.name} · ${activeBrand.category}`}
        icon="📊"
        actions={
          <Button
            variant="outline"
            className="gap-1.5"
            onClick={() => setSection("riset")}
          >
            <Sparkles className="size-3.5 text-teal" />
            Mulai Riset
          </Button>
        }
      />

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard
          label="Riset Tersedia"
          value={isLoading ? "…" : data?.stats.research ?? 0}
          icon={<Search className="size-4" />}
          accent="teal"
        />
        <StatCard
          label="Produk Aktif"
          value={isLoading ? "…" : data?.stats.products ?? 0}
          icon={<Package className="size-4" />}
          accent="orange"
        />
        <StatCard
          label="Penjualan Bln Ini"
          value={isLoading ? "…" : formatRupiahShort(data?.stats.salesMonth ?? 0)}
          icon={<TrendingUp className="size-4" />}
          accent="success"
        />
        <StatCard
          label="Credit Tersisa"
          value={user?.creditBalance ?? 0}
          icon={<Zap className="size-4 fill-teal" />}
          accent="warning"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <StatCard
          label="Leads Aktif"
          value={isLoading ? "…" : data?.stats.leads ?? 0}
          icon={<Users className="size-4" />}
          accent="teal"
        />
        <StatCard
          label="Orders Pending"
          value={isLoading ? "…" : data?.stats.orders ?? 0}
          icon={<ShoppingCart className="size-4" />}
          accent="orange"
        />
        <StatCard
          label="Konten Dibuat"
          value={isLoading ? "…" : data?.stats.content ?? 0}
          icon={<FileText className="size-4" />}
          accent="success"
        />
      </div>

      {/* Empty state if no research & no products */}
      {!isLoading && data && data.stats.research === 0 && data.stats.products === 0 && (
        <div className="mb-6">
          <EmptyState
            icon="✨"
            title="Yuk mulai dari riset atau produk"
            desc="Dashboard kosong dulu. Tambahkan produk atau jalankan riset pasar pertama kamu — rekomendasi aksi akan otomatis muncul di sini."
            action={
              <div className="flex gap-2 justify-center">
                <Button className="bg-teal hover:bg-teal-600" onClick={() => setSection("riset")}>
                  🔍 Mulai Riset
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

      {/* Cross-module info */}
      {!isLoading && data && data.stats.research > 0 && (
        <div className="mt-6 rounded-2xl bg-gradient-to-br from-teal-100 via-cream-100 to-orange-100/40 border border-teal/20 p-5">
          <div className="flex items-start gap-4">
            <div className="size-10 rounded-xl bg-teal text-white flex items-center justify-center shrink-0">
              <Sparkles className="size-5" />
            </div>
            <div className="flex-1">
              <div className="font-bold text-ink mb-1">Satu data, dipakai di mana saja</div>
              <p className="text-sm text-ink-500 leading-relaxed">
                Riset, produk, dan transaksi kamu otomatis mengalir ke konten, toko, dan keuangan.
                Tidak perlu ketik ulang — itu prinsip utama The Next Whiz.
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
