/**
 * One-off loader for manually-researched Black-owned bars/clubs
 * (sourced from The Voice of Black Cincinnati, June 2026 batch).
 * Run once: node scripts/ingest-curated-venues.mjs
 * Safe to re-run — upserts by place_id (synthetic "curated-<slug>" for
 * venues not already in the Google import, real place_id otherwise).
 *
 * Requires (already in .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
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

// Venues already present from the Google Places import — update in place
// rather than insert duplicates. Matched by their real place_id.
const EXISTING_UPDATES = [
  {
    place_id: "ChIJJw7PdRyzQYgRfHTs9yVuKUc", // Nostalgia Wine & Jazz Lounge
    neighborhood: "OTR",
    black_owned: true,
    why_tonight:
      "Intimate OTR lounge with live jazz, R&B, and soul most nights, plus 40+ wines by the glass spotlighting minority and women winemakers.",
  },
  {
    place_id: "ChIJlYE_ItuxQYgRDNjAUKvc8zY", // LoVe on Fourth
    neighborhood: "Downtown",
    black_owned: true,
    why_tonight: "Upscale downtown nightclub with bottle service and a dressy Friday/Saturday crowd.",
  },
  {
    place_id: "ChIJ3WAo2CNNQIgR75hoEqtTJOs", // KickbacksCincy
    neighborhood: "Hartwell",
    black_owned: true,
    why_tonight:
      "Hartwell sports bar that turns into a 25+ dance-and-pool-table hangout most nights, with open mic and live DJs on weekends.",
  },
];

// New venues to insert. address is the full real address (used for
// geocoding + display); leave address null when no street address is
// known and we only have an approximate area to geocode.
const NEW_VENUES = [
  {
    name: "Cinema OTR",
    address: "1517 Vine Street, Cincinnati, OH 45202",
    geocodeQuery: "1517 Vine Street, Cincinnati, OH 45202",
    neighborhood: "OTR",
    types: ["night_club", "bar"],
    price_level: 2,
    vibe_tags: ["90s-rnb", "hip-hop", "nostalgia", "nightclub-energy", "black-film"],
    why_tonight: "A 90s R&B and hip-hop nightclub built around nostalgia and classic Black film culture — go big on Friday or Saturday.",
  },
  {
    name: "Revel Urban Winery",
    address: "Over-the-Rhine, Cincinnati, OH",
    geocodeQuery: "Over-the-Rhine, Cincinnati, OH",
    neighborhood: "OTR",
    types: ["bar"],
    price_level: 2,
    vibe_tags: ["wine", "live-music", "events", "award-winning", "community"],
    why_tonight: "Award-winning urban winery with live blues Wednesdays, DJ Saturdays, and $15 tastings Tuesdays.",
  },
  {
    name: "COPA Lounge",
    address: "1133 Sycamore St, Suite B, Cincinnati, OH 45202",
    geocodeQuery: "1133 Sycamore St, Cincinnati, OH 45202",
    neighborhood: "OTR / Pendleton",
    types: ["night_club", "bar", "restaurant"],
    price_level: 2,
    vibe_tags: ["nightclub", "brunch", "loud-energy", "late-night", "social"],
    why_tonight: "Nightclub energy after dark, bottomless-mimosa brunch on Sundays — one of OTR/Pendleton's most active social spots.",
  },
  {
    name: "Something to Wine About",
    address: "4th & Race, Cincinnati, OH",
    geocodeQuery: "4th Street and Race Street, Cincinnati, OH",
    neighborhood: "Downtown",
    types: ["bar"],
    price_level: 4,
    vibe_tags: ["wine", "self-pour", "upscale", "minority-winemakers", "date-night"],
    why_tonight: "Black-owned self-pour wine bar in 4th & Race spotlighting African American and minority winemakers — a polished date-night pick.",
  },
  {
    name: "Memories Lounge",
    address: "35 E 7th Street, Cincinnati, OH 45202",
    geocodeQuery: "35 E 7th Street, Cincinnati, OH 45202",
    neighborhood: "Downtown",
    types: ["bar", "night_club"],
    price_level: 2,
    vibe_tags: ["events", "birthday-celebrations", "dj-nights", "weekend-nightlife"],
    why_tonight: "Intimate downtown lounge built for birthdays and themed DJ nights most weekends.",
  },
  {
    name: "Confessions Bar and Restaurant Lounge",
    address: "1026 E. McMillan Street, Cincinnati, OH 45206",
    geocodeQuery: "1026 E. McMillan Street, Cincinnati, OH 45206",
    neighborhood: "Walnut Hills",
    types: ["bar", "restaurant"],
    price_level: 2,
    vibe_tags: ["cocktail-bar", "elevated-vibes", "food-drinks", "connections", "music"],
    why_tonight: "Walnut Hills lounge built around handcrafted cocktails, live music, and good conversation on weekend evenings.",
  },
  {
    name: "Market Wines",
    address: "767 E McMillan Street, Suite 1, Cincinnati, OH 45206",
    geocodeQuery: "767 E McMillan Street, Cincinnati, OH 45206",
    neighborhood: "Walnut Hills",
    types: ["bar"],
    price_level: 2,
    vibe_tags: ["wine-bar", "low-key", "retail", "outdoor-seating", "neighborhood"],
    why_tonight: "Walnut Hills wine shop and bar with a laid-back indoor bar or outdoor seating for a quick glass or a long evening.",
  },
  {
    name: "Bar 29",
    address: "4040 Reading Road, Cincinnati, OH 45229",
    geocodeQuery: "4040 Reading Road, Cincinnati, OH 45229",
    neighborhood: "North Avondale",
    types: ["bar", "restaurant"],
    price_level: 1,
    vibe_tags: ["neighborhood-bar", "live-dj", "sports-tvs", "late-night-food", "pool-table"],
    why_tonight: "North Avondale neighborhood bar with a live DJ every night of the week, a pool table, and a kitchen open till 1am.",
  },
  {
    name: "Good Brothas Bar and Grill",
    address: "6700 Savannah Avenue, Cincinnati, OH 45239",
    geocodeQuery: "6700 Savannah Avenue, Cincinnati, OH 45239",
    neighborhood: "North College Hill",
    types: ["bar", "restaurant"],
    price_level: 1,
    vibe_tags: ["neighborhood-bar", "happy-hour", "affordable", "community"],
    why_tonight: "North College Hill neighborhood bar known for its weekday happy hour deals and steady, easygoing crowd.",
  },
  {
    name: "Pike 2 Bar and Grill",
    address: "10010 Springfield Pike, Cincinnati, OH 45215",
    geocodeQuery: "10010 Springfield Pike, Cincinnati, OH 45215",
    neighborhood: "Woodlawn",
    types: ["bar", "restaurant"],
    price_level: 1,
    vibe_tags: ["live-music", "karaoke", "outdoor-patio", "happy-hour", "sports"],
    why_tonight: "Woodlawn bar with live music and karaoke on an outdoor patio — punches above its suburban address on weekends.",
  },
  {
    name: "Cove 51",
    address: "11473 Chester Road, Sharonville, OH 45246",
    geocodeQuery: "11473 Chester Road, Sharonville, OH 45246",
    neighborhood: "Sharonville",
    types: ["night_club", "bar", "restaurant"],
    price_level: 4,
    vibe_tags: ["upscale", "nightclub", "international-music", "luxury", "weekend"],
    why_tonight: "Sharonville's upscale, New York-style nightclub with an international music vibe most weekends — the move for north Cincinnati without driving downtown.",
  },
  {
    name: "Out the Way Bar & Grill",
    address: "4880 Union Centre Pavilion, West Chester, OH 45069",
    geocodeQuery: "4880 Union Centre Pavilion, West Chester, OH 45069",
    neighborhood: "West Chester",
    types: ["bar", "restaurant"],
    price_level: 1,
    vibe_tags: ["sports-bar", "live-music", "chill", "music-showcase", "artist-community"],
    why_tonight: "West Chester sports bar that hosts local music artist showcases every Sunday — a good one for discovering new talent.",
  },
  {
    name: "Twenty-Two Ultra Lounge",
    address: "340 Glensprings Drive, Springdale, OH 45246",
    geocodeQuery: "340 Glensprings Drive, Springdale, OH 45246",
    neighborhood: "Springdale",
    types: ["night_club", "bar"],
    price_level: 4,
    vibe_tags: ["craft-cocktails", "upscale", "elevated-vibes", "live-music", "weekend"],
    why_tonight: "Springdale's late-night ultra lounge — craft cocktails, doors at 10pm, open till 1:30am Friday and Saturday.",
  },
  {
    name: "Sutton Bar and Grill",
    address: "1832 Sutton Avenue, Cincinnati, OH 45230",
    geocodeQuery: "1832 Sutton Avenue, Cincinnati, OH 45230",
    neighborhood: "Mt. Washington",
    types: ["bar", "restaurant"],
    price_level: 1,
    vibe_tags: ["neighborhood-bar", "patio", "sports-tv", "relaxed", "year-round-outdoor"],
    why_tonight: "Mt. Washington neighborhood bar with a year-round patio for game day or a relaxed weekend drink.",
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
      await sleep(250); // stay well under Geocoding API's per-second limit
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
        black_owned: true,
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
