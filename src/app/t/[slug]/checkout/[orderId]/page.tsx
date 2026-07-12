"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  MessageCircle,
  ArrowLeft,
  Package,
  Clock,
  Upload,
  Check,
  Loader2,
  Printer,
  AlertCircle,
  X,
  CreditCard,
  Copy,
  Search,
} from "lucide-react";

interface BankAccount {
  bank: string;
  accountNumber: string;
  accountName: string;
}

interface OrderData {
  id: string;
  totalAmount: number;
  status: string;
  items: string;
  notes: string | null;
  createdAt: string;
  brand: { name: string; slug: string; phone: string | null };
  payment: { method: string; status: string } | null;
  bankAccounts: BankAccount[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  Baru: { label: "Menunggu Konfirmasi", color: "bg-amber-100 text-amber-700", icon: Clock },
  Diproses: { label: "Sedang Diproses", color: "bg-blue-100 text-blue-700", icon: Package },
  Dikirim: { label: "Sedang Dikirim", color: "bg-violet-100 text-violet-700", icon: Package },
  Selesai: { label: "Selesai", color: "bg-green-100 text-green-700", icon: CheckCircle },
  Dibatalkan: { label: "Dibatalkan", color: "bg-red-100 text-red-700", icon: AlertCircle },
};

function formatRp(n: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
}

const PAYMENT_LABELS: Record<string, string> = {
  transfer: "Transfer Bank",
  qris: "QRIS / E-Wallet",
  cod: "COD (Bayar di Tempat)",
};

export default function OrderConfirmation() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/public/order/${params.orderId}`)
      .then((r) => r.json())
      .then((d) => {
        setOrder(d);
        setProofUrl(d.payment?.proofImageUrl ?? null);
      })
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, [params.orderId]);

  async function handleUpload(file: File) {
    setUploading(true);
    setAiLoading(true);
    setAiResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/public/order/${params.orderId}/payment-proof`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setProofUrl(data.proofImageUrl);
        setAiResult(data.aiResult);
      } else {
        alert(data.error || "Gagal upload");
      }
    } catch {
      alert("Terjadi kesalahan");
    } finally {
      setUploading(false);
      setAiLoading(false);
    }
  }

  function handlePrint() {
    const printWin = window.open("", "_blank");
    if (!printWin) return;
    const items = JSON.parse(order!.items) as { name: string; qty: number; price: number }[];
    const html = `<!DOCTYPE html><html><head><title>Invoice #${order!.id.slice(-8).toUpperCase()}</title>
<style>body{font-family:sans-serif;padding:40px;max-width:600px;margin:0 auto}
h1{font-size:24px;margin-bottom:4px}
.meta{color:#666;font-size:13px;margin-bottom:24px}
table{width:100%;border-collapse:collapse}
th,td{padding:8px 0;text-align:left;border-bottom:1px solid #ddd}
th{font-size:12px;text-transform:uppercase;color:#666}
.total{font-size:20px;font-weight:bold;text-align:right;margin-top:16px}
.footer{margin-top:40px;font-size:11px;color:#999;text-align:center}
</style></head><body onload="window.print()">
<h1>Invoice</h1>
<div class="meta">
  <div>No: #${order!.id.slice(-8).toUpperCase()}</div>
  <div>${order!.brand.name}</div>
  <div>${new Date(order!.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</div>
</div>
<table><tr><th>Produk</th><th>Qty</th><th style="text-align:right">Harga</th><th style="text-align:right">Subtotal</th></tr>
${items.map((i) => `<tr><td>${i.name}</td><td>${i.qty}</td><td style="text-align:right">${formatRp(i.price)}</td><td style="text-align:right">${formatRp(i.price * i.qty)}</td></tr>`).join("")}
</table>
<div class="total">Total: ${formatRp(order!.totalAmount)}</div>
<div class="footer">Dicetak dari usahaku.ai — terima kasih sudah berbelanja</div>
</body></html>`;
    printWin.document.write(html);
    printWin.document.close();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <div className="size-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-stone-500 mt-3">Memuat pesanan...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="text-4xl">😕</div>
          <p className="text-sm font-semibold text-stone-900">Pesanan tidak ditemukan</p>
          <Button onClick={() => router.push("/")}>Kembali</Button>
        </div>
      </div>
    );
  }

  const items = JSON.parse(order.items) as { productId: string; name: string; qty: number; price: number }[];
  const waNumber = order.brand.phone?.replace(/[^0-9]/g, "");
  const statusConfig = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.Baru;
  const StatusIcon = statusConfig.icon;
  const needsProof = (order.payment?.method === "transfer" || order.payment?.method === "qris") && order.status === "Baru";
  const isFinished = order.status === "Selesai" || order.status === "Dibatalkan";
  const o = order;

  function handleWhatsApp() {
    if (!waNumber) return;
    const itemText = items.map((i) => `  - ${i.name} x${i.qty}`).join("\n");
    const text = `Halo ${o.brand.name}, saya sudah melakukan pesanan:\n\nNo: #${o.id.slice(-8).toUpperCase()}\n${itemText}\nTotal: ${formatRp(o.totalAmount)}\n\nMohon diproses, terima kasih!`;
    window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`, "_blank");
  }

  const paymentLabel = PAYMENT_LABELS[order.payment?.method ?? ""] ?? order.payment?.method ?? "—";

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className={`${isFinished ? "bg-gradient-to-br from-stone-500 to-stone-700" : "bg-gradient-to-br from-green-500 to-emerald-600"} text-white`}>
        <div className="max-w-lg mx-auto px-4 py-10 text-center">
          <div className="size-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-3">
            {isFinished ? (
              order.status === "Selesai" ? <CheckCircle className="size-10" /> : <AlertCircle className="size-10" />
            ) : (
              <CheckCircle className="size-10" />
            )}
          </div>
          <h1 className="text-xl font-extrabold">
            {order.status === "Selesai" ? "Pesanan Selesai" :
             order.status === "Dibatalkan" ? "Pesanan Dibatalkan" :
             "Pesanan Berhasil!"}
          </h1>
          <p className="text-sm text-white/80 mt-1">
            {order.status === "Baru" ? `Pesanan kamu sudah diterima oleh ${order.brand.name}` : ""}
            {order.status === "Diproses" ? "Pesananmu sedang diproses" : ""}
            {order.status === "Dikirim" ? "Pesananmu sedang dalam perjalanan" : ""}
            {order.status === "Selesai" ? "Pesanan sudah selesai" : ""}
            {order.status === "Dibatalkan" ? "Pesanan dibatalkan" : ""}
          </p>
          <Badge className="bg-white/20 text-white border-white/30 text-xs h-6 mt-3 font-mono">
            #{order.id.slice(-8).toUpperCase()}
          </Badge>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-4 relative z-10 space-y-4 pb-8">
        {/* Status Badge */}
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <div className="flex items-center gap-3">
            <div className={`size-10 rounded-full flex items-center justify-center shrink-0 ${statusConfig.color}`}>
              <StatusIcon className="size-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-stone-900">{statusConfig.label}</p>
              <p className="text-[11px] text-stone-400">
                {new Date(order.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
          <div className="mt-3 text-xs text-stone-500 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-stone-400">Pembayaran:</span>
              <span className="font-medium text-stone-700">{paymentLabel}</span>
            </div>
            {order.payment?.status && (
              <div className="flex items-center gap-2">
                <span className="text-stone-400">Status Bayar:</span>
                <Badge variant="outline" className={`text-[10px] h-5 ${
                  order.payment.status === "Diterima" ? "border-green-200 text-green-700 bg-green-50" :
                  order.payment.status === "Ditolak" ? "border-red-200 text-red-700 bg-red-50" :
                  "border-amber-200 text-amber-700 bg-amber-50"
                }`}>
                  {order.payment.status}
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* Order Details */}
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <h2 className="text-sm font-bold text-stone-900 mb-3 flex items-center gap-2">
            <Package className="size-4" /> Detail Pesanan
          </h2>
          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center text-sm">
                <span className="text-stone-600">
                  {item.name} <span className="text-stone-400">x{item.qty}</span>
                </span>
                <span className="font-semibold text-stone-900">{formatRp(item.price * item.qty)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-stone-100 mt-3 pt-3 flex justify-between items-center">
            <span className="text-sm font-semibold text-stone-600">Total</span>
            <span className="text-lg font-extrabold text-stone-900">{formatRp(order.totalAmount)}</span>
          </div>
        </div>

        {/* Bank Accounts — for transfer */}
        {order.payment?.method === "transfer" && order.bankAccounts.length > 0 && (
          <div className="bg-white rounded-xl border border-stone-200 p-4">
            <h2 className="text-sm font-bold text-stone-900 mb-3 flex items-center gap-2">
              <CreditCard className="size-4" /> Transfer ke Rekening
            </h2>
            <div className="space-y-2">
              {order.bankAccounts.map((acc, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 rounded-lg border border-stone-200 bg-stone-50"
                >
                  <div className="size-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 font-bold text-xs">
                    {acc.bank.slice(0, 3).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-stone-900">{acc.bank}</div>
                    <div className="text-xs text-stone-500 font-mono">{acc.accountNumber}</div>
                    <div className="text-[11px] text-stone-400">a.n. {acc.accountName}</div>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(acc.accountNumber);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1500);
                    }}
                    className="size-8 rounded-lg bg-white border border-stone-200 flex items-center justify-center text-stone-400 hover:text-teal-600 shrink-0"
                  >
                    {copied ? <Check className="size-4 text-green-600" /> : <Copy className="size-4" />}
                  </button>
                </div>
              ))}
            </div>
            <p className="text-xs text-stone-400 mt-2">
              Transfer sesuai total pesanan, lalu upload bukti bayar di bawah
            </p>
          </div>
        )}

          {needsProof && order.payment?.method === "qris" && order.bankAccounts.length === 0 && (
            <div className="bg-amber-50 text-amber-700 text-xs font-medium px-4 py-3 rounded-xl border border-amber-200 flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              Hubungi toko via WhatsApp untuk info pembayaran
            </div>
          )}

          {/* Upload Bukti Bayar */}
          {needsProof && (
            <div className="bg-white rounded-xl border border-stone-200 p-4">
              <h2 className="text-sm font-bold text-stone-900 mb-2">Upload Bukti Bayar</h2>
              <p className="text-xs text-stone-500 mb-3">
                {order.payment?.method === "transfer"
                  ? "Transfer sesuai nominal ke rekening di atas, lalu upload bukti transfer"
                  : "Scan QRIS dari toko, lalu upload bukti pembayaran"
                }
              </p>

            {proofUrl ? (
              <div className="space-y-3">
                <div className="relative rounded-xl overflow-hidden border border-stone-200">
                  <img src={proofUrl} alt="Bukti bayar" className="w-full max-h-48 object-contain bg-stone-50" />
                </div>

                {/* AI Verification */}
                {aiLoading && (
                  <div className="flex items-center gap-2 text-xs text-violet-600 font-medium">
                    <Loader2 className="size-3.5 animate-spin" /> AI memverifikasi bukti bayar...
                  </div>
                )}

                {aiResult && !aiResult.error && (
                  <div className="space-y-2">
                    <div className={`px-3 py-2 rounded-lg text-xs font-semibold ${
                      aiResult.confidence === "high" ? "bg-green-50 text-green-700 border border-green-200" :
                      aiResult.confidence === "medium" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                      "bg-red-50 text-red-700 border border-red-200"
                    }`}>
                      {aiResult.confidence === "high" ? "✅ Verifikasi otomatis berhasil" :
                       aiResult.confidence === "medium" ? "⚠️  Verifikasi perlu dicek toko" :
                       "❌ Data tidak cocok — hubungi toko"}
                    </div>

                    <div className="rounded-lg border border-stone-200 bg-stone-50 p-3 space-y-1.5">
                      <div className="text-[11px] font-semibold text-stone mb-1">Data Terbaca</div>
                      <AiRow label="Bank" value={aiResult.extracted.bankName} />
                      <AiRow label="No. Rekening" value={aiResult.extracted.accountNumber} />
                      <AiRow label="Atas Nama" value={aiResult.extracted.accountName} />
                      <AiRow label="Jumlah" value={aiResult.extracted.amount != null ? formatRp(aiResult.extracted.amount) : null} />
                      <AiRow label="Pengirim" value={aiResult.extracted.senderName} />
                      <AiRow label="Tanggal" value={aiResult.extracted.date} />
                      <AiRow label="Jam" value={aiResult.extracted.time} />
                    </div>

                    <div className="space-y-1">
                      <div className={`flex items-start gap-2 p-2 rounded-lg text-xs ${aiResult.amountOk ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                        <span>{aiResult.amountOk ? "✅" : "❌"}</span>
                        <span>{aiResult.amountDetail}</span>
                      </div>
                      <div className={`flex items-start gap-2 p-2 rounded-lg text-xs ${aiResult.bankOk ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                        <span>{aiResult.bankOk ? "✅" : "❌"}</span>
                        <span>{aiResult.bankDetail}</span>
                      </div>
                    </div>
                  </div>
                )}

                {aiResult?.error && (
                  <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                    <AlertCircle className="size-3.5 shrink-0" />
                    {aiResult.error}
                  </div>
                )}

                {!aiLoading && aiResult && (
                  <div className="flex items-center gap-2 text-xs text-green-600 font-medium">
                    <Check className="size-3.5" /> Bukti bayar sudah terkirim
                  </div>
                )}
              </div>
            ) : (
              <>
                <input
                  type="file"
                  ref={fileRef}
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload(f);
                  }}
                />
                <Button
                  variant="outline"
                  className="w-full h-12 gap-2 border-dashed border-stone-300"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Upload className="size-4" />
                  )}
                  {uploading ? "Mengupload..." : "Upload Bukti Transfer"}
                </Button>
              </>
            )}
          </div>
        )}

        {/* Already paid badge for COD */}
        {order.payment?.method === "cod" && (
          <div className="bg-amber-50 text-amber-700 text-xs font-medium px-4 py-3 rounded-xl border border-amber-200 flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            Pembayaran dilakukan saat barang diterima (COD)
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={handlePrint}
          >
            <Printer className="size-4" /> Cetak / Download Invoice
          </Button>

          {waNumber && (
            <Button
              className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-bold gap-2"
              onClick={handleWhatsApp}
            >
              <MessageCircle className="size-5" /> Hubungi Toko via WhatsApp
            </Button>
          )}

          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => router.push(`/t/${order.brand.slug}/cek`)}
          >
            <Search className="size-4" /> Simpan nomor HP — cek status lagi nanti
          </Button>

          <Button
            variant="ghost"
            className="w-full text-stone-500"
            onClick={() => router.push(`/t/${order.brand.slug}`)}
          >
            <ArrowLeft className="size-4 mr-2" /> Kembali ke Toko
          </Button>
        </div>
      </div>
    </div>
  );
}

function AiRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-stone-500">{label}</span>
      <span className="font-semibold text-stone-900 text-right max-w-[60%] truncate">{value}</span>
    </div>
  );
}
