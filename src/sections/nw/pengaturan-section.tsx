"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppStore, getActiveBrand, type Brand } from "@/lib/store";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { PageHeader, SectionCard, EmptyState } from "@/components/nw/primitives";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Store,
  Plus,
  Edit,
  Trash2,
  User,
  Palette,
  Check,
  Crown,
  Save,
  Globe,
  Sparkles,
  Mail,
  Hash,
  Loader2,
  AlertTriangle,
  Database,
  Target,
  RefreshCw,
  Pause,
  Play,
  Calendar,
  Clock,
  ChevronDown,
  TrendingUp,
  Download,
  Upload,
  FileJson,
  ShieldCheck,
  Info,
  ArrowLeft,
  LogOut,
  Sun,
  Moon,
  History,
} from "lucide-react";
import {
  CATEGORIES,
  TONES,
  slugify,
  formatRupiah,
  formatRupiahShort,
  type ToneKey,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { startTour } from "@/components/nw/onboarding-tour";

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
  const { brands, activeBrandId, setActiveBrand, addBrand, updateBrand, user, setSession } =
    useAppStore();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(activeBrandId);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  // Soft-delete the currently-edited brand via DELETE /api/brands/[id].
  // API refuses to delete the user's last active brand; we surface that error
  // to the user as a toast and keep the dialog open.
  async function confirmDelete() {
    if (!editingId) return;
    setDeleting(true);
    try {
      await api(`/api/brands/${editingId}`, { method: "DELETE" });
      const remaining = brands.filter((b) => b.id !== editingId);
      const wasActive = editingId === activeBrandId;
      const newActiveId = wasActive ? remaining[0]?.id ?? null : activeBrandId;
      if (user) {
        // setSession is the only store action that can replace the brands array
        // in one shot — we re-use it here to drop the deleted brand.
        setSession({
          user,
          brands: remaining,
          activeBrandId: newActiveId,
        });
      } else if (newActiveId) {
        setActiveBrand(newActiveId);
      }
      toast({
        title: "Brand dihapus",
        description: "Brand berhasil diarsipkan bersama data terkait.",
      });
      setDeleteOpen(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal menghapus brand";
      toast({ title: "Gagal menghapus brand", description: msg, variant: "destructive" });
    } finally {
      setDeleting(false);
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
              desc="Buat brand pertama kamu untuk mulai menggunakan usahaku.ai."
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
                      <span className="truncate font-mono">tokoku.usahaku.ai/{b.slug}</span>
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
                    tokoku.usahaku.ai/<span className="text-teal font-bold">{slugPreview || "—"}</span>
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

              {/* Danger zone — soft-delete brand */}
              <div className="rounded-lg bg-rose-50/60 border border-rose-200 px-3 py-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-rose-700">
                  <Trash2 className="size-3.5 shrink-0" />
                  <span>
                    Hapus brand — brand &amp; semua data terkait (produk, riset, konten, transaksi)
                    akan diarsipkan. Aksi ini tidak bisa dibatalkan.
                  </span>
                </div>
                <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="gap-1.5 shrink-0"
                      disabled={brands.length <= 1}
                    >
                      <Trash2 className="size-3.5" /> Hapus Brand
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Yakin hapus {editingBrand?.name}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Brand akan diarsipkan bersama semua data terkait (produk, riset, konten,
                        transaksi). Aksi ini tidak bisa dibatalkan.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={(e) => {
                          e.preventDefault();
                          confirmDelete();
                        }}
                        disabled={deleting}
                        className="bg-rose-600 hover:bg-rose-700 text-white gap-1.5"
                      >
                        {deleting ? (
                          <span className="size-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        ) : (
                          <Trash2 className="size-3.5" />
                        )}
                        {deleting ? "Menghapus…" : "Ya, Hapus"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
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
                  URL: <span className="font-mono text-teal">tokoku.usahaku.ai/{slugify(aName)}</span>
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

      <SectionCard
        title="Tour Berpanduan"
        desc="Belum hafal fitur usahaku.ai? Jalankan tour 8 langkah untuk kenalan dengan navigasi, brand switcher, credit, command palette, notifikasi, dan theme toggle."
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="size-10 rounded-xl bg-teal-100 text-teal flex items-center justify-center text-xl shrink-0">
            🎯
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-ink">
              Mulai Tour Berpanduan
            </div>
            <p className="text-xs text-stone mt-0.5">
              8 langkah singkat · ± 1 menit · bisa dilewati kapan saja.
            </p>
          </div>
          <Button
            onClick={() => startTour()}
            className="bg-teal hover:bg-teal-600 text-white gap-1.5 shrink-0"
          >
            <Sparkles className="size-3.5" /> Mulai Tour
          </Button>
        </div>
      </SectionCard>
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
// Tab 5: Data Demo — load demo data / reset brand data
// ─────────────────────────────────────────────────────────────────────────────
type SeedResponse = {
  seeded?: boolean;
  alreadySeeded?: boolean;
  counts?: {
    products: number;
    leads: number;
    customers: number;
    orders: number;
    payments: number;
    transactions: number;
    content: number;
    inbox: number;
    research: number;
    campaigns: number;
  };
};

function DemoTab() {
  const { brands, activeBrandId } = useAppStore();
  const activeBrand = brands.find((b) => b.id === activeBrandId) ?? brands[0] ?? null;
  const { toast } = useToast();
  const qc = useQueryClient();
  const [resetOpen, setResetOpen] = useState(false);

  // Invalidate ALL queries — demo data touches every module.
  function refreshAll() {
    qc.invalidateQueries();
  }

  const seedMutation = useMutation({
    mutationFn: () =>
      api<SeedResponse>("/api/demo/seed", {
        method: "POST",
        json: { brandId: activeBrand?.id },
      }),
    onSuccess: (data) => {
      if (data.alreadySeeded) {
        toast({
          title: "Data demo sudah dimuat",
          description: "Brand ini sudah punya data demo. Reset dulu jika ingin muat ulang.",
        });
        return;
      }
      const c = data.counts;
      toast({
        title: "Data demo berhasil dimuat 🎁",
        description: c
          ? `${c.products} produk · ${c.orders} order · ${c.transactions} transaksi · ${c.leads} leads · ${c.content} konten`
          : "Brand sudah terisi data contoh.",
      });
      refreshAll();
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : "Gagal memuat data demo";
      toast({ title: "Gagal memuat data demo", description: msg, variant: "destructive" });
    },
  });

  const resetMutation = useMutation({
    mutationFn: () =>
      api<{ reset: boolean; deleted: Record<string, number> }>("/api/demo/reset", {
        method: "POST",
        json: { brandId: activeBrand?.id },
      }),
    onSuccess: (data) => {
      const d = data.deleted;
      const total = d
        ? Object.values(d).reduce((a, b) => a + b, 0)
        : 0;
      toast({
        title: "Data berhasil direset",
        description: `${total} baris dihapus. Brand tetap ada, siap untuk data baru.`,
      });
      setResetOpen(false);
      refreshAll();
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : "Gagal mereset data";
      toast({ title: "Gagal mereset data", description: msg, variant: "destructive" });
    },
  });

  if (!activeBrand) {
    return (
      <SectionCard title="Data Demo">
        <EmptyState
          icon={<Database className="size-6 text-stone" />}
          title="Belum ada brand aktif"
          desc="Buat brand dulu di tab Brand untuk memuat data demo."
        />
      </SectionCard>
    );
  }

  const seeding = seedMutation.isPending;
  const resetting = resetMutation.isPending;

  return (
    <div className="space-y-4">
      <SectionCard
        title="Data Demo"
        desc={`Muat data contoh untuk ${activeBrand.name}, atau reset ke keadaan kosong.`}
        right={
          <Badge variant="outline" className="text-[10px] gap-1 border-teal/30 text-teal">
            <Database className="size-3" /> Demo
          </Badge>
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* ── Card 1: Muat Data Demo ───────────────────────────────────── */}
          <div className="rounded-2xl border border-teal/20 bg-gradient-to-b from-teal-50/60 to-card p-5 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <div className="size-11 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center shrink-0">
                <Sparkles className="size-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-ink">Muat Data Demo</h3>
                <p className="text-xs text-stone mt-1 leading-snug">
                  Isi brand aktif dengan produk, leads, order, pembayaran, transaksi,
                  konten, dan riset contoh. Cocok untuk eksplorasi fitur.
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 flex items-start gap-2">
              <AlertTriangle className="size-3.5 mt-0.5 shrink-0" />
              <span>
                Data demo akan <strong>ditambahkan</strong> ke data yang sudah ada.
                Untuk hasil terbaik, reset dulu jika sudah ada data.
              </span>
            </div>

            <ul className="text-xs text-stone space-y-1 leading-snug">
              <li>• 4 produk (3 barang + 1 jasa) dengan stok & margin</li>
              <li>• 5 leads di berbagai stage + 2 customer</li>
              <li>• 6 order + 4 pembayaran (verifikasi + transaksi HPP)</li>
              <li>• 6 transaksi (3 income + 3 expense) + 3 konten + riset</li>
              <li>• 3 inbox message + 1 campaign WA terkirim</li>
            </ul>

            <Button
              className="bg-teal hover:bg-teal-600 text-white gap-1.5 mt-1"
              onClick={() => seedMutation.mutate()}
              disabled={seeding || resetting}
            >
              {seeding ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Memuat…
                </>
              ) : (
                <>
                  <Sparkles className="size-4" /> Muat Data Demo
                </>
              )}
            </Button>
          </div>

          {/* ── Card 2: Reset Data ───────────────────────────────────────── */}
          <div className="rounded-2xl border border-rose-200 bg-gradient-to-b from-rose-50/60 to-card p-5 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <div className="size-11 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="size-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-ink">Reset Semua Data</h3>
                <p className="text-xs text-stone mt-1 leading-snug">
                  Hapus SEMUA data untuk brand aktif: produk, leads, order, pembayaran,
                  transaksi, konten, riset, campaign. Brand tetap ada.
                </p>
              </div>
            </div>

            <ul className="text-xs text-stone space-y-1 leading-snug">
              <li>• Produk & inventory dihapus</li>
              <li>• Leads, customers, orders, payments dihapus</li>
              <li>• Transaksi, piutang, hutang, biaya operasional dihapus</li>
              <li>• Konten, riset, contexts, inbox, campaign dihapus</li>
            </ul>

            <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="gap-1.5 mt-1"
                  disabled={seeding || resetting}
                >
                  <Trash2 className="size-4" /> Reset Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Yakin reset semua data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Aksi ini <strong>TIDAK BISA dibatalkan</strong>. Semua transaksi, order,
                    produk, dan riwayat untuk brand <strong>{activeBrand.name}</strong> akan
                    hilang. Brand itu sendiri tetap ada.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={resetting}>Batal</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e) => {
                      e.preventDefault();
                      resetMutation.mutate();
                    }}
                    disabled={resetting}
                    className="bg-rose-600 hover:bg-rose-700 text-white gap-1.5"
                  >
                    {resetting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" /> Mereset…
                      </>
                    ) : (
                      <>
                        <Trash2 className="size-4" /> Ya, Reset Semua
                      </>
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-dashed border-border bg-cream-100/50 p-4 flex items-start gap-3">
          <div className="size-9 rounded-lg bg-cream-200 text-stone flex items-center justify-center shrink-0">
            <Database className="size-4" />
          </div>
          <div className="text-xs text-stone leading-relaxed">
            <strong className="text-ink">Tips eksplorasi:</strong> setelah muat data demo,
            cek <strong>Beranda</strong> untuk dashboard ringkasan, <strong>Toko</strong>{" "}
            untuk inbox/leads/orders/pembayaran, dan <strong>Keuangan</strong> untuk
            transaksi & P&amp;L. Data demo ditandai dengan SKU berawalan <code className="px-1 py-0.5 rounded bg-cream-200 text-ink">DEMO-</code> di
            produk.
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 6: Target Bisnis (Goals)
// ─────────────────────────────────────────────────────────────────────────────
interface Goal {
  id: string;
  brandId: string;
  type: string;
  period: string;
  target: number;
  current: number;
  startDate: string;
  endDate: string;
  status: string;
  notes: string | null;
  progress: number;
  createdAt: string;
  updatedAt: string;
}

const GOAL_TYPES_FULL: { key: string; emoji: string; label: string; hint: string }[] = [
  { key: "revenue", emoji: "💰", label: "Omzet", hint: "Total pendapatan kotor" },
  { key: "orders", emoji: "🛒", label: "Jumlah Order", hint: "Order masuk (tanpa dibatalkan)" },
  { key: "products", emoji: "📦", label: "Produk Baru", hint: "Produk aktif yang dibuat" },
  { key: "customers", emoji: "👥", label: "Customer Baru", hint: "Customer terdaftar" },
  { key: "content", emoji: "📝", label: "Konten Dibuat", hint: "Caption, gambar, video" },
  { key: "research", emoji: "🔍", label: "Riset", hint: "Riset pasar selesai" },
];

const GOAL_PERIODS_FULL: { key: string; label: string }[] = [
  { key: "monthly", label: "Bulanan" },
  { key: "quarterly", label: "Kuartal" },
  { key: "yearly", label: "Tahunan" },
];

const GOAL_STATUS_META: Record<
  string,
  { label: string; cls: string }
> = {
  active: { label: "Aktif", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  achieved: { label: "Tercapai", cls: "bg-teal-100 text-teal-700 border-teal-200" },
  failed: { label: "Gagal", cls: "bg-rose-100 text-rose-700 border-rose-200" },
  paused: { label: "Pause", cls: "bg-amber-100 text-amber-700 border-amber-200" },
};

function formatGoalValue(type: string, v: number): string {
  if (type === "revenue") return formatRupiah(v);
  return String(Math.round(v));
}

function formatGoalValueShort(type: string, v: number): string {
  if (type === "revenue") return formatRupiahShort(v);
  return String(Math.round(v));
}

function daysRemaining(endDate: string): number {
  const end = new Date(endDate);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function formatDateRange(s: string, e: string): string {
  const start = new Date(s);
  const end = new Date(e);
  const fmt = (d: Date) => d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  return `${fmt(start)} → ${fmt(end)}`;
}

function TargetTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { brands, activeBrandId } = useAppStore();
  const activeBrand = brands.find((b) => b.id === activeBrandId) ?? brands[0] ?? null;
  const brandId = activeBrand?.id;

  // ─── Fetch goals (all statuses for management view) ───
  const { data, isLoading } = useQuery<{ goals: Goal[] }>({
    queryKey: ["goals", brandId, "all"],
    queryFn: () => api(`/api/goals?brandId=${brandId}&status=all`),
    enabled: !!brandId,
    staleTime: 30_000,
  });

  const goals = data?.goals ?? [];
  const activeGoals = goals.filter((g) => g.status === "active" || g.status === "paused");
  const achievedGoals = goals.filter((g) => g.status === "achieved");
  const failedGoals = goals.filter((g) => g.status === "failed");

  // ─── Dialog state ───
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [fType, setFType] = useState<string>("revenue");
  const [fPeriod, setFPeriod] = useState<string>("monthly");
  const [fTarget, setFTarget] = useState<string>("");
  const [fNotes, setFNotes] = useState<string>("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  function resetForm() {
    setFType("revenue");
    setFPeriod("monthly");
    setFTarget("");
    setFNotes("");
    setEditingGoal(null);
  }

  function openCreate() {
    resetForm();
    setDialogOpen(true);
  }

  function openEdit(g: Goal) {
    setEditingGoal(g);
    setFType(g.type);
    setFPeriod(g.period);
    setFTarget(String(g.target));
    setFNotes(g.notes ?? "");
    setDialogOpen(true);
  }

  // ─── Mutations ───
  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      api<{ goal: Goal }>("/api/goals", { method: "POST", json: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goals", brandId] });
      toast({ title: "Target dibuat 🎯", description: "Target baru aktif. Klik Refresh untuk hitung progres awal." });
      setDialogOpen(false);
      resetForm();
    },
    onError: (e: unknown) => {
      toast({
        title: "Gagal membuat target",
        description: e instanceof Error ? e.message : "Coba lagi",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (args: { id: string; payload: Record<string, unknown> }) =>
      api<{ goal: Goal }>(`/api/goals/${args.id}`, { method: "PATCH", json: args.payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goals", brandId] });
      toast({ title: "Target diperbarui" });
      setDialogOpen(false);
      resetForm();
    },
    onError: (e: unknown) => {
      toast({
        title: "Gagal memperbarui",
        description: e instanceof Error ? e.message : "Coba lagi",
        variant: "destructive",
      });
    },
  });

  const statusMutation = useMutation({
    mutationFn: (args: { id: string; status: string }) =>
      api<{ goal: Goal }>(`/api/goals/${args.id}`, { method: "PATCH", json: { status: args.status } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goals", brandId] });
    },
    onError: (e: unknown) => {
      toast({
        title: "Gagal mengubah status",
        description: e instanceof Error ? e.message : "Coba lagi",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/api/goals/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goals", brandId] });
      toast({ title: "Target dihapus" });
      setDeleteId(null);
    },
    onError: (e: unknown) => {
      toast({
        title: "Gagal menghapus",
        description: e instanceof Error ? e.message : "Coba lagi",
        variant: "destructive",
      });
    },
  });

  const refreshMutation = useMutation({
    mutationFn: () =>
      api<{ goals: Goal[]; refreshedAt: string }>("/api/goals/refresh", {
        method: "POST",
        json: { brandId },
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["goals", brandId] });
      const achieved = data.goals.filter((g) => g.status === "achieved").length;
      toast({
        title: `Progres diperbarui · ${data.goals.length} target`,
        description: achieved > 0 ? `🎉 ${achieved} target tercapai!` : undefined,
      });
    },
    onError: (e: unknown) => {
      toast({
        title: "Gagal refresh progres",
        description: e instanceof Error ? e.message : "Coba lagi",
        variant: "destructive",
      });
    },
  });

  function handleSave() {
    const tgt = Number(fTarget);
    if (!Number.isFinite(tgt) || tgt <= 0) {
      toast({ title: "Target harus angka > 0", variant: "destructive" });
      return;
    }
    if (!brandId) {
      toast({ title: "Brand aktif tidak ditemukan", variant: "destructive" });
      return;
    }
    if (editingGoal) {
      updateMutation.mutate({
        id: editingGoal.id,
        payload: { target: tgt, notes: fNotes.trim() || null },
      });
    } else {
      createMutation.mutate({
        brandId,
        type: fType,
        period: fPeriod,
        target: tgt,
        notes: fNotes.trim() || null,
      });
    }
  }

  // ─── Period date preview ───
  const periodPreview = useMemo(() => {
    const now = new Date();
    let s: Date;
    let e: Date;
    if (fPeriod === "monthly") {
      s = new Date(now.getFullYear(), now.getMonth(), 1);
      e = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (fPeriod === "quarterly") {
      const q = Math.floor(now.getMonth() / 3);
      s = new Date(now.getFullYear(), q * 3, 1);
      e = new Date(now.getFullYear(), q * 3 + 3, 0, 23, 59, 59, 999);
    } else {
      s = new Date(now.getFullYear(), 0, 1);
      e = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    }
    return formatDateRange(s.toISOString(), e.toISOString());
  }, [fPeriod]);

  if (!activeBrand) {
    return (
      <SectionCard title="Target Bisnis">
        <EmptyState
          icon={<Target className="size-6 text-stone" />}
          title="Belum ada brand aktif"
          desc="Buat brand dulu di tab Brand untuk mulai melacak target bisnis."
        />
      </SectionCard>
    );
  }

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4">
      <SectionCard
        title="Target Bisnis"
        desc={`Atur & pantau target bisnis untuk ${activeBrand.name}`}
        right={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => refreshMutation.mutate()}
              disabled={refreshMutation.isPending || activeGoals.length === 0}
            >
              {refreshMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <RefreshCw className="size-3.5" />
              )}
              Refresh
            </Button>
            <Button
              size="sm"
              className="bg-teal hover:bg-teal-600 text-white gap-1.5"
              onClick={openCreate}
            >
              <Plus className="size-3.5" /> Buat Target
            </Button>
          </div>
        }
      >
        {/* ─── Empty state ─── */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
          </div>
        ) : goals.length === 0 ? (
          <EmptyState
            icon={<Target className="size-6 text-stone" />}
            title="Belum ada target"
            desc="Bikin target pertama untuk mulai lacak progress bisnis kamu — omzet, order, produk, customer, konten, atau riset."
            action={
              <Button
                className="bg-teal hover:bg-teal-600 gap-1.5"
                onClick={openCreate}
              >
                <Plus className="size-4" /> Buat Target Pertama
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {/* ─── Active + Paused goals ─── */}
            {activeGoals.length > 0 && (
              <div className="space-y-3">
                {activeGoals.map((g) => (
                  <GoalCard
                    key={g.id}
                    goal={g}
                    onEdit={() => openEdit(g)}
                    onTogglePause={() =>
                      statusMutation.mutate({
                        id: g.id,
                        status: g.status === "paused" ? "active" : "paused",
                      })
                    }
                    onDelete={() => setDeleteId(g.id)}
                    busy={statusMutation.isPending || deleteMutation.isPending}
                  />
                ))}
              </div>
            )}

            {/* ─── Failed goals (compact list) ─── */}
            {failedGoals.length > 0 && (
              <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-3">
                <div className="text-xs font-semibold text-rose-800 mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="size-3.5" />
                  {failedGoals.length} target tidak tercapai
                </div>
                <ul className="space-y-1">
                  {failedGoals.map((g) => {
                    const meta = GOAL_TYPES_FULL.find((t) => t.key === g.type);
                    return (
                      <li
                        key={g.id}
                        className="text-xs text-rose-700 flex items-center gap-2"
                      >
                        <span>{meta?.emoji ?? "🎯"}</span>
                        <span className="font-medium">{meta?.label ?? g.type}</span>
                        <span className="text-rose-500">
                          {formatGoalValueShort(g.type, g.current)} / {formatGoalValueShort(g.type, g.target)}
                        </span>
                        <button
                          className="ml-auto text-rose-600 underline hover:no-underline"
                          onClick={() => setDeleteId(g.id)}
                        >
                          Hapus
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* ─── Achieved goals (collapsed) ─── */}
            {achievedGoals.length > 0 && (
              <Collapsible defaultOpen={false}>
                <CollapsibleTrigger asChild>
                  <button className="w-full flex items-center justify-between rounded-xl border border-teal/20 bg-teal-50/40 px-4 py-3 hover:bg-teal-50/70 transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="size-7 rounded-lg bg-teal text-white flex items-center justify-center">
                        <Check className="size-3.5" />
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-semibold text-ink">
                          {achievedGoals.length} Target Tercapai 🎉
                        </div>
                        <div className="text-[11px] text-stone">
                          Historis pencapaian target bisnis
                        </div>
                      </div>
                    </div>
                    <ChevronDown className="size-4 text-stone [[data-state=open]_&]:rotate-180 transition-transform" />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2 space-y-2">
                    {achievedGoals.map((g) => {
                      const meta = GOAL_TYPES_FULL.find((t) => t.key === g.type);
                      return (
                        <div
                          key={g.id}
                          className="rounded-lg border border-border bg-card px-3 py-2 flex items-center gap-3"
                        >
                          <span className="text-lg">{meta?.emoji ?? "🎯"}</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-ink">
                              {meta?.label ?? g.type}
                            </div>
                            <div className="text-[11px] text-stone tabular-nums">
                              {formatGoalValueShort(g.type, g.current)} / {formatGoalValueShort(g.type, g.target)} · {formatDateRange(g.startDate, g.endDate)}
                            </div>
                          </div>
                          <Badge className="bg-teal-100 text-teal-700 border-teal-200 border text-[10px]">
                            Tercapai
                          </Badge>
                          <button
                            className="text-stone hover:text-rose-600"
                            onClick={() => setDeleteId(g.id)}
                            aria-label="Hapus target"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        )}
      </SectionCard>

      {/* ─── Create/Edit Dialog ─── */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) resetForm();
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="size-4 text-teal" />
              {editingGoal ? "Edit Target" : "Buat Target Baru"}
            </DialogTitle>
            <DialogDescription>
              {editingGoal
                ? "Ubah target, atau pause/resume dari kartu."
                : "Set target bisnis kamu — sistem akan hitung progres otomatis dari data kamu."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Type */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Tipe Target</Label>
              <div className="grid grid-cols-2 gap-2">
                {GOAL_TYPES_FULL.map((t) => {
                  const sel = fType === t.key;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      disabled={!!editingGoal}
                      onClick={() => setFType(t.key)}
                      className={cn(
                        "rounded-xl border p-3 text-left transition-all disabled:opacity-60 disabled:cursor-not-allowed",
                        sel
                          ? "border-teal bg-teal-50 ring-1 ring-teal/30"
                          : "border-border hover:border-teal/40 hover:bg-cream-100/50"
                      )}
                    >
                      <div className="text-base mb-0.5">{t.emoji}</div>
                      <div className="text-xs font-semibold text-ink leading-tight">
                        {t.label}
                      </div>
                      <div className="text-[10px] text-stone leading-tight mt-0.5">
                        {t.hint}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Period */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Periode</Label>
              <div className="grid grid-cols-3 gap-2">
                {GOAL_PERIODS_FULL.map((p) => {
                  const sel = fPeriod === p.key;
                  return (
                    <button
                      key={p.key}
                      type="button"
                      disabled={!!editingGoal}
                      onClick={() => setFPeriod(p.key)}
                      className={cn(
                        "rounded-lg border py-2 text-xs font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed",
                        sel
                          ? "border-teal bg-teal-50 text-teal-700 ring-1 ring-teal/30"
                          : "border-border text-ink hover:border-teal/40 hover:bg-cream-100/50"
                      )}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-stone">
                <Calendar className="size-3" />
                <span>{periodPreview}</span>
              </div>
            </div>

            {/* Target value */}
            <div className="space-y-1.5">
              <Label htmlFor="goal-target" className="text-xs font-semibold">
                Target {fType === "revenue" ? "(Rp)" : "(jumlah)"}
              </Label>
              <div className="relative">
                {fType === "revenue" && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone pointer-events-none">
                    Rp
                  </span>
                )}
                <Input
                  id="goal-target"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={fTarget}
                  onChange={(e) => setFTarget(e.target.value)}
                  placeholder={fType === "revenue" ? "5000000" : "50"}
                  className={cn(fType === "revenue" && "pl-9")}
                />
              </div>
              {fType === "revenue" && Number(fTarget) > 0 && (
                <div className="text-[11px] text-stone">
                  ≈ {formatRupiahShort(Number(fTarget))}
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="goal-notes" className="text-xs font-semibold">
                Catatan <span className="text-stone font-normal">(opsional)</span>
              </Label>
              <Textarea
                id="goal-notes"
                value={fNotes}
                onChange={(e) => setFNotes(e.target.value)}
                placeholder="Mis. target khusus Lebaran, sumber utama dari TikTok Shop…"
                rows={2}
                className="resize-none text-sm"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Batal
            </Button>
            <Button
              className="bg-teal hover:bg-teal-600 text-white gap-1.5"
              onClick={handleSave}
              disabled={saving || !fTarget || Number(fTarget) <= 0}
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Menyimpan…
                </>
              ) : editingGoal ? (
                <>
                  <Save className="size-4" /> Simpan Perubahan
                </>
              ) : (
                <>
                  <Plus className="size-4" /> Buat Target
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete confirmation ─── */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus target ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Target akan dihapus permanen. Progress historis tidak bisa dikembalikan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (deleteId) deleteMutation.mutate(deleteId);
              }}
              disabled={deleteMutation.isPending}
              className="bg-rose-600 hover:bg-rose-700 text-white gap-1.5"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Menghapus…
                </>
              ) : (
                <>
                  <Trash2 className="size-4" /> Ya, Hapus
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Single goal card ─────────────────────────────────────────
function GoalCard({
  goal,
  onEdit,
  onTogglePause,
  onDelete,
  busy,
}: {
  goal: Goal;
  onEdit: () => void;
  onTogglePause: () => void;
  onDelete: () => void;
  busy: boolean;
}) {
  const meta = GOAL_TYPES_FULL.find((t) => t.key === goal.type);
  const periodLabel =
    GOAL_PERIODS_FULL.find((p) => p.key === goal.period)?.label ?? goal.period;
  const status = GOAL_STATUS_META[goal.status] ?? GOAL_STATUS_META.active;
  const pct = Math.min(100, goal.progress ?? 0);
  const days = daysRemaining(goal.endDate);
  const isPaused = goal.status === "paused";
  const isAchieved = goal.status === "achieved";
  const isOver = days === 0 && !isAchieved;

  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-colors",
        isPaused
          ? "border-amber-200 bg-amber-50/30"
          : "border-border bg-card hover:border-teal/30"
      )}
    >
      {/* Header row */}
      <div className="flex items-start gap-3">
        <div className="size-10 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center text-lg shrink-0">
          {meta?.emoji ?? "🎯"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-ink text-sm">
              {meta?.label ?? goal.type}
            </span>
            <Badge variant="outline" className="text-[10px] h-4 py-0">
              {periodLabel}
            </Badge>
            <Badge className={cn("text-[10px] h-4 py-0 border", status.cls)}>
              {status.label}
            </Badge>
          </div>
          <div className="text-[11px] text-stone mt-0.5 flex items-center gap-1.5">
            <Calendar className="size-3" />
            {formatDateRange(goal.startDate, goal.endDate)}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            size="sm"
            variant="ghost"
            className="size-8 p-0 text-stone hover:text-teal"
            onClick={onEdit}
            disabled={busy}
            aria-label="Edit target"
          >
            <Edit className="size-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="size-8 p-0 text-stone hover:text-amber-600"
            onClick={onTogglePause}
            disabled={busy}
            aria-label={isPaused ? "Resume target" : "Pause target"}
          >
            {isPaused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="size-8 p-0 text-stone hover:text-rose-600"
            onClick={onDelete}
            disabled={busy}
            aria-label="Hapus target"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Current vs Target */}
      <div className="mt-3 flex items-end justify-between gap-2">
        <div>
          <div className="text-[11px] text-stone mb-0.5">Progres saat ini</div>
          <div className="text-xl font-extrabold text-ink tabular-nums leading-none">
            {formatGoalValue(goal.type, goal.current)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-stone mb-0.5">Target</div>
          <div className="text-sm font-bold text-stone tabular-nums leading-none">
            {formatGoalValue(goal.type, goal.target)}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-2">
        <div className="flex items-center justify-between text-[11px] mb-1">
          <span className={cn("font-bold", isAchieved ? "text-teal-700" : "text-ink")}>
            {pct}%
          </span>
          {!isAchieved && (
            <span
              className={cn(
                "flex items-center gap-1 tabular-nums",
                isOver ? "text-rose-600" : "text-stone"
              )}
            >
              <Clock className="size-3" />
              {isOver
                ? "Waktu habis"
                : days === 1
                ? "1 hari lagi"
                : `${days} hari lagi`}
            </span>
          )}
        </div>
        <div className="h-2 rounded-full bg-cream-200 overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              isAchieved ? "bg-teal" : isOver ? "bg-rose-500" : "bg-teal"
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Notes */}
      {goal.notes && (
        <div className="mt-2 rounded-md bg-cream-100/60 px-2.5 py-1.5 text-[11px] text-stone italic">
          “{goal.notes}”
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 7: Backup & Restore — JSON export/import for data safety & migration
// ─────────────────────────────────────────────────────────────────────────────
interface BackupCounts {
  products?: number;
  orders?: number;
  transactions?: number;
  customers?: number;
  leads?: number;
  content?: number;
  research?: number;
  campaigns?: number;
  inboxMessages?: number;
  goals?: number;
  receivables?: number;
  payables?: number;
  operationalCosts?: number;
}

interface ImportResult {
  imported: Record<string, number>;
  skipped: Record<string, number>;
}

// Fetch the export counts as a lightweight preview (HEAD-like via GET parse).
// We just want the `counts` field, so we parse JSON without persisting it.
function useExportPreview(brandId: string | null | undefined) {
  return useQuery<BackupCounts>({
    queryKey: ["export-preview", brandId],
    queryFn: async () => {
      if (!brandId) return {};
      // Reuse the export endpoint but only read counts; we re-fetch when the
      // user actually clicks download (separate fetch so the browser triggers
      // the attachment download).
      const res = await fetch(`/api/export?brandId=${encodeURIComponent(brandId)}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Gagal memuat preview");
      const json = (await res.json()) as { counts?: BackupCounts };
      return json.counts ?? {};
    },
    enabled: !!brandId,
    staleTime: 60_000, // 1 min — counts don't change that fast
    placeholderData: (prev) => prev,
  });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function BackupTab() {
  const { brands, activeBrandId } = useAppStore();
  const activeBrand = brands.find((b) => b.id === activeBrandId) ?? brands[0] ?? null;
  const { toast } = useToast();
  const qc = useQueryClient();

  // ── Export preview (counts) ──────────────────────────────────────────────
  const previewQ = useExportPreview(activeBrand?.id);
  const counts = previewQ.data ?? {};
  const totalRows = Object.values(counts).reduce((a, b) => a + (b ?? 0), 0);

  // ── Import state ──────────────────────────────────────────────────────────
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<unknown>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function refreshAll() {
    qc.invalidateQueries();
  }

  // ── Export handler — direct fetch (triggers attachment download) ──────────
  const exportMutation = useMutation({
    mutationFn: async () => {
      if (!activeBrand) throw new Error("Brand belum dipilih");
      const res = await fetch(
        `/api/export?brandId=${encodeURIComponent(activeBrand.id)}`,
        { cache: "no-store" }
      );
      if (!res.ok) {
        let msg = `Gagal export (${res.status})`;
        try {
          const e = await res.json();
          if (e?.error) msg = e.error;
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }
      // Pull filename from Content-Disposition header (fallback to default).
      const cd = res.headers.get("Content-Disposition") ?? "";
      const m = cd.match(/filename="?([^"]+)"?/i);
      const filename =
        m?.[1] ??
        `usahaku-backup-${activeBrand.slug}-${new Date().toISOString().slice(0, 10)}.json`;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    },
    onSuccess: () => {
      toast({
        title: "Backup berhasil diunduh 📥",
        description: "Simpan file JSON di tempat aman (cloud / flashdisk / email).",
      });
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : "Gagal export data";
      toast({ title: "Gagal export", description: msg, variant: "destructive" });
    },
  });

  // ── File selection + parse ────────────────────────────────────────────────
  async function handleFileSelected(f: File | null) {
    setFile(f);
    setParsed(null);
    setParseError(null);
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".json")) {
      setParseError("File harus berekstensi .json");
      return;
    }
    if (f.size > 25 * 1024 * 1024) {
      setParseError("Ukuran file melebihi 25 MB. Backup terlalu besar.");
      return;
    }
    try {
      const text = await f.text();
      const json = JSON.parse(text);
      if (!json || typeof json !== "object" || !("data" in json)) {
        setParseError("Format backup tidak valid: field 'data' tidak ditemukan.");
        return;
      }
      if (json.version && json.version !== "1.0") {
        setParseError(`Versi backup "${json.version}" tidak didukung (hanya "1.0").`);
        return;
      }
      setParsed(json);
    } catch {
      setParseError("File bukan JSON valid. Pastikan file backup tidak rusak.");
    }
  }

  // ── Import mutation ───────────────────────────────────────────────────────
  const importMutation = useMutation({
    mutationFn: async () => {
      if (!activeBrand) throw new Error("Brand belum dipilih");
      if (!parsed) throw new Error("Belum ada file backup yang valid");
      return api<ImportResult>("/api/import", {
        method: "POST",
        json: { brandId: activeBrand.id, data: parsed },
      });
    },
    onSuccess: (data) => {
      const imported = data.imported ?? {};
      const skipped = data.skipped ?? {};
      const totalImported = Object.values(imported).reduce((a, b) => a + (b ?? 0), 0);
      const totalSkipped = Object.values(skipped).reduce((a, b) => a + (b ?? 0), 0);
      // Build a concise summary line.
      const parts: string[] = [];
      if (imported.products) parts.push(`${imported.products} produk`);
      if (imported.customers) parts.push(`${imported.customers} customer`);
      if (imported.orders) parts.push(`${imported.orders} order`);
      if (imported.transactions) parts.push(`${imported.transactions} transaksi`);
      if (imported.leads) parts.push(`${imported.leads} leads`);
      if (imported.content) parts.push(`${imported.content} konten`);
      if (imported.research) parts.push(`${imported.research} riset`);
      const summary = parts.length > 0 ? parts.join(" · ") : "Tidak ada data baru.";
      toast({
        title: `Import selesai ✅ (${totalImported} baris)`,
        description:
          totalSkipped > 0
            ? `${summary}. ${totalSkipped} baris dilewati (sudah ada).`
            : summary,
      });
      // Reset state.
      setFile(null);
      setParsed(null);
      setParseError(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setConfirmOpen(false);
      refreshAll();
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : "Gagal import data";
      toast({ title: "Gagal import", description: msg, variant: "destructive" });
      setConfirmOpen(false);
    },
  });

  if (!activeBrand) {
    return (
      <SectionCard title="Backup & Restore">
        <EmptyState
          icon={<Database className="size-6 text-stone" />}
          title="Belum ada brand aktif"
          desc="Buat brand dulu di tab Brand untuk mengelola backup data."
        />
      </SectionCard>
    );
  }

  const exporting = exportMutation.isPending;
  const importing = importMutation.isPending;

  return (
    <SectionCard
      title="Backup & Restore"
      desc={`Export / import semua data brand "${activeBrand.name}" sebagai file JSON.`}
      right={
        <Badge variant="outline" className="text-[10px] gap-1 border-teal/30 text-teal">
          <ShieldCheck className="size-3" /> Backup
        </Badge>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ── Card 1: Export Data (teal) ─────────────────────────────────── */}
        <div className="rounded-2xl border border-teal/20 bg-gradient-to-b from-teal-50/60 to-card p-5 flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <div className="size-11 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center shrink-0">
              <Download className="size-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-ink">Export Data</h3>
              <p className="text-xs text-stone mt-1 leading-snug">
                Download semua data brand (produk, order, customer, transaksi,
                konten, riset, dll) sebagai file JSON backup.
              </p>
            </div>
          </div>

          {/* Counts preview */}
          <div className="rounded-lg bg-card border border-border p-3">
            {previewQ.isLoading ? (
              <div className="flex items-center gap-2 text-xs text-stone">
                <Loader2 className="size-3.5 animate-spin" /> Menghitung data…
              </div>
            ) : previewQ.isError ? (
              <div className="text-xs text-rose-600">Gagal memuat preview data.</div>
            ) : totalRows === 0 ? (
              <div className="text-xs text-stone">
                Brand ini belum punya data. Export akan menghasilkan file kosong.
              </div>
            ) : (
              <div className="text-xs text-stone leading-relaxed">
                <span className="font-semibold text-ink">Estimasi isi backup:</span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {counts.products ? (
                    <Badge variant="secondary" className="text-[10px] gap-1">
                      📦 {counts.products} produk
                    </Badge>
                  ) : null}
                  {counts.orders ? (
                    <Badge variant="secondary" className="text-[10px] gap-1">
                      🛒 {counts.orders} order
                    </Badge>
                  ) : null}
                  {counts.transactions ? (
                    <Badge variant="secondary" className="text-[10px] gap-1">
                      💰 {counts.transactions} transaksi
                    </Badge>
                  ) : null}
                  {counts.customers ? (
                    <Badge variant="secondary" className="text-[10px] gap-1">
                      👤 {counts.customers} customer
                    </Badge>
                  ) : null}
                  {counts.leads ? (
                    <Badge variant="secondary" className="text-[10px] gap-1">
                      👥 {counts.leads} leads
                    </Badge>
                  ) : null}
                  {counts.content ? (
                    <Badge variant="secondary" className="text-[10px] gap-1">
                      📝 {counts.content} konten
                    </Badge>
                  ) : null}
                  {counts.research ? (
                    <Badge variant="secondary" className="text-[10px] gap-1">
                      🔍 {counts.research} riset
                    </Badge>
                  ) : null}
                </div>
                <div className="mt-2 text-[11px] text-stone/80">
                  Total ±{totalRows.toLocaleString("id-ID")} baris data.
                </div>
              </div>
            )}
          </div>

          <Button
            className="bg-teal hover:bg-teal-600 text-white gap-1.5 mt-1"
            onClick={() => exportMutation.mutate()}
            disabled={exporting || importing}
          >
            {exporting ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Menyiapkan…
              </>
            ) : (
              <>
                <Download className="size-4" /> Download Backup JSON
              </>
            )}
          </Button>
        </div>

        {/* ── Card 2: Import Data (amber) ────────────────────────────────── */}
        <div className="rounded-2xl border border-amber-200 bg-gradient-to-b from-amber-50/60 to-card p-5 flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <div className="size-11 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
              <Upload className="size-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-ink">Import Data</h3>
              <p className="text-xs text-stone mt-1 leading-snug">
                Restore data dari file JSON backup. Data yang sudah ada{" "}
                <strong>TIDAK akan ditimpa</strong> — hanya data baru yang
                ditambahkan.
              </p>
            </div>
          </div>

          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 flex items-start gap-2">
            <AlertTriangle className="size-3.5 mt-0.5 shrink-0" />
            <span>
              Import akan menambahkan data ke brand{" "}
              <strong>{activeBrand.name}</strong>. Produk dengan nama sama &
              customer dengan nomor HP sama akan <strong>dilewati</strong>.
            </span>
          </div>

          {/* Hidden file input + button row */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              void handleFileSelected(f);
            }}
          />

          {/* Selected file preview / errors */}
          {file && (
            <div className="rounded-lg bg-card border border-border p-3 space-y-1.5">
              <div className="flex items-center gap-2 text-xs">
                <FileJson className="size-4 text-amber-600 shrink-0" />
                <span className="font-semibold text-ink truncate flex-1">{file.name}</span>
                <span className="text-stone tabular-nums">{formatBytes(file.size)}</span>
              </div>
              {parseError ? (
                <div className="text-[11px] text-rose-600 flex items-start gap-1.5">
                  <AlertTriangle className="size-3 mt-0.5 shrink-0" />
                  <span>{parseError}</span>
                </div>
              ) : parsed ? (
                <div className="text-[11px] text-emerald-700 flex items-center gap-1.5">
                  <Check className="size-3" />
                  <span>
                    File valid ·{" "}
                    {(() => {
                      const c =
                        ((parsed as { counts?: Record<string, number> }).counts) ?? {};
                      const n = Object.values(c).reduce((a, b) => a + (b ?? 0), 0);
                      return `${n.toLocaleString("id-ID")} baris siap diimpor`;
                    })()}
                  </span>
                </div>
              ) : (
                <div className="text-[11px] text-stone flex items-center gap-1.5">
                  <Loader2 className="size-3 animate-spin" />
                  <span>Memproses file…</span>
                </div>
              )}
            </div>
          )}

          {/* Action row */}
          <div className="flex flex-wrap gap-2 mt-1">
            <Button
              variant="outline"
              className="gap-1.5"
              onClick={() => fileInputRef.current?.click()}
              disabled={exporting || importing}
            >
              <FileJson className="size-4" /> Pilih File
            </Button>

            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  className="bg-amber-500 hover:bg-amber-600 text-white gap-1.5"
                  disabled={!parsed || exporting || importing}
                >
                  {importing ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Mengimpor…
                    </>
                  ) : (
                    <>
                      <Upload className="size-4" /> Import
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Yakin import data dari “{file?.name}”?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Data akan ditambahkan ke brand{" "}
                    <strong>{activeBrand.name}</strong>. Data existing{" "}
                    <strong>tidak akan ditimpa</strong> — produk/customer yang
                    sudah ada akan dilewati. Proses tidak bisa dibatalkan
                    setelah dimulai.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={importing}>Batal</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e) => {
                      e.preventDefault();
                      importMutation.mutate();
                    }}
                    disabled={importing}
                    className="bg-amber-500 hover:bg-amber-600 text-white gap-1.5"
                  >
                    {importing ? (
                      <>
                        <Loader2 className="size-4 animate-spin" /> Mengimpor…
                      </>
                    ) : (
                      <>
                        <Upload className="size-4" /> Ya, Import
                      </>
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      {/* ── Info Card (stone/muted) ────────────────────────────────────── */}
      <div className="mt-4 rounded-xl border border-dashed border-border bg-cream-100/50 p-4 flex items-start gap-3">
        <div className="size-9 rounded-lg bg-cream-200 text-stone flex items-center justify-center shrink-0">
          <Info className="size-4" />
        </div>
        <div className="text-xs text-stone leading-relaxed">
          <strong className="text-ink">Tips backup berkala:</strong> lakukan
          backup mingguan untuk keamanan data. Simpan file JSON di tempat aman
          (Google Drive, email, flashdisk). Import bisa dipakai untuk pindah
          data <strong>antar brand</strong> atau <strong>antar device</strong>{" "}
          — cukup export dari satu brand, lalu import ke brand lain. Backup
          tidak menyertakan data sensitif seperti password atau saldo kredit.
        </div>
      </div>
    </SectionCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hub sub‑views — each gets a back button and full‑width content
// ─────────────────────────────────────────────────────────────────────────────

function HubBackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-sm text-teal hover:text-teal-600 font-medium mb-4 transition-colors"
    >
      <ArrowLeft className="size-4" /> Kembali
    </button>
  );
}

function HubSubView({ title, children, onBack }: { title: string; children: React.ReactNode; onBack: () => void }) {
  return (
    <div className="space-y-4">
      <HubBackButton onClick={onBack} />
      <h2 className="text-lg font-bold text-ink">{title}</h2>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hub item: Aktivitas (inline — last 5 activities)
// ─────────────────────────────────────────────────────────────────────────────
function AktivitasHubContent() {
  const activeBrand = getActiveBrand(useAppStore.getState());
  const { data, isLoading } = useQuery({
    queryKey: ["activity", "recent", activeBrand?.id],
    queryFn: () => api<{ rows: any[] }>(`/api/activity?brandId=${activeBrand?.id}&limit=5`),
    enabled: !!activeBrand?.id,
  });

  if (isLoading) {
    return (
      <SectionCard>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      </SectionCard>
    );
  }

  if (!data?.rows?.length) {
    return <SectionCard><EmptyState icon="📋" title="Belum ada aktivitas" message="Aktivitas terbaru akan muncul di sini" /></SectionCard>;
  }

  return (
    <SectionCard>
      <div className="space-y-1">
        {data.rows.map((a: any) => (
          <div key={a.id} className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-cream-100 transition-colors">
            <div className="size-8 rounded-lg bg-teal-50 text-teal flex items-center justify-center shrink-0 text-sm">
              {a.icon ?? "📌"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-ink truncate">{a.description ?? a.action ?? "Aktivitas"}</div>
              <div className="text-[10px] text-stone">{a.createdAt ? timeAgo(a.createdAt) : "—"}</div>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hub item: Bantuan (inline — quick FAQ)
// ─────────────────────────────────────────────────────────────────────────────
function BantuanHubContent() {
  return (
    <SectionCard>
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="1">
          <AccordionTrigger className="text-sm font-medium">Apa itu usahaku.ai?</AccordionTrigger>
          <AccordionContent className="text-sm text-stone leading-relaxed">
            usahaku.ai adalah AI Co-pilot untuk UMKM Indonesia. Bantu riset pasar, buat konten pemasaran, kelola toko, dan analisa keuangan — semua dalam satu platform.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="2">
          <AccordionTrigger className="text-sm font-medium">Bagaimana cara top‑up credit?</AccordionTrigger>
          <AccordionContent className="text-sm text-stone leading-relaxed">
            Buka menu Credit di Pengaturan, pilih paket yang diinginkan, dan lakukan pembayaran. Credit akan langsung masuk ke akun Anda.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="3">
          <AccordionTrigger className="text-sm font-medium">Bagaimana cara ganti brand?</AccordionTrigger>
          <AccordionContent className="text-sm text-stone leading-relaxed">
            Klik nama brand di bagian bawah menu Pengaturan, lalu pilih brand yang ingin digunakan. Anda juga bisa tambah brand baru dari menu Brand.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="4">
          <AccordionTrigger className="text-sm font-medium">Apakah data saya aman?</AccordionTrigger>
          <AccordionContent className="text-sm text-stone leading-relaxed">
            Data Anda disimpan dengan aman di server terenkripsi. Kami juga menyediakan fitur Backup & Restore untuk keamanan ekstra. Data sensitif seperti password tidak disimpan dalam backup.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="5">
          <AccordionTrigger className="text-sm font-medium">Bagaimana cara memulai tur?</AccordionTrigger>
          <AccordionContent className="text-sm text-stone leading-relaxed">
            Klik tombol "Mulai Tur" di halaman ini atau buka halaman Bantuan untuk panduan lengkap. Tur interaktif akan memandu Anda melalui semua fitur utama.
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="mt-4 flex flex-col gap-2">
        <Button variant="outline" className="gap-2 justify-start" onClick={() => startTour()}>
          <Sparkles className="size-4 text-teal" /> Mulai Tur Interaktif
        </Button>
        <Button variant="outline" className="gap-2 justify-start" asChild>
          <a href="mailto:support@usahaku.ai">
            <Mail className="size-4 text-teal" /> Hubungi Support
          </a>
        </Button>
      </div>
    </SectionCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar‑style hub menu
// ─────────────────────────────────────────────────────────────────────────────

interface HubItem {
  key: string;
  icon: string;
  label: string;
  badge?: React.ReactNode;
}

function HubMenuRow({
  item,
  onClick,
}: {
  item: HubItem;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left text-ink hover:bg-cream-100"
    >
      <span className="text-lg shrink-0">{item.icon}</span>
      <span className="flex-1">{item.label}</span>
      {item.badge && <span className="shrink-0">{item.badge}</span>}
      <ChevronDown className="size-3.5 -rotate-90 text-cream-400 shrink-0" />
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main section
// ─────────────────────────────────────────────────────────────────────────────
export function PengaturanSection() {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const { user, logout } = useAppStore();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  // ── Sub‑view routing ────────────────────────────────────────────────
  if (activeMenu) {
    const back = () => setActiveMenu(null);

    switch (activeMenu) {
      case "profil":
        return <HubSubView title="Profil" onBack={back}><ProfilTab /></HubSubView>;
      case "brand":
        return <HubSubView title="Brand" onBack={back}><BrandTab /></HubSubView>;
      case "tone":
        return <HubSubView title="Tone of Voice" onBack={back}><ToneTab /></HubSubView>;
      case "aktivitas":
        return <HubSubView title="Aktivitas" onBack={back}><AktivitasHubContent /></HubSubView>;
      case "target":
        return <HubSubView title="Target Bisnis" onBack={back}><TargetTab /></HubSubView>;
      case "bantuan":
        return <HubSubView title="Bantuan" onBack={back}><BantuanHubContent /></HubSubView>;
      case "backup":
        return <HubSubView title="Backup & Restore" onBack={back}><BackupTab /></HubSubView>;
      default:
        setActiveMenu(null);
        return null;
    }
  }

  // ── Hub menu items ──────────────────────────────────────────────────
  // Credit and Notifikasi are deliberately not in this list — each already
  // has one dedicated entry point (topbar credit chip, topbar bell icon).
  // Adding them here too would just be a second door to the same room.
  const menuItems: HubItem[] = [
    { key: "profil", icon: "👤", label: "Profil" },
    { key: "brand", icon: "📦", label: "Brand" },
    { key: "tone", icon: "🎨", label: "Tone Suara" },
    { key: "aktivitas", icon: "📋", label: "Aktivitas" },
    { key: "target", icon: "🎯", label: "Target Bisnis" },
    { key: "bantuan", icon: "❓", label: "Bantuan" },
    { key: "backup", icon: "💾", label: "Backup & Restore" },
  ];

  async function handleLogout() {
    try {
      await api("/api/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
    logout();
    toast({ title: "Berhasil logout", description: "Sampai jumpa lagi! 👋" });
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Pengaturan" icon="⚙️" subtitle="Semua pengaturan dalam satu tempat" />

      {/* ── Sidebar‑style hub menu ────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* User info at top */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-cream-50/50">
          <div className="size-10 rounded-full bg-gradient-to-br from-teal to-teal-600 text-white text-sm font-bold flex items-center justify-center shrink-0">
            {user?.name?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-ink truncate">{user?.name ?? "Pengguna"}</div>
            <div className="text-[11px] text-stone truncate">{user?.email ?? "—"}</div>
          </div>
        </div>

        {/* Menu items */}
        <div className="p-2 space-y-0.5">
          {menuItems.map((item) => (
            <HubMenuRow
              key={item.key}
              item={item}
              onClick={() => setActiveMenu(item.key)}
            />
          ))}
        </div>

        {/* Divider */}
        <div className="h-px bg-border mx-3" />

        {/* Bottom section: theme + brand + logout */}
        <div className="p-3 space-y-2">
          {/* Theme toggle */}
          <div className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-cream-100 transition-colors">
            <div className="flex items-center gap-3">
              <span className="text-lg">{theme === "dark" ? "🌙" : "🌞"}</span>
              <span className="text-sm font-medium text-ink">Tema</span>
            </div>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="relative inline-flex h-6 w-10 items-center rounded-full transition-colors bg-cream-300"
            >
              <span
                className={`inline-block size-5 rounded-full bg-white shadow-sm transition-transform ${
                  theme === "dark" ? "translate-x-[18px]" : "translate-x-[2px]"
                }`}
              />
            </button>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors text-left"
          >
            <LogOut className="size-4" />
            <span>Keluar</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default PengaturanSection;
