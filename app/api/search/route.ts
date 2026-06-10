import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getClientIp, isRateLimited } from "@/lib/rateLimit";
import { Venue } from "@/lib/types";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MAX_REQUESTS_PER_WINDOW = 20;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

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

  if (!city || !vibe) {
    return NextResponse.json({ error: "City and vibe are required" }, { status: 400 });
  }

  const day = new Date().toLocaleDateString("en-US", { weekday: "long" });

  const prompt = `You are a local nightlife guide. Suggest 5 real venues in ${city} for a ${day} night matching this vibe: "${vibe}".
Return ONLY a valid JSON array with no markdown, no backticks, no explanation. Each item must have exactly these fields:
name (string), type (string), neighborhood (string), description (string, 1-2 sentences), whyTonight (string), price (one of "$", "$$", "$$$"), tags (array of 2-4 short strings).
For whyTonight, write 1-2 sentences explaining specifically why this venue is the perfect choice for tonight — mention the atmosphere, what kind of crowd to expect, a special quality about this time of week, or what makes it unique right now. Never just list the time or hours. Make it feel like a recommendation from a friend who knows the city.`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text response from model");
    }

    const venues = parseVenues(textBlock.text);

    return NextResponse.json({ venues });
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      { error: "Couldn't find venues right now. Please try again." },
      { status: 502 }
    );
  }
}

function parseVenues(raw: string): Venue[] {
  const cleaned = raw.trim().replace(/^```(json)?/i, "").replace(/```$/, "").trim();
  const parsed = JSON.parse(cleaned);

  if (!Array.isArray(parsed)) {
    throw new Error("Response was not a JSON array");
  }

  return parsed;
}
