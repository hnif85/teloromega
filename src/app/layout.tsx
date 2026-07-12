import type { Metadata, Viewport } from "next";
import { Manrope, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryProvider } from "@/lib/query-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { SWRegister } from "@/components/nw/sw-register";

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
  title: "usahaku.ai — AI Co-pilot untuk UMKM",
  description:
    "Riset, konten, toko, keuangan — satu platform. Ditenagai AI untuk pemilik usaha kecil Indonesia.",
  keywords: ["usahaku", "UMKM", "AI", "Riset Pasar", "Konten", "Keuangan"],
  authors: [{ name: "usahaku.ai" }],
  manifest: "/manifest.json",
  applicationName: "usahaku.ai",
  appleWebApp: {
    capable: true,
    title: "usahaku.ai",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    shortcut: ["/icon-192.png"],
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#0D9488",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="usahaku.ai" />
        <script dangerouslySetInnerHTML={{
          __html: `(function(){try{var t=localStorage.getItem("theme");if(!t){t=window.matchMedia("(prefers-color-scheme:dark)").matches?"dark":"light"}document.documentElement.className=t;document.documentElement.style.colorScheme=t}catch(e){}})()`,
        }} />
      </head>
      <body
        className={`${manrope.variable} ${geistMono.variable} font-sans antialiased bg-background text-foreground`}
      >
        <ThemeProvider>
          <QueryProvider>
            <TooltipProvider delayDuration={150}>{children}</TooltipProvider>
            <Toaster />
            <Sonner
              position="top-right"
              toastOptions={{ style: { background: "var(--card)", border: "1px solid var(--border)" } }}
            />
          </QueryProvider>
        </ThemeProvider>
        <SWRegister />
      </body>
    </html>
  );
}
