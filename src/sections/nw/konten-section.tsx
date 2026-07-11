"use client";

// ─────────────────────────────────────────────────────────────────────────────
// KontenSection — AI content generator (gambar + video only), mobile-first
// 3 views: gallery (default), detail (tap card), create (FAB)
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppStore, getActiveBrand } from "@/lib/store";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/nw/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Copy,
  Download,
  Sparkles,
  ArrowLeft,
  Plus,
  Loader2,
  Clock,
  Pencil,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PLATFORMS, TONES, timeAgo } from "@/lib/constants";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────
type ContentType = "gambar" | "video";
type ViewMode = "gallery" | "detail" | "create";

interface ContentItem {
  id: string;
  brandId: string;
  productId: string | null;
  productName: string | null;
  contextId: string | null;
  type: ContentType;
  platform: string | null;
  body: string | null;
  assetUrl: string | null;
  createdAt: string;
}

interface ProductLite {
  id: string;
  type: string;
  name: string;
  price: number;
}

interface VideoPlan {
  script: string;
  scenes: { duration_sec: number; visual: string; voiceover: string; text_overlay: string }[];
  hashtags: string[];
  hooks: string[];
}

// ─── Constants ──────────────────────────────────────────────────────────────
const TYPE_LABEL: Record<ContentType, string> = { gambar: "Gambar", video: "Video" };
const NONE = "__none__";
const IMAGE_COSTS = [1, 2, 3, 4] as const;
const VIDEO_DURATIONS = [8, 16, 24] as const;

// ─── Helpers ────────────────────────────────────────────────────────────────
function getExcerpt(item: ContentItem): string {
  if (item.type === "gambar") {
    const t = (item.body ?? "").trim();
    return t.length > 60 ? t.slice(0, 60) + "…" : t || "(gambar)";
  }
  try {
    const plan = JSON.parse(item.body ?? "{}") as VideoPlan;
    return `${plan.scenes?.length ?? 0} scene · ${plan.hooks?.length ?? 0} hook`;
  } catch {
    return "Script video";
  }
}

