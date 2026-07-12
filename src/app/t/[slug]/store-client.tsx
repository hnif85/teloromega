"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "./use-cart";
import { resolveStoreTheme, type StoreSettings } from "./theme";
import {
  MessageCircle,
  Copy,
  Check,
  Search,
  Package,
  X,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  ArrowRight,
  Home,
  LayoutGrid,
  ShieldCheck,
  Percent,
  Headphones,
  Truck,
  Sparkles,
} from "lucide-react";

interface BrandData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string;
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
  description: string | null;
  imageUrl: string | null;
}

function formatRp(n: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
}

export type { StoreSettings };

const FEATURES = [
  { icon: Sparkles, title: "Kualitas Terjamin", desc: "Produk pilihan terbaik" },
  { icon: Percent, title: "Harga Bersahabat", desc: "Hemat untuk usaha" },
  { icon: Headphones, title: "Layanan Ramah", desc: "Siap bantu kebutuhanmu" },
  { icon: ShieldCheck, title: "Aman & Terpercaya", desc: "Transaksi 100% aman" },
];

export function StoreClient({ brand, products, settings }: { brand: BrandData; products: ProductData[]; settings: StoreSettings }) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [copied, setCopied] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [addedToast, setAddedToast] = useState<string | null>(null);

  const cart = useCart(brand.id);
  const theme = resolveStoreTheme(settings);
  const storeUrl = `usahaku.ai/t/${brand.slug}`;
  const waNumber = brand.phone?.replace(/[^0-9]/g, "");

  // Real filters: our data only has product type (barang/jasa). Build pills from
  // what actually exists so every pill filters something.
  const typesPresent = useMemo(() => {
    const set = new Set(products.map((p) => p.type));
    return Array.from(set);
  }, [products]);

  const pills = useMemo(() => {
    const base = [{ id: "all", label: "Semua" }];
    if (typesPresent.includes("barang")) base.push({ id: "barang", label: "Produk" });
    if (typesPresent.includes("jasa")) base.push({ id: "jasa", label: "Jasa" });
    return base;
  }, [typesPresent]);

  const heroImages = useMemo(() => products.filter((p) => p.imageUrl).slice(0, 3), [products]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
      const matchType = filterType === "all" || p.type === filterType;
      return matchSearch && matchType;
    });
  }, [products, search, filterType]);

  function handleAddToCart(p: ProductData) {
    cart.addItem({
      productId: p.id,
      name: p.name,
      price: p.price,
      promoPrice: p.promoPrice,
      imageUrl: p.imageUrl,
      type: p.type,
      stock: p.stock,
    });
    setAddedToast(p.name);
    setTimeout(() => setAddedToast(null), 1500);
  }

  function handleOrderWhatsApp(p: ProductData) {
    const text = waNumber
      ? `Halo, saya tertarik dengan *${p.name}*${p.promoPrice ? ` (harga promo ${formatRp(p.promoPrice)})` : ` (${formatRp(p.price)})`}. Apa masih ada?`
      : `Halo, saya tertarik dengan *${p.name}*. Apa masih ada?`;
    if (waNumber) {
      window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`, "_blank");
    } else {
      navigator.clipboard.writeText(text.replace(/\*/g, ""));
      alert("Pesan sudah disalin! Hubungi toko untuk pemesanan.");
    }
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(`https://${storeUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function chatWhatsApp() {
    if (!waNumber) return;
    const text = `Halo ${brand.name}, saya mau tanya-tanya produk`;
    window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`, "_blank");
  }

  function goToCheckout() {
    setCartOpen(false);
    window.location.href = `/t/${brand.slug}/checkout`;
  }

  const primaryBtn = "text-white transition-colors";
  const primaryStyle = { background: "var(--store-primary)" } as const;

  return (
    <div id="top" style={theme.vars as React.CSSProperties} className="min-h-screen bg-stone-50 text-stone-800 pb-20 md:pb-0">
      {/* ══════════════ DESKTOP HERO + NAV ══════════════ */}
      <div className="hidden md:block px-6 pt-6">
        <div className="max-w-6xl mx-auto">
          <div
            className="relative overflow-hidden rounded-3xl text-white shadow-lg"
            style={{ backgroundImage: "linear-gradient(150deg, var(--store-hero-from), var(--store-hero-to))" }}
          >
            {/* Nav row */}
            <div className="relative flex items-center justify-between px-8 py-5 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center overflow-hidden">
                  {brand.logoUrl ? (
                    <img src={brand.logoUrl} alt={brand.name} className="size-full object-cover" />
                  ) : (
                    <span className="text-xl font-black">{brand.name.charAt(0)}</span>
                  )}
                </div>
                <div>
                  <div className="text-lg font-extrabold leading-tight">{brand.name}</div>
                  <div className="text-xs text-white/70">{brand.category}</div>
                </div>
              </div>
              <nav className="flex items-center gap-2">
                <a href="#produk" className="px-3 py-2 text-sm font-medium text-white/85 hover:text-white rounded-lg hover:bg-white/10 flex items-center gap-1.5">
                  <LayoutGrid className="size-4" /> Katalog
                </a>
                <button
                  onClick={handleCopyLink}
                  className="px-3 py-2 text-sm font-medium text-white/85 hover:text-white rounded-lg hover:bg-white/10 flex items-center gap-1.5"
                >
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? "Tersalin" : "Bagikan"}
                </button>
                {settings.checkoutEnabled && (
                  <button
                    onClick={() => setCartOpen(true)}
                    className="relative px-3 py-2 text-sm font-semibold rounded-lg bg-white/15 hover:bg-white/25 flex items-center gap-1.5"
                  >
                    <ShoppingCart className="size-4" /> Keranjang
                    {cart.totalItems > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 bg-white text-[10px] font-bold size-5 rounded-full flex items-center justify-center" style={{ color: "var(--store-primary-dark)" }}>
                        {cart.totalItems}
                      </span>
                    )}
                  </button>
                )}
              </nav>
            </div>

            {/* Banner row */}
            <div className="relative grid grid-cols-2 gap-8 px-8 py-10 items-center">
              <div>
                <h1 className="text-4xl font-black leading-[1.1] tracking-tight">
                  Produk berkualitas,
                  <br />
                  <span className="text-white/80">usaha makin mantap!</span>
                </h1>
                {brand.description && (
                  <p className="mt-4 text-sm text-white/80 max-w-md leading-relaxed line-clamp-3">{brand.description}</p>
                )}
                <div className="mt-6 flex items-center gap-2">
                  {waNumber && (
                    <button onClick={chatWhatsApp} className="h-11 px-5 rounded-xl bg-white font-semibold text-sm flex items-center gap-2 hover:bg-white/90" style={{ color: "var(--store-primary-dark)" }}>
                      <MessageCircle className="size-4" /> Chat WhatsApp
                    </button>
                  )}
                  <a href="#produk" className="h-11 px-5 rounded-xl bg-white/15 border border-white/25 font-semibold text-sm flex items-center gap-2 hover:bg-white/25">
                    Lihat Produk <ArrowRight className="size-4" />
                  </a>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3">
                {heroImages.length > 0 ? (
                  heroImages.map((p, i) => (
                    <div
                      key={p.id}
                      className={`rounded-2xl overflow-hidden bg-white/10 shadow-xl ${i === 1 ? "size-40 -mt-6" : "size-32"}`}
                    >
                      <img src={p.imageUrl!} alt={p.name} className="size-full object-cover" />
                    </div>
                  ))
                ) : (
                  <div className="size-40 rounded-3xl bg-white/10 flex items-center justify-center text-6xl">🏪</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════ MOBILE HERO ══════════════ */}
      <div className="md:hidden relative overflow-hidden text-white" style={{ backgroundImage: "linear-gradient(160deg, var(--store-hero-from), var(--store-hero-to))" }}>
        <div className="relative px-4 pt-5 pb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="size-10 rounded-xl bg-white/15 flex items-center justify-center overflow-hidden">
                {brand.logoUrl ? (
                  <img src={brand.logoUrl} alt={brand.name} className="size-full object-cover" />
                ) : (
                  <span className="text-lg font-black">{brand.name.charAt(0)}</span>
                )}
              </div>
              <div>
                <div className="text-base font-extrabold leading-tight">{brand.name}</div>
                <div className="text-[11px] text-white/70">{brand.category}</div>
              </div>
            </div>
            {settings.checkoutEnabled && (
              <button onClick={() => setCartOpen(true)} className="relative size-10 rounded-full bg-white/15 flex items-center justify-center">
                <ShoppingCart className="size-5" />
                {cart.totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-white text-[10px] font-bold size-5 rounded-full flex items-center justify-center" style={{ color: "var(--store-primary-dark)" }}>
                    {cart.totalItems}
                  </span>
                )}
              </button>
            )}
          </div>

          <div className="mt-5 flex items-center gap-3">
            <div className="flex-1">
              <h1 className="text-2xl font-black leading-[1.15] tracking-tight">
                Produk berkualitas, usaha makin mantap!
              </h1>
              <a href="#produk" className="mt-3 inline-flex h-9 px-4 rounded-lg bg-white items-center gap-1.5 text-sm font-bold" style={{ color: "var(--store-primary-dark)" }}>
                Belanja Sekarang <ArrowRight className="size-4" />
              </a>
            </div>
            {heroImages[0] && (
              <div className="size-24 rounded-2xl overflow-hidden bg-white/10 shrink-0 shadow-lg">
                <img src={heroImages[0].imageUrl!} alt="" className="size-full object-cover" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════ SEARCH + PILLS (shared) ══════════════ */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 -mt-4 md:mt-6 relative z-10">
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-3 md:p-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-stone-400" />
            <Input
              placeholder="Cari produk untuk usahamu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-11 text-sm bg-stone-50 border-stone-200 rounded-xl"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3.5 top-1/2 -translate-y-1/2">
                <X className="size-4 text-stone-400 hover:text-stone-600" />
              </button>
            )}
          </div>
          {pills.length > 1 && (
            <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar">
              {pills.map((t) => {
                const active = filterType === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setFilterType(t.id)}
                    className="px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors border"
                    style={
                      active
                        ? { background: "var(--store-primary)", color: "#fff", borderColor: "var(--store-primary)" }
                        : { background: "#fff", color: "#57534e", borderColor: "#e7e5e4" }
                    }
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ══════════════ FEATURE STRIP ══════════════ */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 mt-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-white rounded-2xl border border-stone-200 p-3 md:p-4 flex items-center gap-3">
              <div className="size-9 md:size-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--store-primary-tint)" }}>
                <f.icon className="size-4 md:size-5" style={{ color: "var(--store-primary-dark)" }} />
              </div>
              <div className="min-w-0">
                <div className="text-xs md:text-sm font-bold text-stone-900 truncate">{f.title}</div>
                <div className="text-[10px] md:text-xs text-stone-500 truncate">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════ PRODUCT GRID ══════════════ */}
      <div id="produk" className="max-w-6xl mx-auto px-4 md:px-6 mt-7 scroll-mt-4">
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="text-lg md:text-2xl font-extrabold text-stone-900">Produk Unggulan</h2>
            <p className="text-xs md:text-sm text-stone-500">{filtered.length} produk tersedia</p>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-stone-200">
            <div className="text-4xl mb-2">🔍</div>
            <div className="text-sm font-semibold text-stone-900">Produk tidak ditemukan</div>
            <p className="text-xs text-stone-500 mt-1">Coba kata kunci lain atau ubah filter</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
            {filtered.map((p) => {
              const hasPromo = p.promoPrice != null && p.promoPrice < p.price;
              const isLowStock = p.type === "barang" && p.stock != null && p.stock <= 5;
              const isOut = p.type === "barang" && p.stock != null && p.stock <= 0;
              const inCart = cart.items.find((i) => i.productId === p.id);
              const detailHref = `/t/${brand.slug}/p/${p.id}`;

              return (
                <div key={p.id} className="group bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
                  <Link href={detailHref} className="relative block aspect-square bg-stone-100">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} className="size-full object-cover group-hover:scale-[1.03] transition-transform" />
                    ) : (
                      <div className="size-full flex items-center justify-center">
                        <Package className="size-10 text-stone-300" />
                      </div>
                    )}
                    {hasPromo && (
                      <div className="absolute top-2 left-2 bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow">PROMO</div>
                    )}
                    {isOut && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white text-xs font-bold bg-black/60 px-2.5 py-1 rounded">HABIS</span>
                      </div>
                    )}
                  </Link>

                  <div className="p-3 flex flex-col flex-1">
                    <Link href={detailHref}>
                      <h3 className="text-sm font-bold text-stone-900 line-clamp-2 leading-snug hover:opacity-80">{p.name}</h3>
                    </Link>
                    {p.description && <p className="text-[11px] text-stone-400 mt-0.5 line-clamp-1">{p.description}</p>}

                    <div className="mt-auto pt-2.5 flex items-end justify-between gap-2">
                      <div className="min-w-0">
                        {hasPromo ? (
                          <div className="flex flex-col">
                            <span className="text-[11px] text-stone-400 line-through leading-none">{formatRp(p.price)}</span>
                            <span className="text-base font-extrabold text-rose-600 leading-tight">{formatRp(p.promoPrice!)}</span>
                          </div>
                        ) : (
                          <span className="text-base font-extrabold text-stone-900">{formatRp(p.price)}</span>
                        )}
                        {p.type === "barang" && p.stock != null && (
                          <span className={`block text-[10px] ${isLowStock ? "text-amber-600 font-medium" : "text-stone-400"}`}>
                            Stok: {p.stock}
                            {isLowStock ? " (tipis)" : ""}
                          </span>
                        )}
                      </div>

                      {settings.checkoutEnabled ? (
                        inCart ? (
                          <div className="flex items-center gap-1 rounded-full shrink-0" style={{ background: "var(--store-primary-tint)" }}>
                            <button className="size-8 flex items-center justify-center rounded-full" style={{ color: "var(--store-primary-dark)" }} onClick={() => cart.updateQty(p.id, inCart.qty - 1)}>
                              <Minus className="size-3.5" />
                            </button>
                            <span className="text-xs font-bold w-4 text-center" style={{ color: "var(--store-primary-dark)" }}>{inCart.qty}</span>
                            <button
                              className="size-8 flex items-center justify-center rounded-full disabled:opacity-40"
                              style={{ color: "var(--store-primary-dark)" }}
                              onClick={() => cart.updateQty(p.id, inCart.qty + 1)}
                              disabled={p.stock != null && inCart.qty >= p.stock}
                            >
                              <Plus className="size-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleAddToCart(p)}
                            disabled={isOut}
                            className={`size-9 rounded-full flex items-center justify-center shadow-sm shrink-0 disabled:opacity-40 ${primaryBtn}`}
                            style={primaryStyle}
                            title="Tambah ke keranjang"
                          >
                            <ShoppingCart className="size-4" />
                          </button>
                        )
                      ) : (
                        <button
                          onClick={() => handleOrderWhatsApp(p)}
                          disabled={isOut}
                          className="size-9 rounded-full bg-green-600 hover:bg-green-700 text-white flex items-center justify-center shadow-sm shrink-0 disabled:opacity-40"
                          title="Pesan via WhatsApp"
                        >
                          <MessageCircle className="size-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* CTA banner */}
        {waNumber && (
          <div className="mt-8 mb-4 rounded-2xl border border-stone-200 bg-white p-5 md:p-6 flex flex-col md:flex-row items-center gap-4 justify-between">
            <div className="flex items-center gap-3 text-center md:text-left">
              <div className="size-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--store-primary-tint)" }}>
                <Truck className="size-5" style={{ color: "var(--store-primary-dark)" }} />
              </div>
              <div>
                <div className="font-bold text-stone-900">Belanja lebih mudah dengan {brand.name}</div>
                <div className="text-sm text-stone-500">Dapatkan produk terbaik untuk mendukung usahamu setiap hari.</div>
              </div>
            </div>
            <button onClick={chatWhatsApp} className="h-11 px-5 rounded-xl text-white font-semibold text-sm flex items-center gap-2 shrink-0" style={primaryStyle}>
              <MessageCircle className="size-4" /> Hubungi Toko
            </button>
          </div>
        )}
      </div>

      {/* ══════════════ DESKTOP FLOATING CART ══════════════ */}
      {settings.checkoutEnabled && cart.totalItems > 0 && (
        <button
          onClick={() => setCartOpen(true)}
          className="hidden md:flex fixed bottom-6 right-6 z-40 h-14 px-5 rounded-2xl text-white shadow-xl items-center gap-3"
          style={primaryStyle}
        >
          <div className="relative">
            <ShoppingCart className="size-5" />
            <span className="absolute -top-2 -right-2 bg-white text-[10px] font-bold size-5 rounded-full flex items-center justify-center" style={{ color: "var(--store-primary-dark)" }}>
              {cart.totalItems}
            </span>
          </div>
          <span className="text-sm font-extrabold">{formatRp(cart.subtotal)}</span>
          <ArrowRight className="size-4" />
        </button>
      )}

      {/* ══════════════ CART DRAWER ══════════════ */}
      {cartOpen && (
        <div className="fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCartOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between p-4 border-b border-stone-200">
              <h2 className="font-bold text-stone-900 flex items-center gap-2">
                <ShoppingCart className="size-5" /> Keranjang
                <Badge className="text-[10px] h-5 text-white" style={primaryStyle}>{cart.totalItems}</Badge>
              </h2>
              <button onClick={() => setCartOpen(false)} className="p-1 hover:bg-stone-100 rounded-lg">
                <X className="size-5 text-stone-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.items.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-4xl mb-2">🛒</div>
                  <p className="text-sm text-stone-500">Keranjang kosong</p>
                  <p className="text-xs text-stone-400 mt-1">Tambahkan produk dari toko</p>
                </div>
              ) : (
                cart.items.map((item) => (
                  <div key={item.productId} className="flex gap-3 p-3 bg-stone-50 rounded-xl">
                    <div className="size-16 bg-stone-200 rounded-lg shrink-0 overflow-hidden">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="size-full object-cover" />
                      ) : (
                        <div className="size-full flex items-center justify-center">
                          <Package className="size-6 text-stone-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-stone-900 line-clamp-1">{item.name}</h4>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {item.promoPrice ? (
                          <>
                            <span className="text-xs font-bold text-rose-600">{formatRp(item.promoPrice)}</span>
                            <span className="text-[10px] text-stone-400 line-through">{formatRp(item.price)}</span>
                          </>
                        ) : (
                          <span className="text-xs font-bold text-stone-900">{formatRp(item.price)}</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1 bg-white rounded-lg border border-stone-200">
                          <button className="size-6 flex items-center justify-center text-stone-500 hover:bg-stone-100 rounded-l-lg" onClick={() => cart.updateQty(item.productId, item.qty - 1)}>
                            <Minus className="size-3" />
                          </button>
                          <span className="text-xs font-bold w-5 text-center">{item.qty}</span>
                          <button className="size-6 flex items-center justify-center text-stone-500 hover:bg-stone-100 rounded-r-lg" onClick={() => cart.updateQty(item.productId, item.qty + 1)}>
                            <Plus className="size-3" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-stone-900">{formatRp((item.promoPrice ?? item.price) * item.qty)}</span>
                          <button onClick={() => cart.removeItem(item.productId)} className="p-1 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded">
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.items.length > 0 && (
              <div className="border-t border-stone-200 p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-stone-600">Subtotal</span>
                  <span className="text-lg font-extrabold text-stone-900">{formatRp(cart.subtotal)}</span>
                </div>
                <Button className="w-full h-12 text-white font-bold text-sm gap-2 hover:opacity-95" style={primaryStyle} onClick={goToCheckout}>
                  Checkout Sekarang <ArrowRight className="size-4" />
                </Button>
                <button onClick={cart.clearCart} className="w-full text-xs text-stone-400 hover:text-red-500 text-center py-1">
                  Kosongkan keranjang
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════ TOAST ══════════════ */}
      {addedToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[70] text-white px-4 py-2 rounded-xl shadow-xl flex items-center gap-2 text-sm font-semibold animate-in fade-in slide-in-from-top-4 duration-200" style={primaryStyle}>
          <Check className="size-4" /> {addedToast} ditambahkan
        </div>
      )}

      {/* ══════════════ MOBILE BOTTOM TAB BAR ══════════════ */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-stone-200 px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-around">
          <a href="#top" className="flex flex-col items-center gap-0.5 py-1 px-3 text-stone-500">
            <Home className="size-5" />
            <span className="text-[10px] font-medium">Beranda</span>
          </a>
          <a href="#produk" className="flex flex-col items-center gap-0.5 py-1 px-3 text-stone-500">
            <LayoutGrid className="size-5" />
            <span className="text-[10px] font-medium">Produk</span>
          </a>
          {settings.checkoutEnabled && (
            <button onClick={() => setCartOpen(true)} className="relative flex flex-col items-center gap-0.5 py-1 px-3" style={{ color: "var(--store-primary-dark)" }}>
              <div className="relative">
                <ShoppingCart className="size-5" />
                {cart.totalItems > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-rose-500 text-white text-[9px] font-bold size-4 rounded-full flex items-center justify-center">{cart.totalItems}</span>
                )}
              </div>
              <span className="text-[10px] font-medium">Keranjang</span>
            </button>
          )}
          {waNumber && (
            <button onClick={chatWhatsApp} className="flex flex-col items-center gap-0.5 py-1 px-3 text-stone-500">
              <MessageCircle className="size-5" />
              <span className="text-[10px] font-medium">Chat</span>
            </button>
          )}
        </div>
      </nav>
    </div>
  );
}
