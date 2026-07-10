"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api";
import { Sidebar } from "@/components/nw/sidebar";
import { Topbar } from "@/components/nw/topbar";
import { OnboardingDialog } from "@/components/nw/onboarding";
import { BerandaSection } from "@/sections/nw/beranda-section";
import { RisetSection } from "@/sections/nw/riset-section";
import { KontenSection } from "@/sections/nw/konten-section";
import { TokoSection } from "@/sections/nw/toko-section";
import { KeuanganSection } from "@/sections/nw/keuangan-section";
import { CreditSection } from "@/sections/nw/credit-section";
import { PengaturanSection } from "@/sections/nw/pengaturan-section";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const {
    hydrated,
    section,
    setSession,
    setHydrated,
    onboardingOpen,
  } = useAppStore();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await api<{
          user: any;
          brands: any[];
          activeBrandId: string | null;
        }>("/api/init");
        if (!cancelled) setSession(s);
      } catch (e) {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!hydrated) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <div className="flex-1 flex items-center justify-center">
          <div className="space-y-3 w-72">
            <Skeleton className="h-10 w-40 rounded-xl" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar />
          <main className="flex-1 px-4 md:px-6 py-6 max-w-[1400px] w-full mx-auto">
            {section === "beranda" && <BerandaSection />}
            {section === "riset" && <RisetSection />}
            {section === "konten" && <KontenSection />}
            {section === "toko" && <TokoSection />}
            {section === "keuangan" && <KeuanganSection />}
            {section === "credit" && <CreditSection />}
            {section === "pengaturan" && <PengaturanSection />}
          </main>
        </div>
      </div>
      <footer className="mt-auto border-t border-border bg-cream-100/60">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-4 flex flex-wrap items-center justify-between gap-2 text-xs text-stone">
          <div className="flex items-center gap-2">
            <div className="size-5 rounded-md bg-teal text-white text-[10px] font-bold flex items-center justify-center">
              NW
            </div>
            <span>© 2026 The Next Whiz · AI Co-pilot untuk UMKM Indonesia</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline">v0.1.1 · MVP</span>
            <span className="flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-success animate-pulse" />
              Sistem operasional
            </span>
          </div>
        </div>
      </footer>
      {onboardingOpen && <OnboardingDialog />}
    </div>
  );
}
