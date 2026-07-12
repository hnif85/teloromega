"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore, getActiveBrand } from "@/lib/store";
import { api } from "@/lib/api";
import { compressImage, formatBytes } from "@/lib/image-compress";
import { PageHeader, StatCard, EmptyState } from "@/components/nw/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { formatRupiah } from "@/lib/constants";
import { ProductDetailDialog } from "@/sections/nw/produk/product-detail-dialog";
import { exportToCsv } from "@/lib/csv";
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  Search,
  PackageSearch,
  AlertTriangle,
  Boxes,
  Tag,
  DollarSign,
  MoreVertical,
  Briefcase,
  Loader2,
  Eye,
  Download,
  CheckSquare,
  Upload,
  ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────
type ProductType = "barang" | "jasa";

interface Product {
  id: string;
  brandId: string;
  type: ProductType;
  name: string;
  price: number;
  costPrice: number | null;
  stock: number | null;
  minStock: number | null;
  sku: string | null;
  description: string | null;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ProductFormState {
  type: ProductType;
  name: string;
  price: string;
  costPrice: string;
  stock: string;
  minStock: string;
  sku: string;
  description: string;
  imageUrl: string;
}

const EMPTY_FORM: ProductFormState = {
  type: "barang",
  name: "",
  price: "",
  costPrice: "",
  stock: "",
  minStock: "",
  sku: "",
  description: "",
  imageUrl: "",
};

// ─── Helpers ────────────────────────────────────────────────────────────────
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function stockStatus(
  stock: number | null,
  minStock: number | null
): { color: string; label: string; tone: "ok" | "warn" | "danger" } {
  if (stock == null) return { color: "bg-stone-100 text-stone-600", label: "—", tone: "ok" };
  const min = minStock ?? 0;
  if (stock === 0) return { color: "bg-rose-100 text-rose-700", label: "Habis", tone: "danger" };
  if (stock < min) return { color: "bg-rose-100 text-rose-700", label: "Kritis", tone: "danger" };
  if (stock === min) return { color: "bg-amber-100 text-amber-700", label: "Menipis", tone: "warn" };
  return { color: "bg-emerald-100 text-emerald-700", label: "Aman", tone: "ok" };
}

// ─── Main Section ───────────────────────────────────────────────────────────
export function ProdukSection() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const setSection = useAppStore((s) => s.setSection);
  const activeBrand = getActiveBrand(useAppStore.getState());

