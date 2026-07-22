import { NextResponse } from "next/server";
import { getClientIp, isRateLimited } from "@/lib/rateLimit";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const MAX_REQUESTS_PER_WINDOW = 60;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_LIKED_VENUE_IDS = 50;

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (isRateLimited("picker-seed-affinity", ip, MAX_REQUESTS_PER_WINDOW, WINDOW_MS)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  let body: { userId?: unknown; anonId?: unknown; likedVenueIds?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const userId = typeof body.userId === "string" ? body.userId : null;
  const anonId = typeof body.anonId === "string" ? body.anonId : null;
  const likedVenueIds = Array.isArray(body.likedVenueIds)
    ? body.likedVenueIds.filter((id): id is string => typeof id === "string" && UUID_REGEX.test(id)).slice(0, MAX_LIKED_VENUE_IDS)
    : [];

  if (!userId && !anonId) {
    return NextResponse.json({ error: "userId or anonId is required" }, { status: 400 });
  }
  if (likedVenueIds.length === 0) {
    return NextResponse.json({ ok: true });
  }

  // seed_tag_affinity_from_picker is what makes get_ranked_venues's pref_match
  // signal move at all for a picker session — without it pref_raw defaults
  // to a flat 0.5 for everyone and the other 4 (session-invariant) signals
  // always crown the same venue. Degrade quietly (not a hard error) if this
  // RPC isn't live in a given environment yet, same convention as every other
  // not-yet-deployed-RPC path in this app — the picker still works, it just
  // won't get smarter this session.
  const { error } = await supabaseAdmin.rpc("seed_tag_affinity_from_picker", {
    p_user_id: userId,
    p_anon_id: userId ? null : anonId,
    p_liked_venue_ids: likedVenueIds,
    p_vibe_selections: [],
  });

  if (error) {
    console.error("seed_tag_affinity_from_picker RPC error:", error);
    return NextResponse.json({ ok: false });
  }

  return NextResponse.json({ ok: true });
}
