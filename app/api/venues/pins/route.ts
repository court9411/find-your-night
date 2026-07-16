import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { CHECKINABLE_VENUE_CATEGORIES, CrowdLevel, VenuePin } from "@/lib/checkin";
import { RegularHours } from "@/lib/venueHours";

export const dynamic = "force-dynamic";

export async function GET() {
  const [{ data: venues, error: venuesError }, { data: recent, error: recentError }] = await Promise.all([
    supabaseAdmin
      .from("venues")
      .select("id, name, neighborhood, lat, lng, regular_hours")
      .in("venue_category", [...CHECKINABLE_VENUE_CATEGORIES])
      .not("lat", "is", null)
      .not("lng", "is", null),
    supabaseAdmin.from("venue_checkins_recent").select("venue_id, crowd_level"),
  ]);

  if (venuesError) return NextResponse.json({ error: venuesError.message }, { status: 500 });
  if (recentError) return NextResponse.json({ error: recentError.message }, { status: 500 });

  const crowdByVenue = new Map<string, CrowdLevel | null>(
    (recent ?? []).map((r) => [r.venue_id as string, r.crowd_level as CrowdLevel | null])
  );

  const pins: VenuePin[] = (venues ?? []).map((v) => ({
    id: v.id as string,
    name: v.name as string,
    neighborhood: v.neighborhood as string | null,
    lat: v.lat as number,
    lng: v.lng as number,
    crowdLevel: crowdByVenue.get(v.id as string) ?? null,
    regularHours: (v.regular_hours as RegularHours | null) ?? null,
  }));

  return NextResponse.json({ venues: pins });
}
