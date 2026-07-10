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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { useToast } from "@/hooks/use-toast";
import { PAYMENT_STATUS, formatRupiah, timeAgo } from "@/lib/constants";
import { CheckCircle2, XCircle, Plus, CreditCard } from "lucide-react";
import type { Payment, Order, Customer } from "@/sections/nw/toko/types";

interface PaymentRow extends Payment {
  order?: Order & { customer?: Customer | null };
}

export function PaymentsTab({
  brandId,
  user: _user,
}: {
  brandId: string;
  user: SessionUser | null;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState<string | null>(null); // orderId
  const [addForm, setAddForm] = useState({ amount: 0, method: "transfer", proofImageUrl: "" });
  const [confirmAction, setConfirmAction] = useState<{ payment: PaymentRow; status: "Diterima" | "Ditolak" } | null>(null);

  const { data, isLoading } = useQuery<{ payments: PaymentRow[] }>({
    queryKey: ["payments", brandId],
    queryFn: () => api(`/api/payments?brandId=${brandId}`),
    enabled: !!brandId,
  });
  const { data: ordersData } = useQuery<{ orders: (Order & { customer?: Customer | null })[] }>({
    queryKey: ["orders", brandId],
    queryFn: () => api(`/api/orders?brandId=${brandId}`),
    enabled: !!brandId,
  });

  const payments = data?.payments ?? [];

  const addMutation = useMutation({
    mutationFn: () =>
      api(`/api/payments`, {
        method: "POST",
        json: {
          orderId: addOpen,
          amount: Number(addForm.amount),
          method: addForm.method,
          proofImageUrl: addForm.proofImageUrl || undefined,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments", brandId] });
      queryClient.invalidateQueries({ queryKey: ["orders", brandId] });
      toast({ title: "Pembayaran ditambahkan (Menunggu verifikasi)" });
      setAddOpen(null);
      setAddForm({ amount: 0, method: "transfer", proofImageUrl: "" });
    },
    onError: (e: Error) => toast({ title: "Gagal", description: e.message, variant: "destructive" }),
  });

  const verifyMutation = useMutation({
    mutationFn: () => {
      if (!confirmAction) throw new Error("tidak ada aksi");
      return api<{ payment: Payment; transaction: unknown }>(
        `/api/payments/${confirmAction.payment.id}/verify`,
        { method: "POST", json: { status: confirmAction.status } }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments", brandId] });
      queryClient.invalidateQueries({ queryKey: ["orders", brandId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", brandId] });
      queryClient.invalidateQueries({ queryKey: ["customers", brandId] });
      if (confirmAction?.status === "Diterima") {
        toast({
          title: "Pembayaran diterima ✅",
          description: "Income tercatat di Keuangan. Customer totals di-update.",
        });
      } else {
        toast({ title: "Pembayaran ditolak" });
      }
      setConfirmAction(null);
    },
    onError: (e: Error) => toast({ title: "Gagal", description: e.message, variant: "destructive" }),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-stone">
          Total <span className="font-bold text-ink">{payments.length}</span> pembayaran ·{" "}
          {payments.filter((p) => p.status === "Menunggu").length} menunggu verifikasi
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : payments.length === 0 ? (
        <EmptyState
          icon="💳"
          title="Belum ada pembayaran"
          desc="Pembayaran akan muncul otomatis setelah ditambahkan ke order."
          action={
            <Select
              onValueChange={(orderId) => {
                setAddOpen(orderId);
                const o = (ordersData?.orders ?? []).find((x) => x.id === orderId);
                setAddForm({ amount: o?.totalAmount ?? 0, method: "transfer", proofImageUrl: "" });
              }}
            >
              <SelectTrigger className="bg-teal text-white border-teal hover:bg-teal-600 h-9 text-sm">
                <Plus className="size-4" /> Tambah Pembayaran
              </SelectTrigger>
              <SelectContent>
                {(ordersData?.orders ?? []).length === 0 ? (
                  <SelectItem value="_none" disabled>
                    Belum ada order
                  </SelectItem>
                ) : (
                  (ordersData?.orders ?? []).map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      #{o.id.slice(-6)} · {o.customer?.name ?? "Walk-in"} · {formatRupiah(o.totalAmount)}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          }
        />
      ) : (
        <SectionCard bodyClassName="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                  <TableHead className="hidden sm:table-cell">Metode</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Waktu</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => {
                  const meta = PAYMENT_STATUS.find((s) => s.key === p.status) ?? PAYMENT_STATUS[0];
                  return (
                    <TableRow key={p.id} className="hover:bg-cream-100/40">
                      <TableCell>
                        <div className="font-mono text-xs font-semibold text-ink">
                          #{p.orderId.slice(-6).toUpperCase()}
                        </div>
                        <div className="text-[10px] text-stone">
                          {p.order ? formatRupiah(p.order.totalAmount) : ""}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium text-ink">
                          {p.order?.customer?.name ?? "Walk-in"}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-bold text-ink tabular-nums">
                        {formatRupiah(p.amount)}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-xs text-stone">
                        <Badge variant="outline" className="text-[10px]">{p.method}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={meta.color}>{meta.label}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-stone">
                        {timeAgo(p.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        {p.status === "Menunggu" ? (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              className="h-7 text-xs bg-success hover:bg-success/90"
                              onClick={() => setConfirmAction({ payment: p, status: "Diterima" })}
                            >
                              <CheckCircle2 className="size-3.5" /> Terima
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs text-danger border-danger/30 hover:bg-danger-100/40"
                              onClick={() => setConfirmAction({ payment: p, status: "Ditolak" })}
                            >
                              <XCircle className="size-3.5" /> Tolak
                            </Button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-stone">
                            {p.verifiedAt ? `Diverifikasi ${timeAgo(p.verifiedAt)}` : "—"}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="p-3 border-t border-border bg-cream-100/30">
            <Select
              onValueChange={(orderId) => {
                setAddOpen(orderId);
                const o = (ordersData?.orders ?? []).find((x) => x.id === orderId);
                setAddForm({ amount: o?.totalAmount ?? 0, method: "transfer", proofImageUrl: "" });
              }}
              value=""
            >
              <SelectTrigger className="h-9 text-sm bg-teal text-white border-teal hover:bg-teal-600 max-w-xs">
                <Plus className="size-4" /> Tambah Pembayaran
              </SelectTrigger>
              <SelectContent>
                {(ordersData?.orders ?? []).length === 0 ? (
                  <SelectItem value="_none" disabled>Belum ada order</SelectItem>
                ) : (
                  (ordersData?.orders ?? []).map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      #{o.id.slice(-6)} · {o.customer?.name ?? "Walk-in"} · {formatRupiah(o.totalAmount)}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </SectionCard>
      )}

      {/* Add payment dialog */}
      <Dialog open={!!addOpen} onOpenChange={(v) => !v && setAddOpen(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Pembayaran</DialogTitle>
            <DialogDescription>Status awal: Menunggu verifikasi.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-stone">Jumlah</Label>
              <Input
                type="number"
                value={addForm.amount}
                onChange={(e) => setAddForm({ ...addForm, amount: Number(e.target.value) })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-stone">Metode</Label>
              <select
                className="mt-1 w-full h-9 rounded-md border border-border bg-card px-2 text-sm"
                value={addForm.method}
                onChange={(e) => setAddForm({ ...addForm, method: e.target.value })}
              >
                <option value="transfer">Transfer Bank</option>
                <option value="qris">QRIS</option>
                <option value="ewallet">E-Wallet</option>
                <option value="cod">COD</option>
                <option value="lainnya">Lainnya</option>
              </select>
            </div>
            <div>
              <Label className="text-xs text-stone">URL Bukti (opsional)</Label>
              <Input
                value={addForm.proofImageUrl}
                onChange={(e) => setAddForm({ ...addForm, proofImageUrl: e.target.value })}
                placeholder="https://…"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(null)}>Batal</Button>
            <Button
              className="bg-teal hover:bg-teal-600"
              disabled={addMutation.isPending || !addForm.amount}
              onClick={() => addMutation.mutate()}
            >
              {addMutation.isPending ? "Menyimpan…" : "Tambah"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm verify dialog */}
      <Dialog open={!!confirmAction} onOpenChange={(v) => !v && setConfirmAction(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {confirmAction?.status === "Diterima" ? "Verifikasi Pembayaran" : "Tolak Pembayaran"}
            </DialogTitle>
            <DialogDescription>
              {confirmAction?.status === "Diterima"
                ? `Pembayaran ${formatRupiah(confirmAction?.payment.amount ?? 0)} akan diakui sebagai income di Keuangan. Order akan otomatis jadi "Diproses".`
                : "Pembayaran akan ditandai ditolak. Tidak ada income yang dicatat."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(null)}>Batal</Button>
            <Button
              className={
                confirmAction?.status === "Diterima"
                  ? "bg-success hover:bg-success/90"
                  : "bg-danger hover:bg-danger/90"
              }
              disabled={verifyMutation.isPending}
              onClick={() => verifyMutation.mutate()}
            >
              {verifyMutation.isPending
                ? "Memproses…"
                : confirmAction?.status === "Diterima"
                  ? "Ya, Terima"
                  : "Ya, Tolak"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
