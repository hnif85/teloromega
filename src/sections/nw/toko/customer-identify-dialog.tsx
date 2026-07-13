"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { useToast } from "@/hooks/use-toast";
import { formatRupiah, timeAgo } from "@/lib/constants";
import { Phone, UserPlus, CheckCircle2, ShoppingCart, Wallet } from "lucide-react";

interface CustomerData {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  totalOrders: number;
  totalSpent: number;
  lastOrderAt: string | null;
  createdAt: string;
}

interface CustomerIdentifyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandId: string;
  onCustomerSelected: (customer: CustomerData | null) => void;
}

export function CustomerIdentifyDialog({
  open,
  onOpenChange,
  brandId,
  onCustomerSelected,
}: CustomerIdentifyDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<"phone" | "found">("phone");
  const [phone, setPhone] = useState("");
  const [foundCustomer, setFoundCustomer] = useState<CustomerData | null>(null);

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
      } else {
        // Not found — proceed anyway, register during checkout
        setFoundCustomer(null);
        onCustomerSelected(null);
        onOpenChange(false);
        reset();
      }
    },
    onError: (e: Error) =>
      toast({ title: "Gagal", description: e.message, variant: "destructive" }),
  });

  function handleLookup() {
    if (!phone || phone.length < 8) {
      toast({ title: "Nomor HP tidak valid", variant: "destructive" });
      return;
    }
    lookupMutation.mutate();
  }

  function handleSelect() {
    onCustomerSelected(foundCustomer);
    onOpenChange(false);
    reset();
  }

  function handleSkip() {
    onCustomerSelected(null);
    onOpenChange(false);
    reset();
  }

  function reset() {
    setStep("phone");
    setPhone("");
    setFoundCustomer(null);
  }

  function handleClose(v: boolean) {
    if (!v) reset();
    onOpenChange(v);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="size-5 text-teal" />
            Identifikasi Customer
          </DialogTitle>
          <DialogDescription>
            {step === "phone" && "Masukkan nomor HP customer untuk cek apakah sudah terdaftar."}
            {step === "found" && "Customer ditemukan! Berikut data yang tersimpan."}
          </DialogDescription>
        </DialogHeader>

        {/* Step: Phone input */}
        {step === "phone" && (
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-stone">Nomor HP</Label>
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
              disabled={lookupMutation.isPending}
              className="w-full bg-teal hover:bg-teal-600"
            >
              {lookupMutation.isPending ? "Mencari..." : "Cari Customer"}
            </Button>
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
                {foundCustomer.email && (
                  <div className="text-xs text-emerald-600 mt-0.5">{foundCustomer.email}</div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-card border border-border">
                <div className="flex items-center gap-2 text-stone mb-1">
                  <ShoppingCart className="size-3.5" />
                  <span className="text-xs">Total Order</span>
                </div>
                <div className="text-xl font-extrabold text-ink">{foundCustomer.totalOrders}</div>
              </div>
              <div className="p-3 rounded-lg bg-card border border-border">
                <div className="flex items-center gap-2 text-stone mb-1">
                  <Wallet className="size-3.5" />
                  <span className="text-xs">Total Belanja</span>
                </div>
                <div className="text-xl font-extrabold text-ink">{formatRupiah(foundCustomer.totalSpent)}</div>
              </div>
            </div>

            {foundCustomer.lastOrderAt && (
              <div className="text-xs text-stone text-center">
                Order terakhir: {timeAgo(foundCustomer.lastOrderAt)}
              </div>
            )}

            <Button
              onClick={handleSelect}
              className="w-full bg-teal hover:bg-teal-600"
            >
              Pilih Customer Ini
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
