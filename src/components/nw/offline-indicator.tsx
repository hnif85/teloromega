"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { WifiOff } from "lucide-react";

/**
 * OfflineIndicator — listens to browser online/offline events and:
 *   • When offline: shows a fixed bottom-center banner with a slide-up
 *     entrance. The banner stays mounted as long as the browser reports
 *     offline.
 *   • When back online: fires a sonner toast "🟢 Kembali online!" and
 *     hides the banner (animated exit).
 *
 * The component itself renders nothing when online — it's a no-op until
 * the network state changes.
 *
 * Why framer-motion's AnimatePresence: we need a clean exit animation
 * (slide-down + fade) when the banner disappears, which CSS-only approaches
 * can't do without manual transition state plumbing.
 */
export function OfflineIndicator() {
  // Lazy initializer reads navigator.onLine on first client render. The
  // component only mounts after hydration (it's gated behind isLoggedIn),
  // so navigator is guaranteed available — no SSR mismatch.
  const [isOffline, setIsOffline] = useState(() => {
    if (typeof navigator === "undefined") return false;
    return !navigator.onLine;
  });

  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => {
      setIsOffline(false);
      toast.success("🟢 Kembali online!", {
        description: "Sinkronisasi data aktif kembali.",
      });
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          key="offline-banner"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-2rem)] max-w-md pointer-events-none"
          role="status"
          aria-live="polite"
        >
          <div className="pointer-events-auto flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 px-4 py-2.5 shadow-lg shadow-rose-900/20 text-white">
            <WifiOff className="size-4 shrink-0" />
            <p className="text-xs sm:text-sm font-medium leading-snug">
              Mode offline — perubahan disimpan lokal, sync saat online kembali
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
