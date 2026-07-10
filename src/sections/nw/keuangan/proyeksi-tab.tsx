"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SectionCard, EmptyState } from "@/components/nw/primitives";
import {
  Sparkles,
  Zap,
  TrendingUp,
  Calculator,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileText,
  PiggyBank,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { formatRupiah, formatRupiahShort, timeAgo } from "@/lib/constants";
import type { KeuanganContextRow, ProjectionResponse } from "./types";

interface ProductLite {
  id: string;
  name: string;
  price: number;
  costPrice: number | null;
}

function toNum(v: number | string | null | undefined): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  const n = Number(String(v).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function ProyeksiTab({ brandId }: { brandId: string }) {
  const qc = useQueryClient();
  const { setCredit, user } = useAppStore();
  const [selectedContextId, setSelectedContextId] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string>("none");
  const [projection, setProjection] = useState<ProjectionResponse | null>(null);
  const [budgetOpen, setBudgetOpen] = useState(false);

  const { data: ctxData, isLoading: ctxLoading } = useQuery<{ contexts: KeuanganContextRow[] }>({
    queryKey: ["keuangan-contexts", brandId],
    queryFn: () => api(`/api/keuangan/contexts?brandId=${brandId}`),
    enabled: !!brandId,
  });
  const contexts = ctxData?.contexts ?? [];

  const { data: productsData } = useQuery<{ products: ProductLite[] }>({
    queryKey: ["keuangan-products-proj", brandId],
    queryFn: () => api(`/api/products?brandId=${brandId}`),
    enabled: !!brandId,
  });
  const products = productsData?.products ?? [];

  const selectedContext = contexts.find((c) => c.id === selectedContextId) ?? null;
  const selectedProduct = products.find((p) => p.id === selectedProductId) ?? null;

  const runProj = useMutation({
    mutationFn: () =>
      api<ProjectionResponse>("/api/keuangan/projection", {
        method: "POST",
        json: {
          brandId,
          contextId: selectedContextId,
          productId: selectedProductId !== "none" ? selectedProductId : null,
        },
      }),
    onSuccess: (data) => {
      setProjection(data);
      setCredit(data.charged.balanceAfter);
      qc.invalidateQueries({ queryKey: ["keuangan-contexts"] });
      toast.success("Proyeksi dihitung · 3 credit dipakai");
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Gagal menghitung proyeksi");
    },
  });

  return (
    <div className="space-y-4">
      {/* Credit info banner */}
      <div className="rounded-2xl bg-gradient-to-r from-teal-100 to-orange-100/40 border border-teal/20 p-4 flex items-start gap-3">
        <div className="size-10 rounded-xl bg-teal text-white flex items-center justify-center shrink-0">
          <Sparkles className="size-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-ink flex items-center gap-2 flex-wrap">
            Proyeksi dari Context Riset
            <Badge className="bg-amber-100 text-amber-700 border-amber-200 border">
              <Zap className="size-3" /> 3 credit
            </Badge>
          </div>
          <p className="text-sm text-ink-500 mt-1">
            Setiap konteks riset keuangan berisi proyeksi margin & skenario. Pilih konteks untuk
            menghitung proyeksi detail + analisis LLM. Credit kamu: <b>{user?.creditBalance ?? 0}</b>
          </p>
        </div>
      </div>

      {/* Context list + selected */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Context list */}
        <SectionCard
          title="Konteks Riset Keuangan"
          desc="Pilih konteks untuk proyeksi"
          className="lg:col-span-1"
          bodyClassName="p-0"
        >
          {ctxLoading ? (
            <div className="p-3 space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : contexts.length === 0 ? (
            <div className="p-6 text-center">
              <FileText className="size-8 text-stone mx-auto mb-2" />
              <p className="text-sm font-semibold text-ink">Belum ada konteks keuangan</p>
              <p className="text-xs text-stone mt-1">
                Jalankan riset dengan intent pricing untuk generate context proyeksi margin.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border max-h-[520px] overflow-y-auto">
              {contexts.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setSelectedContextId(c.id);
                    setProjection(null);
                  }}
                  className={`w-full text-left px-4 py-3 hover:bg-cream-100/50 transition-colors ${
                    selectedContextId === c.id ? "bg-teal-50 border-l-2 border-teal" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-ink truncate">{c.skenario}</div>
                      <div className="text-[11px] text-stone truncate mt-0.5">
                        {c.researchQuery || "Riset keuangan"}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {c.used && (
                          <Badge className="bg-stone-100 text-stone-600 border-stone-200 border text-[10px]">
                            Sudah dipakai ×{c.usedCount}
                          </Badge>
                        )}
                        <span className="text-[10px] text-stone">{timeAgo(c.createdAt)}</span>
                      </div>
                    </div>
                    <ArrowRight className="size-4 text-stone shrink-0 mt-1" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Projection panel */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedContext ? (
            <SectionCard>
              <EmptyState
                icon="👈"
                title="Pilih konteks riset"
                desc="Pilih satu konteks di panel kiri untuk mulai menghitung proyeksi margin."
              />
            </SectionCard>
          ) : (
            <>
              {/* Context detail card */}
              <SectionCard
                title={selectedContext.skenario}
                desc={`Dari riset: ${selectedContext.researchQuery || "—"} · ${timeAgo(selectedContext.createdAt)}`}
                right={
                  selectedContext.used ? (
                    <Badge className="bg-stone-100 text-stone-600 border-stone-200 border">
                      Dipakai ×{selectedContext.usedCount}
                    </Badge>
                  ) : (
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 border">
                      Baru
                    </Badge>
                  )
                }
              >
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  <CtxStat
                    label="Asumsi Modal"
                    value={selectedContext.asumsiModal != null ? formatRupiah(toNum(selectedContext.asumsiModal)) : "—"}
                  />
                  <CtxStat
                    label="Margin Sebelum"
                    value={
                      selectedContext.marginSebelum != null
                        ? formatRupiah(toNum(selectedContext.marginSebelum))
                        : "—"
                    }
                  />
                  <CtxStat
                    label="Margin Sesudah"
                    value={
                      selectedContext.marginSesudah != null
                        ? formatRupiah(toNum(selectedContext.marginSesudah))
                        : "—"
                    }
                    highlight
                  />
                </div>

                {/* Product selector */}
                <div className="rounded-xl border border-border bg-cream-100/40 p-3 mb-3">
                  <Label className="mb-1.5">Pilih Produk (opsional — pakai costPrice aktual)</Label>
                  <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                    <SelectTrigger className="w-full h-9" size="sm">
                      <SelectValue placeholder="Pilih produk" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Tidak pakai produk —</SelectItem>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} — {formatRupiah(p.price)}
                          {p.costPrice == null ? " (modal belum diisi)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedProduct && (
                    <div className="text-[11px] text-stone mt-2 space-y-0.5">
                      <div>
                        Harga jual: <b className="text-ink">{formatRupiah(selectedProduct.price)}</b>
                      </div>
                      <div>
                        Harga modal:{" "}
                        <b className={selectedProduct.costPrice == null ? "text-amber-600" : "text-ink"}>
                          {selectedProduct.costPrice != null
                            ? formatRupiah(selectedProduct.costPrice)
                            : "belum diisi"}
                        </b>
                      </div>
                    </div>
                  )}
                </div>

                <Button
                  className="w-full bg-teal hover:bg-teal-600"
                  onClick={() => runProj.mutate()}
                  disabled={runProj.isPending}
                >
                  {runProj.isPending ? (
                    <>
                      <Sparkles className="size-4 animate-pulse" /> Menghitung proyeksi...
                    </>
                  ) : (
                    <>
                      <Zap className="size-4 fill-amber-300 text-amber-400" /> Lihat Proyeksi (3 credit)
                    </>
                  )}
                </Button>
              </SectionCard>

              {/* Projection result */}
              {projection && <ProjectionCard data={projection} onCatatBudget={() => setBudgetOpen(true)} />}
            </>
          )}
        </div>
      </div>

      {/* Catat budget dialog */}
      <Dialog open={budgetOpen} onOpenChange={setBudgetOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <CatatBudgetForm
            brandId={brandId}
            suggestion={projection?.projection ?? null}
            onClose={() => setBudgetOpen(false)}
            onCreated={() => {
              qc.invalidateQueries({ queryKey: ["keuangan-operational-costs"] });
              qc.invalidateQueries({ queryKey: ["keuangan-transactions"] });
              qc.invalidateQueries({ queryKey: ["keuangan-summary"] });
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CtxStat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className={`rounded-lg border p-2.5 ${
        highlight ? "border-teal-300 bg-teal-50" : "border-border bg-background"
      }`}
    >
      <div className="text-[11px] text-stone">{label}</div>
      <div className={`text-sm font-extrabold tabular-nums mt-0.5 ${highlight ? "text-teal-700" : "text-ink"}`}>
        {value}
      </div>
    </div>
  );
}

function ProjectionCard({
  data,
  onCatatBudget,
}: {
  data: ProjectionResponse;
  onCatatBudget: () => void;
}) {
  const p = data.projection;
  const maxBar = Math.max(toNum(p.marginSebelum), toNum(p.marginSesudah), 1);

  return (
    <SectionCard
      title="📊 Hasil Proyeksi"
      desc={`Dihitung pada ${new Date(data.createdAt).toLocaleString("id-ID")}`}
      right={
        <Button size="sm" variant="outline" className="h-8 border-teal-300 text-teal-700 hover:bg-teal-50" onClick={onCatatBudget}>
          <PiggyBank className="size-3.5" /> Catat Budget
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Margin comparison bar */}
        <div>
          <div className="text-xs font-semibold text-ink mb-2 flex items-center gap-1.5">
            <TrendingUp className="size-3.5 text-teal" /> Margin Sebelum vs Sesudah
          </div>
          <div className="space-y-2">
            <MarginBar
              label="Sebelum"
              value={toNum(p.marginSebelum)}
              max={maxBar}
              color="bg-stone-300"
            />
            <MarginBar
              label="Sesudah"
              value={toNum(p.marginSesudah)}
              max={maxBar}
              color="bg-teal"
              highlight
            />
          </div>
        </div>

        {/* Product margin + break-even */}
        {p.product && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <MiniStat label="Harga Jual" value={formatRupiahShort(p.product.price)} />
            <MiniStat
              label="Harga Modal"
              value={p.product.costPrice != null ? formatRupiahShort(p.product.costPrice) : "—"}
            />
            <MiniStat
              label="Margin / Unit"
              value={formatRupiahShort(p.product.currentMargin)}
              tone="teal"
            />
            <MiniStat label="Margin %" value={`${p.product.currentMarginPct}%`} tone="emerald" />
          </div>
        )}

        {/* Break-even */}
        {p.breakEven && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 flex items-start gap-3">
            <Calculator className="size-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-amber-800">Break-Even Volume</div>
              <div className="text-xs text-amber-700 mt-0.5">
                <b className="text-base">{p.breakEven.volume} unit/bulan</b> untuk menutup biaya tetap{" "}
                {formatRupiah(p.breakEven.fixedCostMonthly)} dengan margin{" "}
                {formatRupiah(p.breakEven.marginPerUnit)}/unit.
              </div>
            </div>
          </div>
        )}

        {/* Estimasi volume change */}
        {p.estimasiVolumeChange != null && (
          <div className="rounded-lg border border-border bg-background px-3 py-2 flex items-center justify-between">
            <span className="text-xs text-stone">Estimasi Volume Change</span>
            <span className="text-sm font-bold text-ink">{String(p.estimasiVolumeChange)}</span>
          </div>
        )}

        {/* LLM narrative */}
        {p.narasi && (
          <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-3">
            <div className="text-xs font-bold text-teal-700 mb-1 flex items-center gap-1.5">
              <Sparkles className="size-3.5" /> Analisis AI
            </div>
            <p className="text-sm text-ink-700 leading-relaxed">{p.narasi}</p>
          </div>
        )}

        {/* Recommendation */}
        {p.rekomendasiTindakan && (
          <div className="rounded-xl border border-border bg-cream-100/40 p-3">
            <div className="text-xs font-bold text-ink mb-1 flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-emerald-600" /> Rekomendasi Tindakan
            </div>
            <p className="text-sm text-ink-700 leading-relaxed">{p.rekomendasiTindakan}</p>
          </div>
        )}

        {/* Risks */}
        {p.risiko.length > 0 && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
            <div className="text-xs font-bold text-rose-700 mb-1.5 flex items-center gap-1.5">
              <AlertTriangle className="size-3.5" /> Risiko yang Perlu Dipantau
            </div>
            <ul className="space-y-1">
              {p.risiko.map((r, i) => (
                <li key={i} className="text-xs text-rose-700 flex items-start gap-1.5">
                  <span className="mt-0.5">•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Rekomendasi context as fallback */}
        {p.rekomendasiContext && !p.rekomendasiTindakan && (
          <div className="text-xs text-stone italic">Catatan context: {p.rekomendasiContext}</div>
        )}
      </div>
    </SectionCard>
  );
}

function MarginBar({
  label,
  value,
  max,
  color,
  highlight,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  highlight?: boolean;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className={`font-medium ${highlight ? "text-teal-700" : "text-stone"}`}>{label}</span>
        <span className={`font-bold tabular-nums ${highlight ? "text-teal-700" : "text-ink"}`}>
          {formatRupiah(value)}
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-cream-200 overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "teal" | "emerald";
}) {
  const toneCls =
    tone === "teal"
      ? "text-teal-700"
      : tone === "emerald"
      ? "text-emerald-700"
      : "text-ink";
  return (
    <div className="rounded-lg border border-border bg-background p-2">
      <div className="text-[10px] text-stone">{label}</div>
      <div className={`text-sm font-bold tabular-nums mt-0.5 ${toneCls}`}>{value}</div>
    </div>
  );
}

function CatatBudgetForm({
  brandId,
  suggestion,
  onClose,
  onCreated,
}: {
  brandId: string;
  suggestion: ProjectionResponse["projection"] | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [category, setCategory] = useState("Marketing");
  const [amount, setAmount] = useState<string>(
    suggestion?.asumsiModal ? String(toNum(suggestion.asumsiModal)) : ""
  );
  const [recurring, setRecurring] = useState(true);
  const [description, setDescription] = useState(
    suggestion ? `Budget untuk skenario: ${suggestion.skenario}` : ""
  );
  const [saving, setSaving] = useState(false);

  async function submit() {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error("Jumlah harus > 0");
      return;
    }
    setSaving(true);
    try {
      await api("/api/operational-costs", {
        method: "POST",
        json: {
          brandId,
          category,
          amount: amt,
          recurring,
          description: description.trim() || null,
        },
      });
      toast.success("Budget dicatat sebagai biaya operasional");
      onCreated();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <PiggyBank className="size-4 text-teal" /> Catat sebagai Budget
        </DialogTitle>
        <DialogDescription>
          Catat asumsi modal / budget dari proyeksi sebagai biaya operasional berulang.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-3 py-2">
        <div>
          <Label className="mb-1.5">Kategori</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full h-9" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["Sewa", "Listrik & Air", "Internet", "Gaji", "Marketing", "Transport", "Pajak", "Pemeliharaan", "Lainnya"].map(
                (c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1.5">Jumlah (Rp)</Label>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="h-9 text-base font-bold"
          />
        </div>
        <div>
          <Label className="mb-1.5">Deskripsi</Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="h-9"
          />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
          <div className="text-sm font-medium text-ink">Rutin (bulanan)</div>
          <Switch checked={recurring} onCheckedChange={setRecurring} />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={saving}>
          Batal
        </Button>
        <Button className="bg-teal hover:bg-teal-600" onClick={submit} disabled={saving}>
          {saving ? "Menyimpan..." : "Catat Budget"}
        </Button>
      </DialogFooter>
    </>
  );
}
