import { SEASONAL } from "@/lib/seasonal.config";

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

// All categories an event can be listed under, including the current
// seasonal category (e.g. "Pride" in June).
export const EVENT_CATEGORIES = [...VIBE_CATEGORIES, SEASONAL.category] as const;
