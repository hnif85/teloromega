"use client";

import { create } from "zustand";
import type { SectionKey } from "@/lib/constants";

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  description: string | null;
  category: string;
  toneOfVoice: string;
  isActive: boolean;
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  creditBalance: number;
  toneOfVoice: string;
}

export interface SessionState {
  user: SessionUser | null;
  brands: Brand[];
  activeBrandId: string | null;
  section: SectionKey;
  hydrated: boolean;
  onboardingOpen: boolean;
  isLoggedIn: boolean;

  setSession: (s: { user: SessionUser; brands: Brand[]; activeBrandId: string | null }) => void;
  setSection: (s: SectionKey) => void;
  setActiveBrand: (id: string) => void;
  setOnboardingOpen: (open: boolean) => void;
  updateCredit: (delta: number) => void;
  setCredit: (balance: number) => void;
  addBrand: (b: Brand) => void;
  updateBrand: (b: Brand) => void;
  setHydrated: (h: boolean) => void;
  logout: () => void;
  clearBrands: () => void;
}

export const useAppStore = create<SessionState>((set) => ({
  user: null,
  brands: [],
  activeBrandId: null,
  section: "beranda",
  hydrated: false,
  onboardingOpen: false,
  isLoggedIn: false,

  setSession: (s) =>
    set({
      user: s.user,
      brands: s.brands,
      activeBrandId: s.activeBrandId ?? s.brands[0]?.id ?? null,
      hydrated: true,
      isLoggedIn: true,
      onboardingOpen: s.brands.length === 0,
    }),
  setSection: (s) => set({ section: s }),
  setActiveBrand: (id) => set({ activeBrandId: id }),
  setOnboardingOpen: (open) => set({ onboardingOpen: open }),
  updateCredit: (delta) =>
    set((st) => (st.user ? { user: { ...st.user, creditBalance: st.user.creditBalance + delta } } : {})),
  setCredit: (balance) =>
    set((st) => (st.user ? { user: { ...st.user, creditBalance: balance } } : {})),
  addBrand: (b) =>
    set((st) => ({ brands: [...st.brands, b], activeBrandId: b.id, onboardingOpen: false })),
  updateBrand: (b) =>
    set((st) => ({ brands: st.brands.map((x) => (x.id === b.id ? b : x)) })),
  setHydrated: (h) => set({ hydrated: h }),
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
