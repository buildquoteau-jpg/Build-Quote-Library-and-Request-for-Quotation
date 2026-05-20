# BuildQuote — Session State
_Last updated: 2026-05-20 — builders-login branch_

## Branch
`builders-login` — not yet committed to main. All work is local only.

## What's built and working ✅
- Builder registration (`/register`) — 2-step form, server-side via `/api/auth/register` (service role, skips email confirmation)
- Builder login (`/login`) — email + password, passkey/FaceID option wired up
- Auth middleware → `proxy.ts` (Next.js 16 renamed from middleware.ts)
- Dashboard (`/dashboard`) — 4 tabs: Current Jobs / Preferred Suppliers / Favourite Products / My Profile
- **Current Jobs tab** — add/edit/delete, Google Places address autocomplete, manual address fallback, build type, PM details, site notes, photo upload (Supabase Storage `job-images` bucket)
- **Preferred Suppliers tab** — Find on Map (Google Places Autocomplete, centered SW WA), add manually, RFQ email field, account number, credit/upfront, rep name/mobile, notes
- **Favourite Products tab** — add/edit/delete products from manufacturer portal
- **My Profile tab** — edit all builder details, logo upload, change password, register passkey
- GlobalNav updated — "Builder Portal" link added
- Auto-create builders profile on dashboard load if missing (edge case recovery)

## What still needs doing ❌
- Supplier save may still be failing (was just fixed, not confirmed working yet — added error alerts)
- Google Maps billing error still showing intermittently (API key restrictions just updated, may need time to propagate)
- WebAuthn passkey flow not tested end-to-end
- RFQ auto-fill: logged-in builder details should pre-populate Step 4 Send screen
- Commit to branch / PR not done yet

## Supabase Tables (project: oxvhmulxuvlfjyjzleki)

### Existing tables (pre-builders-login)
```sql
rfq_drafts (id, created_at, updated_at, status)
rfq_draft_items (id, draft_id, component_id, manufacturer, system, sku, name, description, uom, qty, added_at)
```

### New tables added this session
```sql
builders (
  id uuid PK references auth.users,
  builder_name text,
  company_name text,
  abn text,
  company_address text,
  company_address_place_id text,
  email text,
  office_phone text,
  mobile_phone text,
  logo_url text,
  created_at timestamptz,
  updated_at timestamptz
)

builder_jobs (
  id uuid PK,
  builder_id uuid FK → builders(id),
  project_reference text,
  project_address text,
  project_address_place_id text,
  project_address_manual text,
  pm_name text,
  pm_mobile text,
  site_access_notes text,
  build_type text,
  image_url text,          ← added via ALTER TABLE this session
  created_at timestamptz,
  updated_at timestamptz
)

builder_suppliers (
  id uuid PK,
  builder_id uuid FK → builders(id),
  supplier_name text,
  supplier_address text,
  supplier_place_id text,
  supplier_email text,     ← added via ALTER TABLE this session
  account_number text,
  payment_type text CHECK ('credit' | 'upfront'),
  notes text,
  rep_name text,
  rep_mobile text,
  created_at timestamptz
)

builder_favourite_products (
  id uuid PK,
  builder_id uuid FK → builders(id),
  product_id text,
  product_name text,
  manufacturer text,
  sku text,
  description text,
  uom text,
  notes text,
  created_at timestamptz
)

builder_passkeys (
  id uuid PK,
  builder_id uuid FK → builders(id),
  credential_id text UNIQUE,
  public_key text,
  counter bigint,
  device_type text,
  backed_up boolean,
  transports text[],
  created_at timestamptz
)
```

### RLS policies
All new tables have RLS enabled. Policies: builders can only read/write their own rows (`auth.uid() = builder_id` or `auth.uid() = id`).

### Storage buckets
- `builder-logos` — public, RLS policies added for authenticated upload
- `job-images` — public, RLS policies added this session:
  ```sql
  CREATE POLICY "Authenticated users can upload job images"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'job-images');
  CREATE POLICY "Public can read job images"
    ON storage.objects FOR SELECT TO public
    USING (bucket_id = 'job-images');
  CREATE POLICY "Users can delete own job images"
    ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'job-images' AND auth.uid()::text = (storage.foldername(name))[1]);
  ```

## New files added this session
```
buildquote/proxy.ts                                    ← auth middleware (Next.js 16)
buildquote/lib/supabase-server.ts                      ← SSR Supabase client
buildquote/lib/supabase-browser.ts                     ← Browser Supabase client
buildquote/types/google-maps.d.ts                      ← Global Google Maps types
buildquote/middleware.ts                               ← DELETED (renamed to proxy.ts)
buildquote/app/login/page.tsx
buildquote/app/register/page.tsx
buildquote/app/dashboard/layout.tsx
buildquote/app/dashboard/page.tsx
buildquote/app/dashboard/DashboardClient.tsx
buildquote/app/api/auth/register/route.ts
buildquote/app/api/auth/passkey/register-options/route.ts
buildquote/app/api/auth/passkey/register-verify/route.ts
buildquote/app/api/auth/passkey/authenticate-options/route.ts
buildquote/app/api/auth/passkey/authenticate-verify/route.ts
buildquote/components/builder/JobsTab.tsx
buildquote/components/builder/SuppliersTab.tsx
buildquote/components/builder/FavouriteProductsTab.tsx
buildquote/components/builder/ProfilePanel.tsx
buildquote/supabase/builder_auth_tables.sql
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
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY   ← updated to AIzaSyCsyE_yaqU0a50XG6xggV60-aVkFoOmkYg
VERCEL_OIDC_TOKEN
```

## Next session priorities
1. Confirm supplier save is working (error alerts added, needs test)
2. Wire up RFQ auto-fill — when builder is logged in, pre-populate Step 4 (SendScreen) with builder details
3. Test passkey registration end-to-end
4. Commit everything on `builders-login` branch
5. Deploy to Vercel + update env vars there with new Maps API key
