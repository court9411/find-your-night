"use client";

import { saveEvent, unsaveEvent, fetchSavedEventIds } from "@/lib/save";
import { useSaveToggle } from "@/lib/useSaveToggle";

/** Save state for one specific dated event, keyed by pending_events.id. */
export function useSaveEvent(eventId: string) {
  return useSaveToggle({
    itemId: eventId,
    isSaved: async () => (await fetchSavedEventIds()).has(eventId),
    save: () => saveEvent(eventId),
    unsave: () => unsaveEvent(eventId),
    scoringTargetType: "event",
    scoringTargetId: eventId,
  });
}
