# BuildQuote — Session State
_Last updated: 2026-05-20 — builders-login branch_

## Branch
`builders-login` — committed and pushed. Ready to merge to main after RFQ integration.

## What's built and working ✅
- Builder registration (`/register`) — 2-step form, server-side via `/api/auth/register`
- Builder login (`/login`) — email + password, passkey/FaceID wired up
- Auth middleware → `proxy.ts` (Next.js 16)
- Dashboard (`/dashboard`) — 4 tabs: Current Jobs / Preferred Suppliers / Favourite Products / My Profile
- **Current Jobs tab** — add/edit/delete, Google Places autocomplete, manual address fallback, build type, PM details, site notes, photo upload (`job-images` bucket)
- **Preferred Suppliers tab** — Find on Map (Google Places Autocomplete, centred SW WA), add manually, RFQ email, phone + website (auto-filled from Maps), account number, credit/upfront, rep name/mobile, notes. Cards show Clearbit logo watermark.
- **Favourite Products tab** — add/edit/delete products from manufacturer portal
- **My Profile tab** — edit details, logo upload, change password, register passkey. Saves redirect to Current Jobs tab.
- RFQ page (`/rfq`) — auth banner: "G'day [name]" if logged in, "Sign in" button if guest
- GlobalNav — "Builder Portal" link added
- Full schema documented in `buildquote/supabase/schema.sql`
- Backup tables deleted from Supabase (backup_20260513_*)

## What still needs doing ❌
- **builder-logos bucket** — must be created manually in Supabase dashboard (Storage → New bucket → `builder-logos`, Public). Policies already exist in DB.
- **Profile save** — added session check + `.select('id')` to detect silent RLS failures. Needs re-test after builder-logos bucket created (unrelated but test at same time).
- WebAuthn passkey flow not tested end-to-end
- Deploy to Vercel + update env vars

---

## Next session: RFQ Integration ← START HERE

### The architecture decision (agreed)
Two supplier tables are correct and serve different purposes:
- **`suppliers`** — platform-level directory of registered trade suppliers (manufacturer portal). Managed by buildquote admin.
- **`builder_suppliers`** — each builder's personal preferred suppliers list. Private, holds their account numbers, credit terms, rep contacts.

Future: match them via `supplier_place_id` to inherit verified emails. Not needed now.

### What to build

**1. Add `builder_id` to `rfq_requests`**
Run in Supabase SQL editor:
```sql
ALTER TABLE rfq_requests ADD COLUMN IF NOT EXISTS builder_id uuid references builders(id);
CREATE INDEX IF NOT EXISTS idx_rfq_requests_builder ON rfq_requests(builder_id);
```
This links sent RFQs to the logged-in builder for audit trail.

**2. Pre-fill SendScreen with builder profile**
When builder is logged in, fetch their profile from `builders` table and pre-populate:
- `builder.builderName` ← `profile.builder_name`
- `builder.company` ← `profile.company_name`
- `builder.abn` ← `profile.abn`
- `builder.phone` ← `profile.office_phone || profile.mobile_phone`
- `builder.email` ← `profile.email || user.email`

Do this in `SendScreen.tsx` — check for session on mount, fetch profile, set payload fields.

**3. Supplier autocomplete in SendScreen**
When builder is logged in, fetch their `builder_suppliers` list.
On the supplier name field: as they type, filter the list and show a dropdown.
On selection, auto-fill: `supplierName`, `supplierEmail`, `accountNumber`.
Fields remain editable after auto-fill (guest override).

**4. Three RFQ entry points**

**Entry point A — From Preferred Suppliers tab:**
Add "Send RFQ →" button to each supplier card in `SuppliersTab.tsx`.
On click: navigate to `/rfq` with a query param e.g. `?supplier=<uuid>`.
In `rfq/page.tsx` or `SendScreen`: read `?supplier=` param, fetch that supplier's details, pre-fill SendScreen.

**Entry point B — From Current Jobs tab:**
Add "Send RFQ →" button to each job card in `JobsTab.tsx`.
On click: navigate to `/rfq?job=<uuid>`.
In SendScreen: read `?job=` param, fetch job details, pre-fill `projectReference` and `siteAddress`.

**Entry point C — Generic (`/rfq`):**
Already works. Builder types supplier name → typeahead from `builder_suppliers` → selects → fills.
This is the fallback for guests and for builders who haven't saved that supplier yet.

**5. Write to `rfq_requests` on send**
In `/api/send/route.ts`, after sending the email successfully, insert into `rfq_requests`:
```typescript
await supabase.from('rfq_requests').insert({
  builder_id: payload.builderId || null,
  builder_name: payload.builder.builderName,
  builder_email: payload.builder.email,
  supplier_name: payload.supplier.supplierName,
  supplier_email: payload.supplier.supplierEmail,
  project_reference: payload.projectReference,
  status: 'sent',
  send_to_supplier: payload.sendToSupplier,
  terms_confirmed: true,
  terms_confirmed_at: new Date().toISOString(),
})
```

### Implementation order
1. SQL: `ALTER TABLE rfq_requests ADD COLUMN builder_id`
2. SendScreen: pre-fill builder fields from profile
3. SendScreen: supplier typeahead from `builder_suppliers`
4. SuppliersTab + JobsTab: add "Send RFQ" buttons with query params
5. rfq/page.tsx: read `?supplier=` and `?job=` params, pass to SendScreen
6. /api/send: write to `rfq_requests` with builder_id

---

## Supabase Project
**Project ref:** `oxvhmulxuvlfjyjzleki`
**Full schema:** `buildquote/supabase/schema.sql`

### Key tables for next session
```
rfq_requests        — add builder_id column (see SQL above)
rfq_draft_items     — draft_id is TEXT not uuid (already handled in code)
builder_suppliers   — source of truth for supplier autocomplete in SendScreen
builders            — source of truth for builder auto-fill in SendScreen
suppliers           — platform supplier directory (manufacturer portal, read-only from RFQ side)
```

### Storage buckets
| Bucket | Status |
|--------|--------|
| `job-images` | Working |
| `builder-logos` | **Policies exist — bucket still needs creating in dashboard** |

## Key files for next session
```
buildquote/app/rfq/page.tsx                        ← add ?supplier= and ?job= param handling
buildquote/components/screens/SendScreen.tsx        ← builder auto-fill + supplier typeahead
buildquote/app/api/send/route.ts                   ← write to rfq_requests on send
buildquote/components/builder/SuppliersTab.tsx      ← add Send RFQ button per card
buildquote/components/builder/JobsTab.tsx           ← add Send RFQ button per card
buildquote/lib/types.ts                            ← may need builderId added to RFQPayload
```

## Env vars
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY
RESEND_API_KEY
RESEND_FROM_EMAIL
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY   ← AIzaSyCsyE_yaqU0a50XG6xggV60-aVkFoOmkYg
VERCEL_OIDC_TOKEN
```

## Google Maps API
APIs enabled: Maps JavaScript API, Places API, Places API (New)
**TODO:** Restrict key to `buildquote.com.au/*` and `localhost:3000/*` in Google Cloud Console.
