import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NightHistoryItem } from "@/lib/profileData";
import { VisitRating } from "@/lib/visitSurvey";

interface NightHistoryJoinRow {
  id: string;
  rating: number | null;
  created_at: string;
  venues: { name: string } | { name: string }[] | null;
  pending_events: { event_name: string; date: string; venue_name: string } | { event_name: string; date: string; venue_name: string }[] | null;
}

function firstOf<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("venue_visits")
    .select("id, rating, created_at, venues ( name ), pending_events ( event_name, date, venue_name )")
    .eq("user_id", user.id)
    .eq("attended", true)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const items: NightHistoryItem[] = ((data ?? []) as unknown as NightHistoryJoinRow[]).map((row) => {
    const venue = firstOf(row.venues);
    const event = firstOf(row.pending_events);
    return {
      id: row.id,
      venueName: venue?.name ?? event?.venue_name ?? "Unknown venue",
      rating: (row.rating as VisitRating | null) ?? null,
      date: event?.date ?? row.created_at.slice(0, 10),
    };
  });

  return NextResponse.json({ items });
}
