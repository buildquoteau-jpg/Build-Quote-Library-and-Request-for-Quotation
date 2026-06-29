# MFP Cleanup — Handover for Opus 4.8

## Context

BuildQuote runs two apps on the same Supabase project (`oxvhmulxuvlfjyjzleki`):

- **buildquote.com.au** — builder-facing RFQ app (`Build-Quote-v6/buildquote/`)
- **search.buildquote.com.au** — the "Manufacturer Portal" (MFP) (`manufacturer-portal/manufacturer-portal-main/`)

The MFP was originally a supplier admin portal. Over time, customer-facing product search features were bolted on (`/manufacturers` page). Those features are now being migrated to `buildquote.com.au/library`. This cleanup session is the first step: tidy the MFP so it clearly does one job, remove stale routes, update navigation, and update the CLAUDE.md to reflect reality.

**The `/manufacturers` feature is NOT being deleted yet** — it stays live until the full port to buildquote.com.au/library is complete. What we're cleaning up is dead routes, stale nav links, and the CLAUDE.md.

---

## Repo

**Local path:** `C:\Users\Melia Borg\Desktop\Repositries\manufacturer-portal\manufacturer-portal-main\`
**GitHub remote:** `https://github.com/buildquoteau-jpg/manufacturer-portal.git`
**Branch:** `main` — commit and push directly to main when done.
**Dev server:** `npm run dev` → http://localhost:3001 (port 3000 usually taken by buildquote)

---

## MFP Purpose — Two Distinct Halves

### Half 1 — Supplier/Admin Portal (KEEP — core purpose)
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

### Half 2 — Customer-Facing Product Search (MIGRATING to buildquote.com.au/library)
| Route | Status |
|---|---|
| `/manufacturers` | Being migrated to buildquote.com.au/library — keep live for now |
| `/manufacturers/[slug]` | Per-manufacturer product page — keep live for now |
| `/api/search/ask` | AI Q&A — will move to buildquote as `/api/library/ask` |
| `/api/search/parse-list` | AI list parse — will move to `/api/library/parse-list` |
| `/api/search/extract-from-image` | AI OCR — will move to `/api/library/extract-from-image` |
| `/api/create-draft` | Proxy → buildquote `/api/create-draft` — used by /manufacturers only |
| `/api/add-to-draft` | Proxy → buildquote `/api/save-draft-items` — used by /manufacturers only |

### Stale / Dead Routes (DELETE or REDIRECT)
| Route | Verdict | Reason |
|---|---|---|
| `/browse` | **Delete** | Old customer browse page, entirely superseded by `/manufacturers` then by `/library`. Client component, no server data, no inbound links. |
| `/showroom` | **Delete** | Demo/test page for widgets. No real purpose in production. Hidden from GlobalNav already. |
| `/embed/[slug]` | **Investigate** | Old embed route — check if any active suppliers use it vs `/widget/[token]`. May be dead. |

---

## Cleanup Tasks

### 1. Delete `/browse`
Delete the entire directory:
```
app/browse/page.tsx
```
If anything imports or links to `/browse`, update it. Do a grep for `"/browse"` across the repo first.

### 2. Delete `/showroom`
Delete the entire directory:
```
app/showroom/page.tsx
app/showroom/layout.tsx
app/showroom/ShowroomClient.tsx
```
The GlobalNav already excludes `/showroom` from rendering (`pathname.startsWith('/showroom')`). Remove that exclusion from GlobalNav after deleting the route.

### 3. Investigate `/embed/[slug]`
Read `app/embed/[slug]/page.tsx` and `EmbedClient.tsx`. Check if this route is distinct from `/widget/[token]`. If it's dead (no active supplier tokens use `/embed/`), delete the directory. If it's still in use, leave it and document it.

### 4. Update GlobalNav — fix item "3 Search Products"
File: `app/components/GlobalNav.tsx`

Current:
```ts
{ label: '3  Search Products', href: '/manufacturers', external: false },
```

Change to point to the new buildquote library (external):
```ts
{ label: '3  Product Library', href: 'https://buildquote.com.au/library', external: true },
```

This means when the MFP /manufacturers feature is eventually removed, the nav is already pointing the right way.

### 5. Update root redirect (`app/page.tsx`)
Current: redirects to `/manufacturers`
```ts
redirect('/manufacturers')
```

Once the product search is migrated to buildquote, `/manufacturers` will be removed. For now, leave the redirect as-is but add a code comment:
```ts
// TODO: once /manufacturers is fully migrated to buildquote.com.au/library,
// change this redirect to: redirect('https://buildquote.com.au/library')
redirect('/manufacturers')
```

### 6. Rewrite CLAUDE.md
The current CLAUDE.md (`app/../CLAUDE.md`) describes a narrow supplier portal scope and is missing all the customer-facing work added in sessions 7–9. Rewrite it to accurately describe both halves, the full route map, the cleanup status, and what's being migrated. Use the STATE.md as the source of truth for what's been built.

Key things the new CLAUDE.md must include:
- Both halves clearly labelled (supplier portal vs customer-facing search)
- The full route table above
- Which routes are being migrated/deleted and why
- Env vars (including the `RESEND_API_KEY` warning)
- Supabase project ref and key tables
- Link to STATE.md for detailed session history
- Workflow rules: commit to main, verify on localhost:3001

### 7. Verify no broken imports after deletions
After deleting `/browse` and `/showroom`, run:
```
npx tsc --noEmit
```
Fix any import errors. Then run `npm run build` to confirm no build errors.

---

## What NOT to Touch

- `/manufacturers` and `/manufacturers/[slug]` — still live, not deleted yet
- `/api/search/*` — still used by `/manufacturers`
- `/api/create-draft` and `/api/add-to-draft` — still used by `/manufacturers` shopping list
- All supplier portal routes (`/supplier/*`, `/widget/*`, `/supplierdirectory/*`, `/admin`, `/supplier-review/*`)
- `supabase/schema.sql` — don't modify
- `lib/data/*` — don't modify

---

## Key Files Reference

```
app/components/GlobalNav.tsx           ← UPDATE (item 3 redirect)
app/page.tsx                           ← ADD TODO comment
app/browse/page.tsx                    ← DELETE entire directory
app/showroom/page.tsx                  ← DELETE entire directory
app/showroom/layout.tsx                ← DELETE
app/showroom/ShowroomClient.tsx        ← DELETE
app/embed/[slug]/                      ← INVESTIGATE then delete if dead
CLAUDE.md                              ← REWRITE
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

Commit after each logical task. Push to `origin main` when all tasks are done.

---

## What Comes Next (not in this session)

Once the full product search feature is ported to `buildquote.com.au/library` (AI search bar, Quick List panel, Upload photo, Speak list, Read list, voice input, system modal), then in a future session:
- Delete `/manufacturers` and `/manufacturers/[slug]`
- Delete `/api/create-draft` and `/api/add-to-draft` (MFP proxy routes)
- Delete `/api/search/ask`, `/api/search/parse-list`, `/api/search/extract-from-image`
- Update `app/page.tsx` root redirect → `https://buildquote.com.au/library`
- Update GlobalNav item 3 to remove the `/manufacturers` internal fallback

That future session is tracked in `Build-Quote-v6/CLAUDE.md` under "Known Gaps / Next Work".
