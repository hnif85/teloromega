import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Toko — usahaku.ai",
  description: "Belanja langsung dari toko UMKM favorit kamu.",
  robots: { index: true, follow: true },
  openGraph: { type: "website" },
};

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-50">
      {children}
      <footer className="text-center py-4 text-[11px] text-stone-400 border-t border-stone-100">
        Ditenagai oleh <span className="font-semibold text-teal-600">usahaku.ai</span>
      </footer>
    </div>
  );
}
