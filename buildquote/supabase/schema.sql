-- ============================================================
-- BuildQuote — full database schema (no data)
-- Supabase project: oxvhmulxuvlfjyjzleki
-- Shared by: buildquote.com.au (RFQ + Builder Portal)
--            mfp.buildquote.com.au (Manufacturer Portal)
-- Last updated: 2026-05-20
-- ============================================================
-- Backup tables (backup_20260513_*) exist but are omitted —
-- they are point-in-time snapshots, not live tables.
-- ============================================================


-- ------------------------------------------------------------
-- MANUFACTURER PORTAL (mfp.buildquote.com.au)
-- ------------------------------------------------------------

create table if not exists manufacturers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  logo_url text,
  website_url text,
  description text,
  hero_image_url text,
  auth_user_id uuid,
  abn text,
  phone text,
  created_at timestamptz default now()
);

create table if not exists systems (
  id uuid primary key default gen_random_uuid(),
  manufacturer_id uuid not null references manufacturers(id),
  name text not null,
  product_code text not null,
  slug text not null,
  category text not null,
  subcategory text,
  description text,
  dimensions text,
  length_m numeric,
  double_sided boolean default false,
  hero_image_url text,
  notes text,
  sort_order integer default 0,
  website_url text,
  source_document_id uuid,
  verified_by text,
  verified_at timestamptz,
  change_notes text,
  source_label text,
  source_url text,
  verification_status text,
  sheet_format text,
  fire_rating text,
  acoustic_rating text,
  moisture_resistant boolean default false,
  structural_grade text,
  install_guide_url text,
  tech_data_url text,
  bal_rating text,
  created_at timestamptz default now()
);

create table if not exists system_profiles (
  id uuid primary key default gen_random_uuid(),
  system_id uuid not null references systems(id),
  name text,
  product_code text,
  profile_name text,
  dimensions text,
  sheet_format text,
  length_m numeric,
  length_mm numeric,
  width_mm numeric,
  height_mm numeric,
  thickness_mm numeric,
  depth_mm numeric,
  gauge_mm numeric,
  diameter_mm numeric,
  roll_m numeric,
  weight_kg numeric,
  weight_g numeric,
  pieces numeric,
  volume_ml numeric,
  pack_format text,
  bal_rating text,
  supplier_pack_qty numeric,
  supplier_pack_uom text,
  supplier_pack_note text,
  sort_order integer default 0,
  created_at timestamptz default now()
);

create table if not exists components (
  id uuid primary key default gen_random_uuid(),
  manufacturer_id uuid references manufacturers(id),
  sku text,
  name text not null,
  description text,
  category text,
  unit text,
  sort_order integer default 0,
  length_mm numeric,
  width_mm numeric,
  height_mm numeric,
  thickness_mm numeric,
  depth_mm numeric,
  gauge_mm numeric,
  diameter_mm numeric,
  roll_m numeric,
  weight_kg numeric,
  weight_g numeric,
  pieces numeric,
  volume_ml numeric,
  pack_format text,
  supplier_pack_qty numeric,
  supplier_pack_uom text,
  supplier_pack_note text
);

create table if not exists system_components (
  id uuid primary key default gen_random_uuid(),
  system_id uuid not null references systems(id),
  component_id uuid not null references components(id),
  role text default 'required',
  notes text,
  sort_order integer default 0
);

create table if not exists system_colours (
  id uuid primary key default gen_random_uuid(),
  system_id uuid not null references systems(id),
  colour_name text not null,
  sku text,
  image_url text,
  is_stocked boolean default true,
  sort_order integer default 0
);

create table if not exists catalogue_sources (
  id uuid primary key default gen_random_uuid(),
  manufacturer_id uuid not null references manufacturers(id),
  document_name text not null,
  document_url text,
  document_date text,
  extracted_at timestamptz default now(),
  extracted_by text,
  notes text,
  created_at timestamptz default now()
);

-- Portal suppliers (manufacturer portal registered suppliers — distinct from builder_suppliers)
create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  website_url text,
  email text,
  phone text,
  address text,
  suburb text,
  state text,
  abn text,
  manager_name text,
  it_name text,
  it_email text,
  portal_password text,
  auth_user_id uuid,
  created_at timestamptz default now()
);

create table if not exists supplier_systems (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references suppliers(id),
  system_id uuid not null references systems(id)
);

create table if not exists supplier_tokens (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references suppliers(id),
  token text not null,
  type text not null,
  used boolean not null default false,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz not null default now()
);

create table if not exists portal_contacts (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,  -- 'manufacturer' | 'supplier'
  entity_id uuid not null,
  name text not null,
  role text,
  email text,
  phone text,
  sort_order integer default 0,
  created_at timestamptz default now()
);

