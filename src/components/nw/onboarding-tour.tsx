"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Onboarding Tour — 8-step guided walkthrough with spotlight effect.
//
// Behavior:
// · Auto-shows a "Mulai Tour?" prompt 5s after hydration on first visit
//   (gated by localStorage `nw_tour_completed`).
// · Tour can also be triggered manually from Pengaturan > Profil via
//   the exported `startTour()` helper (mirrors `openCommandPalette()`).
// · Each spotlight step dims the screen with 4 dark divs leaving the
//   target element visible, plus a tooltip with arrow.
// · Modal steps (welcome + get-started) use a centered card over a full
//   dark overlay.
// · Esc = skip, ←/→ = prev/next, finish writes localStorage and closes.
// ─────────────────────────────────────────────────────────────────────────────

const TOUR_COMPLETED_KEY = "nw_tour_completed";
export const START_TOUR_EVENT = "nw:start-tour";

export function startTour() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(START_TOUR_EVENT));
  }
}

interface TourStep {
  selector?: string;
  title: string;
  description: string;
  modal?: boolean;
}

const STEPS: TourStep[] = [
  {
    title: "Selamat datang di usahaku.ai! 🎉",
    description:
      "Aku akan kenalin kamu ke fitur-fitur utama. Klik 'Lanjut' untuk mulai tour.",
    modal: true,
  },
  {
    selector: '[data-tour="sidebar-nav"]',
    title: "Navigasi Utama",
    description:
      "Ini navigasi utama. Kamu bisa pindah antar modul: Beranda, Insights, Produk, Riset, Konten, Toko, Keuangan.",
  },
  {
    selector: '[data-tour="brand-switcher"]',
    title: "Brand Switcher",
    description:
      "Brand aktif kamu ada di sini. Klik untuk ganti brand atau buat brand baru. Semua data di usahaku.ai di-filter per brand.",
  },
  {
    selector: '[data-tour="credit-button"]',
    title: "Credit",
    description:
      "Credit dipakai untuk aksi AI (riset, generate konten, campaign). Klik untuk top-up atau cek riwayat pemakaian.",
  },
  {
    selector: '[data-tour="command-palette"]',
    title: "Command Palette",
    description:
      "Tekan Cmd+K (atau Ctrl+K) kapan saja untuk buka command palette — navigasi cepat ke mana saja.",
  },
  {
    selector: '[data-tour="notifications"]',
    title: "Notifikasi",
    description:
      "Notifikasi penting muncul di sini: stok menipis, pembayaran pending, leads yang perlu follow-up.",
  },
  {
    selector: '[data-tour="theme-toggle"]',
    title: "Theme Toggle",
    description:
      "Klik untuk ganti mode terang/gelap. Pilihan kamu disimpan otomatis.",
  },
  {
    title: "Sudut kanan bawah",
    description:
      "Itulah dasar-dasarnya! 💡 Tips: mulai dari Riset untuk dapat rekomendasi konten + harga + proyeksi keuangan otomatis. Atau klik 'Muat Data Demo' di Pengaturan untuk eksplorasi dengan data contoh. Selamat berjualan! 🚀",
    modal: true,
  },
];

const TOOLTIP_WIDTH = 360;
const SPOTLIGHT_PAD = 8;

