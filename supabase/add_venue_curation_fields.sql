-- Fields for manually-curated venues (e.g. Black-owned bars researched via
-- The Voice of Black Cincinnati and similar community sources), distinct
-- from the bulk Google Places import.

alter table public.venues
  add column if not exists black_owned boolean,
  add column if not exists source text default 'google',
  add column if not exists neighborhood text,
  add column if not exists why_tonight text;

-- Curated venues are human-vetted as legitimate bars/nightlife spots even
-- when Google also tags them "restaurant" (e.g. a bar & grill) — the
-- restaurant-exclusion filter in /api/search skips this check for them.
comment on column public.venues.source is 'google | curated — curated rows bypass the restaurant-exclusion heuristic since a person already vetted them as a real bar/club';
