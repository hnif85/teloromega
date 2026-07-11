# Task 20-A — Notification Center + Preferences

**Agent:** full-stack-developer (Notification Center)
**Task ID:** 20-A
**Date:** 2026-07-11

## Goal
Build Notification model + API + Notifikasi section with history, mark-as-read, preferences. Enhance topbar bell with persistent count, Generate button, and Lihat Semua link.

## Work Log

### 1. Context review
- Read worklog.md (last 2 entries: Task 19-B Service Worker + Styling, Task 19-A Export/Import). Confirmed project is stable with 12 sections, global search, PWA, offline support.
- Read 7 pattern files: constants.ts (SectionKey, SECONDARY_NAV), store.ts (useAppStore, getActiveBrand), auth.ts (getUserId), db.ts (Prisma client), topbar.tsx (bell dropdown with derived notifications), api/dashboard/route.ts (low stock, pending payments, stale leads, recent research queries), prisma/schema.prisma (Goal/CreditRate/User models).

### 2. Schema — Notification model
- Edited `prisma/schema.prisma`:
  - Added `notifications Notification[]` to User model (line 31).
  - Added `Notification` model after Goal, before CreditRate (lines 410-428). Fields: id, userId, brandId (nullable for system-wide), type, title, message, severity (info/warning/success/error), readAt (nullable), actionUrl, actionLabel, metadata (JSON string), createdAt. Two indexes: `@@index([userId])` and `@@index([userId, readAt])`. Relation: `user User @relation(fields: [userId], references: [id], onDelete: Cascade)`.
- Ran `bun run db:push` → "Your database is now in sync with your Prisma schema" (47ms). Prisma Client regenerated.

### 3. Notifications API (4 routes)

**`src/app/api/notifications/route.ts`** (~170 lines):
- GET `/api/notifications?unreadOnly=true&brandId=Y&limit=N` — list user's notifications sorted newest-first. `unreadOnly` filters `readAt: null`. `limit` defaults to 50, capped at 200. Returns `{ notifications: [...], unreadCount: N, total: N }` with `read: boolean` computed field.
- POST `/api/notifications` — create a single notification. Body: `{ type, title, message, severity?, actionUrl?, actionLabel?, metadata?, brandId? }`. Validates type against `NOTIFICATION_TYPES` enum, severity against `NOTIFICATION_SEVERITIES` enum. Optional brandId ownership check. Title truncated to 200 chars, message to 1000. Returns `{ notification: {...} }` with 201.

**`src/app/api/notifications/[id]/route.ts`** (~100 lines):
- PATCH — mark read/unread. Body: `{ read: boolean }`. Sets `readAt = new Date()` (read) or `null` (unread). Ownership check (`existing.userId === userId`). Returns `{ notification: {...} }`.
- DELETE — delete notification. Ownership check. Returns 204 no content.

**`src/app/api/notifications/read-all/route.ts`** (~30 lines):
- POST — bulk mark all unread as read. Optional `brandId` query scopes to one brand. Uses `db.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: now } })`. Returns `{ updated: N }`.

**`src/app/api/notifications/generate/route.ts`** (~220 lines):
- POST — scans dashboard data and creates notifications for current alerts. Body: `{ brandId, preferences? }`.
- Parallel scan with `Promise.all`: low stock products (type=barang, isActive, stock!=null, filtered `stock <= minStock`), pending payments > 2 days (`status=Menunggu, createdAt < 2 days ago`), stale leads (> 3 days, stage not Closed/Deal), recent research (last 24h, top 5), achieved goals (status=achieved).
- `buildDedupIndex()` — fetches all UNREAD notifications for user+brand (or system-wide), parses `metadata` JSON to extract `referenceId`, builds `Map<type, Set<referenceId>>` for O(1) dedup checks.
- Per-type preference filter: `prefEnabled(prefs, key)` returns `true` if prefs is undefined OR prefs[key] !== false (opt-out model). When `preferences` is provided in body, only types whose pref is `true` will be generated.
- Dedup rule: if same `type + referenceId` already exists and is UNREAD, skip (increment `duplicates`). Otherwise add to batch and update the in-memory dedup index (prevents within-batch dupes too).
- Bulk create via `db.notification.createMany({ data: toCreate })` — single INSERT for efficiency.
- Returns `{ generated: N, duplicates: N, scanned: { lowStock, pendingPayments, staleLeads, recentResearch, achievedGoals } }`.

