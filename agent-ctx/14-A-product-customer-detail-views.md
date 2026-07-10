# Task 14-A — Product + Customer Detail Views

**Agent**: full-stack-developer
**Date**: current session

## Goal
Build product detail dialog (sales history, stock movement, related content) + customer detail dialog (order history, transactions, campaigns, receivables). Wire into Produk section + Toko leads/orders tabs.

## Work Log

### A. Product Detail API
**File**: `src/app/api/products/[id]/details/route.ts` (NEW, ~210 lines)

- GET endpoint with `getUserId(req)` auth + ownership verify via `product.brand.userId`.
- Fetches all brand orders (with customer, lead, payments includes).
- Filters orders whose `items` JSON contains `productId === id`.
- Computes stats from non-cancelled orders:
  - `totalSold` = Σ qty
  - `totalRevenue` = Σ qty × price
  - `totalCost` = Σ qty × costPrice (HPP)
  - `grossProfit` = revenue − cost
  - `marginPct` = (price − costPrice) / price × 100
  - `orderCount` = orders containing product (incl. cancelled)
  - `lastSoldAt` = most recent order date (incl. cancelled — order "contained" the product)
- Returns last 10 orders as `recentOrders` with computed `paymentStatus` (Lunas/Menunggu/Sebagian/Belum bayar) from payments array.
- Stock movements (barang only): reconstructs initial stock = current + Σ sold (non-cancelled), then iterates chronologically to build running balance. Initial shown as `in` type with reference "initial"; each non-cancelled order = `out` movement with order # as reference.
- Jasa products: empty `stockMovements[]`.
- Related content: Content rows where `productId === id` (id, type, platform, createdAt).

### B. Customer Detail API
**File**: `src/app/api/customers/[id]/route.ts` (NEW, ~190 lines)

- GET endpoint with `getUserId(req)` auth + ownership verify via `customer.brand.userId`.
- Parallel Prisma queries: orders (with payments), transactions, receivables, campaignRecipients (with campaign include).
- Returns customer object (id, name, phone, email, firstOrderAt, totalOrders, totalSpent, createdAt).
- Stats: `avgOrderValue` (totalSpent/totalOrders), `lastOrderAt`, `repeatRate` (totalOrders/(totalOrders+1) × 100 proxy), `daysSinceFirstOrder`, `daysSinceLastOrder`.
- Orders list with parsed `items` array (name, qty, price) + computed paymentStatus from payments.
- Transactions (type, category, amount, description, date).
- Campaigns joined from CampaignRecipient → Campaign: name, channel, sentAt, status, opened, clicked (boolean flags from openedAt/clickedAt non-null).
- Receivables (amount, dueDate, status: outstanding/paid/overdue).

### C. Product Detail Dialog Component
**File**: `src/sections/nw/produk/product-detail-dialog.tsx` (NEW, ~510 lines)

- `"use client"` component, props: `{ productId, open, onOpenChange, onEdit? }`.
- TanStack Query fetches `/api/products/[id]/details` when `productId` set + `open` true.
- Dialog: max-w-3xl, max-h-90vh, scrollable body. Header (image/initials, name, type badge, SKU, price, costPrice+margin) + 6 mini StatCards (Total Terjual, Total Pendapatan, Laba Kotor, Margin %, Jumlah Order, Penjualan Terakhir) + 3 Tabs (Riwayat Order table, Pergerakan Stok timeline, Konten Terkait grid) + Footer (Edit Produk / Tutup).
- Stock movements shown as colored cards (green for "in", red for "out") with running balance.
- Jasa products: stock tab shows "Produk jasa tidak melacak stok." note.
- Loading skeleton + error state. Empty states per tab. Mobile responsive.
- Cream/teal palette, Lucide icons, shadcn/ui (Dialog, Tabs, Table, Badge, Button, Skeleton, Separator).

### D. Wired Product Detail Dialog into Produk Section
**File**: `src/sections/nw/produk-section.tsx` (EDITED)

- Imported `ProductDetailDialog` + `Eye` icon.
- Added state `detailProductId`.
- `ProductCard` now takes `onDetail` prop; card has `cursor-pointer` + hover shadow + overlay "Lihat Detail" hint + `onClick={onDetail}`.
- Edit/Hapus buttons + the dropdown menu trigger wrapper have `e.stopPropagation()` to prevent card click.
- "Lihat Detail" added as first item in DropdownMenu (MoreVertical).
- Rendered `<ProductDetailDialog>` with `onEdit` that closes detail + opens edit dialog for same product.

### E. Customer Detail Dialog Component
**File**: `src/sections/nw/toko/customer-detail-dialog.tsx` (NEW, ~520 lines)

- `"use client"` component, props: `{ customerId, open, onOpenChange }`.
- TanStack Query fetches `/api/customers/[id]`.
- Dialog: max-w-3xl, max-h-90vh, scrollable body. Header (avatar initials, name, clickable WA link for phone, email, "Customer sejak [date]") + 5 mini StatCards (Total Order, Total Belanja, Rata-rata Order, Order Terakhir, Hari Sejak Order) + 4 Tabs (Riwayat Order table with items summary, Transaksi table with type badge, Campaign list with open/click badges, Piutang list with status badge) + Footer (Chat WhatsApp / Tutup).
- Transactions show income (green +, "Masuk" badge) vs expense (red −, "Keluar" badge).
- Campaigns show "Dibuka" / "Belum dibuka" + "Klik" badges.
- Receivables show amount + due date + status badge (Outstanding/Lunas/Jatuh Tempo).
- Loading skeleton + error state. Empty states per tab. Mobile responsive.

