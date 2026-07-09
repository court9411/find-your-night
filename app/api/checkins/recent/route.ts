import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const venueId = url.searchParams.get("venueId");
  if (!venueId) return NextResponse.json({ error: "venueId is required" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("venue_checkins_recent")
    .select("crowd_level, wait_minutes, cover_amount, music_tags, minutes_ago")
    .eq("venue_id", venueId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ checkin: data ?? null });
}
