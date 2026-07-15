import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { LiveDensityVenue } from "@/lib/checkin";

export const dynamic = "force-dynamic";

// Single-market app for now — hardcoded until multi-city launch needs this
// resolved from the request the way resolve_market_id() does elsewhere.
const CINCINNATI_MARKET_ID = "25230814-dd6c-4694-b69f-feb41e118a3d";

export async function GET() {
  const { data, error } = await supabaseAdmin.rpc("get_venue_live_density", {
    p_market_id: CINCINNATI_MARKET_ID,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // The RPC returns every venue in the market (almost all "none" tier); the
  // heatmap only cares about "live" ones, so filter here to keep this
  // 60s-polled payload small instead of shipping ~500 dead rows each time.
  const venues: LiveDensityVenue[] = (data ?? [])
    .filter((v: { confidence_tier: string }) => v.confidence_tier === "live")
    .map((v: { venue_id: string; name: string; lat: number; lng: number; live_score: number; checkin_count: number; confidence_tier: string }) => ({
      venue_id: v.venue_id,
      name: v.name,
      lat: v.lat,
      lng: v.lng,
      live_score: v.live_score,
      checkin_count: v.checkin_count,
      confidence_tier: v.confidence_tier as "live",
    }));

  return NextResponse.json({ venues });
}
