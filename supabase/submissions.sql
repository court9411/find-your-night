create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  venue_name text not null,
  type text not null,
  neighborhood text not null,
  date_time text not null,
  description text not null,
  vibe_tags text,
  contact_email text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

alter table public.submissions enable row level security;

create policy "Allow anonymous inserts"
  on public.submissions
  for insert
  to anon
  with check (status = 'pending');
