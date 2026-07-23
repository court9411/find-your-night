# FYN Database Schema

Snapshot pulled live from Supabase project `oywbwvvxmgdztwsemzpm` on 2026-07-11. All tables are in the `public` schema with RLS enabled unless noted.

Re-verify against `Supabase:list_tables` (verbose) if this feels stale — schema evolves via migrations that may not have been reflected back into this doc yet.

---

## Core content tables

### `venues` (473 rows)
The master venue table.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `place_id` | text, unique | Real Google Place ID, or synthetic `manual_[venue-slug]` for manually curated venues without one |
| `name` | text | |
| `address`, `lat`, `lng` | | |
| `types` | text[] | Google Places types |
| `rating`, `price_level` (1–4, checked) | | |
| `vibe_tags` | text[] | |
| `black_owned` | boolean | |
| `source` | text, default `'google'` | `google` \| `curated` — curated rows bypass the restaurant-exclusion heuristic since a human already vetted them as a real bar/club |
| `neighborhood` | text | |
| `why_tonight` | text | |
| `special_nights` | jsonb | |
| `hours` | text | legacy free-text hours |
| `happy_hour` | text | |
| `regular_hours` | jsonb + `regular_hours_fetched_at` | structured hours, fetched separately |
| `market_id` | uuid → `markets.id` | |
| `venue_category` | text, default `'daytime_outdoor'`, checked to `nightlife`/`entertainment`/`daytime_outdoor` | Drives which home-screen rail a venue appears in. `nightlife` = bars/clubs/casinos/curated restaurants. `entertainment` = theaters/bowling/concert venues/arenas. `daytime_outdoor` = parks, cemeteries, cafes, non-curated restaurants — the safe default for anything unclassified. **New venues need this set deliberately, don't leave it at default if it's actually a bar/club.** |
| `is_trending_featured` | boolean, default false | Manual cold-start flag for the Popular Picks/Trending rail. Used until real engagement (`venue_popularity.recent_score`) naturally displaces it. |
| `trending_featured_days` | text[] | Which nights `is_trending_featured` applies to, e.g. `{thursday,friday,saturday}`. NULL = every night. |

Referenced by: `venue_photos`, `pending_events.venue_id`, `user_venue_interactions.place_id`, `venue_checkins.venue_id`, `venue_visits.venue_id`.

### `pending_events` (408 rows)
All events — despite the name, this holds approved AND pending events; status field distinguishes.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `event_name`, `date`, `start_time`, `end_time` | | `date` is a real `date` type; times are free-text |
| `venue_name` | text | free-text venue name as submitted |
| `venue_id` | uuid → `venues.id`, nullable | resolved venue link — see `set_event_venue_id` trigger below |
| `address`, `lat`, `lng`, `neighborhood`, `city`, `state` | | |
| `price`, `price_level` (1-4, checked) | | `price_level` backfilled from Ticketmaster price text or falls back to linked venue's `price_level` |
| `ticket_link` | | |
| `vibe_tags` | text[], default `{}` | |
| `image_url` | text | **required (non-null) along with `status='approved'` for an event to actually display on-site** |
| `submitter_email` | | |
| `status` | text, default `'pending'` | `pending` \| `approved` (assumed — verify additional values if used) |
| `description` | | |
| `display_order`, `featured` | | |
| `category` | | |
| `source` | text, default `'promoter'` | e.g. `'promoter'`, `'ticketmaster'` — Big Shows rail filters on `source='ticketmaster'` |
| `external_id` | text, unique, nullable | dedup key for ingested events (e.g. Ticketmaster IDs) |
| `likes`, `like_count` | int, default 0 | |
| `why_tonight` | text | Ingestion-time editorial line (Haiku-generated), same pattern as `venues.why_tonight` — **not a live per-request LLM call** |
| `market_id` | uuid → `markets.id` | |
| `is_recurring` | boolean, default false | true = this row is a recurring template, not a one-off event |
| `recurrence_frequency` | text, checked `weekly`/`biweekly`/`monthly` | |
| `recurrence_days` | text[] | |
| `recurrence_end_date` | date | |
| `parent_event_id` | uuid → `pending_events.id` (self-FK) | Set on individual generated occurrences; NULL on the template row itself |
| `is_private_location`, `private_location_note` | | |

**Trigger**: `trg_set_event_venue_id` (BEFORE INSERT OR UPDATE) runs `set_event_venue_id()` — auto-resolves `venue_id` from `venue_name`/`lat`/`lng` via `match_venue_for_event()`. Don't manually fight this; if venue linking looks wrong, check the matching function/threshold rather than overriding case-by-case.

Referenced by: `event_likes.event_id`, `user_event_interactions.event_id`, `venue_visits.event_id`, self-referencing `parent_event_id`.

### `submissions` (0 rows)
Looks like an older/parallel submission table to `pending_events` — same shape minus event-specific fields (no date/time, has `type` instead). Confirm with Courtney whether this is legacy/unused before treating as active.

---

## User & engagement tables

### `user_profiles` (8 rows)
1:1 with `auth.users` via `id` FK.

| Column | Notes |
|---|---|
| `email`, `home_city`, `home_neighborhood`, `home_lat`, `home_lng` | |
| `vibe_prefs`, `music_prefs`, `activity_interests` | text[], default `{}` |
| `price_levels` | int2[], default `{}` |
| `anon_id` | links anonymous pre-signup activity to this profile |
| `is_admin` | boolean — Courtney's email is flagged true, excluded from popularity signals |
| `is_scout` | boolean — Founding Scout badge (original invited cohort). **No longer gates check-in ability** — scouting is open to all users now; trust is enforced via GPS proximity + rate limiting instead |

