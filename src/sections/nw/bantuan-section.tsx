"use client";

import { useState, useCallback } from "react";
import { PageHeader, SectionCard } from "@/components/nw/primitives";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  HelpCircle,
  BookOpen,
  Keyboard,
  Mail,
  MessageCircle,
  ExternalLink,
  Info,
  Sparkles,
  GraduationCap,
  ArrowRight,
  Heart,
} from "lucide-react";
import { startTour } from "@/components/nw/onboarding-tour";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────────────────────────────────────

interface FAQItem {
  q: string;
  a: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    q: "Apa itu The Next Whiz?",
    a: "Platform AI all-in-one untuk UMKM: riset pasar, generate konten, kelola toko, catat keuangan. Semua modul terintegrasi — hasil riset otomatis jadi ide konten, saran harga, dan proyeksi keuangan.",
  },
  {
    q: "Bagaimana cara mulai?",
    a: "Buat brand → tambah produk → jalankan riset → konten & rekomendasi otomatis muncul. Kamu juga bisa klik 'Mulai Tour' di atas untuk panduan visual 1 menit, atau muat data demo dari Pengaturan untuk eksplorasi.",
  },
  {
    q: "Apa itu credit?",
    a: "Credit dipakai untuk aksi AI (riset 5, konten 2–6, campaign 8–10). Top-up di halaman Credit. Semua credit tidak kedaluwarsa — sekali beli, langsung masuk saldo.",
  },
  {
    q: "Bagaimana credit dihitung?",
    a: "Lihat tarif di halaman Credit > Tarif Credit per Aksi. Context creation = gratis. Kamu cuma bayar saat generate output baru (riset, konten, campaign, proyeksi).",
  },
  {
    q: "Bisa pakai tanpa LLM/AI?",
    a: "Ya! Semua fitur AI punya fallback kontekstual. Data tetap tersimpan dan bisa diakses. Credit tidak terpotong saat fallback dipakai.",
  },
  {
    q: "Bagaimana data saya tersimpan?",
    a: "Data tersimpan lokal di browser database. Aman, tidak dibagikan. Brand switcher di sidebar memungkinkan kamu mengelola beberapa brand dengan data terpisah.",
  },
  {
    q: "Bisa ganti brand?",
    a: "Ya, klik brand switcher di sidebar. Semua data di-filter per brand — produk, order, konten, keuangan, dan target terpisah otomatis sesuai brand aktif.",
  },
  {
    q: "Bagaimana cara export data?",
    a: "Tombol CSV ada di Produk, Toko > Orders, Toko > Leads, Keuangan > Transaksi. Klik tombol 'Export CSV' di masing-masing halaman untuk download data sebagai file CSV.",
  },
  {
    q: "Apa itu Context?",
    a: "Context adalah rekomendasi otomatis dari riset: ide konten, saran harga, proyeksi keuangan. Gratis, dibuat otomatis. Lihat di Beranda > Rekomendasi atau di setiap modul terkait.",
  },
  {
    q: "Bagaimana cara hapus data?",
    a: "Pengaturan > Data Demo > Reset Semua Data. Atau hapus per item di modul terkait (produk, order, transaksi, dst). Hapus brand juga menghapus semua data terkait brand tersebut.",
  },
];

interface ShortcutItem {
  keys: string[];
  label: string;
  desc: string;
}

const SHORTCUTS: ShortcutItem[] = [
  {
    keys: ["⌘", "K"],
    label: "Buka Command Palette",
    desc: "Akses cepat ke semua modul dan aksi. Di Windows/Linux gunakan Ctrl+K.",
  },
  {
    keys: ["Esc"],
    label: "Tutup dialog / cancel",
    desc: "Tutup dialog, modal, atau batalkan aksi yang sedang berjalan.",
  },
  {
    keys: ["←", "→"],
    label: "Navigasi tour",
    desc: "Pindah antar langkah tour (saat tour aktif). Panah kiri = sebelumnya, kanan = lanjut.",
  },
  {
    keys: ["Tab"],
    label: "Pindah fokus",
    desc: "Pindah fokus antar elemen interaktif. Shift+Tab untuk mundur.",
  },
  {
    keys: ["Enter"],
    label: "Konfirmasi / pilih",
    desc: "Konfirmasi dialog, pilih item di command palette, atau aktifkan elemen yang difokuskan.",
  },
];

