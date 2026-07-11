"use client";

import { useEffect } from "react";

/**
 * SWRegister — registers the service worker for PWA offline support.
 *
 * Only registers in production. In dev, Next.js recompiles JS chunks on
 * every change, so a service worker caching them would serve stale code
 * and break hot reload. We avoid that entirely by gating on NODE_ENV.
 *
 * Errors are swallowed (`.catch(() => {})`) because SW failure is
 * non-fatal — the app still works online, just without offline caching.
 */
export function SWRegister() {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production"
    ) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return null;
}
