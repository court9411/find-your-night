import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import Anthropic from "@anthropic-ai/sdk";
import { getClientIp, isRateLimited } from "@/lib/rateLimit";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { Price, Venue } from "@/lib/types";
import { getSupplementalVenues } from "@/lib/supplementalVenues";
import { shuffle } from "@/lib/shuffle";
import { haversineMiles, Coords } from "@/lib/geo";
import { getCincyWeekday } from "@/lib/cincyDate";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MAX_REQUESTS_PER_WINDOW = 20;
const WINDOW_MS = 60 * 60 * 1000;
const MIN_DB_RESULTS = 4;
const MAX_DB_RESULTS = 20;

// Maps each vibe label to relevant vibe_tags in the venues table
const VIBE_TAG_MAP: Record<string, string[]> = {
  "Drinks & Bars":   ["cocktails", "dancing", "dive-bar", "day-drink", "after-work", "hype", "live-music"],
  "Food & Drinks":   ["date-night", "after-work", "low-key"],
  "Live Music":      ["live-music", "dancing", "hype"],
  "Fresh Air":       ["outdoor", "family-friendly"],
  "Late Night Eats": ["low-key", "after-work"],
  "Rooftop Vibes":   ["rooftop", "cocktails", "date-night"],
  "Casual Fun":      ["family-friendly", "sports", "low-key"],
  "Arts & Events":   ["arts-culture", "date-night"],
  "Surprise Me":     [],
};

const TYPE_LABELS: Record<string, string> = {
  bar: "Bar",
  night_club: "Nightclub",
  restaurant: "Restaurant",
  cafe: "Café",
  bowling_alley: "Bowling Alley",
  movie_theater: "Movie Theater",
  amusement_park: "Amusement Park",
  museum: "Museum",
  art_gallery: "Art Gallery",
  park: "Park",
  zoo: "Zoo",
  aquarium: "Aquarium",
};

const NEIGHBORHOODS = [
  "forest park", "sharonville", "blue ash", "norwood", "oakley",
  "hyde park", "mt lookout", "mount lookout", "columbia tusculum",
  "east end", "walnut hills", "avondale", "bond hill",
  "kennedy heights", "silverton", "madeira", "milford",
  "anderson township", "over-the-rhine", "otr", "northside",
  "price hill", "clifton", "mt adams", "mount adams", "the banks",
  "downtown", "west chester", "covington", "newport", "florence",
  "erlanger", "fairfield", "mason", "loveland", "mariemont",
  "delhi", "westwood", "finneytown", "mt. healthy", "colerain",
  "madisonville", "hamilton", "camp washington", "corryville",
  "college hill", "fairmount", "mount airy", "harrison", "reading",
  "montgomery", "indian hill", "cincinnati",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function deriveType(types: string[] | null): string {
  for (const t of types ?? []) {
    if (TYPE_LABELS[t]) return TYPE_LABELS[t];
  }
  return "Venue";
}

function extractNeighborhood(address: string | null): string {
  if (!address) return "Cincinnati";
  const parts = address.split(",").map((p) => p.trim());
  // Walk from the end; skip zip codes, state abbreviations, and "USA"/"United States"
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    if (/^\d{5}(-\d{4})?$/.test(p)) continue;
    if (/^(OH|KY|IN|USA|United States)$/i.test(p)) continue;
    return p;
  }
  return "Cincinnati";
}

function mapPriceLevel(level: number | null | undefined): Price {
  if (level == null) return "$$";
  if (level <= 1) return "$";
  if (level === 2) return "$$";
  return "$$$";
}

// ── DB-backed vibe search ────────────────────────────────────────────────────

interface DbVenue {
  place_id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  types: string[] | null;
  rating: number | null;
  price_level: number | null;
  vibe_tags: string[] | null;
  black_owned: boolean | null;
  source: string | null;
  neighborhood: string | null;
  why_tonight: string | null;
  special_nights: { day: string; note: string }[] | null;
  hours: string | null;
  happy_hour: string | null;
}

// Returns today's special-night note for a venue, if it has one for the
// current day of week (e.g. "Live blues, half-off wine" on a Wednesday).
// An exact day match (e.g. "Thursday") wins over a "Daily" fallback entry.
function todaysSpecialNote(row: DbVenue, today: string): string | null {
  const nights = row.special_nights ?? [];
  const exact = nights.find((entry) => entry.day === today);
  if (exact) return exact.note;
  return nights.find((entry) => entry.day === "Daily")?.note ?? null;
}

