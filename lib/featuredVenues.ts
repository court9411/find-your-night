import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { Venue } from "@/lib/types";
import { geocodeAddress } from "@/lib/geocode";

// Geocodes and persists lat/lng for rows that don't have coordinates yet,
// so future requests for the same venue don't re-geocode. Mutates each
// row's lat/lng in place when geocoding succeeds.
async function backfillCoords<T extends { id: string; lat: number | null; lng: number | null }>(
  rows: T[],
  buildQuery: (row: T) => string | null
): Promise<void> {
  await Promise.all(
    rows.map(async (row) => {
      if (row.lat != null && row.lng != null) return;
      const query = buildQuery(row);
      if (!query) return;

      const coords = await geocodeAddress(query);
      if (!coords) return;

      row.lat = coords.lat;
      row.lng = coords.lng;
      const { error } = await supabaseAdmin
        .from("submissions")
        .update({ lat: coords.lat, lng: coords.lng })
        .eq("id", row.id);
      if (error) console.error("Failed to persist geocoded coords for submissions:", error);
    })
  );
}

// User-submitted venues (bars/drinks spots manually added via /submit-venue
// style flow). Promoter events live in pending_events and are surfaced only
// in the "What's Happening" carousel — kept out of this feed to avoid
// duplication on the results page.
export async function getSubmittedVenues(city: string): Promise<Venue[]> {
  const cityToken = city.split(",")[0].trim();
  if (!cityToken) return [];

  const { data, error } = await supabase
    .from("submissions")
    .select("id, venue_name, type, neighborhood, city, date_time, description, vibe_tags, lat, lng")
    .eq("status", "approved")
    .ilike("city", `%${cityToken}%`);

  if (error) {
    console.error("Submitted venues fetch error:", error);
    return [];
  }

  const rows = data ?? [];
  await backfillCoords(rows, (row) =>
    [row.venue_name, row.neighborhood, row.city].filter(Boolean).join(", ") || null
  );

  return rows.map((row) => ({
    name: row.venue_name,
    type: row.type,
    neighborhood: row.neighborhood,
    description: row.description,
    whyTonight: "",
    price: "$$" as const,
    tags: row.vibe_tags
      ? row.vibe_tags.split(",").map((t: string) => t.trim()).filter(Boolean)
      : [],
    lat: row.lat ?? null,
    lng: row.lng ?? null,
  }));
}
