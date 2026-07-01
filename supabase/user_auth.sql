-- ============================================================
-- User auth tables for Find Your Night
-- Run this in the Supabase SQL editor.
-- Does NOT alter venues, pending_events, submissions, or event_likes.
-- ============================================================

create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  home_city text,
  home_neighborhood text,
  vibe_prefs text[] default '{}',
  music_prefs text[] default '{}',
  price_levels smallint[] default '{}',
  activity_interests text[] default '{}',
  anon_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- event_id references the pending_events table (uuid primary key)
create table public.user_event_interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.pending_events(id) on delete cascade,
  interaction_type text not null check (interaction_type in ('saved','not_interested')),
  created_at timestamptz default now(),
  unique (user_id, event_id)
);

-- place_id is the venues.place_id (text) — we store it as text to avoid
-- coupling this table to venues.id uuid, since the app identifies venues
-- by place_id in the frontend.
create table public.user_venue_interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  place_id text not null,
  interaction_type text not null check (interaction_type in ('saved','not_interested')),
  created_at timestamptz default now(),
  unique (user_id, place_id)
);

-- RLS
alter table public.user_profiles enable row level security;
alter table public.user_event_interactions enable row level security;
alter table public.user_venue_interactions enable row level security;

create policy "own profile"
  on public.user_profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "own event interactions"
  on public.user_event_interactions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "own venue interactions"
  on public.user_venue_interactions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Auto-create a profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
