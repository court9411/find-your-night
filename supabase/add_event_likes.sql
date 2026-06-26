-- One-like-per-browser tracking for promoter events. Likes boost an
-- event's position in the "What's Happening" carousel (ordered by
-- like_count, newest first as a tiebreaker).

alter table public.pending_events
  add column if not exists like_count integer not null default 0;

create table if not exists public.event_likes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.pending_events(id) on delete cascade,
  anon_id text not null,
  created_at timestamptz not null default now(),
  unique (event_id, anon_id)
);

alter table public.event_likes enable row level security;

-- Atomically records a like (no-op if this anon_id already liked the
-- event) and returns the event's current like_count. Called via RPC
-- from the server using the service role, so no client-facing RLS
-- policies are needed on event_likes.
create or replace function public.increment_event_like(p_event_id uuid, p_anon_id text)
returns integer
language plpgsql
security definer
as $$
declare
  v_inserted boolean;
  v_count integer;
begin
  insert into public.event_likes (event_id, anon_id)
  values (p_event_id, p_anon_id)
  on conflict (event_id, anon_id) do nothing;

  v_inserted := found;

  if v_inserted then
    update public.pending_events
    set like_count = like_count + 1
    where id = p_event_id
    returning like_count into v_count;
  else
    select like_count into v_count from public.pending_events where id = p_event_id;
  end if;

  return v_count;
end;
$$;

grant execute on function public.increment_event_like(uuid, text) to anon, authenticated, service_role;
