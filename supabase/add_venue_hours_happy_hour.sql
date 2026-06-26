-- Display-only hours/happy-hour text for the venue detail page. Only
-- populated for manually-curated venues — Google Places data (the bulk
-- ~120 bars/clubs) doesn't include real opening hours.
alter table public.venues
  add column if not exists hours text,
  add column if not exists happy_hour text;
