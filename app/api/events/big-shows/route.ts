import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { PromoterEvent } from "@/lib/promoterEvent";
import { getTonightDateString, addDaysToDateString } from "@/lib/cincyDate";
import { isEventOver } from "@/lib/eventTiming";
import { getEffectiveDate } from "@/lib/recurrence";

const EVENT_COLUMNS =
  "id, event_name, date, start_time, end_time, venue_name, venue_id, neighborhood, image_url, vibe_tags, description, price, ticket_link, like_count, is_recurring, recurrence_frequency, recurrence_days, recurrence_end_date";

const DEFAULT_LIMIT = 15;

// Safety net on the DB fetch — current Ticketmaster-sourced volume is ~348
// total, real ordering/limit applied in JS after fetching, not here.
const FETCH_CAP = 500;

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
 * Ticketmaster-sourced "Big Shows" feed for the home rail — filters on
 * `source`, not `category` (category is inconsistent/mostly null on these
 * rows, but source is fully populated across all 348 Ticketmaster rows).
 * Mirrors /api/events/lineup's structure and recurrence handling, though
 * Ticketmaster rows aren't expected to ever set is_recurring.
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

  const safetyLowerBound = addDaysToDateString(getTonightDateString(), -1);

  const { data, error } = await supabaseAdmin
    .from("pending_events")
    .select(EVENT_COLUMNS)
    .eq("source", "ticketmaster")
    .eq("status", "approved")
    .or(`date.gte.${safetyLowerBound},is_recurring.eq.true`)
    .not("image_url", "is", null)
    .order("date", { ascending: true })
    .limit(FETCH_CAP);

  if (error) {
    console.error("Big Shows events fetch error:", error);
    return NextResponse.json({ error: "Couldn't load Big Shows." }, { status: 500 });
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
