"use client";

import { useState, useEffect, useCallback } from "react";

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  promoPrice: number | null;
  imageUrl: string | null;
  type: string;
  stock: number | null;
  qty: number;
}

function cartKey(brandId: string) {
  return `cart_${brandId}`;
}

export function useCart(brandId: string) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(cartKey(brandId));
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    setLoaded(true);
  }, [brandId]);

  useEffect(() => {
    if (loaded) {
      localStorage.setItem(cartKey(brandId), JSON.stringify(items));
    }
  }, [items, loaded, brandId]);

  const addItem = useCallback(
    (product: Omit<CartItem, "qty">) => {
      setItems((prev) => {
        const existing = prev.find((i) => i.productId === product.productId);
        if (existing) {
          const maxQty = product.stock ?? 999;
          return prev.map((i) =>
            i.productId === product.productId
              ? { ...i, qty: Math.min(i.qty + 1, maxQty) }
              : i
          );
        }
        return [...prev, { ...product, qty: 1 }];
      });
    },
    []
  );

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const updateQty = useCallback((productId: string, qty: number) => {
    if (qty <= 0) {
      setItems((prev) => prev.filter((i) => i.productId !== productId));
    } else {
      setItems((prev) =>
        prev.map((i) =>
          i.productId === productId
            ? { ...i, qty: Math.min(qty, i.stock ?? 999) }
            : i
        )
      );
    }
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const totalItems = items.reduce((s, i) => s + i.qty, 0);
  const subtotal = items.reduce(
    (s, i) => s + (i.promoPrice ?? i.price) * i.qty,
    0
  );

  return { items, addItem, removeItem, updateQty, clearCart, totalItems, subtotal, loaded };
}
