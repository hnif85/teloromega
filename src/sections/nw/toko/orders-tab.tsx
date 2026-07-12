"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAppStore, type SessionUser } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { EmptyState, SectionCard } from "@/components/nw/primitives";
import { useToast } from "@/hooks/use-toast";
import {
  ORDER_STATUS,
  PAYMENT_STATUS,
  formatRupiah,
  timeAgo,
} from "@/lib/constants";
import {
  Plus,
  ChevronDown,
  ChevronRight,
  Truck,
  Package,
  CreditCard,
  ShoppingCart,
  Printer,
  ExternalLink,
  Download,
} from "lucide-react";
import type { Order, OrderItem, Product, Payment, Customer, Lead } from "@/sections/nw/toko/types";
import { InvoiceDialog } from "@/sections/nw/toko/invoice-dialog";
import { CustomerDetailDialog } from "@/sections/nw/toko/customer-detail-dialog";
import { exportToCsv } from "@/lib/csv";

interface OrderRow extends Order {
  customer?: Customer | null;
  lead?: Lead | null;
  payments?: Payment[];
}

export function OrdersTab({
  brandId,
  user: _user,
}: {
  brandId: string;
  user: SessionUser | null;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [createOpen, setCreateOpen] = useState(false);
  const [invoiceOrder, setInvoiceOrder] = useState<OrderRow | null>(null);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [detailCustomerId, setDetailCustomerId] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ orders: OrderRow[] }>({
    queryKey: ["orders", brandId],
    queryFn: () => api(`/api/orders?brandId=${brandId}`),
    enabled: !!brandId,
  });
  const { data: productsData } = useQuery<{ products: Product[] }>({
    queryKey: ["products", brandId],
    queryFn: () => api(`/api/products?brandId=${brandId}`),
    enabled: !!brandId,
  });
  const { data: customersData } = useQuery<{ customers: Customer[]; leads: Lead[] }>({
    queryKey: ["customers", brandId],
    queryFn: () => api(`/api/customers?brandId=${brandId}`),
    enabled: !!brandId,
  });

  const orders = data?.orders ?? [];
  const products = (productsData?.products ?? []).filter((p) => p.isActive);

  // Create form
  const [form, setForm] = useState<{
    customerId?: string;
    leadId?: string;
    items: Record<string, number>;
    shippingCost: number | "";
    notes: string;
  }>({
    items: {},
    shippingCost: "",
    notes: "",
  });

  const total = useMemo(() => {
    const itemsTotal = Object.entries(form.items)
      .filter(([, qty]) => qty > 0)
      .reduce((acc, [pid, qty]) => {
        const p = products.find((x) => x.id === pid);
        return acc + (p?.price ?? 0) * qty;
      }, 0);
    return itemsTotal + (form.shippingCost === "" ? 0 : Number(form.shippingCost));
  }, [form, products]);

  const createMutation = useMutation({
    mutationFn: () => {
      const items = Object.entries(form.items)
        .filter(([, qty]) => qty > 0)
        .map(([productId, qty]) => ({ productId, qty }));
      return api<{ order: OrderRow; stockWarnings: string[] }>(`/api/orders`, {
        method: "POST",
        json: {
          brandId,
          customerId: form.customerId || undefined,
          leadId: form.leadId || undefined,
          items,
          shippingCost: form.shippingCost === "" ? undefined : Number(form.shippingCost),
          notes: form.notes,
        },
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["orders", brandId] });
      queryClient.invalidateQueries({ queryKey: ["inventory", brandId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", brandId] });
      if (res.stockWarnings.length > 0) {
        toast({
          title: "Order dibuat dengan peringatan stok",
          description: res.stockWarnings.join("; "),
          variant: "destructive",
        });
      } else {
        toast({ title: "Order dibuat 🎉" });
      }
      setCreateOpen(false);
      setForm({ items: {}, shippingCost: "", notes: "" });
    },
    onError: (e: Error) => toast({ title: "Gagal", description: e.message, variant: "destructive" }),
  });

  const patchMutation = useMutation({
    mutationFn: (variables: { id: string; status?: string; resiNumber?: string; shippingCourier?: string; shippingCost?: number | null; notes?: string }) =>
      api<{ order: OrderRow }>(`/api/orders/${variables.id}`, {
        method: "PATCH",
        json: variables,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders", brandId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", brandId] });
      queryClient.invalidateQueries({ queryKey: ["inventory", brandId] });
    },
    onError: (e: Error) => toast({ title: "Gagal", description: e.message, variant: "destructive" }),
  });

  function parseItems(s: string): OrderItem[] {
    try {
      return JSON.parse(s) as OrderItem[];
    } catch {
      return [];
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-stone">
          Total <span className="font-bold text-ink">{orders.length}</span> order · Klik baris untuk detail
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={orders.length === 0}
            onClick={() => {
              if (orders.length === 0) return;
              exportToCsv(
                orders.map((o) => {
                  let items: OrderItem[] = [];
                  try { items = JSON.parse(o.items); } catch { /* */ }
                  const paidAmount = (o.payments ?? [])
                    .filter((p) => p.status === "Diterima")
                    .reduce((s, p) => s + p.amount, 0);
                  return {
                    order_id: o.id,
                    tanggal: new Date(o.createdAt).toLocaleDateString("id-ID"),
                    pelanggan: o.customer?.name ?? o.lead?.name ?? "Walk-in",
                    telepon: o.customer?.phone ?? o.lead?.phone ?? "",
                    items_summary: items.map((i) => `${i.name} ×${i.qty}`).join("; "),
                    total_item: items.reduce((s, i) => s + i.qty, 0),
                    subtotal: items.reduce((s, i) => s + i.qty * i.price, 0),
                    ongkir: o.shippingCost ?? 0,
                    total: o.totalAmount,
                    dibayar: paidAmount,
                    status_order: o.status,
                    status_bayar: paidAmount >= o.totalAmount && paidAmount > 0 ? "Lunas" : paidAmount > 0 ? "Sebagian" : (o.payments?.length ?? 0) > 0 ? "Menunggu" : "Belum bayar",
                    resi: o.resiNumber ?? "",
                    kurir: o.shippingCourier ?? "",
                    catatan: o.notes ?? "",
                  };
                }),
                [
                  { key: "order_id", label: "Order ID" },
                  { key: "tanggal", label: "Tanggal" },
                  { key: "pelanggan", label: "Pelanggan" },
                  { key: "telepon", label: "Telepon" },
                  { key: "items_summary", label: "Items" },
                  { key: "total_item", label: "Total Item" },
                  { key: "subtotal", label: "Subtotal (Rp)" },
                  { key: "ongkir", label: "Ongkir (Rp)" },
                  { key: "total", label: "Total (Rp)" },
                  { key: "dibayar", label: "Dibayar (Rp)" },
                  { key: "status_order", label: "Status Order" },
                  { key: "status_bayar", label: "Status Bayar" },
                  { key: "resi", label: "No Resi" },
                  { key: "kurir", label: "Kurir" },
                  { key: "catatan", label: "Catatan" },
                ],
                `orders-${new Date().toISOString().slice(0, 10)}`
              );
              toast({ title: `${orders.length} order diekspor ke CSV` });
            }}
          >
            <Download className="size-3.5" /> CSV
          </Button>
          <Button size="sm" className="bg-teal hover:bg-teal-600" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" /> Order Baru
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          icon="🛒"
          title="Belum ada order"
          desc="Buat order baru, atau dari Leads → Jadikan Order."
          action={
            <Button size="sm" className="bg-teal hover:bg-teal-600" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" /> Buat Order
            </Button>
          }
        />
      ) : (
        <SectionCard bodyClassName="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Customer / Lead</TableHead>
                  <TableHead className="hidden md:table-cell">Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="hidden sm:table-cell">Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Pembayaran</TableHead>
                  <TableHead className="hidden lg:table-cell">Waktu</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o) => {
                  const items = parseItems(o.items);
                  const isOpen = expanded[o.id] ?? false;
                  const statusMeta = ORDER_STATUS.find((s) => s.key === o.status) ?? ORDER_STATUS[0];
                  const totalPaid = (o.payments ?? [])
                    .filter((p) => p.status === "Diterima")
                    .reduce((acc, p) => acc + p.amount, 0);
                  const hasPending = (o.payments ?? []).some((p) => p.status === "Menunggu");
                  const hasShipping = items.some((i) => i.type === "barang");
                  return (
                    <>
                      <TableRow
                        key={o.id}
                        className="cursor-pointer hover:bg-cream-100/40"
                        onClick={() => setExpanded((s) => ({ ...s, [o.id]: !s[o.id] }))}
                      >
                        <TableCell className="text-stone">
                          {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-sm text-ink">
                            {o.customer ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (o.customerId) setDetailCustomerId(o.customerId);
                                }}
                                className="hover:text-teal-700 hover:underline inline-flex items-center gap-1 text-left"
                              >
                                {o.customer.name}
                                <ExternalLink className="size-3 shrink-0 text-stone" />
                              </button>
                            ) : (
                              <span>{o.lead?.name ?? "Walk-in"}</span>
                            )}
                          </div>
                          <div className="text-[11px] text-stone">
                            #{o.id.slice(-6).toUpperCase()}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-stone">
                          {items.length} item · {items.reduce((a, b) => a + b.qty, 0)} unit
                        </TableCell>
                        <TableCell className="text-right font-bold text-ink tabular-nums">
                          {formatRupiah(o.totalAmount)}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge className={statusMeta.color}>{statusMeta.label}</Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {totalPaid >= o.totalAmount && totalPaid > 0 ? (
                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 border">
                              Lunas
                            </Badge>
                          ) : hasPending ? (
                            <Badge className="bg-amber-100 text-amber-700 border-amber-200 border">
                              Menunggu
                            </Badge>
                          ) : totalPaid > 0 ? (
                            <Badge className="bg-stone-100 text-stone-600 border-stone-200 border">
                              Sebagian
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-stone">Belum bayar</Badge>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-xs text-stone">
                          {timeAgo(o.createdAt)}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1"
                              onClick={() => {
                                setInvoiceOrder(o);
                                setInvoiceOpen(true);
                              }}
                              title="Cetak invoice / struk penjualan"
                            >
                              <Printer className="size-3" /> Invoice
                            </Button>
                            {o.status === "Baru" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => {
                                  patchMutation.mutate({ id: o.id, status: "Diproses" });
                                  toast({ title: "Order diproses" });
                                }}
                              >
                                Proses
                              </Button>
                            )}
                            {o.status === "Dikirim" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => {
                                  patchMutation.mutate({ id: o.id, status: "Selesai" });
                                  toast({ title: "Order selesai" });
                                }}
                              >
                                Selesai
                              </Button>
                            )}
                            {o.status !== "Dibatalkan" && o.status !== "Selesai" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs text-danger hover:bg-danger-100/40"
                                onClick={() => {
                                  if (confirm("Batalkan order? Stok akan dikembalikan.")) {
                                    patchMutation.mutate({ id: o.id, status: "Dibatalkan" });
                                    toast({ title: "Order dibatalkan" });
                                  }
                                }}
                              >
                                Batal
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      {isOpen && (
                        <TableRow key={o.id + "-detail"} className="bg-cream-100/30">
                          <TableCell colSpan={8} className="p-4">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                              {/* Items */}
                              <div className="lg:col-span-2 space-y-2">
                                <div className="text-xs font-semibold text-stone uppercase tracking-wide">
                                  Items
                                </div>
                                {items.map((it, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center justify-between rounded-lg bg-card border border-border p-2.5"
                                  >
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-semibold text-ink truncate">
                                        {it.name} × {it.qty}
                                      </div>
                                      <div className="text-xs text-stone">
                                        {formatRupiah(it.price)} / unit
                                        {it.type === "barang" && (
                                          <Badge variant="outline" className="ml-2 text-[9px] py-0 h-3.5">
                                            <Package className="size-2.5 mr-0.5" /> barang
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                    <div className="font-bold text-ink tabular-nums text-sm">
                                      {formatRupiah(it.price * it.qty)}
                                    </div>
                                  </div>
                                ))}

                                {hasShipping && (
                                  <div className="rounded-lg border border-violet-200 bg-violet-50/40 p-3 space-y-2">
                                    <div className="text-xs font-semibold text-violet-700 flex items-center gap-1">
                                      <Truck className="size-3.5" /> Pengiriman
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                      <div>
                                        <Label className="text-[10px] text-stone">Kurir</Label>
                                        <Input
                                          defaultValue={o.shippingCourier ?? ""}
                                          placeholder="JNE, JNT, dll"
                                          className="h-8 text-xs mt-0.5"
                                          onBlur={(e) =>
                                            patchMutation.mutate({
                                              id: o.id,
                                              shippingCourier: e.target.value,
                                            })
                                          }
                                        />
                                      </div>
                                      <div>
                                        <Label className="text-[10px] text-stone">No Resi</Label>
                                        <Input
                                          defaultValue={o.resiNumber ?? ""}
                                          placeholder="Resi"
                                          className="h-8 text-xs mt-0.5"
                                          onBlur={(e) =>
                                            patchMutation.mutate({
                                              id: o.id,
                                              resiNumber: e.target.value,
                                            })
                                          }
                                        />
                                      </div>
                                      <div>
                                        <Label className="text-[10px] text-stone">Ongkir</Label>
                                        <Input
                                          type="number"
                                          defaultValue={o.shippingCost ?? 0}
                                          className="h-8 text-xs mt-0.5"
                                          onBlur={(e) =>
                                            patchMutation.mutate({
                                              id: o.id,
                                              shippingCost: Number(e.target.value) || 0,
                                            })
                                          }
                                        />
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {o.notes && (
                                  <div className="text-xs text-stone bg-cream-100/60 rounded-lg p-2">
                                    📝 {o.notes}
                                  </div>
                                )}
                              </div>

                              {/* Side info */}
                              <div className="space-y-3">
                                <div className="rounded-lg border border-border bg-card p-3">
                                  <div className="text-xs font-semibold text-stone mb-1.5">
                                    Ringkasan
                                  </div>
                                  <div className="flex justify-between text-xs mb-1">
                                    <span className="text-stone">Subtotal</span>
                                    <span className="font-semibold text-ink">
                                      {formatRupiah(o.totalAmount - (o.shippingCost ?? 0))}
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-xs mb-1">
                                    <span className="text-stone">Ongkir</span>
                                    <span className="font-semibold text-ink">
                                      {formatRupiah(o.shippingCost ?? 0)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-sm pt-1 border-t border-border mt-1">
                                    <span className="font-bold text-ink">Total</span>
                                    <span className="font-bold text-ink tabular-nums">
                                      {formatRupiah(o.totalAmount)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-xs mt-1">
                                    <span className="text-emerald-700">Dibayar</span>
                                    <span className="font-semibold text-emerald-700">
                                      {formatRupiah(totalPaid)}
                                    </span>
                                  </div>
                                </div>

                                {(o.payments ?? []).length > 0 && (
                                  <div className="rounded-lg border border-border bg-card p-3">
                                    <div className="text-xs font-semibold text-stone mb-1.5">
                                      Riwayat Pembayaran
                                    </div>
                                    <div className="space-y-1">
                                        {(o.payments ?? []).map((p) => {
                                          const meta = PAYMENT_STATUS.find((s) => s.key === p.status);
                                          return (
                                            <div
                                              key={p.id}
                                              className="flex items-center justify-between text-xs"
                                            >
                                              <span className="text-stone">{p.method}</span>
                                              <span className="font-semibold text-ink">
                                                {formatRupiah(p.amount)}
                                              </span>
                                              {meta && (
                                                <Badge className={`text-[9px] h-4 ${meta.color}`}>
                                                  {meta.label}
                                                </Badge>
                                              )}
                                              {(p as any).proofImageUrl && (
                                                <a
                                                  href={(p as any).proofImageUrl}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="text-teal hover:underline ml-1 shrink-0"
                                                >
                                                  📎
                                                </a>
                                              )}
                                            </div>
                                          );
                                        })}
                                    </div>
                                  </div>
                                )}

                                <Select
                                  value={o.status}
                                  onValueChange={(v) => {
                                    patchMutation.mutate({ id: o.id, status: v });
                                    toast({ title: `Status → ${v}` });
                                  }}
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <span className="text-stone">Ubah status:</span>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {ORDER_STATUS.map((s) => (
                                      <SelectItem key={s.key} value={s.key}>
                                        {s.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </SectionCard>
      )}

      {/* Create order dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Buat Order Baru</DialogTitle>
            <DialogDescription>
              Pilih customer/lead (opsional), produk & qty. Status awal: Baru.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            <div>
              <Label className="text-xs text-stone">Customer (opsional)</Label>
              <select
                className="mt-1 w-full h-9 rounded-md border border-border bg-card px-2 text-sm"
                value={form.customerId ?? ""}
                onChange={(e) => setForm({ ...form, customerId: e.target.value || undefined })}
              >
                <option value="">— Walk-in / tanpa customer —</option>
                {(customersData?.customers ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {c.phone}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs text-stone">Lead (opsional)</Label>
              <select
                className="mt-1 w-full h-9 rounded-md border border-border bg-card px-2 text-sm"
                value={form.leadId ?? ""}
                onChange={(e) => setForm({ ...form, leadId: e.target.value || undefined })}
              >
                <option value="">— Tidak ada —</option>
                {(customersData?.leads ?? []).map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} · {l.phone}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs text-stone mb-1.5 block">Produk</Label>
              <div className="space-y-2">
                {products.length === 0 ? (
                  <div className="text-xs text-stone text-center py-3">
                    Belum ada produk aktif.
                  </div>
                ) : (
                  products.map((p) => {
                    const qty = form.items[p.id] ?? 0;
                    return (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-border bg-card"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-ink truncate">{p.name}</div>
                          <div className="text-xs text-stone">
                            {formatRupiah(p.price)}
                            {p.type === "barang" && p.stock != null && (
                              <span className={p.stock <= (p.minStock ?? 0) ? " text-amber-700 ml-1" : ""}>
                                · stok {p.stock}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="size-7 p-0"
                            onClick={() =>
                              setForm((s) => ({ ...s, items: { ...s.items, [p.id]: Math.max(0, qty - 1) } }))
                            }
                          >
                            −
                          </Button>
                          <Input
                            type="number"
                            min={0}
                            value={qty}
                            onChange={(e) =>
                              setForm((s) => ({
                                ...s,
                                items: { ...s.items, [p.id]: Math.max(0, Number(e.target.value) || 0) },
                              }))
                            }
                            className="w-14 h-7 text-center text-sm"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            className="size-7 p-0"
                            onClick={() => setForm((s) => ({ ...s, items: { ...s.items, [p.id]: qty + 1 } }))}
                          >
                            +
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-stone">Ongkir</Label>
                <Input
                  type="number"
                  value={form.shippingCost}
                  onChange={(e) =>
                    setForm({ ...form, shippingCost: e.target.value === "" ? "" : Number(e.target.value) })
                  }
                  placeholder="0"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-stone">Catatan</Label>
                <Input
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Catatan…"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="text-sm flex items-center justify-between bg-teal-50/50 rounded-lg p-2.5">
              <span className="text-stone">Total</span>
              <span className="font-bold text-teal-700 text-lg">{formatRupiah(total)}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Batal</Button>
            <Button
              className="bg-teal hover:bg-teal-600"
              disabled={createMutation.isPending || !Object.values(form.items).some((q) => q > 0)}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? "Membuat…" : "Buat Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InvoiceDialog
        order={invoiceOrder}
        open={invoiceOpen}
        onOpenChange={setInvoiceOpen}
      />

      {/* Customer Detail Dialog */}
      <CustomerDetailDialog
        customerId={detailCustomerId}
        open={!!detailCustomerId}
        onOpenChange={(o) => !o && setDetailCustomerId(null)}
      />
    </div>
  );
}