interface ContactItem {
  icon: React.ReactNode;
  emoji: string;
  label: string;
  value: string;
  href: string;
  external?: boolean;
  accent: string;
}

const CONTACTS: ContactItem[] = [
  {
    icon: <Mail className="size-5" />,
    emoji: "📧",
    label: "Email",
    value: "support@nextwhiz.id",
    href: "mailto:support@nextwhiz.id",
    accent: "bg-teal-100 text-teal-600",
  },
  {
    icon: <MessageCircle className="size-5" />,
    emoji: "💬",
    label: "WhatsApp",
    value: "+62 812-3456-7890",
    href: "https://wa.me/6281234567890",
    external: true,
    accent: "bg-emerald-100 text-emerald-700",
  },
  {
    icon: <BookOpen className="size-5" />,
    emoji: "📚",
    label: "Dokumentasi",
    value: "docs.nextwhiz.id",
    href: "https://docs.nextwhiz.id",
    external: true,
    accent: "bg-orange-100 text-orange-700",
  },
];

interface QuickAction {
  emoji: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
  accent: string;
  onClick: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function scrollToId(id: string) {
  if (typeof document === "undefined") return;
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ─────────────────────────────────────────────────────────────────────────────
// Quick Action Card
// ─────────────────────────────────────────────────────────────────────────────

function QuickActionCard({ action }: { action: QuickAction }) {
  return (
    <button
      type="button"
      onClick={action.onClick}
      className={cn(
        "group text-left rounded-2xl border border-border bg-card p-5 transition-all",
        "hover:border-teal/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/40",
        "flex flex-col gap-3"
      )}
    >
      <div className="flex items-center justify-between">
        <div
          className={cn(
            "size-11 rounded-xl flex items-center justify-center text-xl shrink-0",
            action.accent
          )}
        >
          <span className="text-xl leading-none">{action.emoji}</span>
        </div>
        <ArrowRight className="size-4 text-stone-300 group-hover:text-teal group-hover:translate-x-0.5 transition-all" />
      </div>
      <div>
        <div className="font-bold text-ink text-sm flex items-center gap-1.5">
          {action.icon}
          {action.title}
        </div>
        <p className="text-xs text-stone mt-1 leading-relaxed">{action.desc}</p>
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shortcut Card
// ─────────────────────────────────────────────────────────────────────────────

function ShortcutCard({ shortcut }: { shortcut: ShortcutItem }) {
  return (
    <div className="rounded-xl border border-border bg-cream-100/50 p-4 hover:border-teal/30 transition-colors">
      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
        {shortcut.keys.map((k, i) => (
          <kbd
            key={i}
            className={cn(
              "inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-md",
              "bg-card border border-border shadow-sm font-mono text-xs font-bold text-ink",
              "select-none"
            )}
          >
            {k}
          </kbd>
        ))}
      </div>
      <div className="font-semibold text-ink text-sm">{shortcut.label}</div>
      <p className="text-xs text-stone mt-0.5 leading-relaxed">{shortcut.desc}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Contact Row
// ─────────────────────────────────────────────────────────────────────────────

function ContactRow({ contact }: { contact: ContactItem }) {
  return (
    <a
      href={contact.href}
      target={contact.external ? "_blank" : undefined}
      rel={contact.external ? "noopener noreferrer" : undefined}
      className={cn(
        "group flex items-center gap-4 p-4 rounded-xl border border-border bg-card transition-all",
        "hover:border-teal/40 hover:shadow-sm"
      )}
    >
      <div
        className={cn(
          "size-11 rounded-xl flex items-center justify-center shrink-0",
          contact.accent
        )}
      >
        {contact.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-stone font-bold">
          {contact.label}
        </div>
        <div className="font-semibold text-ink text-sm truncate">{contact.value}</div>
      </div>
      {contact.external && (
        <ExternalLink className="size-4 text-stone-300 group-hover:text-teal transition-colors shrink-0" />
      )}
    </a>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main section
// ─────────────────────────────────────────────────────────────────────────────

export function BantuanSection() {
  // Track which FAQ is open so we can show a "still need help?" footer only when
  // at least one FAQ is expanded.
  const [openItems, setOpenItems] = useState<string[]>([]);

  const handleStartTour = useCallback(() => {
    startTour();
  }, []);

  const quickActions: QuickAction[] = [
    {
      emoji: "🎓",
      title: "Mulai Tour",
      desc: "Tour singkat 1 menit untuk kenalan fitur.",
      icon: <GraduationCap className="size-3.5" />,
      accent: "bg-teal-100 text-teal-600",
      onClick: handleStartTour,
    },
    {
      emoji: "📖",
      title: "Panduan Cepat",
      desc: "Lihat jawaban atas pertanyaan umum.",
      icon: <BookOpen className="size-3.5" />,
      accent: "bg-orange-100 text-orange-700",
      onClick: () => scrollToId("faq"),
    },
    {
      emoji: "⌨️",
      title: "Keyboard Shortcuts",
      desc: "Navigasi cepat tanpa sentuh mouse.",
      icon: <Keyboard className="size-3.5" />,
      accent: "bg-violet-100 text-violet-700",
      onClick: () => scrollToId("shortcuts"),
    },
    {
      emoji: "💬",
      title: "Hubungi Support",
      desc: "Email, WhatsApp, atau dokumentasi.",
      icon: <MessageCircle className="size-3.5" />,
      accent: "bg-emerald-100 text-emerald-700",
      onClick: () => scrollToId("contact"),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bantuan"
        subtitle="Pusat bantuan, FAQ, & kontak support"
        icon="❓"
        actions={
          <Badge variant="outline" className="gap-1 border-teal/30 text-teal">
            <HelpCircle className="size-3" /> Pusat Bantuan
          </Badge>
        }
      />

      {/* ── Quick Actions Grid ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {quickActions.map((a) => (
          <QuickActionCard key={a.title} action={a} />
        ))}
      </div>

      {/* ── FAQ ─────────────────────────────────────────────────────────────── */}
      <div id="faq" className="scroll-mt-4">
        <SectionCard
          title="Pertanyaan yang Sering Diajukan"
          desc="Jawaban cepat untuk pertanyaan umum tentang Next Whiz"
          right={
            <Badge variant="outline" className="text-[10px] gap-1">
              <BookOpen className="size-3" /> {FAQ_ITEMS.length} FAQ
            </Badge>
          }
          bodyClassName="p-0"
        >
          <Accordion
            type="multiple"
            value={openItems}
            onValueChange={setOpenItems}
            className="w-full"
          >
            {FAQ_ITEMS.map((item, i) => (
              <AccordionItem
                key={i}
                value={`item-${i}`}
                className="px-5 last:border-b-0"
              >
                <AccordionTrigger className="hover:no-underline text-left">
                  <div className="flex items-start gap-3 pr-2">
                    <span className="size-6 rounded-md bg-teal-100 text-teal-600 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="font-semibold text-ink text-sm leading-snug">
                      {item.q}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-stone leading-relaxed pl-9">
                    {item.a}
                  </p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <div className="px-5 py-3 bg-cream-100/60 border-t border-border text-xs text-stone flex items-center gap-2">
            <Sparkles className="size-3.5 mt-0.5 shrink-0 text-teal" />
            <span>
              Tidak menemukan jawaban?{" "}
              <button
                type="button"
                onClick={() => scrollToId("contact")}
                className="text-teal font-semibold hover:underline"
              >
                Hubungi support
              </button>{" "}
              dan tim kami akan bantu.
            </span>
          </div>
        </SectionCard>
      </div>

      {/* ── Keyboard Shortcuts ─────────────────────────────────────────────── */}
      <div id="shortcuts" className="scroll-mt-4">
        <SectionCard
          title="Keyboard Shortcuts"
          desc="Navigasi cepat menggunakan keyboard — tanpa mouse"
          right={
            <Badge variant="outline" className="text-[10px] gap-1">
              <Keyboard className="size-3" /> {SHORTCUTS.length} shortcut
            </Badge>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {SHORTCUTS.map((s) => (
              <ShortcutCard key={s.label} shortcut={s} />
            ))}
          </div>
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-teal-50 border border-teal/20 px-3 py-2.5">
            <Info className="size-3.5 mt-0.5 shrink-0 text-teal" />
            <p className="text-xs text-ink-700 leading-relaxed">
              <b className="text-ink">Tip:</b> Tekan{" "}
              <kbd className="inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded bg-card border border-border shadow-sm font-mono text-[10px] font-bold text-ink">
                ⌘K
              </kbd>{" "}
              kapan saja untuk buka Command Palette — cara tercepat untuk pindah
              modul atau jalankan aksi.
            </p>
          </div>
        </SectionCard>
      </div>

      {/* ── Contact ─────────────────────────────────────────────────────────── */}
      <div id="contact" className="scroll-mt-4">
        <SectionCard
          title="Hubungi Support"
          desc="Tim kami siap bantu — pilih channel yang paling nyaman buat kamu"
          right={
            <Badge variant="outline" className="text-[10px] gap-1 border-emerald/30 text-emerald-700">
              <MessageCircle className="size-3" /> {CONTACTS.length} channel
            </Badge>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {CONTACTS.map((c) => (
              <ContactRow key={c.label} contact={c} />
            ))}
          </div>
          <Separator className="my-4" />
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-stone">
            <div className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-success animate-pulse" />
              <span>Jam operasional support: Senin–Jumat, 09.00–17.00 WIB</span>
            </div>
            <span className="text-stone-300">
              Respon rata-rata &lt; 24 jam pada hari kerja
            </span>
          </div>
        </SectionCard>
      </div>

      {/* ── About ──────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-gradient-to-br from-cream-100/60 to-card p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="size-11 rounded-xl bg-teal text-white font-extrabold flex items-center justify-center text-sm tracking-tight shrink-0">
              NW
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-ink text-sm">The Next Whiz</h3>
                <Badge variant="outline" className="text-[10px] gap-1 border-teal/30 text-teal">
                  v0.1.1 · MVP
                </Badge>
              </div>
              <p className="text-xs text-stone mt-1 leading-relaxed max-w-md">
                AI Co-pilot all-in-one untuk UMKM Indonesia — riset, konten, toko,
                keuangan, kalender, dan target dalam satu platform.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:items-end gap-1.5 text-xs text-stone shrink-0">
            <div className="flex items-center gap-1.5">
              <Info className="size-3 text-teal" />
              <span className="font-semibold text-ink-700">Tech Stack:</span>
              <span>Next.js 16, TypeScript, Prisma, z-ai-web-dev-sdk</span>
            </div>
            <div className="flex items-center gap-1.5 text-stone">
              <Heart className="size-3 text-rose-500 fill-rose-500" />
              <span>Dibuat untuk UMKM Indonesia</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom CTA: start tour ─────────────────────────────────────────── */}
      <div className="rounded-2xl border border-dashed border-teal/30 bg-teal-50/40 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="size-10 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center text-xl shrink-0">
          🎯
        </div>
        <div className="flex-1">
          <div className="font-bold text-ink">Masih bingung mulai dari mana?</div>
          <p className="text-sm text-stone mt-0.5">
            Jalankan tour interaktif 1 menit untuk kenalan dengan semua fitur utama.
          </p>
        </div>
        <Button
          className="bg-teal hover:bg-teal-600 text-white gap-1.5 shrink-0"
          onClick={handleStartTour}
        >
          <GraduationCap className="size-4" /> Mulai Tour
        </Button>
      </div>
    </div>
  );
}

export default BantuanSection;
