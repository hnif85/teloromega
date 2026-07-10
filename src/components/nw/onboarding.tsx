"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CATEGORIES, TONES, type ToneKey } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAppStore } from "@/lib/store";
import { ArrowRight, ArrowLeft, Check, Store, Package, Sparkles } from "lucide-react";

export function OnboardingDialog() {
  const { onboardingOpen, setOnboardingOpen, addBrand, setSection } = useAppStore();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Brand form state
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [tone, setTone] = useState<ToneKey>("santai_ramah");

  // Product form state
  const [pType, setPType] = useState<"barang" | "jasa">("barang");
  const [pName, setPName] = useState("");
  const [pPrice, setPPrice] = useState("");
  const [pCost, setPCost] = useState("");
  const [pStock, setPStock] = useState("");
  const [pDesc, setPDesc] = useState("");

  async function submitBrand() {
    if (!name.trim()) {
      toast({ title: "Nama brand wajib diisi", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const r = await api<{ brand: any }>("/api/brands", {
        method: "POST",
        json: { name, category, description, toneOfVoice: tone },
      });
      addBrand({
        id: r.brand.id,
        name: r.brand.name,
        slug: r.brand.slug,
        logoUrl: r.brand.logoUrl,
        description: r.brand.description,
        category: r.brand.category,
        toneOfVoice: r.brand.toneOfVoice,
        isActive: r.brand.isActive,
      });
      toast({ title: "Brand dibuat", description: r.brand.name });
      setStep(1);
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function submitProduct(skip: boolean) {
    if (skip) {
      setStep(2);
      return;
    }
    if (!pName.trim() || !pPrice) {
      toast({ title: "Nama & harga wajib", variant: "destructive" });
      return;
    }
    const st = useAppStore.getState();
    if (!st.activeBrandId) {
      toast({ title: "Brand belum dipilih", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await api("/api/products", {
        method: "POST",
        json: {
          brandId: st.activeBrandId,
          type: pType,
          name: pName,
          price: Number(pPrice),
          costPrice: pCost ? Number(pCost) : null,
          stock: pType === "barang" && pStock ? Number(pStock) : null,
          description: pDesc,
        },
      });
      toast({ title: "Produk ditambahkan" });
      setStep(2);
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  function close() {
    setOnboardingOpen(false);
    setStep(0);
    setName("");
    setPName("");
    setPPrice("");
    setPCost("");
    setPStock("");
    setPDesc("");
  }

  return (
    <Dialog open={onboardingOpen} onOpenChange={(o) => (o ? setOnboardingOpen(true) : close())}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-xl">
            {step === 0 ? <Store className="size-5 text-teal" /> : step === 1 ? <Package className="size-5 text-teal" /> : <Sparkles className="size-5 text-teal" />}
            {step === 0 ? "Setup Brand" : step === 1 ? "Tambah Produk Pertama" : "Siap Mulai!"}
          </DialogTitle>
          <DialogDescription>
            {step === 0
              ? "Buat brand pertama kamu — ini jadi fondasi semua modul."
              : step === 1
                ? "Tambahkan produk barang/jasa. Bisa skip kalau mau nanti."
                : "Brand sudah siap. Yuk mulai eksplor platform."}
          </DialogDescription>
        </DialogHeader>

        {/* Step progress */}
        <div className="px-6 py-3 flex items-center gap-2 bg-cream-100/50 border-b border-border">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div
                className={cn(
                  "size-6 rounded-full flex items-center justify-center text-xs font-bold",
                  i < step ? "bg-teal text-white" : i === step ? "bg-teal text-white" : "bg-cream-300 text-stone"
                )}
              >
                {i < step ? <Check className="size-3.5" /> : i + 1}
              </div>
              {i < 2 && <div className={cn("h-0.5 flex-1 rounded", i < step ? "bg-teal" : "bg-cream-300")} />}
            </div>
          ))}
        </div>

        <div className="p-6">
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <Label className="mb-1.5">Nama brand *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Keripik Mbak Ani"
                  className="bg-cream-100"
                />
              </div>
              <div>
                <Label className="mb-1.5">Kategori usaha *</Label>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c}
                      onClick={() => setCategory(c)}
                      className={cn(
                        "px-3 py-2 rounded-lg text-sm font-medium border transition-colors",
                        category === c
                          ? "bg-teal text-white border-teal"
                          : "bg-card border-border hover:border-teal/40"
                      )}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="mb-1.5">Deskripsi singkat (opsional)</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Keripik pedas rumahan dengan resep keluarga..."
                  className="bg-cream-100 resize-none"
                  rows={2}
                />
              </div>
              <div>
                <Label className="mb-1.5">Tone of voice untuk konten</Label>
                <div className="grid grid-cols-3 gap-2">
                  {TONES.map((t) => (
                    <button
                      key={t.key}
                      onClick={() => setTone(t.key)}
                      className={cn(
                        "px-3 py-2 rounded-lg text-sm font-medium border transition-colors text-left",
                        tone === t.key
                          ? "bg-teal text-white border-teal"
                          : "bg-card border-border hover:border-teal/40"
                      )}
                    >
                      <div className="text-base leading-none mb-1">{t.icon}</div>
                      <div className="text-[11px]">{t.label}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={close}>
                  Nanti saja
                </Button>
                <Button onClick={submitBrand} disabled={loading || !name.trim()} className="bg-teal hover:bg-teal-600">
                  {loading ? "Menyimpan..." : "Lanjut"} <ArrowRight className="size-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPType("barang")}
                  className={cn(
                    "p-4 rounded-xl border text-left transition-colors",
                    pType === "barang" ? "bg-teal-100 border-teal" : "bg-card border-border hover:border-teal/40"
                  )}
                >
                  <div className="text-2xl mb-1">📦</div>
                  <div className="font-bold text-sm">Barang</div>
                  <div className="text-xs text-stone">Produk fisik dengan stok</div>
                </button>
                <button
                  onClick={() => setPType("jasa")}
                  className={cn(
                    "p-4 rounded-xl border text-left transition-colors",
                    pType === "jasa" ? "bg-teal-100 border-teal" : "bg-card border-border hover:border-teal/40"
                  )}
                >
                  <div className="text-2xl mb-1">💼</div>
                  <div className="font-bold text-sm">Jasa</div>
                  <div className="text-xs text-stone">Layanan tanpa stok</div>
                </button>
              </div>

              <div>
                <Label className="mb-1.5">Nama {pType === "barang" ? "Produk" : "Jasa"} *</Label>
                <Input
                  value={pName}
                  onChange={(e) => setPName(e.target.value)}
                  placeholder={pType === "barang" ? "Keripik Pedas Level 3" : "Paket Foto Produk UMKM"}
                  className="bg-cream-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1.5">Harga Jual (Rp) *</Label>
                  <Input
                    type="number"
                    value={pPrice}
                    onChange={(e) => setPPrice(e.target.value)}
                    placeholder="15000"
                    className="bg-cream-100 tabular-nums"
                  />
                </div>
                <div>
                  <Label className="mb-1.5">Harga Modal (Rp)</Label>
                  <Input
                    type="number"
                    value={pCost}
                    onChange={(e) => setPCost(e.target.value)}
                    placeholder="9000"
                    className="bg-cream-100 tabular-nums"
                  />
                </div>
              </div>

              {pType === "barang" && (
                <div>
                  <Label className="mb-1.5">Stok awal</Label>
                  <Input
                    type="number"
                    value={pStock}
                    onChange={(e) => setPStock(e.target.value)}
                    placeholder="50"
                    className="bg-cream-100 tabular-nums"
                  />
                </div>
              )}

              <div>
                <Label className="mb-1.5">Deskripsi (opsional)</Label>
                <Textarea
                  value={pDesc}
                  onChange={(e) => setPDesc(e.target.value)}
                  placeholder="Bantu AI generate konten yang lebih relevan..."
                  className="bg-cream-100 resize-none"
                  rows={2}
                />
              </div>

              <div className="flex justify-between gap-2 pt-2">
                <Button variant="ghost" onClick={() => setStep(0)}>
                  <ArrowLeft className="size-4 mr-1" /> Kembali
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => submitProduct(true)}>
                    Skip
                  </Button>
                  <Button
                    onClick={() => submitProduct(false)}
                    disabled={loading || !pName.trim() || !pPrice}
                    className="bg-teal hover:bg-teal-600"
                  >
                    {loading ? "Menyimpan..." : "Simpan & Lanjut"} <ArrowRight className="size-4 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="text-center py-4 space-y-4">
              <div className="size-16 rounded-2xl bg-teal-100 text-teal flex items-center justify-center text-3xl mx-auto">
                🎉
              </div>
              <div>
                <h3 className="text-lg font-bold text-ink">Brand siap digunakan!</h3>
                <p className="text-sm text-stone mt-1 max-w-md mx-auto">
                  Kamu bisa langsung mulai riset pasar, bikin konten, atur toko, atau lihat dashboard.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 max-w-md mx-auto">
                <Button
                  variant="outline"
                  onClick={() => {
                    close();
                    setSection("riset");
                  }}
                >
                  🔍 Mulai Riset
                </Button>
                <Button
                  className="bg-teal hover:bg-teal-600"
                  onClick={() => {
                    close();
                    setSection("beranda");
                  }}
                >
                  📊 Ke Dashboard
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
