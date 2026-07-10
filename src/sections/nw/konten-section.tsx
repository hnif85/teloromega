"use client";

// ─────────────────────────────────────────────────────────────────────────────
// KontenSection — AI content generator for The Next Whiz
// Generate caption / gambar / video script / carousel; library + reuse.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppStore, getActiveBrand, type Brand } from "@/lib/store";
import { api } from "@/lib/api";
import { EmptyState, PageHeader, SectionCard } from "@/components/nw/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Image as ImageIcon,
  Video as VideoIcon,
  FileText,
  Layers,
  Copy,
  Download,
  Sparkles,
  Wand2,
  Trash2,
  Eye,
  RefreshCw,
  Store,
  Paperclip,
  CheckCircle2,
  Loader2,
  Zap,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  KONTEN_TYPES,
  PLATFORMS,
  TONES,
  TONE_MAP,
  type ToneKey,
  timeAgo,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────
type ContentType = "caption" | "gambar" | "video" | "carousel";

interface ContentItem {
  id: string;
  brandId: string;
  productId: string | null;
  productName: string | null;
  contextId: string | null;
  type: ContentType;
  platform: string | null;
  body: string | null;
  assetUrl?: string | null; // present in detail view & POST result; absent in list view
  createdAt: string;
}

interface ProductLite {
  id: string;
  type: string;
  name: string;
  price: number;
}

interface KontenRec {
  id: string;
  title: string;
  source: "konten";
  action: string;
  used: boolean;
  contextId: string;
  contextModule: string;
  payload: { angle?: string; platform?: string };
}

interface VideoPlan {
  script: string;
  scenes: { duration_sec: number; visual: string; voiceover: string; text_overlay: string }[];
  hashtags: string[];
  hooks: string[];
}

interface CarouselPlan {
  slides: { slide_num: number; headline: string; body: string; cta: string }[];
  hashtags: string[];
}

// ─── Constants ──────────────────────────────────────────────────────────────
const NONE = "__none__";
const TYPE_LABEL: Record<ContentType, string> = {
  caption: "Caption",
  gambar: "Gambar",
  video: "Video Script",
  carousel: "Carousel",
};
const TYPE_ICON: Record<ContentType, ReactNode> = {
  caption: <FileText className="size-4" />,
  gambar: <ImageIcon className="size-4" />,
  video: <VideoIcon className="size-4" />,
  carousel: <Layers className="size-4" />,
};

// ─── Helpers ────────────────────────────────────────────────────────────────
function getExcerpt(item: ContentItem): string {
  if (!item.body) return "(tidak ada teks)";
  if (item.type === "caption" || item.type === "gambar") {
    const t = item.body.trim();
    return t.length > 120 ? t.slice(0, 120) + "…" : t;
  }
  if (item.type === "video") {
    try {
      const plan = JSON.parse(item.body) as VideoPlan;
      return `${plan.scenes?.length ?? 0} scene · ${plan.hooks?.length ?? 0} hook`;
    } catch {
      return "Script video";
    }
  }
  if (item.type === "carousel") {
    try {
      const plan = JSON.parse(item.body) as CarouselPlan;
      return `${plan.slides?.length ?? 0} slide`;
    } catch {
      return "Carousel";
    }
  }
  return "";
}

