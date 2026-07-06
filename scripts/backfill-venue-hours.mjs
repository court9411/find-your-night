/**
 * Fetches structured weekly opening hours (via Places API New) for every
 * venue with a place_id, and caches them on venues.regular_hours. Hours
 * change rarely enough (holidays, ownership changes) that a monthly
 * refresh is plenty — venues whose cache is younger than HOURS_MAX_AGE_MS
 * are skipped.
 *
 * Run manually, safe to re-run: node scripts/backfill-venue-hours.mjs
 * (Not wired to a cron yet — this repo has no scheduler for its batch
 * scripts. Re-run monthly, or wire this into Vercel Cron / a GitHub Action
 * hitting a route that calls the same logic, once one exists.)
 *
 * Requires (already in .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   GOOGLE_MAPS_SERVER_KEY
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // service role key bypasses RLS
);

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_SERVER_KEY;
const HOURS_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // ~monthly
const REQUEST_DELAY_MS = 150; // stay well under Places QPS limits

// ── Places API (New) ─────────────────────────────────────────────────────────

async function fetchRegularHours(placeId) {
  const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
    headers: {
      "X-Goog-Api-Key": GOOGLE_API_KEY,
      "X-Goog-FieldMask": "regularOpeningHours",
    },
  });

  if (!res.ok) {
    throw new Error(`Place Details ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  // Google omits this field entirely for venues with no published hours.
  return data.regularOpeningHours ?? null;
}

// ── Supabase ─────────────────────────────────────────────────────────────────

async function fetchVenuesNeedingHours() {
  // Curated venues use synthetic place_ids (e.g. "curated-bar-29") for
  // venues that were never matched to a real Google Place — Google will
  // always 400 on these, so there's no point ever calling Places for them.
  const { data: venues, error } = await supabase
    .from("venues")
    .select("id, name, place_id, regular_hours_fetched_at")
    .not("place_id", "is", null)
    .neq("source", "curated");
  if (error) throw error;

  const now = Date.now();
  return venues.filter((v) => {
    if (!v.regular_hours_fetched_at) return true;
    return now - new Date(v.regular_hours_fetched_at).getTime() > HOURS_MAX_AGE_MS;
  });
}

async function updateVenueHours(venueId, regularHours) {
  const { error } = await supabase
    .from("venues")
    .update({
      regular_hours: regularHours,
      regular_hours_fetched_at: new Date().toISOString(),
    })
    .eq("id", venueId);
  if (error) throw error;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!GOOGLE_API_KEY) throw new Error("GOOGLE_MAPS_SERVER_KEY is not set");

  console.log("🕒 Venue hours backfill starting...\n");

  const venues = await fetchVenuesNeedingHours();
  console.log(`${venues.length} venue(s) need fresh hours (stale or missing).\n`);

  let refreshed = 0;
  let noHours = 0;
  let failed = 0;

  for (let i = 0; i < venues.length; i++) {
    const venue = venues[i];
    process.stdout.write(`[${i + 1}/${venues.length}] ${venue.name}... `);

    try {
      const regularHours = await fetchRegularHours(venue.place_id);
      // Stamp fetched_at either way — Google genuinely has no hours for some
      // venues, and we don't want to re-request those every single run.
      await updateVenueHours(venue.id, regularHours);
      if (regularHours) {
        console.log("✓");
        refreshed++;
      } else {
        console.log("— no hours available");
        noHours++;
      }
    } catch (err) {
      // Leave regular_hours_fetched_at untouched on a fetch failure so this
      // venue gets retried next run instead of waiting a full month.
      console.log(`✗ ${err.message}`);
      failed++;
    }

    await sleep(REQUEST_DELAY_MS);
  }

  console.log("\n" + "─".repeat(50));
  console.log(`\n🎉 Done. Refreshed: ${refreshed}, no hours: ${noHours}, failed: ${failed}`);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

main().catch((err) => {
  console.error("\n❌ Fatal error:", err);
  process.exit(1);
});
