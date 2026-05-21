# BuildQuote — Session State
_Last updated: 2026-05-20 (session 3) — builders-login branch_

## Branch
`builders-login` — all work committed. Ready to merge to main after end-to-end test pass.

---

## ⚠️ Critical: Run SQL migration before testing My Quotes

The My Quotes tab, draft linking, and RFQ status tracking require schema changes
that must be applied manually in the Supabase dashboard:

```
buildquote/supabase/migrations/20260520_my_quotes.sql
```

Go to: Supabase dashboard → SQL Editor → paste and run that file.
Until this is done, the My Quotes tab will be empty and draft/RFQ linking won't work.

---

## What's built and working ✅

### Builder Auth
- `/register` — 2-step form (details + password), server-side via `/api/auth/register`
- `/login` — email + password; passkey/FaceID registered via `/api/auth/passkey/*`
- Auth middleware → `proxy.ts` (Next.js 16 replacement for middleware.ts)
- Session via `lib/supabase-browser.ts` (client) and `lib/supabase-server.ts` (SSR)

### Dashboard (`/dashboard`)
5 tabs total:

**1. Current Jobs**
- Add/edit/delete jobs
- Google Places autocomplete for address, manual fallback
- Build type, PM name + mobile, site notes, photo upload (`job-images` bucket)
- "Send RFQ →" button per card → `/rfq?job=<uuid>`
- RFQ count chip per card (counts `rfq_requests` by `project_reference`) — click → My Quotes tab

**2. Preferred Suppliers**
- Find on Map (Google Places Autocomplete, centred SW WA)
- Add manually: RFQ email, phone + website (auto-filled from Maps), account number, credit/upfront, rep name/mobile, notes
- Cards show Clearbit logo watermark
- "Send RFQ →" button per card → `/rfq?supplier=<uuid>`

**3. Favourite Products**
- Add/edit/delete products from manufacturer portal

**4. My Profile**
- Edit details, logo upload, change password, register passkey
- Save redirects to Current Jobs tab

**5. My Quotes** ← new in session 2
- **Drafts section:** resume link (`/rfq?draft=<id>`), item count, supplier/project if known, Discard button
- **Sent Quotes section:** status badge (Sent/Won/Declined), supplier, project ref, RFQ ID, sent date
- Mark Won / Mark Declined → `PATCH /api/quotes/[id]`
- Undo button to revert Won/Declined → Sent
- Empty state with "+ New RFQ" CTA

### RFQ Flow (`/rfq`) — 5 steps (step 3 skipped in active flow)

**Step 1 — Upload Screen**
- Photo, PDF, spreadsheet, Word doc, or text file → AI parse → line items
- Skip to manual entry

**Step 2 — Enter Items Screen (ManualEntryScreen)**
- Three options: Upload a list (inline, no navigation), Browse manufacturer portal, Add manually
- Upload a list: hidden file input, inline parse spinner with rotating messages
- Add items manually: focuses + scrolls to the new row's Product Name field (auto-focus)
- Parse/upload merges into existing list (no overwrite on second upload)
- Review/edit: Product, Specs, SKU, UOM, Qty — mobile cards + desktop table
- Low-confidence and duplicate rows highlighted in amber
- "Clear all & start over" removes draft items from Supabase

**Step 4 — Send Screen (SendScreen)**
- **Your Details:** Builder Name, Company, ABN, Phone, Email — auto-filled from `builders` profile if logged in; falls back to localStorage
- **Supplier Details:** Supplier Name (typeahead — personal "Saved" suppliers first, platform fallback), Supplier Email, Account Number — auto-filled from `builder_suppliers` on selection; pre-filled if arriving from supplier card
- **Project Details:** Project Reference, PM Name, PM Phone — pre-filled from job card if arriving via `?job=` param
- **Delivery:** Delivery/Pickup toggle; if Delivery: Google Places address lookup + manual fallback, Suburb, Site Access Notes (conditional on delivery); Date Required
- **Message:** Free text to supplier
- **Preferred Contact Method:** Triple toggle — Phone / Email / Either
- **Send Options:** Send to supplier (on/off), Copy to self (on/off)
- Sandbox mode: if no supplier set, defaults to "Sandbox — Test with your own email" → sends to builder's own email
- Confirmation modal with terms checkbox before send

**Step 5 — Success Screen**

### RFQ Entry Points
1. **Direct** — `/rfq` — fresh start; builder details auto-filled if logged in
2. **From job card** — `/rfq?job=<uuid>` — skips to step 2; prefills: project reference, site address, PM name, PM phone, site access notes
3. **From supplier card** — `/rfq?supplier=<uuid>` — skips to step 2; prefills: supplier name, email, account number

