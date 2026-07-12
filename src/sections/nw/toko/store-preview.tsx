"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ExternalLink, Store, MessageCircle, Copy, Check } from "lucide-react";
import { formatRupiah } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import type { Brand } from "@/lib/store";
import type { Product } from "@/sections/nw/toko/types";

export function StorePreview({ brand }: { brand: Brand }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const storeUrl = `usahaku.ai/t/${brand.slug}`;

  const { data } = useQuery<{ products: Product[] }>({
    queryKey: ["products", brand.id],
    queryFn: () => api(`/api/products?brandId=${brand.id}`),
    enabled: !!brand.id,
  });

  const products = (data?.products ?? []).filter((p) => p.isActive);

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

  function handleCopy() {
    navigator.clipboard.writeText(`https://${storeUrl}`);
    setCopied(true);
    toast({ title: "Link toko disalin", description: storeUrl });
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      {/* Compact single-row bar */}
      <div className="flex items-center gap-3 rounded-xl border border-teal/20 bg-teal-50/50 px-4 py-2.5">
        <div className="size-8 rounded-lg bg-teal text-white flex items-center justify-center shrink-0">
          <Store className="size-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-ink truncate">{brand.name}</span>
            <Badge variant="outline" className="bg-card/70 text-teal border-teal/30 text-[9px] h-4 py-0 shrink-0">
              Live
            </Badge>
          </div>
          <div className="text-xs text-stone font-mono truncate">{storeUrl}</div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 shrink-0 border-teal/30 text-teal hover:bg-teal-100"
          onClick={handleCopy}
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          <span className="text-xs">{copied ? "Tersalin" : "Salin"}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 shrink-0 text-stone hover:text-teal"
          onClick={() => setOpen(true)}
        >
          <ExternalLink className="size-3.5" />
        </Button>
      </div>

      {/* Preview dialog (simplified) */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-5 pt-5 pb-3 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-teal text-white flex items-center justify-center text-base font-bold">
                {brand.name.charAt(0)}
              </div>
              <div>
                <DialogTitle className="text-lg text-ink">{brand.name}</DialogTitle>
                <DialogDescription className="text-stone font-mono text-xs">{storeUrl}</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="px-5 py-3 overflow-y-auto flex-1">
            {brand.description && (
              <p className="text-sm text-stone mb-3 italic">"{brand.description}"</p>
            )}

            {products.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-2xl mb-1">📦</div>
                <div className="text-sm font-semibold text-ink">Belum ada produk</div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {products.map((p) => (
                  <div key={p.id} className="rounded-lg border border-border bg-card overflow-hidden">
                    <div className="aspect-square bg-cream-200 flex items-center justify-center">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} className="size-full object-cover" />
                      ) : (
                        <div className="text-2xl text-stone-300">📦</div>
                      )}
                    </div>
                    <div className="p-2">
                      <div className="text-xs font-semibold text-ink line-clamp-2 leading-snug">{p.name}</div>
                      <div className="text-xs font-bold text-teal-700 mt-0.5">{formatRupiah(p.price)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="px-5 py-3 border-t border-border flex items-center justify-between">
            <span className="text-xs text-stone">Simulasi chat masuk</span>
            <Button
              size="sm"
              className="bg-success hover:bg-success/90 gap-1.5"
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
              <MessageCircle className="size-3.5" /> Chat via WA
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
