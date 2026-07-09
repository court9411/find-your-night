export interface PendingVisit {
  id: string;
  event_name: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  venue_name: string;
  venue_id: string | null;
  neighborhood: string | null;
  image_url: string | null;
}

export type VisitRating = 1 | 2 | 3 | 4;
export type CrowdLevel = "dead" | "decent" | "busy" | "packed";
export type MusicQuality = "wrong_vibe" | "fine" | "loved_it";
export type PriceSentiment = "expensive" | "fair" | "cheap";

export const RATING_OPTIONS: { value: VisitRating; emoji: string; label: string }[] = [
  { value: 1, emoji: "😞", label: "Miss" },
  { value: 2, emoji: "🙂", label: "Good" },
  { value: 3, emoji: "🔥", label: "Great" },
  { value: 4, emoji: "🤯", label: "Incredible" },
];

export const CROWD_OPTIONS: { value: CrowdLevel; label: string }[] = [
  { value: "dead", label: "Dead" },
  { value: "decent", label: "Decent" },
  { value: "busy", label: "Busy" },
  { value: "packed", label: "Packed" },
];

export const MUSIC_OPTIONS: { value: MusicQuality; label: string }[] = [
  { value: "wrong_vibe", label: "Wrong Vibe" },
  { value: "fine", label: "Fine" },
  { value: "loved_it", label: "Loved It" },
];

export const PRICE_OPTIONS: { value: PriceSentiment; label: string }[] = [
  { value: "expensive", label: "Expensive" },
  { value: "fair", label: "Fair" },
  { value: "cheap", label: "Cheap" },
];

export function ratingEmoji(rating: VisitRating | null | undefined): string {
  return RATING_OPTIONS.find((o) => o.value === rating)?.emoji ?? "";
}

export function ratingLabel(rating: VisitRating | null | undefined): string {
  return RATING_OPTIONS.find((o) => o.value === rating)?.label ?? "";
}

export function crowdLabel(level: CrowdLevel | null | undefined): string {
  return CROWD_OPTIONS.find((o) => o.value === level)?.label ?? "";
}

export function musicLabel(quality: MusicQuality | null | undefined): string {
  return MUSIC_OPTIONS.find((o) => o.value === quality)?.label ?? "";
}

export function priceLabel(sentiment: PriceSentiment | null | undefined): string {
  return PRICE_OPTIONS.find((o) => o.value === sentiment)?.label ?? "";
}
