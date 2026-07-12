"use client";

// ─────────────────────────────────────────────────────────────────────────────
// KontenSection — AI content generator (gambar + video only), mobile-first
// 2 views: gallery (default, with the chat-style ComposerBar for creating new
// content inline), detail (tap card)
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppStore, getActiveBrand } from "@/lib/store";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/nw/primitives";
import { Button } from "@/components/ui/button";
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
  Loader2,
  Clock,
  Pencil,
  Package,
  X,
  Send,
  Plus,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { PLATFORMS, timeAgo } from "@/lib/constants";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────
type ContentType = "gambar" | "video";
type ViewMode = "gallery" | "detail";

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
  imageUrl: string | null;
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

      <div className="flex flex-col md:flex-row gap-4 md:gap-6">
        {/* Media — left column on desktop */}
        <div className="md:w-1/2 md:max-w-[55%] shrink-0">
          {isImage && item.assetUrl ? (
            <div className="rounded-xl overflow-hidden border border-border bg-black/5 flex items-center justify-center">
              <img src={item.assetUrl} alt="Konten" className="max-w-full max-h-[70vh] w-auto h-auto object-contain" />
            </div>
          ) : !isImage ? (
            <VideoScriptPreview body={item.body ?? ""} />
          ) : (
            <div className="aspect-square rounded-xl bg-cream-100 border border-border flex items-center justify-center">
              <ImageIcon className="size-12 text-stone/30" />
            </div>
          )}
        </div>

        {/* Right column: badges + caption + edit */}
        <div className="flex-1 min-w-0 space-y-4">
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
        </div>
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
  onProductCreated,
}: {
  activePlatform: string;
  setActivePlatform: (p: string) => void;
  activeProduct: string;
  setActiveProduct: (p: string) => void;
  products: ProductLite[];
  onProductCreated?: () => void;
}) {
  const brandId = getActiveBrand(useAppStore.getState())?.id ?? "";
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
      <Select value={activeProduct || NONE} onValueChange={(v) => {
        setActiveProduct(v === NONE ? "" : v);
      }}>
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

      {/* Quick add product */}
      <QuickProductDialog brandId={brandId} onCreated={onProductCreated} />
    </div>
  );
}

