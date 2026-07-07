export type RailTimeContext = "tonight" | "today";

export interface RailConfig {
  id: string;
  emoji: string;
  title: string;
  timeContext: RailTimeContext;
  railType: string; // maps to p_rail_type in get_rail_venues
}

export const TONIGHT_RAILS: RailConfig[] = [
  { id: "trending", emoji: "🔥", title: "Trending Right Now", timeContext: "tonight", railType: "trending" },
  { id: "date_night", emoji: "❤️", title: "Date Night", timeContext: "tonight", railType: "date_night" },
  { id: "free", emoji: "🆓", title: "Free Stuff", timeContext: "tonight", railType: "free" },
];

// Daytime rail types aren't scoped yet — Phase 2 (Happy Hour Ending Soon,
// Late Night Eats) is blocked on data that doesn't exist yet. Leave this
// empty until that's decided rather than guessing at daytime categories.
export const TODAY_RAILS: RailConfig[] = [];

/** Simplest v1 day/night split: before 5pm local time → Today, after → Tonight. */
export function getActiveRails(now: Date = new Date()): RailConfig[] {
  return now.getHours() < 17 ? TODAY_RAILS : TONIGHT_RAILS;
}
