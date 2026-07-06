-- venue_photos can now hold more than one photo per venue — one per source
-- (promoter upload, findyournight-sourced, user-submitted, Google backfill)
-- — instead of a single cached row. Selection priority at read time lives
-- in lib/venueMappers.ts (pickVenuePhoto): promoter > findyournight > user > google.
--
-- NOTE: this column/constraint change was already applied directly against
-- the live database by the DB-side session. This file exists for repo
-- parity/history only — no need to re-run it if the live schema already
-- matches (re-running is safe/idempotent either way).
alter table public.venue_photos
  add column if not exists photo_source text not null default 'google';

alter table public.venue_photos
  drop constraint if exists venue_photos_venue_id_key;

create unique index if not exists venue_photos_venue_id_photo_source_key
  on public.venue_photos (venue_id, photo_source);
