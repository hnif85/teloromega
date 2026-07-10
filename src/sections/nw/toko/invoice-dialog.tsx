"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { useAppStore } from "@/lib/store";
import {
  InvoicePrint,
  type InvoiceBrand,
  type InvoiceCustomer,
  type OrderWithDetails,
} from "@/sections/nw/toko/invoice-print";

// ─────────────────────────────────────────────────────────────────────────────
// InvoiceDialog — preview an order's printable invoice inside a Dialog and
// trigger window.print() to print / save-as-PDF. The actual print pipeline
// is driven by the @media print CSS in globals.css which hides everything
// except the .invoice-print subtree.
// ─────────────────────────────────────────────────────────────────────────────

interface InvoiceDialogProps {
  order: OrderWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InvoiceDialog({ order, open, onOpenChange }: InvoiceDialogProps) {
  const { brands, activeBrandId } = useAppStore();

  // Resolve brand from store using order.brandId (falls back to active brand).
  const brand =
    (order
      ? brands.find((b) => b.id === order.brandId)
      : null) ??
    brands.find((b) => b.id === activeBrandId) ??
    null;

  const brandInfo: InvoiceBrand | null = brand
    ? {
        name: brand.name,
        slug: brand.slug,
        description: brand.description,
        category: brand.category,
      }
    : null;

  // Resolve customer from order.customer or order.lead (walk-in if neither).
  const customer: InvoiceCustomer | null = order?.customer
    ? { name: order.customer.name, phone: order.customer.phone }
    : order?.lead
      ? { name: order.lead.name, phone: order.lead.phone }
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Printer className="size-4 text-teal" />
            Invoice / Struk Penjualan
          </DialogTitle>
          <DialogDescription>
            {order
              ? `Order #${order.id.slice(-8).toUpperCase()} · ${customer?.name ?? "Walk-in Customer"}`
              : "Memuat…"}
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable invoice preview area — gray backdrop to make the white A4 pop */}
        <div className="bg-stone-200/60 dark:bg-stone-900/40 overflow-y-auto max-h-[70vh] p-4 sm:p-6">
          {order ? (
            <div className="mx-auto shadow-xl" style={{ maxWidth: "210mm" }}>
              <InvoicePrint
                order={order}
                brand={brandInfo}
                customer={customer}
              />
            </div>
          ) : (
            <div className="text-center text-sm text-stone py-12">
              Tidak ada order untuk ditampilkan.
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border shrink-0 bg-card">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
          <Button
            className="bg-teal hover:bg-teal-600 text-white gap-1.5"
            onClick={() => window.print()}
            disabled={!order}
          >
            <Printer className="size-4" /> Cetak / Simpan PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
