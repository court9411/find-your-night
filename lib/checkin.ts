import { MUSIC_OPTIONS as MUSIC_TAG_OPTIONS } from "@/lib/preferenceOptions";

export type CrowdLevel = "empty" | "filling_up" | "busy" | "packed";

export interface ScoutTierProgress {
  nextTier: string;
  remaining: number;
}

export interface ScoutStats {
  checkinCount: number;
  tier: string;
  progress: ScoutTierProgress | null;
}

export interface NearbyVenue {
  id: string;
  name: string;
  neighborhood: string | null;
  place_id: string | null;
  distanceMeters: number;
}

export interface VenueSearchResult {
  id: string;
  name: string;
  neighborhood: string | null;
  place_id: string | null;
}

// Minimal shape shared by both the GPS-match and search-result paths, once
// a venue has been picked and the check-in form takes over.
export interface SelectedVenue {
  id: string;
  name: string;
  neighborhood: string | null;
}

export interface RecentCheckin {
  crowd_level: CrowdLevel | null;
  wait_minutes: number | null;
  cover_amount: number | null;
  music_tags: string[] | null;
  minutes_ago: number;
}

export const CROWD_LEVEL_OPTIONS: { value: CrowdLevel; label: string }[] = [
  { value: "empty", label: "Empty" },
  { value: "filling_up", label: "Filling Up" },
  { value: "busy", label: "Busy" },
  { value: "packed", label: "Packed" },
];

// Map pin colors per live crowd_level. No recent check-in data at all uses
// the neutral gray. filling_up reuses the app's own accent green; busy/red
// reuse the same orange-400/red-500 shades already used elsewhere in the
// app (hours-closing-soon warning, form error states) rather than
// inventing a new palette.
export const NO_DATA_PIN_COLOR = "#71717A";
export const CROWD_LEVEL_PIN_COLORS: Record<CrowdLevel, string> = {
  empty: "#64748B",
  filling_up: "#22C55E",
  busy: "#FB923C",
  packed: "#EF4444",
};

export function crowdLevelPinColor(level: CrowdLevel | null | undefined): string {
  return level ? CROWD_LEVEL_PIN_COLORS[level] : NO_DATA_PIN_COLOR;
}

export interface VenuePin {
  id: string;
  name: string;
  neighborhood: string | null;
  lat: number;
  lng: number;
  crowdLevel: CrowdLevel | null;
}

// Same 8-genre taxonomy as onboarding/profile music_prefs — must stay in
// sync so check-in tags feed the same rec-engine signal. "Other" is a
// check-in-only addition (no free text, just another selectable tag saved
// into music_tags like the rest) — not part of the shared taxonomy, so it's
// appended here rather than added to MUSIC_OPTIONS itself.
export const CHECKIN_MUSIC_TAGS = [...MUSIC_TAG_OPTIONS, "Other"];

export function crowdLevelLabel(level: CrowdLevel | null | undefined): string {
  return CROWD_LEVEL_OPTIONS.find((o) => o.value === level)?.label ?? "";
}

export const CHECKIN_COUNTDOWN_MINUTES = 90;
