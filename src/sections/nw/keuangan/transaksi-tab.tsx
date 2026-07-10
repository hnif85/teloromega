"use client";

import { useState, useMemo } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SectionCard, EmptyState } from "@/components/nw/primitives";
import { Plus, Search, Download, ArrowUpRight, ArrowDownRight, FileText } from "lucide-react";
import { api } from "@/lib/api";
import { formatRupiah } from "@/lib/constants";
import { exportToCsv } from "@/lib/csv";
import { TX_CATEGORY_LABELS, type TransactionRow, type TxType } from "./types";

interface ProductLite {
  id: string;
  name: string;
  price: number;
  costPrice: number | null;
}

const TX_CATEGORIES = Object.entries(TX_CATEGORY_LABELS).map(([value, label]) => ({
  value,
  label,
}));

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
              {TX_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
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
            <Table>
              <TableHeader>
                <TableRow className="bg-cream-100/60 hover:bg-cream-100/60">
                  <TableHead className="text-xs text-stone font-semibold">Tipe</TableHead>
                  <TableHead className="text-xs text-stone font-semibold">Kategori</TableHead>
                  <TableHead className="text-xs text-stone font-semibold">Deskripsi</TableHead>
                  <TableHead className="text-xs text-stone font-semibold hidden md:table-cell">
                    Entitas
                  </TableHead>
                  <TableHead className="text-xs text-stone font-semibold hidden sm:table-cell">
                    Tanggal
                  </TableHead>
                  <TableHead className="text-xs text-stone font-semibold text-right">Jumlah</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((t) => (
                  <TableRow key={t.id} className="hover:bg-cream-100/40">
                    <TableCell>
                      {t.type === "income" ? (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 border">
                          <ArrowUpRight className="size-3" /> Masuk
                        </Badge>
                      ) : (
                        <Badge className="bg-rose-100 text-rose-700 border-rose-200 border">
                          <ArrowDownRight className="size-3" /> Keluar
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-stone">
                        {TX_CATEGORY_LABELS[t.category] ?? t.category}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[280px]">
                      <div className="text-sm text-ink font-medium truncate">
                        {t.description ?? "—"}
                      </div>
                      {t.costAmount === null && t.type === "income" && (
                        <span className="text-[10px] text-amber-600 font-medium">
                          ⚠ HPP belum lengkap
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {t.product ? (
                        <span className="text-xs text-stone truncate">
                          📦 {t.product.name}
                        </span>
                      ) : t.customer ? (
                        <span className="text-xs text-stone truncate">
                          👤 {t.customer.name}
                        </span>
                      ) : t.order ? (
                        <span className="text-xs text-stone">
                          🛒 Order {t.order.resiNumber ?? t.order.id.slice(-6)}
                        </span>
                      ) : (
                        <span className="text-xs text-stone">—</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className="text-xs text-stone">
                        {new Date(t.date).toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          year: "2-digit",
                        })}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={`text-sm font-bold tabular-nums ${
                          t.type === "income" ? "text-emerald-700" : "text-rose-700"
                        }`}
                      >
                        {t.type === "income" ? "+" : "−"}
                        {formatRupiah(t.amount)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

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

function AddTransactionDialog({
  brandId,
  products,
  open,
  onOpenChange,
  onCreated,
  trigger,
}: {
  brandId: string;
  products: ProductLite[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
  trigger?: boolean;
}) {
  const [type, setType] = useState<TxType>("income");
  const [category, setCategory] = useState<string>("penjualan");
  const [amount, setAmount] = useState<string>("");
  const [productId, setProductId] = useState<string>("none");
  const [description, setDescription] = useState<string>("");
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  const selectedProduct = products.find((p) => p.id === productId);

  async function handleSubmit() {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error("Jumlah harus angka lebih dari 0");
      return;
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
          description: description.trim() || null,
          date,
        },
      });
      toast.success("Transaksi ditambahkan");
      // reset
      setAmount("");
      setDescription("");
      setProductId("none");
      setCategory("penjualan");
      setType("income");
      onOpenChange(false);
      onCreated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan transaksi");
    } finally {
      setSaving(false);
    }
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
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="size-4 text-teal" /> Catat Transaksi
          </DialogTitle>
          <DialogDescription>
            Catat manual pendapatan atau pengeluaran. HPP otomatis dihitung bila produk dipilih.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Type toggle */}
          <div>
            <Label className="mb-1.5">Tipe Transaksi</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType("income")}
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
                onClick={() => setType("expense")}
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

          {/* Category */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="mb-1.5">Kategori</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full h-9" size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TX_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
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

          {/* Amount */}
          <div>
            <Label className="mb-1.5">Jumlah (Rp)</Label>
            <Input
              type="number"
              inputMode="numeric"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-9 text-base font-bold"
            />
          </div>

          {/* Product link (income only) */}
          {type === "income" && (
            <div>
              <Label className="mb-1.5">Produk (opsional — auto HPP)</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger className="w-full h-9" size="sm">
                  <SelectValue placeholder="Pilih produk" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Tidak ada produk —</SelectItem>
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

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Batal
          </Button>
          <Button className="bg-teal hover:bg-teal-600" onClick={handleSubmit} disabled={saving}>
            {saving ? "Menyimpan..." : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
