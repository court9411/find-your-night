-- Coordinates from Google Places Autocomplete on the submit form
alter table public.pending_events
  add column if not exists lat double precision,
  add column if not exists lng double precision;

alter table public.submissions
  add column if not exists lat double precision,
  add column if not exists lng double precision;
