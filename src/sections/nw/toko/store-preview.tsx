"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ExternalLink, Store, MessageCircle, ShoppingCart } from "lucide-react";
import { formatRupiah, slugify } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import type { Brand } from "@/lib/store";
import type { Product } from "@/sections/nw/toko/types";
import { useAppStore } from "@/lib/store";

export function StorePreview({ brand }: { brand: Brand }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const setCredit = useAppStore((s) => s.setCredit);

  const storeUrl = `tokoku.usahaku.ai/${brand.slug}`;

  const { data, isLoading } = useQuery<{ products: Product[] }>({
    queryKey: ["products", brand.id],
    queryFn: () => api(`/api/products?brandId=${brand.id}`),
    enabled: !!brand.id,
  });

  const products = (data?.products ?? []).filter((p) => p.isActive);

  // "Chat via WA" in store preview → simulate inbound lead creation
  const inboundMutation = useMutation({
    mutationFn: (variables: { fromName: string; fromNumber: string; messageText: string }) =>
      api(`/api/inbox`, {
        method: "POST",
        json: {
          brandId: brand.id,
          channel: "wa",
          fromNumber: variables.fromNumber,
          fromName: variables.fromName,
          messageText: variables.messageText,
        },
      }),
    onSuccess: () => {
      toast({ title: "Chat masuk", description: "Pesan masuk dari calon pembeli ditambahkan ke inbox." });
      queryClient.invalidateQueries({ queryKey: ["inbox", brand.id] });
    },
    onError: (e: Error) => toast({ title: "Gagal", description: e.message, variant: "destructive" }),
  });

  const totalStock = products
    .filter((p) => p.type === "barang")
    .reduce((acc, p) => acc + (p.stock ?? 0), 0);

  return (
    <Card className="overflow-hidden border-teal/20 bg-gradient-to-br from-teal-100/60 via-cream-100 to-orange-100/30">
      <div className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex items-start gap-3 min-w-0">
          <div className="size-12 rounded-xl bg-teal text-white flex items-center justify-center shrink-0">
            <Store className="size-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-ink truncate">Toko Online · {brand.name}</h3>
              <Badge variant="outline" className="bg-card/70 text-teal border-teal/30 text-[10px]">
                Live
              </Badge>
            </div>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setOpen(true);
              }}
              className="text-sm text-teal-700 hover:underline mt-1 inline-flex items-center gap-1 font-mono"
            >
              {storeUrl} <ExternalLink className="size-3" />
            </a>
            <p className="text-xs text-stone mt-1">
              {products.length} produk aktif · {totalStock} total stok · Brand {brand.category}
            </p>
          </div>
        </div>
        <Button className="bg-teal hover:bg-teal-600 shrink-0" onClick={() => setOpen(true)}>
          <ExternalLink className="size-4 mr-1.5" /> Lihat Toko
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border bg-gradient-to-r from-teal-50 to-orange-50/50">
            <div className="flex items-center gap-3">
              <div className="size-12 rounded-xl bg-teal text-white flex items-center justify-center text-lg font-bold">
                {brand.name.charAt(0)}
              </div>
              <div>
                <DialogTitle className="text-xl text-ink">{brand.name}</DialogTitle>
                <DialogDescription className="text-stone font-mono text-xs">
                  {storeUrl}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="px-6 py-4 overflow-y-auto flex-1">
            {brand.description && (
              <p className="text-sm text-stone mb-4 italic">"{brand.description}"</p>
            )}

            {isLoading ? (
              <div className="text-center py-10 text-sm text-stone">Memuat katalog…</div>
            ) : products.length === 0 ? (
              <div className="text-center py-10">
                <div className="text-3xl mb-2">📦</div>
                <div className="text-sm font-semibold text-ink">Belum ada produk</div>
                <p className="text-xs text-stone mt-1">
                  Tambahkan produk di Pengaturan untuk mulai berjualan.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {products.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-xl border border-border bg-card overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="aspect-square bg-cream-200 flex items-center justify-center">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} className="size-full object-cover" />
                      ) : (
                        <div className="text-3xl text-stone-300">📦</div>
                      )}
                    </div>
                    <div className="p-3">
                      <div className="flex items-center gap-1 mb-1">
                        <Badge
                          variant="outline"
                          className={
                            p.type === "barang"
                              ? "text-[9px] py-0 h-4 bg-teal-50 text-teal-700 border-teal/30"
                              : "text-[9px] py-0 h-4 bg-orange-50 text-orange-700 border-orange/30"
                          }
                        >
                          {p.type === "barang" ? "Barang" : "Jasa"}
                        </Badge>
                        {p.type === "barang" && p.stock != null && p.stock <= (p.minStock ?? 0) && (
                          <Badge variant="outline" className="text-[9px] py-0 h-4 bg-amber-50 text-amber-700 border-amber/30">
                            Stok tipis
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm font-semibold text-ink line-clamp-2 leading-snug">
                        {p.name}
                      </div>
                      <div className="text-sm font-bold text-teal-700 mt-1">
                        {formatRupiah(p.price)}
                      </div>
                      {p.type === "barang" && p.stock != null && (
                        <div className="text-[10px] text-stone mt-0.5">Stok: {p.stock}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-border bg-cream-100/60 flex items-center justify-between gap-2">
            <div className="text-xs text-stone">
              Simulasi: chat masuk otomatis dibuat sebagai lead baru
            </div>
            <Button
              className="bg-success hover:bg-success/90"
              size="sm"
              onClick={() => {
                inboundMutation.mutate({
                  fromName: `Pembeli Demo ${Math.floor(Math.random() * 1000)}`,
                  fromNumber: `628${Math.floor(100000000 + Math.random() * 899999999)}`,
                  messageText: `Halo kak, saya tertarik dengan produk di ${brand.name}. Boleh info lebih lanjut?`,
                });
                setOpen(false);
              }}
              disabled={inboundMutation.isPending}
            >
              <MessageCircle className="size-4 mr-1.5" /> Chat via WA
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
