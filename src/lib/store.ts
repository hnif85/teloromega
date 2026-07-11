"use client";

import { create } from "zustand";
import type { SectionKey } from "@/lib/constants";

// ── Navigate bridge ──────────────────────────────────────────────────────────
// Allows the dashboard layout to register a router.push() callback so that
// store.setSection() navigates the browser URL AND updates the store state.
// This way all existing code (80+ call sites) works without changes.
// eslint-disable-next-line prefer-const
let _navigate: ((path: string) => void) | null = null;
export function registerNavigate(fn: ((path: string) => void) | null) {
  _navigate = fn;
}

/** Convert section key to URL path */
function sectionToPath(s: SectionKey): string {
  return `/${s}`;
}
/** Convert URL path to section key */
export function pathToSection(path: string): SectionKey {
  const key = path.replace(/^\//, "").split("/")[0];
  // Validate it's a known section — fall back to beranda
  const known: SectionKey[] = [
    "beranda", "insights", "produk", "riset", "konten", "toko",
    "keuangan", "credit", "pengaturan", "bantuan", "aktivitas", "notifikasi",
  ];
  return known.includes(key as SectionKey) ? (key as SectionKey) : "beranda";
}

export interface Brand {

  setSession: (s: { user: SessionUser; brands: Brand[]; activeBrandId: string | null }) => void;
  setSection: (s: SectionKey) => void;
  setActiveBrand: (id: string) => void;
  setOnboardingOpen: (open: boolean) => void;
  setOnboardingStep: (step: number) => void;
  updateCredit: (delta: number) => void;
  setCredit: (balance: number) => void;
  addBrand: (b: Brand, skipOnboardingClose?: boolean) => void;
  updateBrand: (b: Brand) => void;
  setHydrated: (h: boolean) => void;
  logout: () => void;
  clearBrands: () => void;
  completeOnboarding: () => void;
}

export const useAppStore = create<SessionState>((set) => ({
  user: null,
  brands: [],
  activeBrandId: null,
  section: "beranda",
  hydrated: false,
  onboardingOpen: false,
  isLoggedIn: false,
  onboardingStep: 0,

  setSession: (s) =>
    set({
      user: s.user,
      brands: s.brands,
      activeBrandId: s.activeBrandId ?? s.brands[0]?.id ?? null,
      hydrated: true,
      isLoggedIn: true,
      onboardingOpen: !s.user.isOnboarded,
      onboardingStep: s.user.isOnboarded ? 0 : (s.brands.length > 0 ? 2 : 1),
    }),
  setSection: (s) => {
    set({ section: s });
    _navigate?.(sectionToPath(s));
  },
  setActiveBrand: (id) => set({ activeBrandId: id }),
  setOnboardingOpen: (open) => set({ onboardingOpen: open }),
  updateCredit: (delta) =>
    set((st) => (st.user ? { user: { ...st.user, creditBalance: st.user.creditBalance + delta } } : {})),
  setCredit: (balance) =>
    set((st) => (st.user ? { user: { ...st.user, creditBalance: balance } } : {})),
  addBrand: (b, skipOnboardingClose = false) =>
    set((st) => ({
      brands: [...st.brands, b],
      activeBrandId: b.id,
      onboardingOpen: skipOnboardingClose ? st.onboardingOpen : false,
    })),
  updateBrand: (b) =>
    set((st) => ({ brands: st.brands.map((x) => (x.id === b.id ? b : x)) })),
  setHydrated: (h) => set({ hydrated: h }),
  setOnboardingStep: (step) => set({ onboardingStep: step }),
  completeOnboarding: () =>
    set((st) => ({
      user: st.user ? { ...st.user, isOnboarded: true } : null,
      onboardingOpen: false,
      onboardingStep: 0,
    })),
  logout: () =>
    set({
      user: null,
      brands: [],
      activeBrandId: null,
      section: "beranda",
      isLoggedIn: false,
      onboardingOpen: false,
      hydrated: true,
    }),
  clearBrands: () =>
    set({ brands: [], activeBrandId: null, onboardingOpen: true, section: "beranda" }),
}));

export const getActiveBrand = (st: SessionState): Brand | null =>
  st.brands.find((b) => b.id === st.activeBrandId) ?? st.brands[0] ?? null;