### F. Wired Customer Detail Dialog into Leads Tab + Orders Tab

**File**: `src/sections/nw/toko/leads-tab.tsx` (EDITED)
- Imported `CustomerDetailDialog` + `ExternalLink` icon.
- Added state `detailCustomerId`.
- In the lead side panel, the "✓ Terhubung ke Customer" block now has a clickable button showing `activeLead.customer.name` + ExternalLink icon → opens `CustomerDetailDialog` with `activeLead.customerId`.
- Rendered `<CustomerDetailDialog>` at end of component.

**File**: `src/sections/nw/toko/orders-tab.tsx` (EDITED)
- Imported `CustomerDetailDialog` + `ExternalLink` icon.
- Added state `detailCustomerId`.
- In the orders table Customer column, if `o.customer` exists, render a `<button>` (with `e.stopPropagation()` to prevent row expand) showing the customer name + ExternalLink icon → opens `CustomerDetailDialog` with `o.customerId`. Walk-in/lead-only orders still render as plain text.
- Rendered `<CustomerDetailDialog>` at end of component.

### G. Verification
- `bun run lint`: **0 errors, 0 warnings** (after fixing initial typo: `next.server` → `next/server` and `@components/ui/tabs` → `@/components/ui/tabs`).
- `bunx tsc --noEmit` (excluding skills/ + examples/): **0 errors**.

## Stage Summary

### Files created
- `src/app/api/products/[id]/details/route.ts` (~210 lines)
- `src/app/api/customers/[id]/route.ts` (~190 lines)
- `src/sections/nw/produk/product-detail-dialog.tsx` (~510 lines)
- `src/sections/nw/toko/customer-detail-dialog.tsx` (~520 lines)

### Files edited
- `src/sections/nw/produk-section.tsx` (import ProductDetailDialog + Eye icon, add detailProductId state, ProductCard onDetail prop, card click handler + hover overlay + dropdown "Lihat Detail", render dialog with onEdit wiring)
- `src/sections/nw/toko/leads-tab.tsx` (import CustomerDetailDialog + ExternalLink icon, add detailCustomerId state, "Terhubung ke Customer" → clickable button, render dialog)
- `src/sections/nw/toko/orders-tab.tsx` (import CustomerDetailDialog + ExternalLink icon, add detailCustomerId state, customer name in orders table → clickable button, render dialog)

### Decisions
- **Stock movement reconstruction**: since Product has no native inventory ledger, computed initial stock = current stock + Σ qty sold (non-cancelled). Displayed as first "in" movement with reference "initial", followed by chronological "out" movements with running balance. Mirrors the typical UMKM mental model: "I started with X, sold Y over time, now have Z."
- **Cancelled orders excluded from stats** (totalSold/Revenue/Cost) — consistent with `/api/orders` POST behavior that doesn't decrement stock on cancelled orders (status update path restores stock).
- **Cancelled orders excluded from stock movements** to keep balance arithmetic consistent.
- **`lastSoldAt` includes cancelled orders** — last time the product appeared in any order.
- **`orderCount` includes cancelled** — total appearances in any order document.
- **Payment status enum** unified to 4 values (Lunas/Menunggu/Sebagian/Belum bayar) across product detail + customer detail for consistency. Computed from Payment rows (not stored on Order).
- **`repeatRate` proxy** = totalOrders / (totalOrders + 1) × 100 — slightly under 100% to reflect growth potential. Documented in API comment.
- **Customer phone clickable** in customer detail header (teal link to wa.me) — same as lead side panel pattern. Footer also has dedicated WhatsApp button.
- **No new query invalidations** added — detail dialogs are read-only views; existing mutations (create order, edit product, etc.) already invalidate their parent query keys. Detail dialog uses unique query key `["product-detail", id]` / `["customer-detail", id]` so it auto-refetches on each open (no staleTime).
- **Mobile responsive**: all dialogs use `sm:max-w-3xl` with scrollable body; stat grids collapse to 2 cols on mobile; tables hide non-essential columns on small screens (`hidden md:table-cell`).
- **Stock card timeline** (custom divs) over a table — easier to show colored in/out + running balance than a flat table. Mirrors the lead funnel pattern in Insights section.
- **ExternalLink icon** next to clickable customer names — provides affordance without being intrusive; respects row's stopPropagation on orders table to prevent row-expand toggle.
- **No `lib/*` files modified** per spec. No other section files modified except the 3 explicitly named.
- **All copy in Indonesian.** Established cream/teal palette preserved (teal for primary actions, emerald/amber/rose for status badges, orange accent for jasa).

## Cross-module data flow enabled
- Produk card click → detail dialog shows sales history (orders), stock movement (running balance), related content (Konten rows for this productId).
- Lead side panel "Terhubung ke Customer" click → customer detail with order history, transactions (income from verified payments linked via customerId), campaigns received (CampaignRecipient join), receivables.
- Orders table customer name click → same customer detail dialog. Walk-in orders (no customer) not clickable.
