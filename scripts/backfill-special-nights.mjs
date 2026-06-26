/**
 * Comprehensive backfill of best-night and happy-hour data across all 23
 * curated venues (not just the 4 with a uniquely themed night) — so
 * "Tonight" almost always has at least one venue with a today-relevant
 * callout, on any day of the week.
 *
 * Run once: node scripts/backfill-special-nights.mjs
 * Safe to re-run — overwrites special_nights for the listed place_ids only.
 *
 * special_nights entries: { day: "Monday".."Sunday" | "Daily", note: string }
 * "Daily" matches every day of the week (lowest priority vs an exact-day match).
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const HAPPY_HOUR_MON_FRI = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const HAPPY_HOUR_MON_SAT = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const UPDATES = {
  // Already has theme-night data from the first pass — just adding the
  // daily happy hour as a lower-priority fallback for the other 6 days.
  "ChIJJw7PdRyzQYgRfHTs9yVuKUc": [ // Nostalgia Wine & Jazz Lounge
    { day: "Thursday", note: "R&B Happy Hour" },
    { day: "Daily", note: "Happy hour 5–8pm" },
  ],
  "curated-revel-urban-winery": [ // Revel Urban Winery
    { day: "Tuesday", note: "Wine tastings, $15" },
    { day: "Wednesday", note: "Live blues, half-off wine" },
    { day: "Saturday", note: "DJ Zap" },
  ],
  "curated-vybez-hookah-bar-lounge": [ // VYBEZ Hookah Bar & Lounge
    { day: "Thursday", note: "R&B karaoke night" },
    { day: "Friday", note: "DJ night" },
  ],
  "curated-out-the-way-bar-grill": [ // Out the Way Bar & Grill
    { day: "Sunday", note: "Live music artist showcases" },
  ],

  "curated-cinema-otr": [
    { day: "Friday", note: "90s R&B and hip-hop night" },
    { day: "Saturday", note: "90s R&B and hip-hop night" },
  ],
  "curated-copa-lounge": [
    { day: "Saturday", note: "Nightclub energy, high energy" },
    { day: "Sunday", note: "Bottomless-mimosa brunch" },
  ],
  "curated-something-to-wine-about": [
    { day: "Friday", note: "Self-pour wine bar, date-night pick" },
    { day: "Saturday", note: "Self-pour wine bar, date-night pick" },
  ],
  "ChIJlYE_ItuxQYgRDNjAUKvc8zY": [ // LoVe on Fourth
    { day: "Friday", note: "VIP nightclub energy" },
    { day: "Saturday", note: "VIP nightclub energy" },
  ],
  "curated-memories-lounge": [
    { day: "Friday", note: "DJ nights, birthday parties" },
    { day: "Saturday", note: "DJ nights, birthday parties" },
  ],
  "curated-confessions-bar-and-restaurant-lounge": [
    { day: "Friday", note: "Cocktails, live music" },
    { day: "Saturday", note: "Cocktails, live music" },
  ],
  "curated-market-wines": [
    { day: "Daily", note: "Wine bar open, indoor or patio seating" },
  ],
  "curated-bar-29": [
    { day: "Daily", note: "Happy hour 2–6pm, live DJ every night" },
  ],
  "ChIJ3WAo2CNNQIgR75hoEqtTJOs": [ // KickbacksCincy
    { day: "Daily", note: "Happy hour 4–6pm" },
    { day: "Friday", note: "25+ dance and pool night" },
    { day: "Saturday", note: "25+ dance and pool night" },
  ],
  "curated-good-brothas-bar-and-grill": HAPPY_HOUR_MON_FRI.map((day) => ({
    day,
    note: "Happy hour 3–6pm",
  })),
  "curated-pike-2-bar-and-grill": [
    { day: "Daily", note: "Happy hour 3–7pm" },
    { day: "Friday", note: "Live music night" },
    { day: "Saturday", note: "Live music night" },
  ],
  "curated-cove-51": [
    { day: "Friday", note: "Upscale international-music night" },
    { day: "Saturday", note: "Upscale international-music night" },
  ],
  "curated-twenty-two-ultra-lounge": [
    { day: "Friday", note: "Craft cocktails, doors at 10pm" },
    { day: "Saturday", note: "Craft cocktails, doors at 10pm" },
  ],
  "curated-sutton-bar-and-grill": [
    { day: "Daily", note: "Year-round patio, game day spot" },
  ],

  "curated-the-righteous-room": HAPPY_HOUR_MON_SAT.map((day) => ({
    day,
    note: day === "Friday" || day === "Saturday"
      ? "Half-price drinks till 8pm, guest DJs"
      : "Half-price drinks till 8pm",
  })),
  "curated-scene-ultra-lounge": [
    { day: "Friday", note: "Hip-hop nightclub energy" },
    { day: "Saturday", note: "Hip-hop nightclub energy" },
  ],
  "ChIJ085b78WxQYgRF8yXcqYH3SY": [ // Tulua Nightclub and Cocktail Bar
    { day: "Friday", note: "VIP nightclub night" },
    { day: "Saturday", note: "VIP nightclub night" },
  ],
  "ChIJsyGmo-KzQYgRUBPqJh7if30": [ // OTR LIVE
    { day: "Friday", note: "Live music and dancing" },
    { day: "Saturday", note: "Live music and dancing" },
  ],
  "curated-braxton-brewing-company": [
    { day: "Friday", note: "Rooftop bar, craft beer" },
    { day: "Saturday", note: "Rooftop bar, craft beer" },
  ],
};

async function run() {
  const entries = Object.entries(UPDATES);
  console.log(`Updating special_nights for ${entries.length} venues...`);
  for (const [placeId, specialNights] of entries) {
    const { error } = await supabase
      .from("venues")
      .update({ special_nights: specialNights })
      .eq("place_id", placeId);
    if (error) console.error(`  ✗ ${placeId}:`, error.message);
    else console.log(`  ✓ ${placeId} (${specialNights.length} entries)`);
  }
  console.log("\nDone.");
}

run();
