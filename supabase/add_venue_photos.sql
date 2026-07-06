-- Cached Google Places photos for venues. Google's photo names/media URIs
-- expire and aren't meant for permanent storage, so this is a refreshable
-- cache (see scripts/backfill-venue-photos.mjs) rather than a permanent
-- record — one row per venue, re-fetched when fetched_at goes stale.
create table if not exists public.venue_photos (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null unique references public.venues(id) on delete cascade,
  photo_url text not null,
  attribution_name text,
  attribution_uri text,
  fetched_at timestamptz not null default now()
);

-- RLS
alter table public.venue_photos enable row level security;

create policy "Allow anonymous read"
  on public.venue_photos
  for select
  to anon
  using (true);

-- Service role bypasses RLS by default in Supabase, so no insert/update
-- policy needed. Writes only happen from the batch script's service role key.
