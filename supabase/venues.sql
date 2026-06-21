create table venues (
  id uuid primary key default gen_random_uuid(),
  place_id text unique not null,
  name text not null,
  address text,
  lat float8,
  lng float8,
  types text[],
  rating float4,
  price_level int2,
  vibe_tags text[],
  last_updated timestamptz default now()
);

-- This index makes vibe queries fast
create index on venues using gin(vibe_tags);

-- RLS
alter table public.venues enable row level security;

create policy "Allow anonymous read"
  on public.venues
  for select
  to anon
  using (true);

-- Service role bypasses RLS by default in Supabase, so no insert policy needed.
-- Writes go through the service role key only (server-side).
