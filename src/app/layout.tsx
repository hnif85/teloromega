import type { Metadata } from "next";
import { Manrope, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryProvider } from "@/lib/query-provider";
import { ThemeProvider } from "@/components/theme-provider";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "The Next Whiz — AI Co-pilot untuk UMKM",
  description:
    "Riset, konten, toko, keuangan — satu platform. Ditenagai AI untuk pemilik usaha kecil Indonesia.",
  keywords: ["Next Whiz", "UMKM", "AI", "Riset Pasar", "Konten", "Keuangan"],
  authors: [{ name: "The Next Whiz" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${manrope.variable} ${geistMono.variable} font-sans antialiased bg-background text-foreground`}
      >
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <QueryProvider>
            <TooltipProvider delayDuration={150}>{children}</TooltipProvider>
            <Toaster />
            <Sonner
              position="top-right"
              toastOptions={{ style: { background: "var(--card)", border: "1px solid var(--border)" } }}
            />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
