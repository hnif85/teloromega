# Task ID: 6 — Agent: full-stack-developer (Toko)

## Summary
Built the **Toko (Sales/Store) module** — 8 sub-tabs + Toko Online preview.

## What was built

### API Routes (all under `src/app/api/`)

| Route | Methods | Purpose |
|---|---|---|
| `/api/inbox` | GET, POST | List/group inbox threads; simulate inbound (auto-creates lead if new phone, attaches to existing lead if matches) |
| `/api/inbox/reply` | POST | Outbound reply; if text empty → AI auto-generates via `llmChat` with brand + catalog context. Charges 1 credit (`toko.ai_chat_reply`) |
| `/api/inbox/ai-reply` | POST | Generate AI draf only (no persist). Charges 1 credit |
| `/api/inbox/templates` | GET | 5 static templates: Harga produk, Info stok, Alamat pengiriman, Konfirmasi pembayaran, Terima kasih |
| `/api/leads` | GET, POST | List with customer; create (stage "Baru"); auto-link to existing customer by phone |
| `/api/leads/[id]` | PATCH, DELETE | Move stage (auto-create Customer on "Deal" if phone new); delete |
| `/api/orders` | GET, POST | List with items/customer/payments; create — computes totalAmount, validates & decrements stock for barang, returns stockWarnings |
| `/api/orders/[id]` | PATCH | Update status/resi/shipping; on "Dibatalkan" restores stock for barang products |
| `/api/payments` | GET, POST | List with order; create (status "Menunggu") |
| `/api/payments/[id]/verify` | POST | Verify (Diterima/Ditolak). On Diterima: **inserts `transaction` (income, HPP snapshot from cost_price × qty)**, updates customer totals, sets order.status → "Diproses" if "Baru" |
| `/api/shipping` | GET | Orders with barang items needing resi (status Baru/Diproses/Dikirim) |
| `/api/shipping/[orderId]` | POST | Set resi + kurir + ongkir, status → "Dikirim" |
| `/api/inventory` | GET | Products + stock movements (derived from order items) |
| `/api/inventory/[productId]` | PATCH | Update stock + minStock |
| `/api/campaigns` | GET, POST | List with stats; create — charges 8 (wa) or 10 (email) credits, simulates send, mocks open/click per recipient |
| `/api/campaigns/[id]` | GET | Single campaign + recipients + open/click stats |
| `/api/customers` | GET | Customers + active leads (for campaign recipient picker) |

### Frontend (`src/sections/nw/toko-section.tsx` + `src/sections/nw/toko/*`)

- `toko-section.tsx` — main, 8-tab Tabs (horizontal scroll on mobile), StorePreview at top
- `store-preview.tsx` — gradient card showing `tokoku.nextwhiz.id/{brand-slug}` + "Lihat Toko" Dialog with mock storefront (logo, name, description, product grid with photos/prices/stock, "Chat via WA" button → simulates inbound lead)
- `inbox-tab.tsx` — 2-pane layout (conversation list left, thread right); Simulasi inbound form; reply textarea + "Sarankan AI" (generates draft via `/api/inbox/ai-reply`) + Send (uses `/api/inbox/reply`)
- `aichat-tab.tsx` — AI Reply Generator (input → AI draft with copy button) + Template list with quick copy
- `leads-tab.tsx` — **Kanban with @dnd-kit** (4 columns: Baru/Negosiasi/Deal/Closed, colored headers per `LEAD_STAGES`); drag-drop between columns; click card → Sheet side panel with details, stage buttons, "Chat WhatsApp" link, "Jadikan Order" (dialog with product qty picker → POST /api/orders), "Hapus" button
- `orders-tab.tsx` — Table with expandable rows; columns: customer/lead, items, total, status badge, payment badge, time, actions (Proses/Selesai/Batal). Expanded row shows items, shipping form (inline edit kurir/resi/ongkir for barang), payment history, status changer. "Order Baru" dialog with customer/lead picker, product qty stepper, ongkir + notes
- `payments-tab.tsx` — Table of payments with verify buttons (Terima/Tolak) + confirmation dialog; "Tambah Pembayaran" via Select order
- `shipping-tab.tsx` — Two sections: "Perlu Dikirim" (inline form per order: kurir/resi/ongkir/Kirim button) + "Sudah Dikirim" (with Selesai button)
- `inventory-tab.tsx` — Table of barang products with stock level, min, status badge (Habis/Menipis/Aman); low-stock alert card; inline Edit (stock + minStock dialog); Riwayat movement dialog showing orders affecting this product (with +/− stock indicators based on order status)
- `campaigns-tab.tsx` — Create dialog (WA/Email channel toggle, name, subject for email, body, recipient picker with checkboxes for customers + leads); list of past campaigns with stat boxes (Sent/Open%/Click%); detail dialog with full stats + recipient breakdown
- `types.ts` — shared TypeScript types for all sub-tabs

