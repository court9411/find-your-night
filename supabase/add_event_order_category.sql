-- Manual ordering, pinning, and vibe-category assignment for pending_events
alter table public.pending_events
  add column if not exists display_order integer not null default 0,
  add column if not exists featured boolean not null default false,
  add column if not exists category text;
