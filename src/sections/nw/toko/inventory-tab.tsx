"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAppStore, type SessionUser } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { SectionCard, EmptyState } from "@/components/nw/primitives";
import { useToast } from "@/hooks/use-toast";
import { formatRupiah, timeAgo, ORDER_STATUS } from "@/lib/constants";
import {
  Package,
  AlertTriangle,
  Pencil,
  TrendingDown,
  TrendingUp,
  History,
} from "lucide-react";
import type { Product, InventoryMovement } from "@/sections/nw/toko/types";

export function InventoryTab({
  brandId,
  user: _user,
}: {
  brandId: string;
  user: SessionUser | null;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ stock: number; minStock: number }>({ stock: 0, minStock: 0 });
  const [historyId, setHistoryId] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ products: Product[]; movements: InventoryMovement[] }>({
    queryKey: ["inventory", brandId],
    queryFn: () => api(`/api/inventory?brandId=${brandId}`),
    enabled: !!brandId,
  });

  const products = data?.products ?? [];
  const movements = data?.movements ?? [];
  const barangProducts = products.filter((p) => p.type === "barang");
  const lowStockCount = barangProducts.filter(
    (p) => p.stock != null && p.minStock != null && (p.stock ?? 0) <= (p.minStock ?? 0)
  ).length;

  const patchMutation = useMutation({
    mutationFn: () => {
      if (!editId) throw new Error("no edit");
      return api(`/api/inventory/${editId}`, {
        method: "PATCH",
        json: editForm,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory", brandId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", brandId] });
      toast({ title: "Stok diupdate" });
      setEditId(null);
    },
    onError: (e: Error) => toast({ title: "Gagal", description: e.message, variant: "destructive" }),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="text-sm text-stone">
          <span className="font-bold text-ink">{barangProducts.length}</span> produk barang ·{" "}
          <span className="font-bold text-amber-700">{lowStockCount}</span> stok menipis
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : barangProducts.length === 0 ? (
        <EmptyState
          icon="📦"
          title="Belum ada produk barang"
          desc="Tambahkan produk dengan tipe 'barang' di Pengaturan untuk mulai melacak stok."
        />
      ) : (
        <>
          {lowStockCount > 0 && (
            <Card className="mb-4 p-3 border-amber-300 bg-amber-50/50">
              <div className="flex items-center gap-2 text-amber-800 text-sm">
                <AlertTriangle className="size-4" />
                <span>
                  <span className="font-bold">{lowStockCount}</span> produk di bawah minimum stok dan perlu restok.
                </span>
              </div>
            </Card>
          )}

          <SectionCard bodyClassName="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produk</TableHead>
                    <TableHead className="hidden sm:table-cell">Harga</TableHead>
                    <TableHead className="text-right">Stok</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">Min</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {barangProducts.map((p) => {
                    const isLow =
                      p.stock != null && p.minStock != null && (p.stock ?? 0) <= (p.minStock ?? 0);
                    const isOut = (p.stock ?? 0) <= 0;
                    return (
                      <TableRow key={p.id} className="hover:bg-cream-100/40">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="size-9 rounded-lg bg-cream-200 flex items-center justify-center shrink-0">
                              {p.imageUrl ? (
                                <img src={p.imageUrl} alt={p.name} className="size-full object-cover rounded-lg" />
                              ) : (
                                <Package className="size-4 text-stone" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-ink truncate">{p.name}</div>
                              <div className="text-[11px] text-stone">
                                {p.sku ? `SKU: ${p.sku} · ` : ""}HPP {p.costPrice ? formatRupiah(p.costPrice) : "—"}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm font-semibold text-ink tabular-nums">
                          {formatRupiah(p.price)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={`font-bold tabular-nums ${
                              isOut ? "text-danger" : isLow ? "text-amber-700" : "text-ink"
                            }`}
                          >
                            {p.stock ?? 0}
                          </span>
                        </TableCell>
                        <TableCell className="text-right hidden sm:table-cell text-sm text-stone tabular-nums">
                          {p.minStock ?? 0}
                        </TableCell>
                        <TableCell>
                          {isOut ? (
                            <Badge className="bg-rose-100 text-rose-700 border-rose-200 border">Habis</Badge>
                          ) : isLow ? (
                            <Badge className="bg-amber-100 text-amber-700 border-amber-200 border">Menipis</Badge>
                          ) : (
                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 border">Aman</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => setHistoryId(p.id)}
                            >
                              <History className="size-3" /> Riwayat
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => {
                                setEditId(p.id);
                                setEditForm({ stock: p.stock ?? 0, minStock: p.minStock ?? 0 });
                              }}
                            >
                              <Pencil className="size-3" /> Edit
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </SectionCard>

          {/* Jasa products (no stock) */}
          {products.some((p) => p.type === "jasa") && (
            <SectionCard
              title="Produk Jasa"
              desc="Tidak ada pelacakan stok"
              bodyClassName="p-0"
              className="mt-4"
            >
              <div className="divide-y divide-border">
                {products
                  .filter((p) => p.type === "jasa")
                  .map((p) => (
                    <div key={p.id} className="p-3 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold text-ink">{p.name}</div>
                        <div className="text-[11px] text-stone">Tipe: Jasa</div>
                      </div>
                      <Badge variant="outline" className="text-orange-700 border-orange/30">
                        Jasa
                      </Badge>
                    </div>
                  ))}
              </div>
            </SectionCard>
          )}
        </>
      )}

      {/* Edit stock dialog */}
      <Dialog open={!!editId} onOpenChange={(v) => !v && setEditId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Stok</DialogTitle>
            <DialogDescription>
              {(() => {
                const p = products.find((x) => x.id === editId);
                return p ? `Update stok & minimum untuk "${p.name}"` : "";
              })()}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-stone">Stok saat ini</Label>
              <Input
                type="number"
                value={editForm.stock}
                onChange={(e) => setEditForm({ ...editForm, stock: Number(e.target.value) })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-stone">Min. stok (alert)</Label>
              <Input
                type="number"
                value={editForm.minStock}
                onChange={(e) => setEditForm({ ...editForm, minStock: Number(e.target.value) })}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditId(null)}>Batal</Button>
            <Button
              className="bg-teal hover:bg-teal-600"
              disabled={patchMutation.isPending}
              onClick={() => patchMutation.mutate()}
            >
              {patchMutation.isPending ? "Menyimpan…" : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Movement history dialog */}
      <Dialog open={!!historyId} onOpenChange={(v) => !v && setHistoryId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Riwayat Pergerakan Stok</DialogTitle>
            <DialogDescription>
              {(() => {
                const p = products.find((x) => x.id === historyId);
                return p ? `Dari order-order untuk "${p.name}"` : "";
              })()}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            {movements.filter((m) => m.productId === historyId).length === 0 ? (
              <div className="text-center py-6 text-sm text-stone">
                Belum ada pergerakan stok.
              </div>
            ) : (
              <div className="space-y-2">
                {movements
                  .filter((m) => m.productId === historyId)
                  .map((m, idx) => {
                    const statusMeta = ORDER_STATUS.find((s) => s.key === m.status);
                    const isCancel = m.status === "Dibatalkan";
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card p-2.5"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${
                              isCancel
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-rose-100 text-rose-700"
                            }`}
                          >
                            {isCancel ? (
                              <TrendingUp className="size-4" />
                            ) : (
                              <TrendingDown className="size-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-ink truncate">
                              #{m.orderId.slice(-6).toUpperCase()} · {m.customerName ?? "Walk-in"}
                            </div>
                            <div className="text-[10px] text-stone">
                              {timeAgo(m.createdAt)} · {m.status}
                            </div>
                          </div>
                        </div>
                        <div className={`font-bold tabular-nums text-sm ${
                          isCancel ? "text-emerald-700" : "text-rose-700"
                        }`}>
                          {isCancel ? "+" : "−"}{m.qty}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryId(null)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
