"use client";

import { formatRupiah } from "@/lib/constants";
import type { Order, OrderItem, Payment } from "@/sections/nw/toko/types";

// ─────────────────────────────────────────────────────────────────────────────
// InvoicePrint — A4-sized printable invoice / struk penjualan.
//
// Renders with inline styles so the layout survives into the print pipeline
// (Tailwind classes inside a Radix Dialog portal get visibility-toggled by
// the @media print rule in globals.css, but the .invoice-print subtree
// stays visible). Black-on-white with teal accents for printability.
//
// Layout (210mm × 297mm A4):
//  1. Header — Brand name | INVOICE label + invoice # + date
//  2. From / To — brand info | customer info (or "Walk-in Customer")
//  3. Items table — No | Nama Produk | Qty | Harga | Subtotal
//  4. Summary — Subtotal, Ongkir, Total (large bold)
//  5. Payment info — method, status, amount (if any payments exist)
//  6. Order meta — kurir, resi, status, notes
//  7. Footer — thank-you + brand slug
// ─────────────────────────────────────────────────────────────────────────────

export interface InvoiceBrand {
  name: string;
  slug: string;
  description: string | null;
  category: string;
}

export interface InvoiceCustomer {
  name: string;
  phone: string;
}

export interface OrderWithDetails extends Order {
  payments?: Payment[];
}

interface InvoicePrintProps {
  order: OrderWithDetails;
  brand: InvoiceBrand | null;
  customer: InvoiceCustomer | null;
}

