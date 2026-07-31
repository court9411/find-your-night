import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { TonightRailItem } from "@/lib/tonightRail";

// Single-market app for now — hardcoded until multi-city launch needs this
// resolved from the request the way resolve_market_id() does elsewhere.
// Same constant app/api/venues/live-density/route.ts uses, since this route
// depends on the same get_venue_live_density RPC (via get_tonight_rail) and
// that RPC needs a real market_id to return anything — passing null would
// silently zero out every live_density_score.
const CINCINNATI_MARKET_ID = "25230814-dd6c-4694-b69f-feb41e118a3d";

interface TonightRailRow {
  item_type: "event" | "venue";
  id: string;
  title: string;
  subtitle: string | null;
  venue_name: string | null;
  start_time: string | null;
  image_url: string | null;
  distance_mi: number | null;
  price_level: number | null;
  live_density_score: number | null;
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
  const limit = typeof body.limit === "number" ? body.limit : 10;

  const { data, error } = await supabaseAdmin.rpc("get_tonight_rail", {
    p_user_id: userId,
    p_anon_id: anonId,
    p_lat: lat,
    p_lng: lng,
    p_market_id: CINCINNATI_MARKET_ID,
    p_limit: limit,
  });

  if (error) {
    console.error("get_tonight_rail RPC error:", error);
    return NextResponse.json({ error: "Couldn't load tonight's rail." }, { status: 500 });
  }

  const items: TonightRailItem[] = ((data ?? []) as TonightRailRow[]).map((row) => ({
    itemType: row.item_type,
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    venueName: row.venue_name,
    startTime: row.start_time,
    imageUrl: row.image_url,
    distanceMi: row.distance_mi,
    priceLevel: row.price_level,
    liveDensityScore: row.live_density_score ?? 0,
  }));

  return NextResponse.json({ items });
}
