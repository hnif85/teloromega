"use client";

import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { SectionCard, EmptyState } from "@/components/nw/primitives";
import { Plus, Search, Download, ArrowUpRight, ArrowDownRight, FileText, Upload, Camera, Loader2, X, Sparkles, FileSpreadsheet, Check } from "lucide-react";
import { api } from "@/lib/api";
import { formatRupiah } from "@/lib/constants";
import { exportToCsv } from "@/lib/csv";
import { TX_CATEGORY_LABELS, getCategoriesByType, getDefaultCategoryForType, type TransactionRow, type TxType } from "./types";

interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
}

export interface ProductLite {
  id: string;
  name: string;
  price: number;
  costPrice: number | null;
}

export interface ImportRow {
  date: string;
  type: "income" | "expense";
  category: string;
  amount: number;
  description: string | null;
}

export function TransaksiTab({ brandId }: { brandId: string }) {
  const qc = useQueryClient();
  const [filterType, setFilterType] = useState<"all" | TxType>("all");
  const [filterCat, setFilterCat] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [page, setPage] = useState(0);
  const pageSize = 25;

  // Build query string
  const queryStr = useMemo(() => {
    const p = new URLSearchParams();
    p.set("brandId", brandId);
    p.set("limit", String(pageSize * (page + 1)));
    if (filterType !== "all") p.set("type", filterType);
    if (filterCat !== "all") p.set("category", filterCat);
    if (fromDate) p.set("from", fromDate);
    if (toDate) p.set("to", toDate);
    if (search.trim()) p.set("q", search.trim());
    return p.toString();
  }, [brandId, filterType, filterCat, fromDate, toDate, search, page]);

  const { data, isLoading } = useQuery<{ transactions: TransactionRow[] }>({
    queryKey: ["keuangan-transactions", queryStr],
    queryFn: () => api(`/api/transactions?${queryStr}`),
    enabled: !!brandId,
    placeholderData: (prev) => prev,
  });

  const transactions = data?.transactions ?? [];
  const paged = transactions.slice(page * pageSize, (page + 1) * pageSize);
  const hasMore = transactions.length > (page + 1) * pageSize;

  // Products for add dialog
  const { data: productsData } = useQuery<{ products: ProductLite[] }>({
    queryKey: ["keuangan-products", brandId],
    queryFn: () => api(`/api/products?brandId=${brandId}`),
    enabled: !!brandId,
  });
  const products = productsData?.products ?? [];

  return (
    <div className="space-y-4">
      {/* Filter row */}
      <SectionCard bodyClassName="p-3">
        <div className="flex flex-col md:flex-row gap-2 md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-stone" />
            <Input
              placeholder="Cari transaksi..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="pl-8 h-9"
            />
          </div>
          <Select
            value={filterType}
            onValueChange={(v) => {
              setFilterType(v as "all" | TxType);
              setPage(0);
            }}
          >
            <SelectTrigger className="h-9 w-full md:w-36" size="sm">
              <SelectValue placeholder="Tipe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tipe</SelectItem>
              <SelectItem value="income">Pendapatan</SelectItem>
              <SelectItem value="expense">Pengeluaran</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filterCat}
            onValueChange={(v) => {
              setFilterCat(v);
              setPage(0);
            }}
          >
            <SelectTrigger className="h-9 w-full md:w-44" size="sm">
              <SelectValue placeholder="Kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kategori</SelectItem>
              {Object.entries(TX_CATEGORY_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setPage(0);
            }}
            className="h-9 w-full md:w-36"
          />
          <Input
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setPage(0);
            }}
            className="h-9 w-full md:w-36"
          />
          <Button
            variant="outline"
            size="sm"
            className="h-9"
            disabled={transactions.length === 0}
            onClick={() => {
              if (transactions.length === 0) return;
              exportToCsv(
                transactions.map((t) => ({
                  tanggal: new Date(t.date).toLocaleDateString("id-ID"),
                  tipe: t.type === "income" ? "Pemasukan" : "Pengeluaran",
                  kategori: TX_CATEGORY_LABELS[t.category] ?? t.category,
                  deskripsi: t.description ?? "",
                  produk: t.product?.name ?? "",
                  pelanggan: t.customer?.name ?? "",
                  jumlah: t.amount,
                  hpp: t.costAmount ?? 0,
                  qty: t.quantity ?? "",
                  order_id: t.order?.id ?? "",
                })),
                [
                  { key: "tanggal", label: "Tanggal" },
                  { key: "tipe", label: "Tipe" },
                  { key: "kategori", label: "Kategori" },
                  { key: "deskripsi", label: "Deskripsi" },
                  { key: "produk", label: "Produk" },
                  { key: "pelanggan", label: "Pelanggan" },
                  { key: "jumlah", label: "Jumlah (Rp)" },
                  { key: "hpp", label: "HPP (Rp)" },
                  { key: "qty", label: "Qty" },
                  { key: "order_id", label: "Order ID" },
                ],
                `transaksi-${new Date().toISOString().slice(0, 10)}`
              );
              toast.success(`${transactions.length} transaksi diekspor ke CSV`);
            }}
          >
            <Download className="size-3.5" /> CSV
          </Button>
          <AddTransactionButton
            brandId={brandId}
            products={products}
            onCreated={() => {
              qc.invalidateQueries({ queryKey: ["keuangan-transactions"] });
              qc.invalidateQueries({ queryKey: ["keuangan-summary"] });
            }}
          />
        </div>
      </SectionCard>

      {/* Table */}
      <SectionCard bodyClassName="p-0">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : paged.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon="🧾"
              title="Belum ada transaksi"
              desc="Catat transaksi pertama kamu. Bisa dari penjualan, pembelian bahan baku, atau biaya operasional."
              action={
                <AddTransactionButton
                  brandId={brandId}
                  products={products}
                  onCreated={() => {
                    qc.invalidateQueries({ queryKey: ["keuangan-transactions"] });
                    qc.invalidateQueries({ queryKey: ["keuangan-summary"] });
                  }}
                />
              }
            />
          </div>
        ) : (
          <>
            <div className="p-3 space-y-2">
              {paged.map((t) => (
                <div key={t.id} className="rounded-xl border border-border bg-cream-50/50 p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      {t.type === "income" ? (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 border">
                          <ArrowUpRight className="size-3" /> Masuk
                        </Badge>
                      ) : (
                        <Badge className="bg-rose-100 text-rose-700 border-rose-200 border">
                          <ArrowDownRight className="size-3" /> Keluar
                        </Badge>
                      )}
                      <span className="text-[10px] text-stone">
                        {TX_CATEGORY_LABELS[t.category] ?? t.category}
                      </span>
                    </div>
                    <span className={`text-sm font-bold tabular-nums ${t.type === "income" ? "text-emerald-700" : "text-rose-700"}`}>
                      {t.type === "income" ? "+" : "−"}{formatRupiah(t.amount)}
                    </span>
                  </div>
                  <div className="text-sm text-ink font-medium truncate">
                    {t.description ?? "—"}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 text-[10px] text-stone">
                    <span>{new Date(t.date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "2-digit" })}</span>
                    {t.product && <span>📦 {t.product.name}</span>}
                    {t.customer && <span>👤 {t.customer.name}</span>}
                    {t.order && <span>🛒 Order {t.order.resiNumber ?? t.order.id.slice(-6)}</span>}
                  </div>
                  {t.costAmount === null && t.type === "income" && (
                    <span className="text-[10px] text-amber-600 font-medium mt-1 inline-block">⚠ HPP belum lengkap</span>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <span className="text-xs text-stone">
                {page * pageSize + 1}–{Math.min((page + 1) * pageSize, transactions.length)} dari{" "}
                {transactions.length}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  ← Sebelumnya
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7"
                  disabled={!hasMore}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Berikutnya →
                </Button>
              </div>
            </div>
          </>
        )}
      </SectionCard>
    </div>
  );
}

