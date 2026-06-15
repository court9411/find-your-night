import Anthropic from "@anthropic-ai/sdk";
import { Venue } from "@/lib/types";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CINCINNATI_NEIGHBORHOODS =
  "Over-the-Rhine (OTR), Walnut Hills, Avondale, Bond Hill, Northside, Mt. Adams, The Banks, Covington KY, Newport KY, Clifton/Ludlow Ave";

function buildSystemPrompt(city: string): string {
  const isCincinnati = /cincinnati/i.test(city);
  const neighborhoodLine = isCincinnati
    ? `- Pull from these ${city} neighborhoods: ${CINCINNATI_NEIGHBORHOODS}\n`
    : `- Pull from real, well-known neighborhoods/areas within ${city}\n`;

  return `You are the venue intelligence engine for Find Your Night, a nightlife
discovery app for ${city}. Your job is to suggest real ${city}
venues that match the requested vibe.

PRIORITIES:
- Prioritize Black-owned venues and spaces with strong Black community
  presence — flag these with blackOwned: true
- Be specific about vibe — "low-key cocktail bar where regulars know each
  other" not just "bar"
${neighborhoodLine}- Only suggest venues you are reasonably confident are real and currently
  operating in ${city}
- Never repeat venues already shown (a list of existing names will be
  provided in the user message)

OUTPUT FORMAT:
Return a JSON array only — no preamble, no markdown fences. Each object:
{
  "name": "Venue Name",
  "type": "Bar / Club / Lounge / Rooftop / Dive Bar / etc.",
  "neighborhood": "Neighborhood name",
  "description": "2-3 sentence vibe description written like a recommendation from someone who actually goes there. Specific, not generic.",
  "whyTonight": "1-2 sentences on why this specific venue is worth going to on [DAY_OF_WEEK] night specifically.",
  "vibes": ["tag1", "tag2", "tag3"],
  "priceRange": "$" | "$$" | "$$$",
  "blackOwned": true | false | null,
  "source": "ai-suggested"
}`;
}

interface SupplementalVenueResponse {
  name: string;
  type: string;
  neighborhood: string;
  description: string;
  whyTonight: string;
  vibes?: string[];
  priceRange?: "$" | "$$" | "$$$";
  blackOwned?: boolean | null;
}

export async function getSupplementalVenues(
  city: string,
  vibeLabel: string,
  count: number,
  existingNames: string[]
): Promise<Venue[]> {
  if (count <= 0) return [];

  const day = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const userMessage = `Suggest ${count} venues for the vibe: ${vibeLabel} in ${city}.
Today is ${day}. Do not suggest any of these already-shown venues: ${
    existingNames.length ? existingNames.join(", ") : "none"
  }.
Return only the JSON array.`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: buildSystemPrompt(city),
      messages: [{ role: "user", content: userMessage }],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") return [];

    const cleaned = textBlock.text
      .trim()
      .replace(/^```(json)?/i, "")
      .replace(/```$/, "")
      .trim();

    const parsed: SupplementalVenueResponse[] = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return [];

    return parsed.map((item): Venue => ({
      name: item.name,
      type: item.type,
      neighborhood: item.neighborhood,
      description: item.description,
      whyTonight: item.whyTonight,
      price: item.priceRange ?? "$$",
      tags: item.vibes ?? [],
      blackOwned: item.blackOwned ?? null,
      source: "ai-suggested",
    }));
  } catch (err) {
    console.error("Supplemental venues error:", err);
    return [];
  }
}
