# FYN Database — Operating Conventions

These are the patterns established through real curation work. Follow them by default; deviate only with a clear reason (and mention it).

## Lookups

- Always search with `ILIKE '%term%'`, never `=`. Venue/event names have naming variations (punctuation, "The" prefix, abbreviations) that exact match will miss and cause accidental duplicate inserts.
- When searching by name isn't conclusive, cross-check `lat`/`lng` proximity or `address` before assuming a match/non-match.

## Adding a new venue manually

1. `ILIKE` search first — assume it might already exist under a slightly different name.
2. If genuinely new and there's no real Google Place ID, use a synthetic placeholder: `manual_[venue-slug]` (lowercase, hyphenated) for `place_id`.
3. Set `venue_category` deliberately — don't leave the `daytime_outdoor` default if it's actually a bar/club/nightlife spot or an entertainment venue. This directly controls which home rail it shows up in.
4. Set `neighborhood` to match the existing neighborhood vocabulary used elsewhere in the table (check existing values rather than inventing new ones).
5. Set `market_id` to the correct market (Cincinnati = `25230814-dd6c-4694-b69f-feb41e118a3d`).
6. If it should show on Popular Picks immediately (cold-start), set `is_trending_featured = true` and optionally scope with `trending_featured_days`.
7. `source = 'curated'` for hand-added venues that should bypass the restaurant-exclusion heuristic.

## Deduplication

Before deleting a venue or event believed to be a duplicate:
1. Identify which row is canonical (usually: more complete data, has photos, has an event history) vs. which is the duplicate to remove.
2. Check every table in the FK graph (see `schema.md`) that references the row being deleted.
3. For each dependency, decide: reassign to the canonical row's ID, or delete the dependent row — never leave orphaned rows pointing at a deleted parent.
4. Delete the duplicate only after dependencies are handled.
5. This is DML (not DDL) — proceed directly per the skill's operating rule, but narrate what you're doing since it's irreversible.

Common near-duplicate patterns to watch for: "The " prefix differences, "&" vs "and", neighborhood suffix variations (e.g. "Whiskey Yard" vs "Whiskey Yard OTR"), and closed venues where a successor has already been added under a new name (e.g. Copper & Flame closed → Flame added as successor — don't treat these as the same venue needing a merge, they're historically distinct even if physically the same address).

## Photos

- `photo_source` must accurately reflect origin: `google` (API backfill, treat URLs as a refreshable cache — Google Places photo URLs expire, don't treat them as permanent per API terms), `promoter` (submitted via `/submit`), `user` (uploaded by app user), `findyournight` (shot/sourced by Courtney directly).
- Manually curated photos Courtney sources herself → always `findyournight`, never leave at the `google` default.

## Events

- `pending_events` needs BOTH `status = 'approved'` AND non-null `image_url` to actually display on-site. If an event isn't showing up and the row otherwise looks right, check these two fields first.
- Event entry goes through the site's native submission form, not bulk insertion via this skill — Claude can't upload images to Supabase Storage, which makes bulk event insertion unviable. This skill's role for events is querying, fixing, and reviewing existing rows, not bulk-creating new ones.
- `source = 'ticketmaster'` is the filter for the Big Shows rail — don't repurpose this value for other event types.
- The `trg_set_event_venue_id` trigger auto-resolves `venue_id` on insert/update via `match_venue_for_event()`. If venue linking looks wrong on an event, investigate the matching logic/threshold rather than patching `venue_id` by hand as a first move — hand-patching hides the underlying matching bug.

## Migrations (DDL)

- Use `apply_migration`, never `execute_sql`, for anything structural (new tables/columns/constraints/functions/triggers).
- Always propose the SQL and get explicit confirmation before applying — this is a hard rule, not a suggestion, regardless of how routine the change seems.
- Name migrations in clear snake_case describing the change (matches existing pattern, e.g. `add_venue_category_column`, `fix_pref_match_signal`).
- Don't hardcode references to generated IDs (UUIDs) in data migrations — resolve them via lookup within the migration instead.

## General judgment

- If a request would touch a large number of rows (bulk update/delete) without clear precedent above, treat it like schema: propose first, confirm, then execute.
- Flag data-quality drift noticed along the way even if unrelated to the immediate ask (miscategorized venue, wrong photo_source, missing market_id) — this skill owns data quality as a standing responsibility, not just the literal task in front of it.
