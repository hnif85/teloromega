# Task 17-A — Help & Support Center

**Agent**: full-stack-developer (Help & Support)
**Task ID**: 17-A
**Date**: Build Bantuan section — FAQ accordion, keyboard shortcuts, contact options, quick action cards.

## Files Touched

### Created
- `src/sections/nw/bantuan-section.tsx` (~380 lines) — Full Bantuan section component.
- `agent-ctx/17-A-help-support.md` — This work record.

### Edited
- `src/lib/constants.ts`:
  - Added `"bantuan"` to `SectionKey` type union (after `"pengaturan"`).
  - Added `{ key: "bantuan", label: "Bantuan", icon: "❓" }` to `SECONDARY_NAV` (after Pengaturan).
- `src/app/page.tsx`:
  - Imported `BantuanSection` from `@/sections/nw/bantuan-section`.
  - Added render branch `{section === "bantuan" && <BantuanSection />}` after pengaturan.

## Component Architecture

### `bantuan-section.tsx` Structure

1. **PageHeader** — title "Bantuan", icon "❓", subtitle "Pusat bantuan, FAQ, & kontak support". Right action: teal outline Badge "Pusat Bantuan" with HelpCircle icon.

2. **Quick Actions Grid** — `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` of 4 QuickActionCard buttons:
   - 🎓 Mulai Tour (teal accent) → calls `startTour()` from onboarding-tour
   - 📖 Panduan Cepat (orange accent) → scrolls to `#faq`
   - ⌨️ Keyboard Shortcuts (violet accent) → scrolls to `#shortcuts`
   - 💬 Hubungi Support (emerald accent) → scrolls to `#contact`
   - Each card: hover border-teal/40 + shadow-sm + ArrowRight translate-x animation.

3. **FAQ Section** — SectionCard `id="faq"`:
   - Accordion `type="multiple"` with 10 questions (numbered teal badges 1–10)
   - All answers in Indonesian, reference established app features
   - Footer info bar: "Tidak menemukan jawaban? Hubungi support" → scrolls to `#contact`

4. **Keyboard Shortcuts Section** — SectionCard `id="shortcuts"`:
   - Grid of 5 ShortcutCards: ⌘K, Esc, ←/→, Tab, Enter
   - Each card: kbd-styled keys + label + description
   - Teal-tinted tip box explaining ⌘K Command Palette

5. **Contact Section** — SectionCard `id="contact"`:
   - 3 ContactRow links in grid:
     - 📧 Email → `mailto:support@nextwhiz.id` (teal accent)
     - 💬 WhatsApp → `https://wa.me/6281234567890` (emerald accent, external)
     - 📚 Dokumentasi → `https://docs.nextwhiz.id` (orange accent, external)
   - Separator + operational hours info

6. **About Section** — gradient card (cream → card):
   - NW logo + "The Next Whiz" + "v0.1.1 · MVP" badge
   - Tech stack: Next.js 16, TypeScript, Prisma, z-ai-web-dev-sdk
   - "Dibuat untuk UMKM Indonesia" with Heart icon

7. **Bottom CTA** — dashed teal-border card with 🎯 + "Mulai Tour" button.

## Decisions

### Navigation Placement
- Bantuan is a `SECONDARY_NAV` item (like Credit/Pengaturan), NOT a primary `NAV_ITEM`. Spec-compliant.
- Sidebar + Topbar MobileNav auto-render `SECONDARY_NAV` arrays, so adding "bantuan" to constants.ts is enough — no other component edits needed for nav visibility.

### "Hubungi Support" Quick Action
- Scrolls to `#contact` section (consistent with other quick actions).
- Contact section shows all 3 channels (email/wa/docs), so scroll-to-section gives users the full picture without duplicating content in a dialog.

### FAQ Accordion Type
- Uses `type="multiple"` so users can open multiple FAQs at once (better for comparing answers).
- State tracked via `openItems` for potential future use (e.g., "still need help?" footer).

### Shortcut Key Styling
- Rendered with `<kbd>` styled elements (min-w-28px h-7 px-2 font-mono bold) — matches conventional keyboard shortcut visual language.

### About Section Visual
- Uses gradient bg (`from-cream-100/60 to-card`) for visual distinction from other SectionCards.

### Bottom CTA
- Repeats the "Mulai Tour" call-to-action — users who scrolled through all help content and still need guidance get a final prominent tour trigger.

## Reusable Patterns for Downstream Agents

### Section ID + scroll-mt-4 for Quick-Action Anchoring
```tsx
<div id="faq" className="scroll-mt-4">
  <SectionCard>...</SectionCard>
</div>
```
Used for `#faq`, `#shortcuts`, `#contact`. `scroll-mt-4` prevents the sticky topbar from overlapping the section title.

### Helper: `scrollToId`
```tsx
function scrollToId(id: string) {
  if (typeof document === "undefined") return;
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}
```

### QuickActionCard Pattern
Button-based card with hover border accent + ArrowRight translate animation. Reusable for any grid of action shortcuts.

### ContactRow Pattern
Anchor-based row with icon box + label uppercase + value + ExternalLink icon for external links. `target="_blank" rel="noopener noreferrer"` for external.

### Kbd Styling
```tsx
<kbd className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-md bg-card border border-border shadow-sm font-mono text-xs font-bold text-ink">
  {key}
</kbd>
```

## Integration Points

### Imports
- `startTour` from `@/components/nw/onboarding-tour` — programmatic tour trigger.
- `PageHeader, SectionCard` from `@/components/nw/primitives` — established section primitives.
- shadcn/ui: Accordion, Button, Badge, Separator.
- Lucide: HelpCircle, BookOpen, Keyboard, Mail, MessageCircle, ExternalLink, Info, Sparkles, GraduationCap, ArrowRight, Heart.

### No API Needed
- Bantuan is purely client-side (static FAQ data + scroll + external links + startTour trigger). No `/api/bantuan` route required.

### No Prisma Changes
- No new model fields. Bantuan doesn't persist any user data.

## QA

- **Lint**: 0 errors, 0 warnings (`bun run lint`).
- **TypeScript**: 0 errors (`bunx tsc --noEmit`, excluding skills/ and examples/).
- **Dev server**: Running on port 3000, HTTP 200 for `/`.

## Scope Adherence

Only edited `constants.ts` (SectionKey/SECONDARY_NAV) and `page.tsx` (route) per spec — no other lib/* or section files touched. No API routes created. No Prisma schema changes.
