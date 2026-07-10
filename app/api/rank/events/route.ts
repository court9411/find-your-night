import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { PendingEvent } from "@/lib/types";
import { getTonightDateString } from "@/lib/cincyDate";
import { getEffectiveDate } from "@/lib/recurrence";

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
  "id, event_name, date, start_time, end_time, venue_name, venue_id, neighborhood, image_url, vibe_tags, description, price, ticket_link, like_count, is_recurring, recurrence_frequency, recurrence_days, recurrence_end_date";

type RankableEvent = Partial<PendingEvent> & { id: string };

/**
 * get_ranked_events filters each row on its own end_dt, computed from the
 * raw `date` column — so a recurring template with a stale anchor date
 * (submitted weeks ago for "every Thursday") gets excluded even though its
 * real next occurrence is still ahead. The RPC has no concept of recurrence.
 * Fetch approved recurring templates directly, resolve each to its next
 * occurrence in JS (same lib/recurrence.ts the submission form and Lineup
 * rail already use), and merge in the ones the RPC missed. A template whose
 * *first* occurrence hasn't passed yet is already found correctly by the
 * RPC, so it's skipped here via the rankedIds dedupe rather than shown twice.
 */
async function fetchMissedRecurringEvents(
  rankedIds: Set<string>,
  source: string | null,
  userId: string | null,
  anonId: string | null
): Promise<RankableEvent[]> {
  let query = supabaseAdmin
    .from("pending_events")
    .select(EVENT_COLUMNS)
    .eq("status", "approved")
    .eq("is_recurring", true)
    .not("image_url", "is", null);
  if (source) query = query.eq("source", source);

  const { data, error } = await query;
  if (error) {
    console.error("Recurring event fetch error:", error);
    return [];
  }

  const candidates = ((data ?? []) as RankableEvent[]).filter((e) => !rankedIds.has(e.id));
  if (candidates.length === 0) return [];

  // Mirror get_ranked_events' own exclusion rules (not_interested / hidden)
  // so a recurring event a user dismissed doesn't just reappear next week.
  const candidateIds = candidates.map((e) => e.id);
  const excluded = new Set<string>();

  if (userId) {
    const { data: notInterested } = await supabaseAdmin
      .from("user_event_interactions")
      .select("event_id")
      .in("event_id", candidateIds)
      .eq("user_id", userId)
      .eq("interaction_type", "not_interested");
    for (const row of notInterested ?? []) excluded.add(row.event_id);
  }

  let hiddenQuery = supabaseAdmin
    .from("user_actions")
    .select("target_id")
    .in("target_id", candidateIds)
    .eq("target_type", "event")
    .eq("action_type", "hidden");
  hiddenQuery = userId ? hiddenQuery.eq("user_id", userId) : hiddenQuery.eq("anon_id", anonId ?? "");
  const { data: hidden } = await hiddenQuery;
  for (const row of hidden ?? []) excluded.add(row.target_id);

  const today = getTonightDateString();
  return candidates
    .filter((e) => !excluded.has(e.id))
    .map((e): RankableEvent | null => {
      const effectiveDate = getEffectiveDate(
        {
          is_recurring: e.is_recurring,
          recurrence_frequency: e.recurrence_frequency,
          recurrence_days: e.recurrence_days,
          recurrence_end_date: e.recurrence_end_date,
          date: e.date!,
        },
        today
      );
      return effectiveDate ? { ...e, date: effectiveDate } : null;
    })
    .filter((e): e is RankableEvent => e !== null);
}

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
  const rankedIds = new Set(rankedRows.map((r) => r.event_id));

  const missedRecurring = await fetchMissedRecurringEvents(rankedIds, source, userId, anonId);

  let scoredEvents: RankableEvent[] = [];
  if (rankedRows.length > 0) {
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

    const byId = new Map((dbEvents ?? []).map((e) => [e.id, e as RankableEvent]));
    scoredEvents = rankedRows
      .map((row) => byId.get(row.event_id))
      .filter((e): e is RankableEvent => !!e);
  }

  // Scored events keep the RPC's relevance ordering; recurring events the
  // RPC missed are appended after — they have no comparable score.
  return NextResponse.json({ events: [...scoredEvents, ...missedRecurring] });
}
