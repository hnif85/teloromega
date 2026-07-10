// /api/inbox/templates — static list of reply templates
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const TEMPLATES = [
  {
    id: "tpl-harga",
    label: "Harga produk",
    icon: "💸",
    body: "Halo kak, untuk harga produknya bisa kakak lihat di katalog ya. Kalau mau pesan langsung atau ada pertanyaan lain, tinggal chat kami saja ya 😊",
  },
  {
    id: "tpl-stok",
    label: "Info stok",
    icon: "📦",
    body: "Halo kak, stok produk kami update setiap hari. Untuk saat ini stok masih ada kok. Mau langsung kami pesankan?",
  },
  {
    id: "tpl-alamat",
    label: "Alamat pengiriman",
    icon: "📍",
    body: "Halo kak, mohon info nama lengkap, no HP, dan alamat lengkap untuk pengiriman ya. Kami akan proses pesanannya secepatnya 🚚",
  },
  {
    id: "tpl-bayar",
    label: "Konfirmasi pembayaran",
    icon: "💳",
    body: "Halo kak, terima kasih sudah transfer. Boleh kirim bukti transfer-nya? Setelah verifikasi, pesanan akan langsung kami proses ya.",
  },
  {
    id: "tpl-thanks",
    label: "Terima kasih",
    icon: "🙏",
    body: "Terima kasih sudah berbelanja di toko kami ya kak 🙏 Semoga produknya berkenan! Jangan lupa follow IG kami untuk update produk terbaru.",
  },
];

export async function GET(_req: NextRequest) {
  return NextResponse.json({ templates: TEMPLATES });
}
