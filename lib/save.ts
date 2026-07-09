"use client";

// The single implementation of "persist a save/unsave" per entity type.
// Every page with a save/bookmark/Skip-Saved action calls into these —
// never builds its own fetch() to /api/interactions — so a mistake like
// passing a venue's id where an event id belongs can't happen per call
// site, only here, once, per entity type.

type SavedItemType = "event" | "venue";

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return typeof body?.error === "string" ? body.error : `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}

async function postSaved(itemType: SavedItemType, itemId: string): Promise<void> {
  const res = await fetch("/api/interactions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itemType, itemId, interactionType: "saved" }),
  });
  if (!res.ok) throw new Error(await readErrorMessage(res));
}

async function deleteSaved(itemType: SavedItemType, itemId: string): Promise<void> {
  const res = await fetch("/api/interactions", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itemType, itemId }),
  });
  if (!res.ok) throw new Error(await readErrorMessage(res));
}

async function fetchSavedIds(itemType: SavedItemType, key: "event_id" | "place_id"): Promise<Set<string>> {
  const res = await fetch(`/api/interactions?type=saved&itemType=${itemType}`);
  if (!res.ok) throw new Error(await readErrorMessage(res));
  const json = await res.json();
  const items: Array<Record<string, unknown>> = json.items ?? [];
  return new Set(
    items.map((item) => item[key]).filter((v): v is string => typeof v === "string")
  );
}

/** Saves a specific dated event — writes to user_event_interactions, keyed by pending_events.id. */
export function saveEvent(eventId: string): Promise<void> {
  if (!eventId) return Promise.reject(new Error("saveEvent: eventId is required"));
  return postSaved("event", eventId);
}

export function unsaveEvent(eventId: string): Promise<void> {
  if (!eventId) return Promise.reject(new Error("unsaveEvent: eventId is required"));
  return deleteSaved("event", eventId);
}

/** Saves a venue generally (not tied to one dated event) — writes to user_venue_interactions, keyed by venues.place_id. */
export function saveVenue(placeId: string): Promise<void> {
  if (!placeId) return Promise.reject(new Error("saveVenue: placeId is required"));
  return postSaved("venue", placeId);
}

export function unsaveVenue(placeId: string): Promise<void> {
  if (!placeId) return Promise.reject(new Error("unsaveVenue: placeId is required"));
  return deleteSaved("venue", placeId);
}

export function fetchSavedEventIds(): Promise<Set<string>> {
  return fetchSavedIds("event", "event_id");
}

export function fetchSavedVenuePlaceIds(): Promise<Set<string>> {
  return fetchSavedIds("venue", "place_id");
}
