-- Swipe signal from the Smart Night Picker (quiz + swipe-card flow on the
-- Picks page). Captures the quiz context (night/day, group size) alongside
-- the venue so a later job can roll these up into user_tag_affinity per-tag.
-- (user_tag_affinity already has writers today — seed_tag_affinity_from_picker
-- and seed_tag_affinity_from_onboarding — this table is a separate raw log,
-- not a replacement for those.)
--
-- APPLIED 2026-07-23 (DB session) — this file now documents the live schema,
-- it isn't a pending proposal anymore. Two tweaks made during review, both
-- reflected below: direction widened to accept 'left' as well as 'right'
-- (left-swipes/passes are cheap to log now and may be useful negative signal
-- later — no obligation to use it yet), and anon_id gets the same partial
-- index as user_id since most picker usage is pre-signup/anonymous.
-- (age_range dropped 2026-07-23 — the age question was removed from the
-- picker quiz entirely: doesn't account for family situations, added
-- friction, wasn't consumed anywhere downstream.)

create table if not exists public.picker_swipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  anon_id text,
  venue_id uuid not null references public.venues(id) on delete cascade,
  direction text not null default 'right' check (direction in ('left', 'right')),
  night_or_day text check (night_or_day in ('night', 'day')),
  group_size text check (group_size in ('solo', '2', '3-5', '6+')),
  created_at timestamptz not null default now()
);

-- Written only via the service role from /api/picker/swipe — no
-- client-facing RLS policies needed, same as event_likes.
alter table public.picker_swipes enable row level security;

create index if not exists picker_swipes_venue_id_idx on public.picker_swipes(venue_id);
create index if not exists picker_swipes_user_id_idx on public.picker_swipes(user_id) where user_id is not null;
create index if not exists picker_swipes_anon_id_idx on public.picker_swipes(anon_id) where anon_id is not null;

comment on table public.picker_swipes is 'Swipe signal from the Smart Night Picker quiz — captures quiz context alongside the venue so it can later be rolled up into user_tag_affinity (increment affinity for the venue''s vibe_tags per swipe-right; left-swipes available as negative signal if that becomes useful later).';