function AddTransactionButton({
  brandId,
  products,
  onCreated,
}: {
  brandId: string;
  products: ProductLite[];
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <AddTransactionDialog
      brandId={brandId}
      products={products}
      open={open}
      onOpenChange={setOpen}
      onCreated={onCreated}
      trigger
    />
  );
}

export function AddTransactionDialog({
  brandId,
  products = [],
  open,
  onOpenChange,
  onCreated,
  trigger,
}: {
  brandId: string;
  products?: ProductLite[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
  trigger?: boolean;
}) {
  const [mode, setMode] = useState<"manual" | "upload" | "template">("manual");
  const [type, setType] = useState<TxType>("income");
  const [category, setCategory] = useState<string>(getDefaultCategoryForType("income"));
  const [amount, setAmount] = useState<string>("");
  const [productId, setProductId] = useState<string>("none");
  const [quantity, setQuantity] = useState<string>("1");
  const [unitPrice, setUnitPrice] = useState<string>("");
  const [buyerName, setBuyerName] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("Tunai");
  const [description, setDescription] = useState<string>("");
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [priceMode, setPriceMode] = useState<"auto" | "manual">("auto");
  const [saving, setSaving] = useState(false);

  // Receipt upload state
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [extractedItems, setExtractedItems] = useState<ReceiptItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Template import state
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templatePreview, setTemplatePreview] = useState<ImportRow[]>([]);
  const [templateTotal, setTemplateTotal] = useState(0);
  const [templateMapping, setTemplateMapping] = useState<Record<string, string> | null>(null);
  const templateFileRef = useRef<HTMLInputElement>(null);

  const selectedProduct = products.find((p) => p.id === productId);

  // Auto-sync unit price & amount from product when product changes
  function handleProductChange(pid: string) {
    setProductId(pid);
    if (pid === "none") {
      setPriceMode("manual");
      setUnitPrice("");
      setQuantity("1");
      setAmount("");
    } else {
      const p = products.find((x) => x.id === pid);
      if (p) {
        setPriceMode("auto");
        setUnitPrice(String(p.price));
        setQuantity((q) => q || "1");
        const qty = Math.max(1, Number(quantity) || 1);
        setAmount(String(p.price * qty));
      }
    }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setReceiptFile(f);
    setReceiptPreview(URL.createObjectURL(f));
    setExtractedItems([]);
  }

  function clearReceipt() {
    setReceiptFile(null);
    setReceiptPreview(null);
    setExtractedItems([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleExtract() {
    if (!receiptFile) return;
    setOcrLoading(true);
    try {
      const fd = new FormData();
      fd.append("image", receiptFile);
      const res = await fetch("/api/keuangan/extract-receipt", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Gagal membaca struk");
      }
      const json = await res.json();
      const d = json.data as { storeName: string | null; date: string | null; items: ReceiptItem[]; total: number | null };
      setExtractedItems(d.items ?? []);

      // Auto-fill form
      const parts: string[] = [];
      if (d.storeName) parts.push(`Struk: ${d.storeName}`);
      if (d.items.length > 0) {
        parts.push(d.items.map((i) => `${i.name}${i.quantity > 1 ? ` x${i.quantity}` : ""} @${formatRupiah(i.price)}`).join(", "));
      }
      setDescription(parts.join(" — ") || "");
      if (d.total != null) setAmount(String(d.total));
      if (d.date) setDate(d.date);
      setType("expense");
      setCategory("bahan_baku");

      // Switch to manual mode so user can review/edit
      setMode("manual");
      toast.success(`${d.items.length} item berhasil dibaca dari struk`);
    } catch (e: any) {
      toast.error(e.message ?? "Gagal mengekstrak struk");
    } finally {
      setOcrLoading(false);
    }
  }

  function handleTemplateFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setTemplateFile(f);
    setTemplatePreview([]);
    setTemplateTotal(0);
    setTemplateMapping(null);
  }

  function clearTemplate() {
    setTemplateFile(null);
    setTemplatePreview([]);
    setTemplateTotal(0);
    setTemplateMapping(null);
    if (templateFileRef.current) templateFileRef.current.value = "";
  }

  async function handleTemplateUpload() {
    if (!templateFile) return;
    setTemplateLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", templateFile);
      const res = await fetch("/api/keuangan/import-template", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Gagal memproses file");
      }
      const json = await res.json();
      setTemplatePreview(json.preview ?? []);
      setTemplateTotal(json.total ?? 0);
      setTemplateMapping(json.mapping?.columnMap ?? null);
      toast.success(`${json.preview?.length ?? 0} dari ${json.total ?? 0} baris siap diimpor`);
    } catch (e: any) {
      toast.error(e.message ?? "Gagal memproses template");
    } finally {
      setTemplateLoading(false);
    }
  }

  async function handleTemplateConfirm() {
    if (templatePreview.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch("/api/keuangan/import-template/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandId, rows: templatePreview }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Gagal import");
      }
      const json = await res.json();
      toast.success(`${json.imported} transaksi berhasil diimpor`);
      clearTemplate();
      setMode("manual");
      onCreated();
    } catch (e: any) {
      toast.error(e.message ?? "Gagal import");
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit() {
    return doSave().then((ok) => { if (ok) resetForm(); });
  }

  async function handleSubmitAndStay() {
    return doSave().then((ok) => {
      if (!ok) return;
      setAmount("");
      setProductId("none");
      setQuantity("1");
      setUnitPrice("");
      setBuyerName("");
      setPaymentMethod("Tunai");
      setDescription("");
      setCategory(getDefaultCategoryForType("income"));
      setType("income");
      setDate(new Date().toISOString().slice(0, 10));
      setPriceMode("auto");
      clearReceipt();
      clearTemplate();
      setMode("upload");
    });
  }

  async function doSave() {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error("Jumlah harus angka lebih dari 0");
      return false;
    }
    setSaving(true);
    try {
      await api("/api/transactions", {
        method: "POST",
        json: {
          brandId,
          type,
          category,
          amount: amt,
          productId: productId !== "none" ? productId : null,
          quantity: Number(quantity) || 1,
          unitPrice: Number(unitPrice) || null,
          buyerName: buyerName.trim() || null,
          paymentMethod: paymentMethod || null,
          description: description.trim() || null,
          date,
        },
      });
      toast.success("Transaksi ditambahkan");
      onCreated();
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan transaksi");
      return false;
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setAmount("");
    setProductId("none");
    setQuantity("1");
    setUnitPrice("");
    setBuyerName("");
    setPaymentMethod("Tunai");
    setDescription("");
    setCategory(getDefaultCategoryForType("income"));
    setType("income");
    setDate(new Date().toISOString().slice(0, 10));
    setPriceMode("auto");
    clearReceipt();
    clearTemplate();
    setMode("manual");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && (
        <DialogTrigger asChild>
          <Button className="bg-teal hover:bg-teal-600 h-9">
            <Plus className="size-3.5" /> Tambah
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="size-4 text-teal" /> Catat Transaksi
          </DialogTitle>
          <DialogDescription>
            {mode === "upload"
              ? "Upload foto struk — AI membaca otomatis."
              : mode === "template"
                ? "Upload CSV/Excel — AI mapping kolom & kategori."
                : "Catat manual atau review hasil ekstrak."}
          </DialogDescription>
        </DialogHeader>

        {/* Mode tabs */}
        <div className="grid grid-cols-3 gap-1.5 bg-cream-100 rounded-lg p-1">
          <button
            type="button"
            onClick={() => setMode("manual")}
            className={`rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
              mode === "manual" ? "bg-white shadow-sm text-ink" : "text-stone hover:text-ink"
            }`}
          >
            <FileText className="size-3.5 inline mr-1" /> Manual
          </button>
          <button
            type="button"
            onClick={() => setMode("upload")}
            className={`rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
              mode === "upload" ? "bg-white shadow-sm text-ink" : "text-stone hover:text-ink"
            }`}
          >
            <Camera className="size-3.5 inline mr-1" /> Struk
          </button>
          <button
            type="button"
            onClick={() => setMode("template")}
            className={`rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
              mode === "template" ? "bg-white shadow-sm text-ink" : "text-stone hover:text-ink"
            }`}
          >
            <FileSpreadsheet className="size-3.5 inline mr-1" /> Template
          </button>
        </div>

        {/* Upload mode */}
        {mode === "upload" && (
          <div className="space-y-3">
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
            {!receiptPreview ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full aspect-[3/2] rounded-xl border-2 border-dashed border-border bg-cream-50 flex flex-col items-center justify-center gap-2 hover:border-teal/40 hover:bg-teal-50/30 transition-colors"
              >
                <Upload className="size-8 text-stone/40" />
                <div className="text-center">
                  <p className="text-sm font-medium text-stone">Upload foto struk</p>
                  <p className="text-xs text-stone/60 mt-0.5">JPG, PNG, atau WebP</p>
                </div>
              </button>
            ) : (
              <div className="space-y-3">
                <div className="relative rounded-xl overflow-hidden border border-border">
                  <img src={receiptPreview} alt="Struk" className="w-full max-h-[200px] object-contain bg-black/5" />
                  <button
                    type="button"
                    onClick={clearReceipt}
                    className="absolute top-2 right-2 size-7 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
                <Button
                  onClick={handleExtract}
                  disabled={ocrLoading}
                  className="w-full bg-teal hover:bg-teal-600 gap-2"
                >
                  {ocrLoading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> AI membaca struk...
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-4" /> Ekstrak Data Struk
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Template mode */}
        {mode === "template" && (
          <div className="space-y-3">
            <input ref={templateFileRef} type="file" accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" onChange={handleTemplateFile} className="hidden" />
            {!templateFile ? (
              <button
                type="button"
                onClick={() => templateFileRef.current?.click()}
                className="w-full aspect-[3/2] rounded-xl border-2 border-dashed border-border bg-cream-50 flex flex-col items-center justify-center gap-2 hover:border-teal/40 hover:bg-teal-50/30 transition-colors"
              >
                <FileSpreadsheet className="size-8 text-stone/40" />
                <div className="text-center">
                  <p className="text-sm font-medium text-stone">Upload CSV atau Excel</p>
                  <p className="text-xs text-stone/60 mt-0.5">AI akan mapping kolom otomatis</p>
                </div>
              </button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-cream-50 border border-border">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileSpreadsheet className="size-5 text-teal shrink-0" />
                    <span className="text-sm text-ink truncate">{templateFile.name}</span>
                  </div>
                  <button onClick={clearTemplate} className="size-7 rounded-lg hover:bg-cream-200 flex items-center justify-center">
                    <X className="size-3.5" />
                  </button>
                </div>
                {templatePreview.length === 0 ? (
                  <Button onClick={handleTemplateUpload} disabled={templateLoading} className="w-full bg-teal hover:bg-teal-600 gap-2">
                    {templateLoading ? (
                      <><Loader2 className="size-4 animate-spin" /> AI membaca data...</>
                    ) : (
                      <><Sparkles className="size-4" /> Proses & Mapping Otomatis</>
                    )}
                  </Button>
                ) : (
                  <div className="space-y-2">
                    {templateMapping && (
                      <div className="rounded-lg bg-teal-50/60 border border-teal/20 p-2.5 text-[11px] text-stone">
                        <span className="font-semibold text-teal-700">Mapping:</span>{" "}
                        {Object.entries(templateMapping).filter(([, v]) => v).map(([k, v]) => (
                          <span key={k} className="mr-2">{k} → <span className="text-ink font-medium">{v}</span></span>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-stone">Preview {templatePreview.length} dari {templateTotal} baris:</p>
                    <div className="max-h-[200px] overflow-y-auto rounded-lg border border-border">
                      <table className="w-full text-[11px]">
                        <thead className="bg-cream-100 sticky top-0">
                          <tr>
                            <th className="text-left px-2 py-1.5 font-medium">Tgl</th>
                            <th className="text-left px-2 py-1.5 font-medium">Tipe</th>
                            <th className="text-left px-2 py-1.5 font-medium">Kategori</th>
                            <th className="text-right px-2 py-1.5 font-medium">Jumlah</th>
                            <th className="text-left px-2 py-1.5 font-medium">Deskripsi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {templatePreview.map((row, i) => (
                            <tr key={i} className="border-t border-border/50 hover:bg-cream-50/50">
                              <td className="px-2 py-1.5 whitespace-nowrap">{row.date}</td>
                              <td className="px-2 py-1.5">
                                <span className={row.type === "income" ? "text-emerald-600" : "text-rose-600"}>{row.type === "income" ? "IN" : "OUT"}</span>
                              </td>
                              <td className="px-2 py-1.5">{TX_CATEGORY_LABELS[row.category] ?? row.category}</td>
                              <td className="px-2 py-1.5 text-right font-medium whitespace-nowrap">{formatRupiah(row.amount)}</td>
                              <td className="px-2 py-1.5 text-stone truncate max-w-[120px]">{row.description ?? "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <Button onClick={handleTemplateConfirm} disabled={saving} className="w-full bg-teal hover:bg-teal-600 gap-2">
                      {saving ? (
                        <><Loader2 className="size-4 animate-spin" /> Mengimpor...</>
                      ) : (
                        <><Check className="size-4" /> Import {templatePreview.length} Transaksi</>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Manual input / review form */}
        {mode === "manual" && (
          <div className="space-y-3 py-1">
            {/* Extracted items summary */}
            {extractedItems.length > 0 && (
              <div className="rounded-lg bg-teal-50/60 border border-teal/20 p-3">
                <p className="text-xs font-semibold text-teal-800 mb-2">Item dari struk:</p>
                <div className="space-y-1">
                  {extractedItems.map((item, i) => (
                    <div key={i} className="flex justify-between text-xs text-ink">
                      <span>{item.name} {item.quantity > 1 ? `x${item.quantity}` : ""}</span>
                      <span className="font-medium">{formatRupiah(item.price)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Type toggle */}
            <div>
              <Label className="mb-1.5">Tipe Transaksi</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { setType("income"); setCategory(getDefaultCategoryForType("income")); }}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                    type === "income"
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                      : "border-border bg-background text-stone hover:bg-cream-100"
                  }`}
                >
                  <ArrowUpRight className="size-4 inline mr-1" /> Pendapatan
                </button>
                <button
                  type="button"
                  onClick={() => { setType("expense"); setCategory(getDefaultCategoryForType("expense")); }}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                    type === "expense"
                      ? "border-rose-300 bg-rose-50 text-rose-700"
                      : "border-border bg-background text-stone hover:bg-cream-100"
                  }`}
                >
                  <ArrowDownRight className="size-4 inline mr-1" /> Pengeluaran
                </button>
              </div>
            </div>

            {/* Category + Date */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="mb-1.5">Kategori</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="w-full h-9" size="sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getCategoriesByType(type).map((c) => (
                      <SelectItem key={c} value={c}>
                        {TX_CATEGORY_LABELS[c] ?? c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5">Tanggal</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>

            {/* Product (income only) */}
            {type === "income" && (
              <div>
                <Label className="mb-1.5">Nama Produk</Label>
                <Select value={productId} onValueChange={handleProductChange}>
                  <SelectTrigger className="w-full h-9" size="sm">
                    <SelectValue placeholder="Pilih produk" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Tanpa produk —</SelectItem>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} — {formatRupiah(p.price)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedProduct && (
                  <div className="mt-1.5 text-[11px] text-stone bg-cream-100/60 rounded-md px-2 py-1">
                    Modal: {selectedProduct.costPrice != null ? formatRupiah(selectedProduct.costPrice) : "belum diisi"}
                    {selectedProduct.costPrice != null && (
                      <> · Margin: {formatRupiah(selectedProduct.price - selectedProduct.costPrice)}</>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Kuantitas + Harga Satuan */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="mb-1.5">Kuantitas (Pcs)</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  placeholder="1"
                  value={quantity}
                  onChange={(e) => {
                    const q = Math.max(1, Number(e.target.value) || 1);
                    setQuantity(String(q));
                    if (priceMode === "auto" && unitPrice) {
                      setAmount(String(Number(unitPrice) * q));
                    }
                  }}
                  className="h-9"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label>Harga Satuan (Rp)</Label>
                  {type === "income" && (
                    <button
                      type="button"
                      onClick={() => setPriceMode(priceMode === "auto" ? "manual" : "auto")}
                      className="text-[10px] text-teal hover:underline"
                    >
                      {priceMode === "auto" ? "✏️ Edit" : "📋 Dari produk"}
                    </button>
                  )}
                </div>
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="0"
                  value={unitPrice}
                  disabled={priceMode === "auto" && productId !== "none"}
                  onChange={(e) => {
                    setUnitPrice(e.target.value);
                    const q = Number(quantity) || 1;
                    setAmount(String(Number(e.target.value) * q));
                  }}
                  className="h-9"
                />
              </div>
            </div>

            {/* Total Harga (auto) */}
            <div>
              <Label className="mb-1.5">Total Harga (Rp)</Label>
              <div className="h-9 rounded-lg border border-border bg-cream-100/60 px-3 flex items-center text-base font-bold text-teal-700 tabular-nums">
                {formatRupiah(Number(amount) || 0)}
              </div>
            </div>

            {/* Nama Pembeli */}
            <div>
              <Label className="mb-1.5">Nama Pembeli</Label>
              <Input
                placeholder="Contoh: Budi, Kantor X, Warung Maju"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                className="h-9"
              />
            </div>

            {/* Metode Pembayaran */}
            <div>
              <Label className="mb-1.5">Metode Pembayaran</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="w-full h-9" size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Tunai", "Transfer Bank", "QRIS", "COD", "E-Wallet", "Kartu Kredit", "Kartu Debit", "Lainnya"].map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div>
              <Label className="mb-1.5">Deskripsi (opsional)</Label>
              <Input
                placeholder="Contoh: Penjualan 5 cup kopi ke kantor X"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-9"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={resetForm} disabled={saving || ocrLoading || templateLoading}>
            Batal
          </Button>
          {mode === "manual" && (
            <>
              <Button variant="outline" onClick={handleSubmitAndStay} disabled={saving || !amount || Number(amount) <= 0}>
                {saving ? "..." : "Simpan & Upload Lagi"}
              </Button>
              <Button className="bg-teal hover:bg-teal-600" onClick={handleSubmit} disabled={saving || !amount || Number(amount) <= 0}>
                {saving ? "Menyimpan..." : "Simpan"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
