-- BuildQuote v6 (RFQ production) — knowledge_url on systems.
--
-- Design doc: "AI Knowledge Layer + Data Studio Workspace Redesign" §10.5.
-- Points at the canonical Studio knowledge-layer endpoint for this system,
-- so the v6 mirror route (/api/library/[manufacturer]/[system]/
-- knowledge.jsonld) and the <link rel="alternate"> tag on the library page
-- resolve without a cross-project lookup back into Data Studio.
--
-- Written by Data Studio's publish flow (apps/web/lib/studio-admin/
-- publish.ts, buildquote-data-studio repo) — this project never generates
-- the value itself. Purely additive; nothing existing reads or renders this
-- column, so it changes nothing about the customer-facing System Card.
--
-- Not applied anywhere by this session — no live Supabase credentials
-- available. Apply manually against the RFQ production project
-- (oxvhmulxuvlfjyjzleki), never against Data Studio.

alter table public.systems
  add column if not exists knowledge_url text;
