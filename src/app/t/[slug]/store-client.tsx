"use client";

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart, CartItem } from "./use-cart";
import {
  Store,
  MessageCircle,
  Phone,
  Share2,
  Copy,
  Check,
  Search,
  Package,
  X,
  ExternalLink,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  ArrowRight,
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

const CATEGORY_THEME: Record<string, { bg: string; accent: string; emoji: string }> = {
  Makanan: { bg: "from-orange-400 to-amber-500", accent: "orange", emoji: "🍜" },
  Minuman: { bg: "from-teal-400 to-cyan-500", accent: "teal", emoji: "☕" },
  Fashion: { bg: "from-violet-400 to-purple-500", accent: "violet", emoji: "👗" },
  Kecantikan: { bg: "from-pink-400 to-rose-500", accent: "pink", emoji: "💄" },
  Elektronik: { bg: "from-blue-400 to-indigo-500", accent: "blue", emoji: "📱" },
  Kesehatan: { bg: "from-emerald-400 to-green-500", accent: "emerald", emoji: "💊" },
  default: { bg: "from-teal-400 to-teal-600", accent: "teal", emoji: "🏪" },
};

function formatRp(n: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
}

export interface StoreSettings {
  checkoutEnabled: boolean;
  paymentMethods: string[];
  minOrder: number;
  shippingEnabled: boolean;
}

export function StoreClient({ brand, products, settings }: { brand: BrandData; products: ProductData[]; settings: StoreSettings }) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "barang" | "jasa">("all");
  const [selectedProduct, setSelectedProduct] = useState<ProductData | null>(null);
  const [copied, setCopied] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [addedToast, setAddedToast] = useState<string | null>(null);

  const cart = useCart(brand.id);
  const theme = CATEGORY_THEME[brand.category] ?? CATEGORY_THEME.default;
  const storeUrl = `usahaku.ai/t/${brand.slug}`;
  const waNumber = brand.phone?.replace(/[^0-9]/g, "");

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

  function handleShare(p: ProductData) {
    const text = `🛒 *${p.name}*\n${p.promoPrice ? `${formatRp(p.promoPrice)} ~~${formatRp(p.price)}~~` : formatRp(p.price)}\n\nLihat di ${storeUrl}`;
    if (navigator.share) {
      navigator.share({ title: p.name, text });
    } else {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(`https://${storeUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function goToCheckout() {
    setCartOpen(false);
    window.location.href = `/t/${brand.slug}/checkout`;
  }

  return (
    <div className="min-h-screen">
      {/* Hero Header */}
      <div className={`relative bg-gradient-to-br ${theme.bg} text-white overflow-hidden`}>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wOCI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyem0wLTR2MkgyNHYyaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-40" />
        <div className="relative max-w-lg mx-auto px-4 py-8 text-center">
          <div className="size-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-3 text-3xl">
            {brand.logoUrl ? (
              <img src={brand.logoUrl} alt={brand.name} className="size-full object-cover rounded-2xl" />
            ) : (
              <span>{theme.emoji}</span>
            )}
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">{brand.name}</h1>
          {brand.description && (
            <p className="text-sm text-white/80 mt-1.5 line-clamp-2 max-w-sm mx-auto">{brand.description}</p>
          )}
          <div className="flex items-center justify-center gap-2 mt-3">
            <Badge className="bg-white/20 text-white border-white/30 text-[10px] h-5">
              {brand.category}
            </Badge>
            <span className="text-[11px] text-white/60">{products.length} produk</span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-center gap-2 mt-4">
            {waNumber && (
              <Button
                size="sm"
                className="bg-white text-green-700 hover:bg-white/90 gap-1.5 font-semibold"
                onClick={() => {
                  const text = `Halo ${brand.name}, saya mau tanya-tanya produk`;
                  window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`, "_blank");
                }}
              >
                <MessageCircle className="size-4" /> Chat WhatsApp
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="bg-white/10 border-white/30 text-white hover:bg-white/20 gap-1.5"
              onClick={handleCopyLink}
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? "Tersalin" : "Salin Link"}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 -mt-4 relative z-10">
        {/* Search + Filter */}
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-3 space-y-2.5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-stone-400" />
            <Input
              placeholder="Cari produk..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm bg-stone-50 border-stone-200"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="size-3.5 text-stone-400 hover:text-stone-600" />
              </button>
            )}
          </div>
          <div className="flex gap-1.5">
            {(["all", "barang", "jasa"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  filterType === t
                    ? "bg-teal-100 text-teal-700"
                    : "bg-stone-100 text-stone-500 hover:bg-stone-200"
                }`}
              >
                {t === "all" ? "Semua" : t === "barang" ? "Produk" : "Jasa"}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="mt-4 space-y-3 pb-24">
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-2">🔍</div>
              <div className="text-sm font-semibold text-ink">Produk tidak ditemukan</div>
              <p className="text-xs text-stone mt-1">Coba kata kunci lain atau ubah filter</p>
            </div>
          ) : (
            filtered.map((p) => {
              const hasPromo = p.promoPrice != null && p.promoPrice < p.price;
              const isLowStock = p.type === "barang" && p.stock != null && p.stock <= 5;
              const isOut = p.type === "barang" && p.stock != null && p.stock <= 0;
              const inCart = cart.items.find((i) => i.productId === p.id);

              return (
                <div
                  key={p.id}
                  className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex">
                    {/* Image */}
                    <div
                      className="size-28 sm:size-32 bg-stone-100 flex items-center justify-center shrink-0 relative cursor-pointer"
                      onClick={() => setSelectedProduct(p)}
                    >
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} className="size-full object-cover" />
                      ) : (
                        <Package className="size-8 text-stone-300" />
                      )}
                      {hasPromo && (
                        <div className="absolute top-1.5 left-1.5 bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                          PROMO
                        </div>
                      )}
                      {isOut && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <span className="text-white text-xs font-bold bg-black/60 px-2 py-1 rounded">HABIS</span>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3
                            className="text-sm font-bold text-stone-900 line-clamp-2 leading-snug cursor-pointer hover:text-teal-600"
                            onClick={() => setSelectedProduct(p)}
                          >
                            {p.name}
                          </h3>
                          <Badge
                            variant="outline"
                            className={`text-[9px] h-4 py-0 shrink-0 ${
                              p.type === "barang"
                                ? "border-teal-200 text-teal-600 bg-teal-50"
                                : "border-orange-200 text-orange-600 bg-orange-50"
                            }`}
                          >
                            {p.type === "barang" ? "Produk" : "Jasa"}
                          </Badge>
                        </div>
                        {p.description && (
                          <p className="text-[11px] text-stone-500 mt-0.5 line-clamp-1">{p.description}</p>
                        )}
                      </div>

                      <div className="flex items-end justify-between mt-2">
                        <div>
                          {hasPromo ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-base font-extrabold text-rose-600">{formatRp(p.promoPrice!)}</span>
                              <span className="text-[11px] text-stone-400 line-through">{formatRp(p.price)}</span>
                            </div>
                          ) : (
                            <span className="text-base font-extrabold text-stone-900">{formatRp(p.price)}</span>
                          )}
                          {p.type === "barang" && p.stock != null && (
                            <span className={`text-[10px] ${isLowStock ? "text-amber-600 font-medium" : "text-stone-400"}`}>
                              Stok: {p.stock}{isLowStock ? " (tipis)" : ""}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="size-7 p-0 text-stone-400 hover:text-stone-600"
                            onClick={() => handleShare(p)}
                            title="Share"
                          >
                            <Share2 className="size-3.5" />
                          </Button>
                          {inCart && settings.checkoutEnabled ? (
                            <div className="flex items-center gap-1 bg-teal-50 rounded-lg border border-teal-200">
                              <button
                                className="size-7 flex items-center justify-center text-teal-600 hover:bg-teal-100 rounded-l-lg"
                                onClick={() => cart.updateQty(p.id, inCart.qty - 1)}
                              >
                                <Minus className="size-3" />
                              </button>
                              <span className="text-xs font-bold text-teal-700 w-5 text-center">{inCart.qty}</span>
                              <button
                                className="size-7 flex items-center justify-center text-teal-600 hover:bg-teal-100 rounded-r-lg"
                                onClick={() => cart.updateQty(p.id, inCart.qty + 1)}
                                disabled={p.stock != null && inCart.qty >= p.stock}
                              >
                                <Plus className="size-3" />
                              </button>
                            </div>
                          ) : settings.checkoutEnabled ? (
                            <Button
                              size="sm"
                              className="h-8 px-3 bg-green-600 hover:bg-green-700 text-white gap-1.5 text-xs font-semibold"
                              onClick={() => handleAddToCart(p)}
                              disabled={isOut}
                            >
                              <ShoppingCart className="size-3.5" /> {isOut ? "Habis" : "+ Keranjang"}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              className="h-8 px-3 bg-green-600 hover:bg-green-700 text-white gap-1.5 text-xs font-semibold"
                              onClick={() => handleOrderWhatsApp(p)}
                              disabled={isOut}
                            >
                              <MessageCircle className="size-3.5" /> {isOut ? "Habis" : "Pesan"}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Floating Cart Button */}
      {settings.checkoutEnabled && cart.totalItems > 0 && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-lg md:max-w-md">
          <button
            onClick={() => setCartOpen(true)}
            className="w-full h-14 bg-green-600 hover:bg-green-700 text-white rounded-2xl shadow-xl flex items-center justify-between px-5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <ShoppingCart className="size-5" />
                <span className="absolute -top-2 -right-2 bg-white text-green-700 text-[10px] font-bold size-5 rounded-full flex items-center justify-center">
                  {cart.totalItems}
                </span>
              </div>
              <div className="text-left">
                <div className="text-sm font-bold">{cart.totalItems} item</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold">{formatRp(cart.subtotal)}</span>
              <ArrowRight className="size-4" />
            </div>
          </button>
        </div>
      )}

      {/* Cart Drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCartOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            {/* Cart Header */}
            <div className="flex items-center justify-between p-4 border-b border-stone-200">
              <h2 className="font-bold text-stone-900 flex items-center gap-2">
                <ShoppingCart className="size-5" /> Keranjang
                <Badge className="bg-teal-100 text-teal-700 text-[10px] h-5">{cart.totalItems}</Badge>
              </h2>
              <button onClick={() => setCartOpen(false)} className="p-1 hover:bg-stone-100 rounded-lg">
                <X className="size-5 text-stone-500" />
              </button>
            </div>

            {/* Cart Items */}
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
                          <button
                            className="size-6 flex items-center justify-center text-stone-500 hover:bg-stone-100 rounded-l-lg"
                            onClick={() => cart.updateQty(item.productId, item.qty - 1)}
                          >
                            <Minus className="size-3" />
                          </button>
                          <span className="text-xs font-bold w-5 text-center">{item.qty}</span>
                          <button
                            className="size-6 flex items-center justify-center text-stone-500 hover:bg-stone-100 rounded-r-lg"
                            onClick={() => cart.updateQty(item.productId, item.qty + 1)}
                          >
                            <Plus className="size-3" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-stone-900">
                            {formatRp((item.promoPrice ?? item.price) * item.qty)}
                          </span>
                          <button
                            onClick={() => cart.removeItem(item.productId)}
                            className="p-1 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Cart Footer */}
            {cart.items.length > 0 && (
              <div className="border-t border-stone-200 p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-stone-600">Subtotal</span>
                  <span className="text-lg font-extrabold text-stone-900">{formatRp(cart.subtotal)}</span>
                </div>
                <Button
                  className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-bold text-sm gap-2"
                  onClick={goToCheckout}
                >
                  Checkout Sekarang <ArrowRight className="size-4" />
                </Button>
                <button
                  onClick={cart.clearCart}
                  className="w-full text-xs text-stone-400 hover:text-red-500 text-center py-1"
                >
                  Kosongkan keranjang
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Added to Cart Toast */}
      {addedToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[70] bg-green-600 text-white px-4 py-2 rounded-xl shadow-xl flex items-center gap-2 text-sm font-semibold animate-in fade-in slide-in-from-top-4 duration-200">
          <Check className="size-4" /> {addedToast} ditambahkan
        </div>
      )}

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedProduct(null)} />
          <div className="relative bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl overflow-hidden animate-in slide-in-from-bottom duration-200">
            <div className="relative h-56 sm:h-64 bg-stone-100">
              {selectedProduct.imageUrl ? (
                <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="size-full object-cover" />
              ) : (
                <div className="size-full flex items-center justify-center">
                  <Package className="size-16 text-stone-300" />
                </div>
              )}
              <button
                onClick={() => setSelectedProduct(null)}
                className="absolute top-3 right-3 size-8 bg-black/40 backdrop-blur-sm text-white rounded-full flex items-center justify-center hover:bg-black/60"
              >
                <X className="size-4" />
              </button>
              {selectedProduct.promoPrice != null && selectedProduct.promoPrice < selectedProduct.price && (
                <div className="absolute top-3 left-3 bg-rose-500 text-white text-xs font-bold px-2 py-1 rounded-lg">
                  PROMO
                </div>
              )}
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-lg font-bold text-stone-900">{selectedProduct.name}</h3>
                <Badge
                  variant="outline"
                  className={`text-[10px] h-5 shrink-0 ${
                    selectedProduct.type === "barang"
                      ? "border-teal-200 text-teal-600 bg-teal-50"
                      : "border-orange-200 text-orange-600 bg-orange-50"
                  }`}
                >
                  {selectedProduct.type === "barang" ? "Produk" : "Jasa"}
                </Badge>
              </div>
              {selectedProduct.description && (
                <p className="text-sm text-stone-500 mt-2">{selectedProduct.description}</p>
              )}
              <div className="flex items-center justify-between mt-4">
                <div>
                  {selectedProduct.promoPrice != null && selectedProduct.promoPrice < selectedProduct.price ? (
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-extrabold text-rose-600">{formatRp(selectedProduct.promoPrice)}</span>
                      <span className="text-sm text-stone-400 line-through">{formatRp(selectedProduct.price)}</span>
                    </div>
                  ) : (
                    <span className="text-2xl font-extrabold text-stone-900">{formatRp(selectedProduct.price)}</span>
                  )}
                  {selectedProduct.type === "barang" && selectedProduct.stock != null && (
                    <span className="text-xs text-stone-400 mt-1 block">
                      Stok: {selectedProduct.stock}
                    </span>
                  )}
                </div>
                <Button
                  className="h-10 px-5 bg-green-600 hover:bg-green-700 text-white gap-2 font-semibold"
                  onClick={() => {
                    if (settings.checkoutEnabled) {
                      handleAddToCart(selectedProduct);
                    } else {
                      handleOrderWhatsApp(selectedProduct);
                    }
                    setSelectedProduct(null);
                  }}
                  disabled={selectedProduct.type === "barang" && selectedProduct.stock != null && selectedProduct.stock <= 0}
                >
                  {settings.checkoutEnabled ? (
                    <><ShoppingCart className="size-4" /> Tambah ke Keranjang</>
                  ) : (
                    <><MessageCircle className="size-4" /> Pesan via WhatsApp</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating WhatsApp button (mobile) */}
      {waNumber && (!settings.checkoutEnabled || cart.totalItems === 0) && (
        <a
          href={`https://wa.me/${waNumber}?text=${encodeURIComponent(`Halo ${brand.name}, saya mau tanya-tanya produk`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-5 right-5 z-50 size-14 rounded-full bg-green-500 text-white shadow-lg flex items-center justify-center hover:bg-green-600 transition-colors md:hidden"
        >
          <MessageCircle className="size-7" />
        </a>
      )}
    </div>
  );
}