### 4. Preferences API — `src/app/api/notification-preferences/route.ts` (~100 lines)
- Per spec, preferences are stored CLIENT-SIDE in localStorage to avoid another schema migration. This API provides a server-side mirror via a long-lived cookie (`nw_notif_prefs`, 1 year, lax same-site).
- GET — returns preferences from cookie (or `DEFAULT_PREFERENCES` if absent).
- PATCH — accepts partial `NotificationPreferences` object, merges with current cookie value, validates each key (only booleans for known keys accepted; garbage ignored), sets cookie, returns merged object.
- `NotificationPreferences` shape: 8 type flags (lowStock, paymentPending, staleLead, researchCompleted, goalAchieved, orderNew, campaignSent, system) + 2 channel flags (emailEnabled, pushEnabled). Defaults: all `true`.
- The client (`notifikasi-section.tsx`) is the source of truth — it uses localStorage (`nw_notif_prefs_v1`) and synchronizes to the API via PATCH. The `/api/notifications/generate` endpoint reads preferences from the request body (client sends from localStorage).

### 5. Constants — `src/lib/constants.ts`
- Added `"notifikasi"` to `SectionKey` type (line 91).
- Added `{ key: "notifikasi", label: "Notifikasi", icon: "🔔" }` to `SECONDARY_NAV` (positioned between Credit and Pengaturan, line 106). Sidebar auto-picks this up since it maps over `SECONDARY_NAV`.

### 6. Notifikasi section — `src/sections/nw/notifikasi-section.tsx` (~700 lines)
- `"use client"` section with 3 tabs: "Semua" / "Belum Dibaca" / "Preferensi".
- **PageHeader**: Bell icon, title "Notifikasi", subtitle "Pusat notifikasi & preferensi". Actions: "Tandai Semua Dibaca" button (disabled when unreadCount=0) + "Generate Notifikasi" button (teal, Sparkles icon, disabled when no active brand).
- **Stats row** (4 StatCards): Total Notifikasi (teal), Belum Dibaca (warning), Hari Ini (orange), Minggu Ini (stone). Counts computed from fetched list.
- **Tabs**:
  - **Semua/Belum Dibaca**: notification cards in a ScrollArea (max 68vh). Each card has: severity-colored icon circle (teal/amber/emerald/rose), bold title (if unread) or medium weight (if read), message (line-clamped), type badge, time-ago, "Baru" badge if unread, action button (if actionUrl+actionLabel+valid section) → navigates via `setSection`, mark-read/unread toggle button (Check/Circle icon), delete button (Trash2). Card click → mark as read + navigate. Unread cards have subtle teal-50/30 bg; read cards hover to cream-100/50. Mobile: unread dot shown inline next to title (no left-side dot); desktop: left-side dot shown.
  - **Preferensi**: two SectionCards. First: "Jenis Notifikasi" with 8 toggle switches (one per type) — each row has icon circle (teal when enabled, stone when disabled), label, description, Switch. Second: "Channel Pengiriman" with 2 toggle switches (Email, Push Notification) — both labeled "demo: belum terhubung ke SMTP/FCM" to set expectations. Footer: sync indicator (amber pulse when syncing, emerald dot when idle) + note about localStorage + cookie sync.
