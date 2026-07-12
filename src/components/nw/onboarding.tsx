"use client";

import { useState, useEffect } from "react";
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
import { CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAppStore, getActiveBrand } from "@/lib/store";
import { ArrowRight, ArrowLeft, Check, Store, Package, Sparkles, Pencil } from "lucide-react";

export function OnboardingDialog() {
  const { onboardingOpen, setOnboardingOpen, addBrand, updateBrand, setSection, user, completeOnboarding, onboardingStep, brands, activeBrandId } = useAppStore();
  const [step, setStep] = useState(onboardingStep);
  const [loading, setLoading] = useState(false);
  const [editingBrand, setEditingBrand] = useState(false);
  const { toast } = useToast();

  // Re-sync step when dialog opens
  useEffect(() => {
    if (onboardingOpen) {
      setStep(onboardingStep);
      setEditingBrand(false);
    }
  }, [onboardingOpen]);

  // Brand form
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [description, setDescription] = useState("");

  // Product form
  const [pType, setPType] = useState<"barang" | "jasa">("barang");
  const [pName, setPName] = useState("");
  const [pPrice, setPPrice] = useState("");
  const [pCost, setPCost] = useState("");
  const [pStock, setPStock] = useState("");
  const [pDesc, setPDesc] = useState("");

  const steps = [
    { label: "Halo!", icon: "👋" },
    { label: "Brand", icon: "🏪" },
    { label: "Produk", icon: "📦" },
    { label: "Siap!", icon: "🚀" },
  ];

  const existingBrand = brands.length > 0 ? brands[0] : null;

  // Pre-fill brand form when entering edit mode
  function startEditBrand() {
    if (existingBrand) {
      setName(existingBrand.name);
      setCategory(existingBrand.category);
      setDescription(existingBrand.description || "");
    }
    setEditingBrand(true);
  }

  function cancelEditBrand() {
    setEditingBrand(false);
    setName("");
    setCategory(CATEGORIES[0]);
    setDescription("");
  }

  async function saveBrandEdit() {
    if (!name.trim()) {
      toast({ title: "Nama brand wajib diisi", variant: "destructive" });
      return;
    }
    if (!existingBrand) return;
    setLoading(true);
    try {
      const r = await api<{ brand: any }>(`/api/brands/${existingBrand.id}`, {
        method: "PATCH",
        json: { name: name.trim(), category, description: description.trim() },
      });
      updateBrand({
        id: r.brand.id,
        name: r.brand.name,
        slug: r.brand.slug,
        logoUrl: r.brand.logoUrl,
        description: r.brand.description,
        category: r.brand.category,
        toneOfVoice: r.brand.toneOfVoice,
        isActive: r.brand.isActive,
      });
      toast({ title: "Brand diperbarui!", description: r.brand.name });
      setEditingBrand(false);
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function submitBrand() {
    if (!name.trim()) {
      toast({ title: "Nama brand wajib diisi", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const st = useAppStore.getState();
      // If brand already exists (resuming onboarding), just advance
      if (st.brands.length > 0 && st.activeBrandId) {
        setStep(2);
        return;
      }
      const r = await api<{ brand: any }>("/api/brands", {
        method: "POST",
        json: { name: name.trim(), category, description: description.trim() },
      });
      // skipOnboardingClose = true supaya dialog tetap terbuka
      addBrand({
        id: r.brand.id,
        name: r.brand.name,
        slug: r.brand.slug,
        logoUrl: r.brand.logoUrl,
        description: r.brand.description,
        category: r.brand.category,
        toneOfVoice: r.brand.toneOfVoice,
        isActive: r.brand.isActive,
      }, true);
      toast({ title: "Brand dibuat!", description: r.brand.name });
      setStep(2); // langsung ke produk
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function submitProduct(skip: boolean) {
    if (skip) {
      await finishOnboarding();
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
          name: pName.trim(),
          price: Number(pPrice),
          costPrice: pCost ? Number(pCost) : null,
          stock: pType === "barang" && pStock ? Number(pStock) : null,
          description: pDesc.trim() || null,
        },
      });
      toast({ title: "Produk ditambahkan!" });
      await finishOnboarding();
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function finishOnboarding() {
    setLoading(true);
    try {
      await api("/api/user", { method: "PATCH", json: { isOnboarded: true } });
    } catch {
      // ignore — still let the user into the app even if the flag update fails
    }
    completeOnboarding();
    setOnboardingOpen(false);

    // Research-first onboarding: if this brand has no research yet, drop the
    // user straight into Riset so they start there (Konten/Toko/Keuangan all
    // draw on research context). Only fall back to Beranda once research exists.
    const st = useAppStore.getState();
    let goToRiset = true;
    if (st.activeBrandId) {
      try {
        const res = await api<{ research: unknown[] }>(`/api/research?brandId=${st.activeBrandId}`);
        goToRiset = !res.research || res.research.length === 0;
      } catch {
        goToRiset = true;
      }
    }

    if (goToRiset) {
      setSection("riset");
      toast({ title: "Semua siap! 🚀", description: "Yuk mulai dengan riset pasar dulu — biar AI paham bisnismu." });
    } else {
      setSection("beranda");
      toast({ title: "Semua siap! 🚀", description: "Selamat datang di usahaku.ai. Yuk eksplor fitur-fiturnya!" });
    }

    setLoading(false);
    resetForm();
  }

  function close() {
    setOnboardingOpen(false);
    resetForm();
  }

  function resetForm() {
    setStep(0);
    setEditingBrand(false);
    setName("");
    setCategory(CATEGORIES[0]);
    setDescription("");
    setPName("");
    setPPrice("");
    setPCost("");
    setPStock("");
    setPDesc("");
  }

  return (
    <Dialog open={onboardingOpen} onOpenChange={(o) => (!o ? close() : null)}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-xl">
            {step === 0 ? "👋" : step === 1 ? <Store className="size-5 text-teal" /> : step === 2 ? <Package className="size-5 text-teal" /> : <Sparkles className="size-5 text-teal" />}
            {steps[step].label}
          </DialogTitle>
          <DialogDescription>
            {step === 0 && `Halo, ${user?.name || "Sobat UMKM"}! Yuk kita setup akun kamu.`}
            {step === 1 && !existingBrand && "Bikin brand pertama — ini fondasi semua modul usahaku.ai."}
            {step === 1 && existingBrand && !editingBrand && "Brand kamu sudah siap. Lanjut tambah produk atau edit dulu."}
            {step === 1 && existingBrand && editingBrand && "Edit brand kamu di bawah."}
            {step === 2 && "Tambahkan produk atau jasa pertama kamu. Bisa skip dan diisi nanti."}
            {step === 3 && "Semua siap! Kamu bisa langsung eksplor fitur usahaku.ai."}
          </DialogDescription>
        </DialogHeader>

        {/* Step progress */}
        <div className="px-6 py-3 flex items-center gap-1 bg-cream-100/50 border-b border-border">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-1 flex-1">
              <div className={cn(
                "size-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                i < step ? "bg-teal text-white" : i === step ? "bg-teal text-white ring-2 ring-teal/30" : "bg-cream-300 text-stone"
              )}>
                {i < step ? <Check className="size-3.5" /> : <span className="text-[10px]">{s.icon}</span>}
              </div>
              {i < steps.length - 1 && <div className={cn("h-0.5 flex-1 rounded", i < step ? "bg-teal" : "bg-cream-300")} />}
            </div>
          ))}
        </div>

        <div className="p-6">
          {/* Step 0 — Welcome */}
          {step === 0 && (
            <div className="text-center py-6 space-y-6">
              <div className="size-20 rounded-3xl bg-teal-100 text-teal flex items-center justify-center text-4xl mx-auto shadow-lg">
                🎉
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-ink">Selamat datang, {user?.name || "Sobat UMKM"}!</h3>
                <p className="text-sm text-stone max-w-sm mx-auto">
                  Kami akan bantu setup <strong>brand pertama</strong> kamu. Tenang — semua bisa diedit nanti.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
                {[
                  { icon: "🏪", text: "Bikin Brand" },
                  { icon: "📦", text: "Tambah Produk" },
                ].map((item, i) => (
                  <div key={i} className="bg-cream-100 rounded-xl p-3 text-center">
                    <div className="text-2xl mb-1">{item.icon}</div>
                    <div className="text-xs font-medium text-stone">{item.text}</div>
                  </div>
                ))}
              </div>
              <Button onClick={() => setStep(1)} className="bg-teal hover:bg-teal-600 gap-2" size="lg">
                Mulai Setup <ArrowRight className="size-4" />
              </Button>
            </div>
          )}

          {/* Step 1 — Brand */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Summary card — show when brand exists and not editing */}
              {existingBrand && !editingBrand ? (
                <>
                  <div className="bg-cream-100 rounded-xl p-5 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-xl bg-teal-100 text-teal flex items-center justify-center">
                        <Store className="size-5" />
                      </div>
                      <div>
                        <div className="font-bold text-ink">{existingBrand.name}</div>
                        <div className="text-xs text-stone">{existingBrand.category}</div>
                      </div>
                    </div>
                    {existingBrand.description && (
                      <p className="text-sm text-stone">{existingBrand.description}</p>
                    )}
                  </div>
                  <div className="flex justify-between pt-2">
                    <Button variant="ghost" onClick={() => setStep(0)}>
                      <ArrowLeft className="size-4 mr-1" /> Kembali
                    </Button>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={startEditBrand} className="gap-1.5">
                        <Pencil className="size-3.5" /> Edit
                      </Button>
                      <Button onClick={() => setStep(2)} className="bg-teal hover:bg-teal-600">
                        Lanjut <ArrowRight className="size-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Create form or Edit form */}
                  <div>
                    <Label className="mb-1.5 text-sm font-semibold">Nama brand *</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Kedai Kopi Budi" className="bg-cream-100" autoFocus />
                  </div>
                  <div>
                    <Label className="mb-1.5 text-sm font-semibold">Kategori usaha *</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {CATEGORIES.map((c) => (
                        <button
                          key={c}
                          onClick={() => setCategory(c)}
                          className={cn(
                            "px-3 py-2 rounded-lg text-xs font-medium border transition-all",
                            category === c ? "bg-teal text-white border-teal shadow-sm" : "bg-card border-border hover:border-teal/40"
                          )}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="mb-1.5 text-sm font-semibold">Deskripsi singkat</Label>
                    <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Kedai kopi spesialis dengan biji lokal..." className="bg-cream-100 resize-none" rows={2} />
                  </div>
                  <div className="flex justify-between pt-2">
                    <Button variant="ghost" onClick={editingBrand ? cancelEditBrand : () => setStep(0)}>
                      <ArrowLeft className="size-4 mr-1" /> {editingBrand ? "Batal" : "Kembali"}
                    </Button>
                    {editingBrand ? (
                      <Button onClick={saveBrandEdit} disabled={loading || !name.trim()} className="bg-teal hover:bg-teal-600">
                        {loading ? "Menyimpan..." : "Simpan Perubahan"}
                      </Button>
                    ) : (
                      <Button onClick={submitBrand} disabled={loading || !name.trim()} className="bg-teal hover:bg-teal-600">
                        {loading ? "Menyimpan..." : "Lanjut"} <ArrowRight className="size-4 ml-1" />
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 2 — Product */}
          {step === 2 && (
            <div className="space-y-4">
              {existingBrand && (
                <div className="flex items-center gap-2 bg-teal-100 text-teal-700 rounded-lg px-3 py-2 text-sm">
                  <Store className="size-4" />
                  <span>Produk untuk: <strong>{existingBrand.name}</strong></span>
                  <Button variant="ghost" size="sm" className="ml-auto h-6 text-xs" onClick={() => setStep(1)}>
                    <Pencil className="size-3 mr-1" /> Edit
                  </Button>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPType("barang")}
                  className={cn("p-4 rounded-xl border text-left transition-colors", pType === "barang" ? "bg-teal-100 border-teal" : "bg-card border-border hover:border-teal/40")}
                >
                  <div className="text-2xl mb-1">📦</div>
                  <div className="font-bold text-sm">Barang</div>
                  <div className="text-xs text-stone">Produk fisik</div>
                </button>
                <button
                  onClick={() => setPType("jasa")}
                  className={cn("p-4 rounded-xl border text-left transition-colors", pType === "jasa" ? "bg-teal-100 border-teal" : "bg-card border-border hover:border-teal/40")}
                >
                  <div className="text-2xl mb-1">💼</div>
                  <div className="font-bold text-sm">Jasa</div>
                  <div className="text-xs text-stone">Layanan</div>
                </button>
              </div>
              <div>
                <Label className="mb-1.5 text-sm font-semibold">Nama *</Label>
                <Input value={pName} onChange={(e) => setPName(e.target.value)} placeholder="Kopi Susu Gula Aren" className="bg-cream-100" autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="mb-1.5 text-sm font-semibold">Harga (Rp) *</Label>
                  <Input type="number" value={pPrice} onChange={(e) => setPPrice(e.target.value)} placeholder="22000" className="bg-cream-100 tabular-nums" />
                </div>
                <div><Label className="mb-1.5 text-sm font-semibold">Modal (Rp)</Label>
                  <Input type="number" value={pCost} onChange={(e) => setPCost(e.target.value)} placeholder="12000" className="bg-cream-100 tabular-nums" />
                </div>
              </div>
              {pType === "barang" && (
                <div><Label className="mb-1.5 text-sm font-semibold">Stok awal</Label>
                  <Input type="number" value={pStock} onChange={(e) => setPStock(e.target.value)} placeholder="50" className="bg-cream-100 tabular-nums" />
                </div>
              )}
              <div><Label className="mb-1.5 text-sm font-semibold">Deskripsi</Label>
                <Textarea value={pDesc} onChange={(e) => setPDesc(e.target.value)} placeholder="Bantu AI buat konten lebih relevan..." className="bg-cream-100 resize-none" rows={2} />
              </div>
              <div className="flex justify-between gap-2 pt-2">
                <Button variant="ghost" onClick={() => setStep(1)}><ArrowLeft className="size-4 mr-1" /> Kembali</Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => submitProduct(true)}>Skip</Button>
                  <Button onClick={() => submitProduct(false)} disabled={loading || !pName.trim() || !pPrice} className="bg-teal hover:bg-teal-600">
                    {loading ? "Menyimpan..." : "Simpan & Lanjut"} <ArrowRight className="size-4 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3 — Ready */}
          {step === 3 && (
            <div className="text-center py-6 space-y-6">
              <div className="size-20 rounded-3xl bg-teal-100 text-teal flex items-center justify-center text-4xl mx-auto shadow-lg">🚀</div>
              <div>
                <h3 className="text-xl font-bold text-ink">Semua siap!</h3>
                <p className="text-sm text-stone mt-1 max-w-xs mx-auto">
                  Brand dan produk kamu sudah siap. Sekarang saatnya manfaatkan AI untuk tumbuhkan bisnis!
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
                <Button variant="outline" onClick={() => finishOnboarding()} className="gap-2">
                  🔍 Mulai Riset
                </Button>
                <Button onClick={() => finishOnboarding()} className="bg-teal hover:bg-teal-600 gap-2">
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
