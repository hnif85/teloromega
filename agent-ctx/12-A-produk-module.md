# Task 12-A — Produk Module (full-stack-developer)

> Built Produk management module — full CRUD UI, sidebar nav entry, dashboard CTA.
> Critical gap fixed: previously no way to add/edit/delete products except via onboarding dialog.

## Files Touched

### Edited
- `src/lib/constants.ts` — Added `"produk"` to `SectionKey` type and NAV_ITEMS array (after Beranda, before Riset).
- `src/app/page.tsx` — Imported `ProdukSection`, added render branch `{section === "produk" && <ProdukSection />}`.
- `src/sections/nw/beranda-section.tsx` —
  - Wrapped "Produk Aktif" StatCard in a `<button onClick={() => setSection("produk")}>` so the dashboard stat is clickable.
  - Added "📦 Tambah Produk" button to the empty-state CTA row alongside existing "Mulai Riset" and "Atur Toko".
  - Changed CTA container from `flex gap-2` to `flex flex-wrap gap-2` so 3 buttons wrap gracefully on mobile.

### Created
- `src/sections/nw/produk-section.tsx` — Full "use client" Produk section (~770 lines).

## Architecture

### Data Flow
- `useQuery(["products", brandId])` → `GET /api/products?brandId=X` (existing API).
- `saveMutation` → POST `/api/products` (create) or PATCH `/api/products/[id]` (edit). Invalidates both `products` and `dashboard` query keys (so Beranda's Produk count stays fresh).
- `deleteMutation` → DELETE `/api/products/[id]` (soft delete via isActive=false). AlertDialog confirmation.
- All state through `useAppStore`: `getActiveBrand(useAppStore.getState())` + `setSection`.

### UI Structure
1. **PageHeader** — title "Produk", subtitle "{brandName} · {category}", teal "Tambah Produk" button.
2. **4 StatCards**: Total Produk, Produk Barang, Produk Jasa, Nilai Stok (Σ stock × costPrice for barang).
3. **Low stock banner** — amber-bordered, shows count + first 3 names + "Restok di Toko" button (→ setSection("toko")). Only renders if any barang has stock ≤ minStock.
4. **Filter row**: Tabs (Semua/Barang/Jasa with counts) + Search Input (filters by name OR SKU).
5. **Product grid** — responsive 1/2/3 columns. Each card:
   - `AspectRatio ratio={1}` image (or initials placeholder gradient if no imageUrl).
   - Type badge (teal Barang / orange Jasa) top-left, dropdown menu (MoreVertical) top-right.
   - Name (2-line clamp) + SKU badge.
   - Price (formatRupiah, bold).
   - Margin info: if costPrice set → "Modal Rp X · Margin Rp Y (Z%)"; else amber "Modal belum diisi" badge.
   - Stock info (barang only): "Stok: N pcs" + status badge (Aman/Menipis/Kritis/Habis).
   - Description (2-line clamp).
   - Footer: Edit + Hapus buttons.
6. **Loading state** — 6 skeleton cards.
7. **Empty state** — friendly illustration + CTA button when no products; reset filter CTA when filters yield nothing.

### Add/Edit Dialog
- Shared component for create & edit. Edit pre-fills form from product.
- **Type selector**: 2 large cards (📦 Barang / 💼 Jasa) with active border + checkmark.
- Conditional fields:
  - **Barang**: Nama*, Harga Jual*, Harga Modal, Stok Awal, Stok Minimum, SKU, Deskripsi, URL Foto.
  - **Jasa**: Nama*, Harga Jual*, Harga Modal, Deskripsi* (required for jasa), URL Foto Portofolio. (No stock/SKU fields.)
- Live margin preview: when both price & costPrice valid, shows "Margin Rp X (Y%)" in teal below Harga Modal.
- Validation: required fields, numeric positivity checks. Errors render inline below each field.
- Save button shows Loader2 spinner during mutation, label changes between "Tambah Produk" / "Simpan Perubahan".
- Toast feedback: success ("Produk ditambahkan" / "Produk diperbarui") with description; failure ("Gagal menyimpan") with error message.

### Delete Confirmation
- AlertDialog with title "Yakin hapus {name}?", description explains soft-archive + that linked transactions/konten stay intact.
- Action button is rose-600 with Loader2 spinner during delete.

## Decisions
1. **No new API** — Reused existing `/api/products` (GET/POST) and `/api/products/[id]` (PATCH/DELETE). PATCH route omits `sku` from the update payload (existing route doesn't support sku update — acceptable since SKU is set at creation).
2. **Stock color logic**: stock === 0 → "Habis" (rose); stock < minStock → "Kritis" (rose); stock === minStock → "Menipis" (amber); stock > minStock → "Aman" (emerald). When minStock is null, only stock===0 triggers red.
3. **Image fallback** — Initials from first 2 letters of name on teal→cream→orange gradient. `onError` hides broken images so the fallback shows.
4. **Dashboard query invalidation** — Both `products` and `dashboard` queries invalidated on mutation so the "Produk Aktif" stat on Beranda stays in sync.
5. **Tabs counts in labels** — Show counts (Semua (5), Barang (3), Jasa (2)) so users see distribution at a glance.
6. **Stat card clickable wrapping** — Beranda "Produk Aktif" StatCard wrapped in `<button>` (not modified StatCard primitive) with focus-visible ring for a11y. StatCard itself untouched (no edit to primitives.tsx).
7. **All copy in Indonesian**: "Tambah Produk", "Yakin hapus", "Stok menipis", "Modal belum diisi", "Restok di Toko", etc.
8. **No `Select` import** — Type selector uses custom `TypeCard` button (2-card picker) instead of Select dropdown for better UX and visual clarity.

## Lint Result
- `bun run lint`: my files pass clean (0 errors, 0 warnings).
- Pre-existing error in `src/components/nw/command-palette.tsx:119` (setState-in-effect) is in another agent's file — out of scope.
- TypeScript: 0 errors in my modified files.

## Dev Log Verification
- `/api/products?brandId=X` returns 200 (visible in dev.log).
- Section renders when sidebar "Produk" clicked.
- No compile errors after edits.
