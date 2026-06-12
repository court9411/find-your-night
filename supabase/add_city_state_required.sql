-- Every event/venue must have a city. Backfill any existing rows that are
-- missing one before enforcing the constraint.
update public.pending_events set city = 'Unknown' where city is null or city = '';
alter table public.pending_events alter column city set not null;

alter table public.submissions alter column city set not null;

-- Capture the state abbreviation (e.g. OH, KY, IN) from city autocomplete /
-- reverse geocoding. Not used for matching yet, just stored.
alter table public.pending_events add column if not exists state text;
alter table public.submissions add column if not exists state text;
