/**
 * Discovers casual-fun / activity venues around Cincinnati/NKY that aren't in
 * the DB yet — the "casual fun" rail material: bowling, barcades/arcades, mini
 * golf, comedy, karaoke, axe throwing, escape rooms, pool halls, board-game
 * cafes, skating. Sibling of discover-venues.mjs (which does nightlife); this
 * inserts as venue_category = 'entertainment'.
 *
 * DRY-RUN by default (prints candidates, writes nothing). --apply inserts.
 * Excludes big chains + kid-party franchises (blocklist); lists what it
 * dropped so you can re-add any on purpose.
 *
 *   node scripts/discover-casual-fun.mjs           # dry run
 *   node scripts/discover-casual-fun.mjs --apply   # insert into venues (entertainment)
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GOOGLE_MAPS_SERVER_KEY
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_SERVER_KEY;
const APPLY = process.argv.includes("--apply");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const BOX = { latMin: 38.7, latMax: 39.5, lngMin: -85.0, lngMax: -84.0 };
const inBox = (la, ln) => la > BOX.latMin && la < BOX.latMax && ln > BOX.lngMin && ln < BOX.lngMax;

// Google primaryTypes that count as casual fun.
const FUN_TYPES = new Set([
  "bowling_alley", "amusement_center", "video_arcade", "arcade", "comedy_club",
  "karaoke", "karaoke_bar", "amusement_park", "pool_hall", "billiards",
  "escape_room_center", "miniature_golf_course", "roller_skating_rink", "ice_skating_rink",
]);
// Name keywords — Google's types are inconsistent for these, so also accept by name.
const FUN_WORDS = /\b(bowl|duckpin|arcade|barcade|pinball|mini.?golf|putt|comedy|karaoke|axe.?throw|escape room|billiard|pool hall|board game|skat(e|ing)|go.?kart|laser tag|trampoline|dueling piano)\b/i;

// Big chains + kid-party franchises to keep out (the small/independent focus).
const BLOCK = [
  "dave & buster", "dave and buster", "main event", "round1", "round 1", "topgolf",
  "chuck e", "urban air", "sky zone", "skyzone", "monkey joe", "get air", "defy",
  "altitude tramp", "launch trampoline", "amf ", "bowlero", "pinstripes", "punch bowl social",
  "andretti", "k1 speed", "malibu jack",
];

const QUERIES = [
  "bowling alley Cincinnati OH", "barcade arcade bar Cincinnati OH", "mini golf Cincinnati OH",
  "comedy club Cincinnati OH", "axe throwing Cincinnati OH", "escape room Cincinnati OH",
  "karaoke bar Cincinnati OH", "pool hall billiards Cincinnati OH", "board game cafe Cincinnati OH",
  "roller skating rink Cincinnati OH", "duckpin bowling Cincinnati OH", "things to do Newport Covington KY fun",
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
  if (!res.ok) { console.warn(`  query failed (${res.status}): ${query}`); return []; }
  return (await res.json()).places ?? [];
}

const isBlocked = (name) => BLOCK.some((c) => (name || "").toLowerCase().includes(c));

async function run() {
  if (!GOOGLE_API_KEY) throw new Error("GOOGLE_MAPS_SERVER_KEY missing");

  const { data: existing } = await supabase.from("venues").select("place_id, name");
  const existingIds = new Set((existing ?? []).map((v) => v.place_id));
  const existingNames = new Set((existing ?? []).map((v) => (v.name || "").toLowerCase().trim()));

  const byId = new Map();
  for (const q of QUERIES) { for (const p of await textSearch(q)) byId.set(p.id, p); await sleep(200); }
  console.log(`\n${byId.size} unique places returned across ${QUERIES.length} queries.\n`);

  const candidates = [], dropped = [];
  for (const p of byId.values()) {
    const name = p.displayName?.text || "";
    const loc = p.location;
    if (!loc || !inBox(loc.latitude, loc.longitude)) continue;
    if (existingIds.has(p.id) || existingNames.has(name.toLowerCase().trim())) continue;
    if (p.businessStatus && p.businessStatus !== "OPERATIONAL") continue;
    const types = new Set([p.primaryType, ...(p.types ?? [])]);
    const isFun = [...types].some((t) => FUN_TYPES.has(t)) || FUN_WORDS.test(name);
    if (!isFun) continue;
    if (isBlocked(name)) { dropped.push(name); continue; }
    candidates.push({
      name, primaryType: p.primaryType, address: p.formattedAddress,
      rating: p.rating ?? null, reviews: p.userRatingCount ?? 0,
      place_id: p.id, lat: loc.latitude, lng: loc.longitude,
    });
  }
  candidates.sort((a, b) => b.reviews - a.reviews);

  console.log(`=== ${candidates.length} NEW casual-fun candidates (not in DB, not chains) ===\n`);
  for (const c of candidates) {
    console.log(`${c.name}  [${c.primaryType}]  ★${c.rating ?? "?"} (${c.reviews})\n    ${c.address}\n    ${c.place_id}`);
  }
  if (dropped.length) console.log(`\nExcluded chains (${dropped.length}): ${[...new Set(dropped)].join(", ")}`);

  if (!APPLY) { console.log(`\n(DRY RUN — nothing written. Re-run with --apply to insert as entertainment.)`); return; }

  console.log(`\n--- APPLY: inserting ${candidates.length} as venue_category=entertainment ---`);
  let inserted = 0, failed = 0;
  for (const c of candidates) {
    const { data: marketId } = await supabase.rpc("resolve_market_id", { p_venue_id: null, p_lat: c.lat, p_lng: c.lng });
    const { error } = await supabase.from("venues").insert({
      place_id: c.place_id, name: c.name, address: c.address, lat: c.lat, lng: c.lng,
      venue_category: "entertainment", source: "google", market_id: marketId ?? null,
      rating: c.rating, types: c.primaryType ? [c.primaryType] : [], vibe_tags: [],
    });
    if (error) { console.log(`  [FAIL] ${c.name}: ${error.message}`); failed++; } else inserted++;
    await sleep(80);
  }
  console.log(`\nInserted ${inserted}, failed ${failed}. Run backfill-venue-photos.mjs + backfill-venue-hours.mjs next.`);
}

run().catch((e) => { console.error(e); process.exit(1); });
