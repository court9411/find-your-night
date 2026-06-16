import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import Anthropic from "@anthropic-ai/sdk";
import { getClientIp, isRateLimited } from "@/lib/rateLimit";
import { Venue } from "@/lib/types";
import { VIBE_BOUNDARIES } from "@/lib/vibeBoundaries";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MAX_REQUESTS_PER_WINDOW = 20;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const CACHE_TTL_SECONDS = 60 * 60; // 1 hour

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

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (isRateLimited("search", ip, MAX_REQUESTS_PER_WINDOW, WINDOW_MS)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  let body: {
    city?: unknown;
    vibe?: unknown;
    label?: unknown;
    q?: unknown;
    lat?: unknown;
    lng?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const q = typeof body.q === "string" ? body.q.trim().slice(0, 200) : "";
  const vibe = typeof body.vibe === "string" ? body.vibe.trim().slice(0, 200) : "";
  const label = typeof body.label === "string" ? body.label.trim().slice(0, 100) : "";
  // City defaults to Cincinnati — the app is currently Cincinnati-focused
  const city =
    typeof body.city === "string" && body.city.trim()
      ? body.city.trim().slice(0, 100)
      : "Cincinnati";

  // "Nightlife day" starts at 2am so late-night searches stay grouped with the prior evening
  const nightlifeDate = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const day = nightlifeDate.toLocaleDateString("en-US", { weekday: "long" });

  try {
    if (q) {
      // Semantic text search: extract neighborhood intent then call AI
      const queryLower = q.toLowerCase();
      const locationIntent = NEIGHBORHOODS.find((n) => queryLower.includes(n)) ?? null;
      const vibeQuery = locationIntent
        ? q.replace(new RegExp(locationIntent, "gi"), "").trim()
        : q;

      const venues = await getVenuesByQuery(
        vibeQuery || q,
        day,
        locationIntent
      );
      return NextResponse.json({ venues });
    } else if (vibe) {
      // Vibe mode — existing behavior, city defaults to Cincinnati
      const boundaries = VIBE_BOUNDARIES[label] ?? "";
      const venues = await getVenues(city.toLowerCase(), vibe.toLowerCase(), day, boundaries);
      return NextResponse.json({ venues });
    } else {
      return NextResponse.json({ error: "Query or vibe is required" }, { status: 400 });
    }
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      { error: "Couldn't find venues right now. Please try again." },
      { status: 502 }
    );
  }
}

// ─── Vibe-based search (existing behavior, unchanged) ────────────────────────

const getVenues = unstable_cache(
  async (city: string, vibe: string, day: string, boundaries: string): Promise<Venue[]> => {
    const prompt = `You are a local guide for things to do in ${city}. Suggest 5 real places or events in ${city} for a ${day} night matching this vibe: "${vibe}".
Only suggest venues that are realistically open and busy on a ${day} night. Skip venues that are typically closed on ${day}s.
Return ONLY a valid JSON array with no markdown, no backticks, no explanation. Each item must have exactly these fields:
name (string), type (string), neighborhood (string), description (string, 1-2 sentences), whyTonight (string), price (one of "$", "$$", "$$$"), tags (array of 2-4 short strings), lat (number or null), lng (number or null).
For whyTonight, write 1-2 sentences explaining specifically why this is the perfect choice for tonight — mention the atmosphere, what kind of crowd to expect, a special quality about this time of week, or what makes it unique right now. Never just list the time or hours. Make it feel like a recommendation from a friend who knows the city.
For lat/lng, give your best approximate coordinates for the venue's real location. If you aren't reasonably confident, return null for both rather than guessing wildly.
Vary which venues you surface and in what order — don't default to the same top picks every time this is asked. Prioritize variety across sessions while staying true to the vibe and city.${boundaries}`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text response from model");
    }

    return parseVenues(textBlock.text);
  },
  ["search-venues"],
  { revalidate: CACHE_TTL_SECONDS }
);

// ─── Semantic text search (new path) ─────────────────────────────────────────

const getVenuesByQuery = unstable_cache(
  async (
    vibeQuery: string,
    day: string,
    locationIntent: string | null
  ): Promise<Venue[]> => {
    const locationSection = locationIntent
      ? `The user searched for "${locationIntent}". Prioritize venues and events in or near that area. Someone searching this area name wants results there specifically.`
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
Always write WHY TONIGHT relative to the user's search intent. If they searched "date night", explain why this venue is good for a date tonight specifically. If they searched a neighborhood, acknowledge the area. The copy should feel like it's responding to them personally, not just describing the venue in general.

HOURS:
Only suggest venues that are realistically open and busy on a ${day} night. Skip venues that are typically closed on ${day}s.

OUTPUT:
Return ONLY a valid JSON array with no markdown, no backticks, no explanation. Suggest 5 real places or events in Cincinnati. Each item must have exactly these fields:
name (string), type (string), neighborhood (string), description (string, 1-2 sentences), whyTonight (string), price (one of "$", "$$", "$$$"), tags (array of 2-4 short strings), lat (number or null), lng (number or null).
For lat/lng, give your best approximate coordinates. If not reasonably confident, return null for both.`;

    const userMessage = `Search: "${vibeQuery}" · Tonight is ${day}.\nReturn only the JSON array.`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text response from model");
    }

    return parseVenues(textBlock.text);
  },
  ["search-query"],
  { revalidate: 30 * 60 } // 30-minute cache for free-text queries
);

// ─── Shared parser ────────────────────────────────────────────────────────────

function parseVenues(raw: string): Venue[] {
  const cleaned = raw.trim().replace(/^```(json)?/i, "").replace(/```$/, "").trim();
  const parsed = JSON.parse(cleaned);

  if (!Array.isArray(parsed)) {
    throw new Error("Response was not a JSON array");
  }

  return parsed;
}
