-- Track where each event came from (promoter submission vs. programmatic ingestion)
-- and store external IDs for safe re-ingestion / deduplication.
alter table public.pending_events
  add column if not exists source text not null default 'promoter',
  add column if not exists external_id text unique;
