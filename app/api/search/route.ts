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

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (isRateLimited("search", ip, MAX_REQUESTS_PER_WINDOW, WINDOW_MS)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  let body: { city?: unknown; vibe?: unknown; label?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const city = typeof body.city === "string" ? body.city.trim().slice(0, 100) : "";
  const vibe = typeof body.vibe === "string" ? body.vibe.trim().slice(0, 100) : "";
  const label = typeof body.label === "string" ? body.label.trim().slice(0, 100) : "";

  if (!city || !vibe) {
    return NextResponse.json({ error: "City and vibe are required" }, { status: 400 });
  }

  // Treat the "nightlife day" as starting at 2am, so late-night searches
  // (e.g. 1:30am Saturday) are grouped with the prior evening (Friday night).
  const nightlifeDate = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const day = nightlifeDate.toLocaleDateString("en-US", { weekday: "long" });
  const boundaries = VIBE_BOUNDARIES[label] ?? "";

  try {
    const venues = await getVenues(city.toLowerCase(), vibe.toLowerCase(), day, boundaries);
    return NextResponse.json({ venues });
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      { error: "Couldn't find venues right now. Please try again." },
      { status: 502 }
    );
  }
}

const getVenues = unstable_cache(
  async (city: string, vibe: string, day: string, boundaries: string): Promise<Venue[]> => {
    const prompt = `You are a local guide for things to do in ${city}. Suggest 5 real places or events in ${city} for a ${day} night matching this vibe: "${vibe}".
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

function parseVenues(raw: string): Venue[] {
  const cleaned = raw.trim().replace(/^```(json)?/i, "").replace(/```$/, "").trim();
  const parsed = JSON.parse(cleaned);

  if (!Array.isArray(parsed)) {
    throw new Error("Response was not a JSON array");
  }

  return parsed;
}
