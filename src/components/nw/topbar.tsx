"use client";

import { useAppStore, getActiveBrand } from "@/lib/store";
import { NAV_ITEMS, SECONDARY_NAV, type SectionKey, CREDIT_PACKAGES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Bell, Menu, Zap, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useState } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export function Topbar() {
  const { section, setSection, user, brands, activeBrandId, setActiveBrand, setOnboardingOpen, addBrand, setCredit } =
    useAppStore();
  const activeBrand = getActiveBrand(useAppStore.getState());
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  async function quickTopup() {
    try {
      const r = await api<{ balance: number }>("/api/credit/topup", {
        method: "POST",
        json: { packageId: "growth", credits: 120, price: 99000 },
      });
      setCredit(r.balance);
      toast({ title: "Top-up berhasil", description: "+120 credit ditambahkan" });
    } catch (e: any) {
      toast({ title: "Gagal top-up", description: e.message, variant: "destructive" });
    }
  }

  function MobileNav() {
    return (
      <div className="flex flex-col gap-1">
        {[...NAV_ITEMS, ...SECONDARY_NAV].map((item) => (
          <button
            key={item.key}
            onClick={() => {
              setSection(item.key as SectionKey);
              setOpen(false);
            }}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left",
              section === item.key
                ? "bg-teal text-white"
                : "text-ink hover:bg-cream-200"
            )}
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.label}</span>
            {item.key === "credit" && (
              <span className="ml-auto text-[11px] font-bold bg-cream-200 px-1.5 py-0.5 rounded-md text-teal">
                {user?.creditBalance ?? 0}
              </span>
            )}
          </button>
        ))}
        <div className="h-px bg-border my-2" />
        <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-stone font-semibold">
          Brand aktif
        </div>
        {brands.map((b) => (
          <button
            key={b.id}
            onClick={() => {
              setActiveBrand(b.id);
              setOpen(false);
            }}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left",
              b.id === activeBrandId ? "bg-cream-200" : "hover:bg-cream-100"
            )}
          >
            <div className="size-6 rounded bg-teal/10 text-teal text-[10px] font-bold flex items-center justify-center">
              {b.name[0]?.toUpperCase()}
            </div>
            <span className="flex-1 truncate">{b.name}</span>
            {b.id === activeBrandId && <span className="text-teal text-xs">✓</span>}
          </button>
        ))}
      </div>
    );
  }

  return (
    <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="flex items-center gap-3 px-4 md:px-6 py-3">
        {/* Mobile menu */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-4">
            <SheetHeader className="mb-3">
              <SheetTitle className="flex items-center gap-2">
                <div className="size-8 rounded-xl bg-teal text-white font-extrabold flex items-center justify-center text-xs">
                  NW
                </div>
                Next Whiz
              </SheetTitle>
            </SheetHeader>
            <MobileNav />
          </SheetContent>
        </Sheet>

        {/* Brand pill */}
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-teal text-white text-xs font-bold flex items-center justify-center">
            {activeBrand?.name?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="hidden sm:block">
            <div className="text-sm font-bold text-ink leading-none">
              {activeBrand?.name ?? "Belum ada brand"}
            </div>
            <div className="text-[10px] text-stone mt-0.5">{activeBrand?.category ?? "—"}</div>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => setSection("credit")}
          >
            <Bell className="size-4" />
            <span className="absolute top-1.5 right-1.5 size-1.5 bg-danger rounded-full" />
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 border-teal/30 text-teal hover:bg-teal-100 hover:text-teal-600"
            onClick={quickTopup}
          >
            <Zap className="size-3.5 fill-teal" />
            <span className="font-bold tabular-nums">{user?.creditBalance ?? 0}</span>
            <span className="hidden sm:inline text-[11px] text-stone font-medium">credit</span>
          </Button>

          <Button
            size="sm"
            className="bg-teal hover:bg-teal-600 text-white gap-1.5"
            onClick={() => setOnboardingOpen(true)}
          >
            <Plus className="size-3.5" />
            <span className="hidden sm:inline">Brand baru</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
