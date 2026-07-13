"use client";

import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Phone, CheckCircle2, ShoppingCart, Wallet, ArrowRight } from "lucide-react";

interface CustomerData {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  totalOrders: number;
  totalSpent: number;
  lastOrderAt: string | null;
}

interface StoreCustomerDialogProps {
  brandId: string;
  onCustomerSelected: (customer: CustomerData | null) => void;
}

const STORAGE_KEY = "usahaku_customer";

export function StoreCustomerDialog({ brandId, onCustomerSelected }: StoreCustomerDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"phone" | "found">("phone");
  const [phone, setPhone] = useState("");
  const [foundCustomer, setFoundCustomer] = useState<CustomerData | null>(null);

  // Check localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const customer = JSON.parse(saved) as CustomerData;
        setFoundCustomer(customer);
        onCustomerSelected(customer);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
        setOpen(true);
      }
    } else {
      setOpen(true);
    }
  }, [brandId, onCustomerSelected]);

  // Lookup mutation
  const lookupMutation = useMutation({
    mutationFn: () =>
      api<{ found: boolean; customer?: CustomerData; phone: string }>("/api/customers", {
        method: "POST",
        json: { brandId, phone },
      }),
    onSuccess: (res) => {
      if (res.found && res.customer) {
        setFoundCustomer(res.customer);
        setStep("found");
        localStorage.setItem(STORAGE_KEY, JSON.stringify(res.customer));
      } else {
        // Not found — proceed anyway
        onCustomerSelected(null);
        setOpen(false);
      }
    },
  });

  function handleLookup() {
    if (!phone || phone.length < 8) return;
    lookupMutation.mutate();
  }

  function handleSelect() {
    if (foundCustomer) {
      onCustomerSelected(foundCustomer);
      setOpen(false);
    }
  }

  function handleSkip() {
    onCustomerSelected(null);
    setOpen(false);
  }

  function formatRp(n: number): string {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleSkip(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="size-5 text-teal-600" />
            Selamat Datang!
          </DialogTitle>
          <DialogDescription>
            {step === "phone" && "Masukkan nomor HP untuk melanjutkan belanja."}
            {step === "found" && "Selamat datang kembali!"}
          </DialogDescription>
        </DialogHeader>

        {/* Step: Phone input */}
        {step === "phone" && (
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-stone-500">Nomor HP</Label>
              <Input
                type="tel"
                placeholder="08123456789"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1"
                onKeyDown={(e) => e.key === "Enter" && handleLookup()}
              />
            </div>
            <Button
              onClick={handleLookup}
              disabled={lookupMutation.isPending || phone.length < 8}
              className="w-full bg-teal-600 hover:bg-teal-700"
            >
              {lookupMutation.isPending ? "Mencari..." : "Lanjutkan"}
            </Button>
            <button
              onClick={handleSkip}
              className="w-full text-xs text-stone-400 hover:text-stone-600 text-center py-1"
            >
              Lewati, belanja dulu
            </button>
          </div>
        )}

        {/* Step: Found customer */}
        {step === "found" && foundCustomer && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-start gap-3">
              <CheckCircle2 className="size-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-semibold text-emerald-900">{foundCustomer.name}</div>
                <div className="text-sm text-emerald-700">{foundCustomer.phone}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-stone-50 border border-stone-200">
                <div className="flex items-center gap-2 text-stone-500 mb-1">
                  <ShoppingCart className="size-3.5" />
                  <span className="text-xs">Total Order</span>
                </div>
                <div className="text-lg font-extrabold text-stone-900">{foundCustomer.totalOrders}</div>
              </div>
              <div className="p-3 rounded-lg bg-stone-50 border border-stone-200">
                <div className="flex items-center gap-2 text-stone-500 mb-1">
                  <Wallet className="size-3.5" />
                  <span className="text-xs">Total Belanja</span>
                </div>
                <div className="text-lg font-extrabold text-stone-900">{formatRp(foundCustomer.totalSpent)}</div>
              </div>
            </div>

            <Button onClick={handleSelect} className="w-full bg-teal-600 hover:bg-teal-700">
              Belanja Sekarang <ArrowRight className="size-4 ml-1.5" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
