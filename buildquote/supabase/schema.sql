-- ============================================================
-- BuildQuote — full database schema (no data)
-- Supabase project: oxvhmulxuvlfjyjzleki
-- Last updated: 2026-05-20
-- ============================================================


-- ------------------------------------------------------------
-- RFQ drafts (pre-builders-login, unchanged)
-- ------------------------------------------------------------

create table if not exists rfq_drafts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  status text default 'draft'
);

create table if not exists rfq_draft_items (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid references rfq_drafts(id) on delete cascade,
  component_id text,
  manufacturer text,
  system text,
  sku text,
  name text,
  description text,
  uom text,
  qty numeric,
  length_mm numeric,
  width_mm numeric,
  height_mm numeric,
  thickness_mm numeric,
  depth_mm numeric,
  gauge_mm numeric,
  diameter_mm numeric,
  roll_m numeric,
  weight_kg numeric,
  pieces numeric,
  coverage_m2 numeric,
  added_at timestamptz default now()
);


-- ------------------------------------------------------------
-- Builder profile (extends auth.users)
-- ------------------------------------------------------------

create table if not exists builders (
  id uuid primary key references auth.users(id) on delete cascade,
  builder_name text,
  company_name text,
  abn text,
  company_address text,
  company_address_place_id text,
  email text,
  office_phone text,
  mobile_phone text,
  logo_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table builders enable row level security;

create policy "Builders can view own profile"
  on builders for select using (auth.uid() = id);

create policy "Builders can update own profile"
  on builders for update using (auth.uid() = id);

create policy "Builders can insert own profile"
  on builders for insert with check (auth.uid() = id);


-- ------------------------------------------------------------
-- Builder jobs / projects
-- ------------------------------------------------------------

create table if not exists builder_jobs (
  id uuid primary key default gen_random_uuid(),
  builder_id uuid references builders(id) on delete cascade,
  project_reference text,
  project_address text,
  project_address_place_id text,
  project_address_manual text,
  pm_name text,
  pm_mobile text,
  site_access_notes text,
  build_type text,
  image_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table builder_jobs enable row level security;

create policy "Builders can manage own jobs"
  on builder_jobs for all using (auth.uid() = builder_id);

create index if not exists idx_builder_jobs_builder on builder_jobs(builder_id);


-- ------------------------------------------------------------
-- Preferred suppliers
-- ------------------------------------------------------------

create table if not exists builder_suppliers (
  id uuid primary key default gen_random_uuid(),
  builder_id uuid references builders(id) on delete cascade,
  supplier_name text,
  supplier_address text,
  supplier_place_id text,
  supplier_email text,
  supplier_phone text,
  supplier_website text,
  account_number text,
  payment_type text check (payment_type in ('credit', 'upfront')),
  notes text,
  rep_name text,
  rep_mobile text,
  created_at timestamptz default now()
);

alter table builder_suppliers enable row level security;

create policy "Builders can manage own suppliers"
  on builder_suppliers for all using (auth.uid() = builder_id);

create index if not exists idx_builder_suppliers_builder on builder_suppliers(builder_id);


-- ------------------------------------------------------------
-- Favourite products (from manufacturer portal)
-- ------------------------------------------------------------

create table if not exists builder_favourite_products (
  id uuid primary key default gen_random_uuid(),
  builder_id uuid references builders(id) on delete cascade,
  product_id text,
  product_name text,
  manufacturer text,
  sku text,
  description text,
  uom text,
  notes text,
  created_at timestamptz default now()
);

alter table builder_favourite_products enable row level security;

create policy "Builders can manage own favourite products"
  on builder_favourite_products for all using (auth.uid() = builder_id);

create index if not exists idx_builder_fav_products_builder on builder_favourite_products(builder_id);


-- ------------------------------------------------------------
-- WebAuthn passkey credentials
-- ------------------------------------------------------------

create table if not exists builder_passkeys (
  id uuid primary key default gen_random_uuid(),
  builder_id uuid references builders(id) on delete cascade,
  credential_id text unique not null,
  public_key text not null,
  counter bigint not null default 0,
  device_type text,
  backed_up boolean default false,
  transports text[],
  created_at timestamptz default now()
);

alter table builder_passkeys enable row level security;

create policy "Builders can manage own passkeys"
  on builder_passkeys for all using (auth.uid() = builder_id);

create index if not exists idx_builder_passkeys_builder on builder_passkeys(builder_id);
create index if not exists idx_builder_passkeys_credential on builder_passkeys(credential_id);


-- ------------------------------------------------------------
-- Storage buckets (create in Supabase dashboard, then apply policies)
-- ------------------------------------------------------------

-- Bucket: builder-logos (public)
create policy "Authenticated users can upload logos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'builder-logos');

create policy "Users can update own logos"
  on storage.objects for update to authenticated
  using (bucket_id = 'builder-logos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Public can read logos"
  on storage.objects for select to public
  using (bucket_id = 'builder-logos');

-- Bucket: job-images (public)
create policy "Authenticated users can upload job images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'job-images');

create policy "Public can read job images"
  on storage.objects for select to public
  using (bucket_id = 'job-images');

create policy "Users can delete own job images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'job-images' and auth.uid()::text = (storage.foldername(name))[1]);
