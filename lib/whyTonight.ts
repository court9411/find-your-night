import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface WhyTonightInput {
  name: string;
  venueName?: string | null;
  description?: string | null;
  eventDate?: string | null; // YYYY-MM-DD
  eventTime?: string | null; // free text, e.g. "9:00 PM" or "Every Friday, 10pm"
  tags?: string[];
}

function dayOfWeek(eventDate?: string | null): string {
  if (eventDate) {
    const parsed = new Date(`${eventDate}T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString("en-US", { weekday: "long" });
    }
  }
  return new Date().toLocaleDateString("en-US", { weekday: "long" });
}

function fallbackWhyTonight(event: WhyTonightInput): string {
  const day = dayOfWeek(event.eventDate);
  const tag = event.tags?.[0];

  if (tag) {
    return `${day} night, ${tag.toLowerCase()} vibes — ${event.name} is the move.`;
  }
  return `Happening ${day} — ${event.name} is worth carving out time for tonight.`;
}

/**
 * Generates "Why Tonight" copy for events that don't already have it
 * (e.g. promoter-submitted events), batched into a single AI call.
 */
export async function generateWhyTonight(events: WhyTonightInput[]): Promise<string[]> {
  if (events.length === 0) return [];

  const eventLines = events
    .map((e, i) => {
      const parts = [
        `${i + 1}. Event: "${e.name}"`,
        e.venueName && e.venueName !== e.name ? `Venue: ${e.venueName}` : null,
        `Day: ${dayOfWeek(e.eventDate)}`,
        e.eventTime ? `Time: ${e.eventTime}` : null,
        e.description ? `Description: ${e.description}` : null,
        e.tags && e.tags.length ? `Vibe tags: ${e.tags.join(", ")}` : null,
      ].filter(Boolean);
      return parts.join(" | ");
    })
    .join("\n");

  const prompt = `You write short "Why Tonight" blurbs for a nightlife discovery app. For each event below, write exactly 1 sentence (max ~20 words) explaining why it's worth going tonight — reference the day of week, the vibe, or what makes it special right now. Be specific and confident, never generic filler like "great spot for a night out." If the description is sparse or missing, base the line on the event name, vibe tags, and day of week instead.

${eventLines}

Return ONLY a JSON array of strings, one per event, in the same order, with no markdown or explanation.`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text response from model");
    }

    const cleaned = textBlock.text.trim().replace(/^```(json)?/i, "").replace(/```$/, "").trim();
    const parsed = JSON.parse(cleaned);

    if (!Array.isArray(parsed) || parsed.length !== events.length) {
      throw new Error("Unexpected response shape");
    }

    return parsed.map((item, i) =>
      typeof item === "string" && item.trim() ? item.trim() : fallbackWhyTonight(events[i])
    );
  } catch (err) {
    console.error("generateWhyTonight error:", err);
    return events.map(fallbackWhyTonight);
  }
}
