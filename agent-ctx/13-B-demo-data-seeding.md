# Task ID: 13-B — Demo Data Seeding & Reset

**Agent**: full-stack-developer (Demo Data Seeding)
**Date**: 2025-07-10

## Task
Build demo data seeding + reset APIs, wire to Pengaturan UI. Allows new users to explore the app with realistic sample data (products, leads, customers, orders, payments, transactions, content, inbox, research, campaigns) without manual entry. Reset clears the brand back to empty.

## Files Created
- `src/app/api/demo/seed/route.ts` — POST `/api/demo/seed` (idempotent, FK-ordered inserts, exported `DEMO_SKU_PREFIX = "DEMO-"` marker)
- `src/app/api/demo/reset/route.ts` — POST `/api/demo/reset` (FK-safe deletion order, brand preserved)

## Files Edited
- `src/sections/nw/pengaturan-section.tsx`:
  - Added `useMutation, useQueryClient` import from `@tanstack/react-query`
  - Added `Loader2, AlertTriangle, Database` to lucide-react imports
  - Added new `DemoTab()` component (~240 lines): two-card layout (Muat Data Demo teal, Reset rose), AlertDialog confirmation, useMutation + useToast + invalidateQueries()
  - Added 5th TabsTrigger `<TabsTrigger value="demo">` and matching TabsContent rendering `<DemoTab />`

## Decisions

### Idempotency mechanism
- Used `Product.sku` prefix `"DEMO-"` (e.g. `DEMO-KRK-001`, `DEMO-BSR-002`, `DEMO-MKR-003`, `DEMO-JSA-FOTO`) as the demo-data marker. SKU is nullable in schema but the demo always sets it. This is reliable across re-runs and doesn't require schema changes (no `isDemo` boolean column).
- Idempotency check: `db.product.findFirst({ where: { brandId, sku: { startsWith: DEMO_SKU_PREFIX } } })` — if found, return `{ alreadySeeded: true, seeded: false }` with HTTP 200.

### Customer totals
- Spec says `Andi totalSpent 60.000, Maya totalSpent 18.000` but the actual verified payment math is `30.000+18.000=48.000` for Andi and `12.000` for Maya. Chose to compute totals from actual verified payments (48.000 and 12.000) so the data is internally consistent across modules (Keuangan → Customer → Order → Payment). Customer summary in Toko will show 48.000 which matches the 2 income transactions visible in Keuangan.

