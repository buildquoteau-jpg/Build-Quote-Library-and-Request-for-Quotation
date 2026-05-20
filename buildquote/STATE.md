# BuildQuote — Session State
_Last updated: 2026-05-20 — builders-login branch_

## Branch
`builders-login` — committed, pushed to origin. Next: merge to main after RFQ integration.

## What's built and working ✅
- Builder registration (`/register`) — 2-step form, server-side via `/api/auth/register` (service role, skips email confirmation)
- Builder login (`/login`) — email + password, passkey/FaceID option wired up
- Auth middleware → `proxy.ts` (Next.js 16 renamed from middleware.ts)
- Dashboard (`/dashboard`) — 4 tabs: Current Jobs / Preferred Suppliers / Favourite Products / My Profile
- **Current Jobs tab** — add/edit/delete, Google Places address autocomplete, manual address fallback, build type, PM details, site notes, photo upload (Supabase Storage `job-images` bucket)
- **Preferred Suppliers tab** — Find on Map (Google Places Autocomplete, centred SW WA), add manually, RFQ email, phone (auto-filled from Maps), website (auto-filled from Maps), account number, credit/upfront, rep name/mobile, notes. Supplier cards show Clearbit logo watermark from website URL.
- **Favourite Products tab** — add/edit/delete products from manufacturer portal
- **My Profile tab** — edit all builder details, logo upload, change password, register passkey. Save redirects back to Current Jobs tab.
- RFQ page (`/rfq`) — auth banner: shows "G'day [name]" if logged in, "Sign in" button if guest
- GlobalNav — "Builder Portal" link added

## What still needs doing ❌
- **Profile save debugging** — added session check + `.select('id')` to detect silent RLS failure. Needs re-test after builder-logos bucket created.
- **builder-logos bucket** — must be created manually in Supabase dashboard (Storage → New bucket → `builder-logos`, Public). Policies already exist.
- **RFQ auto-fill** — when builder is logged in, pre-populate Step 4 SendScreen with profile data (builder name, company, ABN, phone, email). This is the next major feature.
- WebAuthn passkey flow not tested end-to-end
- Commit `builders-login` branch → PR → merge to main
- Deploy to Vercel + update env vars

## Next session priority: RFQ integration
When a builder is logged in and reaches Step 4 (SendScreen), their profile details should auto-fill:
- `builder.builderName` ← `profile.builder_name`
- `builder.company` ← `profile.company_name`
- `builder.abn` ← `profile.abn`
- `builder.phone` ← `profile.office_phone || profile.mobile_phone`
- `builder.email` ← `profile.email || user.email`

Also: preferred suppliers should be selectable in SendScreen (dropdown or list) to pre-fill supplier details.

## Supabase Project
**Project ref:** `oxvhmulxuvlfjyjzleki`
**Full schema:** `buildquote/supabase/schema.sql`

### Tables
```
rfq_drafts              — id, created_at, updated_at, status
rfq_draft_items         — id, draft_id, component_id, manufacturer, system, sku,
                          name, description, uom, qty, dimension fields, added_at
builders                — id (FK auth.users), builder_name, company_name, abn,
                          company_address, company_address_place_id, email,
                          office_phone, mobile_phone, logo_url, created_at, updated_at
builder_jobs            — id, builder_id, project_reference, project_address,
                          project_address_place_id, project_address_manual,
                          pm_name, pm_mobile, site_access_notes, build_type,
                          image_url, created_at, updated_at
builder_suppliers       — id, builder_id, supplier_name, supplier_address,
                          supplier_place_id, supplier_email, supplier_phone,
                          supplier_website, account_number,
                          payment_type CHECK('credit'|'upfront'),
                          notes, rep_name, rep_mobile, created_at
builder_favourite_products — id, builder_id, product_id, product_name,
                             manufacturer, sku, description, uom, notes, created_at
builder_passkeys        — id, builder_id, credential_id (unique), public_key,
                          counter, device_type, backed_up, transports[], created_at
```

### RLS
All tables: RLS enabled. Builders read/write own rows only.
- `builders`: `auth.uid() = id`
- All others: `auth.uid() = builder_id`

### Storage buckets
| Bucket | Public | Status |
|--------|--------|--------|
| `builder-logos` | ✅ | Policies exist — **bucket must be created in dashboard** |
| `job-images` | ✅ | Bucket + policies confirmed working |

## Key files
```
buildquote/proxy.ts                                    ← auth middleware (Next.js 16)
buildquote/lib/supabase-server.ts                      ← SSR Supabase client
buildquote/lib/supabase-browser.ts                     ← Browser Supabase client
buildquote/types/google-maps.d.ts                      ← Global Google Maps types
buildquote/app/login/page.tsx                          ← Login (email + passkey)
buildquote/app/register/page.tsx                       ← Registration (2-step)
buildquote/app/dashboard/layout.tsx
buildquote/app/dashboard/page.tsx                      ← Server component, fetches user + profile
buildquote/app/dashboard/DashboardClient.tsx           ← 4-tab dashboard UI
buildquote/app/api/auth/register/route.ts              ← Server-side registration (service role)
buildquote/app/api/auth/passkey/                       ← WebAuthn routes (4 files)
buildquote/components/builder/JobsTab.tsx
buildquote/components/builder/SuppliersTab.tsx
buildquote/components/builder/FavouriteProductsTab.tsx
buildquote/components/builder/ProfilePanel.tsx
buildquote/components/screens/UploadScreen.tsx         ← Auth banner added (sign in / guest)
buildquote/supabase/schema.sql                         ← Full schema (all tables + RLS + storage)
```

## Packages added
```
@supabase/ssr
@simplewebauthn/browser
@simplewebauthn/server
```

## Env vars (all present in .env.local + Vercel)
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY
OPENAI_API_KEY
RESEND_API_KEY
RESEND_FROM_EMAIL
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
VERCEL_OIDC_TOKEN
```

## Google Maps API
Key: `AIzaSyCsyE_yaqU0a50XG6xggV60-aVkFoOmkYg`
APIs enabled: Maps JavaScript API, Places API, Places API (New)
**TODO:** Restrict key to `buildquote.com.au/*` and `localhost:3000/*` in Google Cloud Console.
