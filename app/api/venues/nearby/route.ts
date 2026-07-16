import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { haversineMeters } from "@/lib/geo";
import { CHECKINABLE_VENUE_CATEGORIES, NearbyVenue } from "@/lib/checkin";

// "reasonable proximity" for the GPS check-in entry point — wide enough to
// tolerate phone GPS drift, tight enough that the confirmation card is
// almost always the venue the user is actually standing at.
const MAX_CANDIDATE_METERS = 400;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
  }

  const latDelta = MAX_CANDIDATE_METERS / 111320;
  const lngDelta = MAX_CANDIDATE_METERS / (111320 * Math.cos((lat * Math.PI) / 180) || 1);

  const { data, error } = await supabaseAdmin
    .from("venues")
    .select("id, name, neighborhood, place_id, lat, lng")
    .in("venue_category", [...CHECKINABLE_VENUE_CATEGORIES])
    .not("lat", "is", null)
    .not("lng", "is", null)
    .gte("lat", lat - latDelta)
    .lte("lat", lat + latDelta)
    .gte("lng", lng - lngDelta)
    .lte("lng", lng + lngDelta);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const candidates: NearbyVenue[] = (data ?? [])
    .map((v) => ({
      id: v.id as string,
      name: v.name as string,
      neighborhood: v.neighborhood as string | null,
      place_id: v.place_id as string | null,
      distanceMeters: haversineMeters({ lat, lng }, { lat: v.lat as number, lng: v.lng as number }),
    }))
    .filter((v) => v.distanceMeters <= MAX_CANDIDATE_METERS)
    .sort((a, b) => a.distanceMeters - b.distanceMeters);

  return NextResponse.json({ venue: candidates[0] ?? null });
}
