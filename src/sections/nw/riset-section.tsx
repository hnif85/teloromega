"use client";

import { useState, useMemo, useEffect, type ComponentType } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type {
  NormalizedResearchResult,
  NormalizedPersona,
  NormalizedCompetitor,
  NormalizedContentRec,
} from "@/lib/research-normalize";
import { isContentBlockArray, type ContentBlock } from "@/lib/content-blocks";
import { cn } from "@/lib/utils";
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
  ChevronDown,
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
// Persona/Competitor/ContentRec/ResearchResult now come from the shared
// normalizer (@/lib/research-normalize) — the API always returns results
// already normalized into this one shape, whatever the underlying pipeline
// (agentic, manual, or older intent-specific shapes) actually produced.
type Persona = NormalizedPersona;
type Competitor = NormalizedCompetitor;
type ContentRec = NormalizedContentRec;
type ResearchResult = NormalizedResearchResult;

interface ResearchItem {
  id: string;
  query: string;
  intent: string | null;
  status: string;
  createdAt: string;
  contextsCount: number;
  result: ResearchResult | null;
  /** Free-text summary extracted from legacy/alternate result shapes, if any. */
  summary: string | null;
  /** Raw fields the normalizer didn't recognize — shown generically, never dropped. */
  extras: Record<string, unknown>;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const COST = CREDIT_COST["riset.pasar"]; // 5

const INTENT_LABEL: Record<string, string> = {
  basic_research: "Riset Pasar",
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
  const { setSection } = useAppStore();
  const activeBrand = getActiveBrand(useAppStore.getState());
  const qc = useQueryClient();

  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Mobile accordion — which research is expanded (single-open). Null = all closed.
  const [openId, setOpenId] = useState<string | null>(null);

  // Fetch research list
  const { data, isLoading } = useQuery<{ research: ResearchItem[] }>({
    queryKey: ["research", activeBrand?.id],
    queryFn: () => api(`/api/research?brandId=${activeBrand?.id}`),
    enabled: !!activeBrand?.id,
    staleTime: 30_000,
    gcTime: 60_000,
  });

  const researchList = data?.research ?? [];
  const selected = useMemo(() => {
    if (!researchList.length) return null;
    if (selectedId) return researchList.find((r) => r.id === selectedId) ?? null;
    return researchList[0];
  }, [researchList, selectedId]);

  // Job tracking for async research flow
  const [jobId, setJobId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Poll job status every 2 seconds
  const { data: jobStatus } = useQuery({
    queryKey: ["research-job", jobId],
    queryFn: () => api<{ status: string; progress: number; progressMessage: string; isReady: boolean; isFailed: boolean; error?: string }>(`/api/research/job/${jobId}`),
    enabled: !!jobId,
    refetchInterval: jobId ? 2000 : false,
  });

  // When job completes, refresh list & show result
  useEffect(() => {
    if (jobStatus?.isReady) {
      qc.invalidateQueries({ queryKey: ["research", activeBrand?.id] });
      qc.invalidateQueries({ queryKey: ["dashboard", activeBrand?.id] });
      setJobId(null);
      setQuery("");
      toast.success("Riset selesai", {
        description: "3 context otomatis dibuat untuk konten, toko & keuangan.",
      });
      // After research list refreshes, select the newest
      setTimeout(() => {
        const fresh = (qc.getQueryData(["research", activeBrand?.id]) as { research: ResearchItem[] } | undefined)?.research;
        if (fresh?.length) {
          setSelectedId(fresh[0].id);
          setOpenId(fresh[0].id); // auto-expand the new result on mobile
        }
      }, 500);
    }
    if (jobStatus?.isFailed) {
      setJobId(null);
      setIsSubmitting(false);
      toast.error("Riset gagal", { description: jobStatus.error || "Terjadi kesalahan" });
    }
  }, [jobStatus?.isReady, jobStatus?.isFailed]);

  // Submit: create job (instant)
  // `mode: "complete"` forces the comprehensive basic_research pipeline even
  // when this brand already has research history (normally only the very
  // first research for a brand gets that treatment automatically).
  const runSearch = async (q: string, mode?: "complete") => {
    if (!q.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await api<{ jobId: string; creditBalanceAfter: number }>(
        "/api/research",
        { method: "POST", json: { brandId: activeBrand!.id, query: q.trim(), mode } }
      );
      useAppStore.getState().setCredit(res.creditBalanceAfter);
      setJobId(res.jobId);
    } catch (err: any) {
      setIsSubmitting(false);
      const msg = (err.message || "").toLowerCase();
      if (msg.includes("credit") || msg.includes("tidak cukup")) {
        toast.error("Credit tidak cukup", {
          description: `Riset pasar butuh ${COST} credit. Yuk top up dulu.`,
          action: { label: "Top up", onClick: () => setSection("credit") },
        });
        return;
      }
      toast.error("Riset gagal", { description: err.message });
    }
  };

  // First research: auto-generate comprehensive query from brand data
  const firstResearchQuery = useMemo(() => {
    if (!activeBrand) return "";
    const parts = [`Riset pasar lengkap untuk ${activeBrand.name}`];
    if (activeBrand.category) parts.push(`- ${activeBrand.category}`);
    if (activeBrand.description) parts.push(`: ${activeBrand.description}`);
    parts.push(". Cari tren pasar, hashtag trending, kompetitor, target audiens, strategi harga, dan rekomendasi konten.");
    return parts.join(" ");
  }, [activeBrand?.name, activeBrand?.category, activeBrand?.description]);

  const runFirstResearch = () => {
    if (firstResearchQuery) runSearch(firstResearchQuery);
  };

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

  const isGenerating = !!jobId || isSubmitting;

  // ─── Helpers ────────────────────────────────────────────────────────────────
  // runSearch is defined above in the useEffect block

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Riset Pasar" subtitle="Memuat data riset..." icon="🔍" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const showSidebar = researchList.length >= 1;

  return (
    <div className="pb-28">
      <PageHeader
        title="Riset Pasar"
        subtitle={`Riset berbasis AI + web search untuk ${activeBrand.name}`}
        icon="🔍"
      />

      <div className={`grid gap-5 ${showSidebar ? "lg:grid-cols-[260px_1fr]" : ""}`}>
        {/* ─── Sidebar: history ─────────────────────────────────────────────── */}
        {showSidebar && (
          <aside className="hidden lg:block lg:order-1">
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
        <div className="order-1 lg:order-2 flex flex-col gap-5">
          {/* Progress — live polling from job status */}
          {isGenerating && (
            <SectionCard bodyClassName="p-5 space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                <RefreshCw className="size-4 animate-spin text-teal" />
                <span>
                  AI kami sedang melakukan riset untuk menjawab pertanyaan anda
                  <span className="text-teal ml-1">({jobStatus?.progress ?? 0}%)</span>
                </span>
              </div>
              {/* Progress bar */}
              <div className="h-2 rounded-full bg-cream-200 overflow-hidden">
                <div
                  className="h-full bg-teal rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${jobStatus?.progress ?? 5}%` }}
                />
              </div>
              {/* Step indicators */}
              <div className="space-y-2">
                {[
                  { label: "Mencari data", key: "searching", icon: Search },
                  { label: "Menganalisa", key: "analyzing", icon: Swords },
                  { label: "Membuat laporan", key: "synthesizing", icon: Sparkles },
                  { label: "Menyimpan", key: "completed", icon: Sparkles },
                ].map((step) => {
                  const done =
                    jobStatus?.status === "completed" ||
                    (jobStatus?.status === "synthesizing" && step.key !== "completed") ||
                    (jobStatus?.status === "analyzing" && (step.key === "searching" || step.key === "analyzing")) ||
                    (jobStatus?.status === "searching" && step.key === "searching") ||
                    false;
                  const active =
                    jobStatus?.status === step.key;
                  return (
                    <div
                      key={step.key}
                      className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors ${
                        active ? "bg-teal-50 border border-teal/30" : done ? "bg-emerald-50/60" : "bg-cream-100/60 opacity-50"
                      }`}
                    >
                      <div className={`size-7 rounded-lg flex items-center justify-center ${
                        active ? "bg-teal-100 text-teal-600" : done ? "bg-emerald-100 text-emerald-600" : "bg-cream-200 text-stone"
                      }`}>
                        <step.icon className={`size-3.5 ${active ? "animate-pulse" : ""}`} />
                      </div>
                      <div className="flex-1">
                        <div className={`text-sm font-medium ${active ? "text-teal" : done ? "text-emerald-700" : "text-stone"}`}>
                          {step.label}
                        </div>
                      </div>
                      {done && <ChevronRight className="size-4 text-emerald-500" />}
                      {active && <RefreshCw className="size-4 text-teal animate-spin" />}
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          )}

          {/* Empty state — no research at all. Brand's first-ever research
              must be the comprehensive baseline (forced server-side too —
              see forceBasic in /api/research) so Konten/Toko/Keuangan always
              have context to draw on. No shortcuts here on purpose: no
              suggestion chips, no composer below — just this one button,
              until that baseline exists. */}
          {!isGenerating && !selected && (
            <EmptyState
              icon="🔍"
              title="Belum ada riset untuk brand ini"
              desc={`Mulai dengan riset dasar dulu — AI akan riset ${activeBrand?.name ?? "brand"} secara menyeluruh: tren pasar, kompetitor, target audiens, dan rekomendasi strategi. Setelah ini selesai, kamu bisa riset topik spesifik apa saja.`}
              action={
                <Button
                  className="bg-teal hover:bg-teal-600"
                  disabled={!firstResearchQuery}
                  onClick={runFirstResearch}
                >
                  <Sparkles className="size-4 mr-1" />
                  Mulai riset dasar {activeBrand?.name}
                </Button>
              }
            />
          )}

          {/* Result view — desktop (single pane, driven by sidebar selection) */}
          {!isGenerating && selected && selected.result && (
            <div className="hidden lg:block">
              <ResearchResultDispatcher
                research={selected}
                brandName={activeBrand.name}
                setSection={setSection}
              />
            </div>
          )}

          {/* Result view — mobile: histori + hasil sebagai accordion (single-open,
              default tertutup). Tap judul → hasil muncul ke bawah; tap lagi → tutup. */}
          {!isGenerating && researchList.length > 0 && (
            <div className="lg:hidden flex flex-col gap-3">
              {researchList.map((r) => {
                const open = openId === r.id;
                return (
                  <div key={r.id} className="rounded-2xl bg-card border border-border overflow-hidden">
                    <button
                      onClick={() => setOpenId(open ? null : r.id)}
                      aria-expanded={open}
                      className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-cream-100/50 transition-colors"
                    >
                      <div className="size-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                        <Sparkles className="size-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {r.intent && (
                            <Badge variant="outline" className="text-[10px] py-0 h-4 border-teal/30 text-teal">
                              {INTENT_LABEL[r.intent] ?? r.intent}
                            </Badge>
                          )}
                          <span className="text-[11px] text-stone">{timeAgoShort(r.createdAt)}</span>
                        </div>
                        <div className={cn("text-sm font-semibold text-ink leading-snug", !open && "line-clamp-2")}>
                          {r.query}
                        </div>
                      </div>
                      <ChevronDown
                        className={cn("size-4 text-stone shrink-0 mt-1 transition-transform", open && "rotate-180")}
                      />
                    </button>
                    {open && (
                      <div className="px-3 pb-3 pt-3 border-t border-border">
                        {r.result ? (
                          <ResearchResultDispatcher
                            research={r}
                            brandName={activeBrand.name}
                            setSection={setSection}
                            hideHeader
                          />
                        ) : (
                          <div className="py-6 text-center text-sm text-stone">Hasil belum tersedia.</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ─── Composer — chatgpt-style input pinned to the bottom of this
              column (not the whole viewport, so it never covers the Histori
              Riset sidebar). Sits above the mobile bottom tab bar. Only
              available once the baseline research exists — before that,
              the empty state's "Mulai riset dasar" button is the only way
              in (see forceBasic gating above). ─────────────────────────── */}
          {showSidebar && (
          <div className="sticky bottom-16 md:bottom-4 z-30">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                runSearch(query);
              }}
              className="rounded-2xl border border-border bg-card/95 backdrop-blur shadow-lg p-2 flex gap-2"
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
                    <span className="hidden sm:inline">Meriset…</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" />
                    <span className="hidden sm:inline">Riset</span>
                    <Badge className="ml-0.5 bg-amber-400 text-amber-950 hover:bg-amber-400 gap-1 px-1.5 py-0 h-5 text-[10px]">
                      <Zap className="size-2.5 fill-amber-900" />
                      {COST}
                    </Badge>
                  </>
                )}
              </Button>
              {researchList.length > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 gap-1.5 shrink-0 border-teal/30 text-teal hover:bg-teal-50"
                      disabled={isGenerating || !query.trim()}
                      onClick={() => runSearch(query, "complete")}
                    >
                      <TrendingUp className="size-4" />
                      <span className="hidden sm:inline">Complete Research</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Riset pasar lengkap (audiens, SWOT, kompetitor, harga) — refresh baseline & bikin 3 context baru untuk brand ini.
                  </TooltipContent>
                </Tooltip>
              )}
            </form>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Renderer dispatch ─────────────────────────────────────────────────────────
// "Basic riset" (intent = basic_research, the comprehensive audience/SWOT/
// competitor/keyword/pricing research the agent always produces today) gets
// the static tab view below — it's a deliberately fixed layout, not meant to
// auto-adapt.
//
// Any other intent — future research types this app doesn't have a
// purpose-built template for yet — falls back to a hybrid: render agent-
// supplied HTML if present (sanitized — this is AI output seeded from web
// search results, so it's untrusted input, never rendered raw), otherwise
// fall back to the same tab view, which already degrades safely for
// unrecognized shapes via the normalizer + "Info Tambahan".
//
// Adding a dedicated template for a new intent later is just adding an entry
// to this map — nothing else in the dispatch logic needs to change.
interface ResearchViewProps {
  research: ResearchItem;
  brandName: string;
  setSection: (s: "konten" | "toko" | "keuangan") => void;
  /** Suppress the internal query/title header — used by the mobile accordion,
      where the accordion row already shows the query. */
  hideHeader?: boolean;
}

const RESEARCH_RENDERERS: Record<string, ComponentType<ResearchViewProps>> = {
  basic_research: ResearchViewImpl,
};

function ResearchResultDispatcher(props: ResearchViewProps) {
  const { research } = props;
  const Renderer = RESEARCH_RENDERERS[research.intent ?? "basic_research"];
  if (Renderer) return <Renderer {...props} />;

  const rawBlocks = research.extras?.blocks;
  if (isContentBlockArray(rawBlocks) && rawBlocks.length > 0) {
    return <BlockContentView {...props} blocks={rawBlocks} />;
  }

  return <ResearchViewImpl {...props} />;
}

// ─── Non-basic research view — renders agent output as ContentBlock[] ────────
// Never trusts raw HTML from the model: every block type maps to a fixed,
// hand-written React element, so there's nothing here an AI response could
// inject beyond the plain text it supplies.
function ContentBlockView({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case "heading":
      return <h3 className="text-base font-bold text-ink mt-2">{block.text}</h3>;
    case "paragraph":
      return <p className="text-sm text-ink-700 leading-relaxed">{block.text}</p>;
    case "list":
      return (
        <ul className="list-disc list-inside space-y-1 text-sm text-ink-700">
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
    case "table":
      return (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-cream-100">
                {block.headers.map((h, i) => (
                  <th key={i} className="text-left font-semibold text-ink px-3 py-2">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, i) => (
                <tr key={i} className="border-t border-border">
                  {row.map((cell, j) => (
                    <td key={j} className="px-3 py-2 text-ink-700">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "stat":
      return (
        <div className="rounded-lg bg-teal-50 border border-teal/20 px-3 py-2 inline-flex flex-col">
          <span className="text-[10px] uppercase tracking-wider text-stone">{block.label}</span>
          <span className="text-lg font-bold text-teal">{block.value}</span>
        </div>
      );
    case "quote":
      return (
        <blockquote className="border-l-2 border-teal/40 pl-3 text-sm italic text-ink-700">
          {block.text}
        </blockquote>
      );
    default:
      return null;
  }
}

function BlockContentView({
  research,
  brandName,
  blocks,
  hideHeader,
}: ResearchViewProps & { blocks: ContentBlock[] }) {
  return (
    <div className="space-y-4">
      {!hideHeader && (
      <div className="rounded-2xl bg-gradient-to-br from-teal-100 via-cream-100 to-orange-100/40 dark:bg-none dark:bg-teal-950/40 border border-teal/20 p-4 flex flex-wrap items-center justify-between gap-3">
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
            </div>
          </div>
        </div>
      </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
        {blocks.map((block, i) => (
          <ContentBlockView key={i} block={block} />
        ))}
      </div>
    </div>
  );
}

// ─── Research result view with tabs ("basic riset" template) ─────────────────
function ResearchViewImpl({
  research,
  brandName,
  setSection,
  hideHeader,
}: ResearchViewProps) {
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
      {!hideHeader && (
      <div className="rounded-2xl bg-gradient-to-br from-teal-100 via-cream-100 to-orange-100/40 dark:bg-none dark:bg-teal-950/40 border border-teal/20 p-4 flex flex-wrap items-center justify-between gap-3">
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
      )}

      {/* Summary — present across every result shape seen so far (legacy or
          agentic). Shown even when the structured fields below are sparse,
          so there's always something readable instead of a blank card. */}
      {research.summary && (
        <div className="rounded-2xl border border-border bg-card p-4 flex items-start gap-3">
          <div className="size-8 rounded-lg bg-teal-100 text-teal flex items-center justify-center shrink-0">
            <Sparkles className="size-4" />
          </div>
          <p className="text-sm text-ink leading-relaxed">{research.summary}</p>
        </div>
      )}

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
              <Button
                size="sm"
                variant="ghost"
                className="w-full justify-between text-xs text-teal hover:bg-teal-50 mt-1"
                onClick={() => setSection("keuangan")}
              >
                <span className="flex items-center gap-1.5">
                  <Wallet className="size-3.5" /> Proyeksi Keuangan
                </span>
                <ArrowRight className="size-3" />
              </Button>
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
            {contentRecs.length > 0 && (
              <Button
                size="sm"
                className="w-full mt-3 bg-orange-500 hover:bg-orange-600 text-white gap-1.5"
                onClick={() => setSection("konten")}
              >
                <Lightbulb className="size-3.5" /> Bikin Konten dari Rekomendasi Ini
                <ArrowRight className="size-3" />
              </Button>
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
            <Button
              size="sm"
              variant="outline"
              className="w-full border-violet-200 text-violet-700 hover:bg-violet-50 gap-1.5"
              onClick={() => setSection("toko")}
            >
              <Store className="size-3.5" /> Atur Harga & Stok di Toko
              <ArrowRight className="size-3" />
            </Button>
          </SectionCard>
        </TabsContent>
      </Tabs>

      {/* Info Tambahan — anything the normalizer couldn't map into the tabs
          above. Collapsed by default so it never clutters the common case
          (empty for current agentic results), but nothing from an unusual
          result shape is ever silently thrown away. */}
      {Object.keys(research.extras ?? {}).length > 0 && (
        <ExtrasCard extras={research.extras} />
      )}
    </div>
  );
}

// ─── Extras — generic fallback for fields the normalizer didn't recognize ────
function ExtrasValue({ value }: { value: unknown }) {
  if (value == null) return <span className="text-stone">—</span>;
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-stone">—</span>;
    return (
      <ul className="list-disc list-inside space-y-0.5">
        {value.map((v, i) => (
          <li key={i}>{typeof v === "object" ? JSON.stringify(v) : String(v)}</li>
        ))}
      </ul>
    );
  }
  if (typeof value === "object") {
    return (
      <div className="space-y-1 pl-3 border-l-2 border-border">
        {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
          <div key={k}>
            <span className="text-stone">{k}:</span> <ExtrasValue value={v} />
          </div>
        ))}
      </div>
    );
  }
  return <span>{String(value)}</span>;
}

function ExtrasCard({ extras }: { extras: Record<string, unknown> }) {
  const [open, setOpen] = useState(false);
  const keys = Object.keys(extras);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-2xl border border-dashed border-border bg-cream-100/40 overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between gap-2 px-4 py-3 text-sm font-medium text-ink hover:bg-cream-100 transition-colors">
            <span className="flex items-center gap-2">
              <Lightbulb className="size-4 text-stone" />
              Info Tambahan ({keys.length})
            </span>
            <ChevronRight className={`size-4 text-stone transition-transform ${open ? "rotate-90" : ""}`} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-2.5 text-xs text-ink-700">
            {keys.map((k) => (
              <div key={k}>
                <div className="font-semibold text-ink mb-0.5">{k}</div>
                <ExtrasValue value={extras[k]} />
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

// ─── Loading skeleton with pipeline steps ────────────────────────────────────
function ResearchSkeleton({ query }: { query: string }) {
  const steps = [
    { label: "Mencari data", icon: Search },
    { label: "Menganalisa", icon: Swords },
    { label: "Membuat laporan", icon: Sparkles },
  ];
  return (
    <SectionCard bodyClassName="p-5 space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-ink">
        <RefreshCw className="size-4 animate-spin text-teal" />
        AI kami sedang melakukan riset untuk menjawab pertanyaan anda
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
