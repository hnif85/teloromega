"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api";
import { LoginScreen } from "@/components/nw/login-screen";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const { hydrated, isLoggedIn, setSession, setHydrated } = useAppStore();
  const queryClient = useQueryClient();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await api<{
          user: any;
          brands: any[];
          activeBrandId: string | null;
        }>("/api/init");
        if (!cancelled) {
          setSession(s);
        }
      } catch (e) {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isLoggedIn) {
      queryClient.clear();
    }
  }, [isLoggedIn, queryClient]);

  // Redirect to dashboard once logged in
  useEffect(() => {
    if (hydrated && isLoggedIn) {
      router.replace("/beranda");
    }
  }, [hydrated, isLoggedIn, router]);

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

  if (!isLoggedIn) {
    return <LoginScreen />;
  }

  // Hydrated + logged in — will redirect in useEffect above
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Skeleton className="h-10 w-40 rounded-xl" />
    </div>
  );
}
