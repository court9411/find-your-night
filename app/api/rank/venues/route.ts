import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { mapPriceLevel, deriveType, pickVenuePhoto, VenuePhotoRow } from "@/lib/venueMappers";
import { isVenueOpenNow, RegularHours } from "@/lib/venueHours";
import { Venue } from "@/lib/types";
import { fetchVenueLiveEvents } from "@/lib/venueLiveEvents";
import { getCincyDateString, getTonightDateString } from "@/lib/cincyDate";

interface RankedVenueRow {
  venue_id: string;
  name: string;
  vibe_tags: string[] | null;
  distance_mi: number | null;
  final_score: number;
}

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

export async function POST(request: Request) {
  let body: { userId?: unknown; anonId?: unknown; lat?: unknown; lng?: unknown; limit?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const userId = typeof body.userId === "string" ? body.userId : null;
  const anonId = typeof body.anonId === "string" ? body.anonId : null;
  const lat = typeof body.lat === "number" ? body.lat : null;
  const lng = typeof body.lng === "number" ? body.lng : null;
  const limit = typeof body.limit === "number" ? body.limit : 20;

  const { data: ranked, error: rankError } = await supabaseAdmin.rpc("get_ranked_venues", {
    p_user_id: userId,
    p_anon_id: anonId,
    p_lat: lat,
    p_lng: lng,
    p_limit: limit,
  });

  if (rankError) {
    console.error("get_ranked_venues RPC error:", rankError);
    return NextResponse.json({ error: "Couldn't rank venues right now." }, { status: 500 });
  }

  const rankedRows = (ranked ?? []) as RankedVenueRow[];
  if (rankedRows.length === 0) {
    return NextResponse.json({ venues: [] });
  }

  const ids = rankedRows.map((r) => r.venue_id);
  const { data: dbVenues, error: hydrateError } = await supabaseAdmin
    .from("venues")
    .select(
      "id, place_id, name, address, lat, lng, types, price_level, vibe_tags, black_owned, neighborhood, why_tonight, hours, happy_hour, regular_hours, venue_photos(photo_url, attribution_name, attribution_uri, photo_source)"
    )
    .in("id", ids);

  if (hydrateError) {
    console.error("Ranked venue hydration error:", hydrateError);
    return NextResponse.json({ error: "Couldn't load ranked venues." }, { status: 500 });
  }

  const byId = new Map((dbVenues ?? []).map((v) => [v.id, v as DbVenue]));

  const hydratedVenues = rankedRows
    .map((row) => byId.get(row.venue_id))
    .filter((v): v is DbVenue => !!v);

  // Batch the "is anything live tonight" check server-side, once per rail load,
  // rather than having each rail card fire its own request.
  const tonight = getTonightDateString();
  const liveTonightById = new Map<string, Venue["liveTonight"]>();
  await Promise.all(
    hydratedVenues.map(async (row) => {
      const liveEvents = await fetchVenueLiveEvents(supabaseAdmin, row.id);
      const soonest = liveEvents[0];
      if (soonest && getCincyDateString(new Date(soonest.start_dt)) === tonight) {
        liveTonightById.set(row.id, {
          id: soonest.event_id,
          eventName: soonest.event_name,
          startDt: soonest.start_dt,
        });
      }
    })
  );

  const venues: Venue[] = hydratedVenues.map((row) => {
    const photo = pickVenuePhoto(row.venue_photos);
    return {
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
      liveTonight: liveTonightById.get(row.id) ?? null,
      imageUrl: photo?.photo_url ?? null,
      photoAttribution: photo ? { name: photo.attribution_name, uri: photo.attribution_uri } : null,
      isOpenNow: isVenueOpenNow(row.regular_hours),
    };
  });

  return NextResponse.json({ venues });
}