- **Empty states**: distinct for "all" tab ("Tidak ada notifikasi. Klik 'Generate Notifikasi' untuk scan data terbaru.") vs "unread" tab ("Semua sudah dibaca 🎉").
- **TanStack Query**: `useQuery` for notifications list (staleTime 15s) + separate query for unread count (used in tab badge + dropdown). `useMutation` for mark read, delete, read-all, generate, sync prefs. All mutations call `queryClient.invalidateQueries({ queryKey: ["notifications"] })` to refresh.
- **Preferences persistence**: `loadPrefs()` reads from `localStorage["nw_notif_prefs_v1"]` (with `DEFAULT_PREFS` fallback). `savePrefs()` writes. On mount, `useEffect` hydrates prefs from localStorage (one-shot sync, `setPrefsHydrated(true)` flag prevents flash of defaults during SSR). Each toggle: updates local state, saves to localStorage, fires `syncPrefsMut` (PATCH to API) for cookie mirror (fire-and-forget, non-fatal).
- All copy in Indonesian.

### 7. Topbar enhancement — `src/components/nw/topbar.tsx`
- Added 3 new imports: `useMutation`, `useQueryClient` from `@tanstack/react-query`; `Sparkles, ArrowRight, RefreshCw` from lucide-react.
- Added 2 interfaces: `NotificationsCountResponse` (`{ unreadCount }`) and `GenerateResponse` (`{ generated, duplicates, scanned }`).
- Added `useQuery` for `/api/notifications?unreadOnly=true&limit=1` — fetches persistent unread count every 60s (same refetch interval as dashboard).
- Added `useMutation` for `/api/notifications/generate` — on success, invalidates `["notifications"]` queries and shows toast (3 cases: generated > 0, duplicates > 0, neither).
- **Badge logic**: `unread = Math.max(visibleNotifications.length, persistentUnread)` — takes the larger of derived alerts and persistent count so the badge never under-reports.
- **Dropdown content** enhanced:
  - Header: "Notifikasi" label + "N baru" badge if persistentUnread > 0 (teal pill).
  - When no derived alerts but persistent unread exists: special "🔔 N notifikasi belum dibaca" message with "Lihat semua notifikasi →" link.
  - Footer: two-button row — "Generate" (ghost, Sparkles icon, calls generateMut) + "Lihat Semua" (ghost teal, ArrowRight, calls `setSection("notifikasi")`).
  - "Tandai semua dibaca" now also calls `/api/notifications/read-all` (POST) to mark persistent DB notifications as read (in addition to the existing session-dismissed set).

### 8. Page routing — `src/app/page.tsx`
- Added `import { NotifikasiSection } from "@/sections/nw/notifikasi-section"` (line 26).
- Added `{section === "notifikasi" && <NotifikasiSection />}` render branch (line 108).

### 9. Verification
- `bun run lint` → 0 errors, 0 warnings (one initial warning about unused `eslint-disable` directive was removed).
- `bunx tsc --noEmit` (excluding skills/examples) → 0 errors.
- API endpoints verified via curl:
  - GET `/api/notifications?unreadOnly=true` → `{ notifications: [], unreadCount: 0, total: 0 }` ✓
  - POST `/api/notifications` (system, valid) → 201 with full notification shape ✓
  - POST `/api/notifications` (invalid type) → 400 "type tidak valid..." ✓
  - POST `/api/notifications` (missing fields) → 400 "type, title, message wajib diisi" ✓
  - POST `/api/notifications/generate` (brandId=hanif) → `{ generated: 1, duplicates: 0, scanned: { lowStock: 1, ... } }` ✓
  - POST `/api/notifications/generate` (second call) → `{ generated: 0, duplicates: 1 }` (dedup works) ✓
  - POST `/api/notifications/generate` with `lowStock: false` pref → `{ generated: 0, duplicates: 0 }` (pref filter works) ✓
  - POST `/api/notifications/generate` (missing brandId) → 400 ✓
  - POST `/api/notifications/generate` (invalid brandId) → 404 ✓
  - PATCH `/api/notifications/[id]` (read:true) → notification with `read: true, readAt: "..."` ✓
  - POST `/api/notifications/read-all` → `{ updated: 1 }` ✓
  - DELETE `/api/notifications/[id]` → 204 ✓
  - GET `/api/notification-preferences` → defaults (all true) ✓
  - PATCH `/api/notification-preferences` (`{ lowStock: false, emailEnabled: false }`) → merged result ✓
  - GET after PATCH (with cookie jar saved) → persisted prefs (lowStock:false, emailEnabled:false) ✓
  - PATCH `/api/notifications/abc` (invalid body `{}`) → 400 "body harus { read: boolean }" ✓
