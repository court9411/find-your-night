/**
 * One-off loader for the second curated batch: not Black-owned, but with
 * a strong Black community presence (Yelp "Black Nightlife"/VOBC sourced,
 * June 2026). Only the "high confidence" tier with confirmed addresses —
 * the moderate/needs-verification/low-confidence tiers from that research
 * pass were intentionally left out per the source notes (unconfirmed
 * addresses, "verify before adding", or event-specific rather than a
 * general bar listing — e.g. The Redmoor and Hard Rock Casino).
 *
 * Run once: node scripts/ingest-cultural-venues-batch2.mjs
 * Safe to re-run — upserts by place_id.
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_SERVER_KEY;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function geocode(address, attempt = 1) {
  if (!address) return { lat: null, lng: null };
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`
    );
    const data = await res.json();
    const loc = data?.results?.[0]?.geometry?.location;
    if (typeof loc?.lat !== "number" || typeof loc?.lng !== "number") {
      if (attempt < 3) {
        await sleep(1000 * attempt);
        return geocode(address, attempt + 1);
      }
      console.warn(`    (status: ${data?.status}, ${data?.error_message ?? "no message"})`);
      return { lat: null, lng: null };
    }
    return { lat: loc.lat, lng: loc.lng };
  } catch (err) {
    if (attempt < 3) {
      await sleep(1000 * attempt);
      return geocode(address, attempt + 1);
    }
    console.warn(`    (fetch error: ${err.message})`);
    return { lat: null, lng: null };
  }
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// Already in the venues table from the Google Places import — update in
// place rather than insert duplicates. Matched by their real place_id.
const EXISTING_UPDATES = [
  {
    place_id: "ChIJsyGmo-KzQYgRUBPqJh7if30", // OTR LIVE
    neighborhood: "OTR",
    black_owned: false,
    why_tonight: "Live music and dancing most nights in the heart of OTR — a regular host for local promoter events.",
  },
  {
    place_id: "ChIJ085b78WxQYgRF8yXcqYH3SY", // Tulua Nightclub and Cocktail Bar
    neighborhood: "Downtown / CBD",
    black_owned: false,
    why_tonight: "Downtown's dress-to-impress nightclub — VIP tables and a packed dance floor most Saturdays.",
  },
];

const NEW_VENUES = [
  {
    name: "The Righteous Room",
    address: "641 Walnut St, Cincinnati, OH 45202",
    geocodeQuery: "641 Walnut St, Cincinnati, OH 45202",
    neighborhood: "Downtown",
    types: ["bar"],
    price_level: 2,
    vibe_tags: ["cocktail-bar", "dj-nights", "late-night", "happy-hour", "mixed-crowd"],
    why_tonight: "Yelp's #1 spot for Black nightlife in Cincinnati — half-price drinks every night till 8pm, then hot guest DJs take over the back lounge.",
  },
  {
    name: "Scene Ultra Lounge",
    address: "639 Walnut St, Cincinnati, OH 45202",
    geocodeQuery: "639 Walnut St, Cincinnati, OH 45202",
    neighborhood: "Downtown",
    types: ["night_club", "bar"],
    price_level: 2,
    vibe_tags: ["hip-hop", "late-night", "bottle-service", "club", "urban"],
    why_tonight: "The turnt-up sister spot to The Righteous Room next door — hip-hop forward, bottle service, and a loud Friday/Saturday crowd.",
  },
  {
    name: "VYBEZ Hookah Bar & Lounge",
    address: "7825 Reading Rd, Cincinnati, OH 45237",
    geocodeQuery: "7825 Reading Rd, Cincinnati, OH 45237",
    neighborhood: "Roselawn",
    types: ["bar"],
    price_level: null,
    vibe_tags: ["hookah", "karaoke", "rnb", "late-night", "grill"],
    why_tonight: "Hookah and wings with a real party vibe — R&B karaoke every Thursday, DJ nights heat up on Fridays.",
  },
  {
    name: "Braxton Brewing Company",
    address: "27 W 7th St, Covington, KY 41011",
    geocodeQuery: "27 W 7th St, Covington, KY 41011",
    neighborhood: "Downtown Covington",
    types: ["bar"],
    price_level: 2,
    vibe_tags: ["rooftop", "craft-beer", "cocktails", "social", "mixed-crowd"],
    why_tonight: "Cincinnati's best rooftop bar just across the river — 27 rotating taps and a warm-weather patio crowd.",
  },
];

async function run() {
  console.log(`Updating ${EXISTING_UPDATES.length} existing venues...`);
  for (const v of EXISTING_UPDATES) {
    const { error } = await supabase
      .from("venues")
      .update({
        neighborhood: v.neighborhood,
        black_owned: v.black_owned,
        source: "curated",
        why_tonight: v.why_tonight,
      })
      .eq("place_id", v.place_id);
    if (error) console.error(`  ✗ ${v.place_id}:`, error.message);
    else console.log(`  ✓ updated ${v.place_id}`);
  }

  console.log(`\nInserting ${NEW_VENUES.length} new venues...`);
  for (const v of NEW_VENUES) {
    const placeId = `curated-${slugify(v.name)}`;
    const { data: existing } = await supabase
      .from("venues")
      .select("lat, lng")
      .eq("place_id", placeId)
      .maybeSingle();

    let lat = existing?.lat ?? null;
    let lng = existing?.lng ?? null;

    if (lat == null || lng == null) {
      const geocoded = await geocode(v.geocodeQuery);
      lat = geocoded.lat;
      lng = geocoded.lng;
      await sleep(250);
      if (lat == null) console.warn(`  ⚠ couldn't geocode "${v.name}" (${v.geocodeQuery}) — saving without coordinates`);
    }

    const { error } = await supabase.from("venues").upsert(
      {
        place_id: placeId,
        name: v.name,
        address: v.address,
        neighborhood: v.neighborhood,
        lat,
        lng,
        types: v.types,
        rating: null,
        price_level: v.price_level,
        vibe_tags: v.vibe_tags,
        black_owned: false,
        source: "curated",
        why_tonight: v.why_tonight,
      },
      { onConflict: "place_id" }
    );
    if (error) console.error(`  ✗ ${v.name}:`, error.message);
    else console.log(`  ✓ ${v.name}${lat == null ? " (no coords)" : ""}`);
  }

  console.log("\nDone.");
}

run();