## Key Decisions

1. **Income recognition at Payment = Diterima** — implemented per LOGIC_FLOW. The `/api/payments/[id]/verify` route creates a `Transaction` with `type: "income"`, `category: "penjualan"`, `costAmount: HPP snapshot` (sum of `cost_price × qty` for all items), and `productId` set to the single product if order has 1 item. Customer `totalOrders` + `totalSpent` updated.
2. **Stock handling for barang vs jasa** — `jasa` products have `stock: null`, no shipping. Order creation decrements stock (with warning if insufficient but allows). Order cancel restores stock.
3. **Auto-lead from inbox** — Inbound from a new phone auto-creates a Lead (stage "Baru"). Existing phone attaches to most recent lead.
4. **Auto-customer on Deal** — Moving lead to "Deal" auto-creates Customer if phone is new for the brand (`@@unique([brandId, phone])`).
5. **Campaign simulation** — POST immediately marks campaign as `sent`, all recipients `sent: true, deliveredAt: now`, with randomized mock `openedAt` (~60%) and `clickedAt` (~25%).
6. **Kanban DnD** — Used `@dnd-kit/core` with `useDraggable` for cards + `useDroppable` for columns (simpler than `@dnd-kit/sortable` for cross-column Kanban). DragOverlay shows the dragged card.
7. **Credit display sync** — All credit-charging mutations call `setCredit(res.creditBalanceAfter)` to update Zustand store instantly.

## Files Created/Modified

```
Modified:
- src/sections/nw/toko-section.tsx (overwrite — was 4-line stub)

Created API:
- src/app/api/inbox/route.ts
- src/app/api/inbox/reply/route.ts
- src/app/api/inbox/ai-reply/route.ts
- src/app/api/inbox/templates/route.ts
- src/app/api/leads/route.ts
- src/app/api/leads/[id]/route.ts
- src/app/api/orders/route.ts
- src/app/api/orders/[id]/route.ts
- src/app/api/payments/route.ts
- src/app/api/payments/[id]/verify/route.ts
- src/app/api/shipping/route.ts
- src/app/api/shipping/[orderId]/route.ts
- src/app/api/inventory/route.ts
- src/app/api/inventory/[productId]/route.ts
- src/app/api/campaigns/route.ts
- src/app/api/campaigns/[id]/route.ts
- src/app/api/customers/route.ts

Created UI:
- src/sections/nw/toko/types.ts
- src/sections/nw/toko/store-preview.tsx
- src/sections/nw/toko/inbox-tab.tsx
- src/sections/nw/toko/aichat-tab.tsx
- src/sections/nw/toko/leads-tab.tsx
- src/sections/nw/toko/orders-tab.tsx
- src/sections/nw/toko/payments-tab.tsx
- src/sections/nw/toko/shipping-tab.tsx
- src/sections/nw/toko/inventory-tab.tsx
- src/sections/nw/toko/campaigns-tab.tsx
```

## Lint & Type Check
- `bun run lint`: 0 errors, 1 warning (in `src/app/page.tsx` — outside scope)
- `bunx tsc --noEmit`: 0 errors in toko files (fixed `_sum: {}` empty aggregate in campaigns route; fixed `LeadWithCustomer` interface extension conflict)

## Notes for other agents
- The `/api/customers` route returns `{ customers, leads }` — also used by Leads tab + Orders tab.
- The `inventory` route returns movements derived from order items (status determines +/− direction).
- Credit action keys used: `toko.ai_chat_reply` (1), `toko.campaign_wa` (8), `toko.campaign_email` (10).
- `Transaction` model income created at Payment verification includes `costAmount` (HPP snapshot) for the Keuangan module to compute margin.
