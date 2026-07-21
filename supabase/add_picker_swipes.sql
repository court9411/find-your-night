-- Swipe-right signal from the Smart Night Picker (quiz + swipe-card flow
-- on the Picks page). Captures the quiz context (night/day, group size,
-- age range) alongside the venue so a later job can roll these up into
-- user_tag_affinity per-tag, once that table's real schema is confirmed
-- (nothing in the app repo currently writes to it — see picker plan).
--
-- PROPOSED — not yet applied. Written by request during planning; review
-- and run manually, same as the other loose .sql files in this folder.

create table if not exists public.picker_swipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  anon_id text,
  venue_id uuid not null references public.venues(id) on delete cascade,
  direction text not null default 'right' check (direction in ('right')),
  night_or_day text check (night_or_day in ('night', 'day')),
  group_size text check (group_size in ('solo', '2', '3-5', '6+')),
  age_range text check (age_range in ('21-24', '25-29', '30-34', '35-44', '45+')),
  created_at timestamptz not null default now()
);

-- Written only via the service role from /api/picker/swipe — no
-- client-facing RLS policies needed, same as event_likes.
alter table public.picker_swipes enable row level security;

create index if not exists picker_swipes_venue_id_idx on public.picker_swipes(venue_id);
create index if not exists picker_swipes_user_id_idx on public.picker_swipes(user_id) where user_id is not null;

comment on table public.picker_swipes is 'Swipe-right signal from the Smart Night Picker quiz — captures quiz context alongside the venue so it can later be rolled up into user_tag_affinity (increment affinity for the venue''s vibe_tags per swipe-right).';