function parseHashtags(text: string): string[] {
  const matches = text.match(/#[\w-]+/g);
  return matches ? Array.from(new Set(matches)) : [];
}

// ─── Gallery Card ───────────────────────────────────────────────────────────
function GalleryCard({
  item,
  onTap,
}: {
  item: ContentItem;
  onTap: () => void;
}) {
  const isImage = item.type === "gambar" && item.assetUrl;
  const isVideo = item.type === "video";

  return (
    <button
      onClick={onTap}
      className="relative group rounded-xl overflow-hidden border border-border bg-card hover:border-teal/40 transition-all active:scale-[0.98] text-left w-full"
    >
      {isImage ? (
        <div className="aspect-square bg-cream-100 relative overflow-hidden">
          <img
            src={item.assetUrl!}
            alt={item.productName ?? "Konten"}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          {item.platform && (
            <div className="absolute top-2 left-2">
              <Badge className="text-[10px] bg-black/60 text-white border-0 px-1.5 py-0 h-4">
                {item.platform.startsWith("Twitter") ? "X" : item.platform.slice(0, 4)}
              </Badge>
            </div>
          )}
        </div>
      ) : (
        <div className={cn(
          "aspect-square flex flex-col items-center justify-center gap-1.5 p-3",
          isVideo ? "bg-violet-50" : "bg-cream-100"
        )}>
          {isVideo ? (
            <>
              <VideoIcon className="size-8 text-violet-400" />
              <span className="text-[10px] font-semibold text-violet-600 uppercase tracking-wider">Video Script</span>
            </>
          ) : (
            <ImageIcon className="size-8 text-stone/30" />
          )}
          {item.platform && (
            <Badge className="text-[10px] bg-black/60 text-white border-0 px-1.5 py-0 h-4">
              {item.platform.startsWith("Twitter") ? "X" : item.platform.slice(0, 4)}
            </Badge>
          )}
        </div>
      )}
      <div className="p-2.5">
        <p className="text-xs text-ink line-clamp-2 leading-snug">
          {getExcerpt(item)}
        </p>
        {item.productName && (
          <div className="text-[10px] text-teal font-medium mt-0.5 truncate">
            {item.productName}
          </div>
        )}
        <div className="text-[10px] text-stone/60 mt-1">
          {timeAgo(item.createdAt)}
        </div>
      </div>
    </button>
  );
}

// ─── Gallery View ───────────────────────────────────────────────────────────
function GalleryView({
  items,
  isLoading,
  onView,
}: {
  items: ContentItem[];
  isLoading: boolean;
  onView: (item: ContentItem) => void;
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="aspect-square rounded-xl" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-5xl mb-3">📸</div>
        <div className="text-base font-bold text-ink">Belum ada konten</div>
        <p className="text-sm text-stone mt-1 max-w-xs">
          Klik tombol + di kanan bawah untuk buat konten gambar atau video pertama kamu.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {items.map((item) => (
        <GalleryCard key={item.id} item={item} onTap={() => onView(item)} />
      ))}
    </div>
  );
}

// ─── Detail View ────────────────────────────────────────────────────────────
function DetailView({
  item: initialItem,
  onBack,
  brandId,
}: {
  item: ContentItem;
  onBack: () => void;
  brandId: string;
}) {
  const { toast } = useToast();
  const setCredit = useAppStore((s) => s.setCredit);
  const queryClient = useQueryClient();

  const [item, setItem] = useState(initialItem);
  const [editText, setEditText] = useState("");
  const hashtags = parseHashtags(item.body ?? "");
  const isImage = item.type === "gambar";

  // Sync when initialItem changes (e.g. from parent)
  useEffect(() => { setItem(initialItem); }, [initialItem]);

  const editMutation = useMutation({
    mutationFn: () =>
      api<{ content: ContentItem; balanceAfter: number }>(`/api/content/${item.id}`, {
        method: "PATCH",
        json: { edit: editText },
      }),
    onSuccess: (data) => {
      setItem(data.content);
      setCredit(data.balanceAfter);
      setEditText("");
      queryClient.invalidateQueries({ queryKey: ["contents", brandId] });
      toast({ title: "Konten berhasil diedit! ✨" });
    },
    onError: (err: Error) => {
      toast({ title: "Gagal edit", description: err.message, variant: "destructive" });
    },
  });

  function copyText() {
    if (!item.body) return;
    navigator.clipboard.writeText(item.body);
    toast({ title: "Tersalin" });
  }

  function downloadImage() {
    if (!item.assetUrl) return;
    const a = document.createElement("a");
    a.href = item.assetUrl;
    a.download = `konten-${item.id}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast({ title: "Gambar didownload" });
  }

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-teal font-medium -ml-1">
        <ArrowLeft className="size-4" /> Kembali
      </button>

      {/* Media */}
      {isImage && item.assetUrl ? (
        <div className="rounded-xl overflow-hidden border border-border bg-black/5">
          <img src={item.assetUrl} alt="Konten" className="w-full h-auto" />
        </div>
      ) : !isImage ? (
        <VideoScriptPreview body={item.body ?? ""} />
      ) : (
        <div className="aspect-square rounded-xl bg-cream-100 border border-border flex items-center justify-center">
          <ImageIcon className="size-12 text-stone/30" />
        </div>
      )}

      {/* Badges */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="outline" className="text-[10px] bg-teal-50 text-teal-700 border-teal/20">
          {TYPE_LABEL[item.type]}
        </Badge>
        {item.platform && (
          <Badge variant="outline" className="text-[10px] bg-cream-100">
            {item.platform}
          </Badge>
        )}
        {item.productName && (
          <Badge variant="outline" className="text-[10px] text-stone">
            {item.productName}
          </Badge>
        )}
      </div>

      {/* Caption */}
      {item.body && isImage && (
        <div className="rounded-xl bg-cream-50/80 border border-border p-4">
          <p className="text-sm text-ink whitespace-pre-wrap leading-relaxed">{item.body}</p>
          {hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-border">
              {hashtags.map((h, i) => (
                <span key={i} className="text-xs text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded-md">{h}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit section */}
      <div className="rounded-xl border border-teal/20 bg-teal-50/30 p-3 space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-teal-700">
          <Pencil className="size-3.5" /> Edit Konten ({item.type === "gambar" ? "4" : "6"} credit)
        </div>
        <textarea
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          placeholder={`Mau ubah apa?\nMisal: "background diganti outdoor", "tone lebih formal", "target ibu-ibu"…`}
          rows={2}
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-ink placeholder:text-stone/50 focus:outline-none focus:ring-2 focus:ring-teal/30 resize-none"
        />
        <Button
          size="sm"
          disabled={!editText.trim() || editMutation.isPending}
          onClick={() => editMutation.mutate()}
          className="gap-1.5 bg-teal hover:bg-teal-600 w-full"
        >
          {editMutation.isPending ? (
            <>
              <Loader2 className="size-3.5 animate-spin" /> Mengedit...
            </>
          ) : (
            <>
              <Sparkles className="size-3.5" /> Edit
            </>
          )}
        </Button>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {item.body && (
          <Button variant="outline" size="sm" onClick={copyText} className="gap-1.5 flex-1">
            <Copy className="size-3.5" /> Copy
          </Button>
        )}
        {isImage && item.assetUrl && (
          <Button variant="outline" size="sm" onClick={downloadImage} className="gap-1.5 flex-1">
            <Download className="size-3.5" /> Download
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Video Script Preview (reused from old code) ────────────────────────────
function VideoScriptPreview({ body }: { body: string }) {
  let plan: VideoPlan;
  try {
    plan = JSON.parse(body) as VideoPlan;
  } catch {
    return <div className="text-sm text-rose-600">Format script tidak valid</div>;
  }

  return (
    <div className="space-y-3">
      {plan.script && (
        <div className="rounded-xl bg-violet-50/60 border border-violet/10 p-4">
          <div className="text-[10px] text-violet-600 font-semibold uppercase mb-1">Ringkasan</div>
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
                <span className="text-teal font-bold shrink-0">{i + 1}.</span>
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
        <div className="space-y-2">
          {plan.scenes?.map((s, i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-violet-500 text-white h-5 text-[10px]">{i + 1}</Badge>
                <span className="text-xs text-stone">{s.duration_sec}s</span>
              </div>
              <div className="space-y-1 text-xs">
                <div><span className="text-stone">Visual:</span> <span className="text-ink">{s.visual}</span></div>
                <div><span className="text-stone">Voice:</span> <span className="text-ink">{s.voiceover}</span></div>
                {s.text_overlay && (
                  <div><span className="text-stone">Text:</span> <span className="text-ink italic">&ldquo;{s.text_overlay}&rdquo;</span></div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      {plan.hashtags && plan.hashtags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {plan.hashtags.map((h, i) => (
            <span key={i} className="text-xs text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded-md">
              {h.startsWith("#") ? h : `#${h}`}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Filter Bar ─────────────────────────────────────────────────────────────
function FilterBar({
  activePlatform,
  setActivePlatform,
  activeProduct,
  setActiveProduct,
  products,
}: {
  activePlatform: string;
  setActivePlatform: (p: string) => void;
  activeProduct: string;
  setActiveProduct: (p: string) => void;
  products: ProductLite[];
}) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
      {/* Platform filters */}
      <div className="flex gap-1.5 flex-shrink-0">
        {["Semua", ...PLATFORMS].map((p) => (
          <button
            key={p}
            onClick={() => setActivePlatform(p === "Semua" ? "" : p)}
            className={cn(
              "px-2.5 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap border",
              (p === "Semua" && !activePlatform) || activePlatform === p
                ? "bg-teal text-white border-teal"
                : "bg-card text-stone border-border hover:border-teal/40"
            )}
          >
            {p === "Twitter/X" ? "X" : p === "Semua" ? "Semua" : p}
          </button>
        ))}
      </div>

      {/* Product filter */}
      {products.length > 0 && (
        <Select value={activeProduct || NONE} onValueChange={(v) => setActiveProduct(v === NONE ? "" : v)}>
          <SelectTrigger className="h-7 text-xs rounded-full border-border w-auto min-w-[110px] flex-shrink-0">
            <SelectValue placeholder="Produk" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>Semua Produk</SelectItem>
            {products.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

// ─── Create View ────────────────────────────────────────────────────────────
function CreateView({
  activeBrand,
  onBack,
}: {
  activeBrand: { id: string; name: string; category: string; toneOfVoice?: string | null };
  onBack: () => void;
}) {
  const user = useAppStore((s) => s.user);
  const setCredit = useAppStore((s) => s.setCredit);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [desc, setDesc] = useState("");
  const [productId, setProductId] = useState("");
  const [platform, setPlatform] = useState("");
  const [type, setType] = useState<ContentType>("gambar");
  const [imageCount, setImageCount] = useState<number>(1);
  const [durationSec, setDurationSec] = useState<number>(8);
  const [angle, setAngle] = useState("");
  const [targetAudience, setTargetAudience] = useState("");

  const creditBalance = user?.creditBalance ?? 0;
  const costPerUnit = type === "gambar" ? 4 : 6;
  const totalCost = type === "gambar" ? costPerUnit * imageCount : costPerUnit;
  const insufficient = creditBalance < totalCost;

  // Products
  const { data: productsData } = useQuery<{ products: ProductLite[] }>({
    queryKey: ["products", activeBrand.id],
    queryFn: () => api(`/api/products?brandId=${activeBrand.id}`),
    enabled: !!activeBrand.id,
  });

  // Research for target audience
  const { data: researchData } = useQuery<{ research: { result: any }[] }>({
    queryKey: ["research", activeBrand.id],
    queryFn: () => api(`/api/research?brandId=${activeBrand.id}`),
    enabled: !!activeBrand.id,
  });

  const audienceOptions = useMemo(() => {
    const seen = new Set<string>();
    const opts: string[] = [];
    for (const r of researchData?.research ?? []) {
      for (const a of (r.result?.target_audience ?? [])) {
        const name = a?.name as string;
        if (name && !seen.has(name)) {
          seen.add(name);
          opts.push(name);
        }
      }
    }
    return opts;
  }, [researchData]);

  const generateMutation = useMutation({
    mutationFn: () =>
      api<{ contents: ContentItem[]; balanceAfter: number }>("/api/content", {
        method: "POST",
        json: {
          brandId: activeBrand.id,
          productId: productId || undefined,
          type,
          platform: platform || undefined,
          angle: angle || undefined,
          imageCount: type === "gambar" ? imageCount : undefined,
          durationSec: type === "video" ? durationSec : undefined,
          targetAudience: targetAudience || undefined,
        },
      }),
    onSuccess: (data) => {
      const count = data.contents?.length ?? 0;
      toast({
        title: count > 1 ? `${count} konten berhasil dibuat! 🎉` : "Konten berhasil dibuat! 🎉",
        description: `Sisa credit: ${data.balanceAfter}`,
      });
      setCredit(data.balanceAfter);
      queryClient.invalidateQueries({ queryKey: ["contents", activeBrand.id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", activeBrand.id] });
      onBack();
    },
    onError: (err: Error) => {
      toast({ title: "Gagal generate", description: err.message, variant: "destructive" });
    },
  });

  const toneLabel = activeBrand.toneOfVoice
    ? TONES.find((t) => t.key === activeBrand.toneOfVoice)?.label ?? "Santai & Ramah"
    : "Santai & Ramah";

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-teal font-medium -ml-1">
        <ArrowLeft className="size-4" /> Kembali
      </button>

      <div>
        <h2 className="text-lg font-bold text-ink">Buat Konten Baru</h2>
        <p className="text-xs text-stone mt-0.5">
          Gambar AI (4 credit/item) · Video Script (6 credit)
        </p>
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-ink">Deskripsi Konten</label>
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder={`Ceritain konten yang mau dibuat, misal:\n"Promo diskon 50% keripik pedas, target anak muda yang suka ngemil sambil nonton…"`}
          rows={4}
          className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-ink placeholder:text-stone/50 focus:outline-none focus:ring-2 focus:ring-teal/30 resize-none"
        />
      </div>

      {/* Product */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-ink">Produk</label>
        <Select value={productId || NONE} onValueChange={(v) => setProductId(v === NONE ? "" : v)}>
          <SelectTrigger className="w-full rounded-xl">
            <SelectValue placeholder="Pilih produk (opsional)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>— Tanpa produk —</SelectItem>
            {(productsData?.products ?? []).map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name} ({p.type})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Target Audience */}
      {audienceOptions.length > 0 && (
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-ink">Target Audiens</label>
          <Select value={targetAudience || NONE} onValueChange={(v) => setTargetAudience(v === NONE ? "" : v)}>
            <SelectTrigger className="w-full rounded-xl">
              <SelectValue placeholder="Pilih audiens dari riset" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>— Tanpa target —</SelectItem>
              {audienceOptions.map((a) => (
                <SelectItem key={a} value={a}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Platform */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-ink">Platform Sosmed</label>
        <div className="flex flex-wrap gap-1.5">
          {PLATFORMS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPlatform(platform === p ? "" : p)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
                platform === p
                  ? "bg-teal text-white border-teal"
                  : "bg-card text-stone border-border hover:border-teal/40"
              )}
            >
              {p === "Twitter/X" ? "X (Twitter)" : p}
            </button>
          ))}
        </div>
      </div>

      {/* Type selector */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-ink">Tipe Konten</label>
        <div className="grid grid-cols-2 gap-2">
          {(["gambar", "video"] as ContentType[]).map((t) => {
            const cost = t === "gambar" ? 4 : 6;
            const active = type === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all",
                  active
                    ? "border-teal bg-teal-50 ring-1 ring-teal/30"
                    : "border-border bg-card hover:border-teal/30"
                )}
              >
                {t === "gambar" ? (
                  <ImageIcon className={cn("size-6", active ? "text-teal" : "text-stone/50")} />
                ) : (
                  <VideoIcon className={cn("size-6", active ? "text-teal" : "text-stone/50")} />
                )}
                <span className="text-sm font-semibold text-ink">{TYPE_LABEL[t]}</span>
                <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-cream-100">
                  {cost} credit
                </Badge>
              </button>
            );
          })}
        </div>
      </div>

      {/* Image count (gambar only) */}
      {type === "gambar" && (
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-ink">
            Jumlah Gambar ({imageCount} × 4 = {imageCount * 4} credit)
          </label>
          <div className="flex gap-2">
            {IMAGE_COSTS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setImageCount(n)}
                className={cn(
                  "flex-1 py-2 rounded-xl text-sm font-bold transition-colors border",
                  imageCount === n
                    ? "bg-teal text-white border-teal"
                    : "bg-card text-ink border-border hover:border-teal/40"
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Duration (video only) */}
      {type === "video" && (
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-ink">
            Durasi Video ({durationSec} detik)
          </label>
          <div className="flex gap-2">
            {VIDEO_DURATIONS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDurationSec(d)}
                className={cn(
                  "flex-1 py-2 rounded-xl text-sm font-bold transition-colors border",
                  durationSec === d
                    ? "bg-violet-500 text-white border-violet-500"
                    : "bg-card text-ink border-border hover:border-violet/40"
                )}
              >
                <Clock className="size-3.5 inline mr-1" />
                {d}s
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Style / Angle */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-ink">Style / Angle (opsional)</label>
        <Input
          value={angle}
          onChange={(e) => setAngle(e.target.value)}
          placeholder="cth: promosi diskon, behind the scene, review pelanggan…"
          className="rounded-xl"
        />
      </div>

      {/* Tone */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-ink">Tone Suara</span>
        <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal/20 gap-1">
          {toneLabel}
        </Badge>
      </div>

      {/* Generate button */}
      <Button
        onClick={() => generateMutation.mutate()}
        disabled={generateMutation.isPending || insufficient}
        className={cn(
          "w-full gap-2 rounded-xl py-6 text-base font-bold",
          type === "video" ? "bg-violet-500 hover:bg-violet-600" : "bg-teal hover:bg-teal-600"
        )}
      >
        {generateMutation.isPending ? (
          <>
            <Loader2 className="size-5 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="size-5" />
            Generate · {totalCost} credit
          </>
        )}
      </Button>

      {insufficient && (
        <p className="text-xs text-rose-600 text-center -mt-3">
          Credit tidak cukup. Silakan top-up di Pengaturan.
        </p>
      )}
    </div>
  );
}

// ─── Main Section ───────────────────────────────────────────────────────────
export function KontenSection() {
  const user = useAppStore((s) => s.user);
  const setCredit = useAppStore((s) => s.setCredit);
  const activeBrand = getActiveBrand(useAppStore.getState());
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [view, setView] = useState<ViewMode>("gallery");
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [platformFilter, setPlatformFilter] = useState("");
  const [productFilter, setProductFilter] = useState("");

  // Products for filter
  const { data: productsData } = useQuery<{ products: ProductLite[] }>({
    queryKey: ["products", activeBrand?.id],
    queryFn: () => api(`/api/products?brandId=${activeBrand?.id}`),
    enabled: !!activeBrand?.id,
  });

  // Contents
  const { data: contentsData, isLoading } = useQuery<{ contents: ContentItem[] }>({
    queryKey: ["contents", activeBrand?.id, platformFilter, productFilter],
    queryFn: () => {
      const params = new URLSearchParams({ brandId: activeBrand!.id });
      if (platformFilter) params.set("platform", platformFilter);
      if (productFilter) params.set("productId", productFilter);
      return api(`/api/content?${params.toString()}`);
    },
    enabled: !!activeBrand?.id && view === "gallery",
  });

  // Delete
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/api/content/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast({ title: "Konten dihapus" });
      queryClient.invalidateQueries({ queryKey: ["contents", activeBrand?.id] });
      setSelectedContent(null);
      setView("gallery");
    },
    onError: (err: Error) => {
      toast({ title: "Gagal hapus", description: err.message, variant: "destructive" });
    },
  });

  // View detail
  function handleView(item: ContentItem) {
    setSelectedContent(item);
    setView("detail");
  }

  function handleBack() {
    setView("gallery");
    setSelectedContent(null);
  }

  if (!activeBrand) {
    return (
      <div>
        <PageHeader title="Konten" subtitle="Buat konten AI untuk brand kamu" icon="📝" />
        <div className="flex flex-col items-center py-16 text-center">
          <div className="text-5xl mb-3">🏪</div>
          <p className="text-sm text-stone">Buat brand dulu di Beranda untuk mulai generate konten.</p>
        </div>
      </div>
    );
  }

  const contents = contentsData?.contents ?? [];
  const creditBalance = user?.creditBalance ?? 0;

  return (
    <div className="relative min-h-[calc(100vh-10rem)]">
      {/* Header — always visible */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-lg font-bold text-ink flex items-center gap-2">
            📝 Konten
          </h1>
          <p className="text-[11px] text-stone">
            {contents.length} konten · {creditBalance} credit
          </p>
        </div>
      </div>

      {view === "gallery" && (
        <>
          <FilterBar
            activePlatform={platformFilter}
            setActivePlatform={setPlatformFilter}
            activeProduct={productFilter}
            setActiveProduct={setProductFilter}
            products={productsData?.products ?? []}
          />
          <div className="mt-3">
            <GalleryView items={contents} isLoading={isLoading} onView={handleView} />
          </div>

          {/* FAB */}
          <button
            onClick={() => setView("create")}
            className="fixed bottom-20 right-4 z-30 size-14 rounded-full bg-teal hover:bg-teal-600 text-white shadow-lg flex items-center justify-center transition-all active:scale-95 md:bottom-8"
            aria-label="Buat konten baru"
          >
            <Plus className="size-7" />
          </button>
        </>
      )}

      {view === "detail" && selectedContent && (
        <DetailView item={selectedContent!} onBack={handleBack} brandId={activeBrand!.id} />
      )}

      {view === "create" && (
        <CreateView activeBrand={activeBrand} onBack={handleBack} />
      )}
    </div>
  );
}

export default KontenSection;