### Draft System
- Draft ID lives in `?draft=` URL param — no localStorage. New URL = clean session.
- Draft auto-created on first visit via `lib/rfqDraft.ts` → `getOrCreateDraft(builderId?)`
- Builder ID attached to draft if logged in
- Items persisted to `rfq_draft_items` after each change
- Supplier name + project reference saved to `rfq_drafts` when proceeding to SendScreen
- On send: draft archived (`status = 'sent'`), removed from My Quotes Drafts section
- Resume from My Quotes: `?draft=<id>` → always lands on step 2 (Enter Items)

### On Send (`/api/send`)
- Builds email HTML, PDF (pdf-lib), CSV
- Emails supplier (or sandbox to builder); BCC to rfq@buildquote.com.au; optional CC to self
- Saves to `rfq_requests` (see schema below)
- Saves line items to `rfq_items`
- Archives draft in `rfq_drafts`

### Outputs — what each format includes
All three (email/PDF/CSV) now include:
- Builder details (name, company, ABN, phone, email)
- PM name + PM phone (if set)
- Supplier details + account number
- Project reference
- Delivery method + address (if delivery)
- Site access notes (if delivery + notes set)
- Date required
- Preferred contact method
- All line items (name, specs/desc, SKU, UOM, qty)
- Message to supplier
- RFQ reference + sent date
- Disclaimer

### Bug fixes (sessions 2–3)
- Flash of Upload Screen on job/supplier card entry — fixed (React 18 batching, no lazy initialisers)
- "Upload a list" on Enter Items was navigating to step 1 — fixed (inline hidden file input)
- Second upload overwrote first — fixed (mergeItems deduplication)
- Resume from draft was landing on Upload Screen — fixed (always step 2 when ?draft= present)
- Mark Won/Declined silent fail for old RFQs with null builder_id — fixed (service role + email fallback)
- Next.js 16 async params TS error in `/api/quotes/[id]` — fixed

---

## What still needs doing ❌

### Before testing (blocking)
- **⚠️ Run SQL migration** — `supabase/migrations/20260520_my_quotes.sql` in Supabase dashboard
- **builder-logos bucket** — create in Supabase dashboard: Storage → New bucket → `builder-logos`, Public. Policies already exist in DB.

### Needs end-to-end testing
- All three entry points: direct `/rfq`, job card, supplier card
- No flash of Upload Screen on job/supplier card entry
- "Upload a list" on Enter Items opens inline file picker (does not navigate away)
- Second file upload merges items correctly
- Builder name auto-filled on direct `/rfq` when logged in
- PM name + phone auto-fill from job card on SendScreen
- Site access notes show only when Delivery is selected
- Preferred contact triple toggle saves and sends correctly
- PDF/CSV/email all include PM, site access, preferred contact
- My Quotes tab: Drafts resume, Discard, Sent badges, Mark Won/Declined, Undo
- RFQ count chip on job cards clicks through to My Quotes tab
- Send RFQ → check `rfq_requests` in Supabase has `builder_id`, `rfq_id_short`, `draft_id`

### Known gaps / future enhancements
- WebAuthn passkey flow not tested end-to-end
- Profile save needs re-test after builder-logos bucket created
- `pmName`, `pmPhone`, `siteAccessNotes`, `preferredContact` are **not stored in `rfq_requests`** — they go into email/PDF/CSV only. If you ever want to display these in My Quotes detail view, add columns to `rfq_requests` and save them in `/api/send/route.ts`
- Google Maps API key — restrict to `buildquote.com.au/*` and `localhost:3000/*` in Google Cloud Console
- Deploy to Vercel + update env vars

---

## Supabase Project
**Project ref:** `oxvhmulxuvlfjyjzleki`
**Full schema:** `buildquote/supabase/schema.sql`

### Key tables

```
builders
  id, email, builder_name, company_name, abn, office_phone, mobile_phone,
  logo_url, created_at

builder_jobs
  id, builder_id, project_reference, project_address, project_address_manual,
  build_type, pm_name, pm_mobile, site_access_notes, created_at

builder_suppliers
  id, builder_id, supplier_name, supplier_email, account_number,
  phone, website, rep_name, rep_mobile, credit_terms, notes, created_at

builder_favourite_products
  id, builder_id, product_id, product_name, manufacturer, notes, created_at

rfq_drafts
  id (uuid), builder_id (FK → builders), supplier_name, supplier_email,
  project_reference, status ('draft'|'sent'), created_at, updated_at
  ⚠️ builder_id, supplier_name, supplier_email, project_reference added in
     20260520_my_quotes.sql — must run migration

rfq_draft_items
  id, draft_id (TEXT — not uuid), component_id, manufacturer, system,
  sku, name, description, uom, qty, added_at

rfq_requests
  id (uuid), builder_id (FK → builders), builder_name, builder_email,
  project_name (= company), project_reference, delivery_location, notes (= message),
  supplier_name, supplier_email, rfq_id_short, draft_id,
  status ('sent'|'won'|'declined'),
  send_to_supplier, terms_confirmed, terms_confirmed_at, created_at
  ⚠️ rfq_id_short, draft_id, RLS added in 20260520_my_quotes.sql

rfq_items
  id, rfq_id (FK → rfq_requests), item_name, quantity, unit, specification,
  notes (= sku), source, sort_order
  ⚠️ RLS added in 20260520_my_quotes.sql

suppliers        — platform directory (manufacturer portal, read-only from RFQ)
```

