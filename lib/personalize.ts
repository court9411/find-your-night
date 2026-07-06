import { Venue } from "@/lib/types";

// Loose keyword hints mapping each onboarding vibe to the free-form vibe_tags
// venues actually carry today. The tagging vocabulary isn't aligned to these
// categories yet (that's separate DB-side curation work), so this is a
// best-effort heuristic to make onboarding feel personalized — not a precise
// match. Swap out once real per-category tagging exists.
const ACTIVITY_TAG_HINTS: Record<string, string[]> = {
  "Drinks & Bars": [
    "cocktails", "cocktail-bar", "craft-cocktails", "dive-bar", "neighborhood-bar",
    "wine-bar", "wine", "day-drink", "happy-hour", "bottle-service", "craft-beer", "self-pour", "hookah",
  ],
  "Food & Drinks": ["food-drinks", "brunch", "grill"],
  "Live Music": [
    "live-music", "music", "live-dj", "dj-nights", "music-showcase",
    "hip-hop", "rnb", "90s-rnb", "international-music", "karaoke",
  ],
  "Fresh Air": ["outdoor", "outdoor-patio", "outdoor-seating", "patio", "year-round-outdoor"],
  "Late Night Eats": ["late-night-food", "late-night"],
  "Rooftop Vibes": ["rooftop", "elevated-vibes", "upscale", "luxury"],
  "Casual Fun": ["chill", "relaxed", "low-key", "pool-table", "social", "neighborhood", "dive-bar"],
  "Arts & Events": ["arts-culture", "events", "artist-community", "award-winning", "black-film", "music-showcase"],
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
