export const VIBE_OPTIONS = [
  "Low-Key", "Hype", "Date Night", "Girls Night",
  "Outdoor", "Late Night", "Arts", "Sports",
];

export const MUSIC_OPTIONS = [
  "Hip-Hop / Rap", "R&B / Soul", "Afrobeats", "House / EDM",
  "Latin", "Jazz / Neo Soul", "Live Bands", "Gospel",
];

// MUSIC_OPTIONS values -> log_genre_preferences' p_genres keys. That RPC
// (and user_genre_preferences.genre) expects exactly these snake_case
// values, not the display labels above.
export const MUSIC_OPTION_GENRE_KEYS: Record<string, string> = {
  "Hip-Hop / Rap": "hip_hop_rap",
  "R&B / Soul": "rnb_soul",
  "Afrobeats": "afrobeats",
  "House / EDM": "house_edm",
  "Latin": "latin",
  "Jazz / Neo Soul": "jazz_neo_soul",
  "Live Bands": "live_bands",
  "Gospel": "gospel",
};

// Stored values match onboarding_vibe_map.ui_option in the DB exactly, so
// activity_interests entries map 1:1 to seed_tag_affinity_from_onboarding's
// p_selected_options without a translation step — also matches the
// lowercase keys already present in existing user_profiles rows.
export const ACTIVITY_OPTIONS = [
  "drinks", "live_music", "comedy", "food",
  "rooftops", "outdoors", "arts", "dancing",
];

export const ACTIVITY_OPTION_LABELS: Record<string, string> = {
  drinks: "Drinks",
  live_music: "Live Music",
  comedy: "Comedy",
  food: "Food",
  rooftops: "Rooftops",
  outdoors: "Outdoors",
  arts: "Arts",
  dancing: "Dancing",
};

export const BUDGET_OPTIONS: { label: string; value: number }[] = [
  { label: "$", value: 1 },
  { label: "$$", value: 2 },
  { label: "$$$", value: 3 },
  { label: "$$$$", value: 4 },
];
