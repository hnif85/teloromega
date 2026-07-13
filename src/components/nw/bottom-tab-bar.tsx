"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "beranda", label: "Beranda", icon: "📊" },
  { key: "produk", label: "Produk", icon: "📦" },
  { key: "konten", label: "Konten", icon: "📝" },
  { key: "toko", label: "Toko", icon: "🛒" },
  { key: "aichat", label: "Chat", icon: "💬" },
  { key: "keuangan", label: "Uang", icon: "💰" },
] as const;

export function BottomTabBar() {
  const pathname = usePathname();
  const current = pathname.replace(/^\//, "").split("/")[0] || "beranda";

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-14">
        {TABS.map((tab) => {
          const active = current === tab.key;
          return (
            <Link
              key={tab.key}
              href={`/${tab.key}`}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors",
                active
                  ? "text-teal"
                  : "text-stone hover:text-ink"
              )}
            >
              <span className="text-lg leading-none">{tab.icon}</span>
              <span className={cn(
                "text-[10px] font-medium leading-none",
                active && "font-semibold"
              )}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
