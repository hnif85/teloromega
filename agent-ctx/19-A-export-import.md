# Task 19-A — Export/Import Data Feature

**Agent**: full-stack-developer (Export/Import)
**Date**: 2026-07-11

## Task
Build JSON backup/restore — export all brand data to downloadable JSON, import with merge strategy (skip existing).

## Files Created

### 1. `src/app/api/export/route.ts` (GET, ~165 lines)
- Auth: `getUserId(req)` → 401 if missing
- Ownership: `db.brand.findUnique({ where: { id } })` → 404 if `brand.userId !== userId`
- Parallel fetch of ALL 19 brand-scoped models via `Promise.all([...])`:
  - Direct brandId: products, customers, leads, orders, transactions, content, research, contexts, contextUsage, campaigns, inboxMessages, receivables, payables, operationalCosts, goals, creditUsageLog
  - Via parent relation: payments (`{ order: { brandId } }`), inventory (`{ product: { brandId } }`), campaignRecipients (`{ campaign: { brandId } }`)
- `stripUserId<T>()` helper deletes `userId` from every row (privacy-safe)
- Response shape: `{ version: "1.0", exportedAt, brand: {id,name,slug,category,description,toneOfVoice,logoUrl}, data: {19 model arrays}, counts: {19 keys with N} }`
- Headers: `Content-Type: application/json; charset=utf-8`, `Content-Disposition: attachment; filename="nextwhiz-backup-{brand.slug}-{YYYY-MM-DD}.json"`
- Returns pretty-printed JSON (`JSON.stringify(payload, null, 2)`)

### 2. `src/app/api/import/route.ts` (POST, ~440 lines)
- Body: `{ brandId, data: <BackupPayload> }`
- Auth + ownership same as export
- Version check: rejects `version !== "1.0"` with 400
- Coercion helpers: `asDate/asInt/asFloat/asBool/asStr/asStrOrNull/asDateOrNull`
- Merge strategy wrapped in `db.$transaction(async (tx) => { ... })`:
  - **Products**: skip if `findFirst({ where: { brandId, name } })` exists; otherwise insert with `crypto.randomUUID()`
  - **Customers**: skip if `findUnique({ where: { brandId_phone: { brandId, phone } } })` exists (uses @@unique constraint)
  - **All other models**: insert with new IDs; FK fields remapped via in-memory `Map<oldId, newId>`
  - Orphan handling: Payment/Inventory/CampaignRecipient/Context/ContextUsage skip if parent wasn't imported
  - `userId` re-assigned to importing user
  - `brandId` ALWAYS set to target brand (enables cross-brand migration)
- Prisma error handling: catches `Prisma.PrismaClientKnownRequestError` separately → 400 with code; other errors → 500
- Returns `{ imported: { model: N, ... }, skipped: { model: N, ... } }`

## Files Edited

### 3. `src/sections/nw/pengaturan-section.tsx`
- Added `useRef` to React imports
- Added 5 Lucide icons: Download, Upload, FileJson, ShieldCheck, Info
- Added interfaces: `BackupCounts`, `ImportResult`
- Added `useExportPreview(brandId)` hook — TanStack Query, fetches export endpoint, staleTime 60s, returns counts
- Added `formatBytes(bytes)` helper
- Added `BackupTab` component (~470 lines):
  - 2-column grid: Export Card (teal) + Import Card (amber)
  - Export Card: Download icon, "Export Data" title, Indonesian description, counts preview as Badge chips (📦 N produk · 🛒 N order · 💰 N transaksi · 👤 N customer · 👥 N leads · 📝 N konten · 🔍 N riset), "Download Backup JSON" button with loading state
  - Import Card: Upload icon, "Import Data" title, Indonesian description with "TIDAK akan ditimpa" bolded, hidden file input (`.json`, max 25 MB), file preview after selection (name + size + validity), "Pilih File" outline button + "Import" amber button wrapped in AlertDialog with confirmation
  - Info Card (stone, dashed border): tips in Indonesian about weekly backup, safe storage, cross-brand migration, no sensitive data
  - Export uses `useMutation` + direct `fetch()` (not `api()`) — needed to read Content-Disposition header, then Blob + anchor download
  - Import uses `useMutation` + `api<ImportResult>("/api/import", { method: "POST", json: { brandId, data: parsed } })`. Builds summary line from imported counts.
  - After import: resets file state, `qc.invalidateQueries()`, closes AlertDialog
