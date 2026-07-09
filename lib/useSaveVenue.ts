"use client";

import { saveVenue, unsaveVenue, fetchSavedVenuePlaceIds } from "@/lib/save";
import { useSaveToggle } from "@/lib/useSaveToggle";

/**
 * Save state for a venue in general (not tied to one dated event), keyed by
 * venues.place_id. venueId (the internal uuid, distinct from place_id) is
 * only used for the scoring signal, matching what logAction expects.
 */
export function useSaveVenue(placeId: string, venueId?: string | null) {
  return useSaveToggle({
    itemId: placeId,
    isSaved: async () => (await fetchSavedVenuePlaceIds()).has(placeId),
    save: () => saveVenue(placeId),
    unsave: () => unsaveVenue(placeId),
    scoringTargetType: "venue",
    scoringTargetId: venueId ?? undefined,
  });
}
