import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { PromoterEvent } from "@/lib/promoterEvent";
import { getTonightDateString } from "@/lib/cincyDate";

const EVENT_COLUMNS =
  "id, event_name, date, start_time, venue_name, venue_id, neighborhood, image_url, vibe_tags, description, price, ticket_link, like_count";

const DEFAULT_LIMIT = 20;

// Safety net on the DB fetch, well above real volume (current upcoming
// promoter-event count is ~34) — the real ordering and the real `limit`
// are both applied in JS after fetching, not here.
const FETCH_CAP = 200;

// start_time is stored as free text ("7:00 PM", "10:00 PM"), not a time
// column — ordering by it in SQL sorts lexicographically, so "10:00 PM"
// (leading "1") sorts before "7:00 PM" (leading "7"). Parse it to minutes-
// since-midnight and sort in JS instead. Unparseable/missing values sort
// last within their date rather than being guessed at.
function startTimeMinutes(startTime: string | null): number {
  if (!startTime) return Number.MAX_SAFE_INTEGER;

  const twelveHour = startTime.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (twelveHour) {
    let hour = Number(twelveHour[1]) % 12;
    if (twelveHour[3].toUpperCase() === "PM") hour += 12;
    return hour * 60 + Number(twelveHour[2]);
  }

  const twentyFourHour = startTime.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (twentyFourHour) {
    return Number(twentyFourHour[1]) * 60 + Number(twentyFourHour[2]);
  }

  return Number.MAX_SAFE_INTEGER;
}

/**
 * Chronological promoter-flyer feed for the home page's "Lineup" section —
 * today's flyers plus everything upcoming, one continuous list. Queries
 * pending_events directly rather than going through get_ranked_events: that
 * RPC orders by relevance/score, not date, so re-sorting its top-N
 * client-side could still drop early events that scored low. A plain
 * date-ordered query with a row-count limit can't silently cut off a date
 * range the way the old two-section split did.
 */
export async function POST(request: Request) {
  let body: { limit?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    // no body sent — use the default limit
  }
  const limit = typeof body.limit === "number" ? body.limit : DEFAULT_LIMIT;

  // Same 4am-rollover "today" used everywhere else in the app (not a fresh
  // Date(), and not plain calendar-date getCincyDateString) — a promoter
  // flyer for "tonight" should still show at 1am, same night.
  const today = getTonightDateString();

  const { data, error } = await supabaseAdmin
    .from("pending_events")
    .select(EVENT_COLUMNS)
    .eq("source", "promoter")
    .eq("status", "approved")
    .gte("date", today)
    .not("image_url", "is", null)
    .order("date", { ascending: true })
    .limit(FETCH_CAP);

  if (error) {
    console.error("Lineup events fetch error:", error);
    return NextResponse.json({ error: "Couldn't load the lineup." }, { status: 500 });
  }

  const events = ((data ?? []) as PromoterEvent[])
    .sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      return startTimeMinutes(a.start_time) - startTimeMinutes(b.start_time);
    })
    .slice(0, limit);

  return NextResponse.json({ events });
}
