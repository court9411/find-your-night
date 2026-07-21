import { Venue } from "@/lib/types";

export type NightOrDay = "night" | "day";
export type GroupSize = "solo" | "2" | "3-5" | "6+";
export type AgeRange = "21-24" | "25-29" | "30-34" | "35-44" | "45+";

export interface PickerAnswers {
  nightOrDay: NightOrDay;
  groupSize: GroupSize;
  ageRange: AgeRange;
}

const CATEGORY_MATCH: Record<NightOrDay, string[]> = {
  night: ["nightlife", "entertainment"],
  day: ["daytime_outdoor"],
};

const STACK_SIZE = 3;

function venueKey(venue: Venue): string {
  return venue.id ?? venue.placeId ?? venue.name;
}

/**
 * Reorders an already-ranked list (get_ranked_venues, unmodified) so
 * venue_category matches for the night/day answer come first, followed by
 * everything else — same relative order within each group, no venues
 * dropped. Shared by the initial pick (capped to STACK_SIZE) and refill
 * batches (used in full, no cap) so both apply the same category
 * preference consistently.
 */
export function sortByCategoryPreference(rankedVenues: Venue[], nightOrDay: NightOrDay): Venue[] {
  const categories = CATEGORY_MATCH[nightOrDay];
  const matched = rankedVenues.filter((v) => v.venueCategory && categories.includes(v.venueCategory));

  const ordered: Venue[] = [];
  const seen = new Set<string>();
  for (const venue of [...matched, ...rankedVenues]) {
    const key = venueKey(venue);
    if (seen.has(key)) continue;
    seen.add(key);
    ordered.push(venue);
  }
  return ordered;
}

/**
 * Picks up to STACK_SIZE venues for the initial swipe stack. `sparse` only
 * reflects the overall pool being thin (fewer than STACK_SIZE ranked
 * venues total, regardless of category) — that's the honest case worth
 * surfacing, not "this category was thin but we backfilled fine."
 */
export function pickPickerVenues(
  rankedVenues: Venue[],
  answers: Pick<PickerAnswers, "nightOrDay">
): { picks: Venue[]; sparse: boolean } {
  const picks = sortByCategoryPreference(rankedVenues, answers.nightOrDay).slice(0, STACK_SIZE);
  return { picks, sparse: rankedVenues.length < STACK_SIZE };
}
