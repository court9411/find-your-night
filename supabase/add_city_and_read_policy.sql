alter table public.submissions add column if not exists city text not null default '';

create policy "Allow anonymous read of approved submissions"
  on public.submissions
  for select
  to anon
  using (status = 'approved');