function parseHashtags(text: string): string[] {
  const matches = text.match(/#[\w-]+/g);
  return matches ? Array.from(new Set(matches)) : [];
}

// ─── Tone badge / inline picker ─────────────────────────────────────────────
function ToneBadge({ brand }: { brand: Brand }) {
  const { toast } = useToast();
  const updateBrand = useAppStore((s) => s.updateBrand);
  const [saving, setSaving] = useState(false);
  const currentTone = TONES.find((t) => t.key === brand.toneOfVoice);

  async function pickTone(key: ToneKey) {
    setSaving(true);
    try {
      const { brand: updated } = await api<{ brand: Brand }>(`/api/brands/${brand.id}`, {
        method: "PATCH",
        json: { toneOfVoice: key },
      });
      updateBrand(updated);
      toast({ title: "Tone tersimpan", description: TONE_MAP[key] });
    } catch (e) {
      toast({
        title: "Gagal simpan tone",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  if (!brand.toneOfVoice || !currentTone) {
    return (
      <div>
        <div className="text-xs text-stone mb-1.5">Pilih tone dulu untuk brand ini:</div>
        <div className="grid grid-cols-2 gap-1.5">
          {TONES.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => pickTone(t.key)}
              disabled={saving}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-border bg-card hover:border-teal/40 hover:bg-cream-100 text-left text-xs transition-colors disabled:opacity-50"
            >
              <span className="text-base">{t.icon}</span>
              <span className="font-medium text-ink">{t.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <Badge variant="outline" className="bg-teal-100 text-teal-700 border-teal/20 gap-1">
      <span>{currentTone.icon}</span>
      {currentTone.label}
    </Badge>
  );
}

// ─── Type selector ──────────────────────────────────────────────────────────
function TypeSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {KONTEN_TYPES.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange(t.key)}
          className={cn(
            "relative flex flex-col gap-1 p-3 rounded-xl border text-left transition-all",
            value === t.key
              ? "border-teal bg-teal-50 ring-1 ring-teal/30"
              : "border-border bg-card hover:border-teal/30"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xl">{t.icon}</span>
            <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-cream-100">
              <Zap className="size-2.5 mr-0.5 fill-teal text-teal" />
              {t.cost}
            </Badge>
          </div>
          <div className="font-semibold text-ink text-sm">{t.label}</div>
          <div className="text-[11px] text-stone leading-tight">{t.desc}</div>
        </button>
      ))}
    </div>
  );
}

// ─── Platform chips ─────────────────────────────────────────────────────────
function PlatformChips({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {PLATFORMS.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(value === p ? "" : p)}
          className={cn(
            "px-2.5 py-1 rounded-full text-xs font-medium transition-colors border",
            value === p
              ? "bg-teal text-white border-teal"
              : "bg-card text-stone border-border hover:border-teal/40"
          )}
        >
          {p}
        </button>
      ))}
    </div>
  );
}

// ─── Previews ───────────────────────────────────────────────────────────────
function CaptionPreview({ body }: { body: string }) {
  const { toast } = useToast();
  const hashtags = parseHashtags(body);

  function copy() {
    navigator.clipboard.writeText(body);
    toast({ title: "Caption tersalin" });
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-cream-100/60 border border-border p-4">
        <p className="text-sm text-ink whitespace-pre-wrap leading-relaxed">{body}</p>
        {hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-border">
            {hashtags.map((h, i) => (
              <span
                key={i}
                className="text-xs text-teal-700 bg-teal-100 px-1.5 py-0.5 rounded-md"
              >
                {h}
              </span>
            ))}
          </div>
        )}
      </div>
      <Button variant="outline" size="sm" onClick={copy} className="gap-1.5">
        <Copy className="size-3.5" /> Copy Caption
      </Button>
    </div>
  );
}

