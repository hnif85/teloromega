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
import { SectionCard, EmptyState } from "@/components/nw/primitives";
import { useToast } from "@/hooks/use-toast";
import { ORDER_STATUS, formatRupiah, timeAgo } from "@/lib/constants";
import { Truck, Package, Send, CheckCircle2 } from "lucide-react";
import type { Order, OrderItem, Customer, Lead, Payment } from "@/sections/nw/toko/types";

interface ShippingRow extends Order {
  customer?: Customer | null;
  lead?: Lead | null;
  payments?: Payment[];
}

export function ShippingTab({
  brandId,
  user: _user,
}: {
  brandId: string;
  user: SessionUser | null;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [formMap, setFormMap] = useState<Record<string, { resiNumber: string; shippingCourier: string; shippingCost: number | "" }>>({});

  const { data, isLoading } = useQuery<{ orders: ShippingRow[] }>({
    queryKey: ["shipping", brandId],
    queryFn: () => api(`/api/shipping?brandId=${brandId}`),
    enabled: !!brandId,
  });

  const orders = data?.orders ?? [];

  function getForm(orderId: string, fallback: ShippingRow) {
    return (
      formMap[orderId] ?? {
        resiNumber: fallback.resiNumber ?? "",
        shippingCourier: fallback.shippingCourier ?? "",
        shippingCost: fallback.shippingCost ?? "",
      }
    );
  }
  function setForm(orderId: string, partial: Partial<{ resiNumber: string; shippingCourier: string; shippingCost: number | "" }>) {
    setFormMap((s) => ({
      ...s,
      [orderId]: { ...getForm(orderId, orders.find((o) => o.id === orderId) as ShippingRow), ...partial },
    }));
  }

  const shipMutation = useMutation({
    mutationFn: (variables: { orderId: string; resiNumber: string; shippingCourier: string; shippingCost?: number }) =>
      api<{ order: ShippingRow }>(`/api/shipping/${variables.orderId}`, {
        method: "POST",
        json: {
          resiNumber: variables.resiNumber,
          shippingCourier: variables.shippingCourier,
          shippingCost: variables.shippingCost,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipping", brandId] });
      queryClient.invalidateQueries({ queryKey: ["orders", brandId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", brandId] });
      toast({ title: "Resi disimpan · Order dikirim 🚚" });
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

  const needsShipping = orders.filter((o) => !o.resiNumber && o.status !== "Dibatalkan");
  const alreadyShipped = orders.filter((o) => o.resiNumber);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-stone">
          <span className="font-bold text-ink">{needsShipping.length}</span> perlu dikirim ·{" "}
          <span className="font-bold text-violet-700">{alreadyShipped.length}</span> sudah dikirim
        </div>
        <Badge variant="outline" className="text-[10px] text-violet-700 border-violet/30">
          <Package className="size-3 mr-1" /> Hanya produk barang
        </Badge>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : needsShipping.length === 0 && alreadyShipped.length === 0 ? (
        <EmptyState
          icon="🚚"
          title="Belum ada order barang"
          desc="Order dengan produk tipe 'barang' yang sudah dibayar akan muncul di sini untuk input resi."
        />
      ) : (
        <div className="space-y-6">
          {needsShipping.length > 0 && (
            <SectionCard
              title="Perlu Dikirim"
              desc={`${needsShipping.length} order menunggu resi`}
              bodyClassName="p-0"
            >
              <div className="divide-y divide-border">
                {needsShipping.map((o) => {
                  const items = parseItems(o.items);
                  const barangItems = items.filter((i) => i.type === "barang");
                  const f = getForm(o.id, o);
                  return (
                    <div key={o.id} className="p-4 hover:bg-cream-100/30">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold text-ink">
                              #{o.id.slice(-6).toUpperCase()}
                            </span>
                            <Badge className="bg-sky-100 text-sky-700 border-sky-200 border text-[10px]">
                              {o.status}
                            </Badge>
                            {o.shippingCourier && (
                              <Badge variant="outline" className="text-[10px]">{o.shippingCourier}</Badge>
                            )}
                          </div>
                          <div className="text-sm font-semibold text-ink mt-0.5">
                            {o.customer?.name ?? o.lead?.name ?? "Walk-in"}
                          </div>
                          <div className="text-xs text-stone mt-0.5">
                            {barangItems.map((i) => `${i.name} × ${i.qty}`).join(", ")} ·{" "}
                            {timeAgo(o.createdAt)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-ink tabular-nums">
                            {formatRupiah(o.totalAmount)}
                          </div>
                          {o.shippingCost != null && (
                            <div className="text-[10px] text-stone">ongkir {formatRupiah(o.shippingCost)}</div>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_140px_auto] gap-2 items-end">
                        <div>
                          <Label className="text-[10px] text-stone">Kurir</Label>
                          <Input
                            placeholder="JNE, JNT, SiCepat…"
                            value={f.shippingCourier}
                            onChange={(e) => setForm(o.id, { shippingCourier: e.target.value })}
                            className="h-9 text-sm mt-0.5"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-stone">No Resi</Label>
                          <Input
                            placeholder="AWB1234567"
                            value={f.resiNumber}
                            onChange={(e) => setForm(o.id, { resiNumber: e.target.value })}
                            className="h-9 text-sm mt-0.5"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-stone">Ongkir (Rp)</Label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={f.shippingCost}
                            onChange={(e) =>
                              setForm(o.id, {
                                shippingCost: e.target.value === "" ? "" : Number(e.target.value),
                              })
                            }
                            className="h-9 text-sm mt-0.5"
                          />
                        </div>
                        <Button
                          className="bg-violet-600 hover:bg-violet-700 h-9"
                          disabled={
                            shipMutation.isPending ||
                            !f.resiNumber.trim() ||
                            !f.shippingCourier.trim()
                          }
                          onClick={() =>
                            shipMutation.mutate({
                              orderId: o.id,
                              resiNumber: f.resiNumber,
                              shippingCourier: f.shippingCourier,
                              shippingCost: f.shippingCost === "" ? undefined : Number(f.shippingCost),
                            })
                          }
                        >
                          <Send className="size-4" /> Kirim
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          )}

          {alreadyShipped.length > 0 && (
            <SectionCard
              title="Sudah Dikirim"
              desc={`${alreadyShipped.length} order dengan resi`}
              bodyClassName="p-0"
            >
              <div className="divide-y divide-border">
                {alreadyShipped.map((o) => {
                  const items = parseItems(o.items);
                  return (
                    <div key={o.id} className="p-4 flex items-center justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="size-9 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
                          <Truck className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold text-ink">
                              #{o.id.slice(-6).toUpperCase()}
                            </span>
                            <Badge className="bg-violet-100 text-violet-700 border-violet-200 border text-[10px]">
                              {o.status}
                            </Badge>
                          </div>
                          <div className="text-sm font-semibold text-ink mt-0.5 truncate">
                            {o.customer?.name ?? o.lead?.name ?? "Walk-in"}
                          </div>
                          <div className="text-xs text-stone mt-0.5">
                            {o.shippingCourier} · <span className="font-mono">{o.resiNumber}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-bold text-ink tabular-nums">
                          {formatRupiah(o.totalAmount)}
                        </div>
                        {o.status === "Dikirim" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs mt-1"
                            onClick={() => {
                              api(`/api/orders/${o.id}`, { method: "PATCH", json: { status: "Selesai" } })
                                .then(() => {
                                  queryClient.invalidateQueries({ queryKey: ["shipping", brandId] });
                                  queryClient.invalidateQueries({ queryKey: ["orders", brandId] });
                                  toast({ title: "Order selesai" });
                                });
                            }}
                          >
                            <CheckCircle2 className="size-3" /> Selesai
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          )}
        </div>
      )}
    </div>
  );
}
