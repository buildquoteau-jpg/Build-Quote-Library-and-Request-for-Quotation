# MFP Cleanup — Handover for Opus 4.8

## Context

BuildQuote runs two apps on the same Supabase project (`oxvhmulxuvlfjyjzleki`):

- **buildquote.com.au** — builder-facing RFQ app (`Build-Quote-v6/buildquote/`)
- **search.buildquote.com.au** — the "Manufacturer Portal" (MFP) (`manufacturer-portal/manufacturer-portal-main/`)

The MFP was originally a supplier admin portal. Customer-facing product search features were added over time (`/manufacturers` page). Those features have now been **fully ported** to `buildquote.com.au/library`. The Half 2 routes are ready to be deleted in this session.

---

## Repo

**Local path:** `C:\Users\Melia Borg\Desktop\Repositries\manufacturer-portal\manufacturer-portal-main\`
**GitHub remote:** `https://github.com/buildquoteau-jpg/manufacturer-portal.git`
**Branch:** `main` — commit and push directly to main when done.
**Dev server:** `npm run dev` → http://localhost:3001 (port 3000 usually taken by buildquote)

---

## MFP Purpose — Two Distinct Halves

### Half 1 — Supplier/Admin Portal (KEEP — do not touch)
| Route | Purpose |
|---|---|
| `/supplier/login` | Supplier auth |
| `/supplier/[slug]` | Supplier dashboard — Profile, Products (widgets), Trade Desk, Enquiries, Account |
| `/supplier/[slug]/TradeDeskTab` | Staff product search, quote prep, review link sender |
| `/admin` | BuildQuote admin — create suppliers, assign widgets |
| `/widget/[token]` | Public embed widget (shown on supplier websites) |
| `/supplierdirectory` | Public supplier directory |
| `/supplierdirectory/[slug]` | Supplier detail page |
| `/supplierdirectory/[slug]/[mfr-slug]` | Manufacturer products for that supplier |
| `/supplier-review/[token]` | Customer review page (token URL sent by Trade Desk) |
| `/auth/reset-password` | Password reset handler |
| `/legal` | Legal/terms |

### Half 2 — Customer-Facing Product Search (FULLY PORTED — DELETE NOW)

All features from this half have been ported to `buildquote.com.au/library`. Delete everything below.

| Route / File | Action | Notes |
|---|---|---|
| `app/manufacturers/page.tsx` | **DELETE** | Index page — ported to buildquote `/library` |
| `app/manufacturers/layout.tsx` | **DELETE** | Layout wrapper |
| `app/manufacturers/ManufacturersClient.tsx` | **DELETE** | Main client component — ported |
| `app/manufacturers/ManufacturerPageClient.tsx` | **DELETE** | Per-mfr client — ported |
| `app/manufacturers/[slug]/page.tsx` | **DELETE** | Per-manufacturer page |
| `app/api/search/ask/route.ts` | **DELETE** | AI Q&A — ported to buildquote `/api/library/ask` (not yet built but MFP version no longer needed) |
| `app/api/search/parse-list/route.ts` | **DELETE** | AI list parse — ported to buildquote `/api/library/parse-list` ✅ |
| `app/api/search/extract-from-image/route.ts` | **DELETE** | AI OCR — ported to buildquote `/api/library/extract-from-image` ✅ |
| `app/api/create-draft/route.ts` | **DELETE** | Proxy to buildquote — only used by /manufacturers |
| `app/api/add-to-draft/route.ts` | **DELETE** | Proxy to buildquote — only used by /manufacturers |
| `lib/data/getManufacturers.ts` | **DELETE** | Data layer for /manufacturers index — no longer needed |
| `lib/data/getManufacturerData.ts` | **DELETE** | Data layer for /manufacturers/[slug] — no longer needed |

After deleting the `app/manufacturers/` directory entirely, also update:
- `app/page.tsx` — currently `redirect('/manufacturers')` → change to `redirect('https://buildquote.com.au/library')`
- `app/components/GlobalNav.tsx` — item 3 currently `{ label: '3  Search Products', href: '/manufacturers', external: false }` → change to `{ label: '3  Product Library', href: 'https://buildquote.com.au/library', external: true }`

### Stale / Dead Routes (DELETE)
| Route | Verdict | Reason |
|---|---|---|
| `app/browse/` | **DELETE** | Old customer browse page, superseded by /manufacturers then /library |
| `app/showroom/` | **DELETE** | Demo/test page for widgets, not used in production |
| `app/embed/[slug]/` | **Investigate first** | Old embed route — check if distinct from `/widget/[token]`. If dead, delete. |

---

## Cleanup Tasks — In Order

### 1. Delete Half 2 routes
Delete these entire directories and files:
```
app/manufacturers/          ← entire directory
app/api/search/             ← entire directory (ask, parse-list, extract-from-image)
app/api/create-draft/       ← entire directory
app/api/add-to-draft/       ← entire directory
lib/data/getManufacturers.ts
lib/data/getManufacturerData.ts
```

