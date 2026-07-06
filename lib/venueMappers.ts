import { Price } from "@/lib/types";

const TYPE_LABELS: Record<string, string> = {
  bar: "Bar",
  night_club: "Nightclub",
  restaurant: "Restaurant",
  cafe: "Café",
  bowling_alley: "Bowling Alley",
  movie_theater: "Movie Theater",
  amusement_park: "Amusement Park",
  museum: "Museum",
  art_gallery: "Art Gallery",
  park: "Park",
  zoo: "Zoo",
  aquarium: "Aquarium",
};

export function deriveType(types: string[] | null): string {
  for (const t of types ?? []) {
    if (TYPE_LABELS[t]) return TYPE_LABELS[t];
  }
  return "Venue";
}

export function mapPriceLevel(level: number | null | undefined): Price {
  if (level == null) return "$$";
  if (level <= 1) return "$";
  if (level === 2) return "$$";
  return "$$$";
}

export interface VenuePhotoRow {
  photo_url: string;
  attribution_name: string | null;
  attribution_uri: string | null;
  photo_source: string | null;
}

// venue_photos is unique on (venue_id, photo_source), so a venue can have
// one row per source at once (promoter upload, FYN-sourced, user-submitted,
// Google backfill). Pick the highest-priority source that's present.
const PHOTO_SOURCE_PRIORITY = ["promoter", "findyournight", "user", "google"];

function photoSourceRank(source: string | null): number {
  const rank = PHOTO_SOURCE_PRIORITY.indexOf(source ?? "");
  return rank === -1 ? PHOTO_SOURCE_PRIORITY.length : rank;
}

// Supabase/PostgREST returns an embedded relation as an array; normalize a
// single object too in case a caller's select ever narrows to one row.
export function pickVenuePhoto(row: VenuePhotoRow | VenuePhotoRow[] | null): VenuePhotoRow | null {
  if (!row) return null;
  const rows = Array.isArray(row) ? row : [row];
  if (rows.length === 0) return null;
  return rows.reduce((best, candidate) =>
    photoSourceRank(candidate.photo_source) < photoSourceRank(best.photo_source) ? candidate : best
  );
}
