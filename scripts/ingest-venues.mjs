/**
 * FYN Venue Ingestion Script
 * Run once: node scripts/ingest-venues.mjs
 * Re-run anytime to refresh/add new venues (safe to re-run, uses upsert)
 *
 * Requires these env vars (already in your .env.local):
 *   ANTHROPIC_API_KEY
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   GOOGLE_MAPS_API_KEY (or whatever you named it)
 */

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

// ── Clients ──────────────────────────────────────────────────────────────────

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // service role key bypasses RLS
);

// ── Config ───────────────────────────────────────────────────────────────────

// Cincinnati city center
const CINCINNATI = { lat: 39.1031, lng: -84.512 };

// Radius in meters — 20km covers the metro area including Hyde Park, OTR, Covington
const RADIUS = 20000;

// Google Places types to search. Each gets its own paginated request.
const VENUE_TYPES = [
  "bar",
  "night_club",
  "restaurant",
  "cafe",
  "bowling_alley",
  "movie_theater",
  "amusement_park",
  "museum",
  "art_gallery",
  "park",
  "zoo",
  "aquarium",
];

// Your vibe taxonomy — keep this in sync with your UI vibe selector
const VIBE_TAXONOMY = [
  "date-night",
  "low-key",
  "hype",
  "live-music",
  "dancing",
  "rooftop",
  "day-drink",
  "after-work",
  "lgbtq-friendly",
  "sports",
  "cocktails",
  "dive-bar",
  "outdoor",
  "arts-culture",
  "family-friendly",
];

// Google Maps API key — update this to match your actual env var name
const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_SERVER_KEY;

// ── Google Places ─────────────────────────────────────────────────────────────

async function fetchPlacesPage(type, pageToken = null) {
  const params = new URLSearchParams({
    location: `${CINCINNATI.lat},${CINCINNATI.lng}`,
    radius: String(RADIUS),
    type,
    key: GOOGLE_API_KEY,
  });

  if (pageToken) {
    params.set("pagetoken", pageToken);
  }

  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params}`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    throw new Error(`Places API error: ${data.status} — ${data.error_message}`);
  }

  return data;
}

// Types where Google returns sub-locations (exhibits, sections) that all carry
// the parent type — cap these to the single top result to avoid noise.
const SINGLE_RESULT_TYPES = new Set(["zoo", "aquarium"]);

async function fetchAllVenuesForType(type) {
  const venues = [];
  let pageToken = null;
  let page = 0;

  do {
    // Google requires a 2-second delay before using a next_page_token
    if (pageToken) await sleep(2000);

    const data = await fetchPlacesPage(type, pageToken);
    const results = (data.results || []).filter(v => v.types?.includes(type));

    if (SINGLE_RESULT_TYPES.has(type)) {
      // Only take the top result (highest rating / most prominent)
      if (results.length > 0) venues.push(results[0]);
      break;
    }

    venues.push(...results);
    pageToken = data.next_page_token || null;
    page++;

    console.log(
      `  [${type}] Page ${page}: ${data.results?.length ?? 0} results`
    );
  } while (pageToken && page < 3); // max 3 pages = 60 results per type

  return venues;
}

// ── Claude Haiku Vibe Classification ─────────────────────────────────────────

async function classifyVibes(venue) {
  const priceLabel =
    venue.price_level != null
      ? ["free", "inexpensive", "moderate", "pricey", "expensive"][
          venue.price_level
        ]
      : "unknown price";

  const prompt = `You are tagging venues for a Cincinnati nightlife discovery app called Find Your Night.

Venue: ${venue.name}
Google types: ${venue.types?.join(", ") || "unknown"}
Price level: ${priceLabel}
Rating: ${venue.rating ?? "no rating"}/5

From the list below, return ONLY the tags that clearly apply to this venue.
Tags: ${VIBE_TAXONOMY.join(", ")}

Rules:
- Return a JSON array of strings only — no explanation, no markdown, no extra text
- Only include tags you're confident about based on the venue name and type
- A dive bar should NOT get "cocktails" or "date-night"
- A fine dining restaurant should NOT get "dive-bar" or "hype"
- If nothing clearly applies, return []

Example output: ["cocktails", "date-night", "after-work"]`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 100,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.content[0].text.trim()
      .replace(/^```json\n?/, '').replace(/\n?```$/, '');
    const parsed = JSON.parse(raw);

    // Validate — only keep tags from the taxonomy
    return parsed.filter((tag) => VIBE_TAXONOMY.includes(tag));
  } catch (err) {
    console.warn(`  ⚠ Vibe classification failed for "${venue.name}": ${err.message}`);
    return [];
  }
}

// ── Supabase Upsert ───────────────────────────────────────────────────────────

async function upsertVenue(venue, vibeTags) {
  const { error } = await supabase.from("venues").upsert(
    {
      place_id: venue.place_id,
      name: venue.name,
      address: venue.vicinity,
      lat: venue.geometry?.location?.lat ?? null,
      lng: venue.geometry?.location?.lng ?? null,
      types: venue.types ?? [],
      rating: venue.rating ?? null,
      price_level: venue.price_level ?? null,
      vibe_tags: vibeTags,
      last_updated: new Date().toISOString(),
    },
    { onConflict: "place_id" } // if venue already exists, update it
  );

  if (error) {
    console.error(`  ✗ Supabase error for "${venue.name}": ${error.message}`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌆 FYN Venue Ingestion Starting...\n");

  // Step 1: Pull all venues from Google Places (deduplicated by place_id)
  const allVenues = new Map();

  for (const type of VENUE_TYPES) {
    console.log(`\nFetching ${type}s from Google Places...`);
    const venues = await fetchAllVenuesForType(type);

    for (const v of venues) {
      if (!allVenues.has(v.place_id)) {
        allVenues.set(v.place_id, v);
      }
    }
  }

  const venues = Array.from(allVenues.values());
  console.log(`\n✅ Total unique venues found: ${venues.length}`);
  console.log("─".repeat(50));

  // Step 2: Classify each venue with Claude Haiku and store in Supabase
  console.log("\nClassifying vibes + saving to Supabase...\n");

  let saved = 0;
  let failed = 0;

  for (let i = 0; i < venues.length; i++) {
    const venue = venues[i];
    process.stdout.write(`[${i + 1}/${venues.length}] ${venue.name}... `);

    const vibeTags = await classifyVibes(venue);
    await upsertVenue(venue, vibeTags);

    console.log(`✓ [${vibeTags.join(", ") || "no tags"}]`);
    saved++;

    // Small delay between Claude calls to stay within rate limits
    await sleep(150);
  }

  console.log("\n" + "─".repeat(50));
  console.log(`\n🎉 Done! ${saved} venues saved to Supabase.`);
  console.log(
    `Estimated Claude cost: ~$${((venues.length * 0.001) / 1).toFixed(2)}`
  );
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

main().catch((err) => {
  console.error("\n❌ Fatal error:", err);
  process.exit(1);
});