function GambarPreview({ assetUrl, body }: { assetUrl: string | null; body: string | null }) {
  const { toast } = useToast();

  function download() {
    if (!assetUrl) return;
    const a = document.createElement("a");
    a.href = assetUrl;
    a.download = `konten-gambar-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast({ title: "Gambar didownload" });
  }

  function copyCaption() {
    if (!body) return;
    navigator.clipboard.writeText(body);
    toast({ title: "Caption tersalin" });
  }

  return (
    <div className="space-y-3">
      {assetUrl ? (
        <div className="rounded-xl overflow-hidden border border-border bg-cream-100/40">
          <img src={assetUrl} alt="Generated content" className="w-full h-auto" />
        </div>
      ) : (
        <div className="aspect-square rounded-xl bg-cream-100 border border-border flex items-center justify-center">
          <ImageIcon className="size-10 text-stone/40" />
        </div>
      )}
      {body && (
        <div className="rounded-xl bg-cream-100/60 border border-border p-3">
          <p className="text-sm text-ink whitespace-pre-wrap">{body}</p>
        </div>
      )}
      <div className="flex gap-2">
        {assetUrl && (
          <Button variant="outline" size="sm" onClick={download} className="gap-1.5">
            <Download className="size-3.5" /> Download
          </Button>
        )}
        {body && (
          <Button variant="outline" size="sm" onClick={copyCaption} className="gap-1.5">
            <Copy className="size-3.5" /> Copy Caption
          </Button>
        )}
      </div>
    </div>
  );
}

function VideoPreview({ body }: { body: string }) {
  let plan: VideoPlan;
  try {
    plan = JSON.parse(body) as VideoPlan;
  } catch {
    return <div className="text-sm text-rose-600">Format script tidak valid</div>;
  }

  return (
    <div className="space-y-3">
      {plan.script && (
        <div className="rounded-xl bg-cream-100/60 border border-border p-3">
          <div className="text-xs text-stone mb-1">Ringkasan</div>
          <p className="text-sm text-ink">{plan.script}</p>
        </div>
      )}
      {plan.hooks && plan.hooks.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-ink mb-1.5">
            Hook alternatif ({plan.hooks.length})
          </div>
          <ul className="space-y-1">
            {plan.hooks.map((h, i) => (
              <li key={i} className="text-sm text-ink flex gap-2">
                <span className="text-teal-600 font-bold shrink-0">{i + 1}.</span>
                <span>{h}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div>
        <div className="text-xs font-semibold text-ink mb-1.5">
          Scene ({plan.scenes?.length ?? 0})
        </div>
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {plan.scenes?.map((s, i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-teal text-white h-5 text-[10px]">{i + 1}</Badge>
                <span className="text-xs text-stone">{s.duration_sec}s</span>
              </div>
              <div className="space-y-1 text-xs">
                <div>
                  <span className="text-stone">Visual:</span>{" "}
                  <span className="text-ink">{s.visual}</span>
                </div>
                <div>
                  <span className="text-stone">Voice:</span>{" "}
                  <span className="text-ink">{s.voiceover}</span>
                </div>
                {s.text_overlay && (
                  <div>
                    <span className="text-stone">Text:</span>{" "}
                    <span className="text-ink italic">&ldquo;{s.text_overlay}&rdquo;</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      {plan.hashtags && plan.hashtags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {plan.hashtags.map((h, i) => (
            <span
              key={i}
              className="text-xs text-teal-700 bg-teal-100 px-1.5 py-0.5 rounded-md"
            >
              {h.startsWith("#") ? h : `#${h}`}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function CarouselPreview({ body }: { body: string }) {
  let plan: CarouselPlan;
  try {
    plan = JSON.parse(body) as CarouselPlan;
  } catch {
    return <div className="text-sm text-rose-600">Format carousel tidak valid</div>;
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
        {plan.slides?.map((s, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="size-6 rounded-full bg-teal text-white text-xs font-bold flex items-center justify-center shrink-0">
                {s.slide_num ?? i + 1}
              </div>
              <div className="font-semibold text-ink text-sm">{s.headline}</div>
            </div>
            <p className="text-xs text-ink leading-relaxed mb-2">{s.body}</p>
            {s.cta && (
              <div className="text-[11px] text-teal-700 bg-teal-100 inline-block px-2 py-0.5 rounded-md">
                CTA: {s.cta}
              </div>
            )}
          </div>
        ))}
      </div>
      {plan.hashtags && plan.hashtags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {plan.hashtags.map((h, i) => (
            <span
              key={i}
              className="text-xs text-teal-700 bg-teal-100 px-1.5 py-0.5 rounded-md"
            >
              {h.startsWith("#") ? h : `#${h}`}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ResultPreview({ content }: { content: ContentItem }) {
  if (content.type === "caption") {
    return <CaptionPreview body={content.body ?? ""} />;
  }
  if (content.type === "gambar") {
    return <GambarPreview assetUrl={content.assetUrl ?? null} body={content.body} />;
  }
  if (content.type === "video") {
    return <VideoPreview body={content.body ?? ""} />;
  }
  return <CarouselPreview body={content.body ?? ""} />;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-teal-600 text-sm font-medium">
        <Loader2 className="size-4 animate-spin" />
        Lagi generate konten... (bisa 10-30 detik)
      </div>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-8 w-32" />
    </div>
  );
}

// ─── Saved library card ─────────────────────────────────────────────────────
function SavedLibraryCard({
  item,
  onView,
  onDelete,
}: {
  item: ContentItem;
  onView: () => void;
  onDelete: () => void;
}) {
  const { toast } = useToast();

  function copyExcerpt() {
    if (!item.body) return;
    let text = item.body;
    if (item.type === "video" || item.type === "carousel") {
      try {
        text = JSON.stringify(JSON.parse(item.body), null, 2);
      } catch {
        /* keep raw */
      }
    }
    navigator.clipboard.writeText(text);
    toast({ title: "Tersalin" });
  }

  return (
    <Card className="p-3 hover:border-teal/30 transition-colors">
      <div className="flex items-start gap-2 mb-2">
        <div className="size-8 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center shrink-0">
          {TYPE_ICON[item.type]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
            <Badge variant="outline" className="text-[10px] h-4 px-1">
              {TYPE_LABEL[item.type]}
            </Badge>
            {item.platform && (
              <Badge variant="outline" className="text-[10px] h-4 px-1 bg-cream-100">
                {item.platform}
              </Badge>
            )}
          </div>
          <div className="text-[11px] text-stone">{timeAgo(item.createdAt)}</div>
        </div>
      </div>
      <p className="text-xs text-ink line-clamp-2 leading-snug mb-2 min-h-[2rem]">
        {getExcerpt(item)}
      </p>
      <div className="flex gap-1">
        <Button
          variant="outline"
          size="sm"
          className="h-7 flex-1 text-xs gap-1"
          onClick={onView}
        >
          <Eye className="size-3" /> Lihat
        </Button>
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={copyExcerpt}>
          <Copy className="size-3" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700"
          onClick={onDelete}
        >
          <Trash2 className="size-3" />
        </Button>
      </div>
    </Card>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────
export function KontenSection() {
  const user = useAppStore((s) => s.user);
  const setSection = useAppStore((s) => s.setSection);
  const setCredit = useAppStore((s) => s.setCredit);
  const activeBrand = getActiveBrand(useAppStore.getState());
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [type, setType] = useState<string>("caption");
  const [productId, setProductId] = useState<string>("");
  const [platform, setPlatform] = useState<string>("");
  const [angle, setAngle] = useState<string>("");
  const [contextId, setContextId] = useState<string>("");
  const [filter, setFilter] = useState<string>("all");
  const [viewing, setViewing] = useState<ContentItem | null>(null);

  const cost = KONTEN_TYPES.find((t) => t.key === type)?.cost ?? 0;
  const creditBalance = user?.creditBalance ?? 0;
  const insufficientCredit = creditBalance < cost;

  // ── Fetch products (for product selector) ────────────────
  const { data: productsData } = useQuery<{ products: ProductLite[] }>({
    queryKey: ["products", activeBrand?.id],
    queryFn: () => api(`/api/products?brandId=${activeBrand?.id}`),
    enabled: !!activeBrand?.id,
  });

  // ── Fetch saved contents ─────────────────────────────────
  const { data: contentsData, isLoading: contentsLoading } = useQuery<{ contents: ContentItem[] }>({
    queryKey: ["contents", activeBrand?.id],
    queryFn: () => api(`/api/content?brandId=${activeBrand?.id}`),
    enabled: !!activeBrand?.id,
  });

  // ── Fetch dashboard for konten recommendations ───────────
  // (we re-use /api/dashboard since we can't create /api/contexts)
  const { data: dashboardData } = useQuery<{ recommendations: KontenRec[] }>({
    queryKey: ["dashboard", activeBrand?.id],
    queryFn: () => api(`/api/dashboard?brandId=${activeBrand?.id}`),
    enabled: !!activeBrand?.id,
  });

  const kontenRecs = useMemo(
    () => (dashboardData?.recommendations ?? []).filter((r) => r.source === "konten"),
    [dashboardData]
  );

  // ── Generate mutation ────────────────────────────────────
  const generateMutation = useMutation({
    mutationFn: (vars: {
      brandId: string;
      productId?: string;
      contextId?: string;
      type: string;
      platform?: string;
      angle?: string;
    }) =>
      api<{ content: ContentItem; balanceAfter: number }>("/api/content", {
        method: "POST",
        json: vars,
      }),
    onSuccess: (data) => {
      toast({
        title: "Konten berhasil dibuat 🎉",
        description: `Sisa credit: ${data.balanceAfter}`,
      });
      setCredit(data.balanceAfter);
      queryClient.invalidateQueries({ queryKey: ["contents", activeBrand?.id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", activeBrand?.id] });
      setViewing(data.content);
    },
    onError: (err: Error) => {
      toast({
        title: "Gagal generate",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  // ── Delete mutation ──────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/api/content/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast({ title: "Konten dihapus" });
      queryClient.invalidateQueries({ queryKey: ["contents", activeBrand?.id] });
      setViewing(null);
    },
    onError: (err: Error) => {
      toast({
        title: "Gagal hapus",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  // ── View detail mutation (fetches assetUrl for gambar) ───
  const viewMutation = useMutation({
    mutationFn: (id: string) => api<{ content: ContentItem }>(`/api/content/${id}`),
    onSuccess: (data) => setViewing(data.content),
    onError: (err: Error) =>
      toast({ title: "Gagal load", description: err.message, variant: "destructive" }),
  });

  function handleGenerate() {
    if (!activeBrand) return;
    if (insufficientCredit) {
      toast({
        title: "Credit tidak cukup",
        description: `Butuh ${cost} credit, kamu punya ${creditBalance}`,
        variant: "destructive",
      });
      return;
    }
    generateMutation.mutate({
      brandId: activeBrand.id,
      productId: productId || undefined,
      contextId: contextId || undefined,
      type,
      platform: platform || undefined,
      angle: angle || undefined,
    });
  }

  function handleContextPick(value: string) {
    if (value === NONE) {
      setContextId("");
      setAngle("");
      return;
    }
    setContextId(value);
    const rec = kontenRecs.find((r) => r.contextId === value);
    if (rec) {
      if (rec.payload.angle) setAngle(rec.payload.angle);
      if (rec.payload.platform && !platform) setPlatform(rec.payload.platform);
    }
  }

  function handleView(item: ContentItem) {
    viewMutation.mutate(item.id);
  }

  function handleDelete(item: ContentItem) {
    deleteMutation.mutate(item.id);
  }

  function handleVariation() {
    setAngle("");
    setContextId("");
    setViewing(null);
    toast({
      title: "Mode variasi",
      description: "Angle dikosongkan — tulis angle baru lalu Generate.",
    });
  }

  const filteredContents = useMemo(() => {
    const all = contentsData?.contents ?? [];
    if (filter === "all") return all;
    return all.filter((c) => c.type === filter);
  }, [contentsData, filter]);

  // ── No active brand ──────────────────────────────────────
  if (!activeBrand) {
    return (
      <div>
        <PageHeader title="Konten" subtitle="Buat konten AI untuk brand kamu" icon="📝" />
        <EmptyState
          icon="🏪"
          title="Belum ada brand"
          desc="Buat brand dulu di Beranda untuk mulai generate konten."
        />
      </div>
    );
  }

  const isGenerating = generateMutation.isPending;

  return (
    <div>
      <PageHeader
        title="Buat Konten"
        subtitle={`AI content generator untuk ${activeBrand.name}`}
        icon="📝"
        actions={
          <Badge variant="outline" className="gap-1 bg-cream-100">
            <Zap className="size-3 fill-teal text-teal" />
            {creditBalance} credit
          </Badge>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* ─── LEFT PANEL — GENERATE ─────────────────────── */}
        <div className="lg:col-span-2 space-y-3">
          <SectionCard title="Konfigurasi" desc="Pilih jenis & target konten">
            {/* Tone */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-ink">Tone of Voice</label>
                <button
                  type="button"
                  onClick={() => setSection("pengaturan")}
                  className="text-[11px] text-teal-600 hover:underline"
                >
                  Ubah
                </button>
              </div>
              <ToneBadge brand={activeBrand} />
            </div>

            {/* Type selector */}
            <div className="mb-4">
              <label className="text-xs font-semibold text-ink mb-1.5 block">
                Jenis Konten
              </label>
              <TypeSelector value={type} onChange={setType} />
            </div>

            {/* Product selector */}
            <div className="mb-4">
              <label className="text-xs font-semibold text-ink mb-1.5 block">
                Produk (opsional)
              </label>
              <Select
                value={productId || NONE}
                onValueChange={(v) => setProductId(v === NONE ? "" : v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih produk untuk konten ini" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>— Tanpa produk —</SelectItem>
                  {(productsData?.products ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Platform chips */}
            <div className="mb-4">
              <label className="text-xs font-semibold text-ink mb-1.5 block">
                Platform (opsional)
              </label>
              <PlatformChips value={platform} onChange={setPlatform} />
            </div>

            {/* Angle input */}
            <div className="mb-4">
              <label className="text-xs font-semibold text-ink mb-1.5 block">
                Angle khusus (opsional)
              </label>
              <Input
                value={angle}
                onChange={(e) => setAngle(e.target.value)}
                placeholder="cth: promosi disket, review pelanggan, behind the scene..."
                className="text-sm"
              />
            </div>

            {/* Active context bar */}
            {kontenRecs.length > 0 && (
              <div className="mb-4 rounded-xl border border-teal/20 bg-teal-50/50 p-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-teal-700 mb-1.5">
                  <Paperclip className="size-3.5" />
                  Pakai riset konten siap pakai
                </div>
                <Select value={contextId || NONE} onValueChange={handleContextPick}>
                  <SelectTrigger className="w-full bg-card">
                    <SelectValue placeholder={`${kontenRecs.length} riset konten tersedia`} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>— Tanpa riset —</SelectItem>
                    {kontenRecs.map((r) => (
                      <SelectItem key={r.contextId} value={r.contextId}>
                        {r.title} {r.used ? "· sudah dipakai" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {contextId && (
                  <button
                    type="button"
                    onClick={() => {
                      setContextId("");
                      setAngle("");
                    }}
                    className="text-[11px] text-stone hover:text-rose-600 mt-1.5"
                  >
                    Hapus pilihan riset
                  </button>
                )}
              </div>
            )}

            {/* Generate button */}
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || insufficientCredit}
              className="w-full bg-teal hover:bg-teal-600 gap-2"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="size-4" />
                  Generate · {cost} credit
                </>
              )}
            </Button>
            {insufficientCredit && (
              <p className="text-[11px] text-rose-600 mt-1.5 text-center">
                Credit tidak cukup.{" "}
                <button
                  onClick={() => setSection("credit")}
                  className="underline font-medium"
                >
                  Isi credit →
                </button>
              </p>
            )}
          </SectionCard>
        </div>

        {/* ─── RIGHT PANEL — PREVIEW + LIBRARY ────────────── */}
        <div className="lg:col-span-3 space-y-3">
          {/* Preview area */}
          <SectionCard
            title="Preview"
            desc={
              viewing
                ? `${TYPE_LABEL[viewing.type]}${viewing.platform ? " · " + viewing.platform : ""}`
                : undefined
            }
            right={
              viewing ? (
                <Badge
                  variant="outline"
                  className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200"
                >
                  <CheckCircle2 className="size-3 mr-1" /> Tersimpan
                </Badge>
              ) : undefined
            }
          >
            {isGenerating ? (
              <LoadingSkeleton />
            ) : viewing ? (
              <div className="space-y-3">
                <ResultPreview content={viewing} />
                <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      toast({ title: "Sudah tersimpan di Library 👍" })
                    }
                    className="gap-1.5"
                  >
                    <CheckCircle2 className="size-3.5 text-emerald-600" />
                    Simpan ke Library
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerate}
                    className="gap-1.5"
                    disabled={isGenerating}
                  >
                    <RefreshCw className="size-3.5" />
                    Generate Lagi
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleVariation}
                    className="gap-1.5"
                  >
                    <Sparkles className="size-3.5 text-teal" />
                    Buat Variasi
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSection("toko")}
                    className="gap-1.5"
                  >
                    <Store className="size-3.5" />
                    Pakai di Toko
                  </Button>
                </div>
              </div>
            ) : (
              <EmptyState
                icon="✨"
                title="Pilih jenis konten & klik Generate"
                desc="Caption (2 credit) · Gambar AI (4) · Video Script (6) · Carousel (5). Setiap hasil otomatis tersimpan ke library di bawah."
              />
            )}
          </SectionCard>

          {/* Saved Library */}
          <SectionCard
            title="Library Konten"
            desc={`${filteredContents.length} konten tersimpan`}
            right={
              <div className="flex flex-wrap gap-1">
                {(["all", "caption", "gambar", "video", "carousel"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilter(f)}
                    className={cn(
                      "text-[11px] px-2 py-1 rounded-md transition-colors",
                      filter === f
                        ? "bg-teal text-white"
                        : "bg-cream-100 text-stone hover:bg-cream-200"
                    )}
                  >
                    {f === "all" ? "Semua" : TYPE_LABEL[f as ContentType]}
                  </button>
                ))}
              </div>
            }
            bodyClassName="p-3"
          >
            {contentsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-32 rounded-xl" />
                ))}
              </div>
            ) : filteredContents.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-3xl mb-2">📂</div>
                <div className="text-sm font-semibold text-ink">Belum ada konten</div>
                <p className="text-xs text-stone mt-1">
                  Generate konten pertama kamu di panel kiri.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-[480px] overflow-y-auto pr-1">
                {filteredContents.map((c) => (
                  <SavedLibraryCard
                    key={c.id}
                    item={c}
                    onView={() => handleView(c)}
                    onDelete={() => handleDelete(c)}
                  />
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
