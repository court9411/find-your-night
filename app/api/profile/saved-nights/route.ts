import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { SavedNightItem } from "@/lib/profileData";

interface SavedEventJoinRow {
  id: string;
  created_at: string;
  event_id: string;
  pending_events:
    | { id: string; event_name: string; date: string; venue_name: string; neighborhood: string | null; image_url: string | null }
    | { id: string; event_name: string; date: string; venue_name: string; neighborhood: string | null; image_url: string | null }[]
    | null;
}

interface SavedVenueJoinRow {
  id: string;
  created_at: string;
  place_id: string;
  venues: { id: string; name: string; neighborhood: string | null } | { id: string; name: string; neighborhood: string | null }[] | null;
}

function firstOf<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [eventsRes, venuesRes, visitsRes] = await Promise.all([
    supabaseAdmin
      .from("user_event_interactions")
      .select("id, created_at, event_id, pending_events ( id, event_name, date, venue_name, neighborhood, image_url )")
      .eq("user_id", user.id)
      .eq("interaction_type", "saved"),
    supabaseAdmin
      .from("user_venue_interactions")
      .select("id, created_at, place_id, venues ( id, name, neighborhood )")
      .eq("user_id", user.id)
      .eq("interaction_type", "saved"),
    supabaseAdmin.from("venue_visits").select("event_id, venue_id").eq("user_id", user.id),
  ]);

  if (eventsRes.error) return NextResponse.json({ error: eventsRes.error.message }, { status: 500 });
  if (venuesRes.error) return NextResponse.json({ error: venuesRes.error.message }, { status: 500 });
  if (visitsRes.error) return NextResponse.json({ error: visitsRes.error.message }, { status: 500 });

  const resolvedEventIds = new Set((visitsRes.data ?? []).map((v) => v.event_id).filter(Boolean) as string[]);
  const resolvedVenueIds = new Set((visitsRes.data ?? []).map((v) => v.venue_id).filter(Boolean) as string[]);

  const eventItems: SavedNightItem[] = ((eventsRes.data ?? []) as unknown as SavedEventJoinRow[])
    .map((row) => ({ row, event: firstOf(row.pending_events) }))
    .filter(({ event }) => !!event && !resolvedEventIds.has(event.id))
    .map(({ row, event }) => ({
      id: row.id,
      type: "event" as const,
      targetId: event!.id,
      name: event!.event_name,
      neighborhood: event!.neighborhood,
      date: event!.date,
      imageUrl: event!.image_url,
      createdAt: row.created_at,
    }));

  const venueItems: SavedNightItem[] = ((venuesRes.data ?? []) as unknown as SavedVenueJoinRow[])
    .map((row) => ({ row, venue: firstOf(row.venues) }))
    .filter(({ venue }) => !!venue && !resolvedVenueIds.has(venue.id))
    .map(({ row, venue }) => ({
      id: row.id,
      type: "venue" as const,
      targetId: venue!.id,
      name: venue!.name,
      neighborhood: venue!.neighborhood,
      date: null,
      imageUrl: null,
      createdAt: row.created_at,
    }));

  const items = [...eventItems, ...venueItems].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return NextResponse.json({ items });
}
