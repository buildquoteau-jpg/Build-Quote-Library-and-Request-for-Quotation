# BuildQuote — Session State
_Last updated: 2026-05-26 (session 9) — merged to `main`_

## Branch
`main` — all session 9 work committed and merged.
**Next session:** ui/ux tweaks, end-to-end testing of full flow.

---

## Styling rule — light vs dark (applies across all three repos)

| Surface | Theme | Rationale |
|---------|-------|-----------|
| buildquote.com.au (all pages) | **Light** | Customer-facing, sun-readable |
| MFP `/supplierdirectory/*` | **Light** | Customer-facing directory |
| MFP `/manufacturers/*` | **Light** | Customer-facing product directory |
| MFP `/widget/*` | **Light** | Customer-facing embed |
| MFP `/supplier/[slug]/*` | **Dark** | Supplier admin portal |
| MFP `/admin/*` | **Dark** | Admin only |
| Data Studio (all pages) | **Dark** | Admin/manufacturer tool |
| buildquote `/dashboard` | **Light** | Builder-facing |

---

## ⚠️ Pending migrations — run in Supabase before testing

```
buildquote/supabase/migrations/20260520_my_quotes.sql
```
Required for My Quotes tab, draft linking, and RFQ status tracking.

Also run on Supabase (MFP side):
```
manufacturer-portal/supabase/migrations/20260524_trade_desk_search.sql
```
Creates `customer_review_sessions` and `customer_review_session_items` tables
with RLS. Required for Trade Desk review links and customer review page.

---

## What's built and working ✅

### Landing page (`/`)
- Main CTA "Send a Quote Request" → `/rfq` (was broken, linked to `/coming-soon`)
- "Builder login →" and "Create free account" secondary links below the CTA
- Scrolling testimonials, five-star rating strip, built-for-builders copy

### GlobalNav
- Hamburger nav includes: Home · Find Products & Suppliers · Send a Quote ·
  Builder Portal · Supplier Portal · Privacy Policy · Terms of Use
- Hidden on `/` and `/coming-soon` pages

### Builder Auth
- `/register` — 2-step form (details + password)
- `/login` — email + password; passkey/FaceID registered via `/api/auth/passkey/*`
- Password visibility toggle on login page
- Auth via `proxy.ts` (Next.js 16 replacement for middleware.ts)
  - Demo password gate preserves full `pathname + search` (incl. `?draft=&supplierName=`) through redirect
- Session via `lib/supabase-browser.ts` + `lib/supabase-server.ts`

### Dashboard (`/dashboard`)
5 tabs: Current Jobs · Preferred Suppliers · Favourite Products · My Profile · My Quotes

**Current Jobs** — add/edit/delete jobs, Google Places address, build type, PM details,
photo upload, "Send RFQ →" per card, RFQ count chip.

**Preferred Suppliers** — Google Places search, manual add, Clearbit logos,
"Send RFQ →" per card.

**Favourite Products** — add/edit/delete from manufacturer portal.

**My Profile** — edit details, logo upload, change password, register passkey.

**My Quotes** — Drafts (resume/discard) + Sent Quotes (status badges, Mark Won/Declined,
Undo).

### RFQ Flow (`/rfq`) — steps 1 → 2 → 4 → 5 (step 3 skipped)

**Step 1 — UploadScreen:**
- Photo/PDF/spreadsheet/Word/text → AI parse → line items
- Login banner (when not logged in): benefit-led headline "⚡ Save time on every quote",
  three value-prop checkmarks, "Create account" + "Sign in →" CTAs
- Login banner (when logged in): "G'day [Name] — your details will auto-fill" + Dashboard link

**Step 2 — ManualEntryScreen:** three entry options (Upload a list inline, Browse
manufacturer portal, Add manually). Mobile cards + desktop table. Low-confidence +
duplicate rows in amber. Dismissible qty tip. Same-tab navigation to MFP.

**Step 4 — SendScreen:** Builder auto-fill (logged in), supplier typeahead (personal +
platform), project details, delivery/pickup, Google Places address, site access notes,
date required, preferred contact, confirmation modal with terms.
Supplier field starts blank — no sandbox auto-fill. Sandbox entry still available in
typeahead if searched manually.

**Step 5 — SuccessScreen.**

