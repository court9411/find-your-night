import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type ItemType = "event" | "venue";
type InteractionType = "saved" | "not_interested";

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { itemType: ItemType; itemId: string; interactionType: InteractionType };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { itemType, itemId, interactionType } = body;
  if (!itemType || !itemId || !interactionType) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (itemType === "event") {
    const { error } = await supabaseAdmin
      .from("user_event_interactions")
      .upsert(
        { user_id: user.id, event_id: itemId, interaction_type: interactionType },
        { onConflict: "user_id,event_id" }
      );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await supabaseAdmin
      .from("user_venue_interactions")
      .upsert(
        { user_id: user.id, place_id: itemId, interaction_type: interactionType },
        { onConflict: "user_id,place_id" }
      );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { itemType: ItemType; itemId: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { itemType, itemId } = body;
  if (!itemType || !itemId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (itemType === "event") {
    const { error } = await supabaseAdmin
      .from("user_event_interactions")
      .delete()
      .eq("user_id", user.id)
      .eq("event_id", itemId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await supabaseAdmin
      .from("user_venue_interactions")
      .delete()
      .eq("user_id", user.id)
      .eq("place_id", itemId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const type = url.searchParams.get("type") as InteractionType | null;
  const itemType = url.searchParams.get("itemType") as ItemType | null;

  if (!type || !itemType) {
    return NextResponse.json({ error: "Missing type or itemType" }, { status: 400 });
  }

  if (itemType === "event") {
    const { data, error } = await supabaseAdmin
      .from("user_event_interactions")
      .select(`
        id,
        interaction_type,
        created_at,
        event_id,
        pending_events (
          id, event_name, date, start_time, venue_name, neighborhood,
          image_url, vibe_tags, price, ticket_link, like_count
        )
      `)
      .eq("user_id", user.id)
      .eq("interaction_type", type)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ items: data ?? [] });
  }

  // venue interactions — join manually since FK is on place_id (text)
  const { data: venueInts, error: viError } = await supabaseAdmin
    .from("user_venue_interactions")
    .select("id, place_id, interaction_type, created_at")
    .eq("user_id", user.id)
    .eq("interaction_type", type)
    .order("created_at", { ascending: false });

  if (viError) return NextResponse.json({ error: viError.message }, { status: 500 });
  if (!venueInts || venueInts.length === 0) return NextResponse.json({ items: [] });

  const placeIds = venueInts.map((r) => r.place_id);
  const { data: venues, error: vError } = await supabaseAdmin
    .from("venues")
    .select("id, place_id, name, neighborhood, vibe_tags, price_level, why_tonight")
    .in("place_id", placeIds);

  if (vError) return NextResponse.json({ error: vError.message }, { status: 500 });

  const venueMap = new Map((venues ?? []).map((v) => [v.place_id, v]));
  const items = venueInts.map((row) => ({
    ...row,
    venue: venueMap.get(row.place_id) ?? null,
  }));

  return NextResponse.json({ items });
}