  // Filters
  const [tab, setTab] = useState<"semua" | "barang" | "jasa">("semua");
  const [search, setSearch] = useState("");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductFormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Image upload state
  const [imageUploading, setImageUploading] = useState(false);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUploading(true);
    try {
      const { file: compressed } = await compressImage(file, {
        maxSize: 1024,
        quality: 0.7,
        maxBytes: 300 * 1024,
      });
      const f = new FormData();
      f.append("file", compressed, compressed.name);
      const r = await api<{ imageUrl: string }>("/api/upload/image", {
        method: "POST",
        body: f,
        json: undefined,
      });
      setForm((prev) => ({ ...prev, imageUrl: r.imageUrl }));
      toast({ title: "Foto terupload", description: "Thumbnail akan muncul setelah simpan produk." });
    } catch (err: any) {
      toast({ title: "Gagal upload foto", description: err?.message ?? "Coba lagi.", variant: "destructive" });
    } finally {
      setImageUploading(false);
      e.target.value = "";
    }
  }

  // Bulk select state
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  // Detail dialog state
  const [detailProductId, setDetailProductId] = useState<string | null>(null);

  // Fetch
  const { data, isLoading } = useQuery<{ products: Product[] }>({
    queryKey: ["products", activeBrand?.id],
    queryFn: () => api<{ products: Product[] }>(`/api/products?brandId=${activeBrand?.id}`),
    enabled: !!activeBrand?.id,
  });

  const products = data?.products ?? [];

  // Derived stats
  const stats = useMemo(() => {
    const total = products.length;
    const barang = products.filter((p) => p.type === "barang").length;
    const jasa = products.filter((p) => p.type === "jasa").length;
    const nilaiStok = products
      .filter((p) => p.type === "barang")
      .reduce((sum, p) => sum + (p.stock ?? 0) * (p.costPrice ?? 0), 0);
    const lowStock = products.filter(
      (p) => p.type === "barang" && p.minStock != null && (p.stock ?? 0) <= (p.minStock ?? 0)
    );
    return { total, barang, jasa, nilaiStok, lowStock };
  }, [products]);

  // Filtered list
  const filtered = useMemo(() => {
    let list = products;
    if (tab !== "semua") list = list.filter((p) => p.type === tab);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q) || (p.sku ?? "").toLowerCase().includes(q));
    return list;
  }, [products, tab, search]);

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        brandId: activeBrand?.id,
        type: form.type,
        name: form.name.trim(),
        price: Number(form.price),
        costPrice: form.costPrice ? Number(form.costPrice) : null,
        description: form.description.trim() || null,
        imageUrl: form.imageUrl.trim() || null,
      };
      if (form.type === "barang") {
        payload.stock = form.stock ? Number(form.stock) : 0;
        payload.minStock = form.minStock ? Number(form.minStock) : null;
        payload.sku = form.sku.trim() || null;
      }
      if (editing) {
        return api<{ product: Product }>(`/api/products/${editing.id}`, {
          method: "PATCH",
          json: payload,
        });
      }
      return api<{ product: Product }>("/api/products", {
        method: "POST",
        json: payload,
      });
    },
    onSuccess: () => {
      toast({
        title: editing ? "Produk diperbarui" : "Produk ditambahkan",
        description: editing
          ? `Perubahan ${form.name.trim()} tersimpan.`
          : `${form.name.trim()} berhasil ditambahkan ke katalog.`,
      });
      qc.invalidateQueries({ queryKey: ["products", activeBrand?.id] });
      qc.invalidateQueries({ queryKey: ["dashboard", activeBrand?.id] });
      setDialogOpen(false);
    },
    onError: (e: Error) => {
      toast({ title: "Gagal menyimpan", description: e.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api(`/api/products/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      toast({
        title: "Produk diarsipkan",
        description: `${deleteTarget?.name ?? "Produk"} disembunyikan dari katalog.`,
      });
      qc.invalidateQueries({ queryKey: ["products", activeBrand?.id] });
      qc.invalidateQueries({ queryKey: ["dashboard", activeBrand?.id] });
      setDeleteTarget(null);
    },
    onError: (e: Error) => {
      toast({ title: "Gagal menghapus", description: e.message, variant: "destructive" });
    },
    onSettled: () => setDeleting(false),
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.allSettled(
        ids.map((id) => api(`/api/products/${id}`, { method: "DELETE" }))
      );
      return {
        total: ids.length,
        succeeded: results.filter((r) => r.status === "fulfilled").length,
      };
    },
    onSuccess: ({ total, succeeded }) => {
      toast({
        title: `${succeeded} produk diarsipkan`,
        description: succeeded < total ? `${total - succeeded} gagal` : "Semua produk terpilih disembunyikan.",
      });
      qc.invalidateQueries({ queryKey: ["products", activeBrand?.id] });
      qc.invalidateQueries({ queryKey: ["dashboard", activeBrand?.id] });
      setSelectedIds(new Set());
      setSelectMode(false);
      setBulkDeleteOpen(false);
    },
    onError: (e: Error) => {
      toast({ title: "Gagal bulk hapus", description: e.message, variant: "destructive" });
    },
  });

  // Handlers
  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setDialogOpen(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setForm({
      type: p.type,
      name: p.name,
      price: String(p.price ?? ""),
      costPrice: p.costPrice != null ? String(p.costPrice) : "",
      stock: p.stock != null ? String(p.stock) : "",
      minStock: p.minStock != null ? String(p.minStock) : "",
      sku: p.sku ?? "",
      description: p.description ?? "",
      imageUrl: p.imageUrl ?? "",
    });
    setErrors({});
    setDialogOpen(true);
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Nama wajib diisi";
    if (!form.price.trim()) e.price = "Harga jual wajib diisi";
    else if (Number(form.price) <= 0 || isNaN(Number(form.price))) e.price = "Harga harus angka positif";
    if (form.costPrice && (isNaN(Number(form.costPrice)) || Number(form.costPrice) < 0))
      e.costPrice = "Harga modal harus angka positif";
    if (form.type === "barang") {
      if (form.stock && (isNaN(Number(form.stock)) || Number(form.stock) < 0))
        e.stock = "Stok harus angka positif";
      if (form.minStock && (isNaN(Number(form.minStock)) || Number(form.minStock) < 0))
        e.minStock = "Stok minimum harus angka positif";
    } else {
      if (!form.description.trim()) e.description = "Deskripsi jasa wajib diisi";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSave() {
    if (!validate()) return;
    saveMutation.mutate();
  }

  function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    deleteMutation.mutate(deleteTarget.id);
  }

  // ─── Empty brand guard ────────────────────────────────────────────────────
  if (!activeBrand) {
    return (
      <div>
        <PageHeader title="Produk" subtitle="Kelola katalog barang & jasa" icon="📦" />
        <EmptyState
          icon="🏪"
          title="Belum ada brand aktif"
          desc="Buat brand terlebih dahulu di Pengaturan sebelum menambahkan produk."
          action={<Button className="bg-teal hover:bg-teal-600" onClick={() => setSection("pengaturan")}>Buka Pengaturan</Button>}
        />
      </div>
    );
  }

  return (
    <div className="pb-2">
      <PageHeader
        title="Produk"
        subtitle={`${activeBrand.name} · ${activeBrand.category}`}
        icon="📦"
        actions={
          <div className="flex items-center gap-2">
            {selectMode ? (
              <>
                <span className="text-xs text-stone">{selectedIds.size} terpilih</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedIds(new Set());
                    setSelectMode(false);
                  }}
                >
                  Batal
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (filtered.length > 0) {
                      const allIds = new Set(filtered.map((p) => p.id));
                      setSelectedIds(
                        allIds.size === selectedIds.size ? new Set() : allIds
                      );
                    }
                  }}
                >
                  {filtered.length > 0 && filtered.every((p) => selectedIds.has(p.id))
                    ? "Kosongkan"
                    : "Pilih Semua"}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={selectedIds.size === 0 || bulkDeleteMutation.isPending}
                  onClick={() => setBulkDeleteOpen(true)}
                >
                  <Trash2 className="size-3.5" />
                  {bulkDeleteMutation.isPending ? "Menghapus..." : `Hapus (${selectedIds.size})`}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={products.length === 0}
                  onClick={() => setSelectMode(true)}
                >
                  <CheckSquare className="size-3.5" /> Pilih
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={products.length === 0}
                  onClick={() => {
                    if (products.length === 0) return;
                    exportToCsv(
                      products.map((p) => ({
                        nama: p.name,
                        tipe: p.type,
                        harga_jual: p.price,
                        harga_modal: p.costPrice ?? 0,
                        margin: p.costPrice ? p.price - p.costPrice : 0,
                        margin_persen: p.costPrice ? Math.round(((p.price - p.costPrice) / p.price) * 100) : 0,
                        stok: p.stock ?? "",
                        stok_min: p.minStock ?? "",
                        sku: p.sku ?? "",
                        deskripsi: p.description ?? "",
                        status: p.isActive ? "Aktif" : "Nonaktif",
                        dibuat: new Date(p.createdAt).toLocaleDateString("id-ID"),
                      })),
                      [
                        { key: "nama", label: "Nama" },
                        { key: "tipe", label: "Tipe" },
                        { key: "harga_jual", label: "Harga Jual (Rp)" },
                        { key: "harga_modal", label: "Harga Modal (Rp)" },
                        { key: "margin", label: "Margin (Rp)" },
                        { key: "margin_persen", label: "Margin (%)" },
                        { key: "stok", label: "Stok" },
                        { key: "stok_min", label: "Stok Min" },
                        { key: "sku", label: "SKU" },
                        { key: "deskripsi", label: "Deskripsi" },
                        { key: "status", label: "Status" },
                        { key: "dibuat", label: "Dibuat" },
                      ],
                      `produk-${new Date().toISOString().slice(0, 10)}`
                    );
                    toast({ title: `${products.length} produk diekspor ke CSV` });
                  }}
                >
                  <Download className="size-3.5" /> CSV
                </Button>
                <Button className="bg-teal hover:bg-teal-600 gap-1.5" onClick={openCreate}>
                  <Plus className="size-4" /> Tambah Produk
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard
          label="Total Produk"
          value={isLoading ? "…" : stats.total}
          icon={<Package className="size-4" />}
          accent="teal"
        />
        <StatCard
          label="Produk Barang"
          value={isLoading ? "…" : stats.barang}
          icon={<Boxes className="size-4" />}
          accent="orange"
        />
        <StatCard
          label="Produk Jasa"
          value={isLoading ? "…" : stats.jasa}
          icon={<Briefcase className="size-4" />}
          accent="success"
        />
        <StatCard
          label="Nilai Stok"
          value={isLoading ? "…" : formatRupiah(stats.nilaiStok)}
          icon={<DollarSign className="size-4" />}
          accent="warning"
        />
      </div>

      {/* Low stock alert */}
      {stats.lowStock.length > 0 && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex flex-wrap items-center gap-3">
          <div className="size-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <AlertTriangle className="size-5" />
          </div>
          <div className="flex-1 min-w-[200px]">
            <div className="text-sm font-semibold text-amber-900">
              ⚠️ {stats.lowStock.length} produk stok menipis
            </div>
            <div className="text-xs text-amber-700 mt-0.5">
              {stats.lowStock.slice(0, 3).map((p) => p.name).join(", ")}
              {stats.lowStock.length > 3 && ` +${stats.lowStock.length - 3} lainnya`}
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-amber-300 text-amber-700 hover:bg-amber-100"
            onClick={() => setSection("toko")}
          >
            Restok di Toko
          </Button>
        </div>
      )}

      {/* Filter + Search row */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="semua">Semua ({stats.total})</TabsTrigger>
            <TabsTrigger value="barang">Barang ({stats.barang})</TabsTrigger>
            <TabsTrigger value="jasa">Jasa ({stats.jasa})</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative flex-1 min-w-[200px] max-w-md ml-auto">
          <Search className="size-4 text-stone absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Cari produk atau SKU…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card"
          />
        </div>
      </div>

      {/* Loading */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="aspect-square w-full" />
              <div className="p-4 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-3 w-full" />
              </div>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        products.length === 0 ? (
          <EmptyState
            icon="📦"
            title="Belum ada produk"
            desc="Tambahkan produk pertama kamu untuk mulai jualan. Produk yang kamu buat otomatis muncul di Toko, Konten, dan Keuangan."
            action={
              <Button className="bg-teal hover:bg-teal-600 gap-1.5" onClick={openCreate}>
                <Plus className="size-4" /> Tambah Produk
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={<PackageSearch className="size-6" />}
            title="Tidak ada produk cocok"
            desc="Coba kata kunci lain atau ganti filter tipe produk."
            action={
              <Button variant="outline" onClick={() => { setSearch(""); setTab("semua"); }}>
                Reset filter
              </Button>
            }
          />
        )
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              onEdit={() => openEdit(p)}
              onDelete={() => setDeleteTarget(p)}
              onDetail={() => setDetailProductId(p.id)}
              selectMode={selectMode}
              selected={selectedIds.has(p.id)}
              onToggleSelect={() => {
                setSelectedIds((prev) => {
                  const next = new Set(prev);
                  if (next.has(p.id)) next.delete(p.id);
                  else next.add(p.id);
                  return next;
                });
              }}
            />
          ))}
        </div>
      )}

      {/* ─── Product Detail Dialog ───────────────────────────────────────── */}
      <ProductDetailDialog
        productId={detailProductId}
        open={!!detailProductId}
        onOpenChange={(o) => !o && setDetailProductId(null)}
        onEdit={() => {
          const target = products.find((p) => p.id === detailProductId);
          setDetailProductId(null);
          if (target) openEdit(target);
        }}
      />

      {/* ─── Add/Edit Dialog ─────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing(null); }}>
        <DialogContent className="sm:max-w-[560px] max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Produk" : "Tambah Produk"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Perbarui detail produk. Perubahan langsung tersimpan ke katalog."
                : "Lengkapi detail produk. Yang bertanda * wajib diisi."}
            </DialogDescription>
          </DialogHeader>

          {/* Type selector */}
          <div className="space-y-2">
            <Label>Tipe Produk</Label>
            <div className="grid grid-cols-2 gap-3">
              <TypeCard
                active={form.type === "barang"}
                icon="📦"
                title="Barang"
                desc="Produk fisik dengan stok"
                onClick={() => setForm((f) => ({ ...f, type: "barang" }))}
              />
              <TypeCard
                active={form.type === "jasa"}
                icon="💼"
                title="Jasa"
                desc="Layanan tanpa stok"
                onClick={() => setForm((f) => ({ ...f, type: "jasa" }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="p-name">
                {form.type === "barang" ? "Nama Produk" : "Nama Jasa"} <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="p-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder={form.type === "barang" ? "cth: Keripik Singkong Pedas 250gr" : "cth: Jasa Desain Logo"}
              />
              {errors.name && <p className="text-xs text-rose-500">{errors.name}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-price">
                Harga Jual <span className="text-rose-500">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone text-sm">Rp</span>
                <Input
                  id="p-price"
                  type="number"
                  inputMode="numeric"
                  className="pl-9"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  placeholder="15000"
                />
              </div>
              {errors.price && <p className="text-xs text-rose-500">{errors.price}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-cost">Harga Modal</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone text-sm">Rp</span>
                <Input
                  id="p-cost"
                  type="number"
                  inputMode="numeric"
                  className="pl-9"
                  value={form.costPrice}
                  onChange={(e) => setForm((f) => ({ ...f, costPrice: e.target.value }))}
                  placeholder="9000"
                />
              </div>
              {errors.costPrice && <p className="text-xs text-rose-500">{errors.costPrice}</p>}
              {form.costPrice && form.price && !errors.costPrice && !errors.price && Number(form.price) > 0 && (
                <p className="text-[11px] text-teal-600">
                  Margin {formatRupiah(Number(form.price) - Number(form.costPrice))} (
                  {Math.round(((Number(form.price) - Number(form.costPrice)) / Number(form.price)) * 100)}%)
                </p>
              )}
            </div>

            {form.type === "barang" ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="p-stock">Stok Awal</Label>
                  <Input
                    id="p-stock"
                    type="number"
                    inputMode="numeric"
                    value={form.stock}
                    onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                    placeholder="0"
                  />
                  {errors.stock && <p className="text-xs text-rose-500">{errors.stock}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="p-min">Stok Minimum</Label>
                  <Input
                    id="p-min"
                    type="number"
                    inputMode="numeric"
                    value={form.minStock}
                    onChange={(e) => setForm((f) => ({ ...f, minStock: e.target.value }))}
                    placeholder="5"
                  />
                  {errors.minStock && <p className="text-xs text-rose-500">{errors.minStock}</p>}
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="p-sku">SKU (opsional)</Label>
                  <Input
                    id="p-sku"
                    value={form.sku}
                    onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                    placeholder="KRB-250-PEDAS"
                  />
                </div>
              </>
            ) : null}

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="p-desc">
                Deskripsi {form.type === "jasa" && <span className="text-rose-500">*</span>}
              </Label>
              <Textarea
                id="p-desc"
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder={
                  form.type === "barang"
                    ? "Deskripsi singkat produk (bahan, ukuran, rasa, dll.)"
                    : "Detail layanan: apa yang kamu tawarkan, durasi pengerjaan, revisi, dst."
                }
              />
              {errors.description && <p className="text-xs text-rose-500">{errors.description}</p>}
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label>Foto Produk (opsional)</Label>
              <div className="flex items-start gap-3">
                {/* Thumbnail preview */}
                <div className="size-24 rounded-xl overflow-hidden bg-cream-100 shrink-0 flex items-center justify-center border border-border">
                  {form.imageUrl ? (
                    <img
                      src={form.imageUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : (
                    <ImageIcon className="size-8 text-cream-400" />
                  )}
                </div>
                {/* Upload button */}
                <div className="flex-1 space-y-2">
                  <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-cream-100 hover:bg-cream-200 cursor-pointer transition-colors text-sm font-medium text-stone">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={imageUploading}
                    />
                    {imageUploading ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Upload...
                      </>
                    ) : form.imageUrl ? (
                      <>
                        <Upload className="size-4" />
                        Ganti Foto
                      </>
                    ) : (
                      <>
                        <Upload className="size-4" />
                        Upload Foto
                      </>
                    )}
                  </label>
                  {form.imageUrl && (
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, imageUrl: "" }))}
                      className="text-xs text-stone hover:text-rose-600 transition-colors"
                    >
                      Hapus foto
                    </button>
                  )}
                  <p className="text-[11px] text-stone">Format PNG/JPEG/WebP, maks 5MB. Auto dikompres.</p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saveMutation.isPending}>
              Batal
            </Button>
            <Button
              className="bg-teal hover:bg-teal-600 gap-1.5"
              onClick={handleSave}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Menyimpan…
                </>
              ) : editing ? (
                <>
                  <Pencil className="size-4" /> Simpan Perubahan
                </>
              ) : (
                <>
                  <Plus className="size-4" /> Tambah Produk
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation ──────────────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Yakin hapus {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Produk akan diarsipkan (disembunyikan dari katalog). Transaksi & konten yang sudah terhubung tetap utuh.
              Kamu bisa membuat ulang kapan saja.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700 text-white gap-1.5"
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Menghapus…
                </>
              ) : (
                <>
                  <Trash2 className="size-4" /> Ya, Hapus
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus {selectedIds.size} produk terpilih?</AlertDialogTitle>
            <AlertDialogDescription>
              Produk yang dipilih akan diarsipkan (disembunyikan dari katalog). Aksi ini bisa dibatalkan dengan menambah ulang produk.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={(e) => {
                e.preventDefault();
                bulkDeleteMutation.mutate(Array.from(selectedIds));
              }}
            >
              {bulkDeleteMutation.isPending ? (
                <>
                  <Loader2 className="size-4 mr-1 animate-spin" /> Menghapus...
                </>
              ) : (
                `Ya, Hapus ${selectedIds.size} Produk`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────
function TypeCard({
  active,
  icon,
  title,
  desc,
  onClick,
}: {
  active: boolean;
  icon: string;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-start gap-1 rounded-xl border-2 p-3 text-left transition-all",
        active
          ? "border-teal bg-teal-50 shadow-sm"
          : "border-border bg-card hover:border-teal/40 hover:bg-cream-100/40"
      )}
    >
      <div className="flex items-center gap-2">
        <span className="text-xl">{icon}</span>
        <span className="font-bold text-sm text-ink">{title}</span>
        {active && (
          <span className="ml-auto size-4 rounded-full bg-teal text-white flex items-center justify-center text-[10px]">✓</span>
        )}
      </div>
      <p className="text-[11px] text-stone leading-snug">{desc}</p>
    </button>
  );
}

function ProductCard({
  product,
  onEdit,
  onDelete,
  onDetail,
  selectMode,
  selected,
  onToggleSelect,
}: {
  product: Product;
  onEdit: () => void;
  onDelete: () => void;
  onDetail: () => void;
  selectMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}) {
  const margin =
    product.costPrice != null && product.price > 0
      ? {
          amount: product.price - product.costPrice,
          pct: Math.round(((product.price - product.costPrice) / product.price) * 100),
        }
      : null;

  const stock = stockStatus(product.stock, product.minStock);

  return (
    <Card
      className={`overflow-hidden group hover:border-teal/30 hover:shadow-md transition-all flex flex-col ${
        selectMode ? "cursor-pointer" : "cursor-pointer"
      } ${selected ? "ring-2 ring-teal border-teal" : ""}`}
      onClick={selectMode ? onToggleSelect : onDetail}
    >
      {/* Image */}
      <div className="relative bg-cream-100">
        <AspectRatio ratio={1}>
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                const img = e.currentTarget as HTMLImageElement;
                img.style.display = "none";
                const fallback = img.nextElementSibling as HTMLElement | null;
                if (fallback) fallback.style.display = "flex";
              }}
            />
          ) : null}
          <div
            className={`w-full h-full items-center justify-center bg-gradient-to-br from-teal-100 via-cream-100 to-orange-100/40 dark:bg-none dark:bg-teal-950/40 ${product.imageUrl ? "hidden" : "flex"}`}
          >
            <span className="text-3xl font-extrabold text-teal-600/70">{getInitials(product.name)}</span>
          </div>
        </AspectRatio>
        {/* Select mode checkbox */}
        {selectMode && (
          <div className={`absolute top-2 left-2 size-6 rounded-md border-2 flex items-center justify-center transition-colors ${
            selected ? "bg-teal border-teal text-white" : "bg-card/80 border-cream-400"
          }`}>
            {selected && <CheckSquare className="size-4" />}
          </div>
        )}
        {!selectMode && (
          <div className="absolute inset-0 bg-ink/0 group-hover:bg-ink/5 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            <span className="bg-card/90 backdrop-blur px-2.5 py-1 rounded-full text-xs font-semibold text-teal-700 flex items-center gap-1 shadow-sm">
              <Eye className="size-3" /> Lihat Detail
            </span>
          </div>
        )}
        <div className="absolute top-2 left-2">
          <Badge
            className={
              product.type === "barang"
                ? "bg-teal-100 text-teal-700 border-teal-200 border"
                : "bg-orange-100 text-orange-700 border-orange-200 border"
            }
          >
            {product.type === "barang" ? "📦 Barang" : "💼 Jasa"}
          </Badge>
        </div>
        <div className="absolute top-2 right-2" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="secondary"
                className="size-8 bg-card/90 backdrop-blur hover:bg-card shadow-sm"
              >
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={onDetail} className="cursor-pointer gap-2">
                <Eye className="size-3.5" /> Lihat Detail
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit} className="cursor-pointer gap-2">
                <Pencil className="size-3.5" /> Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="cursor-pointer gap-2 text-rose-600 focus:text-rose-700">
                <Trash2 className="size-3.5" /> Hapus
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-start gap-2 mb-1">
          <h3 className="font-bold text-sm text-ink leading-snug line-clamp-2 flex-1">{product.name}</h3>
          {product.sku && (
            <Badge variant="outline" className="text-[10px] py-0 h-4 border-stone-200 text-stone shrink-0">
              <Tag className="size-2.5 mr-0.5" />{product.sku}
            </Badge>
          )}
        </div>

        <div className="text-xl font-extrabold text-ink tabular-nums">
          {formatRupiah(product.price)}
        </div>

        {/* Margin info */}
        <div className="mt-1.5 min-h-[20px]">
          {margin ? (
            <p className="text-[11px] text-stone">
              Modal {formatRupiah(product.costPrice!)} · Margin{" "}
              <span className="text-teal-600 font-semibold">{formatRupiah(margin.amount)} ({margin.pct}%)</span>
            </p>
          ) : (
            <Badge className="bg-amber-100 text-amber-700 border-amber-200 border text-[10px] py-0 h-4">
              <AlertTriangle className="size-2.5 mr-0.5" />Modal belum diisi
            </Badge>
          )}
        </div>

        {/* Stock (barang only) */}
        {product.type === "barang" && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-[11px] text-stone">Stok:</span>
            <span className="text-xs font-semibold text-ink tabular-nums">{product.stock ?? 0} pcs</span>
            <Badge className={cn("text-[10px] py-0 h-4 border", stock.color, "border-transparent")}>
              {stock.label}
            </Badge>
          </div>
        )}

        {/* Description */}
        {product.description && (
          <p className="mt-2 text-xs text-stone line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        )}

        {/* Actions */}
        <div
          className="mt-3 pt-3 border-t border-border flex items-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <Button size="sm" variant="outline" className="h-7 text-xs flex-1 gap-1" onClick={onEdit}>
            <Pencil className="size-3" /> Edit
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 gap-1"
            onClick={onDelete}
          >
            <Trash2 className="size-3" /> Hapus
          </Button>
        </div>
      </div>
    </Card>
  );
}
