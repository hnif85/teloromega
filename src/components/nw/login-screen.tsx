"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Sparkles, Store, ArrowRight, Loader2, RefreshCw } from "lucide-react";

export function LoginScreen() {
  const { setSession, setHydrated } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    try {
      const s = await api<{
        user: any;
        brands: any[];
        activeBrandId: string | null;
      }>("/api/init");
      setSession(s);
    } catch {
      setHydrated(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleResetOnboarding() {
    // Login first (sets cookie), then soft-delete all brands so onboarding re-appears
    setResetLoading(true);
    try {
      // Step 1: login (sets cookie)
      await api("/api/init");
      // Step 2: reset brands (now authenticated)
      await api("/api/reset-onboarding", { method: "POST" });
      // Step 3: re-fetch session (will have 0 brands → onboarding triggers)
      const s = await api<{
        user: any;
        brands: any[];
        activeBrandId: string | null;
      }>("/api/init");
      setSession(s);
    } catch {
      setHydrated(true);
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background mesh-hero p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="size-16 rounded-2xl bg-teal text-white font-extrabold flex items-center justify-center text-2xl mb-4 shadow-lg shadow-teal/20">
            NW
          </div>
          <h1 className="text-3xl font-extrabold text-ink tracking-tight">The Next Whiz</h1>
          <p className="text-sm text-stone mt-1 text-center">
            AI Co-pilot untuk UMKM Indonesia
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-card border border-border p-6 shadow-sm">
          <div className="text-center mb-6">
            <h2 className="text-lg font-bold text-ink">Selamat datang 👋</h2>
            <p className="text-sm text-stone mt-1">
              Masuk untuk mulai kelola riset, konten, toko, dan keuangan dalam satu platform.
            </p>
          </div>

          {/* Login button */}
          <Button
            className="w-full bg-teal hover:bg-teal-600 text-white gap-2 h-12 text-base"
            onClick={handleLogin}
            disabled={loading || resetLoading}
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Memuat...
              </>
            ) : (
              <>
                <Store className="size-4" /> Masuk dengan mwxmarket.ai
              </>
            )}
          </Button>

          <p className="text-[11px] text-stone text-center mt-3">
            Demo SSO — kamu akan masuk sebagai <span className="font-semibold">Ibu Ani</span> (47 credit)
          </p>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[11px] text-stone uppercase tracking-wider">atau</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Reset onboarding button */}
          <Button
            variant="outline"
            className="w-full gap-2 h-10"
            onClick={handleResetOnboarding}
            disabled={loading || resetLoading}
          >
            {resetLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Mereset...
              </>
            ) : (
              <>
                <RefreshCw className="size-4" /> Coba Onboarding dari Awal
              </>
            )}
          </Button>
          <p className="text-[11px] text-stone text-center mt-2">
            Hapus semua brand yang ada lalu mulai onboarding baru
          </p>

          {/* Features preview */}
          <div className="mt-6 pt-5 border-t border-border grid grid-cols-3 gap-2 text-center">
            <div className="space-y-1">
              <div className="text-xl">📊</div>
              <div className="text-[10px] text-stone font-medium">Dashboard</div>
            </div>
            <div className="space-y-1">
              <div className="text-xl">🔍</div>
              <div className="text-[10px] text-stone font-medium">Riset AI</div>
            </div>
            <div className="space-y-1">
              <div className="text-xl">📝</div>
              <div className="text-[10px] text-stone font-medium">Konten AI</div>
            </div>
            <div className="space-y-1">
              <div className="text-xl">🛒</div>
              <div className="text-[10px] text-stone font-medium">Toko</div>
            </div>
            <div className="space-y-1">
              <div className="text-xl">💰</div>
              <div className="text-[10px] text-stone font-medium">Keuangan</div>
            </div>
            <div className="space-y-1">
              <div className="text-xl">📅</div>
              <div className="text-[10px] text-stone font-medium">Kalender</div>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-stone text-center mt-4">
          © 2026 The Next Whiz · v0.1.1 MVP
        </p>
      </div>
    </div>
  );
}
