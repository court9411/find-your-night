import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { mapPriceLevel, deriveType, pickVenuePhoto, VenuePhotoRow } from "@/lib/venueMappers";
import { isVenueOpenNow, getHoursStatus, RegularHours } from "@/lib/venueHours";
import { Venue } from "@/lib/types";
import { fetchVenueLiveEvents } from "@/lib/venueLiveEvents";
import { getCincyDateString, getNightlifeContext, getTonightDateString } from "@/lib/cincyDate";

// Keep in sync with lib/homeRails.ts's railType values and the p_rail_type
// cases inside the get_rail_venues Postgres function.
const RAIL_TYPES = new Set(["trending", "date_night", "free"]);

interface RankedVenueRow {
  venue_id: string;
  name: string;
  vibe_tags: string[] | null;
  distance_mi: number | null;
  price_level: number | null;
  rating: number | null;
  recent_score: number | null;
  is_trending_featured: boolean | null;
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
  let body: {
    railType?: unknown;
    userId?: unknown;
    lat?: unknown;
    lng?: unknown;
    limit?: unknown;
    categories?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const railType = typeof body.railType === "string" ? body.railType : "";
  if (!RAIL_TYPES.has(railType)) {
    return NextResponse.json({ error: "Invalid railType" }, { status: 400 });
  }

  const userId = typeof body.userId === "string" ? body.userId : null;
  const lat = typeof body.lat === "number" ? body.lat : null;
  const lng = typeof body.lng === "number" ? body.lng : null;
  const limit = typeof body.limit === "number" ? body.limit : 10;
  const categories =
    Array.isArray(body.categories) && body.categories.every((c) => typeof c === "string")
      ? (body.categories as string[])
      : null;

  // get_rail_venues defaults p_day_of_week to the DB server's UTC day, which
  // is wrong near midnight Eastern (e.g. 11pm Thursday in Cincinnati is
  // already Friday UTC). Always compute it here in Cincinnati local time
  // and pass it explicitly — confirmed empirically that the RPC expects the
  // full weekday name ("Tuesday"/"tuesday"), not an abbreviation: passing
  // "Tue" let a Tuesday-closed venue (Privee on Elm) leak into "trending"
  // results, while the full name correctly excluded it. Derived from
  // getNightlifeContext (not getCincyWeekday directly) so this can't
  // disagree with the day/night rail switch in app/api/home-context —
  // both roll over at 4am, not midnight, off the same function.
  const { dayOfWeek } = getNightlifeContext();

  const { data: ranked, error: rankError } = await supabaseAdmin.rpc("get_rail_venues", {
    p_rail_type: railType,
    p_user_id: userId,
    p_lat: lat,
    p_lng: lng,
    p_limit: limit,
    p_day_of_week: dayOfWeek,
    // Omit entirely (rather than pass null) when the caller didn't specify
    // one, so the RPC's own default (nightlife + entertainment) applies.
    ...(categories ? { p_categories: categories } : {}),
  });

  if (rankError) {
    // get_rail_venues doesn't exist in every environment yet (it's built by
    // the DB-side Supabase session, not this app) — degrade to an empty
    // rail so RailSection just hides itself, same as any other empty rail,
    // rather than surfacing a broken request to the user.
    console.error("get_rail_venues RPC error:", rankError);
    return NextResponse.json({ venues: [] });
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
    console.error("Rail venue hydration error:", hydrateError);
    return NextResponse.json({ error: "Couldn't load rail venues." }, { status: 500 });
  }

  const byId = new Map((dbVenues ?? []).map((v) => [v.id, v as DbVenue]));

  const hydratedVenues = rankedRows
    .map((rankedRow) => {
      const dbVenue = byId.get(rankedRow.venue_id);
      return dbVenue ? { dbVenue, rankedRow } : null;
    })
    .filter((v): v is { dbVenue: DbVenue; rankedRow: RankedVenueRow } => !!v);

  const tonight = getTonightDateString();
  const liveTonightById = new Map<string, Venue["liveTonight"]>();
  await Promise.all(
    hydratedVenues.map(async ({ dbVenue }) => {
      const liveEvents = await fetchVenueLiveEvents(supabaseAdmin, dbVenue.id);
      const soonest = liveEvents[0];
      if (soonest && getCincyDateString(new Date(soonest.start_dt)) === tonight) {
        liveTonightById.set(dbVenue.id, {
          id: soonest.event_id,
          eventName: soonest.event_name,
          startDt: soonest.start_dt,
        });
      }
    })
  );

  const venues: Venue[] = hydratedVenues.map(({ dbVenue: row, rankedRow }) => {
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
      hoursStatus: getHoursStatus(row.regular_hours),
      // get_rail_venues doesn't return matched_tags/budget_match (that's
      // get_ranked_venues-only) — matchReason simply won't render for rail
      // cards until/unless the RPC adds those signals.
      matchedTags: null,
      budgetMatch: null,
      distanceMi: rankedRow.distance_mi ?? null,
    };
  });

  return NextResponse.json({ venues });
}
