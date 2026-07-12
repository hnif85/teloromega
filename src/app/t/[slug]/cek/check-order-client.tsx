"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Package,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  ShoppingBag,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface BrandData {
  id: string;
  name: string;
  slug: string;
  category: string;
  phone: string | null;
}

interface OrderItem {
  name: string;
  qty: number;
  price: number;
}

interface OrderSummary {
  id: string;
  totalAmount: number;
  status: string;
  items: OrderItem[];
  notes: string | null;
  createdAt: string;
}

const STATUS_ICON: Record<string, React.ElementType> = {
  Baru: Clock,
  Diproses: Package,
  Dikirim: Package,
  Selesai: CheckCircle,
  Dibatalkan: AlertCircle,
};

const STATUS_COLOR: Record<string, string> = {
  Baru: "bg-amber-100 text-amber-700 border-amber-200",
  Diproses: "bg-blue-100 text-blue-700 border-blue-200",
  Dikirim: "bg-violet-100 text-violet-700 border-violet-200",
  Selesai: "bg-green-100 text-green-700 border-green-200",
  Dibatalkan: "bg-red-100 text-red-700 border-red-200",
};

function formatRp(n: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
}

export function CheckOrderClient({ brand }: { brand: BrandData }) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [customerName, setCustomerName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleLookup() {
    if (!phone.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/public/orders?brandId=${brand.id}&phone=${encodeURIComponent(phone.trim())}`);
      const data = await res.json();
      setOrders(data.orders ?? []);
      setCustomerName(data.customer?.name ?? null);
    } catch {
      setOrders([]);
      setCustomerName(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-teal-500 to-teal-700 text-white">
        <div className="max-w-lg mx-auto px-4 py-8">
          <button onClick={() => router.push(`/t/${brand.slug}`)} className="flex items-center gap-1 text-white/70 hover:text-white text-xs mb-3">
            <ArrowLeft className="size-3" /> Kembali ke Toko
          </button>
          <h1 className="text-xl font-extrabold">Cek Pesanan</h1>
          <p className="text-sm text-white/80 mt-1">{brand.name}</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-4 relative z-10 space-y-4 pb-8">
        {/* Phone input */}
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <h2 className="text-sm font-bold text-stone-900 mb-3 flex items-center gap-2">
            <Search className="size-4" /> Cek dengan Nomor HP
          </h2>
          <p className="text-xs text-stone-500 mb-3">
            Masukkan nomor HP yang sama seperti saat checkout
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="0812xxxxxxxx"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLookup()}
              className="h-10 text-sm bg-white text-stone-900"
              type="tel"
            />
            <Button
              className="bg-teal-600 hover:bg-teal-700 h-10 px-4 shrink-0"
              onClick={handleLookup}
              disabled={loading}
            >
              {loading ? (
                <div className="size-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <Search className="size-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Results */}
        {searched && (
          <>
            {customerName && (
              <div className="bg-white rounded-xl border border-stone-200 p-3">
                <p className="text-xs text-stone-500">
                  Pesanan atas nama: <span className="font-bold text-stone-900">{customerName}</span>
                </p>
              </div>
            )}

            {orders.length === 0 && !loading ? (
              <div className="bg-white rounded-xl border border-stone-200 p-8 text-center">
                <div className="text-3xl mb-2">📦</div>
                <p className="text-sm font-semibold text-stone-900">Tidak ditemukan</p>
                <p className="text-xs text-stone-400 mt-1">
                  Belum ada pesanan dengan nomor HP ini di {brand.name}
                </p>
                <Button
                  variant="outline"
                  className="mt-3"
                  onClick={() => router.push(`/t/${brand.slug}`)}
                >
                  Belanja Sekarang
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((o) => {
                  const Icon = STATUS_ICON[o.status] ?? Clock;
                  return (
                    <div key={o.id} className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                      {/* Order header */}
                      <div className="p-4 flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-stone-500">
                              #{o.id.slice(-8).toUpperCase()}
                            </span>
                            <Badge className={`text-[9px] h-4 ${STATUS_COLOR[o.status] ?? ""}`}>
                              {o.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Icon className="size-3.5 text-stone-400" />
                            <span className="text-xs text-stone-400">
                              {new Date(o.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-base font-extrabold text-stone-900">{formatRp(o.totalAmount)}</div>
                        </div>
                      </div>

                      {/* Items */}
                      <div className="border-t border-stone-100 px-4 py-2 bg-stone-50/50">
                        <div className="space-y-1">
                          {o.items.map((item: OrderItem, idx: number) => (
                            <div key={idx} className="flex justify-between text-xs">
                              <span className="text-stone-600">{item.name} x{item.qty}</span>
                              <span className="text-stone-400">{formatRp(item.price * item.qty)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Empty state — before search */}
        {!searched && (
          <div className="bg-white rounded-xl border border-stone-200 p-8 text-center">
            <div className="text-3xl mb-2">📱</div>
            <p className="text-sm font-semibold text-stone-900">Cek Status Pesanan</p>
            <p className="text-xs text-stone-400 mt-1">
              Masukkan nomor HP untuk melihat semua pesanan kamu di {brand.name}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