### RFQ Entry Points
1. `/rfq` — fresh start
2. `/rfq?job=<uuid>` — prefills project reference, site address, PM name/phone
3. `/rfq?supplier=<uuid>` — prefills supplier name, email, account number (from builder_suppliers)
4. `/rfq?draft=<uuid>` — resumes existing draft at step 2
5. `/rfq?draft=<uuid>&supplierName=<name>` — returns from manufacturer portal with supplier pre-filled

### Draft System
- Draft ID in `?draft=` URL param. New URL = clean session.
- `lib/rfqDraft.ts` → `getOrCreateDraft(builderId?)`
- Items persisted to `rfq_draft_items` on each change
- Supplier + project reference saved to `rfq_drafts` on proceed to SendScreen
- On send: draft archived (`status = 'sent'`)

### Customer-facing product search

**`/products` page** — alternate entry point for product search:
- Fuzzy search across all systems (loaded lazily on first 2-char keystroke)
- Product result cards — select one to see stocked suppliers
- 3-step supplier lookup: `embed_widget_systems → embed_widgets → suppliers`
- Supplier cards with "Request a quote from this supplier" → navigates to `/products/rfq`
- Example chips to prompt search

**`/products/rfq` page** — inline quote request form:
- Pre-filled product + supplier info from URL params
- Collects name, phone/email, suburb, date, delivery, qty/measurements, notes
- Submits to `rfq_enquiries` in Supabase (anon insert)
- Success state + "Search more products" / "Create a full RFQ →" options

---

## What still needs doing ❌

### Before testing
- Run `supabase/migrations/20260520_my_quotes.sql` in Supabase dashboard
- Run `manufacturer-portal/supabase/migrations/20260524_trade_desk_search.sql`
- Create `builder-logos` bucket in Supabase Storage (policies exist, bucket missing)
- Add `RESEND_API_KEY` and `RESEND_FROM_EMAIL` to Vercel env vars for manufacturer-portal

### Needs end-to-end testing
- All RFQ entry points (direct, job card, supplier card, draft resume)
- ManualEntryScreen: upload merges, same-tab MFP navigation, return to quote
- SendScreen: auto-fill, supplier typeahead, delivery, PM details, preferred contact
- My Quotes: draft resume/discard, sent badges, mark won/declined, undo
- PDF/CSV/email include all fields (PM, site access, preferred contact)
- WebAuthn passkey flow
- `/products` search → supplier lookup → quote form → `rfq_enquiries` insert
- Builder login banner on UploadScreen: both logged-in and logged-out states

### Known gaps
- Google Maps API key not restricted to production domains yet
- `pmName`, `pmPhone`, `siteAccessNotes`, `preferredContact` stored in email/PDF/CSV only
  — not saved to `rfq_requests` columns (add if detail view needed later)
- Passkey flow not tested end-to-end
- `/products` page and MFP `/manufacturers` search are parallel entry points for the same
  flow — consider whether `/products` should redirect to MFP long-term
- `suppliers` table `email` column now included in ManufacturersClient query and passed
  via `?supplierEmail=` URL param — auto-fills supplier email on SendScreen when returning from MFP.
- `NEXT_PUBLIC_BUILDQUOTE_URL` must be set to `https://buildquote.com.au` on Vercel
  manufacturer-portal project (local `.env.local` uses `http://localhost:3000`)

---

## Next session: Session 8 — UI/UX tweaks

### Branch setup
```
git checkout main
git checkout -b ui-ux-tweaks
git commit --allow-empty -m "chore: anchor — session 8 start, ui-ux-tweaks"
```

### Goals (to be scoped at session start)
- UI/UX review and polish pass across both apps
- Assess and improve mobile responsiveness
- Review builder login/register flow end-to-end for friction
- Any visual consistency fixes between buildquote and MFP public pages
- Loading states and error states review

---

## Supabase Project
**Project ref:** `oxvhmulxuvlfjyjzleki`
**Full schema:** `buildquote/supabase/schema.sql`