// Google Places types that actually mean "this is a bar/nightclub" — used
// instead of vibe_tags for "Drinks & Bars" because the AI-assigned tags
// (e.g. "after-work", "day-drink") turned out loose enough that Starbucks,
// McDonald's, and Panera Bread were qualifying as bars.
const REQUIRED_TYPES: Record<string, string[]> = {
  "Drinks & Bars": ["bar", "night_club"],
};

// Venues with one of these types are restaurants first, even if Google
// also tags them "bar" (e.g. a steakhouse or sushi spot with a bar) —
// excluded from "Drinks & Bars" so it stays actual bars/clubs only.
const EXCLUDED_TYPES_IF_RESTAURANT_LIKE = ["restaurant", "meal_takeaway"];

async function searchVenuesByVibe(label: string, userCoords: Coords | null): Promise<Venue[]> {
  const tags = VIBE_TAG_MAP[label] ?? [];
  const requiredTypes = REQUIRED_TYPES[label];

  let query = supabaseAdmin
    .from("venues")
    .select(
      "place_id, name, address, lat, lng, types, rating, price_level, vibe_tags, black_owned, source, neighborhood, why_tonight, special_nights, hours, happy_hour"
    );

  if (requiredTypes) {
    query = query.overlaps("types", requiredTypes);
  } else if (tags.length > 0) {
    query = query.overlaps("vibe_tags", tags);
  }

  const { data, error } = await query;
  if (error) throw error;

  let rows: DbVenue[] = data ?? [];
  if (requiredTypes) {
    // Curated rows are human-vetted as real bars/clubs even when Google
    // also tags them "restaurant" (e.g. a bar & grill) — only apply the
    // restaurant-exclusion heuristic to the unverified Google-only rows.
    rows = rows.filter(
      (row) =>
        row.source === "curated" ||
        !row.types?.some((t) => EXCLUDED_TYPES_IF_RESTAURANT_LIKE.includes(t))
    );
  }
  if (rows.length === 0) return [];

  const today = getCincyWeekday();

  let selected: DbVenue[];
  if (userCoords) {
    // Sort by actual distance from the user so nearby spots always win,
    // rather than by rating across the whole metro area — except a venue
    // with a special night happening today floats to the top regardless,
    // since that's a rarer and more worth-surfacing signal than proximity.
    const withDistance = rows.map((row) => ({
      row,
      hasTodayNote: todaysSpecialNote(row, today) !== null,
      distance:
        row.lat != null && row.lng != null
          ? haversineMiles(userCoords, { lat: row.lat, lng: row.lng })
          : Infinity,
    }));
    withDistance.sort((a, b) => {
      if (a.hasTodayNote !== b.hasTodayNote) return a.hasTodayNote ? -1 : 1;
      return a.distance - b.distance;
    });
    selected = withDistance.slice(0, MAX_DB_RESULTS).map((v) => v.row);
  } else {
    // No location available — fall back to top-rated, shuffled for variety.
    const byRating = [...rows].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    const anchors = byRating.slice(0, 4);
    const rest = shuffle(byRating.slice(4));
    selected = [...anchors, ...rest].slice(0, MAX_DB_RESULTS);
  }

  const venues: Venue[] = selected.map((row) => {
    const todayNote = todaysSpecialNote(row, today);
    return {
      name: row.name,
      type: deriveType(row.types),
      neighborhood: row.neighborhood || extractNeighborhood(row.address),
      description: "",
      whyTonight: todayNote ? `${todayNote} — tonight's the night to go.` : row.why_tonight ?? "",
      price: mapPriceLevel(row.price_level),
      tags: row.vibe_tags ?? [],
      blackOwned: row.black_owned ?? null,
      address: row.address,
      hours: row.hours,
      happyHour: row.happy_hour,
      lat: row.lat,
      lng: row.lng,
      placeId: row.place_id ?? null,
    };
  });

  return venues;
}

// ── AI free-text search (kept for semantic queries) ───────────────────────────