export function InvoicePrint({ order, brand, customer }: InvoicePrintProps) {
  // Parse items JSON
  const items: OrderItem[] = (() => {
    try {
      const parsed = JSON.parse(order.items);
      return Array.isArray(parsed) ? (parsed as OrderItem[]) : [];
    } catch {
      return [];
    }
  })();

  const subtotal = items.reduce((sum, it) => sum + it.price * it.qty, 0);
  const shipping = order.shippingCost ?? 0;
  const total = order.totalAmount;
  const payments = order.payments ?? [];
  const totalPaid = payments
    .filter((p) => p.status === "Diterima")
    .reduce((sum, p) => sum + p.amount, 0);
  const hasUnpaidBalance = totalPaid < total;

  const dateStr = new Date(order.createdAt).toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className="invoice-print bg-white text-black mx-auto"
      style={{
        width: "210mm",
        minHeight: "297mm",
        padding: "20mm",
        boxSizing: "border-box",
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        color: "#171412",
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          paddingBottom: "16px",
          borderBottom: "3px solid #0D9488",
          marginBottom: "24px",
          gap: "16px",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: "26px",
              fontWeight: 800,
              color: "#0D9488",
              lineHeight: 1.1,
            }}
          >
            {brand?.name ?? "Brand"}
          </div>
          <div
            style={{
              fontSize: "11px",
              color: "#57534E",
              marginTop: "4px",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              fontWeight: 600,
            }}
          >
            {brand?.category ?? "—"}
          </div>
          {brand?.description && (
            <div
              style={{
                fontSize: "11px",
                color: "#78716C",
                marginTop: "6px",
                maxWidth: "260px",
                lineHeight: 1.5,
              }}
            >
              {brand.description}
            </div>
          )}
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div
            style={{
              fontSize: "22px",
              fontWeight: 800,
              letterSpacing: "3px",
              color: "#171412",
            }}
          >
            INVOICE
          </div>
          <div style={{ fontSize: "11px", color: "#57534E", marginTop: "4px" }}>
            #{order.id.slice(-8).toUpperCase()}
          </div>
          <div style={{ fontSize: "11px", color: "#78716C", marginTop: "2px" }}>
            {dateStr}
          </div>
        </div>
      </div>

      {/* ── From / To ── */}
      <div
        style={{
          display: "flex",
          gap: "32px",
          marginBottom: "24px",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: "10px",
              fontWeight: 700,
              color: "#78716C",
              textTransform: "uppercase",
              letterSpacing: "1px",
              marginBottom: "6px",
            }}
          >
            Dari
          </div>
          <div
            style={{
              fontSize: "13px",
              fontWeight: 700,
              color: "#171412",
            }}
          >
            {brand?.name ?? "Brand"}
          </div>
          <div style={{ fontSize: "11px", color: "#78716C", marginTop: "2px" }}>
            {brand?.category ?? "—"}
          </div>
          {brand?.description && (
            <div
              style={{
                fontSize: "11px",
                color: "#78716C",
                marginTop: "2px",
                maxWidth: "240px",
                lineHeight: 1.5,
              }}
            >
              {brand.description}
            </div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: "10px",
              fontWeight: 700,
              color: "#78716C",
              textTransform: "uppercase",
              letterSpacing: "1px",
              marginBottom: "6px",
            }}
          >
            Kepada
          </div>
          <div
            style={{
              fontSize: "13px",
              fontWeight: 700,
              color: "#171412",
            }}
          >
            {customer?.name ?? "Walk-in Customer"}
          </div>
          {customer?.phone && (
            <div
              style={{
                fontSize: "11px",
                color: "#78716C",
                marginTop: "2px",
              }}
            >
              {customer.phone}
            </div>
          )}
        </div>
      </div>

      {/* ── Items table ── */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginBottom: "24px",
          fontSize: "12px",
        }}
      >
        <thead>
          <tr style={{ background: "#0D9488", color: "#fff" }}>
            <th
              style={{
                textAlign: "left",
                padding: "8px 10px",
                fontSize: "10px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                width: "40px",
              }}
            >
              No
            </th>
            <th
              style={{
                textAlign: "left",
                padding: "8px 10px",
                fontSize: "10px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Nama Produk
            </th>
            <th
              style={{
                textAlign: "center",
                padding: "8px 10px",
                fontSize: "10px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                width: "50px",
              }}
            >
              Qty
            </th>
            <th
              style={{
                textAlign: "right",
                padding: "8px 10px",
                fontSize: "10px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                width: "100px",
              }}
            >
              Harga
            </th>
            <th
              style={{
                textAlign: "right",
                padding: "8px 10px",
                fontSize: "10px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                width: "110px",
              }}
            >
              Subtotal
            </th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td
                colSpan={5}
                style={{
                  padding: "16px",
                  textAlign: "center",
                  color: "#78716C",
                  fontSize: "12px",
                }}
              >
                Tidak ada item
              </td>
            </tr>
          ) : (
            items.map((it, i) => (
              <tr
                key={i}
                style={{ borderBottom: "1px solid #E7E3DC" }}
              >
                <td
                  style={{
                    padding: "10px",
                    fontSize: "12px",
                    color: "#57534E",
                  }}
                >
                  {i + 1}
                </td>
                <td
                  style={{
                    padding: "10px",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#171412",
                  }}
                >
                  {it.name}
                </td>
                <td
                  style={{
                    padding: "10px",
                    fontSize: "12px",
                    textAlign: "center",
                    color: "#57534E",
                  }}
                >
                  {it.qty}
                </td>
                <td
                  style={{
                    padding: "10px",
                    fontSize: "12px",
                    textAlign: "right",
                    color: "#57534E",
                  }}
                >
                  {formatRupiah(it.price)}
                </td>
                <td
                  style={{
                    padding: "10px",
                    fontSize: "12px",
                    textAlign: "right",
                    fontWeight: 600,
                    color: "#171412",
                  }}
                >
                  {formatRupiah(it.price * it.qty)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* ── Summary ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: "24px",
        }}
      >
        <div style={{ width: "280px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "6px 0",
              fontSize: "12px",
              color: "#57534E",
            }}
          >
            <span>Subtotal</span>
            <span style={{ color: "#171412", fontWeight: 600 }}>
              {formatRupiah(subtotal)}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "6px 0",
              fontSize: "12px",
              color: "#57534E",
            }}
          >
            <span>Ongkir</span>
            <span style={{ color: "#171412", fontWeight: 600 }}>
              {formatRupiah(shipping)}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "12px 0",
              borderTop: "2px solid #0D9488",
              marginTop: "4px",
              fontSize: "18px",
              fontWeight: 800,
              color: "#0D9488",
            }}
          >
            <span>Total</span>
            <span>{formatRupiah(total)}</span>
          </div>
        </div>
      </div>

      {/* ── Payment info ── */}
      {payments.length > 0 && (
        <div
          style={{
            background: "#F0FBF9",
            border: "1px solid #99F1E5",
            borderRadius: "8px",
            padding: "12px 16px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              fontSize: "10px",
              fontWeight: 700,
              color: "#0F766E",
              textTransform: "uppercase",
              letterSpacing: "1px",
              marginBottom: "8px",
            }}
          >
            Info Pembayaran
          </div>
          {payments.map((p) => (
            <div
              key={p.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "12px",
                padding: "3px 0",
              }}
            >
              <span style={{ color: "#57534E" }}>
                {p.method} ·{" "}
                <span
                  style={{
                    fontWeight: 700,
                    color:
                      p.status === "Diterima"
                        ? "#0F766E"
                        : p.status === "Ditolak"
                          ? "#DC2626"
                          : "#D97706",
                  }}
                >
                  {p.status}
                </span>
              </span>
              <span
                style={{
                  fontWeight: 600,
                  color: "#171412",
                }}
              >
                {formatRupiah(p.amount)}
              </span>
            </div>
          ))}
          {totalPaid > 0 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "13px",
                fontWeight: 700,
                color: "#0F766E",
                borderTop: "1px dashed #99F1E5",
                marginTop: "6px",
                paddingTop: "6px",
              }}
            >
              <span>Total Dibayar</span>
              <span>{formatRupiah(totalPaid)}</span>
            </div>
          )}
          {hasUnpaidBalance && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "12px",
                color: "#DC2626",
                marginTop: "4px",
              }}
            >
              <span>Sisa Pembayaran</span>
              <span style={{ fontWeight: 600 }}>
                {formatRupiah(total - totalPaid)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Order meta ── */}
      <div
        style={{
          fontSize: "11px",
          color: "#78716C",
          marginBottom: "24px",
          lineHeight: 1.7,
        }}
      >
        <div>
          <strong>Status Order:</strong>{" "}
          <span style={{ fontWeight: 600, color: "#171412" }}>
            {order.status}
          </span>
        </div>
        {order.shippingCourier && (
          <div>
            <strong>Kurir:</strong> {order.shippingCourier}
          </div>
        )}
        {order.resiNumber && (
          <div>
            <strong>No Resi:</strong>{" "}
            <span style={{ fontFamily: "ui-monospace, monospace" }}>
              {order.resiNumber}
            </span>
          </div>
        )}
        {order.notes && (
          <div>
            <strong>Catatan:</strong> {order.notes}
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div
        style={{
          textAlign: "center",
          paddingTop: "20px",
          borderTop: "1px solid #E7E3DC",
          marginTop: "40px",
        }}
      >
        <div
          style={{
            fontSize: "13px",
            color: "#171412",
            marginBottom: "4px",
            fontWeight: 600,
          }}
        >
          Terima kasih sudah berbelanja di {brand?.name ?? "kami"}! 🙏
        </div>
        {brand?.slug && (
          <div
            style={{
              fontSize: "11px",
              color: "#0D9488",
              fontWeight: 600,
            }}
          >
            usahaku.ai/t/{brand.slug}
          </div>
        )}
        <div
          style={{
            fontSize: "10px",
            color: "#A8A29E",
            marginTop: "8px",
          }}
        >
          Dokumen ini dihasilkan otomatis oleh usahaku.ai — AI Co-pilot untuk
          UMKM Indonesia.
        </div>
      </div>
    </div>
  );
}
