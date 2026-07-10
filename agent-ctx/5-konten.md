# Task ID: 5 — Konten Module (full-stack-developer)

> Date: 2026-07-10
> Scope: Build the Konten (Content Creation) module for The Next Whiz — AI caption, image, video script, carousel generation with saved content library.

## Context Reading

Read the following files to align with project patterns:
- `/home/z/my-project/worklog.md` — project state from Task 1 (foundation ready)
- `/home/z/my-project/src/lib/constants.ts` — KONTEN_TYPES, TONES, TONE_MAP, CREDIT_COST, PLATFORMS, timeAgo
- `/home/z/my-project/src/lib/ai.ts` — `llmChat`, `llmJson`, `generateImage`
- `/home/z/my-project/src/lib/auth.ts` — `getUserId`
- `/home/z/my-project/src/lib/credit.ts` — `chargeCredit`, `refundCredit`
- `/home/z/my-project/src/lib/store.ts` — `useAppStore`, `getActiveBrand`, `Brand`
- `/home/z/my-project/src/components/nw/primitives.tsx` — `PageHeader`, `SectionCard`, `EmptyState`
- `/home/z/my-project/src/sections/nw/beranda-section.tsx` — section pattern reference
- `/home/z/my-project/prisma/schema.prisma` — Content, Product, Context, ContextUsage models
- `/home/z/my-project/src/app/api/products/route.ts`, `/home/z/my-project/src/app/api/brands/[id]/route.ts`, `/home/z/my-project/src/app/api/dashboard/route.ts` — route patterns
- `/home/z/my-project/src/components/ui/select.tsx` — Radix Select can't take empty string value, so used `__none__` sentinel.

## Files Created / Modified

### Created
1. `src/app/api/content/route.ts` — POST (generate) + GET (list)
2. `src/app/api/content/[id]/route.ts` — GET single + DELETE

### Overwritten
3. `src/sections/nw/konten-section.tsx` — full client section (~600 lines)

## Key Design Decisions