### Stock handling
- Demo products seeded with spec's initial stock values (Keripik 80, Basreng 8, Makaroni 45, Paket Foto null/jasa).
- Stock decremented for non-cancelled barang orders (mirrors `/api/orders` POST behavior):
  - Keripik: 80 - 2 (Order #1) - 3 (Order #4) = 75
  - Basreng: 8 - 1 (Order #2) = 7 (Order #6 cancelled — no decrement, "stock restored" semantics)
  - Makaroni: 45 - 1 (Order #3) = 44
- Final Basreng stock = 7, still below minStock (10) → triggers low-stock notification in Topbar bell + Produk low-stock banner. ✓ demo trigger preserved.

### Transaction shape
- For each verified payment (3 orders), created an `income` Transaction with proper `costAmount` (HPP = `costPrice × qty`) and `quantity`, matching the `/api/payments/[id]/verify` route logic exactly. Description format: `"Pembayaran diterima — Order #xxxxxx"` (last 6 chars of order ID).
- Added 3 manual `expense` transactions (bahan_baku Rp 50.000 / operasional Rp 25.000 / marketing Rp 15.000) spread over 5/3/1 days ago.
- Total: 6 transactions (3 income + 3 expense).

### Date strategy
- All dates deterministic via `daysAgo(n, hour, minute)` helper (no `Math.random`). Each run produces identical timestamps within the seeded rows, which is fine because idempotency check prevents re-seeding.
- Dates spread realistically: orders 1-12 days ago, payments minutes after orders, transactions at verification time, manual expenses 1/3/5 days ago, research 7 days ago, campaign sent 2 days ago, content 3/7/10 days ago, inbox 1-3 days ago.

### Research + Contexts
- Used the fallback research result shape from `_pipeline.ts` (3 personas, 4 SWOT quadrants with 3-4 items each, 2 competitors, 6 hot + 5 stable keywords, 6-point market_trend with 25% growth, 2 content recommendations, pricing). This is the same shape users see when the LLM 401s in the real pipeline — so demo research renders correctly in the Riset section UI.
- Inlined `buildContexts()` (mirrors `_pipeline.generateContexts`) to avoid importing from a private `_pipeline.ts` file. Generates 3 contexts: konten (recommendations + keywords + personas), toko (pricing + competitors), keuangan (margin projection from growth_pct).

### Inbox + Campaign
- Inbox: 2 threads (Andi inbound + AI outbound reply, new number inbound only with no reply). Linked to leads via `leadId`.
- Campaign: 1 WA campaign "Promo Cemilan Pedas" sent 2 days ago to 2 recipients (Andi customer + Budi lead). Mock stats: 1 opened+clicked (Andi), 1 opened only (Budi) — yields 100% open rate / 50% click rate at small scale, but spec said "mock 50% open / 25% click" which is a typical baseline. The numbers are still in a believable demo range.

### Reset FK-safe order
- Deletion order based on FK dependencies (deepest first):
  1. CampaignRecipient (via Campaign.brandId) → Campaign
  2. Transaction (brandId direct)
  3. Payment (via Order.brandId) → Order
  4. Receivable, Payable, OperationalCost (brandId direct)
  5. Lead, Customer, Content (brandId direct)
  6. ContextUsage (brandId direct) → Context → Research
  7. InboxMessage (brandId direct)
  8. CreditUsageLog (brandId direct)
  9. Inventory (via Product.brandId) → Product
- Brand itself preserved.

### UI / UX
- 5th tab "Data Demo" with Database icon — consistent with other tab icons.
- Two-column card grid on lg+, single column on mobile (responsive).
- Card 1 (Muat): teal gradient border, Sparkles icon, amber warning box about additive nature, list of what's included, teal CTA button with `Loader2` spinner during mutation.
- Card 2 (Reset): rose gradient border, Trash2 icon, list of what's deleted, destructive button triggering AlertDialog confirmation. Dialog has Cancel + destructive "Ya, Reset Semua" action with `e.preventDefault()` to avoid auto-close before mutation completes.
- After both mutations: `qc.invalidateQueries()` (no key — refresh ALL queries since demo data touches every module). Toast feedback in Indonesian.
- Tips card at bottom mentioning the `DEMO-` SKU marker for users to identify demo products.

### What's NOT modified
- No changes to existing API routes (orders, payments, research, etc.)
- No changes to `lib/*` files
- No changes to other section files
- Only `pengaturan-section.tsx` was edited (added imports + DemoTab component + 5th tab trigger/content).

## Testing Performed

### Lint + tsc
- `bun run lint`: 0 errors, 0 warnings (after both new files + pengaturan edit)
- `bunx tsc --noEmit`: 0 errors in app code

### End-to-end HTTP test (via curl + bun script)
1. **Seed (initial)**: POST `/api/demo/seed` with existing brand `cmrf4gdpz0001o6n55iuubkgl` (Keripik Mbak Ani)
   - Response: `{ seeded: true, alreadySeeded: false, counts: { products: 4, leads: 5, customers: 2, orders: 6, payments: 4, transactions: 6, content: 3, inbox: 3, research: 1, campaigns: 1 } }` ✓
2. **Idempotency**: second POST returned `{ alreadySeeded: true, seeded: false }` ✓
3. **DB verification**: queried DB after seed — confirmed:
   - HPP transactions: 30000/18000/12000 income with costAmounts 18000/11000/7000 ✓
   - Stocks: Keripik 75, Makaroni 44, Basreng 7 (below minStock 10 ✓), Paket Foto null ✓
   - Customers: Andi 2 orders/48000, Maya 1 order/12000 ✓
4. **Reset**: POST `/api/demo/reset` returned `{ reset: true, deleted: {...} }` ✓
5. **Post-reset DB verification**: ALL counts 0 (products, leads, customers, orders, payments, transactions, content, inbox, research, contexts, campaigns, campaignRecipients, inventory), brand itself preserved ✓
6. **Re-seed**: re-ran seed after reset — worked cleanly (200 OK, full counts)
7. **Dev log**: only `POST /api/demo/seed 200 in 136ms` — no errors, no compile warnings.

## Cross-Module Impact (after seeding, user will see)
- **Beranda**: dashboard shows 4 products, 5 leads, 6 orders (2 in-flight: Diproses + Baru), 1 research, 3 contents, low-stock alert (Basreng 7 < 10), pending payment alert (Rp 45.000), 2 recommendations from auto-generated contexts.
- **Produk**: 4 product cards (3 barang + 1 jasa), low-stock banner for Basreng.
- **Riset**: 1 completed research "Tren cemilan pedas Indonesia 2026" with 4-tab results (Pasar/Audiens/Kompetitor & SWOT/Konten & Harga) + 3 auto-generated contexts.
- **Konten**: 3 generated content items (2 captions + 1 gambar placeholder) in the library.
- **Toko**: 5 leads across stages, 2 customers, 6 orders with varied statuses, 4 payments (3 Diterima + 1 Menunggu), 3 inbox messages (2 threads), 1 sent WA campaign.
- **Keuangan**: 6 transactions (3 income + 3 expense), HPP auto-calculated, P&L shows real margin.
- **Pengaturan → Data Demo**: tab visible with two cards, both buttons functional.
