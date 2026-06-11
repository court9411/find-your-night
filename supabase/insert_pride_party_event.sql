-- Pre-approved event: Annual Pride Party at Twenty-Two Ultra Lounge
insert into public.pending_events (
  event_name,
  date,
  start_time,
  end_time,
  venue_name,
  address,
  city,
  neighborhood,
  description,
  price,
  vibe_tags,
  submitter_email,
  status
) values (
  'The Annual Party for the Pride',
  '2026-06-26',
  '10:00 PM',
  '2:00 AM',
  'Twenty-Two Ultra Lounge',
  '340 Glensprings Drive, Springdale OH 45245',
  'Cincinnati',
  'Springdale',
  'The biggest Pride kickoff party of the weekend hosted by Boss Britt and KayKay The Host. Expect an electric crowd, live performances and nonstop energy all night.',
  'Ticketed',
  array['dance party', 'nightlife', 'Pride', 'live music'],
  'admin@findyournight.app',
  'approved'
);
