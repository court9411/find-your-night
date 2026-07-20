/**
 * Discovers small/independent nightlife venues around Cincinnati/NKY that
 * aren't in the DB yet, via Google Places (New) Text Search. DRY-RUN ONLY —
 * prints candidates, writes nothing. Deliberately biased away from big chains
 * (blocklist + a "same name at 3+ locations" heuristic) toward independent
 * spots, per the launch focus.
 *
 *   node scripts/discover-venues.mjs
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GOOGLE_MAPS_SERVER_KEY
 *
 * Nothing here inserts venues — deciding what to add (and whether it lands in
 * pending_venues for admin review vs. straight into venues) is a separate call.
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_SERVER_KEY;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const BOX = { latMin: 38.7, latMax: 39.5, lngMin: -85.0, lngMax: -84.0 };
const inBox = (la, ln) => la > BOX.latMin && la < BOX.latMax && ln > BOX.lngMin && ln < BOX.lngMax;

// Nightlife-ish types — a candidate must carry at least one of these.
const NIGHTLIFE_TYPES = new Set(["bar", "night_club", "wine_bar", "pub", "brewery", "bar_and_grill"]);

// Big/regional chains to keep out — the ask is small, independent spots.
const CHAIN_BLOCKLIST = [
  "applebee", "buffalo wild wings", "tgi friday", "hooters", "twin peaks", "bj's",
  "yard house", "dave & buster", "dave and buster", "texas roadhouse", "chili's",
  "outback", "olive garden", "red lobster", "cheesecake factory", "hard rock",
  "miller's ale house", "bar louie", "old chicago", "brewsters", "mccdonald",
  "chipotle", "starbucks", "skyline chili", "larosa", "gold star", "first watch",
  "cooper's hawk", "the pub ", "world of beer", "tin roof", "punch bowl social",
];

const QUERIES = [
  "cocktail bar Cincinnati OH",
  "dive bar Cincinnati OH",
  "wine bar Cincinnati OH",
  "night club Cincinnati OH",
  "lounge Cincinnati OH",
  "live music venue Cincinnati OH",
  "hookah lounge Cincinnati OH",
  "bar Over-the-Rhine Cincinnati OH",
  "bar Northside Cincinnati OH",
  "bar Walnut Hills Cincinnati OH",
  "bar Covington KY",
  "bar Newport KY",
];

async function textSearch(query) {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "X-Goog-Api-Key": GOOGLE_API_KEY,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.location,places.primaryType,places.types,places.rating,places.userRatingCount,places.businessStatus",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      textQuery: query,
      locationBias: { circle: { center: { latitude: 39.1031, longitude: -84.512 }, radius: 40000 } },
      maxResultCount: 20,
    }),
  });
  if (!res.ok) {
    console.warn(`  query failed (${res.status}): ${query}`);
    return [];
  }
  const data = await res.json();
  return data.places ?? [];
}

const isChain = (name) => CHAIN_BLOCKLIST.some((c) => (name || "").toLowerCase().includes(c));

async function run() {
  if (!GOOGLE_API_KEY) throw new Error("GOOGLE_MAPS_SERVER_KEY missing");

  // Existing place_ids + normalized names for dedup.
  const { data: existing } = await supabase.from("venues").select("place_id, name");
  const existingIds = new Set((existing ?? []).map((v) => v.place_id));
  const existingNames = new Set((existing ?? []).map((v) => (v.name || "").toLowerCase().trim()));

  const byId = new Map();
  for (const q of QUERIES) {
    const places = await textSearch(q);
    for (const p of places) byId.set(p.id, p);
    await sleep(200);
  }
  console.log(`\n${byId.size} unique places returned across ${QUERIES.length} queries.\n`);

  // Count name frequency to catch chains not on the blocklist (same name at 3+ spots).
  const nameFreq = new Map();
  for (const p of byId.values()) {
    const n = (p.displayName?.text || "").toLowerCase();
    nameFreq.set(n, (nameFreq.get(n) || 0) + 1);
  }

  const candidates = [];
  for (const p of byId.values()) {
    const name = p.displayName?.text || "";
    const loc = p.location;
    if (!loc || !inBox(loc.latitude, loc.longitude)) continue;
    if (existingIds.has(p.id) || existingNames.has(name.toLowerCase().trim())) continue; // already have it
    if (p.businessStatus && p.businessStatus !== "OPERATIONAL") continue; // closed/temp closed
    const types = new Set([p.primaryType, ...(p.types ?? [])]);
    if (![...types].some((t) => NIGHTLIFE_TYPES.has(t))) continue; // not nightlife-ish
    if (isChain(name) || (nameFreq.get(name.toLowerCase()) ?? 0) >= 3) continue; // chain

    candidates.push({
      name,
      primaryType: p.primaryType,
      address: p.formattedAddress,
      rating: p.rating ?? null,
      reviews: p.userRatingCount ?? 0,
      place_id: p.id,
      lat: loc.latitude,
      lng: loc.longitude,
    });
  }

  // Most-established first (review count as a rough legitimacy signal).
  candidates.sort((a, b) => b.reviews - a.reviews);

  console.log(`=== ${candidates.length} NEW candidate venues (not in DB, not chains) ===\n`);
  for (const c of candidates) {
    console.log(
      `${c.name}  [${c.primaryType}]  ★${c.rating ?? "?"} (${c.reviews})\n` +
        `    ${c.address}\n` +
        `    ${c.place_id}  |  ${c.lat},${c.lng}`
    );
  }
  console.log(`\n(${candidates.length} candidates — nothing written. Decide which to add and where.)`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
