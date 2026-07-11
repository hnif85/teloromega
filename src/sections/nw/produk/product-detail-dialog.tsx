"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { compressImage } from "@/lib/image-compress";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ORDER_STATUS,
  formatRupiah,
  formatRupiahShort,
  timeAgo,
} from "@/lib/constants";
import {
  Package,
  Briefcase,
  Tag,
  TrendingUp,
  ShoppingCart,
  DollarSign,
  Receipt,
  ArrowDownRight,
  ArrowUpRight,
  Layers,
  Pencil,
  X,
  FileText,
  Image as ImageIcon,
  Film,
  Layers3,
  AlertTriangle,
  CalendarDays,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────
interface ProductDetailResponse {
  product: {
    id: string;
    name: string;
    type: string;
    price: number;
    costPrice: number | null;
    stock: number | null;
    minStock: number | null;
    sku: string | null;
    description: string | null;
    imageUrl: string | null;
    isActive: boolean;
    createdAt: string;
  };
  stats: {
    totalSold: number;
    totalRevenue: number;
    totalCost: number;
    grossProfit: number;
    marginPct: number;
    orderCount: number;
    lastSoldAt: string | null;
  };
  recentOrders: {
    id: string;
    orderNumber: string;
    customerName: string;
    qty: number;
    total: number;
    status: string;
    paymentStatus: "Lunas" | "Menunggu" | "Sebagian" | "Belum bayar";
    date: string;
  }[];
  stockMovements: {
    date: string;
    type: "in" | "out";
    quantity: number;
    reference: string;
    balance: number;
  }[];
  relatedContent: {
    id: string;
    type: string;
    platform: string | null;
    createdAt: string;
  }[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

const PAYMENT_BADGE: Record<string, string> = {
  Lunas: "bg-emerald-100 text-emerald-700 border-emerald-200 border",
  Menunggu: "bg-amber-100 text-amber-700 border-amber-200 border",
  Sebagian: "bg-stone-100 text-stone-600 border-stone-200 border",
  "Belum bayar": "bg-rose-100 text-rose-700 border-rose-200 border",
};

const CONTENT_ICON: Record<string, React.ReactNode> = {
  caption: <FileText className="size-4" />,
  gambar: <ImageIcon className="size-4" />,
  video: <Film className="size-4" />,
  carousel: <Layers3 className="size-4" />,
};

// ─── Component ──────────────────────────────────────────────────────────────
export function ProductDetailDialog({
  productId,
  open,
  onOpenChange,
  onEdit,
}: {
  productId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
}) {
  const enabled = !!productId && open;

  const { data, isLoading, isError } = useQuery<ProductDetailResponse>({
    queryKey: ["product-detail", productId],
    queryFn: () => api<ProductDetailResponse>(`/api/products/${productId}/details`),
    enabled,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        {/* Header (fixed) */}
        <div className="p-5 pb-4 border-b border-border shrink-0">
          {isLoading || !data ? (
            <ProductHeaderSkeleton />
          ) : isError ? (
            <div className="flex items-center gap-2 text-rose-600 text-sm">
              <AlertTriangle className="size-4" /> Gagal memuat detail produk.
            </div>
          ) : (
            <ProductHeader product={data.product} stats={data.stats} />
          )}
        </div>

        {/* Stats row */}
        {data && !isLoading && !isError && (
          <div className="px-5 pt-4 pb-2 shrink-0">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              <MiniStat
                label="Total Terjual"
                value={data.stats.totalSold}
                icon={<ShoppingCart className="size-3.5" />}
                accent="teal"
              />
              <MiniStat
                label="Total Pendapatan"
                value={formatRupiahShort(data.stats.totalRevenue)}
                icon={<DollarSign className="size-3.5" />}
                accent="success"
              />
              <MiniStat
                label="Laba Kotor"
                value={formatRupiahShort(data.stats.grossProfit)}
                icon={<TrendingUp className="size-3.5" />}
                accent="teal"
              />
              <MiniStat
                label="Margin"
                value={`${data.stats.marginPct}%`}
                icon={<Layers className="size-3.5" />}
                accent="orange"
              />
              <MiniStat
                label="Jumlah Order"
                value={data.stats.orderCount}
                icon={<Receipt className="size-3.5" />}
                accent="stone"
              />
              <MiniStat
                label="Penjualan Terakhir"
                value={data.stats.lastSoldAt ? timeAgo(data.stats.lastSoldAt) : "—"}
                icon={<CalendarDays className="size-3.5" />}
                accent="warning"
              />
            </div>
          </div>
        )}

        {/* Tabs (scrollable) */}
        <div className="flex-1 overflow-y-auto px-5 py-3 min-h-0">
          {isLoading ? (
            <DetailSkeleton />
          ) : isError ? (
            <div className="text-sm text-rose-600 py-6 text-center">
              Produk tidak ditemukan atau gagal dimuat.
            </div>
          ) : data ? (
            <Tabs defaultValue="orders" className="gap-3">
              <TabsList className="w-full justify-start h-auto flex-wrap">
                <TabsTrigger value="orders" className="gap-1.5">
                  <Receipt className="size-3.5" /> Riwayat Order
                  <span className="ml-1 text-[10px] bg-cream-200 text-stone px-1.5 py-0.5 rounded-full">
                    {data.recentOrders.length}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="stock" className="gap-1.5">
                  <Layers className="size-3.5" /> Pergerakan Stok
                </TabsTrigger>
                <TabsTrigger value="content" className="gap-1.5">
                  <FileText className="size-3.5" /> Konten Terkait
                  <span className="ml-1 text-[10px] bg-cream-200 text-stone px-1.5 py-0.5 rounded-full">
                    {data.relatedContent.length}
                  </span>
                </TabsTrigger>
              </TabsList>

              {/* ─── Riwayat Order ─── */}
              <TabsContent value="orders">
                {data.recentOrders.length === 0 ? (
                  <div className="text-center text-sm text-stone py-8 italic">
                    Belum ada order untuk produk ini.
                  </div>
                ) : (
                  <div className="rounded-lg border border-border overflow-hidden">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Order</TableHead>
                            <TableHead className="text-xs">Customer</TableHead>
                            <TableHead className="text-xs text-right">Qty</TableHead>
                            <TableHead className="text-xs text-right">Total</TableHead>
                            <TableHead className="text-xs">Status</TableHead>
                            <TableHead className="text-xs">Bayar</TableHead>
                            <TableHead className="text-xs hidden md:table-cell">Waktu</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.recentOrders.map((o) => {
                            const statusMeta =
                              ORDER_STATUS.find((s) => s.key === o.status) ??
                              ORDER_STATUS[0];
                            return (
                              <TableRow key={o.id}>
                                <TableCell className="text-xs font-mono text-ink">
                                  {o.orderNumber}
                                </TableCell>
                                <TableCell className="text-xs text-ink font-medium">
                                  {o.customerName}
                                </TableCell>
                                <TableCell className="text-xs text-right tabular-nums">
                                  {o.qty}
                                </TableCell>
                                <TableCell className="text-xs text-right font-semibold tabular-nums">
                                  {formatRupiah(o.total)}
                                </TableCell>
                                <TableCell>
                                  <Badge className={`text-[10px] h-5 ${statusMeta.color}`}>
                                    {statusMeta.label}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    className={`text-[10px] h-5 ${PAYMENT_BADGE[o.paymentStatus] ?? ""}`}
                                  >
                                    {o.paymentStatus}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs text-stone hidden md:table-cell">
                                  {timeAgo(o.date)}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* ─── Pergerakan Stok ─── */}
              <TabsContent value="stock">
                {data.product.type === "jasa" ? (
                  <div className="text-center text-sm text-stone py-8 italic">
                    Produk jasa tidak melacak stok.
                  </div>
                ) : data.stockMovements.length === 0 ? (
                  <div className="text-center text-sm text-stone py-8 italic">
                    Belum ada pergerakan stok.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {data.stockMovements.map((m, idx) => {
                      const isIn = m.type === "in";
                      return (
                        <div
                          key={`${m.date}-${idx}`}
                          className={`flex items-center gap-3 rounded-lg border p-2.5 ${
                            isIn
                              ? "border-emerald-200 bg-emerald-50/40"
                              : "border-rose-200 bg-rose-50/40"
                          }`}
                        >
                          <div
                            className={`size-8 rounded-full flex items-center justify-center shrink-0 ${
                              isIn
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-rose-100 text-rose-700"
                            }`}
                          >
                            {isIn ? (
                              <ArrowDownRight className="size-4" />
                            ) : (
                              <ArrowUpRight className="size-4" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-ink flex items-center gap-2">
                              <span className={isIn ? "text-emerald-700" : "text-rose-700"}>
                                {isIn ? "+" : "−"}
                                {m.quantity} unit
                              </span>
                              <span className="text-xs text-stone font-normal">
                                {isIn ? "Stok masuk" : "Stok keluar"}
                              </span>
                            </div>
                            <div className="text-[11px] text-stone flex items-center gap-1.5">
                              <span className="font-mono">{m.reference}</span>
                              <span>·</span>
                              <span>{timeAgo(m.date)}</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-[10px] text-stone uppercase tracking-wide">
                              Sisa stok
                            </div>
                            <div className="text-sm font-bold text-ink tabular-nums">
                              {m.balance}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              {/* ─── Konten Terkait ─── */}
              <TabsContent value="content">
                {data.relatedContent.length === 0 ? (
                  <div className="text-center text-sm text-stone py-8 italic">
                    Belum ada konten yang dibuat untuk produk ini.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {data.relatedContent.map((c) => (
                      <div
                        key={c.id}
                        className="rounded-xl border border-border bg-card p-3 flex items-start gap-3 hover:border-teal/30 transition-colors"
                      >
                        <div className="size-9 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center shrink-0">
                          {CONTENT_ICON[c.type] ?? <FileText className="size-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-ink capitalize">
                            {c.type}
                          </div>
                          <div className="text-[11px] text-stone flex items-center gap-1.5 mt-0.5">
                            {c.platform && (
                              <Badge variant="outline" className="text-[9px] h-3.5 py-0">
                                {c.platform}
                              </Badge>
                            )}
                            <span>{timeAgo(c.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          ) : null}
        </div>

        {/* Footer */}
        <Separator className="bg-border" />
        <div className="p-4 pt-3 flex flex-wrap items-center justify-end gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="gap-1.5">
            <X className="size-4" /> Tutup
          </Button>
          {data && onEdit && (
            <Button
              size="sm"
              className="bg-teal hover:bg-teal-600 gap-1.5"
              onClick={onEdit}
            >
              <Pencil className="size-4" /> Edit Produk
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────
function ProductHeader({
  product,
  stats,
}: {
  product: ProductDetailResponse["product"];
  stats: ProductDetailResponse["stats"];
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [uploadStage, setUploadStage] = useState<"idle" | "compressing" | "uploading">("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(product.imageUrl);

  const isBarang = product.type === "barang";
  const marginAmount =
    product.costPrice != null && product.price > 0
      ? product.price - product.costPrice
      : null;

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      // Stage 1: Compress
      setUploadStage("compressing");
      const compressed = await compressImage(file, {
        maxSize: 1024,
        quality: 0.7,
        maxBytes: 300 * 1024,
      });

      // Stage 2: Upload
      setUploadStage("uploading");
      const form = new FormData();
      form.append("file", compressed, compressed.name);
      const r = await api<{ imageUrl: string }>(`/api/products/${product.id}/image`, {
        method: "POST",
        body: form,
        json: undefined,
      });
      setPreviewUrl(r.imageUrl);
      queryClient.invalidateQueries({ queryKey: ["product-detail", product.id] });
      toast({ title: "Foto tersimpan!", description: "Gambar produk berhasil diupload." });
    } catch (err: any) {
      toast({ title: "Gagal upload", description: err?.message ?? "Coba lagi nanti.", variant: "destructive" });
    } finally {
      setUploading(false);
      setUploadStage("idle");
      e.target.value = "";
    }
  }

  return (
    <div className="flex items-start gap-4">
      {/* Image / placeholder */}
      <div className="relative group size-20 rounded-xl overflow-hidden bg-cream-100 shrink-0 flex items-center justify-center">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={product.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-teal-100 via-cream-100 to-orange-100/40">
            <span className="text-2xl font-extrabold text-teal-600/70">
              {getInitials(product.name)}
            </span>
          </div>
        )}
        {/* Upload overlay */}
        <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
            className="hidden"
            onChange={handleImageUpload}
            disabled={uploading}
          />
          {uploading ? (
            <span className="text-white text-[10px] font-medium text-center px-1">
              {uploadStage === "compressing" ? "Kompres..." : "Upload..."}
            </span>
          ) : (
            <ImageIcon className="size-5 text-white" />
          )}
        </label>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <Badge
            className={
              isBarang
                ? "bg-teal-100 text-teal-700 border-teal-200 border"
                : "bg-orange-100 text-orange-700 border-orange-200 border"
            }
          >
            {isBarang ? (
              <>
                <Package className="size-3 mr-1" /> Barang
              </>
            ) : (
              <>
                <Briefcase className="size-3 mr-1" /> Jasa
              </>
            )}
          </Badge>
          {product.sku && (
            <Badge variant="outline" className="text-[10px] py-0 h-5 border-stone-200 text-stone">
              <Tag className="size-2.5 mr-0.5" />
              {product.sku}
            </Badge>
          )}
          {!product.isActive && (
            <Badge className="bg-stone-100 text-stone-600 border-stone-200 border text-[10px] h-5">
              Nonaktif
            </Badge>
          )}
        </div>
        <DialogTitle className="text-lg font-extrabold text-ink leading-tight">
          {product.name}
        </DialogTitle>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-xl font-extrabold text-ink tabular-nums">
            {formatRupiah(product.price)}
          </span>
          {product.costPrice != null && (
            <span className="text-xs text-stone">
              Modal {formatRupiah(product.costPrice)}
              {marginAmount != null && (
                <span className="text-teal-600 font-semibold ml-1">
                  · Margin {formatRupiah(marginAmount)} ({stats.marginPct}%)
                </span>
              )}
            </span>
          )}
          {isBarang && product.stock != null && (
            <span className="text-xs text-stone">
              · Stok <span className="font-semibold text-ink">{product.stock}</span>
              {product.minStock != null && ` / min ${product.minStock}`}
            </span>
          )}
        </div>
        {product.description && (
          <DialogDescription className="text-xs text-stone mt-1.5 line-clamp-2">
            {product.description}
          </DialogDescription>
        )}
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  icon,
  accent = "teal",
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  accent?: "teal" | "orange" | "success" | "warning" | "stone";
}) {
  const accents: Record<string, string> = {
    teal: "bg-teal-100 text-teal-600",
    orange: "bg-orange-100 text-orange-600",
    success: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-700",
    stone: "bg-stone-200 text-stone-700",
  };
  return (
    <div className="rounded-xl border border-border bg-card p-2.5 hover:border-teal/30 transition-colors">
      <div className="flex items-center gap-1.5 mb-1">
        <div className={`size-5 rounded-md flex items-center justify-center ${accents[accent]}`}>
          {icon}
        </div>
        <span className="text-[10px] text-stone uppercase tracking-wide leading-tight">
          {label}
        </span>
      </div>
      <div className="text-sm font-extrabold text-ink tabular-nums truncate">
        {value}
      </div>
    </div>
  );
}

function ProductHeaderSkeleton() {
  return (
    <div className="flex items-start gap-4">
      <Skeleton className="size-20 rounded-xl shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex gap-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-16" />
        </div>
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-9 w-full" />
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}
