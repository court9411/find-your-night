import { Venue } from "@/lib/types";

// Keyword hints mapping each onboarding activity to the free-form vibe_tags
// venues carry. Keys match ACTIVITY_OPTIONS; values are copied from the DB's
// onboarding_vibe_map.tags (the same table seed_tag_affinity_from_onboarding
// reads) so this client-side heuristic stays aligned with the real seeding
// source of truth — keep in sync if that table changes.
const ACTIVITY_TAG_HINTS: Record<string, string[]> = {
  drinks: ["cocktails", "day-drink", "happy-hour", "dive-bar", "wine-bar", "craft-cocktails", "cocktail-bar"],
  live_music: ["live-music", "live music", "live-dj", "dj-nights", "music-showcase"],
  comedy: ["comedy"],
  food: ["food", "food-drinks", "brunch", "late-night-food"],
  rooftops: ["rooftop", "outdoor-patio", "patio", "outdoor-seating"],
  outdoors: ["outdoor", "outdoor-patio", "outdoor-seating", "year-round-outdoor"],
  arts: ["arts-culture", "art", "artist-community"],
  dancing: ["dancing", "dance party", "nightclub", "club", "nightclub-energy"],
};

// Venue.price only has 3 buckets (see lib/venueMappers.mapPriceLevel), so the
// 4-tier budget picker collapses $$$/$$$$ onto the same bucket.
function priceBucketsForLevels(levels: number[]): Set<Venue["price"]> {
  const buckets = new Set<Venue["price"]>();
  for (const level of levels) {
    if (level <= 1) buckets.add("$");
    else if (level === 2) buckets.add("$$");
    else buckets.add("$$$");
  }
  return buckets;
}

export function pickTopVenues(
  venues: Venue[],
  prefs: { activityInterests: string[]; priceLevels: number[] },
  limit = 3
): Venue[] {
  const priceBuckets = priceBucketsForLevels(prefs.priceLevels);
  const hintLists = prefs.activityInterests
    .map((interest) => ACTIVITY_TAG_HINTS[interest])
    .filter((hints): hints is string[] => !!hints);

  const scored = venues.map((venue, index) => {
    let score = 0;
    const tags = venue.tags ?? [];
    for (const hints of hintLists) {
      if (hints.some((hint) => tags.includes(hint))) score += 2;
    }
    if (priceBuckets.size > 0 && priceBuckets.has(venue.price)) score += 1;
    if (venue.liveTonight) score += 1;
    return { venue, score, index };
  });

  scored.sort((a, b) => b.score - a.score || a.index - b.index);
  return scored.slice(0, limit).map((s) => s.venue);
}