### RLS summary
- `rfq_drafts`: INSERT with `true` (anon OK); SELECT/UPDATE require `auth.uid() = builder_id`
- `rfq_requests`: INSERT with `true`; SELECT/UPDATE require `auth.uid() = builder_id`
- `rfq_items`: INSERT/SELECT via service role in send route
- `builder_*` tables: all require `auth.uid() = builder_id`

### Storage buckets
| Bucket | Status |
|--------|--------|
| `job-images` | ✅ Working |
| `builder-logos` | ⚠️ Policies exist in DB — **bucket still needs creating in dashboard** |

---

## Key files

```
buildquote/app/rfq/page.tsx
  — RFQ wizard state machine (steps 1/2/4/5)
  — init effect: session → builderId → draft load → step set (all batched, no flash)
  — prefill effects: ?supplier= fetches builder_suppliers; ?job= fetches builder_jobs
    (now includes pm_name, pm_mobile, site_access_notes)
  — saveDraft(), saveDraftMeta(), mergeItems(), normaliseItems()

buildquote/components/screens/ManualEntryScreen.tsx
  — Enter Items (step 2)
  — Hidden file input for "Upload a list" (no navigation)
  — Full-screen parse spinner with rotating messages
  — Auto-focus + scroll to new row Product Name on "Add items manually"
  — Ref map pattern: nameInputRefs + pendingFocusId

buildquote/components/screens/SendScreen.tsx
  — Send (step 4) — 750+ lines
  — Builder auto-fill from builders table (overrides localStorage)
  — Supplier typeahead: personal builder_suppliers first, platform SUPPLIERS fallback
  — Project Details card: Project Reference, PM Name, PM Phone
  — Delivery card: toggle, address lookup + manual, suburb, Site Access Notes (delivery only), Date Required
  — Preferred Contact card: triple toggle Phone/Email/Either
  — Confirmation modal with terms checkbox

buildquote/components/builder/QuotesTab.tsx
  — My Quotes (5th dashboard tab)
  — Two-phase fetch: drafts first, then parallel sent+itemCounts
  — StatusBadge: amber=draft, blue=sent, green=won, grey=declined
  — Mark Won/Declined → PATCH /api/quotes/[id]; Undo reverts to sent

buildquote/components/builder/JobsTab.tsx
  — rfqCounts state, loaded per job by project_reference
  — "N quotes" chip → onViewQuotes callback → switches to My Quotes tab

buildquote/app/dashboard/DashboardClient.tsx
  — 5 tabs including 'quotes'; passes onViewQuotes to JobsTab

buildquote/app/api/send/route.ts
  — Resend email (HTML + PDF + CSV attachments)
  — Saves to rfq_requests + rfq_items
  — Archives draft on success

buildquote/app/api/quotes/[id]/route.ts
  — PATCH status (sent→won, sent→declined, back to sent)
  — Service role after manual auth check; handles legacy null builder_id via email match

buildquote/lib/rfqDraft.ts
  — getOrCreateDraft(builderId?) — creates or reads draft from URL param

buildquote/lib/types.ts
  — RFQPayload: rfqId, builderId?, draftId?, builder, supplier, items,
    delivery, dateRequired, message, projectReference, siteAddress?, siteSuburb?,
    sendToSupplier, sendCopyToSelf, pmName?, pmPhone?, siteAccessNotes?,
    preferredContact?

buildquote/lib/emailTemplate.ts   — HTML email with PM, site access, preferred contact
buildquote/lib/generateCSV.ts     — CSV with PROJECT DETAILS section (PM, site, contact)
buildquote/lib/generatePDF.ts     — PDF with PM in header, dynamic delivery bar

buildquote/supabase/migrations/20260520_my_quotes.sql   ← ⚠️ MUST RUN IN SUPABASE
buildquote/supabase/schema.sql    — full current schema reference
```

---

