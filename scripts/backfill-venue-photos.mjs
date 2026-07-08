/**
 * Fetches a venue photo (via Places API New) for every venue with a
 * place_id, and caches it in venue_photos. Google's photo resource names
 * and media URIs aren't permanent, so this is a refreshable cache — venues
 * whose cached photo is younger than PHOTO_MAX_AGE_MS are skipped.
 *
 * Run manually, safe to re-run: node scripts/backfill-venue-photos.mjs
 * (Not wired to a cron yet — this repo has no scheduler for its batch
 * scripts. Re-run periodically, or wire this into Vercel Cron / a GitHub
 * Action hitting a route that calls the same logic, once one exists.)
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
const PHOTO_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const MAX_WIDTH_PX = 800; // sized for the venue card / detail hero
const REQUEST_DELAY_MS = 150; // stay well under Places QPS limits

// ── Places API (New) ─────────────────────────────────────────────────────────

async function fetchFirstPhotoRef(placeId) {
  const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
    headers: {
      "X-Goog-Api-Key": GOOGLE_API_KEY,
      "X-Goog-FieldMask": "photos",
    },
  });

  if (!res.ok) {
    throw new Error(`Place Details ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  return data.photos?.[0] ?? null;
}

async function fetchPhotoMedia(photoName) {
  const params = new URLSearchParams({
    maxWidthPx: String(MAX_WIDTH_PX),
    skipHttpRedirect: "true",
  });

  const res = await fetch(`https://places.googleapis.com/v1/${photoName}/media?${params}`, {
    headers: { "X-Goog-Api-Key": GOOGLE_API_KEY },
  });

  if (!res.ok) {
    throw new Error(`Photo media ${res.status}: ${await res.text()}`);
  }

  return res.json(); // { name, photoUri }
}

async function fetchVenuePhoto(placeId) {
  const photo = await fetchFirstPhotoRef(placeId);
  if (!photo) return null;

  const media = await fetchPhotoMedia(photo.name);
  const attribution = photo.authorAttributions?.[0] ?? null;

  return {
    photoUrl: media.photoUri,
    attributionName: attribution?.displayName ?? null,
    attributionUri: attribution?.uri ?? null,
  };
}

// ── Supabase ─────────────────────────────────────────────────────────────────

async function fetchVenuesNeedingPhotos() {
  // Some curated venues use synthetic place_ids (e.g. "curated-bar-29") for
  // venues never matched to a real Google Place — Google always 400s on
  // those. But plenty of curated venues *were* matched to a real listing
  // during curation and have a normal "ChIJ..." place_id, so excluding by
  // `source = 'curated'` wrongly skipped them too (found via Supabase MCP:
  // 15 curated venues had real place_ids and were silently never synced).
  // Filter on the place_id shape itself instead.
  const { data: venues, error: venuesError } = await supabase
    .from("venues")
    .select("id, name, place_id")
    .not("place_id", "is", null)
    .not("place_id", "like", "curated-%");
  if (venuesError) throw venuesError;

  // Scoped to our own 'google' rows — a venue can also have a promoter/user/
  // findyournight row now, and that row's freshness is unrelated to ours.
  const { data: existingPhotos, error: photosError } = await supabase
    .from("venue_photos")
    .select("venue_id, fetched_at")
    .eq("photo_source", "google");
  if (photosError) throw photosError;

  const fetchedAtByVenueId = new Map(existingPhotos.map((p) => [p.venue_id, p.fetched_at]));
  const now = Date.now();

  return venues.filter((v) => {
    const fetchedAt = fetchedAtByVenueId.get(v.id);
    if (!fetchedAt) return true;
    return now - new Date(fetchedAt).getTime() > PHOTO_MAX_AGE_MS;
  });
}

async function upsertVenuePhoto(venueId, photo) {
  const { error } = await supabase.from("venue_photos").upsert(
    {
      venue_id: venueId,
      photo_source: "google",
      photo_url: photo.photoUrl,
      attribution_name: photo.attributionName,
      attribution_uri: photo.attributionUri,
      fetched_at: new Date().toISOString(),
    },
    { onConflict: "venue_id,photo_source" }
  );
  if (error) throw error;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!GOOGLE_API_KEY) throw new Error("GOOGLE_MAPS_SERVER_KEY is not set");

  console.log("📷 Venue photo backfill starting...\n");

  const venues = await fetchVenuesNeedingPhotos();
  console.log(`${venues.length} venue(s) need a fresh photo (stale or missing).\n`);

  let refreshed = 0;
  let noPhoto = 0;
  let failed = 0;

  for (let i = 0; i < venues.length; i++) {
    const venue = venues[i];
    process.stdout.write(`[${i + 1}/${venues.length}] ${venue.name}... `);

    try {
      const photo = await fetchVenuePhoto(venue.place_id);
      if (!photo) {
        console.log("— no photo available");
        noPhoto++;
      } else {
        await upsertVenuePhoto(venue.id, photo);
        console.log("✓");
        refreshed++;
      }
    } catch (err) {
      console.log(`✗ ${err.message}`);
      failed++;
    }

    await sleep(REQUEST_DELAY_MS);
  }

  console.log("\n" + "─".repeat(50));
  console.log(`\n🎉 Done. Refreshed: ${refreshed}, no photo: ${noPhoto}, failed: ${failed}`);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

main().catch((err) => {
  console.error("\n❌ Fatal error:", err);
  process.exit(1);
});
