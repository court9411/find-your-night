import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { PendingEvent } from "@/lib/types";

interface RankedEventRow {
  event_id: string;
  event_name: string;
  venue_name: string;
  vibe_tags: string[] | null;
  event_dt: string;
  distance_mi: number | null;
  final_score: number;
}

const EVENT_COLUMNS =
  "id, event_name, date, start_time, end_time, venue_name, venue_id, neighborhood, image_url, vibe_tags, description, price, ticket_link, like_count";

export async function POST(request: Request) {
  let body: { userId?: unknown; anonId?: unknown; lat?: unknown; lng?: unknown; limit?: unknown; source?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const userId = typeof body.userId === "string" ? body.userId : null;
  const anonId = typeof body.anonId === "string" ? body.anonId : null;
  const lat = typeof body.lat === "number" ? body.lat : null;
  const lng = typeof body.lng === "number" ? body.lng : null;
  const limit = typeof body.limit === "number" ? body.limit : 40;
  const source = typeof body.source === "string" ? body.source : null;

  const { data: ranked, error: rankError } = await supabaseAdmin.rpc("get_ranked_events", {
    p_user_id: userId,
    p_anon_id: anonId,
    p_lat: lat,
    p_lng: lng,
    p_limit: limit,
    p_source: source,
  });

  if (rankError) {
    console.error("get_ranked_events RPC error:", rankError);
    return NextResponse.json({ error: "Couldn't rank events right now." }, { status: 500 });
  }

  const rankedRows = (ranked ?? []) as RankedEventRow[];
  if (rankedRows.length === 0) {
    return NextResponse.json({ events: [] });
  }

  const ids = rankedRows.map((r) => r.event_id);
  const { data: dbEvents, error: hydrateError } = await supabaseAdmin
    .from("pending_events")
    .select(EVENT_COLUMNS)
    .in("id", ids)
    .not("image_url", "is", null);

  if (hydrateError) {
    console.error("Ranked event hydration error:", hydrateError);
    return NextResponse.json({ error: "Couldn't load ranked events." }, { status: 500 });
  }

  const byId = new Map((dbEvents ?? []).map((e) => [e.id, e as Partial<PendingEvent> & { id: string }]));

  const events = rankedRows
    .map((row) => byId.get(row.event_id))
    .filter((e): e is Partial<PendingEvent> & { id: string } => !!e);

  return NextResponse.json({ events });
}
