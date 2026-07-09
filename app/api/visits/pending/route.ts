import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getTonightDateString } from "@/lib/cincyDate";
import { PendingVisit } from "@/lib/visitSurvey";

interface SavedEventJoinRow {
  event_id: string;
  pending_events: PendingVisit | null;
}

/**
 * Returns the single most relevant "Did you go?" prompt for the current
 * user: the most recently passed saved event with no venue_visits row yet.
 * Venue-only saves (no event, no date) never trigger this — only date-bound
 * saved events do.
 */
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ visit: null });

  // "Passed" respects the 4am nightlife rollover — an event happening
  // tonight shouldn't prompt "did you go?" while the night is still on.
  const today = getTonightDateString();

  const { data: saved, error } = await supabaseAdmin
    .from("user_event_interactions")
    .select(`
      event_id,
      pending_events (
        id, event_name, date, start_time, venue_name, venue_id, neighborhood, image_url
      )
    `)
    .eq("user_id", user.id)
    .eq("interaction_type", "saved");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const passed = ((saved ?? []) as unknown as SavedEventJoinRow[])
    .map((row) => row.pending_events)
    .filter((ev): ev is PendingVisit => !!ev && ev.date < today)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  if (passed.length === 0) return NextResponse.json({ visit: null });

  const eventIds = passed.map((ev) => ev.id);
  const { data: existingVisits, error: visitsError } = await supabaseAdmin
    .from("venue_visits")
    .select("event_id")
    .eq("user_id", user.id)
    .in("event_id", eventIds);

  if (visitsError) return NextResponse.json({ error: visitsError.message }, { status: 500 });

  const answeredIds = new Set((existingVisits ?? []).map((v) => v.event_id));
  const next = passed.find((ev) => !answeredIds.has(ev.id));

  return NextResponse.json({ visit: next ?? null });
}
