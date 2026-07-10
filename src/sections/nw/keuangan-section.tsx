"use client";

import { useState } from "react";
import { useAppStore, getActiveBrand } from "@/lib/store";
import { PageHeader, EmptyState } from "@/components/nw/primitives";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Zap } from "lucide-react";
import type { PeriodKey } from "./keuangan/types";
import { RingkasanTab } from "./keuangan/ringkasan-tab";
import { TransaksiTab } from "./keuangan/transaksi-tab";
import { PiutangHutangTab } from "./keuangan/piutang-hutang-tab";
import { BiayaOperasionalTab } from "./keuangan/biaya-operasional-tab";
import { ProyeksiTab } from "./keuangan/proyeksi-tab";

export function KeuanganSection() {
  const { user } = useAppStore();
  const activeBrand = getActiveBrand(useAppStore.getState());
  const [period, setPeriod] = useState<PeriodKey>("month");
  const [tab, setTab] = useState<string>("ringkasan");

  if (!activeBrand) {
    return (
      <div>
        <PageHeader title="Keuangan" subtitle="Catat transaksi & analisa laba rugi" icon="💰" />
        <EmptyState
          icon="🏪"
          title="Belum ada brand"
          desc="Buat brand terlebih dahulu di Beranda untuk mulai mencatat transaksi keuangan."
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Keuangan"
        subtitle={`Ringkasan & transaksi ${activeBrand.name}`}
        icon="💰"
        actions={
          <div className="flex items-center gap-2">
            {tab === "ringkasan" && (
              <Select value={period} onValueChange={(v) => setPeriod(v as PeriodKey)}>
                <SelectTrigger className="h-9 w-32" size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Bulan Ini</SelectItem>
                  <SelectItem value="quarter">Kuartal Ini</SelectItem>
                  <SelectItem value="year">Tahun Ini</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Badge className="bg-amber-100 text-amber-700 border-amber-200 border">
              <Zap className="size-3 fill-amber-400 text-amber-500" />
              {user?.creditBalance ?? 0} credit
            </Badge>
          </div>
        }
      />

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="bg-cream-100 h-auto p-1 flex-wrap gap-0.5">
          <TabsTrigger value="ringkasan" className="text-xs sm:text-sm">
            📊 Ringkasan
          </TabsTrigger>
          <TabsTrigger value="transaksi" className="text-xs sm:text-sm">
            🧾 Transaksi
          </TabsTrigger>
          <TabsTrigger value="piutang" className="text-xs sm:text-sm">
            📥 Piutang & Hutang
          </TabsTrigger>
          <TabsTrigger value="biaya" className="text-xs sm:text-sm">
            💸 Biaya Operasional
          </TabsTrigger>
          <TabsTrigger value="proyeksi" className="text-xs sm:text-sm">
            🔮 Proyeksi
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ringkasan" className="mt-4">
          <RingkasanTab brandId={activeBrand.id} period={period} />
        </TabsContent>
        <TabsContent value="transaksi" className="mt-4">
          <TransaksiTab brandId={activeBrand.id} />
        </TabsContent>
        <TabsContent value="piutang" className="mt-4">
          <PiutangHutangTab brandId={activeBrand.id} />
        </TabsContent>
        <TabsContent value="biaya" className="mt-4">
          <BiayaOperasionalTab brandId={activeBrand.id} />
        </TabsContent>
        <TabsContent value="proyeksi" className="mt-4">
          <ProyeksiTab brandId={activeBrand.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