export function OnboardingTour() {
  const hydrated = useAppStore((s) => s.hydrated);
  const [step, setStep] = useState<number | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  // ── Auto-prompt on first visit ──────────────────────────────────────────
  useEffect(() => {
    if (!hydrated) return;
    if (typeof window === "undefined") return;
    let done = false;
    try {
      done = !!localStorage.getItem(TOUR_COMPLETED_KEY);
    } catch {
      done = false;
    }
    if (done) return;
    const t = setTimeout(() => setShowPrompt(true), 5000);
    return () => clearTimeout(t);
  }, [hydrated]);

  // ── Manual start via event (from Pengaturan button) ─────────────────────
  useEffect(() => {
    const onStart = () => {
      setShowPrompt(false);
      setStep(0);
    };
    window.addEventListener(START_TOUR_EVENT, onStart as EventListener);
    return () =>
      window.removeEventListener(START_TOUR_EVENT, onStart as EventListener);
  }, []);

  // ── Track viewport + tick to force re-render on scroll/resize ──────────
  // Rect is computed during render (read-only DOM access) so we avoid the
  // "setState in effect" anti-pattern. A `tick` counter is bumped by event
  // listeners to trigger re-renders that pick up fresh rect coordinates.
  const [, setTick] = useState(0);
  useEffect(() => {
    const bump = () => setTick((t) => (t + 1) % 1_000_000);
    window.addEventListener("resize", bump);
    window.addEventListener("scroll", bump, true);
    // Poll for layout shifts (e.g. dialog open/close, async data load)
    const interval = setInterval(bump, 400);
    return () => {
      window.removeEventListener("resize", bump);
      window.removeEventListener("scroll", bump, true);
      clearInterval(interval);
    };
  }, []);

  const markCompleted = useCallback(() => {
    try {
      localStorage.setItem(TOUR_COMPLETED_KEY, "true");
    } catch {
      /* ignore quota errors */
    }
  }, []);

  const finish = useCallback(() => {
    setStep(null);
    markCompleted();
  }, [markCompleted]);

  const next = useCallback(() => {
    setStep((s) => {
      if (s === null) return s;
      if (s >= STEPS.length - 1) {
        markCompleted();
        return null;
      }
      return s + 1;
    });
  }, [markCompleted]);

  const prev = useCallback(() => {
    setStep((s) => (s === null || s === 0 ? s : s - 1));
  }, []);

  // ── Keyboard navigation ─────────────────────────────────────────────────
  useEffect(() => {
    if (step === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        finish();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, finish, next, prev]);

  const dismissPrompt = useCallback(() => {
    setShowPrompt(false);
    markCompleted();
  }, [markCompleted]);

  const beginTour = useCallback(() => {
    setShowPrompt(false);
    setStep(0);
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────
  // Compute the spotlight rect directly from the DOM during render (read-only).
  // This avoids the "setState in effect" anti-pattern. Re-renders are triggered
  // by the `tick` state above (bumped on scroll/resize/interval).
  const isModal =
    step !== null && (STEPS[step].modal || !STEPS[step].selector);

  const viewport =
    typeof window !== "undefined"
      ? { w: window.innerWidth, h: window.innerHeight }
      : { w: 0, h: 0 };

  let rect: DOMRect | null = null;
  if (step !== null && !isModal && STEPS[step].selector) {
    if (typeof document !== "undefined") {
      const el = document.querySelector(STEPS[step].selector!);
      if (el) {
        const r = el.getBoundingClientRect();
        const pad = SPOTLIGHT_PAD;
        rect = new DOMRect(
          Math.max(0, r.left - pad),
          Math.max(0, r.top - pad),
          r.width + pad * 2,
          r.height + pad * 2
        );
      }
    }
  }

  const showSpotlight = step !== null && !isModal && rect !== null;
  const showFallbackModal = step !== null && !isModal && rect === null;

  // Tooltip placement: below if target is in top half of viewport, above otherwise.
  let tooltipStyle: React.CSSProperties = {};
  let arrowBelow = true;
  if (showSpotlight && rect && viewport.h > 0) {
    const placeBelow = rect.top + rect.height / 2 < viewport.h / 2;
    arrowBelow = placeBelow;
    let left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
    left = Math.max(16, Math.min(viewport.w - TOOLTIP_WIDTH - 16, left));
    if (placeBelow) {
      tooltipStyle = {
        position: "fixed",
        top: rect.bottom + 16,
        left,
        width: TOOLTIP_WIDTH,
      };
    } else {
      tooltipStyle = {
        position: "fixed",
        top: Math.max(16, rect.top - 16 - 280), // approx tooltip height ~280; clamped
        left,
        width: TOOLTIP_WIDTH,
      };
    }
  }

  return (
    <>
      {/* ── First-visit prompt card (bottom-right toast-style) ── */}
      <AnimatePresence>
        {showPrompt && step === null && (
          <motion.div
            key="tour-prompt"
            className="fixed bottom-4 right-4 z-[110] w-[340px] max-w-[calc(100vw-2rem)]"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <div className="rounded-2xl bg-card border border-border shadow-xl p-4">
              <div className="flex items-start gap-3">
                <div className="size-10 rounded-xl bg-teal-100 text-teal flex items-center justify-center text-xl shrink-0">
                  🎯
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-ink text-sm">
                    Mau tour singkat?
                  </div>
                  <p className="text-xs text-stone mt-0.5 leading-relaxed">
                    Kenalan dengan fitur-fitur usahaku.ai dalam 1 menit.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={dismissPrompt}
                  aria-label="Tutup"
                  className="text-stone hover:text-ink transition-colors shrink-0"
                >
                  <X className="size-4" />
                </button>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <Button
                  size="sm"
                  className="bg-teal hover:bg-teal-600 text-white gap-1.5"
                  onClick={beginTour}
                >
                  <Sparkles className="size-3.5" /> Mulai Tour
                </Button>
                <Button size="sm" variant="ghost" onClick={dismissPrompt}>
                  Nanti saja
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Tour overlay (spotlight or modal) ── */}
      <AnimatePresence>
        {step !== null && (
          <motion.div
            key="tour-overlay"
            className="fixed inset-0 z-[100] pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {showSpotlight && rect ? (
              <>
                {/* 4 dark divs forming the spotlight hole */}
                <div
                  className="fixed bg-black/50 pointer-events-auto"
                  style={{
                    top: 0,
                    left: 0,
                    right: 0,
                    height: rect.top,
                    transition: "height 0.3s ease",
                  }}
                />
                <div
                  className="fixed bg-black/50 pointer-events-auto"
                  style={{
                    top: rect.bottom,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    transition: "top 0.3s ease",
                  }}
                />
                <div
                  className="fixed bg-black/50 pointer-events-auto"
                  style={{
                    top: rect.top,
                    left: 0,
                    width: rect.left,
                    height: rect.height,
                    transition: "top 0.3s ease, height 0.3s ease, width 0.3s ease",
                  }}
                />
                <div
                  className="fixed bg-black/50 pointer-events-auto"
                  style={{
                    top: rect.top,
                    left: rect.right,
                    right: 0,
                    height: rect.height,
                    transition: "top 0.3s ease, height 0.3s ease, left 0.3s ease",
                  }}
                />
                {/* Highlight border around the target */}
                <div
                  className="fixed rounded-lg pointer-events-none border-2 border-teal shadow-[0_0_0_4px_rgba(13,148,136,0.15)]"
                  style={{
                    top: rect.top,
                    left: rect.left,
                    width: rect.width,
                    height: rect.height,
                    transition:
                      "top 0.3s ease, left 0.3s ease, width 0.3s ease, height 0.3s ease",
                  }}
                />
                {/* Tooltip */}
                <motion.div
                  key={`tooltip-${step}`}
                  className="fixed z-[101] bg-card border border-border rounded-xl shadow-2xl p-4"
                  style={tooltipStyle}
                  initial={{ opacity: 0, scale: 0.92, y: arrowBelow ? -6 : 6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                >
                  {/* Arrow pointing at the target */}
                  <div
                    className="absolute size-3 bg-card border-border rotate-45"
                    style={
                      arrowBelow
                        ? {
                            top: -7,
                            left: "50%",
                            marginLeft: -6,
                            borderTopWidth: 1,
                            borderLeftWidth: 1,
                            borderStyle: "solid",
                            borderColor: "var(--border)",
                          }
                        : {
                            bottom: -7,
                            left: "50%",
                            marginLeft: -6,
                            borderBottomWidth: 1,
                            borderRightWidth: 1,
                            borderStyle: "solid",
                            borderColor: "var(--border)",
                          }
                    }
                  />

                  <TourCard
                    step={step}
                    total={STEPS.length}
                    title={STEPS[step].title}
                    description={STEPS[step].description}
                    onPrev={prev}
                    onNext={next}
                    onSkip={finish}
                  />
                </motion.div>
              </>
            ) : (
              <>
                {/* Full dark overlay for modal steps (or fallback when target not found) */}
                <div className="fixed inset-0 bg-black/50 pointer-events-auto" />
                <motion.div
                  key={`modal-${step}`}
                  className="fixed z-[101] left-1/2 top-1/2 bg-card border border-border rounded-2xl shadow-2xl p-6 w-[440px] max-w-[calc(100vw-2rem)]"
                  style={{
                    transform: "translate(-50%, -50%)",
                  }}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                >
                  <TourCard
                    step={step}
                    total={STEPS.length}
                    title={STEPS[step].title}
                    description={STEPS[step].description}
                    onPrev={prev}
                    onNext={next}
                    onSkip={finish}
                    variant="modal"
                  />
                </motion.div>
              </>
            )}
            {/* Suppress unused warning for showFallbackModal — handled by the modal branch above */}
            {showFallbackModal ? null : null}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TourCard — shared step UI (used by both tooltip and modal variants)
// ─────────────────────────────────────────────────────────────────────────────
function TourCard({
  step,
  total,
  title,
  description,
  onPrev,
  onNext,
  onSkip,
  variant = "tooltip",
}: {
  step: number;
  total: number;
  title: string;
  description: string;
  onPrev: () => void;
  onNext: () => void;
  onSkip: () => void;
  variant?: "tooltip" | "modal";
}) {
  const isFirst = step === 0;
  const isLast = step === total - 1;
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <div className="text-[10px] font-bold uppercase tracking-wider text-teal bg-teal-100 px-2 py-0.5 rounded-md">
          {step + 1} / {total}
        </div>
        {variant === "modal" && (
          <button
            type="button"
            onClick={onSkip}
            aria-label="Lewati tour"
            className="ml-auto text-stone hover:text-ink transition-colors"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
      <h3
        className={cn(
          "font-bold text-ink mb-1.5",
          variant === "modal" ? "text-lg" : "text-sm"
        )}
      >
        {title}
      </h3>
      <p
        className={cn(
          "text-stone leading-relaxed mb-4",
          variant === "modal" ? "text-sm" : "text-sm"
        )}
      >
        {description}
      </p>
      <div className="flex items-center justify-between gap-2">
        {variant === "tooltip" ? (
          <button
            type="button"
            onClick={onSkip}
            className="text-xs text-stone hover:text-danger font-medium transition-colors"
          >
            Lewati
          </button>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onPrev}
            disabled={isFirst}
            className="gap-1 h-8"
          >
            <ChevronLeft className="size-3.5" /> Sebelumnya
          </Button>
          <Button
            size="sm"
            className="bg-teal hover:bg-teal-600 text-white gap-1 h-8"
            onClick={onNext}
          >
            {isLast ? "Selesai" : "Lanjut"}
            {!isLast && <ChevronRight className="size-3.5" />}
          </Button>
        </div>
      </div>
      {/* Progress dots */}
      <div className="flex items-center justify-center gap-1 mt-4">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1 rounded-full transition-all",
              i === step ? "w-6 bg-teal" : "w-1.5 bg-cream-300"
            )}
          />
        ))}
      </div>
    </div>
  );
}
