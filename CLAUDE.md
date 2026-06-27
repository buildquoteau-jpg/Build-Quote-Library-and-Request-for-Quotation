# BuildQuote — Claude Code Project Guide

## Project Overview
BuildQuote (buildquote.com.au) is a Next.js web app for Southwest WA builders. It turns handwritten or uploaded materials lists into professional RFQ (Request for Quotation) emails sent directly to suppliers.

Working directory: `buildquote-v6-live/buildquote/`
Run dev server: `cd buildquote && npm run dev` → http://localhost:3000

## Tech Stack
- **Framework:** Next.js 16.1.6 (App Router, React 19)
- **Database:** Supabase (Postgres) — `@supabase/supabase-js ^2.98`
- **AI/Parse:** Anthropic SDK `@anthropic-ai/sdk ^0.78` for OCR/parsing materials lists
- **Email:** Resend `^6.9.2`
- **PDF:** pdf-lib, pdf-parse, pdf2pic
- **Spreadsheet parse:** ExcelJS, Mammoth (Word docs)
- **Analytics:** Vercel Analytics
- **Styling:** Tailwind CSS v4 (PostCSS), custom design tokens via CSS variables
- **Fonts:** Barlow (body), Barlow Condensed (headings) — Google Fonts
- **Deployment:** Vercel

## File Structure
```
buildquote/
  app/
    page.tsx               # Landing / home
    layout.tsx             # Root layout — GlobalNav + Vercel Analytics
    globals.css            # Tailwind v4 config + design tokens
    rfq/page.tsx           # Main RFQ flow (5-step wizard)
    products/page.tsx      # Products browse page
    products/CatalogueClient.tsx
    flyer/page.tsx
    privacy/page.tsx
    terms/page.tsx
    api/
      parse/route.ts       # Anthropic OCR → LineItem[]
      send/route.ts        # Resend email dispatch
      pdf/route.ts         # PDF generation
      csv/route.ts         # CSV export
      community/route.ts
      save-draft-items/route.ts
      get-draft-items/route.ts
  components/
    GlobalNav.tsx          # Hamburger nav — fixed top-right, all pages
    screens/
      UploadScreen.tsx     # Step 1 — photo/file upload or manual entry
      ManualEntryScreen.tsx # Step 2 — review/edit line items
      RFQScreen.tsx        # Step 3 (currently skipped in flow)
      SendScreen.tsx       # Step 4 — builder & supplier details + send
      SuccessScreen.tsx    # Step 5 — confirmation
    ui/
      Button.tsx / Card.tsx / Input.tsx / Toggle.tsx
      CheckRow.tsx / SectionLabel.tsx / TopBar.tsx
  lib/
    supabase.ts            # Supabase client (anon key, public)
    rfqDraft.ts            # Draft create/read from URL param ?draft=
    types.ts               # LineItem, BuilderDetails, SupplierDetails, RFQPayload
    emailTemplate.ts
    generateCSV.ts
    generatePDF.ts
    suppliers.ts
  data/
    manufacturers.json
    suppliers.json
  supabase/
    rfq_draft_tables.sql   # rfq_drafts + rfq_draft_items schema
```

## RFQ Flow (5 Steps)
`step 1` UploadScreen → `step 2` ManualEntryScreen → `step 4` SendScreen → `step 5` SuccessScreen
- Step 3 (RFQScreen) exists but is currently skipped in the active flow
- Draft ID lives in `?draft=` URL param — no localStorage. New URL = clean session
- Draft auto-created in Supabase on first visit; items persisted between steps

## Supabase Schema
```sql
rfq_drafts       — id (uuid PK), created_at, updated_at, status
rfq_draft_items  — id, draft_id (FK), component_id, manufacturer, system,
                   sku, name, description, uom, qty, added_at
```
Client: `lib/supabase.ts` uses `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Key Types (`lib/types.ts`)
- `LineItem` — id, name, sku, productId, desc, uom, qty + dimension fields (mm, roll_m, weight_kg etc.)
- `BuilderDetails` — builderName, company, abn, phone, email
- `SupplierDetails` — supplierName, supplierEmail, accountNumber
- `RFQPayload` — rfqId, builder, supplier, items, delivery, dateRequired, message, projectReference, siteAddress, siteSuburb, sendToSupplier, sendCopyToSelf

## Design System
Brand colour: `#185D7A` (navy/teal)
Custom Tailwind tokens (set in globals.css):
- `bg-page`, `bg-surface-subtle`
- `text-heading`, `text-text-primary`, `text-text-secondary`, `text-text-muted`
- `text-brand`, `bg-brand`, `hover:bg-brand-hover`
- `border-border-subtle`

