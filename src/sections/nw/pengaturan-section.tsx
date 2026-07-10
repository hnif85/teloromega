"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppStore, getActiveBrand, type Brand } from "@/lib/store";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { PageHeader, SectionCard, EmptyState } from "@/components/nw/primitives";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Store,
  Plus,
  Edit,
  Trash2,
  User,
  Palette,
  Bell,
  Check,
  Crown,
  Save,
  Globe,
  Sparkles,
  Mail,
  Hash,
} from "lucide-react";
import {
  CATEGORIES,
  TONES,
  slugify,
  type ToneKey,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Per-tone example snippets (static, for preview)
// ─────────────────────────────────────────────────────────────────────────────
const TONE_EXAMPLES: Record<ToneKey, string> = {
  santai_ramah:
    "Hai sobat! Lagi nyari cemilan buat nemenin ngopi sore? Cobain Keripik Pedas kami — renyah, lumer, dijamin nagih! Yuk mampir 🙌",
  profesional:
    "Keripik Singkong Premium kami diproduksi dari singkong pilihan dengan standar higienitas tinggi. Cocok untuk camilan keluarga maupun hidangan tamu.",
  energik:
    "SIAP PEDIAS MAK NYUSSS! 🔥 Keripik pedas level dewa, sekali makan langsung nangih! Stok terbatas, buruan checkout sekarang sebelum kehabisan!",
  hangat:
    "Tiap keripik yang kami goreng adalah cerita. Dari dapur kecil Ibu Ani, dibuat pelan dengan resep keluarga — semoga bisa menghangati harimu.",
  humoris:
    "Yakin skip keripik ini? Katanya temen kamu kemarin nagihin terus sampe ilang. 😂 Sekali cobain, dijamin gak bisa berhenti. Buruan checkout!",
  edukatif:
    "Tahukah kamu? Singkong tinggi serat dan rendah lemak. Keripik kami diolah dengan teknik goreng terkontrol untuk menjaga nutrisi — camilan enak tanpa rasa bersalah.",
};

// ─────────────────────────────────────────────────────────────────────────────
// Tab 1: Brand management
// ─────────────────────────────────────────────────────────────────────────────
function BrandTab() {
  const { brands, activeBrandId, setActiveBrand, addBrand, updateBrand } = useAppStore();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(activeBrandId);

  // Edit form state (for active brand)
  const [eName, setEName] = useState("");
  const [eCategory, setECategory] = useState<string>(CATEGORIES[0]);
  const [eDesc, setEDesc] = useState("");
  const [eLogo, setELogo] = useState("");
  const [saving, setSaving] = useState(false);

  // Add form state
  const [aName, setAName] = useState("");
  const [aCategory, setACategory] = useState<string>(CATEGORIES[0]);
  const [aDesc, setADesc] = useState("");
  const [aLogo, setALogo] = useState("");
  const [aTone, setATone] = useState<ToneKey>("santai_ramah");
  const [creating, setCreating] = useState(false);

  // Sync edit form whenever active brand changes
  useEffect(() => {
    const b = brands.find((x) => x.id === activeBrandId);
    if (b) {
      setEditingId(b.id);
      setEName(b.name);
      setECategory(b.category);
      setEDesc(b.description ?? "");
      setELogo(b.logoUrl ?? "");
    }
  }, [activeBrandId, brands]);

  async function saveEdit() {
    if (!editingId) return;
    if (!eName.trim()) {
      toast({ title: "Nama brand wajib diisi", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const r = await api<{ brand: Brand }>(`/api/brands/${editingId}`, {
        method: "PATCH",
        json: {
          name: eName.trim(),
          category: eCategory,
          description: eDesc.trim(),
          logoUrl: eLogo.trim(),
        },
      });
      updateBrand(r.brand);
      toast({ title: "Brand diperbarui", description: r.brand.name });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal menyimpan";
      toast({ title: "Gagal menyimpan", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function createBrand() {
    if (!aName.trim()) {
      toast({ title: "Nama brand wajib diisi", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const r = await api<{ brand: Brand }>("/api/brands", {
        method: "POST",
        json: {
          name: aName.trim(),
          category: aCategory,
          description: aDesc.trim(),
          logoUrl: aLogo.trim(),
          toneOfVoice: aTone,
        },
      });
      addBrand(r.brand);
      toast({ title: "Brand dibuat 🎉", description: r.brand.name });
      setAddOpen(false);
      setAName("");
      setADesc("");
      setALogo("");
      setACategory(CATEGORIES[0]);
      setATone("santai_ramah");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal membuat brand";
      toast({ title: "Gagal membuat brand", description: msg, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  }

  const editingBrand = brands.find((b) => b.id === editingId);
  const slugPreview = eName.trim() ? slugify(eName) : editingBrand?.slug ?? "";

  return (
    <div className="space-y-4">
      <SectionCard
        title="Daftar Brand"
        desc="Pilih brand aktif atau tambah brand baru"
        right={
          <Button
            size="sm"
            className="bg-teal hover:bg-teal-600 text-white gap-1.5"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="size-3.5" /> Tambah Brand
          </Button>
        }
        bodyClassName="p-0"
      >
        {brands.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={<Store className="size-6 text-stone" />}
              title="Belum ada brand"
              desc="Buat brand pertama kamu untuk mulai menggunakan The Next Whiz."
              action={
                <Button className="bg-teal hover:bg-teal-600" onClick={() => setAddOpen(true)}>
                  <Plus className="size-4 mr-1" /> Buat Brand Pertama
                </Button>
              }
            />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {brands.map((b) => {
              const active = b.id === activeBrandId;
              return (
                <button
                  key={b.id}
                  onClick={() => setActiveBrand(b.id)}
                  className={cn(
                    "w-full px-5 py-4 flex items-center gap-3 text-left transition-colors",
                    active ? "bg-teal-100/40" : "hover:bg-cream-100/50"
                  )}
                >
                  <div
                    className={cn(
                      "size-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0",
                      active
                        ? "bg-teal text-white"
                        : "bg-cream-200 text-ink-700"
                    )}
                  >
                    {b.name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-ink truncate">{b.name}</span>
                      {active && (
                        <Badge className="bg-teal text-white border-teal gap-1 text-[10px]">
                          <Check className="size-2.5" /> Aktif
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-stone mt-0.5 flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] py-0 h-4">
                        {b.category}
                      </Badge>
                      <span className="truncate font-mono">tokoku.nextwhiz.id/{b.slug}</span>
                    </div>
                  </div>
                  {active && (
                    <Edit
                      className="size-4 text-teal shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        document
                          .getElementById("edit-brand")
                          ?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* Edit active brand */}
      {editingBrand && (
        <div id="edit-brand" className="scroll-mt-4">
          <SectionCard
            title={`Edit Brand — ${editingBrand.name}`}
            desc="Perubahan tersimpan ke brand aktif"
            right={
              <Badge variant="outline" className="text-[10px] gap-1 border-teal/30 text-teal">
                <Crown className="size-3" /> Brand Aktif
              </Badge>
            }
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1.5">Nama Brand</Label>
                  <Input
                    value={eName}
                    onChange={(e) => setEName(e.target.value)}
                    className="bg-cream-100"
                    placeholder="Keripik Mbak Ani"
                  />
                </div>
                <div>
                  <Label className="mb-1.5">Kategori</Label>
                  <Select value={eCategory} onValueChange={setECategory}>
                    <SelectTrigger className="w-full bg-cream-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="mb-1.5">Deskripsi singkat</Label>
                <Textarea
                  value={eDesc}
                  onChange={(e) => setEDesc(e.target.value)}
                  rows={2}
                  placeholder="Keripik pedas rumahan dengan resep keluarga..."
                  className="bg-cream-100 resize-none"
                />
              </div>

              <div>
                <Label className="mb-1.5">URL Logo (opsional)</Label>
                <Input
                  value={eLogo}
                  onChange={(e) => setELogo(e.target.value)}
                  className="bg-cream-100"
                  placeholder="https://…/logo.png"
                />
              </div>

              {/* Slug preview */}
              <div className="rounded-lg bg-cream-100 border border-border px-3 py-2.5 flex items-center gap-2">
                <Globe className="size-4 text-teal shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] uppercase tracking-wider text-stone font-bold">
                    URL Toko
                  </div>
                  <div className="text-sm font-mono text-ink truncate">
                    tokoku.nextwhiz.id/<span className="text-teal font-bold">{slugPreview || "—"}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  variant="outline"
                  onClick={() => {
                    const b = brands.find((x) => x.id === editingId);
                    if (b) {
                      setEName(b.name);
                      setECategory(b.category);
                      setEDesc(b.description ?? "");
                      setELogo(b.logoUrl ?? "");
                    }
                  }}
                >
                  Reset
                </Button>
                <Button
                  onClick={saveEdit}
                  disabled={saving || !eName.trim()}
                  className="bg-teal hover:bg-teal-600 text-white gap-1.5"
                >
                  {saving ? (
                    <span className="size-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Save className="size-3.5" />
                  )}
                  {saving ? "Menyimpan…" : "Simpan Perubahan"}
                </Button>
              </div>

              <div className="rounded-lg bg-rose-50/60 border border-rose-200 px-3 py-2 flex items-center gap-2 text-xs text-rose-700">
                <Trash2 className="size-3.5 shrink-0" />
                <span>
                  Hapus brand belum tersedia (data terkait akan ikut terhapus). Fitur ini akan
                  hadir di versi berikutnya.
                </span>
              </div>
            </div>
          </SectionCard>
        </div>
      )}

      {/* Add brand dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Store className="size-5 text-teal" /> Tambah Brand Baru
            </DialogTitle>
            <DialogDescription>
              Brand baru akan otomatis jadi brand aktif. Tone of voice default bisa diganti
              nanti di tab Tone of Voice.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="mb-1.5">Nama Brand *</Label>
              <Input
                value={aName}
                onChange={(e) => setAName(e.target.value)}
                placeholder="Keripik Mbak Ani"
                className="bg-cream-100"
              />
              {aName.trim() && (
                <div className="text-[11px] text-stone mt-1.5 flex items-center gap-1">
                  <Globe className="size-3 text-teal" />
                  URL: <span className="font-mono text-teal">tokoku.nextwhiz.id/{slugify(aName)}</span>
                </div>
              )}
            </div>
            <div>
              <Label className="mb-1.5">Kategori *</Label>
              <Select value={aCategory} onValueChange={setACategory}>
                <SelectTrigger className="w-full bg-cream-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5">Deskripsi singkat (opsional)</Label>
              <Textarea
                value={aDesc}
                onChange={(e) => setADesc(e.target.value)}
                rows={2}
                placeholder="Keripik pedas rumahan dengan resep keluarga..."
                className="bg-cream-100 resize-none"
              />
            </div>
            <div>
              <Label className="mb-1.5">URL Logo (opsional)</Label>
              <Input
                value={aLogo}
                onChange={(e) => setALogo(e.target.value)}
                placeholder="https://…/logo.png"
                className="bg-cream-100"
              />
            </div>
            <div>
              <Label className="mb-1.5">Tone of Voice default</Label>
              <Select value={aTone} onValueChange={(v) => setATone(v as ToneKey)}>
                <SelectTrigger className="w-full bg-cream-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TONES.map((t) => (
                    <SelectItem key={t.key} value={t.key}>
                      {t.icon} {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={createBrand}
              disabled={creating || !aName.trim()}
              className="bg-teal hover:bg-teal-600 text-white gap-1.5"
            >
              {creating ? (
                <span className="size-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <Plus className="size-3.5" />
              )}
              {creating ? "Membuat…" : "Buat Brand"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 2: Profil
// ─────────────────────────────────────────────────────────────────────────────
function ProfilTab() {
  const { user } = useAppStore();
  const { toast } = useToast();
  const [name, setName] = useState(user?.name ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) setName(user.name);
  }, [user]);

  const initials = useMemo(() => {
    if (!user?.name) return "?";
    return user.name
      .split(" ")
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("");
  }, [user?.name]);

  async function saveName() {
    if (!name.trim()) {
      toast({ title: "Nama tidak boleh kosong", variant: "destructive" });
      return;
    }
    if (name.trim() === user?.name) {
      toast({ title: "Tidak ada perubahan" });
      return;
    }
    setSaving(true);
    try {
      const r = await api<{ user: { id: string; name: string; email: string; creditBalance: number; toneOfVoice: string } }>(
        "/api/user",
        { method: "PATCH", json: { name: name.trim() } }
      );
      // Update user in store directly (no dedicated action — use setState)
      useAppStore.setState((st) =>
        st.user ? { user: { ...st.user, name: r.user.name } } : {}
      );
      toast({ title: "Profil diperbarui", description: r.user.name });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal menyimpan";
      toast({ title: "Gagal menyimpan", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  if (!user) {
    return (
      <SectionCard title="Profil">
        <Skeleton className="h-32 w-full" />
      </SectionCard>
    );
  }

  return (
    <div className="space-y-4">
      <SectionCard title="Identitas" desc="Info dasar akun kamu">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Avatar className="size-16 rounded-2xl">
            <AvatarFallback className="bg-teal text-white text-xl font-bold rounded-2xl">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="text-lg font-extrabold text-ink">{user.name}</div>
            <div className="text-sm text-stone flex items-center gap-1.5 mt-0.5">
              <Mail className="size-3.5" /> {user.email}
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="outline" className="text-[10px] gap-1 border-teal/30 text-teal">
                <Sparkles className="size-3" /> {user.creditBalance} credit
              </Badge>
              <Badge variant="outline" className="text-[10px] gap-1">
                <Palette className="size-3" /> Default tone: {user.toneOfVoice.replace("_", " ")}
              </Badge>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Edit Nama"
        desc="Nama ini dipakai untuk sapaan & profil. Email tidak bisa diubah (terhubung ke mwxmarket.ai SSO)."
      >
        <div className="space-y-3">
          <div>
            <Label className="mb-1.5">Nama Lengkap</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-cream-100"
              placeholder="Nama kamu"
              maxLength={100}
            />
            <div className="text-[11px] text-stone mt-1">
              {name.trim().length}/100 karakter
            </div>
          </div>
          <div>
            <Label className="mb-1.5">Email</Label>
            <Input
              value={user.email}
              disabled
              className="bg-cream-100/60 text-stone"
            />
            <div className="text-[11px] text-stone-300 mt-1 flex items-center gap-1">
              <Mail className="size-3" /> Email dikelola via mwxmarket.ai
            </div>
          </div>
          <div className="flex justify-end pt-1">
            <Button
              onClick={saveName}
              disabled={saving || !name.trim() || name.trim() === user.name}
              className="bg-teal hover:bg-teal-600 text-white gap-1.5"
            >
              {saving ? (
                <span className="size-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="size-3.5" />
              )}
              {saving ? "Menyimpan…" : "Simpan Nama"}
            </Button>
          </div>
        </div>
      </SectionCard>

      <div className="rounded-2xl border border-dashed border-border bg-cream-100/40 p-4 flex items-start gap-3">
        <div className="size-9 rounded-lg bg-cream-200 text-stone flex items-center justify-center shrink-0">
          <User className="size-4" />
        </div>
        <div>
          <div className="text-sm font-semibold text-ink">Coming soon</div>
          <p className="text-xs text-stone mt-0.5">
            Upload foto profil, ganti password, dan 2FA akan hadir di update berikutnya.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 3: Tone of Voice
// ─────────────────────────────────────────────────────────────────────────────
function ToneTab() {
  const { brands, activeBrandId, updateBrand } = useAppStore();
  const { toast } = useToast();
  const [saving, setSaving] = useState<ToneKey | null>(null);

  const activeBrand = brands.find((b) => b.id === activeBrandId) ?? brands[0] ?? null;
  const currentTone = activeBrand?.toneOfVoice as ToneKey | undefined;

  async function selectTone(t: ToneKey) {
    if (!activeBrand || t === currentTone) return;
    setSaving(t);
    try {
      const r = await api<{ brand: Brand }>(`/api/brands/${activeBrand.id}`, {
        method: "PATCH",
        json: { toneOfVoice: t },
      });
      updateBrand(r.brand);
      toast({
        title: "Tone of Voice diperbarui",
        description: `${TONES.find((x) => x.key === t)?.label} aktif untuk ${r.brand.name}`,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal menyimpan tone";
      toast({ title: "Gagal menyimpan", description: msg, variant: "destructive" });
    } finally {
      setSaving(null);
    }
  }

  if (!activeBrand) {
    return (
      <SectionCard title="Tone of Voice">
        <EmptyState
          icon={<Palette className="size-6 text-stone" />}
          title="Belum ada brand aktif"
          desc="Buat brand dulu di tab Brand untuk mengatur tone of voice."
        />
      </SectionCard>
    );
  }

  return (
    <div className="space-y-4">
      <SectionCard
        title="Pilih Tone of Voice"
        desc={`Dipakai saat generate konten untuk ${activeBrand.name}`}
        right={
          <Badge variant="outline" className="text-[10px] gap-1 border-teal/30 text-teal">
            <Hash className="size-3" /> {activeBrand.slug}
          </Badge>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {TONES.map((t) => {
            const active = t.key === currentTone;
            const isSaving = saving === t.key;
            return (
              <button
                key={t.key}
                onClick={() => selectTone(t.key)}
                disabled={!!saving}
                className={cn(
                  "relative text-left rounded-2xl border p-4 transition-all",
                  active
                    ? "border-teal bg-gradient-to-b from-teal-100/60 to-card shadow-sm"
                    : "border-border bg-card hover:border-teal/30"
                )}
              >
                {active && (
                  <div className="absolute top-3 right-3 size-5 rounded-full bg-teal text-white flex items-center justify-center">
                    <Check className="size-3" />
                  </div>
                )}
                <div className="text-3xl mb-2">{t.icon}</div>
                <div className="font-bold text-ink text-sm">{t.label}</div>
                <div className="text-xs text-stone mt-0.5 leading-snug">{t.desc}</div>

                {/* Example snippet */}
                <div className="mt-3 rounded-lg bg-cream-100/80 border border-border/60 p-2.5">
                  <div className="text-[10px] uppercase tracking-wider text-stone font-bold mb-1 flex items-center gap-1">
                    <Sparkles className="size-2.5 text-teal" /> Contoh caption
                  </div>
                  <p className="text-[11px] text-ink-700 leading-snug line-clamp-3 italic">
                    “{TONE_EXAMPLES[t.key]}”
                  </p>
                </div>

                {isSaving && (
                  <div className="absolute inset-0 rounded-2xl bg-card/60 backdrop-blur-sm flex items-center justify-center">
                    <span className="size-5 border-2 border-teal/40 border-t-teal rounded-full animate-spin" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </SectionCard>

      <div className="rounded-2xl border border-border bg-cream-100/40 p-4 flex items-start gap-3">
        <div className="size-9 rounded-lg bg-teal-100 text-teal flex items-center justify-center shrink-0">
          <Palette className="size-4" />
        </div>
        <div>
          <div className="text-sm font-semibold text-ink">Tone dipakai saat generate konten</div>
          <p className="text-xs text-stone mt-0.5 leading-relaxed">
            Setiap brand punya tone-nya sendiri. Saat kamu generate caption, video script,
            atau carousel di modul Konten, AI akan ikut tone yang kamu pilih di sini.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 4: Notifikasi (mock, persisted to localStorage)
// ─────────────────────────────────────────────────────────────────────────────
interface NotifItem {
  key: string;
  label: string;
  desc: string;
  icon: "wa" | "mail" | "calendar" | "box" | "stats";
  defaultOn: boolean;
}

const NOTIF_ITEMS: NotifItem[] = [
  {
    key: "wa_lead",
    label: "Notif WA lead baru",
    desc: "Dapat notifikasi WhatsApp setiap ada lead baru masuk ke inbox.",
    icon: "wa",
    defaultOn: true,
  },
  {
    key: "email_order",
    label: "Notif email order baru",
    desc: "Email ringkasan setiap ada order masuk + detail item.",
    icon: "mail",
    defaultOn: true,
  },
  {
    key: "piutang",
    label: "Reminder piutang jatuh tempo",
    desc: "Pengingat 1 hari sebelum piutang jatuh tempo.",
    icon: "calendar",
    defaultOn: true,
  },
  {
    key: "stok",
    label: "Alert stok menipis",
    desc: "Notif saat stok produk di bawah minimum stok.",
    icon: "box",
    defaultOn: true,
  },
  {
    key: "weekly",
    label: "Weekly summary email",
    desc: "Ringkasan performa mingguan tiap Senin pagi.",
    icon: "stats",
    defaultOn: false,
  },
];

const NOTIF_LS_KEY = "nw_notif_settings_v1";

function NotifIcon({ kind }: { kind: NotifItem["icon"] }) {
  const map = {
    wa: { e: "💬", cls: "bg-emerald-100 text-emerald-700" },
    mail: { e: "✉️", cls: "bg-sky-100 text-sky-700" },
    calendar: { e: "📅", cls: "bg-amber-100 text-amber-700" },
    box: { e: "📦", cls: "bg-orange-100 text-orange-700" },
    stats: { e: "📊", cls: "bg-violet-100 text-violet-700" },
  } as const;
  const m = map[kind];
  return (
    <div className={cn("size-9 rounded-lg flex items-center justify-center text-base shrink-0", m.cls)}>
      {m.e}
    </div>
  );
}

function NotifikasiTab() {
  const [settings, setSettings] = useState<Record<string, boolean>>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Hydrate notif settings from localStorage on client mount.
    // This is a one-shot external store sync — not a cascading render.
    /* eslint-disable react-hooks/set-state-in-effect */
    try {
      const raw = localStorage.getItem(NOTIF_LS_KEY);
      if (raw) {
        setSettings(JSON.parse(raw));
      } else {
        // defaults
        const init: Record<string, boolean> = {};
        for (const it of NOTIF_ITEMS) init[it.key] = it.defaultOn;
        setSettings(init);
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  function toggle(key: string, on: boolean) {
    const next = { ...settings, [key]: on };
    setSettings(next);
    try {
      localStorage.setItem(NOTIF_LS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }

  const activeCount = NOTIF_ITEMS.filter((it) => settings[it.key]).length;

  return (
    <div className="space-y-4">
      <SectionCard
        title="Preferensi Notifikasi"
        desc="Atur channel & jenis notifikasi yang mau kamu terima"
        right={
          <Badge variant="outline" className="text-[10px] gap-1">
            <Bell className="size-3" /> {hydrated ? activeCount : "…"} aktif
          </Badge>
        }
        bodyClassName="p-0"
      >
        <div className="divide-y divide-border">
          {NOTIF_ITEMS.map((it) => {
            const on = hydrated ? !!settings[it.key] : it.defaultOn;
            return (
              <div
                key={it.key}
                className="px-5 py-4 flex items-start gap-3 hover:bg-cream-100/40 transition-colors"
              >
                <NotifIcon kind={it.icon} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-ink text-sm">{it.label}</div>
                  <div className="text-xs text-stone mt-0.5 leading-snug">{it.desc}</div>
                </div>
                <div className="shrink-0 pt-1">
                  <Switch checked={on} onCheckedChange={(v) => toggle(it.key, v)} />
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      <div className="rounded-2xl border border-dashed border-border bg-cream-100/40 p-4 flex items-start gap-3">
        <div className="size-9 rounded-lg bg-cream-200 text-stone flex items-center justify-center shrink-0">
          <Bell className="size-4" />
        </div>
        <div>
          <div className="text-sm font-semibold text-ink">Pengaturan disimpan lokal</div>
          <p className="text-xs text-stone mt-0.5">
            Preferensi ini disimpan di browser kamu (localStorage). Integrasi WA & email
            sebenarnya akan hadir bersama modul Toko v2.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main section
// ─────────────────────────────────────────────────────────────────────────────
export function PengaturanSection() {
  const activeBrand = getActiveBrand(useAppStore.getState());

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengaturan"
        subtitle={`Atur brand, profil, tone of voice & notifikasi${activeBrand ? ` · ${activeBrand.name}` : ""}`}
        icon="⚙️"
      />

      <Tabs defaultValue="brand" className="w-full">
        <TabsList className="bg-cream-200/60 h-auto p-1 flex-wrap">
          <TabsTrigger value="brand" className="gap-1.5">
            <Store className="size-3.5" /> Brand
          </TabsTrigger>
          <TabsTrigger value="profil" className="gap-1.5">
            <User className="size-3.5" /> Profil
          </TabsTrigger>
          <TabsTrigger value="tone" className="gap-1.5">
            <Palette className="size-3.5" /> Tone of Voice
          </TabsTrigger>
          <TabsTrigger value="notif" className="gap-1.5">
            <Bell className="size-3.5" /> Notifikasi
          </TabsTrigger>
        </TabsList>

        <TabsContent value="brand" className="mt-4">
          <BrandTab />
        </TabsContent>
        <TabsContent value="profil" className="mt-4">
          <ProfilTab />
        </TabsContent>
        <TabsContent value="tone" className="mt-4">
          <ToneTab />
        </TabsContent>
        <TabsContent value="notif" className="mt-4">
          <NotifikasiTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default PengaturanSection;
