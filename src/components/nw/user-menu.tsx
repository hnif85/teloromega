"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api";
import { LogOut, Loader2, UserCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

export function UserMenu() {
  const { user, logout, setSection } = useAppStore();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function handleLogout() {
    setLoading(true);
    try {
      await api("/api/logout", { method: "POST" });
      toast({ title: "Berhasil logout", description: "Sampai jumpa lagi! 👋" });
      logout();
    } catch {
      // Even if API fails, clear local state
      logout();
    } finally {
      setLoading(false);
      setConfirmOpen(false);
    }
  }

  if (!user) return null;

  const initials = user.name?.[0]?.toUpperCase() ?? "U";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-sidebar-accent/50 transition-colors w-full text-left">
            <div className="size-8 rounded-full bg-gradient-to-br from-teal to-teal-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-cream-100 truncate">{user.name}</div>
              <div className="text-[10px] text-cream-300/60 truncate">{user.email}</div>
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56" side="top">
          <DropdownMenuLabel className="text-xs text-stone">
            <div className="font-semibold text-ink">{user.name}</div>
            <div className="text-[11px] text-stone font-normal">{user.email}</div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setSection("pengaturan")} className="cursor-pointer gap-2">
            <UserCircle className="size-4" /> Pengaturan
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setConfirmOpen(true)}
            className="cursor-pointer gap-2 text-rose-600 focus:text-rose-700 focus:bg-rose-50"
          >
            <LogOut className="size-4" /> Keluar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Keluar dari The Next Whiz?</AlertDialogTitle>
            <AlertDialogDescription>
              Kamu perlu login lagi untuk mengakses dashboard. Data kamu tetap aman.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={(e) => {
                e.preventDefault();
                handleLogout();
              }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 mr-1 animate-spin" /> Keluar...
                </>
              ) : (
                <>
                  <LogOut className="size-4 mr-1" /> Ya, Keluar
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
