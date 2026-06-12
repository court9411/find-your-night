-- Align submissions columns with pending_events so both tables support
-- category assignment, images, and the private-location feature.
alter table public.submissions
  add column if not exists category text,
  add column if not exists image_url text,
  add column if not exists place_id text,
  add column if not exists is_private_location boolean not null default false,
  add column if not exists private_location_note text;
