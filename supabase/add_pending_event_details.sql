-- Add fields needed to surface approved pending_events in search results
alter table public.pending_events
  add column if not exists description text,
  add column if not exists neighborhood text,
  add column if not exists city text,
  add column if not exists end_time text;

-- Address is often unavailable from link/image extraction; don't block inserts on it
alter table public.pending_events
  alter column address drop not null;
