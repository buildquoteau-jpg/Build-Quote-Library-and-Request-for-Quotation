-- ─────────────────────────────────────────────────────────────────────────────
-- OPTIONAL — Phase 2 library search foundation (PostgreSQL full-text search).
--
-- The current /library search runs entirely in the browser against the systems
-- already loaded on the page (lib/searchSynonyms.ts), so NOTHING here is required
-- for search to work today. Run this only when the library grows past a few
-- hundred systems and you want DB-side ranking instead of shipping every row to
-- the client.
--
-- Safe to run multiple times (idempotent). After running it, you can switch the
-- /api/library/systems route to a `.textSearch('search_vector', …)` query.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. The searchable, weight-tagged document column.
alter table systems add column if not exists search_vector tsvector;

-- 2. Keep it in sync on every insert/update. Weights:
--    A = name (most important) · B = category / BAL · C = other attrs · D = description.
create or replace function systems_search_vector_update()
returns trigger as $$
begin
  new.search_vector :=
    setweight(to_tsvector('english', coalesce(new.name, '')),             'A') ||
    setweight(to_tsvector('english', coalesce(new.category, '')),         'B') ||
    setweight(to_tsvector('english', coalesce(new.subcategory, '')),      'B') ||
    setweight(to_tsvector('english', coalesce(new.bal_rating, '')),       'B') ||
    setweight(to_tsvector('english', coalesce(new.fire_rating, '')),      'C') ||
    setweight(to_tsvector('english', coalesce(new.acoustic_rating, '')),  'C') ||
    setweight(to_tsvector('english', coalesce(new.structural_grade, '')), 'C') ||
    setweight(to_tsvector('english',
      case when new.moisture_resistant then 'moisture resistant water resistant wet area waterproof' else '' end), 'C') ||
    setweight(to_tsvector('english', coalesce(new.description, '')),      'D') ||
    setweight(to_tsvector('english', coalesce(new.notes, '')),           'D');
  return new;
end;
$$ language plpgsql;

drop trigger if exists systems_search_vector_trigger on systems;
create trigger systems_search_vector_trigger
  before insert or update on systems
  for each row execute function systems_search_vector_update();

-- 3. GIN index so searches stay fast at any scale.
create index if not exists systems_search_vector_idx on systems using gin (search_vector);

-- 4. Backfill existing rows (the trigger only fires on future writes).
update systems set search_vector =
    setweight(to_tsvector('english', coalesce(name, '')),             'A') ||
    setweight(to_tsvector('english', coalesce(category, '')),         'B') ||
    setweight(to_tsvector('english', coalesce(subcategory, '')),      'B') ||
    setweight(to_tsvector('english', coalesce(bal_rating, '')),       'B') ||
    setweight(to_tsvector('english', coalesce(fire_rating, '')),      'C') ||
    setweight(to_tsvector('english', coalesce(acoustic_rating, '')),  'C') ||
    setweight(to_tsvector('english', coalesce(structural_grade, '')), 'C') ||
    setweight(to_tsvector('english',
      case when moisture_resistant then 'moisture resistant water resistant wet area waterproof' else '' end), 'C') ||
    setweight(to_tsvector('english', coalesce(description, '')),      'D') ||
    setweight(to_tsvector('english', coalesce(notes, '')),           'D');
