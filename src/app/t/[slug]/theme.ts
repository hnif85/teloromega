// Store theme resolution — preset palettes + custom hex, applied via CSS variables.
// Shared by the storefront (store-client) and the product detail page.

export interface StoreSettings {
  checkoutEnabled: boolean;
  paymentMethods: string[];
  minOrder: number;
  shippingEnabled: boolean;
  theme?: string; // preset key, e.g. "green"
  themeColor?: string; // custom hex (#RRGGBB), overrides preset when set
}

// Base color per preset. Every shade/gradient is derived from this so a custom
// hex works exactly like a preset.
export const STORE_THEME_PRESETS: { key: string; label: string; base: string }[] = [
  { key: "green", label: "Hijau", base: "#16A34A" },
  { key: "teal", label: "Tosca", base: "#0D9488" },
  { key: "orange", label: "Oranye", base: "#EA580C" },
  { key: "violet", label: "Ungu", base: "#7C3AED" },
  { key: "blue", label: "Biru", base: "#2563EB" },
  { key: "rose", label: "Merah", base: "#E11D48" },
];

const PRESET_MAP = Object.fromEntries(STORE_THEME_PRESETS.map((p) => [p.key, p.base]));

const DEFAULT_BASE = PRESET_MAP.green;

function clamp(n: number) {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  if (Number.isNaN(n) || h.length !== 6) return hexToRgb(DEFAULT_BASE);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((v) => clamp(v).toString(16).padStart(2, "0")).join("");
}

// amt < 0 darkens toward black, amt > 0 lightens toward white
function shade(hex: string, amt: number): string {
  const [r, g, b] = hexToRgb(hex);
  const t = amt < 0 ? 0 : 255;
  const p = Math.abs(amt);
  return rgbToHex(r + (t - r) * p, g + (t - g) * p, b + (t - b) * p);
}

function rgba(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export interface ResolvedTheme {
  base: string;
  vars: Record<string, string>;
}

export function resolveStoreTheme(settings: Partial<StoreSettings> | null | undefined): ResolvedTheme {
  const custom = settings?.themeColor;
  const preset = settings?.theme ? PRESET_MAP[settings.theme] : undefined;
  const base = (custom && /^#?[0-9a-fA-F]{6}$/.test(custom.replace("#", "").padStart(6, "0")) ? (custom.startsWith("#") ? custom : `#${custom}`) : undefined) || preset || DEFAULT_BASE;

  return {
    base,
    vars: {
      "--store-primary": base,
      "--store-primary-dark": shade(base, -0.16),
      "--store-primary-darker": shade(base, -0.34),
      "--store-primary-tint": rgba(base, 0.1),
      "--store-primary-tint-strong": rgba(base, 0.16),
      "--store-hero-from": shade(base, -0.02),
      "--store-hero-to": shade(base, -0.38),
      "--store-ring": rgba(base, 0.4),
    },
  };
}
