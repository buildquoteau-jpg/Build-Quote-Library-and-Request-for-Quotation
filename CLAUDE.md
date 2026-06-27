# BuildQuote — Claude Code Project Guide

## Project Overview
BuildQuote (buildquote.com.au) is a Next.js web app for Southwest WA builders. It turns handwritten or uploaded materials lists into professional RFQ (Request for Quotation) emails sent directly to suppliers.

**Working directory:** `C:\Users\Melia Borg\Desktop\Repositries\Build-Quote-v6\Build-Quote-v6\buildquote\`
**Run dev server:** `cd buildquote && npm run dev` → http://localhost:3000
**Branch:** `main` (all features merged — no active feature branches)

---

## Tech Stack
- **Framework:** Next.js 16.1.6 (App Router, React 19)
- **Database:** Supabase (Postgres) — `@supabase/supabase-js ^2.98`
- **AI/Parse:** OpenAI `gpt-4o` via `openai` SDK — OCR/parsing materials lists (NOT Anthropic — migrated in session 7)
- **Email:** Resend `^6.9.2`
- **PDF:** pdf-lib, pdf-parse, pdf2pic
- **Spreadsheet parse:** ExcelJS, Mammoth (Word docs)
- **Analytics:** Vercel Analytics
- **Styling:** Tailwind CSS v4 (PostCSS), custom design tokens via CSS variables
- **Fonts:** Barlow (body), Barlow Condensed (headings) — Google Fonts
- **Deployment:** Vercel
- **Supabase project ref:** `oxvhmulxuvlfjyjzleki`

---

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
OPENAI_API_KEY                  ← parse/route.ts — gpt-4o OCR/parsing
RESEND_API_KEY
RESEND_FROM_EMAIL               (default: rfq@buildquote.com.au)
NEXT_PUBLIC_APP_URL             ← https://buildquote.com.au in prod, http://localhost:3000 in dev
                                   (passkey routes derive hostname from this)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
NEXT_PUBLIC_MFP_URL             = https://search.buildquote.com.au
VERCEL_OIDC_TOKEN
```
⚠️ `ANTHROPIC_API_KEY` is NOT used — parse was migrated to OpenAI. Remove from Vercel if present.
⚠️ `NEXT_PUBLIC_BUILDQUOTE_URL` is NOT used — library RFQ redirect uses relative `/rfq?draft=uuid`.

---

## Design System
Brand colour: `#185D7A` (navy/teal), orange accent: `#f97316`
Custom Tailwind tokens (in `globals.css`):
- `bg-page`, `bg-surface`, `bg-surface-subtle`
- `text-heading`, `text-text-primary`, `text-text-secondary`, `text-text-muted`, `text-text-faint`
- `text-brand`, `bg-brand`, `hover:bg-brand-hover`, `text-navy`, `bg-navy`
- `border-border`, `border-border-subtle`

Styling rule — light vs dark:
- buildquote.com.au (all pages) → **Light**
- `/dashboard` → **Light**
- MFP `/supplierdirectory/*`, `/manufacturers/*`, `/widget/*` → **Light**
- MFP `/supplier/[slug]/*`, `/admin/*` → **Dark**
- Data Studio (all pages) → **Dark**

---

