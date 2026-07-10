"use client";

import { useState } from "react";
import { useAppStore, getActiveBrand } from "@/lib/store";
import { PageHeader, EmptyState } from "@/components/nw/primitives";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { StorePreview } from "@/sections/nw/toko/store-preview";
import { InboxTab } from "@/sections/nw/toko/inbox-tab";
import { AiChatTab } from "@/sections/nw/toko/aichat-tab";
import { LeadsTab } from "@/sections/nw/toko/leads-tab";
import { OrdersTab } from "@/sections/nw/toko/orders-tab";
import { PaymentsTab } from "@/sections/nw/toko/payments-tab";
import { ShippingTab } from "@/sections/nw/toko/shipping-tab";
import { InventoryTab } from "@/sections/nw/toko/inventory-tab";
import { CampaignsTab } from "@/sections/nw/toko/campaigns-tab";
import {
  MessageSquare,
  Sparkles,
  Users,
  ShoppingCart,
  CreditCard,
  Truck,
  Package,
  Megaphone,
} from "lucide-react";

const TABS = [
  { key: "inbox", label: "Inbox", icon: MessageSquare },
  { key: "aichat", label: "AI Chat & Template", icon: Sparkles },
  { key: "leads", label: "Leads", icon: Users },
  { key: "orders", label: "Orders", icon: ShoppingCart },
  { key: "payments", label: "Pembayaran", icon: CreditCard },
  { key: "shipping", label: "Pengiriman", icon: Truck },
  { key: "inventory", label: "Stok", icon: Package },
  { key: "campaigns", label: "Campaign", icon: Megaphone },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function TokoSection() {
  const { user } = useAppStore();
  const activeBrand = getActiveBrand(useAppStore.getState());
  const [tab, setTab] = useState<TabKey>("inbox");

  if (!activeBrand) {
    return (
      <div>
        <PageHeader title="Toko" subtitle="Kelola inbox, leads, order, pembayaran, pengiriman, stok & campaign" icon="🛒" />
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
        subtitle={`Kelola inbox, leads, order, pembayaran, pengiriman, stok & campaign · ${activeBrand.name}`}
        icon="🛒"
      />

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

        <TabsContent value="inbox" className="mt-4">
          <InboxTab brandId={activeBrand.id} user={user} />
        </TabsContent>
        <TabsContent value="aichat" className="mt-4">
          <AiChatTab brandId={activeBrand.id} user={user} />
        </TabsContent>
        <TabsContent value="leads" className="mt-4">
          <LeadsTab brandId={activeBrand.id} user={user} />
        </TabsContent>
        <TabsContent value="orders" className="mt-4">
          <OrdersTab brandId={activeBrand.id} user={user} />
        </TabsContent>
        <TabsContent value="payments" className="mt-4">
          <PaymentsTab brandId={activeBrand.id} user={user} />
        </TabsContent>
        <TabsContent value="shipping" className="mt-4">
          <ShippingTab brandId={activeBrand.id} user={user} />
        </TabsContent>
        <TabsContent value="inventory" className="mt-4">
          <InventoryTab brandId={activeBrand.id} user={user} />
        </TabsContent>
        <TabsContent value="campaigns" className="mt-4">
          <CampaignsTab brandId={activeBrand.id} user={user} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
