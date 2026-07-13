"use client";

import { useState, useCallback, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatRupiah } from "@/lib/constants";
import { Search, MapPin, Truck, Clock, CheckCircle2 } from "lucide-react";

interface Destination {
  id: number;
  label: string;
  province_name: string;
  city_name: string;
  district_name: string;
  subdistrict_name: string;
  zip_code: string;
}

interface ShippingResult {
  courier: string;
  code: string;
  service: string;
  description: string;
  cost: number;
  etd: string | null;
}

interface ShippingCalculatorProps {
  brandId: string;
  destinationId?: number;
  totalWeight?: number;
  onSelect?: (result: ShippingResult, destination: Destination) => void;
}

export function ShippingCalculator({
  brandId,
  destinationId,
  totalWeight = 1000,
  onSelect,
}: ShippingCalculatorProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [selectedDest, setSelectedDest] = useState<Destination | null>(null);
  const [selectedResult, setSelectedResult] = useState<ShippingResult | null>(null);
  const [weightInput, setWeightInput] = useState(String(weight));
  const searchTimeout = useRef<NodeJS.Timeout>();

  // Search destinations
  const searchMutation = useMutation({
    mutationFn: (query: string) =>
      api<{ destinations: Destination[] }>(`/api/shipping/search?search=${encodeURIComponent(query)}&limit=8`),
    onSuccess: (res) => setDestinations(res.destinations),
    onError: (e: Error) =>
      toast({ title: "Gagal cari alamat", description: e.message, variant: "destructive" }),
  });

  // Calculate cost
  const costMutation = useMutation({
    mutationFn: () =>
      api<{ results: ShippingResult[] }>("/api/shipping/cost", {
        method: "POST",
        json: {
          brandId,
          destination: selectedDest?.id,
          weight: Number(weightInput) || totalWeight,
          price: "lowest",
        },
      }),
    onSuccess: (res) => {
      if (res.results.length === 0) {
        toast({ title: "Tidak ada kurir tersedia", variant: "destructive" });
      }
    },
    onError: (e: Error) =>
      toast({ title: "Gagal hitung ongkir", description: e.message, variant: "destructive" }),
  });

  const handleSearch = useCallback(
    (q: string) => {
      setSearchQuery(q);
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
      if (q.length < 2) {
        setDestinations([]);
        return;
      }
      searchTimeout.current = setTimeout(() => searchMutation.mutate(q), 400);
    },
    [searchMutation]
  );

  function handleSelectDest(dest: Destination) {
    setSelectedDest(dest);
    setDestinations([]);
    setSearchQuery(dest.label);
    setSelectedResult(null);
    // Auto-calculate cost
    if (brandId) {
      costMutation.mutate();
    }
  }

  function handleSelectResult(result: ShippingResult) {
    setSelectedResult(result);
    if (onSelect) onSelect(result, selectedDest!);
  }

  return (
    <div className="space-y-4">
      {/* Weight input */}
      <div>
        <Label className="text-xs text-stone">Berat Barang (gram)</Label>
        <Input
          type="number"
          min={100}
          value={weightInput}
          onChange={(e) => setWeightInput(e.target.value)}
          className="mt-1"
          placeholder="1000"
        />
      </div>

      {/* Destination search */}
      <div>
        <Label className="text-xs text-stone">Cari Alamat Tujuan</Label>
        <div className="relative mt-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-stone" />
          <Input
            placeholder="Ketik kota atau kecamatan..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Search results dropdown */}
        {destinations.length > 0 && (
          <div className="mt-2 rounded-lg border border-border bg-card shadow-lg max-h-60 overflow-y-auto">
            {destinations.map((dest) => (
              <button
                key={dest.id}
                className="w-full px-3 py-2.5 text-left hover:bg-cream-100/50 transition-colors border-b border-border last:border-0"
                onClick={() => handleSelectDest(dest)}
              >
                <div className="text-sm font-medium text-ink line-clamp-1">{dest.label}</div>
                <div className="text-xs text-stone mt-0.5">
                  {dest.province_name} · {dest.zip_code}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected destination */}
      {selectedDest && (
        <div className="p-3 rounded-lg bg-teal-50 border border-teal-200">
          <div className="flex items-start gap-2">
            <MapPin className="size-4 text-teal shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-teal-900">{selectedDest.label}</div>
              <div className="text-xs text-teal-700 mt-0.5">
                {selectedDest.province_name} · {selectedDest.city_name} · {selectedDest.zip_code}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Calculate button */}
      {selectedDest && brandId && !costMutation.data && (
        <Button
          onClick={() => costMutation.mutate()}
          disabled={costMutation.isPending}
          className="w-full bg-teal hover:bg-teal-600"
        >
          <Truck className="size-4 mr-2" />
          {costMutation.isPending ? "Menghitung..." : "Hitung Ongkir"}
        </Button>
      )}

      {/* Loading */}
      {costMutation.isPending && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      )}

      {/* Results */}
      {costMutation.data?.results && costMutation.data.results.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-stone uppercase tracking-wider">
            Pilihan Kurir ({costMutation.data.results.length})
          </div>
          {costMutation.data.results.map((result, idx) => {
            const isSelected = selectedResult?.code === result.code && selectedResult?.service === result.service;
            return (
              <button
                key={`${result.code}-${result.service}`}
                className={`w-full p-3 rounded-xl border transition-all text-left ${
                  isSelected
                    ? "border-teal bg-teal-50 shadow-sm"
                    : "border-border bg-card hover:border-stone-300 hover:shadow-sm"
                }`}
                onClick={() => handleSelectResult(result)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`size-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                        isSelected ? "bg-teal text-white" : "bg-muted text-stone"
                      }`}
                    >
                      {result.code.toUpperCase().slice(0, 3)}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-ink">
                        {result.courier}
                        <span className="text-stone font-normal ml-1.5">{result.service}</span>
                      </div>
                      <div className="text-xs text-stone">{result.description}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-extrabold text-ink">{formatRupiah(result.cost)}</div>
                    {result.etd && (
                      <div className="text-[10px] text-stone flex items-center gap-1 justify-end">
                        <Clock className="size-2.5" />
                        {result.etd}
                      </div>
                    )}
                  </div>
                </div>
                {isSelected && (
                  <div className="mt-2 pt-2 border-t border-teal/20 flex items-center gap-1.5 text-xs text-teal">
                    <CheckCircle2 className="size-3.5" />
                    Dipilih
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* No results */}
      {costMutation.data && costMutation.data.results.length === 0 && (
        <div className="text-center py-6">
          <Truck className="size-8 text-stone mx-auto mb-2" />
          <div className="text-sm font-semibold text-ink">Tidak ada kurir tersedia</div>
          <div className="text-xs text-stone mt-1">Coba ganti alamat atau berat barang</div>
        </div>
      )}
    </div>
  );
}
