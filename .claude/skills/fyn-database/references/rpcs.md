# FYN Database — Custom Functions / RPCs

Pulled live from `pg_proc` on 2026-07-11. Re-verify signatures with a direct `pg_proc` query if something seems off — this is a snapshot, not guaranteed current as new functions ship.

## Ranking / rail queries (called from the app)

### `get_rail_venues(p_rail_type, p_user_id, p_lat, p_lng, p_market_id, p_limit, p_trending_threshold, p_day_of_week, p_categories)`
Returns: `venue_id, name, vibe_tags, distance_mi, price_level, rating, recent_score, is_trending_featured`
Powers the home-page rail system (Popular Picks, Date Night, Budget-Friendly, The Lineup). Handles `is_trending_featured`, day-of-week scoping via `p_day_of_week`, and category filtering via `p_categories`. This is the current, iterated-on version — the one to modify for rail behavior changes.

### `get_ranked_venues(p_user_id, p_anon_id, p_lat, p_lng, p_limit, p_market_id, p_categories)`
Returns: `venue_id, name, vibe_tags, distance_mi, final_score, matched_tags, budget_match`
General personalized venue ranking (not rail-specific) — used for search/discovery results ranked by `user_tag_affinity` + distance + budget match.

### `get_ranked_events(p_user_id, p_anon_id, p_lat, p_lng, p_limit, p_source, p_start_after, p_start_before, p_market_id)`
Returns: `event_id, event_name, venue_name, source, vibe_tags, event_dt, distance_mi, pref_score, time_score, distance_score, popularity_score, freshness_score, quality_score, final_score`
The full multi-signal event ranking function — combines preference match, time proximity, distance, popularity, freshness (via `source_boosts`), and quality into `final_score`. This is the most complex scoring function; changes here ripple broadly.

### `get_venue_live_events(p_venue_id)`
Returns: `event_id, event_name, description, vibe_tags, start_dt, end_dt, image_url, ticket_link`
Simple lookup — events currently live at a given venue (venue detail page).

### `rank_venues_for_user(p_vibes, p_price_levels, p_limit)` / `rank_tonight_events_for_user(p_vibes, p_price_levels, p_date, p_limit)`
**Likely legacy** — simpler vibe/price-only ranking without the personalization signals (`user_tag_affinity`, distance weighting) that `get_ranked_venues`/`get_ranked_events` have. Confirm with Courtney whether these are still called from the app or safe to deprecate before modifying or relying on them.

## Search

### `search_venues(p_query, p_market_id, p_limit)`
Returns: `id, name, neighborhood, place_id, similarity`
Trigram similarity search (`pg_trgm`) over venue names — the app's venue search, not for curation dedup lookups (use `ILIKE` for that per conventions.md, since dedup needs to catch near-matches a similarity threshold might miss or over-match).

## Personalization / onboarding

### `seed_onboarding_preferences(p_user_id, p_anon_id, p_selected_options)` — plpgsql
### `seed_tag_affinity_from_onboarding(p_user_id, p_anon_id, p_selected_options)` — sql
Both seed `user_tag_affinity` from onboarding selections via `onboarding_vibe_map`. The `seed_tag_affinity_from_onboarding` one is the fix that resolved the previously-no-op `pref_match` signal. Confirm which is actually called from the onboarding flow if working on this area — two similarly-named functions exist.

### `log_user_action(p_user_id, p_anon_id, p_target_type, p_target_id, p_action_type)`
Writes to `user_actions`, presumably looking up the weight from `action_weights` internally. The general-purpose behavioral logging entrypoint.

### `like_event(p_event_id, p_user_identifier)` → json / `increment_event_like(p_event_id, p_anon_id)` → integer
Two similarly-purposed like functions on `event_likes`/`pending_events.like_count`. Confirm which is the active one before modifying — possible legacy/replacement pair like the ranking functions above.

## Event/venue matching & data helpers

### `match_venue_for_event(p_venue_name, p_lat, p_lng)` → uuid
Resolves a venue match for an event by name + location. Called by the `set_event_venue_id()` trigger function on `pending_events` insert/update.

### `set_event_venue_id()` — trigger function
`BEFORE INSERT OR UPDATE` on `pending_events`, calls `match_venue_for_event()` to auto-populate `venue_id`.

### `resolve_market_id(p_venue_id, p_lat, p_lng)` → uuid
Resolves which market a venue/location belongs to — relevant for city-expansion work.

### `parse_event_datetime(p_date, p_time, p_timezone)` / `default_event_end(p_start_dt, p_timezone)`
Datetime parsing helpers for event ingestion. Note: `parse_event_datetime` is a separate concern from the flyer date-parser bug (year defaulting to stale value) that lives in app-layer code, not here — don't conflate the two if debugging date issues.

### `haversine_miles(lat1, lng1, lat2, lng2)` → double precision
Distance calculation used throughout the ranking functions for `distance_mi`.

### `handle_new_user()` — trigger function
Standard Supabase auth pattern — almost certainly fires on `auth.users` insert to create the corresponding `user_profiles` row. Confirm trigger attachment on `auth.users` if working in this area (wasn't visible in the `public` schema trigger query).

## Extension functions (not FYN-specific — ignore for app logic)

The `pg_proc` listing also includes a large set of `cube`, `earth`/`earth_distance`, and `pg_trgm` (`similarity`, `word_similarity`, `gtrgm_*`, `gin_trgm_*`, etc.) functions. These are from the `cube`, `earthdistance`, and `pg_trgm` Postgres extensions — infrastructure that `search_venues` and possibly `haversine_miles`-adjacent logic depend on, not custom FYN code. No need to reason about these individually.