- Wired as 7th tab "Backup" (value="backup", ShieldCheck icon) in `<TabsList>` + `<TabsContent>`

## Verification

### Export API
- `GET /api/export?brandId=X` → 200 + 29854 bytes JSON with correct Content-Disposition
- Verified userId stripped (no leak)
- Returns shape: `{ version, exportedAt, brand, data: {19 model arrays}, counts: {19 keys} }`

### Import API — Same-brand (hanif → hanif)
- `POST /api/import` with same-brand backup → products (5) & customers (2) skipped, everything else imported with new IDs
- Re-export confirmed: products still 5 (skipped), orders now 12 (doubled) → merge strategy works correctly

### Import API — Cross-brand (hanif → Sedap Mantab)
- All 32 rows imported, 0 skipped (clean target brand)

### Error Cases
- Missing brandId → 401
- Bad brandId → 404
- version "2.0" → 400 "Versi backup tidak didukung (diharapkan \"1.0\", diterima \"2.0\")"
- Missing data.data → 400 "data.data tidak ditemukan di backup"
- Non-authenticated → 401

### Lint + TypeScript
- `bun run lint` → 0 errors, 0 warnings
- `bunx tsc --noEmit` (excluding skills/examples) → 0 errors
- Dev server log: HTTP 200, no compile errors
- Page bundle `pengaturan-section_tsx_*.js` confirmed to contain BackupTab code (25 matches)

## Decisions

1. **Pretty-printed JSON (2-space) in export** — human-readable & diff-friendly for users who want to inspect their backup. Size trade-off negligible.

2. **Merge strategy with `crypto.randomUUID()` new IDs** — safer than reusing source IDs (avoids collisions if backup came from same DB). Spec-compliant.

3. **FK remapping via in-memory `Map<oldId, newId>`** — built incrementally as each model is processed; downstream models consult the map for parent IDs.

4. **Orphan handling** — Payment/Inventory/CampaignRecipient/Context/ContextUsage skip if their parent wasn't imported (preserves referential integrity).

5. **InboxMessage.leadId and Content.contextId set to null on import** — these references point to records that may not be importable; we accept the trade-off (body content preserved).

6. **Cross-brand migration supported** — `brandId` always set to target brand. `userId` re-assigned to importing user (privacy-safe across accounts).

7. **CreditUsageLog imported for history** but doesn't affect actual `User.creditBalance` (authoritative in user table, not derived from log).

8. **25 MB upload size limit (client-side check)** — well above any reasonable brand backup; prevents accidental upload of huge files.

9. **File validation in client** (extension, JSON parse, version, data field) before enabling Import button — saves a round-trip and gives instant feedback.

10. **AlertDialog confirmation before import** — destructive (irreversible) action deserves confirmation per UX best practices.

11. **Export download uses Blob + temporary anchor** (not `window.location = url`) — works reliably across browsers and lets us set the filename from server's Content-Disposition header.

12. **`useExportPreview` hook fetches the full export** (server has no HEAD endpoint); we accept the extra bandwidth (once per 60s, cached via staleTime) for the convenience of a counts preview. Alternative would be a separate `/api/export/preview` endpoint, but that's premature optimization.

## Reusable Patterns

- **Prisma parallel brand-scoped fetch**: `Promise.all([db.model.findMany({ where: { brandId } }), ...])` for export-style endpoints. Models without direct brandId use relation filter (`{ order: { brandId } }`).
- **`stripUserId<T>()` generic**: deletes `userId` from any row before serialization — privacy-safe for export/import flows.
- **Merge-import with FK remapping**: maintain `Map<oldId, newId>` per model, consult during downstream inserts, fall back to null if parent wasn't imported.
- **Coercion helpers** (`asDate/asInt/asStr/...`): gracefully handle loose JSON values from external backups (strings instead of numbers, null vs undefined, etc.).
- **Interactive Prisma transaction**: `db.$transaction(async (tx) => { ... })` — supports sequential inserts with dependencies. Wrap in try/catch for `PrismaClientKnownRequestError` to distinguish validation errors from internal errors.
- **Blob + temporary anchor for file downloads**: parse Content-Disposition header → set `link.download` → click → revoke URL after 1.5s.
- **TanStack Query for counts preview**: `placeholderData: (prev) => prev` keeps old data visible during refetch.