// ─── Quick Product Dialog ────────────────────────────────────
function QuickProductDialog({
  brandId,
  onCreated,
}: {
  brandId: string;
  onCreated?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  async function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { compressImage } = await import("@/lib/image-compress");
      const { file: compressed } = await compressImage(file, { maxSize: 1024, quality: 0.7, maxBytes: 300 * 1024 });
      const fd = new FormData();
      fd.append("file", compressed, compressed.name);
      const r = await api<{ imageUrl: string }>("/api/upload/image", { method: "POST", body: fd, json: undefined });
      setImageUrl(r.imageUrl);
      toast({ title: "Foto terupload" });
    } catch {
      toast({ title: "Gagal upload foto", variant: "destructive" });
    } finally {
      setUploading(false);
      if (e.target) e.target.value = "";
    }
  }

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api("/api/products", {
        method: "POST",
        json: { brandId, type: "barang", name: name.trim(), description: desc.trim() || null, price: price ? Number(price) : 0, imageUrl: imageUrl || null },
      });
      toast({ title: "Produk ditambahkan" });
      setOpen(false);
      setName(""); setDesc(""); setPrice(""); setImageUrl("");
      onCreated?.();
    } catch (err: any) {
      toast({ title: "Gagal simpan", description: err?.message ?? "Coba lagi", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-7 px-2 rounded-full border border-dashed border-teal/40 text-xs text-teal font-medium hover:bg-teal/5 transition-colors flex items-center gap-1 flex-shrink-0"
      >
        <Plus className="size-3.5" /> Tambah
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Tambah Produk</DialogTitle>
            <DialogDescription>Upload foto dan isi nama produk saja sudah cukup.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImage} className="hidden" />
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="w-full aspect-video rounded-xl border-2 border-dashed border-border bg-cream-50 flex flex-col items-center justify-center gap-1 hover:border-teal/40 transition-colors overflow-hidden"
              >
                {uploading ? (
                  <Loader2 className="size-6 animate-spin text-stone" />
                ) : imageUrl ? (
                  <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <ImageIcon className="size-6 text-stone/40" />
                    <span className="text-xs text-stone">Upload foto produk</span>
                  </>
                )}
              </button>
            </div>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama produk *" className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal/30" />
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Deskripsi (opsional)" rows={2} className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal/30" />
            <input value={price} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))} placeholder="Harga (opsional)" className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal/30" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button className="bg-teal hover:bg-teal-600" onClick={handleSave} disabled={!name.trim() || saving}>
              {saving && <Loader2 className="size-4 animate-spin mr-1" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Composer Bar ───────────────────────────────────────────────────────────
// Chat-style entry point for new content, replacing the old separate
// full-page "Create" form. Idle: a single-line prompt input. Focused: it
// expands in place — parameter chips (platform/tipe/jumlah/audiens) plus a
// product PHOTO grid appear right below it (the caller hides the regular
// content gallery for the duration, see KontenSection). Submitting (Enter,
// or the send button) generates immediately with whatever's selected, no
// separate confirm step, then collapses back to the idle/gallery state.
function ComposerBar({
  activeBrand,
  products,
  onFocusChange,
  onGenerated,
}: {
  activeBrand: { id: string; name: string; category: string; toneOfVoice?: string | null };
  products: ProductLite[];
  onFocusChange: (focused: boolean) => void;
  onGenerated: () => void;
}) {
  const user = useAppStore((s) => s.user);
  const setCredit = useAppStore((s) => s.setCredit);
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);

  const [focused, setFocused] = useState(false);
  const [angle, setAngle] = useState("");
  const [productId, setProductId] = useState("");
  const [platform, setPlatform] = useState("");
  const [type, setType] = useState<ContentType>("gambar");
  const [imageCount, setImageCount] = useState<number>(1);
  const [durationSec, setDurationSec] = useState<number>(8);
  const [targetAudience, setTargetAudience] = useState("");

  function setFocusedBoth(v: boolean) {
    setFocused(v);
    onFocusChange(v);
  }

  const creditBalance = user?.creditBalance ?? 0;
  const costPerUnit = type === "gambar" ? 4 : 6;
  const totalCost = type === "gambar" ? costPerUnit * imageCount : costPerUnit;
  const insufficient = creditBalance < totalCost;

  // Research for target audience — same source as before (personas from
  // this brand's basic_research results).
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
          angle: angle.trim() || undefined,
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
      setAngle("");
      setProductId("");
      setPlatform("");
      setTargetAudience("");
      setFocusedBoth(false);
      onGenerated();
    },
    onError: (err: Error) => {
      toast({ title: "Gagal generate", description: err.message, variant: "destructive" });
    },
  });

  const canSubmit = (angle.trim().length > 0 || !!productId) && !insufficient && !generateMutation.isPending;

  function submit() {
    if (!canSubmit) return;
    generateMutation.mutate();
  }

  const selectedProduct = products.find((p) => p.id === productId);

  // Idle: docked to the bottom of the page (sticky — this component must be
  // the last child of the gallery view for that to work, see KontenSection).
  // Focused: relocates to a centered overlay over the whole viewport, with a
  // backdrop — same DOM node throughout (only the wrapper's positioning
  // classes change), so the textarea never remounts/loses focus.
  return (
    <div
      className="sticky bottom-16 md:bottom-4 z-30"
    >
      <div
        ref={containerRef}
        onBlur={(e) => {
          if (!containerRef.current?.contains(e.relatedTarget as Node)) {
            setFocusedBoth(false);
          }
        }}
        className={cn(
          "rounded-2xl border bg-card transition-shadow duration-200 w-full",
          focused
            ? "shadow-2xl border-teal/40"
            : "border-border shadow-lg"
        )}
      >
      {/* Prompt row */}
      <div className="flex items-end gap-2 p-2.5">
        <textarea
          value={angle}
          onChange={(e) => setAngle(e.target.value)}
          onFocus={() => setFocusedBoth(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
            if (e.key === "Escape") {
              e.preventDefault();
              (e.target as HTMLTextAreaElement).blur();
              setFocusedBoth(false);
            }
          }}
          placeholder={`Ceritain konten yang mau dibuat, misal: "promo diskon 50% keripik pedas, target anak muda"…`}
          rows={focused ? 2 : 1}
          className="flex-1 resize-none bg-transparent text-sm text-ink placeholder:text-stone/50 focus:outline-none py-1.5"
        />
        <Button
          size="icon"
          onClick={submit}
          disabled={!canSubmit}
          className={cn(
            "shrink-0 rounded-full size-9",
            type === "video" ? "bg-violet-500 hover:bg-violet-600" : "bg-teal hover:bg-teal-600"
          )}
          aria-label="Generate konten"
        >
          {generateMutation.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
        </Button>
      </div>

      {focused && (
        <div className="border-t border-border p-3 space-y-3">
          {/* Parameter chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(["gambar", "video"] as ContentType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
                  type === t
                    ? "bg-teal text-white border-teal"
                    : "bg-cream-100 text-stone border-border hover:border-teal/40"
                )}
              >
                {t === "gambar" ? <ImageIcon className="size-3" /> : <VideoIcon className="size-3" />}
                {TYPE_LABEL[t]} · {t === "gambar" ? 4 : 6} credit
              </button>
            ))}

            <span className="w-px h-4 bg-border" aria-hidden />

            {PLATFORMS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPlatform(platform === p ? "" : p)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
                  platform === p
                    ? "bg-ink text-white border-ink"
                    : "bg-cream-100 text-stone border-border hover:border-teal/40"
                )}
              >
                {p === "Twitter/X" ? "X" : p}
              </button>
            ))}

            <span className="w-px h-4 bg-border" aria-hidden />

            {type === "gambar"
              ? IMAGE_COSTS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setImageCount(n)}
                    className={cn(
                      "size-7 rounded-full text-xs font-bold border transition-colors",
                      imageCount === n
                        ? "bg-teal text-white border-teal"
                        : "bg-cream-100 text-stone border-border hover:border-teal/40"
                    )}
                  >
                    {n}×
                  </button>
                ))
              : VIDEO_DURATIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDurationSec(d)}
                    className={cn(
                      "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
                      durationSec === d
                        ? "bg-violet-500 text-white border-violet-500"
                        : "bg-cream-100 text-stone border-border hover:border-violet/40"
                    )}
                  >
                    <Clock className="size-3" /> {d}s
                  </button>
                ))}

            {/* Target audience — research-based options + free text input */}
            <div className="flex items-center gap-1.5">
              {audienceOptions.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setTargetAudience(targetAudience === a ? "" : a)}
                  className={cn(
                    "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
                    targetAudience === a
                      ? "bg-ink text-white border-ink"
                      : "bg-cream-100 text-stone border-border hover:border-teal/40"
                  )}
                >
                  {a}
                </button>
              ))}
              <input
                type="text"
                value={targetAudience && !audienceOptions.includes(targetAudience) ? targetAudience : ""}
                onChange={(e) => setTargetAudience(e.target.value)}
                onFocus={() => {
                  if (targetAudience && audienceOptions.includes(targetAudience)) setTargetAudience("");
                }}
                placeholder={audienceOptions.length > 0 ? "Atau ketik sendiri…" : "Target audiens…"}
                className="px-2.5 py-1 rounded-full text-xs bg-cream-100 text-ink border border-border placeholder:text-stone/50 focus:outline-none focus:border-teal/40 w-auto min-w-[100px] max-w-[160px]"
              />
            </div>

            {selectedProduct && (
              <button
                type="button"
                onClick={() => setProductId("")}
                className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full text-xs font-medium bg-teal-50 text-teal-700 border border-teal/30"
              >
                {selectedProduct.name}
                <X className="size-3" />
              </button>
            )}
          </div>

          {/* Product photo picker — "seluruh foto produk" */}
          <div>
            <div className="text-[11px] text-stone mb-1.5">Pilih produk (opsional)</div>
            {products.length === 0 ? (
              <p className="text-xs text-stone">
                Belum ada produk. <span className="text-teal font-medium">Tambah dulu di Toko.</span>
              </p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {products.map((p) => {
                  const active = productId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setProductId(active ? "" : p.id)}
                      className={cn(
                        "rounded-xl overflow-hidden border-2 text-left transition-all",
                        active ? "border-teal ring-2 ring-teal/30" : "border-border hover:border-teal/30"
                      )}
                    >
                      <div className="aspect-square bg-cream-100 flex items-center justify-center overflow-hidden">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <Package className="size-6 text-stone/30" />
                        )}
                      </div>
                      <div className="px-1.5 py-1 text-[10px] text-ink truncate">{p.name}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {insufficient && (
            <p className="text-xs text-rose-600">
              Credit tidak cukup ({totalCost} dibutuhkan). Top-up di Pengaturan.
            </p>
          )}
        </div>
      )}
      </div>
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
  // While the composer is focused, it takes over the gallery's space with
  // the product photo picker (see ComposerBar) — the gallery/filter reappear
  // once focus leaves the composer or a generation completes.
  const [composing, setComposing] = useState(false);

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
      <PageHeader
        title="Konten"
        subtitle={`${contents.length} konten · ${creditBalance} credit`}
        icon="📝"
        className="mb-3"
      />

      {view === "gallery" && (
        <>
          {!composing && (
            <>
              <FilterBar
                activePlatform={platformFilter}
                setActivePlatform={setPlatformFilter}
                activeProduct={productFilter}
                setActiveProduct={setProductFilter}
                products={productsData?.products ?? []}
                onProductCreated={() => queryClient.invalidateQueries({ queryKey: ["products", activeBrand?.id] })}
              />
              <div className="mt-3">
                <GalleryView items={contents} isLoading={isLoading} onView={handleView} />
              </div>
            </>
          )}

          {/* Last child on purpose — sticky-bottom only docks correctly when
              nothing follows it in the scroll flow (see ComposerBar). */}
          <ComposerBar
            activeBrand={activeBrand}
            products={productsData?.products ?? []}
            onFocusChange={setComposing}
            onGenerated={() => {
              queryClient.invalidateQueries({ queryKey: ["contents", activeBrand.id] });
              queryClient.invalidateQueries({ queryKey: ["dashboard", activeBrand.id] });
            }}
          />
        </>
      )}

      {view === "detail" && selectedContent && (
        <DetailView item={selectedContent!} onBack={handleBack} brandId={activeBrand!.id} />
      )}
    </div>
  );
}

export default KontenSection;