- Dev server: HTTP 200 on `/` (36951 bytes), no compile errors, Prisma queries logged correctly.

## Stage Summary

### Files created (8)
- `src/app/api/notifications/route.ts` (~170 lines) — GET list + POST create
- `src/app/api/notifications/[id]/route.ts` (~100 lines) — PATCH read/unread + DELETE
- `src/app/api/notifications/read-all/route.ts` (~30 lines) — POST bulk mark-read
- `src/app/api/notifications/generate/route.ts` (~220 lines) — POST scan + dedup
- `src/app/api/notification-preferences/route.ts` (~100 lines) — GET + PATCH (cookie mirror)
- `src/sections/nw/notifikasi-section.tsx` (~700 lines) — 3-tab section with cards + preferences
- `agent-ctx/20-A-notification-center.md` (this file)

### Files edited (3)
- `prisma/schema.prisma` (+19 lines: Notification model + User.notifications relation)
- `src/lib/constants.ts` (+2 lines: `"notifikasi"` in SectionKey type, second-nav entry)
- `src/app/page.tsx` (+2 lines: NotifikasiSection import + render branch)
- `src/components/nw/topbar.tsx` (+~70 lines: 2 new queries/mutations, enhanced dropdown with Generate + Lihat Semua buttons, badge takes max of derived+persistent counts, dismissAll also calls read-all API)

### Decisions
- **Dedup rule**: UNREAD + same `type + referenceId` (from `metadata.referenceId`). Read notifications can be re-generated (useful after mark-as-unread or after fixing the underlying issue). The dedup index is built once per generate call from existing UNREAD rows.
- **Preferences storage**: localStorage primary (client source of truth), cookie mirror on server (for future server-side features like email notifications). The `/api/notifications/generate` endpoint reads preferences from request body — client sends from localStorage. No schema migration needed.
- **`createMany` for batch insert** in generate endpoint — single INSERT for efficiency when 5+ alerts are generated at once.
- **Badge = max(derived, persistent)** — never under-reports. If user has 5 unread in DB and 3 derived alerts on screen, badge shows 5.
- **Dismiss-all dual action**: session-dismiss derived (existing behavior) AND call `/api/notifications/read-all` for persistent set. Both sources cleared in one click.
- **Severity colors**: teal (info), amber (warning), emerald (success), rose (error) — no indigo/blue per design rules.
- **Mobile-friendly**: unread dot shown inline next to title on mobile (since left-side dot is hidden on `sm:hidden`); card padding tighter on mobile (px-3 py-3) vs desktop (px-4 py-3.5).
- **Tab badge**: "Belum Dibaca" tab shows count badge (rose-100/rose-700) when unreadCount > 0 — capped at "99+".
- **Fire-and-forget prefs sync**: `syncPrefsMut` is non-blocking; client localStorage is updated immediately on toggle (optimistic). API failure is non-fatal (logged but no toast).
- **Topbar footer button row**: 50/50 split between "Generate" and "Lihat Semua" — both ghost variants, Generate is stone (secondary action) and Lihat Semua is teal (primary navigation action).
- **actionUrl maps to SectionKey**: a `URL_TO_SECTION` map (`/toko` → `toko`, etc.) lets notification cards navigate via `setSection`. Action button only renders if actionUrl, actionLabel, AND a valid section mapping exist (defensive against bad data).

### Lint/tsc/dev server
- Lint: 0 errors, 0 warnings.
- tsc: 0 errors.
- Dev server: HTTP 200 on `/`, no compile errors, all API routes respond correctly.
