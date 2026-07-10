"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { StatCard, SectionCard, EmptyState } from "@/components/nw/primitives";
import { Plus, Repeat, CalendarDays, Receipt } from "lucide-react";
import { api } from "@/lib/api";
import { formatRupiah, formatRupiahShort } from "@/lib/constants";
import { OP_CATEGORY_LABELS, type OperationalCostRow, type OperationalStats } from "./types";

const OP_CATEGORIES = Object.entries(OP_CATEGORY_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export function BiayaOperasionalTab({ brandId }: { brandId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery<{
    operationalCosts: OperationalCostRow[];
    stats: OperationalStats;
  }>({
    queryKey: ["keuangan-operational-costs", brandId],
    queryFn: () => api(`/api/operational-costs?brandId=${brandId}`),
    enabled: !!brandId,
  });

  const items = data?.operationalCosts ?? [];
  const stats = data?.stats ?? {
    totalThisMonth: 0,
    totalMonthlyRecurring: 0,
    countThisMonth: 0,
    countRecurring: 0,
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Bulan Ini"
          value={formatRupiahShort(stats.totalThisMonth)}
          icon={<CalendarDays className="size-4" />}
          accent="warning"
        />
        <StatCard
          label="Rutin / Bulan"
          value={formatRupiahShort(stats.totalMonthlyRecurring)}
          icon={<Repeat className="size-4" />}
          accent="teal"
        />
        <StatCard
          label="Item Bulan Ini"
          value={stats.countThisMonth}
          icon={<Receipt className="size-4" />}
          accent="stone"
        />
        <StatCard
          label="Item Rutin"
          value={stats.countRecurring}
          icon={<Repeat className="size-4" />}
          accent="orange"
        />
      </div>

      <SectionCard
        title="Biaya Operasional"
        desc="Setiap biaya otomatis jadi transaksi expense (kategori: operasional)"
        right={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-teal hover:bg-teal-600 h-8">
                <Plus className="size-3.5" /> Tambah
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[440px]">
              <BiayaForm
                brandId={brandId}
                onClose={() => setOpen(false)}
                onCreated={() => {
                  qc.invalidateQueries({ queryKey: ["keuangan-operational-costs"] });
                  qc.invalidateQueries({ queryKey: ["keuangan-transactions"] });
                  qc.invalidateQueries({ queryKey: ["keuangan-summary"] });
                }}
              />
            </DialogContent>
          </Dialog>
        }
        bodyClassName="p-0"
      >
        {isLoading ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon="🧾"
              title="Belum ada biaya operasional"
              desc="Catat sewa, listrik, gaji, atau biaya rutin lainnya. Setiap entri otomatis masuk ke P&L."
            />
          </div>
        ) : (
          <div className="divide-y divide-border max-h-[480px] overflow-y-auto">
            {items.map((it) => (
              <div key={it.id} className="px-4 py-3 hover:bg-cream-100/40 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-ink">
                      {OP_CATEGORY_LABELS[it.category] ?? it.category}
                    </span>
                    {it.recurring && (
                      <Badge className="bg-teal-100 text-teal-700 border-teal-200 border">
                        <Repeat className="size-3" /> Rutin
                      </Badge>
                    )}
                  </div>
                  <div className="text-[11px] text-stone mt-0.5">
                    {new Date(it.date).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </div>
                </div>
                <div className="text-sm font-bold tabular-nums text-rose-700 shrink-0">
                  −{formatRupiah(it.amount)}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function BiayaForm({
  brandId,
  onClose,
  onCreated,
}: {
  brandId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [category, setCategory] = useState<string>("Sewa");
  const [amount, setAmount] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error("Jumlah harus angka > 0");
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
          date,
          description: description.trim() || null,
        },
      });
      toast.success("Biaya operasional ditambahkan");
      onCreated();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Tambah Biaya Operasional</DialogTitle>
        <DialogDescription>
          Biaya ini otomatis masuk sebagai transaksi pengeluaran kategori operasional.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-3 py-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="mb-1.5">Kategori</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full h-9" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OP_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1.5">Tanggal</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9" />
          </div>
        </div>
        <div>
          <Label className="mb-1.5">Jumlah (Rp)</Label>
          <Input
            type="number"
            inputMode="numeric"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-9 text-base font-bold"
          />
        </div>
        <div>
          <Label className="mb-1.5">Deskripsi (opsional)</Label>
          <Input
            placeholder="Contoh: Sewa kiosk bulan Juli"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="h-9"
          />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
          <div>
            <div className="text-sm font-medium text-ink">Biaya Rutin (Bulanan)</div>
            <div className="text-[11px] text-stone">Centang bila berulang setiap bulan</div>
          </div>
          <Switch checked={recurring} onCheckedChange={setRecurring} />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={saving}>
          Batal
        </Button>
        <Button className="bg-teal hover:bg-teal-600" onClick={submit} disabled={saving}>
          {saving ? "Menyimpan..." : "Simpan"}
        </Button>
      </DialogFooter>
    </>
  );
}
