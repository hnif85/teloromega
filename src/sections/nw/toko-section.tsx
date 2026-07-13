"use client";

import { useState, useEffect } from "react";
import { useAppStore, getActiveBrand } from "@/lib/store";
import { PageHeader, EmptyState } from "@/components/nw/primitives";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { StorePreview } from "@/sections/nw/toko/store-preview";
import { OrdersTab } from "@/sections/nw/toko/orders-tab";
import { InventoryTab } from "@/sections/nw/toko/inventory-tab";
import { PaymentsTab } from "@/sections/nw/toko/payments-tab";
import { CustomerIdentifyDialog } from "@/sections/nw/toko/customer-identify-dialog";
import {
  ShoppingCart,
  Package,
  CreditCard,
  UserCheck,
} from "lucide-react";

const TABS = [
  { key: "orders", label: "Orders", icon: ShoppingCart },
  { key: "inventory", label: "Stok", icon: Package },
  { key: "payments", label: "Pembayaran", icon: CreditCard },
] as const;

type TabKey = (typeof TABS)[number]["key"];

interface CustomerData {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  totalOrders: number;
  totalSpent: number;
  lastOrderAt: string | null;
  createdAt: string;
}

export function TokoSection() {
  const { user } = useAppStore();
  const activeBrand = getActiveBrand(useAppStore.getState());
  const [tab, setTab] = useState<TabKey>("orders");
  const [identifyOpen, setIdentifyOpen] = useState(false);
  const [activeCustomer, setActiveCustomer] = useState<CustomerData | null>(null);

  // Auto-open identification dialog on first visit
  useEffect(() => {
    if (activeBrand && !activeCustomer) {
      const timer = setTimeout(() => setIdentifyOpen(true), 500);
      return () => clearTimeout(timer);
    }
  }, [activeBrand, activeCustomer]);

  if (!activeBrand) {
    return (
      <div>
        <PageHeader title="Toko" subtitle="Kelola order, stok & pembayaran" icon="🛒" />
        <EmptyState
          icon="🏪"
          title="Belum ada brand"
          desc="Buat brand terlebih dahulu untuk mulai menggunakan modul Toko."
          action={<Button className="bg-teal hover:bg-teal-600">+ Buat Brand</Button>}
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Toko"
        subtitle={`Kelola order, stok & pembayaran · ${activeBrand.name}`}
        icon="🛒"
      />

      {/* Active customer indicator */}
      {activeCustomer && (
        <div className="mb-4 p-3 rounded-xl bg-teal-50 border border-teal-200 flex items-center gap-3">
          <div className="size-9 rounded-full bg-teal text-white flex items-center justify-center text-sm font-bold shrink-0">
            {activeCustomer.name[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-ink truncate">{activeCustomer.name}</div>
            <div className="text-xs text-stone">{activeCustomer.phone}</div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-teal gap-1.5"
            onClick={() => setIdentifyOpen(true)}
          >
            <UserCheck className="size-3.5" />
            Ganti
          </Button>
        </div>
      )}

      {/* Store preview card */}
      <div className="mb-6">
        <StorePreview brand={activeBrand} />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="w-full">
        <div className="overflow-x-auto pb-2 -mx-1 px-1">
          <TabsList className="h-auto bg-muted/60 p-1 gap-0.5">
            {TABS.map((t) => {
              const Icon = t.icon;
              return (
                <TabsTrigger
                  key={t.key}
                  value={t.key}
                  className="gap-1.5 px-3 py-1.5 text-xs sm:text-sm data-[state=active]:bg-card data-[state=active]:text-ink data-[state=active]:shadow-sm"
                >
                  <Icon className="size-3.5" />
                  {t.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        <TabsContent value="orders" className="mt-4">
          <OrdersTab brandId={activeBrand.id} user={user} />
        </TabsContent>
        <TabsContent value="inventory" className="mt-4">
          <InventoryTab brandId={activeBrand.id} user={user} />
        </TabsContent>
        <TabsContent value="payments" className="mt-4">
          <PaymentsTab brandId={activeBrand.id} user={user} />
        </TabsContent>
      </Tabs>

      {/* Customer identification dialog */}
      <CustomerIdentifyDialog
        open={identifyOpen}
        onOpenChange={setIdentifyOpen}
        brandId={activeBrand.id}
        onCustomerSelected={(c) => setActiveCustomer(c)}
      />
    </div>
  );
}
