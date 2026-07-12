/**
 * One-off loader for recently-opened Cincinnati/NKY venues found via web
 * research (CityBeat "Hottest New Restaurants and Bars" coverage,
 * July 2026 pass) — none of these were in the Google Places import yet.
 * Run once: node scripts/ingest-new-2025-2026-openings.mjs
 * Safe to re-run — upserts by synthetic place_id "curated-<slug>".
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

const NEW_VENUES = [
  {
    name: "Marigold",
    address: "The Foundry, 1201 Vine Street, Cincinnati, OH 45202",
    geocodeQuery: "The Foundry, 1201 Vine Street, Cincinnati, OH 45202",
    neighborhood: "OTR",
    types: ["bar", "restaurant"],
    price_level: 3,
    vibe_tags: ["british-pub", "elevated-vibes", "cocktails", "date-night"],
    opened_date: "2025-02-01",
    why_tonight: "English-style public house at The Foundry — British pub elegance with a menu of dishes inspired by traditional Indian pub fare.",
  },
  {
    name: "Prim",
    address: "The Foundry, 1201 Vine Street, Cincinnati, OH 45202",
    geocodeQuery: "The Foundry, 1201 Vine Street, Cincinnati, OH 45202",
    neighborhood: "OTR",
    types: ["bar", "night_club"],
    price_level: 3,
    vibe_tags: ["upscale-cocktail-bar", "nightlife", "elevated-vibes"],
    opened_date: null,
    why_tonight: "New upscale cocktail bar at The Foundry from the creators of Ghost Baby — one of downtown's most-talked-about recent openings.",
  },
  {
    name: "Tokyo Pie",
    address: "Covington, KY",
    geocodeQuery: "Tokyo Pie, Covington, KY",
    neighborhood: "Covington",
    types: ["bar", "restaurant"],
    price_level: 2,
    vibe_tags: ["japanese-inspired", "pizza", "craft-cocktails", "nightlife"],
    opened_date: "2025-10-01",
    why_tonight: "Japanese-inspired pizza-and-cocktail joint from Epic Brands — dramatic flair, craft cocktails, opened October 2025 in Covington.",
  },
  {
    name: "The Green Door",
    address: "Covington, KY",
    geocodeQuery: "The Green Door dry cannabis bar, Covington, KY",
    neighborhood: "Covington",
    types: ["bar"],
    price_level: 2,
    vibe_tags: ["alcohol-free", "cannabis-bar", "mocktails", "low-key"],
    opened_date: "2025-04-01",
    why_tonight: "Greater Cincinnati/NKY's first dry cannabis bar — alcohol-free THC mocktails, kava, and adaptogenic spritzers.",
  },
];

async function run() {
  console.log(`Inserting ${NEW_VENUES.length} new venues...`);
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
        source: "curated",
        opened_date: v.opened_date,
        why_tonight: v.why_tonight,
      },
      { onConflict: "place_id" }
    );
    if (error) console.error(`  ✗ ${v.name}:`, error.message);
    else console.log(`  ✓ ${v.name}${lat == null ? " (no coords)" : ""}${v.opened_date ? ` — opened ${v.opened_date}` : " — opening date unknown"}`);
  }

  console.log("\nDone.");
}

run();