create table if not exists embed_widgets (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid references suppliers(id),
  manufacturer_id uuid references manufacturers(id),
  name text not null default 'My Widget',
  public_token text not null default encode(gen_random_bytes(16), 'hex'),
  status text default 'active',
  created_at timestamptz default now()
);

create table if not exists embed_widget_systems (
  id uuid primary key default gen_random_uuid(),
  embed_widget_id uuid not null references embed_widgets(id),
  system_id uuid not null references systems(id),
  sort_order integer default 0
);

-- View: products_by_manufacturer (read-only, joins systems + manufacturers + colours + components)
-- create view products_by_manufacturer as ...


-- ------------------------------------------------------------
-- RFQ FLOW (buildquote.com.au)
-- ------------------------------------------------------------

-- Anonymous draft sessions (id is uuid stored as text in rfq_draft_items)
create table if not exists rfq_drafts (
  id uuid primary key default gen_random_uuid(),
  status text default 'draft',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- draft_id stored as text (not FK) for flexibility with anonymous sessions
create table if not exists rfq_draft_items (
  id uuid primary key default gen_random_uuid(),
  draft_id text not null,
  component_id uuid,
  manufacturer text,
  system text,
  sku text,
  name text,
  description text,
  uom text,
  qty numeric default 1,
  length_mm numeric,
  width_mm numeric,
  height_mm numeric,
  thickness_mm numeric,
  depth_mm numeric,
  gauge_mm numeric,
  diameter_mm numeric,
  roll_m numeric,
  weight_kg numeric,
  pieces integer,
  created_at timestamptz default now()
);

-- Sent RFQ requests (logged on send)
create table if not exists rfq_requests (
  id uuid primary key default gen_random_uuid(),
  builder_name text not null,
  builder_email text not null,
  project_name text,
  project_reference text,
  delivery_location text,
  supplier_name text,
  supplier_email text,
  notes text,
  status text default 'draft',
  send_to_supplier boolean default true,
  terms_confirmed boolean default false,
  terms_confirmed_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists rfq_items (
  id uuid primary key default gen_random_uuid(),
  rfq_id uuid not null references rfq_requests(id),
  item_name text not null,
  sku text,
  quantity numeric,
  unit text,
  specification text,
  notes text,
  source text default 'manual',
  sort_order integer default 0,
  created_at timestamptz default now()
);

-- Enquiries from manufacturer portal embed widgets
create table if not exists rfq_enquiries (
  id uuid primary key default gen_random_uuid(),
  widget_id uuid references embed_widgets(id),
  system_id uuid references systems(id),
  system_name text,
  product_code text,
  supplier_name text,
  name text not null,
  email text not null,
  phone text,
  message text,
  created_at timestamptz default now()
);

-- Community waitlist
create table if not exists community_signups (
  id uuid primary key default gen_random_uuid(),
  email text,
  rfq_id text,
  created_at timestamptz default now()
);


-- ------------------------------------------------------------
-- BUILDER PORTAL (/dashboard)
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
create policy "Builders can view own profile"   on builders for select using (auth.uid() = id);
create policy "Builders can update own profile" on builders for update using (auth.uid() = id);
create policy "Builders can insert own profile" on builders for insert with check (auth.uid() = id);

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
create policy "Builders can manage own jobs" on builder_jobs for all using (auth.uid() = builder_id);
create index if not exists idx_builder_jobs_builder on builder_jobs(builder_id);

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
create policy "Builders can manage own suppliers" on builder_suppliers for all using (auth.uid() = builder_id);
create index if not exists idx_builder_suppliers_builder on builder_suppliers(builder_id);

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
create policy "Builders can manage own favourite products" on builder_favourite_products for all using (auth.uid() = builder_id);
create index if not exists idx_builder_fav_products_builder on builder_favourite_products(builder_id);

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
create policy "Builders can manage own passkeys" on builder_passkeys for all using (auth.uid() = builder_id);
create index if not exists idx_builder_passkeys_builder on builder_passkeys(builder_id);
create index if not exists idx_builder_passkeys_credential on builder_passkeys(credential_id);


-- ------------------------------------------------------------
-- STORAGE BUCKETS
-- Run policies after creating buckets in Supabase dashboard
-- ------------------------------------------------------------

-- Bucket: builder-logos (public) — CREATE IN DASHBOARD FIRST
create policy "Authenticated users can upload logos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'builder-logos');
create policy "Users can update own logos"
  on storage.objects for update to authenticated
  using (bucket_id = 'builder-logos' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Public can read logos"
  on storage.objects for select to public
  using (bucket_id = 'builder-logos');

-- Bucket: job-images (public) — CREATE IN DASHBOARD FIRST
create policy "Authenticated users can upload job images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'job-images');
create policy "Public can read job images"
  on storage.objects for select to public
  using (bucket_id = 'job-images');
create policy "Users can delete own job images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'job-images' and auth.uid()::text = (storage.foldername(name))[1]);