### Key tables
```
builders              — id, email, builder_name, company_name, abn, office_phone,
                        mobile_phone, logo_url, created_at
builder_jobs          — id, builder_id, project_reference, project_address,
                        build_type, pm_name, pm_mobile, site_access_notes, created_at
builder_suppliers     — id, builder_id, supplier_name, supplier_email,
                        account_number, phone, website, rep_name, rep_mobile,
                        credit_terms, notes, created_at
builder_favourite_products — id, builder_id, product_id, product_name,
                        manufacturer, notes, created_at
rfq_drafts            — id, builder_id, supplier_name, supplier_email,
                        project_reference, status, created_at, updated_at
rfq_draft_items       — id, draft_id, component_id, manufacturer, system,
                        sku, name, description, uom, qty, added_at
rfq_requests          — id, builder_id, builder_name, builder_email, project_name,
                        project_reference, delivery_location, notes, supplier_name,
                        supplier_email, rfq_id_short, draft_id, status,
                        send_to_supplier, terms_confirmed, terms_confirmed_at, created_at
rfq_items             — id, rfq_id, item_name, quantity, unit, specification,
                        notes (=sku), source, sort_order
suppliers             — platform directory (read-only from RFQ typeahead)
rfq_enquiries         — id, supplier_name, system_name, product_code, name, email,
                        phone, message, created_at (anon insert, used by /products flow)
```

---

## Env vars
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
OPENAI_API_KEY                 ← parse/route.ts — gpt-4o for OCR/parsing (NOT Anthropic)
RESEND_API_KEY
RESEND_FROM_EMAIL              (default: rfq@buildquote.com.au)
NEXT_PUBLIC_APP_URL            ← must be https://buildquote.com.au in prod, http://localhost:3000 in dev
                                  (passkey routes derive hostname from this — do NOT set to the var name itself)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
NEXT_PUBLIC_MFP_URL            = https://search.buildquote.com.au
VERCEL_OIDC_TOKEN
```

⚠️ ANTHROPIC_API_KEY is NOT used — parse route was migrated to OpenAI (gpt-4o). Remove from Vercel if present to avoid confusion.

---

## Key files
```
buildquote/app/page.tsx                        — Landing page (CTA → /rfq, login links)
buildquote/app/rfq/page.tsx                    — RFQ wizard state machine
buildquote/app/products/page.tsx               — Customer product search (alt entry)
buildquote/app/products/rfq/page.tsx           — Quote request form for product search
buildquote/components/GlobalNav.tsx            — Hamburger nav
buildquote/components/screens/UploadScreen.tsx — Step 1 (login banner redesigned)
buildquote/components/screens/ManualEntryScreen.tsx — Step 2, MFP navigation
buildquote/components/screens/SendScreen.tsx   — Step 4, 750+ lines
buildquote/components/screens/SuccessScreen.tsx — Step 5
buildquote/components/builder/QuotesTab.tsx    — My Quotes tab
buildquote/components/builder/JobsTab.tsx      — Current Jobs tab
buildquote/app/dashboard/DashboardClient.tsx   — 5-tab shell
buildquote/app/login/page.tsx                  — Builder login
buildquote/app/register/page.tsx               — Builder register
buildquote/app/api/send/route.ts               — Email/PDF/CSV send
buildquote/app/api/quotes/[id]/route.ts        — PATCH won/declined status
buildquote/app/api/save-draft-items/route.ts   — Save items from MFP
buildquote/app/api/get-draft-items/route.ts    — Read draft items
buildquote/lib/rfqDraft.ts                     — getOrCreateDraft()
buildquote/lib/types.ts                        — LineItem, RFQPayload, etc.
buildquote/supabase/schema.sql                 — Full schema reference
buildquote/supabase/migrations/20260520_my_quotes.sql — ⚠️ MUST RUN
```

---

## Session 7 commits (trade-desk-search → main)
- `4aececc` — feat: Find Products & Suppliers — customer-facing product search
- `3af911f` — feat: improve builder login visibility and fix landing page CTA
- (merge) — merge: trade-desk-search → main (full session summary in merge commit)

## Session 8–9 commits (main)
- `491f80f` — feat: add demo password gate to protect platform from public access
- `9139d5b` — feat: prefill supplier from manufacturer portal URL params (`?supplierName=`)
- `646eb98` — fix: preserve full URL params through password gate redirect (proxy.ts)
- `5c1f3e2` — fix: remove sandbox auto-fill on SendScreen
