"use client";

import { useAppStore, getActiveBrand } from "@/lib/store";
import { NAV_ITEMS, SECONDARY_NAV, type SectionKey } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { ChevronDown, Plus, Zap } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { SidebarThemeToggle } from "@/components/nw/sidebar-theme-toggle";
import { UserMenu } from "@/components/nw/user-menu";

export function Sidebar() {
  const { section, setSection, brands, activeBrandId, setActiveBrand, user, setOnboardingOpen, addBrand } =
    useAppStore();
  const activeBrand = getActiveBrand(useAppStore.getState());
  const { toast } = useToast();

  function navClass(active: boolean) {
    return cn(
      "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors",
      active
        ? "bg-teal text-white"
        : "text-cream-300 hover:bg-sidebar-accent hover:text-cream-100"
    );
  }

  async function quickCreateBrand() {
    // Demo: one-tap brand create for quick testing
    const name = window.prompt("Nama brand baru?");
    if (!name) return;
    try {
      const r = await api<{ brand: any }>("/api/brands", {
        method: "POST",
        json: { name, category: "Lainnya" },
      });
      addBrand({
        id: r.brand.id,
        name: r.brand.name,
        slug: r.brand.slug,
        logoUrl: r.brand.logoUrl,
        description: r.brand.description,
        category: r.brand.category,
        toneOfVoice: r.brand.toneOfVoice,
        isActive: r.brand.isActive,
      });
      toast({ title: "Brand dibuat", description: r.brand.name });
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" });
    }
  }

  return (
    <aside className="hidden md:flex flex-col w-[248px] bg-sidebar text-sidebar-foreground shrink-0 h-screen sticky top-0">
      {/* Logo */}
      <div className="px-4 pt-5 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="size-9 rounded-xl bg-teal text-white font-extrabold flex items-center justify-center text-sm tracking-tight">
            NW
          </div>
          <div>
            <div className="font-extrabold text-cream-100 text-[15px] leading-none">Next Whiz</div>
            <div className="text-[10px] text-cream-300/70 tracking-wider uppercase mt-1">AI Co-pilot UMKM</div>
          </div>
        </div>
      </div>

      {/* Primary nav */}
      <nav data-tour="sidebar-nav" className="sidebar-scroll px-3 flex-1 overflow-y-auto flex flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <div
            key={item.key}
            className={navClass(section === item.key)}
            onClick={() => setSection(item.key as SectionKey)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && setSection(item.key as SectionKey)}
          >
            <span className="text-base">{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}

        <div className="h-px bg-sidebar-border my-2 mx-1" />

        {SECONDARY_NAV.map((item) => (
          <div
            key={item.key}
            className={navClass(section === item.key)}
            onClick={() => setSection(item.key as SectionKey)}
            role="button"
            tabIndex={0}
          >
            <span className="text-base">{item.icon}</span>
            <span>{item.label}</span>
            {item.key === "credit" && user && (
              <span className="ml-auto text-[11px] font-bold bg-sidebar-accent px-1.5 py-0.5 rounded-md text-teal-200">
                {user.creditBalance}
              </span>
            )}
          </div>
        ))}

        {/* Brand switcher */}
        <div className="h-px bg-sidebar-border my-2 mx-1" />
        <div className="px-1 mb-1 text-[10px] uppercase tracking-wider text-cream-300/60 font-semibold">
          Brand aktif
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button data-tour="brand-switcher" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-sidebar-accent hover:bg-sidebar-accent/80 transition-colors w-full text-left">
              <div className="size-7 rounded-md bg-teal text-white text-xs font-bold flex items-center justify-center shrink-0">
                {activeBrand?.name?.[0]?.toUpperCase() ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-cream-100 truncate">
                  {activeBrand?.name ?? "Belum ada brand"}
                </div>
                <div className="text-[10px] text-cream-300/70 truncate">
                  {activeBrand?.category ?? "—"}
                </div>
              </div>
              <ChevronDown className="size-4 text-cream-300/70 shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <div className="px-2 py-1.5 text-[10px] uppercase tracking-wider text-stone font-semibold">
              Pilih brand
            </div>
            {brands.map((b) => (
              <DropdownMenuItem
                key={b.id}
                onClick={() => setActiveBrand(b.id)}
                className="cursor-pointer gap-2"
              >
                <div className="size-6 rounded bg-teal/10 text-teal text-[10px] font-bold flex items-center justify-center">
                  {b.name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{b.name}</div>
                  <div className="text-[10px] text-stone truncate">{b.category}</div>
                </div>
                {b.id === activeBrandId && <span className="text-teal text-xs">✓</span>}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={quickCreateBrand} className="cursor-pointer gap-2 text-teal">
              <Plus className="size-4" />
              Brand baru
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setOnboardingOpen(true)} className="cursor-pointer gap-2">
              <Zap className="size-4" />
              Setup onboarding
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>

      {/* User card with dropdown menu (logout, settings) */}
      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-1">
          <div className="flex-1 min-w-0">
            <UserMenu />
          </div>
          <SidebarThemeToggle />
        </div>
      </div>
    </aside>
  );
}
