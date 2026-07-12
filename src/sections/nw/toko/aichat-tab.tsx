"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAppStore, type SessionUser } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionCard, EmptyState } from "@/components/nw/primitives";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Copy, Wand2, FileText, Package, ShoppingCart, ShieldCheck } from "lucide-react";
import type { InboxTemplate } from "@/sections/nw/toko/types";

export function AiChatTab({
  brandId,
  user,
}: {
  brandId: string;
  user: SessionUser | null;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const setCredit = useAppStore((s) => s.setCredit);

  const [inputText, setInputText] = useState("");
  const [result, setResult] = useState("");

  const { data, isLoading } = useQuery<{ templates: InboxTemplate[] }>({
    queryKey: ["inbox-templates"],
    queryFn: () => api(`/api/inbox/templates`),
  });
  const templates = data?.templates ?? [];

  const generateMutation = useMutation({
    mutationFn: (variables: { messageText: string }) =>
      api<{ reply: string; creditBalanceAfter: number }>(`/api/inbox/ai-reply`, {
        method: "POST",
        json: { brandId, messageText: variables.messageText },
      }),
    onSuccess: (res) => {
      setCredit(res.creditBalanceAfter);
      setResult(res.reply);
      toast({ title: "Draf AI dibuat ✨" });
    },
    onError: (e: Error) => toast({ title: "Gagal", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Generator */}
      <div className="lg:col-span-2 space-y-4">
        <SectionCard
          title="AI Reply Generator"
          desc="Generate balasan WhatsApp dengan konteks brand, produk & order"
          right={<Badge className="bg-teal-100 text-teal-700 border-teal-200 border">1 credit</Badge>}
        >
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-semibold text-ink mb-1.5 block">
                Pesan dari pelanggan
              </Label>
              <Textarea
                placeholder="Contoh: Kak, ini produk X masih ready? Harganya berapa ya? Atau: pesanan saya sampai mana?"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="min-h-[120px] text-sm"
              />
            </div>

            <Button
              className="w-full bg-teal hover:bg-teal-600"
              disabled={!inputText.trim() || generateMutation.isPending}
              onClick={() => generateMutation.mutate({ messageText: inputText })}
            >
              <Wand2 className="size-4" />
              {generateMutation.isPending ? "AI sedang menyusun…" : "Generate Balasan AI"}
            </Button>

            {result && (
              <div className="rounded-xl border border-teal/30 bg-teal-50/40 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-teal-700 flex items-center gap-1">
                    <Sparkles className="size-3" /> Draf AI
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      navigator.clipboard.writeText(result);
                      toast({ title: "Disalin ke clipboard" });
                    }}
                  >
                    <Copy className="size-3" /> Salin
                  </Button>
                </div>
                <Textarea
                  value={result}
                  onChange={(e) => setResult(e.target.value)}
                  className="bg-card min-h-[100px] text-sm"
                />
              </div>
            )}

            <div className="text-[10px] text-stone flex items-center gap-1">
              <Sparkles className="size-3 text-teal" />
              Sisa credit: <span className="font-semibold text-ink">{user?.creditBalance ?? 0}</span>
            </div>
          </div>
        </SectionCard>

        {/* Templates */}
        <SectionCard
          title="Template Respons Cepat"
          desc="Salin template populer untuk reply instan"
          right={<Badge variant="outline" className="text-[10px]">{templates.length} template</Badge>}
        >
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
            </div>
          ) : templates.length === 0 ? (
            <EmptyState icon="📋" title="Belum ada template" desc="Template akan muncul otomatis." />
          ) : (
            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {templates.map((t) => (
                <div
                  key={t.id}
                  className="rounded-xl border border-border bg-card p-3 hover:border-teal/30 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{t.icon}</span>
                      <span className="text-sm font-semibold text-ink">{t.label}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        navigator.clipboard.writeText(t.body);
                        toast({ title: `Template "${t.label}" disalin` });
                      }}
                    >
                      <Copy className="size-3" /> Salin
                    </Button>
                  </div>
                  <div className="text-xs text-stone bg-cream-100/60 rounded-lg p-2 leading-relaxed">
                    {t.body}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Sidebar: Context Info */}
      <div className="space-y-4">
        <SectionCard title="🧠 AI Mengetahui">
          <ul className="space-y-3 text-xs">
            <li className="flex items-start gap-2">
              <Package className="size-3.5 text-teal mt-0.5 shrink-0" />
              <div>
                <div className="font-semibold text-ink">Katalog Produk</div>
                <div className="text-stone mt-0.5">Nama, harga, promo, stok, deskripsi — AI paham produk kamu</div>
              </div>
            </li>
            <li className="flex items-start gap-2">
              <ShoppingCart className="size-3.5 text-teal mt-0.5 shrink-0" />
              <div>
                <div className="font-semibold text-ink">Status Order</div>
                <div className="text-stone mt-0.5">5 order terbaru — AI bisa cek status pesanan pelanggan</div>
              </div>
            </li>
            <li className="flex items-start gap-2">
              <ShieldCheck className="size-3.5 text-teal mt-0.5 shrink-0" />
              <div>
                <div className="font-semibold text-ink">Punya Guardrails</div>
                <div className="text-stone mt-0.5">Tidak ngasal janji, tidak minta data sensitif, tetap sopan</div>
              </div>
            </li>
          </ul>
        </SectionCard>

        <SectionCard title="💡 Contoh Prompt">
          <div className="space-y-2 text-xs">
            <button
              className="w-full text-left p-2 rounded-lg bg-cream-100/60 hover:bg-cream-100 text-stone transition-colors"
              onClick={() => setInputText("Kak, produk A masih ready? Harganya berapa?")}
            >
              "Produk A masih ready? Harganya?"
            </button>
            <button
              className="w-full text-left p-2 rounded-lg bg-cream-100/60 hover:bg-cream-100 text-stone transition-colors"
              onClick={() => setInputText("Pesanan saya sampai mana ya? Saya sudah transfer kemarin")}
            >
              "Pesanan saya sampai mana?"
            </button>
            <button
              className="w-full text-left p-2 rounded-lg bg-cream-100/60 hover:bg-cream-100 text-stone transition-colors"
              onClick={() => setInputText("Saya mau pesan produk B 2 pcs, bagaimana caranya?")}
            >
              "Mau pesan produk B 2 pcs"
            </button>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
