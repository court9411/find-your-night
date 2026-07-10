export type RailTimeContext = "tonight" | "today";

export interface RailConfig {
  id: string;
  /** Tailwind color token suffix off the `accent` scale — "DEFAULT" renders as text-accent. Icon component is resolved client-side from `id` (see components/sectionColors.ts) since this config crosses a JSON API boundary (app/api/home-context) and React components can't survive that round-trip. */
  colorClass: string;
  title: string;
  timeContext: RailTimeContext;
  railType: string; // maps to p_rail_type in get_rail_venues
  /** Maps to p_categories in get_rail_venues. Omit to use the RPC's own default (nightlife + entertainment). */
  categories?: string[];
}

export const TONIGHT_RAILS: RailConfig[] = [
  // Label only — id/railType stay "trending" so get_rail_venues,
  // trending_featured_days day-scoping, etc. keep working unmodified.
  // "Trending" overclaims while this rail is populated by manually-flagged
  // venues (is_trending_featured) rather than real engagement data —
  // revisit once venue_popularity.recent_score has enough activity behind
  // it to earn the word back. Not a permanent rename.
  {
    id: "trending",
    colorClass: "accent",
    title: "Popular Picks",
    timeContext: "tonight",
    railType: "trending",
  },
  {
    id: "date_night",
    colorClass: "accent-pink",
    title: "Date Night",
    timeContext: "tonight",
    railType: "date_night",
  },
  // price_level = 1 covers "free or cheap" as one combined tier in the
  // schema — "Budget-Friendly" is the honest name for that; "Free Stuff"
  // overpromised (these are $ cafes/spots, not literally free).
  {
    id: "budget_friendly",
    colorClass: "accent-amber",
    title: "Budget-Friendly",
    timeContext: "tonight",
    railType: "free",
  },
];

// Full daytime rail design (Adventurous, Outdoor, etc.) is a separate task.
// This is a single placeholder rail proving get_rail_venues works for
// daytime content via p_categories — same RPC, same closed-venue
// filtering, same distance sort as the nightlife rails, just a different
// category array. rail_type doesn't carry nightlife-specific semantics
// here ('trending'/'date_night'/'free' were built for nightlife), so
// 'free' is used as a placeholder filter, not a meaningful label.
export const TODAY_RAILS: RailConfig[] = [
  {
    id: "daytime_picks",
    colorClass: "accent",
    title: "Daytime Picks",
    timeContext: "today",
    railType: "free",
    categories: ["daytime_outdoor"],
  },
];
