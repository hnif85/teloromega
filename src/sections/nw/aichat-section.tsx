"use client";

import { useState } from "react";
import { useAppStore, getActiveBrand } from "@/lib/store";
import { PageHeader, EmptyState } from "@/components/nw/primitives";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { InboxTab } from "@/sections/nw/toko/inbox-tab";
import { AiChatTab } from "@/sections/nw/toko/aichat-tab";
import { LeadsTab } from "@/sections/nw/toko/leads-tab";
import { CampaignsTab } from "@/sections/nw/toko/campaigns-tab";
import {
  MessageSquare,
  Sparkles,
  Users,
  Megaphone,
} from "lucide-react";

const TABS = [
  { key: "inbox", label: "Inbox", icon: MessageSquare },
  { key: "aichat", label: "AI Chat", icon: Sparkles },
  { key: "leads", label: "Leads", icon: Users },
  { key: "campaigns", label: "Campaign", icon: Megaphone },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function AiChatSection() {
  const { user } = useAppStore();
  const activeBrand = getActiveBrand(useAppStore.getState());
  const [tab, setTab] = useState<TabKey>("inbox");

  if (!activeBrand) {
    return (
      <div>
        <PageHeader title="AI Chat" subtitle="Inbox, AI reply, leads & campaign" icon="💬" />
        <EmptyState
          icon="🏪"
          title="Belum ada brand"
          desc="Buat brand terlebih dahulu untuk mulai menggunakan AI Chat."
          action={<Button className="bg-teal hover:bg-teal-600">+ Buat Brand</Button>}
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="AI Chat"
        subtitle={`Inbox, AI reply, leads & campaign · ${activeBrand.name}`}
        icon="💬"
      />

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
        <TabsContent value="campaigns" className="mt-4">
          <CampaignsTab brandId={activeBrand.id} user={user} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
