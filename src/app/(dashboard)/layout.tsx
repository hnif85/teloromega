"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAppStore, registerNavigate, pathToSection } from "@/lib/store";
import { Sidebar } from "@/components/nw/sidebar";
import { Topbar } from "@/components/nw/topbar";
import { OnboardingDialog } from "@/components/nw/onboarding";
import { OnboardingTour } from "@/components/nw/onboarding-tour";
import { CommandPalette } from "@/components/nw/command-palette";
import { OfflineIndicator } from "@/components/nw/offline-indicator";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { hydrated, isLoggedIn, onboardingOpen, setSection } = useAppStore();

  // Register navigate bridge — so store.setSection() navigates URL too
  useEffect(() => {
    registerNavigate((path: string) => router.push(path));
    return () => registerNavigate(null);
  }, [router]);

  // Sync URL path → store section (handles back/forward, direct URL, refresh)
  useEffect(() => {
    const sec = pathToSection(pathname);
    const current = useAppStore.getState().section;
    if (sec !== current) {
      setSection(sec);
    }
  }, [pathname, setSection]);

  // Auth guard — redirect to login if not authenticated
  useEffect(() => {
    if (hydrated && !isLoggedIn) {
      router.push("/");
    }
  }, [hydrated, isLoggedIn, router]);

  // Don't render until hydrated
  if (!hydrated) return null;
  // Don't render dashboard if not logged in
  if (!isLoggedIn) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar />
          <main className="flex-1 px-4 md:px-6 py-6 max-w-[1400px] w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
      <footer className="mt-auto border-t border-border bg-cream-100/60">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-4 flex flex-wrap items-center justify-between gap-2 text-xs text-stone">
          <div className="flex items-center gap-2">
            <div className="size-5 rounded-md bg-teal text-white text-[10px] font-bold flex items-center justify-center">
              U
            </div>
            <span>© 2026 usahaku.ai · AI Co-pilot untuk UMKM Indonesia</span>
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
      <OnboardingTour />
      <CommandPalette />
      <OfflineIndicator />
    </div>
  );
}
