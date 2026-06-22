-- ============================================================
-- RLS Migration — 2026-06-08 (idempotent — safe to re-run)
-- Enable Row Level Security on all public tables.
--
-- Strategy:
--   • Tables written only by server API routes (service role):
--     rfq_drafts, rfq_draft_items, community_signups → no anon policies.
--   • Tables with PII / auth tokens that must never be anon-readable:
--     supplier_tokens, portal_contacts, suppliers → no anon policies.
--   • Public read-only catalogue (product data):
--     manufacturers, systems, system_profiles, system_components,
--     system_colours, components, catalogue_sources,
--     embed_widgets, embed_widget_systems → anon SELECT only.
--   • rfq_enquiries → anon INSERT allowed (embed widget on third-party sites
--     uses anon key; no anon SELECT).
--   • rfq_requests, rfq_items already have RLS + policies in schema.sql —
--     confirmed here, no change needed.
--
-- Run in Supabase SQL editor (project: oxvhmulxuvlfjyjzleki).
-- Service-role bypasses RLS, so all server API routes continue to work.
-- Each policy is dropped before creation so the script is safe to re-run.
-- ============================================================


-- ── Draft tables (all writes now go via service-role API routes) ─────────────

alter table rfq_drafts enable row level security;
-- No anon policies — service role handles all reads/writes.

alter table rfq_draft_items enable row level security;
-- No anon policies — service role handles all reads/writes.


-- ── Community signups (written by /api/community server route) ───────────────

alter table community_signups enable row level security;
-- No anon policies — service role handles insert.


-- ── Sensitive tables — no public access ─────────────────────────────────────

alter table supplier_tokens enable row level security;
-- No policies — only accessible via service role in manufacturer portal backend.

alter table portal_contacts enable row level security;
-- No policies — only accessible via service role in manufacturer portal backend.

alter table suppliers enable row level security;
-- No policies — suppliers table contains portal_password and PII.
-- Manufacturer portal backend uses service role.


-- ── rfq_enquiries — embed widget inserts via anon key ───────────────────────

alter table rfq_enquiries enable row level security;
drop policy if exists "Anon can submit enquiries" on rfq_enquiries;
create policy "Anon can submit enquiries"
  on rfq_enquiries for insert to anon
  with check (true);


-- ── Public catalogue — anon read-only ───────────────────────────────────────

alter table manufacturers enable row level security;
drop policy if exists "Public can read manufacturers" on manufacturers;
create policy "Public can read manufacturers"
  on manufacturers for select to anon, authenticated
  using (true);

alter table systems enable row level security;
drop policy if exists "Public can read systems" on systems;
create policy "Public can read systems"
  on systems for select to anon, authenticated
  using (true);

alter table system_profiles enable row level security;
drop policy if exists "Public can read system profiles" on system_profiles;
create policy "Public can read system profiles"
  on system_profiles for select to anon, authenticated
  using (true);

alter table system_components enable row level security;
drop policy if exists "Public can read system components" on system_components;
create policy "Public can read system components"
  on system_components for select to anon, authenticated
  using (true);

alter table system_colours enable row level security;
drop policy if exists "Public can read system colours" on system_colours;
create policy "Public can read system colours"
  on system_colours for select to anon, authenticated
  using (true);

alter table components enable row level security;
drop policy if exists "Public can read components" on components;
create policy "Public can read components"
  on components for select to anon, authenticated
  using (true);

alter table catalogue_sources enable row level security;
drop policy if exists "Public can read catalogue sources" on catalogue_sources;
create policy "Public can read catalogue sources"
  on catalogue_sources for select to anon, authenticated
  using (true);

alter table embed_widgets enable row level security;
drop policy if exists "Public can read embed widgets" on embed_widgets;
create policy "Public can read embed widgets"
  on embed_widgets for select to anon, authenticated
  using (true);

alter table embed_widget_systems enable row level security;
drop policy if exists "Public can read embed widget systems" on embed_widget_systems;
create policy "Public can read embed widget systems"
  on embed_widget_systems for select to anon, authenticated
  using (true);


-- ── Storage: bind INSERT path to uploader's own folder ──────────────────────
-- Fixes finding #5: INSERT policies only checked bucket_id, not the user's folder.

drop policy if exists "Authenticated users can upload logos" on storage.objects;
drop policy if exists "Users can upload own logos" on storage.objects;
create policy "Users can upload own logos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'builder-logos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Authenticated users can upload job images" on storage.objects;
drop policy if exists "Users can upload own job images" on storage.objects;
create policy "Users can upload own job images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'job-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
