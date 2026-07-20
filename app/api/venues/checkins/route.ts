import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const venueId = url.searchParams.get("venueId");
  const hoursBackRaw = Number(url.searchParams.get("hoursBack"));
  const hoursBack = Number.isFinite(hoursBackRaw) && hoursBackRaw > 0 ? hoursBackRaw : 2;

  if (!venueId) {
    return NextResponse.json({ error: "venueId is required" }, { status: 400 });
  }

  // Go through get_venue_checkins (security definer). It applies the "Scout"
  // display-name fallback server-side and returns is_scout, WITHOUT exposing
  // the underlying user_profiles row (no email, no home location). Don't
  // hand-roll a venue_checkins + user_profiles join here — that path dropped
  // is_scout (so the scout badge couldn't render) and duplicated the fallback.
  const { data, error } = await supabaseAdmin.rpc("get_venue_checkins", {
    p_venue_id: venueId,
    p_hours_back: hoursBack,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ checkins: data ?? [] });
}
