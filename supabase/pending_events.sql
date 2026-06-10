-- Create pending_events table
create table if not exists public.pending_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  date date not null,
  start_time text not null,
  venue_name text not null,
  address text not null,
  price text,
  ticket_link text,
  vibe_tags text[] default '{}',
  image_url text,
  submitter_email text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.pending_events enable row level security;

-- Policy: Allow anonymous to insert
create policy "Allow anonymous inserts"
  on public.pending_events
  for insert
  to anon
  with check (status = 'pending');

-- Policy: Allow anonymous to read approved events
create policy "Allow anonymous read approved"
  on public.pending_events
  for select
  to anon
  using (status = 'approved');

-- Policy: Allow authenticated admins to manage
create policy "Allow admin full access"
  on public.pending_events
  for all
  to authenticated
  using (true)
  with check (true);