### API: POST /api/content
- Verify brand ownership via `getUserId(req)` + brand lookup.
- Charge credit BEFORE LLM/image call (so we don't waste AI calls if credit insufficient).
- Action keys: `konten.caption` (2), `konten.gambar` (4), `konten.video` (6), `konten.carousel` (5).
- Branch by type:
  - **caption**: `llmChat` with system prompt encoding brand tone + product + platform + angle + context hashtags. Output truncated to 1500 chars. Saved as `body`.
  - **gambar**: `generateImage` with platform-aware size map (TikTok=768x1344 portrait, IG=1024x1024 square, Twitter=1440x720 wide, etc.). Also generates a matching short caption via `llmChat`. Image saved as `assetUrl` (data URL), caption saved as `body`.
  - **video**: `llmJson` returning `{ script, scenes[{duration_sec, visual, voiceover, text_overlay}], hashtags[], hooks[] }`. Output normalized (defaults to empty arrays) and saved as JSON string in `body`.
  - **carousel**: `llmJson` returning `{ slides[{slide_num, headline, body, cta}], hashtags[] }`. Same normalization. Saved as JSON string in `body`.
- INSERT `db.content.create` with all fields.
- If `contextId` provided, INSERT `db.contextUsage.create({ usedFor: "konten.generate", referenceId: content.id })`.
- On any post-charge failure: `refundCredit` (passing `originalBalanceBefore: charge.balanceAfter` as the required-but-unused param).
- Response includes `{ content, balanceAfter }` so frontend can update store credit instantly.

### API: GET /api/content?brandId=X
- Returns 100 newest items with `productName` joined.
- **Excludes `assetUrl`** to keep response small (base64 PNG ~1.5MB per item × many items = bloated JSON).
- Frontend fetches `assetUrl` per-item via GET /api/content/[id] when user clicks "view".

### API: GET /api/content/[id]
- Returns single content with full body + assetUrl + product name.
- Verifies ownership via brand.userId.

### API: DELETE /api/content/[id]
- Hard delete (`db.content.delete`) — Content model has no soft-delete field.
- No credit refund on delete (per task spec).

### Frontend: KontenSection
- Layout: `grid grid-cols-1 lg:grid-cols-5` — left=col-span-2 (~40%), right=col-span-3 (~60%).
- **State**: type, productId, platform, angle, contextId, filter, viewing (preview content).
- **Queries** (TanStack):
  - `["products", brandId]` — for product Select.
  - `["contents", brandId]` — saved library list.
  - `["dashboard", brandId]` — re-used to extract konten recommendations (since /api/contexts endpoint was not allowed to be created). Filtered client-side to `source === "konten"`.
- **Mutations**:
  - generate (POST) — on success: toast, `setCredit(balanceAfter)`, invalidate contents+dashboard, set `viewing`.
  - delete (DELETE) — invalidate contents, clear viewing.
  - view (GET [id]) — set viewing with full content (including assetUrl).
- **Left panel (generate)**:
  - PageHeader with credit balance badge.
  - Tone of Voice: badge with current tone + "Ubah" link to Pengaturan section. If empty, inline 6-tone picker that PATCHes `/api/brands/[id]`.
  - Type selector: 4 cards from KONTEN_TYPES with cost badges, teal border on selected.
  - Product Select with "— Tanpa produk —" sentinel option.
  - Platform chips (5 platforms, toggle).
  - Angle input (optional).
  - Active context bar: only shown if konten recs exist. Teal-tinted panel with Select dropdown of available riset-based konten recs. Auto-fills angle + platform + contextId on pick.
  - Generate button: shows cost, disabled when insufficient credit. Link to credit top-up if insufficient.
- **Right panel (preview + library)**:
  - Preview card: shimmer-skeleton loading during generation; rich type-specific preview when result; empty state prompt otherwise.
  - Action buttons: "Simpan ke Library" (toast confirming auto-save), "Generate Lagi" (re-run), "Buat Variasi" (clears angle), "Pakai di Toko" (setSection("toko")).
  - Saved library grid with filter chips (Semua / Caption / Gambar / Video / Carousel). Each card: icon, type+platform badges, time-ago, excerpt, view/copy/delete actions.
- **Empty state**: friendly prompt explaining 4 content types and credit costs.
- All copy in Indonesian. Mobile responsive (panels stack on small screens).

## Visual Palette Used

- `bg-background`, `bg-card`, `border-border`, `text-ink`, `text-stone` (theme tokens).
- `bg-teal`, `bg-teal-50`, `bg-teal-100`, `text-teal`, `text-teal-600`, `text-teal-700` (primary accent).
- `bg-cream-100`, `bg-cream-200`, `bg-teal-50/50`, `bg-teal-100/60` (subtle backgrounds).
- `bg-emerald-50`, `text-emerald-700`, `border-emerald-200` (success state).
- `text-rose-600`, `hover:bg-rose-50` (delete/danger).

## Constraints Respected

- Only created files under `src/app/api/content/`.
- Only overwrote `src/sections/nw/konten-section.tsx`.
- Did NOT modify: page.tsx, lib/*, components/nw/*, other section files.
- Used `useAppStore` for activeBrand/user/setSection/setCredit/updateBrand.
- Used TanStack Query for server state.
- Used shadcn/ui: Button, Input, Badge, Card, Skeleton, Select (+ parts).
- Used Lucide icons throughout.
- All API requests use relative paths (no absolute URLs).

## What I Did NOT Do (per task constraints)

- Did not create `/api/contexts` endpoint (would have been ideal for fetching konten contexts directly). Worked around by re-using `/api/dashboard` recommendations filtered client-side.
- Did not modify other agents' files.

## Lint Status

See Task ID 5 entry in `/home/z/my-project/worklog.md` for the final lint pass result.
EOF
echo "agent-ctx record written"