// The Next Whiz — shared constants (mirrors LOGIC_FLOW v0.1.1)

export const CATEGORIES = [
  "Makanan & Minuman",
  "Fashion",
  "Kerajinan",
  "Jasa",
  "Kecantikan",
  "Lainnya",
] as const;

export type ToneKey =
  | "santai_ramah"
  | "profesional"
  | "energik"
  | "hangat"
  | "humoris"
  | "edukatif";

export const TONES: { key: ToneKey; icon: string; label: string; desc: string }[] = [
  { key: "santai_ramah", icon: "😄", label: "Santai & Ramah", desc: "Hangat, gaul, mudah didekati" },
  { key: "profesional", icon: "💼", label: "Profesional", desc: "Formal, to the point, terpercaya" },
  { key: "energik", icon: "🔥", label: "Enerjik & Bold", desc: "Semangat, berani, kadang ngegas" },
  { key: "hangat", icon: "🤗", label: "Hangat & Personal", desc: "Personal, storytelling, emosional" },
  { key: "humoris", icon: "😂", label: "Humoris", desc: "Lucu, relatable, meme-friendly" },
  { key: "edukatif", icon: "🎓", label: "Edukatif", desc: "Berguna, faktual, tips & trik" },
];

export const TONE_MAP: Record<ToneKey, string> = TONES.reduce(
  (acc, t) => ({ ...acc, [t.key]: t.label }),
  {} as Record<ToneKey, string>
);

export type CreditActionKey =
  | "riset.pasar"
  | "riset.kompetitor"
  | "riset.keyword"
  | "konten.gambar"
  | "konten.video"
  | "konten.caption"
  | "konten.carousel"
  | "toko.ai_chat_reply"
  | "toko.campaign_wa"
  | "toko.campaign_email"
  | "keuangan.proyeksi";

export const CREDIT_RATES: {
  key: CreditActionKey;
  name: string;
  cost: number;
  module: string;
}[] = [
  { key: "riset.pasar", name: "Riset Pasar", cost: 5, module: "riset" },
  { key: "riset.kompetitor", name: "Riset Kompetitor", cost: 8, module: "riset" },
  { key: "riset.keyword", name: "Riset Keyword", cost: 3, module: "riset" },
  { key: "konten.gambar", name: "Konten Gambar", cost: 4, module: "konten" },
  { key: "konten.video", name: "Konten Video (script)", cost: 6, module: "konten" },
  { key: "konten.caption", name: "Konten Caption", cost: 2, module: "konten" },
  { key: "konten.carousel", name: "Konten Carousel", cost: 5, module: "konten" },
  { key: "toko.ai_chat_reply", name: "AI Chat Reply", cost: 1, module: "toko" },
  { key: "toko.campaign_wa", name: "Campaign WA Broadcast", cost: 8, module: "toko" },
  { key: "toko.campaign_email", name: "Campaign Email", cost: 10, module: "toko" },
  { key: "keuangan.proyeksi", name: "Proyeksi Keuangan", cost: 3, module: "keuangan" },
];

export const CREDIT_COST: Record<CreditActionKey, number> = CREDIT_RATES.reduce(
  (acc, r) => ({ ...acc, [r.key]: r.cost }),
  {} as Record<CreditActionKey, number>
);

export const CREDIT_PACKAGES = [
  { id: "starter", credits: 50, price: 49000, label: "Starter", bonus: 0 },
  { id: "growth", credits: 120, price: 99000, label: "Growth", bonus: 10 },
  { id: "pro", credits: 300, price: 249000, label: "Pro", bonus: 30 },
  { id: "scale", credits: 800, price: 599000, label: "Scale", bonus: 100 },
];

export type SectionKey =
  | "beranda"
  | "insights"
  | "produk"
  | "riset"
  | "konten"
  | "toko"
  | "keuangan"
  | "kalender"
  | "credit"
  | "pengaturan"
  | "bantuan"
  | "aktivitas"
  | "notifikasi";

export const NAV_ITEMS: { key: SectionKey; label: string; icon: string }[] = [
  { key: "beranda", label: "Beranda", icon: "📊" },
  { key: "insights", label: "Insights", icon: "📈" },
  { key: "produk", label: "Produk", icon: "📦" },
  { key: "riset", label: "Riset", icon: "🔍" },
  { key: "konten", label: "Konten", icon: "📝" },
  { key: "toko", label: "Toko", icon: "🛒" },
  { key: "keuangan", label: "Keuangan", icon: "💰" },
  { key: "kalender", label: "Kalender", icon: "📅" },
];

export const SECONDARY_NAV: { key: SectionKey; label: string; icon: string }[] = [
  { key: "credit", label: "Credit", icon: "⚡" },
  { key: "notifikasi", label: "Notifikasi", icon: "🔔" },
  { key: "pengaturan", label: "Pengaturan", icon: "⚙️" },
  { key: "bantuan", label: "Bantuan", icon: "❓" },
  { key: "aktivitas", label: "Aktivitas", icon: "📋" },
];

export const KONTEN_TYPES = [
  { key: "caption", label: "Caption", icon: "✍️", cost: 2, desc: "Teks caption IG/TikTok" },
  { key: "gambar", label: "Gambar", icon: "🎨", cost: 4, desc: "Visual AI untuk postingan" },
  { key: "video", label: "Video Script", icon: "🎬", cost: 6, desc: "Skenario video pendek" },
  { key: "carousel", label: "Carousel", icon: "📃", cost: 5, desc: "Multi-slide caption" },
] as const;

export const LEAD_STAGES = [
  { key: "Baru", label: "Baru", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { key: "Negosiasi", label: "Negosiasi", color: "bg-sky-100 text-sky-700 border-sky-200" },
  { key: "Deal", label: "Deal", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { key: "Closed", label: "Closed", color: "bg-stone-100 text-stone-600 border-stone-200" },
] as const;

export const ORDER_STATUS = [
  { key: "Baru", label: "Baru", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { key: "Diproses", label: "Diproses", color: "bg-sky-100 text-sky-700 border-sky-200" },
  { key: "Dikirim", label: "Dikirim", color: "bg-violet-100 text-violet-700 border-violet-200" },
  { key: "Selesai", label: "Selesai", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { key: "Dibatalkan", label: "Dibatalkan", color: "bg-rose-100 text-rose-700 border-rose-200" },
] as const;

export const PAYMENT_STATUS = [
  { key: "Menunggu", label: "Menunggu", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { key: "Diterima", label: "Diterima", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { key: "Ditolak", label: "Ditolak", color: "bg-rose-100 text-rose-700 border-rose-200" },
] as const;

export const PLATFORMS = ["TikTok", "Instagram", "Facebook", "WhatsApp", "Twitter/X"] as const;

export function formatRupiah(amount: number): string {
  return "Rp " + amount.toLocaleString("id-ID");
}

export function formatRupiahShort(amount: number): string {
  if (amount >= 1_000_000) return "Rp " + (amount / 1_000_000).toFixed(1) + "jt";
  if (amount >= 1_000) return "Rp " + (amount / 1_000).toFixed(0) + "rb";
  return "Rp " + amount;
}

export function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "baru saja";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} menit lalu`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} jam lalu`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} hari lalu`;
  const wk = Math.floor(day / 7);
  if (wk < 4) return `${wk} minggu lalu`;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 50);
}
