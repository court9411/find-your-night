import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { PromoterEvent } from "@/lib/promoterEvent";
import { getTonightDateString, addDaysToDateString } from "@/lib/cincyDate";
import { isEventOver } from "@/lib/eventTiming";
import { getEffectiveDate } from "@/lib/recurrence";

const EVENT_COLUMNS =
  "id, event_name, date, start_time, end_time, venue_name, venue_id, neighborhood, image_url, vibe_tags, description, price, ticket_link, like_count, is_recurring, recurrence_frequency, recurrence_days, recurrence_end_date";

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
  const now = new Date();

  // SQL-level safety net only, one day before the rollover "today" — an
  // event can never still be "not over" per isEventOver() any earlier than
  // that (end_time is always same-calendar-day; the rollover fallback only
  // ever extends to 4am the *next* day). The real, definitive cutoff is
  // isEventOver() below, applied per-event in JS — same reason start_time
  // sorting happens in JS: these are free-text columns, not real date/time
  // types SQL can compare directly.
  const safetyLowerBound = addDaysToDateString(getTonightDateString(), -1);

  // Recurring templates can carry a stale anchor `date` well before
  // safetyLowerBound, so fetch them regardless of their own date column and
  // resolve each to its real next-occurrence date in JS below.
  const { data, error } = await supabaseAdmin
    .from("pending_events")
    .select(EVENT_COLUMNS)
    .eq("source", "promoter")
    .eq("status", "approved")
    .or(`date.gte.${safetyLowerBound},is_recurring.eq.true`)
    .not("image_url", "is", null)
    .order("date", { ascending: true })
    .limit(FETCH_CAP);

  if (error) {
    console.error("Lineup events fetch error:", error);
    return NextResponse.json({ error: "Couldn't load the lineup." }, { status: 500 });
  }

  const today = getTonightDateString(now);
  const events = ((data ?? []) as PromoterEvent[])
    .map((event) => {
      const effectiveDate = getEffectiveDate(event, today);
      return effectiveDate ? { ...event, date: effectiveDate } : null;
    })
    .filter((event): event is PromoterEvent => event !== null)
    .filter((event) => !isEventOver(event, now))
    .sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      return startTimeMinutes(a.start_time) - startTimeMinutes(b.start_time);
    })
    .slice(0, limit);

  return NextResponse.json({ events });
}