## Nav Links (GlobalNav)
- Home `/`
- Send a Quote `/rfq`
- Products `/products`
- Manufacturers Portal `https://search.buildquote.com.au` (external)
- Privacy Policy `/privacy`
- Terms of Use `/terms`

## Workflow Rules
1. **Always run and verify on `localhost:3000` before committing.** No exceptions.
2. Use `skill.md` patterns (Claude Code skills) where they apply to a feature.
3. Branch per feature. Current feature branch: `builders-login`.
4. Commit messages in conventional format: `feat:`, `fix:`, `chore:` etc.
5. Supabase project ref: `oxvhmulxuvlfjyjzleki`

## Builders Login (In Progress — branch: `builders-login`)
See `buildquote/STATE.md` for full detail. Summary:
- `/login`, `/register`, `/dashboard` pages built
- `proxy.ts` handles auth routing (Next.js 16 — replaces middleware.ts)
- `lib/supabase-server.ts` + `lib/supabase-browser.ts` — SSR-aware clients
- Dashboard has 4 tabs: Current Jobs / Preferred Suppliers / Favourite Products / My Profile
- Components in `components/builder/`: JobsTab, SuppliersTab, FavouriteProductsTab, ProfilePanel
- API routes in `app/api/auth/`: register, passkey register/authenticate
- New Supabase tables: builders, builder_jobs, builder_suppliers, builder_favourite_products, builder_passkeys
- Storage buckets: builder-logos, job-images (both need RLS policies — see STATE.md)
- **TODO:** RFQ auto-fill (pre-populate SendScreen with logged-in builder details)

## Environment Variables Required
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
ANTHROPIC_API_KEY
RESEND_API_KEY
```

---

## Library Feature Build (Phase 1)
**Goal:** Add `buildquote.com.au/library` — public product library with shopping list and RFQ conversion.
**Status:** In progress

### Key Decisions
- Folder: `components/library/` (alongside existing `components/builder/`)
- File naming: `*UI.tsx` = visual component, `*Provider.tsx` = state/context, `.ts` = pure logic
- localStorage key: `bq_shopping_list` (same key as MFP — shared domain means shared storage)
- Share: Canvas API → PNG → `navigator.share()` on mobile, download on desktop (port from MFP)
- Convert to RFQ: POST to `/api/create-draft` with `builderId` if logged in → `/rfq?draft=uuid`
- Logged-in builder: flows straight to step 2 with items pre-populated, no friction
- RLS confirmed: all required tables have public SELECT for anon users

### Source Files to Port From
- Shopping list + drawer: `manufacturer-portal/app/manufacturers/ManufacturersClient.tsx` (lines 302–385 for PNG share, lines 93–165 for drawer UI)
- SystemCard: `buildquote-data-studio/apps/web/components/system-card/SystemCard.tsx`

### Build Checklist
- [x] **Step 1** — `lib/data/getSystems.ts` — Supabase queries: `getAllSystems()` + `getSystemBySlug(slug)`
- [x] **Step 2** — `app/library/page.tsx` — static index, systems grouped by category, generateMetadata
- [ ] **Step 3** — `app/library/[slug]/page.tsx` + `components/library/SystemCardUI.tsx` — per-system SEO pages
- [ ] **Step 4** — `components/library/ShoppingListProvider.tsx` + `components/library/ShoppingListDrawerUI.tsx`
- [ ] **Step 5** — Convert to RFQ — wire shopping list → `/api/create-draft` → `/rfq?draft=uuid`. Check if `/api/add-to-draft` needs porting from MFP.
- [ ] **Step 6** — Update `components/GlobalNav.tsx` + `components/builder/FavouriteProductsTab.tsx` to point to `/library`
- [ ] **Step 7** — `app/api/library/systems/route.ts` + live search/filter on index page

### Commit Points
Commit after each step is checked off. Tag significant ones: `feat/library-step-1`, `feat/library-step-2` etc.