## Env vars
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY
RESEND_API_KEY
RESEND_FROM_EMAIL          (default: rfq@buildquote.com.au)
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY   ← AIzaSyCsyE_yaqU0a50XG6xggV60-aVkFoOmkYg
VERCEL_OIDC_TOKEN
```

## Google Maps API
APIs enabled: Maps JavaScript API, Places API, Places API (New)
**TODO:** Restrict key to `buildquote.com.au/*` and `localhost:3000/*` in Google Cloud Console.

---

## Session 3 commits (builders-login)
- `bb93ec2` — feat: parsing spinner on Enter Items screen
- `e32d084` — feat: PM details, site access notes, preferred contact + auto-focus new row
- `3d5aa0d` — chore: STATE.md full session 3 handover

## Comm-bridge branch (session 4 — completed)
Branch: `comm-bridge` — diverges from builders-login at `3d5aa0d`.

### Session 4 achievements
All three repos committed. Key work this session:

**manufacturer-portal** (`comm-bridge` — `773e537`):
- Widget system card full UI overhaul (WidgetClient.tsx)
  - `formatGroupKey()` — adds "mm" suffix to numeric profile group keys
  - `ProfileGroupBlock` — collapsible, system name in header, smart single/two-line rows
  - `AttributePills` — BAL, FRL-prefixed fire rating, acoustic, structural grade, Australian Made, pre-primed from notes
  - `ColoursSection` — EOI badge for `is_stocked=false` colours
  - `ComponentsAccordion` — flat selectable list (no Required/Recommended split), SKU badge + UOM
- `getWidgetData.ts` — fixed missing attribute fields in query (bal_rating, fire_rating, acoustic_rating, moisture_resistant, structural_grade were not being fetched); `australian_made` typed but not in select (pending migration below)
- `supabase/schema.sql` — added `australian_made boolean DEFAULT false` to systems table

**buildquote-data-studio** (`claude/ui-edit-system-cards-verification` — `b1c7619`):
- `SystemCard.tsx` — full rewrite to match MFP widget render
  - Profile grouping: MIN-N prefix/suffix algorithm, collapsible groups, system name header
  - Index-based `Set<number>` selection (DS types have no id field)
  - Flat components list, no role split
  - `AttributePills` — same pill set as MFP
- `AdminVerificationBar.tsx` — new System Attributes panel (BAL dropdown, fire/acoustic/structural inputs, moisture/australian_made checkboxes, Save button)
- `system-verification-actions.ts` — `SystemAttributes` type + `updateSystemAttributes` server action
- `manufacturer-workspace.ts` — `australian_made` added to type, query, mapping
- `preview/page.tsx` — passes all 6 attribute props to AdminVerificationBar

**buildquote-v6-live** (`comm-bridge` — `3d07432`):
- `GlobalNav.tsx` — hooks order fix (early return for /coming-soon moved after all useEffect calls)

### ⚠️ Pending SQL migrations (run in Supabase before testing)

**MFP project** (manufacturer portal Supabase):
```sql
-- Enable australian_made on systems
ALTER TABLE public.systems ADD COLUMN IF NOT EXISTS australian_made boolean DEFAULT false;
```
After running: uncomment `australian_made,` in `manufacturer-portal/lib/data/getWidgetData.ts` select query (currently removed to avoid PostgREST error).

**Character encoding fix** (MFP + DS Supabase — fix ™ showing as â„¢):
```sql
UPDATE components SET
  name = replace(replace(name, 'â„¢', '™'), 'â€™', '''),
  description = replace(replace(description, 'â„¢', '™'), 'â€™', ''')
WHERE name LIKE '%â%' OR description LIKE '%â%';

UPDATE system_components SET
  notes = replace(replace(notes, 'â„¢', '™'), 'â€™', ''')
WHERE notes LIKE '%â%';
```

### Next session priorities

**1. Supplier portal — check system card rendering**
Open MFP supplier portal and verify system cards render correctly with the new UI. Check profile grouping, attribute pills, components flat list, colour EOI badges.

**2. Supplier directory tab (new feature — manufacturer-portal)**
- New tab in supplier portal: "Suppliers" — lists all onboarded suppliers
- Selecting a supplier opens a supplier detail page (within MFP) with: hero image, bio/about, brands they stock, location, opening hours
- Clicking a brand (manufacturer) on the supplier page opens a widget-style preview of that manufacturer's systems that the supplier stocks
- Every page needs back navigation: "← Back to suppliers", "← Back to [Supplier Name]", "Return to home" etc.

**3. Manufacturer product page linked from RFQ "Browse Manufacturers" (buildquote-v6-live)**
- From the RFQ flow's Browse Manufacturers section, link to a per-manufacturer "all products" page
- This page shows all the manufacturer's systems as system cards
- System cards on this page render "Add selected to RFQ" (not "Enquire about this product")

### Comm-bridge commits (buildquote side)
- `c7723d7` — chore: anchor — comm-bridge session start (buildquote side)
- `1cb3637` — feat: comm bridge — MFP URL env var + schema sync
- `6f0da9b` — chore: anchor — session 4 start, comm bridge E2E plan
- `3d07432` — fix: GlobalNav hooks order — move early return after all hook calls