Grep for any remaining imports of these files before deleting:
```bash
grep -r "getManufacturers\|getManufacturerData\|ManufacturersClient\|ManufacturerPageClient\|add-to-draft\|create-draft" --include="*.ts" --include="*.tsx" .
```
Fix any broken imports found.

### 2. Delete stale routes
```
app/browse/
app/showroom/
```
After deleting `/showroom`, remove the `pathname.startsWith('/showroom')` exclusion from `app/components/GlobalNav.tsx`.

### 3. Investigate `/embed/[slug]`
Read `app/embed/[slug]/page.tsx` and `EmbedClient.tsx`. If this is just an old alias for `/widget/[token]` with no active usage, delete it. If suppliers still use it, leave it and document it in CLAUDE.md.

### 4. Update `app/page.tsx` root redirect
```ts
// Before:
redirect('/manufacturers')

// After:
redirect('https://buildquote.com.au/library')
```

### 5. Update GlobalNav item 3
File: `app/components/GlobalNav.tsx`
```ts
// Before:
{ label: '3  Search Products', href: '/manufacturers', external: false },

// After:
{ label: '3  Product Library', href: 'https://buildquote.com.au/library', external: true },
```

### 6. Rewrite CLAUDE.md
The MFP CLAUDE.md is stale — describes a narrow supplier portal and doesn't reflect the customer-facing work or its removal. Rewrite it to accurately describe:
- The MFP's sole purpose now: supplier/admin portal
- Full route table for Half 1 (keep)
- Note that Half 2 was deleted and when
- Env vars (RESEND_API_KEY warning)
- Supabase project ref and key tables
- Workflow rules: commit to main, verify on localhost:3001
- Link to STATE.md for session history

### 7. TypeScript check + build
```bash
npx tsc --noEmit
npm run build
```
Fix any errors before pushing.

---

## What NOT to Touch

- All supplier portal routes (`/supplier/*`, `/widget/*`, `/supplierdirectory/*`, `/admin`, `/supplier-review/*`)
- `supabase/schema.sql` — don't modify
- `lib/data/getWidgetData.ts` — keep (used by widget)
- `lib/data/getPublicSuppliers.ts` — keep (used by supplierdirectory)
- Any `lib/data/` files NOT listed for deletion above

---

## Key Files Reference

```
app/manufacturers/             ← DELETE entire directory
app/api/search/                ← DELETE entire directory
app/api/create-draft/          ← DELETE entire directory
app/api/add-to-draft/          ← DELETE entire directory
lib/data/getManufacturers.ts   ← DELETE
lib/data/getManufacturerData.ts ← DELETE
app/browse/                    ← DELETE entire directory
app/showroom/                  ← DELETE entire directory
app/embed/[slug]/              ← INVESTIGATE then delete if dead
app/page.tsx                   ← UPDATE redirect target
app/components/GlobalNav.tsx   ← UPDATE item 3 href + external flag
CLAUDE.md                      ← REWRITE
```

---

## Env Vars (for reference)
```
NEXT_PUBLIC_SUPABASE_URL       = https://oxvhmulxuvlfjyjzleki.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY  = eyJ...
SUPABASE_SERVICE_ROLE_KEY      = eyJ...
NEXT_PUBLIC_BUILDQUOTE_URL     = https://buildquote.com.au (prod) / http://localhost:3000 (dev)
RESEND_API_KEY                 ⚠️ must be added to Vercel env vars — not yet set in prod
RESEND_FROM_EMAIL              = rfq@buildquote.com.au
ADMIN_EMAIL                    = (optional — bypasses supplier auth for admin)
```

---

## Commit Convention
```
feat:    new feature
fix:     bug fix
chore:   cleanup, docs, config (no functional change)
refactor: restructure without behaviour change
```

Commit after each logical task (e.g. one commit per major deletion, one for nav updates, one for CLAUDE.md). Push to `origin main` when all tasks are done.

---

## What Was Ported (for confidence check)

Before deleting, confirm these exist on buildquote.com.au:

| MFP feature | Ported to buildquote | File |
|---|---|---|
| Product search + category filter | ✅ | `components/library/LibraryPageClient.tsx` |
| Example chips | ✅ | `components/library/LibraryPageClient.tsx` |
| Quick List panel (type/paste) | ✅ | `components/library/LibraryPageClient.tsx` |
| Upload photo → AI OCR | ✅ | `app/api/library/extract-from-image/route.ts` |
| Speak list (voice) | ✅ | `components/library/LibraryPageClient.tsx` |
| Read list → AI parse | ✅ | `app/api/library/parse-list/route.ts` |
| Shopping list drawer | ✅ | `components/library/ShoppingListDrawerUI.tsx` |
| Convert to RFQ | ✅ | `components/library/ShoppingListDrawerUI.tsx` |
| System card tiles | ✅ | `components/library/SystemCardTileUI.tsx` |
| Per-system detail page | ✅ | `app/library/[slug]/page.tsx` |
| AI Q&A (streaming) | ❌ Not yet ported | Low priority — delete MFP version anyway |
| System detail modal (inline) | ❌ Not yet ported | /library navigates to new page instead |
