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

  added_at timestamptz default now()
);

create index if not exists idx_rfq_draft_items_draft
on rfq_draft_items(draft_id);