## File Structure
```
buildquote/
  app/
    page.tsx                      # Landing page — CTA → /rfq, /library, login links
    layout.tsx                    # Root layout — GlobalNav + Vercel Analytics
    globals.css                   # Tailwind v4 config + design tokens
    rfq/page.tsx                  # RFQ wizard — 5-step state machine
    products/page.tsx             # Customer product search (alt entry point)
    products/rfq/page.tsx         # Inline quote form from product search
    dashboard/
      page.tsx                    # Auth-gated redirect to DashboardClient
      DashboardClient.tsx         # 5-tab shell
    login/page.tsx
    register/page.tsx
    library/
      page.tsx                    # Library index — SSR, SEO, passes data to LibraryIndexClient
      layout.tsx                  # Wraps library routes with ShoppingListProvider + drawer
      [slug]/
        page.tsx                  # Per-system SEO page — generateMetadata, JSON-LD
        SystemCardWrapper.tsx     # Client bridge: connects SystemCardUI to shopping list context
    api/
      parse/route.ts              # OpenAI gpt-4o OCR → LineItem[]
      send/route.ts               # Resend email dispatch + PDF/CSV attachment
      pdf/route.ts
      csv/route.ts
      create-draft/route.ts       # POST → create rfq_drafts row, returns draftId
      save-draft-items/route.ts   # POST → upsert rfq_draft_items
      get-draft-items/route.ts    # GET → read draft items for step 2 resume
      library/
        systems/route.ts          # GET ?q= ?category= → filtered system list for library search
      auth/
        register/route.ts
        passkey/register/route.ts
        passkey/authenticate/route.ts
      quotes/[id]/route.ts        # PATCH won/declined status
      cleanup-drafts/route.ts
      community/route.ts
      interest/route.ts
  components/
    GlobalNav.tsx                 # Hamburger nav — fixed top-right, hidden on / and /coming-soon
    library/
      SystemCardUI.tsx            # Full system card: profiles, components, colours, pills, actions
      SystemCardTileUI.tsx        # Index grid tile — hero image + name overlay
      LibraryIndexClient.tsx      # Client: search input + category pills + grid, debounced API fetch
      ShoppingListProvider.tsx    # Context + localStorage (key: bq_shopping_list)
      ShoppingListDrawerUI.tsx    # Floating bottom drawer: table, PNG share, Convert to RFQ
    builder/
      JobsTab.tsx
      SuppliersTab.tsx
      FavouriteProductsTab.tsx    # Includes "Product Library" + "Browse MFP" buttons
      ProfilePanel.tsx
      QuotesTab.tsx               # My Quotes — drafts + sent, mark won/declined
    screens/
      UploadScreen.tsx            # Step 1 — upload/manual, login banner
      ManualEntryScreen.tsx       # Step 2 — review/edit line items
      RFQScreen.tsx               # Step 3 — skipped in active flow
      SendScreen.tsx              # Step 4 — builder & supplier details, send
      SuccessScreen.tsx           # Step 5
    ui/
      Button.tsx / Card.tsx / Input.tsx / Toggle.tsx
      CheckRow.tsx / SectionLabel.tsx / TopBar.tsx
  lib/
    supabase-browser.ts           # Supabase browser client (SSR-aware)
    supabase-server.ts            # Supabase server client (SSR-aware)
    supabase-service.ts           # Supabase service role client (API routes)
    supabase.ts                   # Legacy anon client (kept for compat)
    data/
      getSystems.ts               # getAllSystems() + getSystemBySlug(slug) — Supabase queries
    rfqDraft.ts                   # getOrCreateDraft(builderId?)
    types.ts                      # LineItem, BuilderDetails, SupplierDetails, RFQPayload
    emailTemplate.ts
    generateCSV.ts
    generatePDF.ts
    suppliers.ts
  proxy.ts                        # Next.js 16 auth routing (replaces middleware.ts)
  supabase/
    schema.sql                    # Full schema reference
    migrations/
      rfq_draft_tables.sql
      20260520_my_quotes.sql      # ⚠️ Must be run in Supabase before testing My Quotes tab
```

---

## Nav Links (GlobalNav)
1. Home `/`
2. Builder Portal `/dashboard`
3. Start a Quote Request `/rfq`
4. Product Library `/library`
5. Browse Products & Suppliers `https://search.buildquote.com.au/manufacturers` (external)
6. Supplier Directory `https://search.buildquote.com.au/supplierdirectory` (external)
+ Team Links: Supplier Portal / Data Studio (external)
+ Legal: Privacy Policy / Terms of Use

GlobalNav is hidden on `/` and `/coming-soon`.

---

## RFQ Flow
`step 1` UploadScreen → `step 2` ManualEntryScreen → `step 4` SendScreen → `step 5` SuccessScreen
- Step 3 (RFQScreen) exists but is skipped in the active flow
- Draft ID lives in `?draft=` URL param — no localStorage. New URL = clean session
- `lib/rfqDraft.ts` → `getOrCreateDraft(builderId?)` — creates or resumes a draft

**RFQ entry points:**
1. `/rfq` — fresh start
2. `/rfq?job=<uuid>` — prefills project reference, site address, PM details
3. `/rfq?supplier=<uuid>` — prefills supplier from builder_suppliers
4. `/rfq?draft=<uuid>` — resumes draft at step 2
5. `/rfq?draft=<uuid>&supplierName=<name>` — returns from MFP with supplier pre-filled

