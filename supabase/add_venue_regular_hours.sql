-- Structured weekly opening hours from Google Places API (New)
-- `regularOpeningHours.periods`, refreshed monthly via
-- scripts/backfill-venue-hours.mjs. "Open now" is computed server-side from
-- this data at request time (see lib/venueHours.ts) rather than trusting
-- Google's own `openNow` flag, which is a snapshot from fetch time and goes
-- stale immediately on a monthly cache.
--
-- Distinct from the existing `hours` text column (see
-- add_venue_hours_happy_hour.sql), which is a curator-written display
-- string maintained only for manually-vetted venues.
alter table public.venues
  add column if not exists regular_hours jsonb,
  add column if not exists regular_hours_fetched_at timestamptz;
