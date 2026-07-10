import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { mapPriceLevel, deriveType, pickVenuePhoto, VenuePhotoRow } from "@/lib/venueMappers";
import { isVenueOpenNow, getHoursStatus, RegularHours } from "@/lib/venueHours";
import { FeaturedVenueEvent, Venue } from "@/lib/types";
import { fetchVenueLiveEvents } from "@/lib/venueLiveEvents";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface DbVenue {
  id: string;
  place_id: string | null;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  types: string[] | null;
  price_level: number | null;
  vibe_tags: string[] | null;
  black_owned: boolean | null;
  neighborhood: string | null;
  why_tonight: string | null;
  hours: string | null;
  happy_hour: string | null;
  regular_hours: RegularHours | null;
  venue_photos: VenuePhotoRow | VenuePhotoRow[] | null;
}

function fallbackDescription(raw: string | null, eventName: string): string {
  if (!raw || !raw.trim()) return `Happening now at this spot — ${eventName}.`;
  const sentences = raw.trim().split(/(?<=[.!?])\s+/).slice(0, 2).join(" ");
  return sentences.length > 220 ? `${sentences.slice(0, 217).trim()}…` : sentences;
}

async function rewriteDescription(
  eventName: string,
  venueName: string,
  description: string | null
): Promise<string> {
  if (!description || !description.trim()) return fallbackDescription(description, eventName);

  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: `Rewrite this nightlife event description into exactly 1-2 natural, confident sentences (max ~35 words total) for a venue detail screen. Don't invent details that aren't present. Return ONLY the rewritten text, no quotes, no markdown.\n\nEvent: "${eventName}" at ${venueName}\nOriginal description: ${description}`,
        },
      ],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text" || !textBlock.text.trim()) {
      throw new Error("No text response from model");
    }
    return textBlock.text.trim();
  } catch (err) {
    console.error("rewriteDescription error:", err);
    return fallbackDescription(description, eventName);
  }
}

export async function POST(request: Request) {
  let body: { venueId?: unknown; eventId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const venueId = typeof body.venueId === "string" ? body.venueId : "";
  const eventId = typeof body.eventId === "string" ? body.eventId : null;

  if (!venueId) {
    return NextResponse.json({ error: "venueId is required" }, { status: 400 });
  }

  const { data: dbVenue, error: venueError } = await supabaseAdmin
    .from("venues")
    .select(
      "id, place_id, name, address, lat, lng, types, price_level, vibe_tags, black_owned, neighborhood, why_tonight, hours, happy_hour, regular_hours, venue_photos(photo_url, attribution_name, attribution_uri, photo_source)"
    )
    .eq("id", venueId)
    .single();

  if (venueError || !dbVenue) {
    return NextResponse.json({ error: "Venue not found" }, { status: 404 });
  }

  const row = dbVenue as DbVenue;
  const photo = pickVenuePhoto(row.venue_photos);
  const venue: Venue = {
    id: row.id,
    name: row.name,
    type: deriveType(row.types),
    neighborhood: row.neighborhood || "",
    description: "",
    whyTonight: row.why_tonight ?? "",
    price: mapPriceLevel(row.price_level),
    tags: row.vibe_tags ?? [],
    blackOwned: row.black_owned ?? null,
    address: row.address,
    hours: row.hours,
    happyHour: row.happy_hour,
    lat: row.lat,
    lng: row.lng,
    placeId: row.place_id ?? null,
    imageUrl: photo?.photo_url ?? null,
    photoAttribution: photo ? { name: photo.attribution_name, uri: photo.attribution_uri } : null,
    isOpenNow: isVenueOpenNow(row.regular_hours),
    hoursStatus: getHoursStatus(row.regular_hours),
  };

  const liveEvents = await fetchVenueLiveEvents(supabaseAdmin, venueId);
  const chosen = (eventId && liveEvents.find((e) => e.event_id === eventId)) || liveEvents[0] || null;

  if (!chosen) {
    return NextResponse.json({ venue, event: null });
  }

  const rewritten = await rewriteDescription(chosen.event_name, venue.name, chosen.description);

  const event: FeaturedVenueEvent = {
    id: chosen.event_id,
    name: chosen.event_name,
    description: rewritten,
    tags: chosen.vibe_tags ?? [],
    imageUrl: chosen.image_url,
    startDt: chosen.start_dt,
    endDt: chosen.end_dt,
    ticketLink: chosen.ticket_link,
  };

  return NextResponse.json({ venue, event });
}
