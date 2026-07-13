"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Package,
  CheckCircle2,
  Clock,
  Truck,
  MapPin,
  XCircle,
} from "lucide-react";

interface TrackingHistory {
  date: string;
  desc: string;
  status: string;
}

interface TrackingSummary {
  awb: string;
  courier: string;
  service: string;
  status: string;
  date: string;
}

interface TrackingResult {
  found: boolean;
  summary: TrackingSummary | null;
  history: TrackingHistory[];
}

const COURIERS = [
  { code: "jne", name: "JNE" },
  { code: "sicepat", name: "SiCepat" },
  { code: "jnt", name: "J&T" },
  { code: "ninja", name: "Ninja" },
  { code: "tiki", name: "TIKI" },
  { code: "lion", name: "Lion" },
  { code: "anteraja", name: "AnterAja" },
  { code: "pos", name: "POS" },
];

const STATUS_MAP: Record<string, { icon: typeof CheckCircle2; color: string; bg: string }> = {
  delivered: { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
  on_delivery: { icon: Truck, color: "text-blue-600", bg: "bg-blue-50" },
  in_transit: { icon: Truck, color: "text-blue-600", bg: "bg-blue-50" },
  processing: { icon: Package, color: "text-amber-600", bg: "bg-amber-50" },
  pending: { icon: Clock, color: "text-stone", bg: "bg-stone-50" },
  failed: { icon: XCircle, color: "text-rose-600", bg: "bg-rose-50" },
};

function getStatusStyle(status: string) {
  const key = status?.toLowerCase().replace(/\s+/g, "_") ?? "pending";
  return STATUS_MAP[key] ?? STATUS_MAP.pending;
}

export function ShippingTracker() {
  const { toast } = useToast();
  const [awb, setAwb] = useState("");
  const [courier, setCourier] = useState("");
  const [result, setResult] = useState<TrackingResult | null>(null);

  const trackMutation = useMutation({
    mutationFn: () =>
      api<TrackingResult>("/api/shipping/track", {
        method: "POST",
        json: { awb, courier },
      }),
    onSuccess: (res) => {
      setResult(res);
      if (!res.found) {
        toast({ title: "Paket tidak ditemukan", description: "Periksa nomor resi dan kurir", variant: "destructive" });
      }
    },
    onError: (e: Error) =>
      toast({ title: "Gagal lacak", description: e.message, variant: "destructive" }),
  });

  function handleTrack() {
    if (!awb.trim()) {
      toast({ title: "Nomor resi wajib diisi", variant: "destructive" });
      return;
    }
    if (!courier) {
      toast({ title: "Pilih kurir", variant: "destructive" });
      return;
    }
    trackMutation.mutate();
  }

  const statusStyle = result?.summary ? getStatusStyle(result.summary.status) : null;

  return (
    <div className="space-y-4">
      {/* AWB input */}
      <div>
        <Label className="text-xs text-stone">Nomor Resi / AWB</Label>
        <div className="relative mt-1">
          <Package className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-stone" />
          <Input
            placeholder="Masukkan nomor resi..."
            value={awb}
            onChange={(e) => setAwb(e.target.value.toUpperCase())}
            className="pl-9 font-mono"
            onKeyDown={(e) => e.key === "Enter" && handleTrack()}
          />
        </div>
      </div>

      {/* Courier select */}
      <div>
        <Label className="text-xs text-stone">Kurir</Label>
        <div className="grid grid-cols-4 gap-1.5 mt-1">
          {COURIERS.map((c) => (
            <button
              key={c.code}
              className={`px-2 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                courier === c.code
                  ? "border-teal bg-teal-50 text-teal"
                  : "border-border bg-card text-stone hover:border-stone-300"
              }`}
              onClick={() => setCourier(c.code)}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Track button */}
      <Button
        onClick={handleTrack}
        disabled={trackMutation.isPending}
        className="w-full bg-teal hover:bg-teal-600"
      >
        <Search className="size-4 mr-2" />
        {trackMutation.isPending ? "Melacak..." : "Lacak Paket"}
      </Button>

      {/* Results */}
      {result?.found && result.summary && (
        <div className="space-y-4">
          {/* Status card */}
          <div className={`p-4 rounded-xl ${statusStyle?.bg} border border-transparent`}>
            <div className="flex items-center gap-3">
              {statusStyle && (
                <statusStyle.icon className={`size-8 ${statusStyle.color}`} />
              )}
              <div className="flex-1">
                <div className={`text-lg font-extrabold capitalize ${statusStyle?.color}`}>
                  {result.summary.status?.replace(/_/g, " ")}
                </div>
                <div className="text-sm text-stone mt-0.5">
                  {result.summary.courier.toUpperCase()} · {result.summary.service}
                </div>
                <div className="text-xs text-stone mt-0.5">
                  Resi: <span className="font-mono">{result.summary.awb}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline */}
          {result.history.length > 0 && (
            <div className="space-y-0">
              <div className="text-xs font-semibold text-stone uppercase tracking-wider mb-3">
                Riwayat Pengiriman
              </div>
              {result.history.map((h, idx) => {
                const hStyle = getStatusStyle(h.status);
                const isFirst = idx === 0;
                return (
                  <div key={idx} className="flex gap-3 pb-4 relative">
                    {/* Timeline line */}
                    {idx < result.history.length - 1 && (
                      <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-border" />
                    )}
                    {/* Dot */}
                    <div
                      className={`size-6 rounded-full flex items-center justify-center shrink-0 ${
                        isFirst ? `${hStyle.bg}` : "bg-muted"
                      }`}
                    >
                      <div
                        className={`size-2.5 rounded-full ${
                          isFirst ? hStyle.color.replace("text-", "bg-") : "bg-stone-300"
                        }`}
                      />
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-ink leading-snug">{h.desc}</div>
                      <div className="text-xs text-stone mt-0.5">{h.date}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Not found */}
      {result && !result.found && (
        <div className="text-center py-8">
          <XCircle className="size-10 text-stone mx-auto mb-2" />
          <div className="text-sm font-semibold text-ink">Paket tidak ditemukan</div>
          <div className="text-xs text-stone mt-1">Periksa nomor resi dan jenis kurir</div>
        </div>
      )}
    </div>
  );
}
