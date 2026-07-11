-- BuildQuote v6 — Library V7 hybrid publishing.
--
-- published_cards holds the immutable, renderer-ready snapshot of every
-- live-published System Card. Data Studio writes rows here (service role,
-- via the publish_card RPC); the public /library pages read exactly one
-- is_latest row per card. The database is only touched at publish time and
-- on ISR revalidation — the public page itself stays static/cacheable.
--
-- Versioning: publish auto-bumps the minor version ('1.0' → '1.1'). Old
-- version rows are retained (unique(card_id, version)); only one row per
-- card carries is_latest.

create table public.published_cards (
  id                   uuid primary key default gen_random_uuid(),
  card_id              uuid not null,             -- Data Studio staged_systems.id (stable identity)
  version              text not null,             -- '1.0', '1.1', '2.0', ...
  status               text not null default 'published'
                         check (status in ('published', 'unpublished')),
  mfr_slug             text not null,
  slug                 text not null,
  title                text not null,
  mfr_name             text not null,
  cover_url            text,                      -- gallery[0], used on tiles
  og_image_url         text,                      -- jpg sibling, crawler-safe share image
  summary_json         jsonb not null,            -- skinny tile payload (category, blurb, counts)
  card_json            jsonb not null,            -- full SystemCardSystem, URLs resolved to R2 public
  stockists_json       jsonb,                     -- fallback stockist copy frozen at publish (live join preferred)
  production_system_id uuid,                      -- legacy systems.id when promoted (stockists/favourites continuity)
  content_md           text,
  content_hash         text not null,
  sources_json         jsonb,
  is_latest            boolean not null default true,
  published_by         text,
  published_at         timestamptz not null default now(),
  unique (card_id, version)
);

-- Exactly one latest row per card; one latest row per public route.
create unique index published_cards_latest on public.published_cards (card_id) where is_latest;
create unique index published_cards_route  on public.published_cards (mfr_slug, slug) where is_latest;

alter table public.published_cards enable row level security;

-- Public read of published snapshots only; all writes come through the
-- service role (RLS-bypassing) publish_card RPC below.
create policy "anyone can read published cards"
  on public.published_cards
  for select
  using (status = 'published');

-- Atomic publish: retire the previous latest row and insert the new version
-- in one transaction. Called by Data Studio with the service role key.
create or replace function public.publish_card(payload jsonb)
returns public.published_cards
language plpgsql
security definer
set search_path = public
as $$
declare
  new_row public.published_cards;
begin
  update public.published_cards
     set is_latest = false
   where card_id = (payload->>'card_id')::uuid
     and is_latest;

  insert into public.published_cards (
    card_id, version, status, mfr_slug, slug, title, mfr_name,
    cover_url, og_image_url, summary_json, card_json, stockists_json,
    production_system_id, content_md, content_hash, sources_json,
    is_latest, published_by
  ) values (
    (payload->>'card_id')::uuid,
    payload->>'version',
    coalesce(payload->>'status', 'published'),
    payload->>'mfr_slug',
    payload->>'slug',
    payload->>'title',
    payload->>'mfr_name',
    payload->>'cover_url',
    payload->>'og_image_url',
    coalesce(payload->'summary_json', '{}'::jsonb),
    payload->'card_json',
    payload->'stockists_json',
    nullif(payload->>'production_system_id', '')::uuid,
    payload->>'content_md',
    payload->>'content_hash',
    payload->'sources_json',
    true,
    payload->>'published_by'
  )
  returning * into new_row;

  return new_row;
end;
$$;

-- Service-role only: no execute grant for anon/authenticated.
revoke execute on function public.publish_card(jsonb) from public;
revoke execute on function public.publish_card(jsonb) from anon;
revoke execute on function public.publish_card(jsonb) from authenticated;
