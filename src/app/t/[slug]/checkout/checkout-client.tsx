"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useCart } from "../use-cart";
import {
  ArrowLeft,
  Package,
  CreditCard,
  Banknote,
  Smartphone,
  Truck,
  User,
  Phone,
  MapPin,
  FileText,
  Check,
  Loader2,
} from "lucide-react";

interface BrandData {
  id: string;
  name: string;
  slug: string;
  category: string;
  phone: string | null;
}

interface StoreSettings {
  paymentMethods: string[];
  minOrder: number;
}

const ALL_PAYMENT_METHODS = [
  { id: "transfer", label: "Transfer Bank", icon: CreditCard, desc: "BCA, Mandiri, BRI, BNI" },
  { id: "cod", label: "Bayar di Tempat (COD)", icon: Banknote, desc: "Bayar saat barang diterima" },
  { id: "qris", label: "QRIS / E-Wallet", icon: Smartphone, desc: "GoPay, OVO, DANA, ShopeePay" },
];

function formatRp(n: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
}

export default function CheckoutPage({ brand, settings }: { brand: BrandData; settings: StoreSettings }) {
  const router = useRouter();
  const cart = useCart(brand.id);

  const paymentMethods = ALL_PAYMENT_METHODS.filter((pm) =>
    settings.paymentMethods.includes(pm.id)
  );

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState(paymentMethods[0]?.id ?? "transfer");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [checkoutDone, setCheckoutDone] = useState(false);

  useEffect(() => {
    if (cart.loaded && cart.items.length === 0 && !checkoutDone) {
      router.replace(`/t/${brand.slug}`);
    }
  }, [cart.loaded, cart.items.length, brand.slug, router, checkoutDone]);

  async function handleSubmit() {
    if (!name.trim()) return setError("Nama wajib diisi");
    if (!phone.trim()) return setError("Nomor HP wajib diisi");
    if (!address.trim()) return setError("Alamat pengiriman wajib diisi");
    if (cart.items.length === 0) return setError("Keranjang kosong");
    if (settings.minOrder > 0 && cart.subtotal < settings.minOrder) {
      return setError(`Minimal pembelian ${formatRp(settings.minOrder)}`);
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/public/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId: brand.id,
          customerName: name.trim(),
          customerPhone: phone.trim(),
          customerAddress: address.trim(),
          notes: notes.trim() || undefined,
          paymentMethod,
          items: cart.items.map((i) => ({
            productId: i.productId,
            name: i.name,
            qty: i.qty,
            price: i.promoPrice ?? i.price,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Gagal membuat pesanan");
        setSubmitting(false);
        return;
      }

      cart.clearCart();
      setCheckoutDone(true);
      window.location.href = `/t/${brand.slug}/checkout/${data.orderId}`;
    } catch (e) {
      console.error("checkout error:", e);
      setError(e instanceof Error ? e.message : "Terjadi kesalahan. Coba lagi.");
      setSubmitting(false);
    }
  }

  if (!cart.loaded || cart.items.length === 0) return null;

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1 hover:bg-stone-100 rounded-lg">
            <ArrowLeft className="size-5 text-stone-600" />
          </button>
          <div>
            <h1 className="text-base font-bold text-stone-900">Checkout</h1>
            <p className="text-[11px] text-stone-400">{brand.name} &middot; {cart.totalItems} item</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4 pb-32">
        {/* Order Summary */}
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <h2 className="text-sm font-bold text-stone-900 mb-3 flex items-center gap-2">
            <Package className="size-4" /> Ringkasan Pesanan
          </h2>
          <div className="space-y-2">
            {cart.items.map((item) => (
              <div key={item.productId} className="flex items-center gap-3">
                <div className="size-12 bg-stone-100 rounded-lg shrink-0 overflow-hidden">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="size-full object-cover" />
                  ) : (
                    <div className="size-full flex items-center justify-center">
                      <Package className="size-5 text-stone-300" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-stone-900 line-clamp-1">{item.name}</p>
                  <p className="text-[10px] text-stone-400">{item.qty} x {formatRp(item.promoPrice ?? item.price)}</p>
                </div>
                <span className="text-xs font-bold text-stone-900 shrink-0">
                  {formatRp((item.promoPrice ?? item.price) * item.qty)}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-stone-100 mt-3 pt-3 flex justify-between items-center">
            <span className="text-sm font-semibold text-stone-600">Total</span>
            <span className="text-lg font-extrabold text-stone-900">{formatRp(cart.subtotal)}</span>
          </div>
        </div>

        {/* Customer Info */}
        <div className="bg-white rounded-xl border border-stone-200 p-4 space-y-3">
          <h2 className="text-sm font-bold text-stone-900 flex items-center gap-2">
            <User className="size-4" /> Data Diri
          </h2>
          <div>
            <label className="text-[11px] font-medium text-stone-500 mb-1 block">Nama Lengkap *</label>
            <Input
              placeholder="Masukkan nama"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 text-sm bg-white text-stone-900"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-stone-500 mb-1 block">Nomor HP / WhatsApp *</label>
            <Input
              placeholder="08xxxxxxxxxx"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-9 text-sm bg-white text-stone-900"
              type="tel"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-stone-500 mb-1 block">Alamat Pengiriman *</label>
            <textarea
              placeholder="Alamat lengkap (Jalan, No, RT/RW, Kel, Kec, Kota)"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full h-20 text-sm text-stone-900 bg-white border border-stone-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-stone-500 mb-1 block">Catatan (Opsional)</label>
            <Input
              placeholder="Warna, ukuran, catatan khusus..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-9 text-sm bg-white text-stone-900"
            />
          </div>
        </div>

        {/* Payment Method */}
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <h2 className="text-sm font-bold text-stone-900 mb-3 flex items-center gap-2">
            <CreditCard className="size-4" /> Metode Pembayaran
          </h2>
          <div className="space-y-2">
            {paymentMethods.map((pm) => {
              const Icon = pm.icon;
              const selected = paymentMethod === pm.id;
              return (
                <button
                  key={pm.id}
                  onClick={() => setPaymentMethod(pm.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-colors text-left ${
                    selected
                      ? "border-teal-500 bg-teal-50"
                      : "border-stone-200 hover:border-stone-300"
                  }`}
                >
                  <div className={`size-10 rounded-lg flex items-center justify-center shrink-0 ${
                    selected ? "bg-teal-100 text-teal-600" : "bg-stone-100 text-stone-400"
                  }`}>
                    <Icon className="size-5" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-stone-900">{pm.label}</div>
                    <div className="text-[11px] text-stone-400">{pm.desc}</div>
                  </div>
                  {selected && (
                    <div className="size-5 rounded-full bg-teal-500 text-white flex items-center justify-center shrink-0">
                      <Check className="size-3" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 text-red-600 text-xs font-medium px-4 py-2.5 rounded-xl border border-red-200">
            {error}
          </div>
        )}
      </div>

      {/* Sticky Bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 p-4 z-10">
        <div className="max-w-lg mx-auto">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-stone-500">Total Pembayaran</span>
            <span className="text-lg font-extrabold text-stone-900">{formatRp(cart.subtotal)}</span>
          </div>
          {settings.minOrder > 0 && cart.subtotal < settings.minOrder && (
            <p className="text-[10px] text-amber-600 mb-2 text-center">
              Minimal pembelian {formatRp(settings.minOrder)}
            </p>
          )}
          <Button
            className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-bold text-sm gap-2"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <><Loader2 className="size-4 animate-spin" /> Memproses...</>
            ) : (
              <>Bayar Sekarang — {formatRp(cart.subtotal)}</>
            )}
          </Button>
          <p className="text-[10px] text-stone-400 text-center mt-2">
            Pesanan akan dikirim ke {brand.name} untuk diproses
          </p>
        </div>
      </div>
    </div>
  );
}