### `venue_checkins` (6 rows)
Scout check-ins at a venue (the "I'm here right now" signal).

| Column | Notes |
|---|---|
| `user_id`, `venue_id` | |
| `checkin_type` | default `'scout'`, checked `scout`/`entry` |
| `crowd_level` | checked `empty`/`filling_up`/`busy`/`packed` |
| `wait_minutes`, `cover_amount`, `music_tags`, `photo_url` | |
| `checkin_lat`, `checkin_lng` | **This is the proximity-verification data — GPS radius enforcement compares this against `venues.lat/lng`.** |

### `venue_visits` (0 rows)
Post-visit survey data — different from check-ins (after-the-fact reflection vs. real-time).

| Column | Notes |
|---|---|
| `user_id`, `venue_id`, `event_id` | |
| `prompted_from` | checked `saved_venue`/`saved_event` |
| `attended` | boolean |
| `rating` | 1–4 int, emotion scale: 1=Miss, 2=Good, 3=Great, 4=Incredible |
| `crowd_level` | checked `dead`/`decent`/`busy`/`packed` (note: different value set than `venue_checkins.crowd_level`) |
| `music_quality` | checked `wrong_vibe`/`fine`/`loved_it` |
| `price_sentiment` | checked `expensive`/`fair`/`cheap` |
| `would_return` | boolean |
| `surprise_note` | text, max 100 chars — the "what surprised you?" onboarding-style field |

### `user_actions` (2,597 rows)
Generic behavioral event log — the raw signal feed for personalization.

| Column | Notes |
|---|---|
| `user_id` (nullable), `anon_id` (nullable) | one or the other |
| `target_type` | checked `event`/`venue` |
| `target_id` | uuid, references either `pending_events.id` or `venues.id` depending on `target_type` (not a real FK, polymorphic) |
| `action_type` | FK → `action_weights.action_type` |
| `weight` | int2, denormalized copy of the weight at time of action |

### `action_weights` (8 rows) — lookup table
`action_type` (PK) → `weight` (int2). Defines how much each action type counts toward scoring.

### `user_tag_affinity` (1,100 rows)
Per-user vibe/tag scoring — the core personalization signal.

| Column | Notes |
|---|---|
| `user_id` (nullable), `anon_id` (nullable) | |
| `tag` | |
| `weight` | numeric, default 0 |
| `source` | default `'behavior'` — vs. seeded from onboarding, see `seed_tag_affinity_from_onboarding` RPC |

### `user_event_interactions` (10 rows) / `user_venue_interactions` (7 rows)
Explicit save/dismiss actions (separate from the passive `user_actions` log).
`interaction_type` checked `saved`/`not_interested` on both.

### `event_likes` (0 rows)
Simple like counter table, `event_id` + `user_identifier` (handles anonymous likes).

---

## Scoring & config tables

### `scoring_weights` (7 rows) — lookup table
`key` (PK, text) → `value` (numeric). Global scoring knobs (e.g. distance weighting — confirmed at 30% per recent tuning).

### `source_boosts` (2 rows) — lookup table
`source` (PK) → `freshness_bonus`, `freshness_decay_days` (default 14). Controls how much a fresh Ticketmaster/promoter event gets boosted and how fast that decays.

### `onboarding_vibe_map` (8 rows) — lookup table
`ui_option` (PK) → `tags` (text[]) → `seed_weight` (default 4). Maps onboarding UI selections to the tags/weights seeded into `user_tag_affinity`.

### `markets` (1 row)
`id`, `city`, `state`, `timezone` (default `America/New_York`), `lat`, `lng`, `status` (checked `curated`/`auto`/`unsupported`). Currently just Cincinnati (`25230814-dd6c-4694-b69f-feb41e118a3d`). This is the table to insert into for city expansion.

### `venue_photos` (417 rows)
| Column | Notes |
|---|---|
| `venue_id` → `venues.id` | |
| `photo_url`, `attribution_name`, `attribution_uri`, `fetched_at` | |
| `photo_source` | default `'google'`, checked `google`/`promoter`/`user`/`findyournight`. `google` = Places API backfill (**treat as a refreshable cache, not permanent**, per API terms). `findyournight` = shot/sourced by Courtney directly. |

---

## Full FK graph (for dedup/delete safety checks)

- `venues.id` ← `venue_photos.venue_id`, `pending_events.venue_id`, `user_venue_interactions.place_id` (via `venues.place_id`, not `id` — different key), `venue_checkins.venue_id`, `venue_visits.venue_id`
- `pending_events.id` ← `venue_visits.event_id`, `event_likes.event_id`, `user_event_interactions.event_id`, `pending_events.parent_event_id` (self)
- `markets.id` ← `pending_events.market_id`, `venues.market_id`
- `action_weights.action_type` ← `user_actions.action_type`
- `auth.users.id` ← `user_profiles.id`, `user_event_interactions.user_id`, `user_venue_interactions.user_id`, `user_actions.user_id`, `user_tag_affinity.user_id`, `venue_visits.user_id`, `venue_checkins.user_id`

**Before deleting a venue**: check `venue_photos`, `pending_events` (venue_id), `venue_checkins`, `venue_visits`, and `user_venue_interactions` (via `place_id` match, not `id`).
**Before deleting an event**: check `venue_visits`, `event_likes`, `user_event_interactions`, and any `pending_events` rows where it's the `parent_event_id`.
