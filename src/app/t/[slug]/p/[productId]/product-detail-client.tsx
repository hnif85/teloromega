"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCart } from "../../use-cart";
import { resolveStoreTheme, type StoreSettings } from "../../theme";
import {
  ArrowLeft,
  Share2,
  ShoppingCart,
  MessageCircle,
  Package,
  Plus,
  Minus,
  Check,
  ChevronRight,
} from "lucide-react";

interface BrandData {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  phone: string | null;
}

interface ProductData {
  id: string;
  name: string;
  type: string;
  price: number;
  promoPrice: number | null;
  stock: number | null;
  sku?: string | null;
  description: string | null;
  imageUrl: string | null;
}

function formatRp(n: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
}

export function ProductDetailClient({
  brand,
  product,
  similar,
  settings,
}: {
  brand: BrandData;
  product: ProductData;
  similar: ProductData[];
  settings: StoreSettings;
}) {
  const cart = useCart(brand.id);
  const theme = resolveStoreTheme(settings);
  const waNumber = brand.phone?.replace(/[^0-9]/g, "");
  const storeUrl = `usahaku.ai/t/${brand.slug}`;

  const hasPromo = product.promoPrice != null && product.promoPrice < product.price;
  const activePrice = hasPromo ? product.promoPrice! : product.price;
  const isBarang = product.type === "barang";
  const isOut = isBarang && product.stock != null && product.stock <= 0;
  const maxQty = isBarang && product.stock != null ? product.stock : 99;

  const [qty, setQty] = useState(1);
  const [toast, setToast] = useState(false);

  const primaryStyle = { background: "var(--store-primary)" } as const;

  function handleAdd() {
    cart.addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      promoPrice: product.promoPrice,
      imageUrl: product.imageUrl,
      type: product.type,
      stock: product.stock,
    });
    if (qty > 1) cart.updateQty(product.id, qty);
    setToast(true);
    setTimeout(() => setToast(false), 1800);
  }

  function handleWhatsApp() {
    const text = waNumber
      ? `Halo, saya tertarik dengan *${product.name}* (${formatRp(activePrice)}) sebanyak ${qty}. Apa masih ada?`
      : `Halo, saya tertarik dengan *${product.name}*. Apa masih ada?`;
    if (waNumber) window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`, "_blank");
    else {
      navigator.clipboard.writeText(text.replace(/\*/g, ""));
      alert("Pesan sudah disalin! Hubungi toko untuk pemesanan.");
    }
  }

  function handleShare() {
    const text = `🛒 *${product.name}*\n${formatRp(activePrice)}\n\nLihat di ${storeUrl}/p/${product.id}`;
    if (navigator.share) navigator.share({ title: product.name, text }).catch(() => {});
    else {
      navigator.clipboard.writeText(text);
      setToast(true);
      setTimeout(() => setToast(false), 1800);
    }
  }

  // Only rows we actually have data for (rest of the reference table needs fields
  // that don't exist in the schema yet, so they're intentionally omitted).
  const infoRows: { label: string; value: string }[] = [
    { label: "Jenis", value: isBarang ? "Produk / Barang" : "Jasa" },
    ...(product.sku ? [{ label: "SKU", value: product.sku }] : []),
    ...(isBarang && product.stock != null ? [{ label: "Stok tersedia", value: `${product.stock}` }] : []),
  ];

  const AddControls = (
    <div className="flex items-center gap-3">
      {settings.checkoutEnabled && !isOut && (
        <div className="flex items-center rounded-xl border border-stone-200">
          <button className="size-11 flex items-center justify-center text-stone-600 disabled:opacity-30" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1}>
            <Minus className="size-4" />
          </button>
          <span className="w-8 text-center text-sm font-bold">{qty}</span>
          <button className="size-11 flex items-center justify-center text-stone-600 disabled:opacity-30" onClick={() => setQty((q) => Math.min(maxQty, q + 1))} disabled={qty >= maxQty}>
            <Plus className="size-4" />
          </button>
        </div>
      )}
      {settings.checkoutEnabled ? (
        <Button
          className="flex-1 h-12 text-white font-bold gap-2 hover:opacity-95 disabled:opacity-50"
          style={primaryStyle}
          onClick={handleAdd}
          disabled={isOut}
        >
          <ShoppingCart className="size-4" /> {isOut ? "Stok Habis" : "Tambah ke Keranjang"}
        </Button>
      ) : (
        <Button className="flex-1 h-12 bg-green-600 hover:bg-green-700 text-white font-bold gap-2 disabled:opacity-50" onClick={handleWhatsApp} disabled={isOut}>
          <MessageCircle className="size-4" /> {isOut ? "Stok Habis" : "Pesan via WhatsApp"}
        </Button>
      )}
    </div>
  );

  return (
    <div style={theme.vars as React.CSSProperties} className="min-h-screen bg-stone-50 text-stone-800 pb-28 md:pb-10">
      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-stone-200">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href={`/t/${brand.slug}`} className="flex items-center gap-2 text-stone-700 hover:text-stone-900">
            <ArrowLeft className="size-5" />
            <span className="text-sm font-semibold hidden sm:inline">{brand.name}</span>
          </Link>
          <div className="flex items-center gap-1">
            <button onClick={handleShare} className="size-9 rounded-full hover:bg-stone-100 flex items-center justify-center text-stone-600">
              <Share2 className="size-4" />
            </button>
            {settings.checkoutEnabled && cart.totalItems > 0 && (
              <Link href={`/t/${brand.slug}/checkout`} className="relative size-9 rounded-full hover:bg-stone-100 flex items-center justify-center" style={{ color: "var(--store-primary-dark)" }}>
                <ShoppingCart className="size-4" />
                <span className="absolute -top-0.5 -right-0.5 bg-rose-500 text-white text-[9px] font-bold size-4 rounded-full flex items-center justify-center">{cart.totalItems}</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-6 pt-4 md:pt-8">
        <div className="grid md:grid-cols-2 gap-6 md:gap-10">
          {/* Image */}
          <div>
            <div className="relative rounded-2xl overflow-hidden bg-stone-100 aspect-square border border-stone-200">
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.name} className="size-full object-cover" />
              ) : (
                <div className="size-full flex items-center justify-center">
                  <Package className="size-20 text-stone-300" />
                </div>
              )}
              {hasPromo && <div className="absolute top-3 left-3 bg-rose-500 text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow">PROMO</div>}
              {isOut && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="text-white text-sm font-bold bg-black/60 px-3 py-1.5 rounded">STOK HABIS</span>
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div>
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-xl md:text-2xl font-extrabold text-stone-900 leading-tight">{product.name}</h1>
              <Badge
                variant="outline"
                className={`shrink-0 text-[10px] ${isBarang ? "border-teal-200 text-teal-600 bg-teal-50" : "border-orange-200 text-orange-600 bg-orange-50"}`}
              >
                {isBarang ? "Produk" : "Jasa"}
              </Badge>
            </div>

            <div className="mt-3 flex items-end gap-3">
              <span className="text-3xl font-black" style={{ color: hasPromo ? "#e11d48" : "var(--store-primary-dark)" }}>
                {formatRp(activePrice)}
              </span>
              {hasPromo && <span className="text-base text-stone-400 line-through pb-1">{formatRp(product.price)}</span>}
            </div>

            {isBarang && product.stock != null && (
              <div className="mt-2">
                {product.stock <= 0 ? (
                  <span className="text-sm font-semibold text-rose-600">Stok habis</span>
                ) : product.stock <= 5 ? (
                  <span className="text-sm font-medium text-amber-600">Stok tinggal {product.stock} — segera habis</span>
                ) : (
                  <span className="text-sm text-stone-500">Stok tersedia: {product.stock}</span>
                )}
              </div>
            )}

            {/* Description */}
            {product.description && (
              <div className="mt-5 rounded-2xl border border-stone-200 bg-white p-4">
                <h2 className="text-sm font-bold text-stone-900 mb-1.5">Deskripsi Produk</h2>
                <p className="text-sm text-stone-600 leading-relaxed whitespace-pre-line">{product.description}</p>
              </div>
            )}

            {/* Info table */}
            <div className="mt-4 rounded-2xl border border-stone-200 bg-white p-4">
              <h2 className="text-sm font-bold text-stone-900 mb-2">Informasi Produk</h2>
              <dl className="divide-y divide-stone-100">
                {infoRows.map((row) => (
                  <div key={row.label} className="flex justify-between py-2 text-sm">
                    <dt className="text-stone-500">{row.label}</dt>
                    <dd className="font-medium text-stone-800">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Desktop action */}
            <div className="mt-6 hidden md:block">{AddControls}</div>
          </div>
        </div>

        {/* Similar products */}
        {similar.length > 0 && (
          <div className="mt-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg md:text-xl font-extrabold text-stone-900">Produk Serupa</h2>
              <Link href={`/t/${brand.slug}`} className="text-sm font-semibold flex items-center gap-0.5" style={{ color: "var(--store-primary-dark)" }}>
                Lihat semua <ChevronRight className="size-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
              {similar.map((p) => {
                const promo = p.promoPrice != null && p.promoPrice < p.price;
                return (
                  <Link
                    key={p.id}
                    href={`/t/${brand.slug}/p/${p.id}`}
                    className="group bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="aspect-square bg-stone-100 relative">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} className="size-full object-cover group-hover:scale-[1.03] transition-transform" />
                      ) : (
                        <div className="size-full flex items-center justify-center">
                          <Package className="size-8 text-stone-300" />
                        </div>
                      )}
                      {promo && <div className="absolute top-2 left-2 bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">PROMO</div>}
                    </div>
                    <div className="p-3">
                      <h3 className="text-sm font-bold text-stone-900 line-clamp-2 leading-snug">{p.name}</h3>
                      <div className="mt-1">
                        {promo ? (
                          <span className="text-sm font-extrabold text-rose-600">{formatRp(p.promoPrice!)}</span>
                        ) : (
                          <span className="text-sm font-extrabold text-stone-900">{formatRp(p.price)}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Mobile sticky action bar */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-stone-200 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {AddControls}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[70] text-white px-4 py-2 rounded-xl shadow-xl flex items-center gap-2 text-sm font-semibold animate-in fade-in slide-in-from-top-4 duration-200" style={primaryStyle}>
          <Check className="size-4" /> Berhasil ditambahkan
        </div>
      )}
    </div>
  );
}
