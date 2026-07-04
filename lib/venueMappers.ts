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
