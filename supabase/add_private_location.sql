-- Allow submitters to keep the exact venue/address private and show a note instead
alter table public.pending_events
  add column if not exists is_private_location boolean not null default false,
  add column if not exists private_location_note text;
