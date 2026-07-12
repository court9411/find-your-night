export const VENUE_CATEGORY_OPTIONS = [
  { value: "nightlife", label: "Nightlife" },
  { value: "daytime_outdoor", label: "Daytime / Outdoor" },
  { value: "entertainment", label: "Entertainment" },
] as const;

export const PRICE_LEVEL_OPTIONS = [
  { value: 1, label: "$" },
  { value: 2, label: "$$" },
  { value: 3, label: "$$$" },
  { value: 4, label: "$$$$" },
] as const;
