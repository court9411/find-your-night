import { PendingEvent, Venue } from "@/lib/types";

export type RankedEvent = Partial<PendingEvent> & { id: string };

interface RankedQueryParams {
  userId?: string | null;
  anonId?: string | null;
  lat?: number | null;
  lng?: number | null;
  limit?: number;
}

export async function getRankedEvents({
  userId,
  anonId,
  lat,
  lng,
  limit,
}: RankedQueryParams): Promise<RankedEvent[]> {
  const res = await fetch("/api/rank/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, anonId, lat, lng, limit }),
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
}: RankedQueryParams): Promise<Venue[]> {
  const res = await fetch("/api/rank/venues", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, anonId, lat, lng, limit }),
  });
  if (!res.ok) throw new Error(`getRankedVenues failed: ${res.status}`);
  const data = await res.json();
  return data.venues ?? [];
}
