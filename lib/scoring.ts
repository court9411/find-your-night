import { PendingEvent, Venue } from "@/lib/types";

export type RankedEvent = Partial<PendingEvent> & { id: string };

interface RankedQueryParams {
  userId?: string | null;
  anonId?: string | null;
  lat?: number | null;
  lng?: number | null;
  limit?: number;
  /** Venue ids to omit from the result — used by the Smart Night Picker's
   * refill queue so repeat swipe batches don't resurface already-seen
   * venues. Passed through to get_ranked_venues's p_exclude_ids param;
   * see app/api/rank/venues/route.ts for the degrade behavior while that
   * param isn't deployed DB-side yet. */
  excludeIds?: string[];
  /** Picker-only session context. Presence of sessionVibes/venueCategories
   * routes app/api/rank/venues to rank_venues_for_user instead of
   * get_ranked_venues — see that route for the branch. */
  sessionVibes?: string[];
  priceLevels?: number[];
  groupSize?: string | null;
  venueCategories?: string[];
}

interface RankedEventQueryParams extends RankedQueryParams {
  source?: string | null;
}

export async function getRankedEvents({
  userId,
  anonId,
  lat,
  lng,
  limit,
  source,
}: RankedEventQueryParams): Promise<RankedEvent[]> {
  const res = await fetch("/api/rank/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, anonId, lat, lng, limit, source }),
  });
  if (!res.ok) throw new Error(`getRankedEvents failed: ${res.status}`);
  const data = await res.json();
  return data.events ?? [];
}

export async function getRankedVenues({
  userId,
  anonId,
  lat,
  lng,
  limit,
  excludeIds,
  sessionVibes,
  priceLevels,
  groupSize,
  venueCategories,
}: RankedQueryParams): Promise<Venue[]> {
  const res = await fetch("/api/rank/venues", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId,
      anonId,
      lat,
      lng,
      limit,
      excludeIds,
      sessionVibes,
      priceLevels,
      groupSize,
      venueCategories,
    }),
  });
  if (!res.ok) throw new Error(`getRankedVenues failed: ${res.status}`);
  const data = await res.json();
  return data.venues ?? [];
}