---

## Library Feature (Complete ✅)
**Goal:** `buildquote.com.au/library` — public product library, shopping list, RFQ conversion.

### Key Decisions
- Folder: `components/library/` (alongside `components/builder/`)
- File naming: `*UI.tsx` = visual, `*Provider.tsx` = state/context, `.ts` = pure logic
- localStorage key: `bq_shopping_list`
- Share: Canvas API → PNG → `navigator.share()` on mobile, download on desktop
- Convert to RFQ: POST `/api/create-draft` (with builderId if logged in) → `/api/save-draft-items` → redirect `/rfq?draft=uuid`
- `stripSystem()` strips trailing " System" / " Systems" from display names (DB names unchanged)
- Profile row: single line — label | specs | SKU | UOM badge | checkbox
- Search API: `?q=` (ilike on name, description, category, subcategory) + `?category=` filter
- "See local stockists" button is a disabled placeholder — `/suppliers` route not yet built

### Supabase Tables (public SELECT, anon access confirmed)
- `systems` — joined to `manufacturers`, `system_profiles`, `system_components`, `system_colours`

---

## Supabase Schema (Key Tables)
```
builders                   — id, email, builder_name, company_name, abn, office_phone,
                             mobile_phone, logo_url, created_at
builder_jobs               — id, builder_id, project_reference, project_address,
                             build_type, pm_name, pm_mobile, site_access_notes
builder_suppliers          — id, builder_id, supplier_name, supplier_email,
                             account_number, phone, website, rep_name, rep_mobile
builder_favourite_products — id, builder_id, product_id, product_name,
                             manufacturer, sku, description, uom, notes
rfq_drafts                 — id, builder_id, supplier_name, supplier_email,
                             project_reference, status, created_at, updated_at
rfq_draft_items            — id, draft_id, name, sku, description, uom, qty,
                             + dimension fields (length_mm, width_mm, etc.)
rfq_requests               — id, builder_id, builder_name, supplier_name,
                             supplier_email, rfq_id_short, draft_id, status,
                             send_to_supplier, terms_confirmed, created_at
rfq_items                  — id, rfq_id, item_name, quantity, unit, specification
rfq_enquiries              — id, supplier_name, system_name, name, email, phone,
                             message, created_at (anon insert — /products flow)
systems                    — id, name, slug, category, subcategory, description,
                             hero_image_url, sort_order, manufacturer_id + attribute fields
manufacturers              — id, name, slug, logo_url
system_profiles            — id, system_id, profile_name, product_code, dims, uom, sort_order
system_components          — id, system_id, role, component_id, sort_order
system_colours             — id, system_id, colour_name, image_url, is_stocked, sort_order
```

---

## Workflow Rules
1. **Always verify on `localhost:3000` before committing.** No exceptions.
2. Commit messages: conventional format — `feat:`, `fix:`, `chore:`, `refactor:` etc.
3. All features currently on `main` — create a feature branch for any new work.
4. TypeScript strict — run `npx tsc --noEmit` before committing.
5. File naming: `*UI.tsx` = visual component, `*Provider.tsx` = state/context, `.ts` = pure logic.

---

## Known Gaps / Next Work
- **`/suppliers` route** — "See local stockists" on system cards is a disabled placeholder; this page doesn't exist yet
- **RFQ auto-fill** — pre-populate SendScreen with logged-in builder details (builder name, company, ABN, phone, email)
- **Google Maps API key** — not restricted to production domains yet
- **Supabase migration** — `20260520_my_quotes.sql` must be run before testing My Quotes tab
- **Passkey flow** — not tested end-to-end
- **Hero image data** — some records have trailing `\r\n` in `hero_image_url`; guarded with `.trim()` in UI but fix at source in Supabase
- **`/products` page** — parallel entry point to MFP manufacturers search; consider whether to consolidate long-term

---

## Recent Commits (main)
```
e95c2ff  fix: library polish -- RFQ redirect, stockists placeholder, hero URL trim, landing link
4dd5b49  feat: library Steps 5-7 -- RFQ conversion, nav links, search/filter
844d564  (earlier library steps 1-4)
```
