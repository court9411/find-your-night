/**
 * Backfills the `hours` / `happy_hour` display text on the venue detail
 * page, for the curated venues where that info was actually provided.
 * Run once: node scripts/backfill-hours.mjs (safe to re-run).
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const UPDATES = {
  "ChIJJw7PdRyzQYgRfHTs9yVuKUc": { happy_hour: "Daily 5–8pm" }, // Nostalgia
  "curated-copa-lounge": { hours: "Thu–Sat 5–10pm, Sun 11am–7pm" },
  "curated-bar-29": { hours: "Kitchen open until 1am", happy_hour: "Daily 2–6pm" },
  "ChIJ3WAo2CNNQIgR75hoEqtTJOs": { happy_hour: "Daily 4–6pm" }, // KickbacksCincy
  "curated-good-brothas-bar-and-grill": { happy_hour: "Mon–Fri 3–6pm" },
  "curated-pike-2-bar-and-grill": { happy_hour: "Daily 3–7pm" },
  "curated-twenty-two-ultra-lounge": { hours: "Doors at 10pm Fri–Sat, late menu until 1:30am" },
  "curated-the-righteous-room": {
    hours: "Tue–Sat 4pm–2:30am, Sun 8pm–2:30am",
    happy_hour: "Half-price all drinks Mon–Sat 4–8pm",
  },
  "curated-scene-ultra-lounge": { hours: "Tue–Fri 4pm–2am, Sat 6pm–2am" },
  "ChIJ085b78WxQYgRF8yXcqYH3SY": { hours: "Fri–Sat 10pm–2:30am" }, // Tulua
  "curated-vybez-hookah-bar-lounge": { hours: "Weekends 9pm–2am ($20 cover after midnight)" },
  "curated-braxton-brewing-company": {
    hours: "Mon 3–10pm, Tue–Thu 11am–10pm, Fri–Sat 11am–midnight, Sun 11am–9pm",
  },
};

async function run() {
  const entries = Object.entries(UPDATES);
  console.log(`Updating hours/happy_hour for ${entries.length} venues...`);
  for (const [placeId, fields] of entries) {
    const { error } = await supabase.from("venues").update(fields).eq("place_id", placeId);
    if (error) console.error(`  ✗ ${placeId}:`, error.message);
    else console.log(`  ✓ ${placeId}`);
  }
  console.log("\nDone.");
}

run();
