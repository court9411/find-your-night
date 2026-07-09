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

// Same 8-genre taxonomy as onboarding/profile music_prefs — must stay in
// sync so check-in tags feed the same rec-engine signal.
export const CHECKIN_MUSIC_TAGS = MUSIC_TAG_OPTIONS;

export function crowdLevelLabel(level: CrowdLevel | null | undefined): string {
  return CROWD_LEVEL_OPTIONS.find((o) => o.value === level)?.label ?? "";
}

export const CHECKIN_COUNTDOWN_MINUTES = 90;
