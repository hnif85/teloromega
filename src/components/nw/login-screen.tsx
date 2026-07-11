"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Mail, Lock, Loader2, Eye, EyeOff, Store } from "lucide-react";
import { RegisterScreen } from "@/components/nw/auth/register-screen";

export function LoginScreen() {
  const { setSession } = useAppStore();
  const [showRegister, setShowRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Email dan password wajib diisi");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login gagal");
        setLoading(false);
        return;
      }

      setSession(data);
    } catch {
      setError("Gagal terhubung ke server. Coba lagi.");
      setLoading(false);
    }
  }

  // Show register screen if user clicks "Daftar"
  if (showRegister) {
    return <RegisterScreen onBack={() => setShowRegister(false)} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background mesh-hero p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <div className="size-16 rounded-2xl bg-teal text-white font-extrabold flex items-center justify-center text-2xl mb-3 shadow-lg shadow-teal/20">
            U
          </div>
          <h1 className="text-3xl font-extrabold text-ink tracking-tight">usahaku.ai</h1>
          <p className="text-sm text-stone mt-1 text-center">
            AI Co-pilot untuk UMKM Indonesia
          </p>
        </div>

        <Card className="rounded-2xl shadow-sm border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Selamat datang 👋</CardTitle>
            <CardDescription>
              Masuk untuk mulai kelola riset, konten, toko, dan keuangan dalam satu platform.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Error */}
              {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg p-3">
                  {error}
                </div>
              )}

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-stone" />
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="budi@contoh.com"
                    className="pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    autoFocus
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-stone" />
                  <Input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Masukkan password"
                    className="pl-10 pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone hover:text-ink"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full bg-teal hover:bg-teal-600 text-white gap-2 h-11" disabled={loading}>
                {loading ? (
                  <><Loader2 className="size-4 animate-spin" /> Memuat...</>
                ) : (
                  <><Store className="size-4" /> Masuk</>
                )}
              </Button>
            </form>

            {/* Features preview */}
            <div className="mt-5 pt-4 border-t border-border grid grid-cols-3 gap-2 text-center">
              <div className="space-y-1">
                <div className="text-lg">📊</div>
                <div className="text-[10px] text-stone font-medium">Dashboard</div>
              </div>
              <div className="space-y-1">
                <div className="text-lg">🔍</div>
                <div className="text-[10px] text-stone font-medium">Riset AI</div>
              </div>
              <div className="space-y-1">
                <div className="text-lg">📝</div>
                <div className="text-[10px] text-stone font-medium">Konten AI</div>
              </div>
              <div className="space-y-1">
                <div className="text-lg">🛒</div>
                <div className="text-[10px] text-stone font-medium">Toko</div>
              </div>
              <div className="space-y-1">
                <div className="text-lg">💰</div>
                <div className="text-[10px] text-stone font-medium">Keuangan</div>
              </div>
              <div className="space-y-1">
                <div className="text-lg">⚡</div>
                <div className="text-[10px] text-stone font-medium">50 Credit</div>
              </div>
            </div>
          </CardContent>

          <CardFooter className="justify-center border-t pt-4">
            <p className="text-sm text-stone">
              Belum punya akun?{" "}
              <button
                onClick={() => setShowRegister(true)}
                className="text-teal font-semibold hover:underline"
                disabled={loading}
              >
                Daftar gratis
              </button>
            </p>
          </CardFooter>
        </Card>

        <p className="text-[11px] text-stone text-center mt-4">
          © 2026 usahaku.ai · v0.2.0 · Akun demo: budi@contoh.com / kopibudi123
        </p>
      </div>
    </div>
  );
}