const getVenuesByQuery = unstable_cache(
  async (
    vibeQuery: string,
    day: string,
    locationIntent: string | null
  ): Promise<Venue[]> => {
    const locationSection = locationIntent
      ? `The user searched for "${locationIntent}". Prioritize venues and events in or near that area.`
      : "Use the best general Cincinnati venues for the requested mood and intent.";

    const systemPrompt = `You are the recommendation engine for Find Your Night, a nightlife and experience discovery app in Cincinnati, OH.

LOCATION INTENT:
${locationSection}

INTERPRETING MOOD AND INTENT:
Read the spirit behind the query, not just keywords.

"date night" or "romantic" → Intimate or upscale venues. Cocktail bars, rooftop spots, restaurants with atmosphere, quiet enough for conversation. Avoid loud clubs, dive bars, large crowds.

"birthday" or "celebration" → Energetic, celebratory. Party feel, bottle service options, event venues, places that feel like an occasion.

"something cheap" or "low key" or "chill" → Dive bars, neighborhood spots, happy hour, casual hangouts. Avoid anything $$$ or upscale.

"after dinner" or "late" or "night cap" → Bars open late, spots that peak after 10pm, late-night food. Avoid early-closing restaurants.

"with kids" or "family" → All-ages venues, earlier hours, family-friendly activities. Override all nightlife defaults entirely.

"[neighborhood name]" with no other context → Treat as "what's good in [neighborhood] tonight" — a general recommendation for that area.

WHY TONIGHT:
Always write WHY TONIGHT relative to the user's search intent.

HOURS:
Only suggest venues that are realistically open and busy on a ${day} night.

OUTPUT:
Return ONLY a valid JSON array with no markdown, no backticks, no explanation. Suggest 5 real places or events in Cincinnati. Each item must have exactly these fields:
name (string), type (string), neighborhood (string), description (string, 1-2 sentences), whyTonight (string), price (one of "$", "$$", "$$$"), tags (array of 2-4 short strings), lat (number or null), lng (number or null).`;

    const userMessage = `Search: "${vibeQuery}" · Tonight is ${day}.\nReturn only the JSON array.`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") throw new Error("No text response");

    return parseVenues(textBlock.text);
  },
  ["search-query"],
  { revalidate: 30 * 60 }
);

function parseVenues(raw: string): Venue[] {
  const cleaned = raw.trim().replace(/^```(json)?/i, "").replace(/```$/, "").trim();
  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed)) throw new Error("Response was not a JSON array");
  return parsed;
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (isRateLimited("search", ip, MAX_REQUESTS_PER_WINDOW, WINDOW_MS)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  let body: { city?: unknown; vibe?: unknown; label?: unknown; q?: unknown; lat?: unknown; lng?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const q = typeof body.q === "string" ? body.q.trim().slice(0, 200) : "";
  const label = typeof body.label === "string" ? body.label.trim().slice(0, 100) : "";
  const userCoords: Coords | null =
    typeof body.lat === "number" && typeof body.lng === "number" ? { lat: body.lat, lng: body.lng } : null;

  const nightlifeDate = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const day = getCincyWeekday(nightlifeDate);

  try {
    if (q) {
      // Semantic free-text search — keep AI for nuanced intent
      const queryLower = q.toLowerCase();
      const locationIntent = NEIGHBORHOODS.find((n) => queryLower.includes(n)) ?? null;
      const vibeQuery = locationIntent
        ? q.replace(new RegExp(locationIntent, "gi"), "").trim()
        : q;

      const venues = await getVenuesByQuery(vibeQuery || q, day, locationIntent);
      return NextResponse.json({ venues });
    } else if (label) {
      // Vibe-based search — query venues table directly
      let venues = await searchVenuesByVibe(label, userCoords);

      // Fall back to AI if DB doesn't have enough results for this vibe
      if (venues.length < MIN_DB_RESULTS) {
        const existingNames = venues.map((v) => v.name);
        const supplemental = await getSupplementalVenues(
          "Cincinnati",
          label,
          MIN_DB_RESULTS - venues.length,
          existingNames
        );
        venues = [...venues, ...supplemental];
      }

      return NextResponse.json({ venues });
    } else {
      return NextResponse.json({ error: "Query or vibe label is required" }, { status: 400 });
    }
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      { error: "Couldn't find venues right now. Please try again." },
      { status: 502 }
    );
  }
}
