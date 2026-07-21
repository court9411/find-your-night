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
 * Picks up to STACK_SIZE venues for the swipe stack from an already-ranked
 * list (get_ranked_venues, unmodified) — filters toward the night/day
 * answer's venue_category, then backfills from the unfiltered ranking if
 * the category-matched set runs thin, so the stack still fills whenever
 * the overall ranked pool can support it. `sparse` only reflects the
 * overall pool being thin (fewer than STACK_SIZE ranked venues total,
 * regardless of category) — that's the honest case worth surfacing, not
 * "this category was thin but we backfilled fine."
 */
export function pickPickerVenues(
  rankedVenues: Venue[],
  answers: Pick<PickerAnswers, "nightOrDay">
): { picks: Venue[]; sparse: boolean } {
  const categories = CATEGORY_MATCH[answers.nightOrDay];
  const matched = rankedVenues.filter((v) => v.venueCategory && categories.includes(v.venueCategory));

  const picks: Venue[] = [];
  const seen = new Set<string>();

  for (const venue of [...matched, ...rankedVenues]) {
    if (picks.length >= STACK_SIZE) break;
    const key = venueKey(venue);
    if (seen.has(key)) continue;
    seen.add(key);
    picks.push(venue);
  }

  return { picks, sparse: rankedVenues.length < STACK_SIZE };
}
