"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Mail, Lock, User, ArrowLeft, Loader2, Eye, EyeOff } from "lucide-react";

interface Props {
  onBack: () => void;
}

export function RegisterScreen({ onBack }: Props) {
  const { setSession } = useAppStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim() || !email.trim() || !password) {
      setError("Semua field wajib diisi");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Gagal mendaftar");
        setLoading(false);
        return;
      }

      setSession(data);
    } catch {
      setError("Gagal terhubung ke server. Coba lagi.");
      setLoading(false);
    }
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
          <p className="text-sm text-stone mt-1">AI Co-pilot untuk UMKM Indonesia</p>
        </div>

        <Card className="rounded-2xl shadow-sm border-border">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2 mb-2">
              <Button variant="ghost" size="icon" className="size-8" onClick={onBack} type="button">
                <ArrowLeft className="size-4" />
              </Button>
            </div>
            <CardTitle className="text-xl">Daftar Gratis 🎉</CardTitle>
            <CardDescription>
              Mulai perjalanan UMKM kamu dengan AI Co-pilot. Dapatkan 50 credit gratis!
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              {/* Error */}
              {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg p-3">
                  {error}
                </div>
              )}

              {/* Nama */}
              <div className="space-y-2">
                <Label htmlFor="reg-name">Nama Lengkap</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-stone" />
                  <Input
                    id="reg-name"
                    type="text"
                    placeholder="Budi Santoso"
                    className="pl-10"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="reg-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-stone" />
                  <Input
                    id="reg-email"
                    type="email"
                    placeholder="budi@contoh.com"
                    className="pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="reg-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-stone" />
                  <Input
                    id="reg-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Minimal 6 karakter"
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
                  <><Loader2 className="size-4 animate-spin" /> Mendaftarkan...</>
                ) : (
                  <><Sparkles className="size-4" /> Daftar & Dapatkan 50 Credit</>
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="justify-center border-t pt-4">
            <p className="text-sm text-stone">
              Sudah punya akun?{" "}
              <button
                onClick={onBack}
                className="text-teal font-semibold hover:underline"
                disabled={loading}
              >
                Masuk di sini
              </button>
            </p>
          </CardFooter>
        </Card>

        <p className="text-[11px] text-stone text-center mt-4">
          © 2026 usahaku.ai · v0.2.0
        </p>
      </div>
    </div>
  );
}
