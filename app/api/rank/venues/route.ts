import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { mapPriceLevel, deriveType, pickVenuePhoto, VenuePhotoRow } from "@/lib/venueMappers";
import { isVenueOpenNow, getHoursStatus, RegularHours } from "@/lib/venueHours";
import { Venue } from "@/lib/types";
import { fetchVenueLiveEvents } from "@/lib/venueLiveEvents";
import { getCincyDateString, getNightlifeContext, getTonightDateString } from "@/lib/cincyDate";
import { findDailySpecial } from "@/lib/dailySpecials";

interface RankedVenueRow {
  venue_id: string;
  name: string;
  vibe_tags: string[] | null;
  distance_mi: number | null;
  final_score: number;
  matched_tags: string[] | null;
  budget_match: boolean | null;
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
  venue_category: string | null;
  venue_photos: VenuePhotoRow | VenuePhotoRow[] | null;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_EXCLUDE_IDS = 100;

export async function POST(request: Request) {
  let body: { userId?: unknown; anonId?: unknown; lat?: unknown; lng?: unknown; limit?: unknown; excludeIds?: unknown };
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
  const excludeIds = Array.isArray(body.excludeIds)
    ? body.excludeIds.filter((id): id is string => typeof id === "string" && UUID_REGEX.test(id)).slice(0, MAX_EXCLUDE_IDS)
    : [];

  const { data: ranked, error: rankError } = await supabaseAdmin.rpc("get_ranked_venues", {
    p_user_id: userId,
    p_anon_id: anonId,
    p_lat: lat,
    p_lng: lng,
    p_limit: limit,
    // Omitted entirely (rather than passed empty) when there's nothing to
    // exclude, since get_ranked_venues doesn't have this param deployed
    // yet — Supabase rejects an unrecognized named RPC param outright, so
    // this only gets attempted on the Smart Night Picker's refill calls.
    ...(excludeIds.length > 0 ? { p_exclude_ids: excludeIds } : {}),
  });

  if (rankError) {
    // p_exclude_ids isn't live in get_ranked_venues yet (DB-side migration
    // still pending) — an exclude-bearing call failing is expected right
    // now, and the correct picker-side behavior is "no more venues" (which
    // the picker already treats as end-of-queue), not a hard error. Calls
    // without excludeIds (Picks, Onboarding) keep the original hard-fail
    // behavior unchanged.
    console.error("get_ranked_venues RPC error:", rankError);
    if (excludeIds.length > 0) {
      return NextResponse.json({ venues: [] });
    }
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
      "id, place_id, name, address, lat, lng, types, price_level, vibe_tags, black_owned, neighborhood, why_tonight, hours, happy_hour, regular_hours, venue_category, venue_photos(photo_url, attribution_name, attribution_uri, photo_source)"
    )
    .in("id", ids);

  if (hydrateError) {
    console.error("Ranked venue hydration error:", hydrateError);
    return NextResponse.json({ error: "Couldn't load ranked venues." }, { status: 500 });
  }

  const byId = new Map((dbVenues ?? []).map((v) => [v.id, v as DbVenue]));

  const hydratedVenues = rankedRows
    .map((rankedRow) => {
      const dbVenue = byId.get(rankedRow.venue_id);
      return dbVenue ? { dbVenue, rankedRow } : null;
    })
    .filter((v): v is { dbVenue: DbVenue; rankedRow: RankedVenueRow } => !!v);

  // Batch the "is anything live tonight" check server-side, once per rail load,
  // rather than having each rail card fire its own request.
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

  const { dayOfWeek } = getNightlifeContext();

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
      matchedTags: rankedRow.matched_tags ?? [],
      budgetMatch: rankedRow.budget_match ?? null,
      distanceMi: rankedRow.distance_mi ?? null,
      venueCategory: row.venue_category ?? null,
      finalScore: rankedRow.final_score ?? null,
      dailySpecial: findDailySpecial(row.vibe_tags, dayOfWeek),
    };
  });

  return NextResponse.json({ venues });
}
