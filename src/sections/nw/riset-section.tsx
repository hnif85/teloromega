"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore, getActiveBrand } from "@/lib/store";
import { api } from "@/lib/api";
import { PageHeader, EmptyState, SectionCard } from "@/components/nw/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { toast } from "sonner";
import { CREDIT_COST } from "@/lib/constants";
import {
  Search,
  Sparkles,
  Zap,
  TrendingUp,
  Users,
  Target,
  Shield,
  Lightbulb,
  AlertTriangle,
  Hash,
  Clock,
  ChevronRight,
  ArrowRight,
  CheckCircle2,
  Swords,
  AlertOctagon,
  History,
  Store,
  Wallet,
  RefreshCw,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Persona {
  name: string;
  demography: string;
  platform: string;
  pain: string;
  trigger: string;
}
interface Competitor {
  name: string;
  price_range: string;
  social_activity: string;
  marketplace_strength: string;
  threat_level: string;
}
interface ContentRec {
  title: string;
  platform: string;
  angle: string;
  hashtags: string[];
  best_time: string;
}
interface ResearchResult {
  intent: string;
  target_audience: Persona[];
  swot: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  competitors: Competitor[];
  keywords: { hot: string[]; stable: string[] };
  market_trend: {
    labels: string[];
    values: number[];
    stats: { growth_pct: number; peak: string };
  };
  content_recommendations: ContentRec[];
  pricing: {
    market_avg: string;
    lowest: string;
    highest: string;
    recommendation: string;
  };
}

interface ResearchItem {
  id: string;
  query: string;
  intent: string | null;
  status: string;
  createdAt: string;
  contextsCount: number;
  result: ResearchResult | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const COST = CREDIT_COST["riset.pasar"]; // 5

const INTENT_LABEL: Record<string, string> = {
  market_trend: "Tren Pasar",
  competitor_analysis: "Analisis Kompetitor",
  keyword_research: "Riset Keyword",
  pricing: "Analisis Harga",
};

const PLATFORM_META: Record<string, { icon: string; color: string }> = {
  TikTok: { icon: "🎵", color: "bg-rose-100 text-rose-700" },
  Instagram: { icon: "📸", color: "bg-violet-100 text-violet-700" },
  Facebook: { icon: "👍", color: "bg-sky-100 text-sky-700" },
  WhatsApp: { icon: "💬", color: "bg-emerald-100 text-emerald-700" },
  "Twitter/X": { icon: "🐦", color: "bg-stone-200 text-stone-700" },
};

function platformMeta(p: string) {
  return PLATFORM_META[p] ?? { icon: "📱", color: "bg-stone-100 text-stone-700" };
}

const THREAT_STYLE: Record<string, string> = {
  tinggi: "bg-rose-100 text-rose-700 border-rose-200",
  sedang: "bg-amber-100 text-amber-700 border-amber-200",
  rendah: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const CHART_COLORS = [
  "#0D9488",
  "#14B8A6",
  "#5EEAD4",
  "#F97316",
  "#FB923C",
  "#FDBA74",
];

// ─── Component ────────────────────────────────────────────────────────────────
export function RisetSection() {
  const { user, setSection } = useAppStore();
  const activeBrand = getActiveBrand(useAppStore.getState());
  const qc = useQueryClient();

  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Fetch research list
  const { data, isLoading } = useQuery<{ research: ResearchItem[] }>({
    queryKey: ["research", activeBrand?.id],
    queryFn: () => api(`/api/research?brandId=${activeBrand?.id}`),
    enabled: !!activeBrand?.id,
  });

  const researchList = data?.research ?? [];
  const selected = useMemo(() => {
    if (!researchList.length) return null;
    if (selectedId) return researchList.find((r) => r.id === selectedId) ?? null;
    return researchList[0];
  }, [researchList, selectedId]);

  // Mutation: run new research
  const mutation = useMutation({
    mutationFn: (vars: { brandId: string; query: string }) =>
      api<{ research: ResearchItem; creditBalanceAfter: number }>(
        "/api/research",
        { method: "POST", json: vars }
      ),
    onSuccess: (data) => {
      useAppStore.getState().setCredit(data.creditBalanceAfter);
      qc.invalidateQueries({ queryKey: ["research", activeBrand?.id] });
      qc.invalidateQueries({ queryKey: ["dashboard", activeBrand?.id] });
      setSelectedId(data.research.id);
      setQuery("");
      toast.success("Riset selesai", {
        description: "3 context otomatis dibuat untuk konten, toko & keuangan.",
      });
    },
    onError: (err: Error & { cause?: { required?: number } }) => {
      const msg = err.message.toLowerCase();
      if (msg.includes("credit") || msg.includes("tidak cukup")) {
        toast.error("Credit tidak cukup", {
          description: `Riset pasar butuh ${COST} credit. Yuk top up dulu.`,
          action: {
            label: "Top up",
            onClick: () => setSection("credit"),
          },
        });
        return;
      }
      toast.error("Riset gagal", { description: err.message });
    },
  });

  // Build suggestion chips from product names or brand category
  const suggestions = useMemo(() => {
    const subject = activeBrand?.category ?? "produk UMKM";
    return [
      `Tren ${subject} 2025`,
      `Harga pasaran ${subject}`,
      `Kompetitor ${subject} terdekat`,
      `Keyword viral ${subject}`,
    ];
  }, [activeBrand?.category]);

  // ─── No active brand ────────────────────────────────────────────────────────
  if (!activeBrand) {
    return (
      <div>
        <PageHeader title="Riset Pasar" subtitle="Riset pasar berbasis AI" icon="🔍" />
        <EmptyState
          icon="🏪"
          title="Belum ada brand"
          desc="Buat brand terlebih dulu untuk mulai meriset pasar."
        />
      </div>
    );
  }

  const isGenerating = mutation.isPending;

  // ─── Helpers ────────────────────────────────────────────────────────────────
  const runSearch = (q: string) => {
    if (!q.trim()) return;
    mutation.mutate({ brandId: activeBrand.id, query: q.trim() });
  };

  const showSidebar = researchList.length >= 1;

  return (
    <div className="pb-28">
      <PageHeader
        title="Riset Pasar"
        subtitle={`Riset berbasis AI + web search untuk ${activeBrand.name}`}
        icon="🔍"
        actions={
          <Badge
            variant="outline"
            className="gap-1.5 border-amber-200 bg-amber-50 text-amber-700"
          >
            <Zap className="size-3 fill-amber-400 text-amber-500" />
            {user?.creditBalance ?? 0} credit
          </Badge>
        }
      />

      <div className={`grid gap-5 ${showSidebar ? "lg:grid-cols-[260px_1fr]" : ""}`}>
        {/* ─── Sidebar: history ─────────────────────────────────────────────── */}
        {showSidebar && (
          <aside className="order-2 lg:order-1">
            <SectionCard
              title="Histori Riset"
              desc={`${researchList.length} riset`}
              right={
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="size-7 p-0 text-stone"
                      onClick={() =>
                        qc.invalidateQueries({
                          queryKey: ["research", activeBrand?.id],
                        })
                      }
                    >
                      <RefreshCw className="size-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Segarkan</TooltipContent>
                </Tooltip>
              }
              bodyClassName="p-0"
            >
              <div className="max-h-[600px] overflow-y-auto divide-y divide-border">
                {researchList.map((r) => {
                  const active = selected?.id === r.id;
                  return (
                    <button
                      key={r.id}
                      onClick={() => setSelectedId(r.id)}
                      className={`w-full text-left px-4 py-3 transition-colors hover:bg-cream-100/60 ${
                        active ? "bg-teal-50/80 border-l-2 border-teal" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <History className="size-3.5 text-stone shrink-0" />
                        {r.intent && (
                          <Badge
                            variant="outline"
                            className="text-[10px] py-0 h-4 border-teal/30 text-teal"
                          >
                            {INTENT_LABEL[r.intent] ?? r.intent}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm font-medium text-ink line-clamp-2 leading-snug">
                        {r.query}
                      </div>
                      <div className="text-[11px] text-stone mt-1">
                        {timeAgoShort(r.createdAt)} · {r.contextsCount} context
                      </div>
                    </button>
                  );
                })}
              </div>
            </SectionCard>
          </aside>
        )}

        {/* ─── Main content ─────────────────────────────────────────────────── */}
        <div className="order-1 lg:order-2 space-y-5">
          {/* Search panel */}
          <SectionCard
            title="Cari tahu pasar kamu"
            desc="AI akan gather data web + sintesa jadi strategi siap pakai"
            bodyClassName="p-4 space-y-3"
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                runSearch(query);
              }}
              className="flex gap-2"
            >
              <div className="relative flex-1">
                <Search className="size-4 text-stone absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Contoh: Tren ${activeBrand.category} 2025…`}
                  className="pl-9 h-11 bg-cream-100/60 border-border"
                  disabled={isGenerating}
                />
              </div>
              <Button
                type="submit"
                className="h-11 bg-teal hover:bg-teal-600 gap-1.5 shrink-0"
                disabled={isGenerating || !query.trim()}
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="size-4 animate-spin" />
                    Meriset…
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" />
                    Riset
                    <Badge className="ml-1 bg-amber-400 text-amber-950 hover:bg-amber-400 gap-1 px-1.5 py-0 h-5 text-[10px]">
                      <Zap className="size-2.5 fill-amber-900" />
                      {COST}
                    </Badge>
                  </>
                )}
              </Button>
            </form>

            {/* Suggestion chips */}
            <div className="flex flex-wrap gap-1.5">
              <span className="text-xs text-stone self-center mr-1">Coba:</span>
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setQuery(s);
                    runSearch(s);
                  }}
                  disabled={isGenerating}
                  className="text-xs px-2.5 py-1 rounded-full border border-border bg-cream-100 text-ink hover:bg-cream-200 hover:border-teal/40 transition-colors disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </SectionCard>

          {/* Loading state — pipeline steps */}
          {isGenerating && <ResearchSkeleton query={query} />}

          {/* Empty state — no research at all */}
          {!isGenerating && !selected && (
            <EmptyState
              icon="🔍"
              title="Belum ada riset untuk brand ini"
              desc="Ketik topik di atas atau pilih salah satu saran. AI akan cari data web terbaru (90 hari) dan bikin strategi lengkap — audiens, SWOT, kompetitor, sampai rekomendasi harga."
              action={
                <Button
                  className="bg-teal hover:bg-teal-600"
                  onClick={() => runSearch(suggestions[0])}
                >
                  <Sparkles className="size-4 mr-1" />
                  Coba riset pertama
                </Button>
              }
            />
          )}

          {/* Result view */}
          {!isGenerating && selected && selected.result && (
            <ResearchView
              research={selected}
              brandName={activeBrand.name}
              onSimpan={() =>
                toast.success("Tersimpan otomatis", {
                  description:
                    "Riset & 3 context sudah masuk database. Tinggal dipakai di modul lain.",
                })
              }
              setSection={setSection}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Research result view with tabs + sticky CTA ──────────────────────────────
function ResearchView({
  research,
  brandName,
  onSimpan,
  setSection,
}: {
  research: ResearchItem;
  brandName: string;
  onSimpan: () => void;
  setSection: (s: "konten" | "toko" | "keuangan") => void;
}) {
  const r = research.result!;
  // Safe fallbacks for missing sub-objects in research result
  const mt = r.market_trend ?? { labels: [], values: [], stats: { peak: "—", growth_pct: 0 } };
  const keywords = r.keywords ?? { hot: [], stable: [] };
  const competitors = r.competitors ?? [];
  const targetAudience = r.target_audience ?? [];
  const swot = r.swot ?? { strengths: [], weaknesses: [], opportunities: [], threats: [] };
  const contentRecs = r.content_recommendations ?? [];
  const pricing = r.pricing ?? { lowest: "—", market_avg: "—", highest: "—", recommendation: "Belum tersedia" };

  const trendData = mt.labels.map((l, i) => ({
    name: l,
    value: mt.values[i] ?? 0,
  }));
  const growth = mt.stats.growth_pct ?? 0;

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="rounded-2xl bg-gradient-to-br from-teal-100 via-cream-100 to-orange-100/40 border border-teal/20 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="size-10 rounded-xl bg-teal text-white flex items-center justify-center shrink-0">
            <Sparkles className="size-5" />
          </div>
          <div>
            <div className="font-bold text-ink leading-snug">{research.query}</div>
            <div className="text-xs text-ink-500 mt-0.5 flex items-center gap-2 flex-wrap">
              {research.intent && (
                <Badge variant="outline" className="text-[10px] py-0 h-4 border-teal/30 text-teal">
                  {INTENT_LABEL[research.intent] ?? research.intent}
                </Badge>
              )}
              <span>·</span>
              <span>{brandName}</span>
              <span>·</span>
              <span>{timeAgoShort(research.createdAt)}</span>
              <span>·</span>
              <span className="text-emerald-700 font-medium inline-flex items-center gap-1">
                <CheckCircle2 className="size-3" /> 3 context dibuat
              </span>
            </div>
          </div>
        </div>
        {growth !== 0 && (
          <div className="text-right">
            <div className={`text-2xl font-extrabold ${growth > 0 ? "text-teal" : "text-rose-600"}`}>
              {growth > 0 ? "+" : ""}{growth}%
            </div>
            <div className="text-[11px] text-stone">pertumbuhan pasar</div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pasar" className="w-full">
        <TabsList className="bg-cream-100 border border-border h-auto p-1 flex flex-wrap gap-1">
          <TabsTrigger value="pasar" className="gap-1.5 text-xs">
            <TrendingUp className="size-3.5" /> Pasar
          </TabsTrigger>
          <TabsTrigger value="audiens" className="gap-1.5 text-xs">
            <Users className="size-3.5" /> Audiens
          </TabsTrigger>
          <TabsTrigger value="saingan" className="gap-1.5 text-xs">
            <Swords className="size-3.5" /> Kompetitor & SWOT
          </TabsTrigger>
          <TabsTrigger value="konten" className="gap-1.5 text-xs">
            <Lightbulb className="size-3.5" /> Konten & Harga
          </TabsTrigger>
        </TabsList>

        {/* ─── Tab: Pasar (trend chart + keyword cloud) ──────────────────── */}
        <TabsContent value="pasar" className="mt-4 space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <SectionCard
              title="Tren Pasar 6 Bulan"
              desc={`Indeks minat pasar · puncak: ${mt?.stats?.peak ?? "—"}`}
              className="md:col-span-2"
              bodyClassName="p-4"
            >
              <div className="h-[240px] w-full">
                {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "#78716c" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#78716c" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <RTooltip
                      cursor={{ fill: "rgba(13,148,136,0.08)" }}
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid #E7E3DC",
                        background: "#FCFBF9",
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={36}>
                      {trendData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-stone">Data tren belum tersedia</div>
                )}
              </div>
            </SectionCard>

            <SectionCard title="Ringkasan" desc="Statistik kunci" bodyClassName="p-4 space-y-3">
              <Stat label="Pertumbuhan" value={`${growth > 0 ? "+" : ""}${growth}%`} accent="teal" />
              <Stat label="Puncak tren" value={mt?.stats?.peak ?? "—"} accent="orange" />
              <Stat label="Kompetitor terpantau" value={`${competitors?.length ?? 0}`} accent="violet" />
              <Stat label="Hot keywords" value={`${keywords?.hot?.length ?? 0}`} accent="rose" />
            </SectionCard>
          </div>

          {/* Keyword cloud */}
          <SectionCard
            title="Keyword Trending"
            desc="Hot = lagi naik daun · Stable = pencarian konsisten"
            bodyClassName="p-4"
          >
            <div className="flex flex-wrap gap-1.5 mb-4">
              {keywords.hot.length === 0 && (
                <p className="text-sm text-stone">Tidak ada hot keyword.</p>
              )}
              {keywords.hot.map((k, i) => (
                <span
                  key={`hot-${k}-${i}`}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700"
                >
                  <Hash className="size-2.5" /> {k}
                </span>
              ))}
            </div>
            <div className="border-t border-border pt-3">
              <div className="text-[11px] text-stone mb-2">STABLE KEYWORDS</div>
              <div className="flex flex-wrap gap-1.5">
                {keywords.stable.length === 0 && (
                  <p className="text-sm text-stone">Tidak ada stable keyword.</p>
                )}
                {keywords.stable.map((k, i) => (
                  <span
                    key={`st-${k}-${i}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-stone-100 text-stone-700"
                  >
                    <Hash className="size-2.5" /> {k}
                  </span>
                ))}
              </div>
            </div>
          </SectionCard>
        </TabsContent>

        {/* ─── Tab: Audiens ──────────────────────────────────────────────── */}
        <TabsContent value="audiens" className="mt-4">
          {targetAudience.length === 0 ? (
            <EmptyState icon="👥" title="Belum ada persona" desc="AI belum sempat bikin persona audiens." />
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {targetAudience.map((p, i) => {
                const pm = platformMeta(p.platform);
                return (
                  <div
                    key={i}
                    className="rounded-2xl border border-border bg-card p-4 hover:border-teal/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className={`size-11 rounded-xl flex items-center justify-center font-extrabold text-lg ${pm.color}`}
                      >
                        {p.name?.charAt(0).toUpperCase() ?? "?"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-ink text-sm truncate">{p.name}</div>
                        <div className="text-[11px] text-stone truncate">{p.demography}</div>
                      </div>
                      <Badge variant="outline" className={`text-[10px] py-0 h-5 ${pm.color} border-transparent`}>
                        {pm.icon} {p.platform}
                      </Badge>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div>
                        <div className="text-stone font-medium mb-0.5 flex items-center gap-1">
                          <AlertTriangle className="size-3 text-rose-500" /> Pain
                        </div>
                        <div className="text-ink leading-snug">{p.pain}</div>
                      </div>
                      <div>
                        <div className="text-stone font-medium mb-0.5 flex items-center gap-1">
                          <Target className="size-3 text-teal" /> Trigger beli
                        </div>
                        <div className="text-ink leading-snug">{p.trigger}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ─── Tab: Kompetitor + SWOT ────────────────────────────────────── */}
        <TabsContent value="saingan" className="mt-4 space-y-4">
          {/* Competitor table */}
          <SectionCard
            title="Peta Kompetitor"
            desc={`${competitors.length} kompetitor terpantau`}
            bodyClassName="p-0"
          >
            {competitors.length === 0 ? (
              <div className="p-6 text-center text-sm text-stone">Belum ada data kompetitor.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-cream-100 text-[11px] text-stone uppercase">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium">Nama</th>
                      <th className="text-left px-4 py-2 font-medium">Range Harga</th>
                      <th className="text-left px-4 py-2 font-medium hidden sm:table-cell">Aktivitas Sosial</th>
                      <th className="text-left px-4 py-2 font-medium hidden md:table-cell">Marketplace</th>
                      <th className="text-left px-4 py-2 font-medium">Ancaman</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {competitors.map((c, i) => (
                      <tr key={i} className="hover:bg-cream-100/40">
                        <td className="px-4 py-3 font-medium text-ink">{c.name}</td>
                        <td className="px-4 py-3 text-ink-500 tabular-nums">{c.price_range}</td>
                        <td className="px-4 py-3 text-ink-500 hidden sm:table-cell">{c.social_activity}</td>
                        <td className="px-4 py-3 text-ink-500 hidden md:table-cell">{c.marketplace_strength}</td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={`text-[10px] h-5 ${
                              THREAT_STYLE[c.threat_level] ?? THREAT_STYLE.sedang
                            }`}
                          >
                            {c.threat_level}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          {/* SWOT 2x2 */}
          <div className="grid sm:grid-cols-2 gap-3">
            <SwotCard
              title="Strengths"
              icon={<Shield className="size-4" />}
              color="emerald"
              items={swot.strengths}
            />
            <SwotCard
              title="Weaknesses"
              icon={<AlertOctagon className="size-4" />}
              color="rose"
              items={swot.weaknesses}
            />
            <SwotCard
              title="Opportunities"
              icon={<Lightbulb className="size-4" />}
              color="sky"
              items={swot.opportunities}
            />
            <SwotCard
              title="Threats"
              icon={<AlertTriangle className="size-4" />}
              color="amber"
              items={swot.threats}
            />
          </div>
        </TabsContent>

        {/* ─── Tab: Konten & Harga ───────────────────────────────────────── */}
        <TabsContent value="konten" className="mt-4 space-y-4">
          {/* Content recommendations */}
          <SectionCard
            title="Rekomendasi Konten"
            desc={`${contentRecs.length} ide konten siap pakai`}
            bodyClassName="p-4"
          >
            {contentRecs.length === 0 ? (
              <p className="text-sm text-stone">Belum ada rekomendasi konten.</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {contentRecs.map((c, i) => {
                  const pm = platformMeta(c.platform);
                  return (
                    <div
                      key={i}
                      className="rounded-xl border border-border bg-cream-100/40 p-3 hover:border-teal/30 transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`size-7 rounded-lg flex items-center justify-center text-sm ${pm.color}`}>
                          {pm.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-ink line-clamp-1">{c.title}</div>
                          <div className="text-[10px] text-stone">{c.platform}</div>
                        </div>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="outline" className="text-[10px] h-5 gap-1">
                              <Clock className="size-2.5" /> {c.best_time}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>Waktu posting terbaik</TooltipContent>
                        </Tooltip>
                      </div>
                      <p className="text-xs text-ink-500 leading-snug mb-2">{c.angle}</p>
                      <div className="flex flex-wrap gap-1">
                        {c.hashtags.map((h, j) => (
                          <span key={j} className="text-[10px] px-1.5 py-0.5 rounded bg-teal-50 text-teal-700">
                            {h}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>

          {/* Pricing */}
          <SectionCard
            title="Rekomendasi Harga & Stok"
            desc="Berdasarkan harga pasar & positioning kompetitor"
            bodyClassName="p-4 space-y-4"
          >
            <div className="grid grid-cols-3 gap-3">
              <PriceCell label="Termurah" value={pricing.lowest} accent="rose" />
              <PriceCell label="Rata-rata Pasar" value={pricing.market_avg} accent="teal" highlight />
              <PriceCell label="Termahal" value={pricing.highest} accent="orange" />
            </div>
            <div className="rounded-xl bg-teal-50 border border-teal/20 p-3">
              <div className="flex items-start gap-2">
                <Lightbulb className="size-4 text-teal shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold text-teal-700 mb-1">Rekomendasi usahaku.ai</div>
                  <div className="text-sm text-ink leading-snug">{pricing.recommendation}</div>
                </div>
              </div>
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>

      {/* ─── Sticky CTA bar ──────────────────────────────────────────────── */}
      <div className="sticky bottom-4 z-30">
        <div className="rounded-2xl border border-border bg-card/95 backdrop-blur shadow-lg p-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-stone">
            <CheckCircle2 className="size-4 text-emerald-600" />
            <span className="hidden sm:inline">Riset & 3 context sudah tersimpan otomatis.</span>
            <span className="sm:hidden">Tersimpan otomatis.</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Button size="sm" variant="ghost" onClick={onSimpan} className="text-xs">
              Simpan
            </Button>
            <Button
              size="sm"
              className="bg-orange-500 hover:bg-orange-600 text-white gap-1.5"
              onClick={() => setSection("konten")}
            >
              <Lightbulb className="size-3.5" /> Bikin Konten
              <ArrowRight className="size-3" />
            </Button>
            <Button
              size="sm"
              className="bg-violet-600 hover:bg-violet-700 text-white gap-1.5"
              onClick={() => setSection("toko")}
            >
              <Store className="size-3.5" /> Atur Toko
              <ArrowRight className="size-3" />
            </Button>
            <Button
              size="sm"
              className="bg-teal hover:bg-teal-600 gap-1.5"
              onClick={() => setSection("keuangan")}
            >
              <Wallet className="size-3.5" /> Proyeksi Keuangan
              <ArrowRight className="size-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Loading skeleton with pipeline steps ────────────────────────────────────
function ResearchSkeleton({ query }: { query: string }) {
  const steps = [
    { label: "Mengumpulkan data web", icon: Search },
    { label: "Menganalisis kompetitor", icon: Swords },
    { label: "Membuat 3 context", icon: Sparkles },
  ];
  return (
    <SectionCard bodyClassName="p-5 space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-ink">
        <RefreshCw className="size-4 animate-spin text-teal" />
        Sedang meriset: <span className="text-teal truncate">"{query || '…'}"</span>
      </div>
      <div className="space-y-2">
        {steps.map((s, i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-2.5 rounded-lg bg-cream-100/60"
            style={{ animationDelay: `${i * 200}ms` }}
          >
            <div className="size-7 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center">
              <s.icon className="size-3.5 animate-pulse" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-ink">{s.label}</div>
              <Skeleton className="h-1.5 mt-1 w-2/3" />
            </div>
            <ChevronRight className="size-4 text-stone" />
          </div>
        ))}
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </SectionCard>
  );
}

// ─── Small subcomponents ──────────────────────────────────────────────────────
function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "teal" | "orange" | "violet" | "rose";
}) {
  const colors: Record<string, string> = {
    teal: "bg-teal-100 text-teal-700",
    orange: "bg-orange-100 text-orange-700",
    violet: "bg-violet-100 text-violet-700",
    rose: "bg-rose-100 text-rose-700",
  };
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-stone">{label}</span>
      <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${colors[accent]}`}>
        {value}
      </span>
    </div>
  );
}

function SwotCard({
  title,
  icon,
  color,
  items,
}: {
  title: string;
  icon: React.ReactNode;
  color: "emerald" | "rose" | "sky" | "amber";
  items: string[];
}) {
  const colors: Record<string, { bg: string; text: string; border: string; dot: string }> = {
    emerald: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500" },
    rose: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", dot: "bg-rose-500" },
    sky: { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200", dot: "bg-sky-500" },
    amber: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", dot: "bg-amber-500" },
  };
  const c = colors[color];
  return (
    <div className={`rounded-2xl border ${c.border} ${c.bg} p-4`}>
      <div className={`flex items-center gap-2 mb-3 font-bold text-sm ${c.text}`}>
        {icon}
        {title}
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-stone">—</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((it, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-ink leading-snug">
              <span className={`mt-1 size-1.5 rounded-full shrink-0 ${c.dot}`} />
              {it}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PriceCell({
  label,
  value,
  accent,
  highlight,
}: {
  label: string;
  value: string;
  accent: "teal" | "rose" | "orange";
  highlight?: boolean;
}) {
  const colors: Record<string, string> = {
    teal: "bg-teal-50 border-teal-200 text-teal-700",
    rose: "bg-rose-50 border-rose-200 text-rose-700",
    orange: "bg-orange-50 border-orange-200 text-orange-700",
  };
  return (
    <div className={`rounded-xl border p-3 text-center ${colors[accent]} ${highlight ? "ring-2 ring-teal/30" : ""}`}>
      <div className="text-[10px] uppercase tracking-wide opacity-80">{label}</div>
      <div className="text-sm font-bold tabular-nums mt-1">{value}</div>
    </div>
  );
}

function timeAgoShort(dateStr: string): string {
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}j`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}h`;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}
