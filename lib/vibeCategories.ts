import { formatDateRange, getSeasonalCategoryOptions } from "@/lib/seasonal.config";

// Category labels an admin can assign to a pending event so it surfaces
// in the matching vibe's search results. Mirrors the labels used in
// components/VibeSelector.tsx and passed as `label` to /api/featured.
export const VIBE_CATEGORIES = [
  "Drinks & Bars",
  "Live Music",
  "Night Out",
  "Late Night Eats",
  "Rooftop Vibes",
  "Casual Fun",
  "Arts & Events",
  "Surprise Me",
] as const;

export interface CategoryOption {
  value: string;
  label: string;
}

const vibeOptions: CategoryOption[] = VIBE_CATEGORIES.map((c) => ({ value: c, label: c }));

// Seasonal categories that are either active today or starting soon, so
// events can be submitted/categorized ahead of the season. Upcoming (not
// yet active) entries are labeled with their date range.
const seasonalOptions: CategoryOption[] = getSeasonalCategoryOptions().map(({ entry, active }) => ({
  value: entry.category,
  label: active ? entry.label : `${entry.label} (${formatDateRange(entry)})`,
}));

// All categories an event can be listed under: the 8 vibes plus any
// active-or-upcoming seasonal categories.
export const EVENT_CATEGORIES: CategoryOption[] = [...vibeOptions, ...seasonalOptions];
