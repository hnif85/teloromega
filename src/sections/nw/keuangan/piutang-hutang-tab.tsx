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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionCard, EmptyState } from "@/components/nw/primitives";
import { Plus, CheckCircle2, AlertTriangle, Users, Truck } from "lucide-react";
import { api } from "@/lib/api";
import { formatRupiah } from "@/lib/constants";
import type { ReceivableRow, PayableRow } from "./types";

function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
}

function statusBadge(status: ReceivableRow["status"]) {
  if (status === "paid")
    return (
      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 border">
        <CheckCircle2 className="size-3" /> Lunas
      </Badge>
    );
  if (status === "overdue")
    return (
      <Badge className="bg-rose-100 text-rose-700 border-rose-200 border">
        <AlertTriangle className="size-3" /> Terlambat
      </Badge>
    );
  return (
    <Badge className="bg-amber-100 text-amber-700 border-amber-200 border">Outstanding</Badge>
  );
}

export function PiutangHutangTab({ brandId }: { brandId: string }) {
  const qc = useQueryClient();

  const { data: recvData, isLoading: recvLoading } = useQuery<{ receivables: ReceivableRow[] }>({
    queryKey: ["keuangan-receivables", brandId],
    queryFn: () => api(`/api/receivables?brandId=${brandId}`),
    enabled: !!brandId,
  });
  const { data: payData, isLoading: payLoading } = useQuery<{ payables: PayableRow[] }>({
    queryKey: ["keuangan-payables", brandId],
    queryFn: () => api(`/api/payables?brandId=${brandId}`),
    enabled: !!brandId,
  });

  const receivables = recvData?.receivables ?? [];
  const payables = payData?.payables ?? [];

  const totalReceivable = receivables.filter((r) => r.status !== "paid").reduce((s, r) => s + r.amount, 0);
  const totalPayable = payables.filter((p) => p.status !== "paid").reduce((s, p) => s + p.amount, 0);

  const markPaidRecv = useMutation({
    mutationFn: (id: string) =>
      api(`/api/receivables/${id}`, { method: "PATCH", json: { status: "paid" } }),
    onSuccess: () => {
      toast.success("Piutang ditandai lunas — transaksi income dibuat");
      qc.invalidateQueries({ queryKey: ["keuangan-receivables"] });
      qc.invalidateQueries({ queryKey: ["keuangan-transactions"] });
      qc.invalidateQueries({ queryKey: ["keuangan-summary"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal"),
  });
  const markPaidPay = useMutation({
    mutationFn: (id: string) =>
      api(`/api/payables/${id}`, { method: "PATCH", json: { status: "paid" } }),
    onSuccess: () => {
      toast.success("Hutang ditandai lunas — transaksi expense dibuat");
      qc.invalidateQueries({ queryKey: ["keuangan-payables"] });
      qc.invalidateQueries({ queryKey: ["keuangan-transactions"] });
      qc.invalidateQueries({ queryKey: ["keuangan-summary"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal"),
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* PIUTANG */}
      <SectionCard
        title="📥 Piutang"
        desc="Tagihan ke customer yang belum dibayar"
        right={
          <AddReceivableButton
            brandId={brandId}
            onCreated={() => qc.invalidateQueries({ queryKey: ["keuangan-receivables"] })}
          />
        }
      >
        <div className="mb-3 rounded-xl bg-teal-50 border border-teal-200 px-3 py-2 flex items-center justify-between">
          <span className="text-xs text-teal-700 font-medium">Total piutang berjalan</span>
          <span className="text-base font-extrabold text-teal-700 tabular-nums">
            {formatRupiah(totalReceivable)}
          </span>
        </div>

        {recvLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : receivables.length === 0 ? (
          <div className="py-6 text-center">
            <Users className="size-8 text-stone mx-auto mb-2" />
            <p className="text-sm text-stone">Belum ada piutang tercatat</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {receivables.map((r) => (
              <div
                key={r.id}
                className={`rounded-xl border p-3 ${
                  r.status === "overdue"
                    ? "border-rose-200 bg-rose-50"
                    : r.status === "paid"
                    ? "border-border bg-cream-100/40 opacity-70"
                    : "border-border bg-background"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-ink truncate">
                        {r.customerName}
                      </span>
                      {statusBadge(r.status)}
                    </div>
                    {r.customer?.phone && (
                      <div className="text-[11px] text-stone mt-0.5">{r.customer.phone}</div>
                    )}
                    <div className="text-[11px] text-stone mt-0.5">
                      Jatuh tempo: {fmtDate(r.dueDate)}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-extrabold text-ink tabular-nums">
                      {formatRupiah(r.amount)}
                    </div>
                    {r.status !== "paid" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 mt-1 text-[11px] border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                        disabled={markPaidRecv.isPending}
                        onClick={() => markPaidRecv.mutate(r.id)}
                      >
                        Tandai Lunas
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* HUTANG */}
      <SectionCard
        title="📤 Hutang"
        desc="Tagihan ke supplier yang belum dibayar"
        right={
          <AddPayableButton
            brandId={brandId}
            onCreated={() => qc.invalidateQueries({ queryKey: ["keuangan-payables"] })}
          />
        }
      >
        <div className="mb-3 rounded-xl bg-orange-50 border border-orange-200 px-3 py-2 flex items-center justify-between">
          <span className="text-xs text-orange-700 font-medium">Total hutang berjalan</span>
          <span className="text-base font-extrabold text-orange-700 tabular-nums">
            {formatRupiah(totalPayable)}
          </span>
        </div>

        {payLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : payables.length === 0 ? (
          <div className="py-6 text-center">
            <Truck className="size-8 text-stone mx-auto mb-2" />
            <p className="text-sm text-stone">Belum ada hutang tercatat</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {payables.map((p) => (
              <div
                key={p.id}
                className={`rounded-xl border p-3 ${
                  p.status === "overdue"
                    ? "border-rose-200 bg-rose-50"
                    : p.status === "paid"
                    ? "border-border bg-cream-100/40 opacity-7"
                    : "border-border bg-background"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-ink truncate">
                        {p.supplierName}
                      </span>
                      {statusBadge(p.status)}
                    </div>
                    <div className="text-[11px] text-stone mt-0.5">
                      Jatuh tempo: {fmtDate(p.dueDate)}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-extrabold text-ink tabular-nums">
                      {formatRupiah(p.amount)}
                    </div>
                    {p.status !== "paid" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 mt-1 text-[11px] border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                        disabled={markPaidPay.isPending}
                        onClick={() => markPaidPay.mutate(p.id)}
                      >
                        Tandai Lunas
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function AddReceivableButton({
  brandId,
  onCreated,
}: {
  brandId: string;
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-teal hover:bg-teal-600 h-8">
          <Plus className="size-3.5" /> Piutang
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[420px]">
        <ReceivableForm
          brandId={brandId}
          onClose={() => setOpen(false)}
          onCreated={onCreated}
        />
      </DialogContent>
    </Dialog>
  );
}

function AddPayableButton({
  brandId,
  onCreated,
}: {
  brandId: string;
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white h-8">
          <Plus className="size-3.5" /> Hutang
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[420px]">
        <PayableForm
          brandId={brandId}
          onClose={() => setOpen(false)}
          onCreated={onCreated}
        />
      </DialogContent>
    </Dialog>
  );
}

function ReceivableForm({
  brandId,
  onClose,
  onCreated,
}: {
  brandId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [customerName, setCustomerName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  );
  const [saving, setSaving] = useState(false);

  async function submit() {
    const amt = Number(amount);
    if (!customerName.trim() || !Number.isFinite(amt) || amt <= 0) {
      toast.error("Nama customer dan jumlah wajib");
      return;
    }
    setSaving(true);
    try {
      await api("/api/receivables", {
        method: "POST",
        json: { brandId, customerName: customerName.trim(), amount: amt, dueDate },
      });
      toast.success("Piutang ditambahkan");
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
        <DialogTitle>Tambah Piutang</DialogTitle>
        <DialogDescription>Tagihan ke customer yang akan jatuh tempo.</DialogDescription>
      </DialogHeader>
      <div className="space-y-3 py-2">
        <div>
          <Label className="mb-1.5">Nama Customer</Label>
          <Input
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Contoh: Toko Berkah"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="mb-1.5">Jumlah (Rp)</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
            />
          </div>
          <div>
            <Label className="mb-1.5">Jatuh Tempo</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
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

function PayableForm({
  brandId,
  onClose,
  onCreated,
}: {
  brandId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [supplierName, setSupplierName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
  );
  const [saving, setSaving] = useState(false);

  async function submit() {
    const amt = Number(amount);
    if (!supplierName.trim() || !Number.isFinite(amt) || amt <= 0) {
      toast.error("Nama supplier dan jumlah wajib");
      return;
    }
    setSaving(true);
    try {
      await api("/api/payables", {
        method: "POST",
        json: { brandId, supplierName: supplierName.trim(), amount: amt, dueDate },
      });
      toast.success("Hutang ditambahkan");
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
        <DialogTitle>Tambah Hutang</DialogTitle>
        <DialogDescription>Tagihan ke supplier yang akan jatuh tempo.</DialogDescription>
      </DialogHeader>
      <div className="space-y-3 py-2">
        <div>
          <Label className="mb-1.5">Nama Supplier</Label>
          <Input
            value={supplierName}
            onChange={(e) => setSupplierName(e.target.value)}
            placeholder="Contoh: PD Berkat Jaya"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="mb-1.5">Jumlah (Rp)</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
            />
          </div>
          <div>
            <Label className="mb-1.5">Jatuh Tempo</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={saving}>
          Batal
        </Button>
        <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={submit} disabled={saving}>
          {saving ? "Menyimpan..." : "Simpan"}
        </Button>
      </DialogFooter>
    </>
  );
}
