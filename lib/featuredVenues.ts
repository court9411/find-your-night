import { supabase } from "@/lib/supabase";
import { Price, Venue } from "@/lib/types";
import { deleteExpiredEvents, todayDateString } from "@/lib/eventCleanup";
import { getSupplementalVenues } from "@/lib/supplementalVenues";

const MIN_RESULTS = 5;

function mapPrice(price: string | null): Price {
  if (!price) return "$$";
  if (price.includes("$$$")) return "$$$";
  if (price.includes("$$")) return "$$";
  if (price.includes("$")) return "$";
  if (/free/i.test(price)) return "$";
  return "$$";
}

export async function getFeaturedVenues(city: string, label: string): Promise<Venue[]> {
  const cityToken = city.split(",")[0].trim();
  if (!cityToken) return [];

  await deleteExpiredEvents();

  let submissionsQuery = supabase
    .from("submissions")
    .select("venue_name, type, neighborhood, date_time, description, vibe_tags, lat, lng")
    .eq("status", "approved")
    .ilike("city", `%${cityToken}%`);

  if (label && label !== "Surprise Me") {
    submissionsQuery = submissionsQuery.ilike("vibe_tags", `%${label}%`);
  }

  let pendingQuery = supabase
    .from("pending_events")
    .select("event_name, venue_name, neighborhood, description, date, start_time, end_time, price, vibe_tags, city, display_order, featured, category, lat, lng, image_url")
    .eq("status", "approved")
    .gte("date", todayDateString())
    .ilike("city", `%${cityToken}%`);

  if (label && label !== "Surprise Me") {
    pendingQuery = pendingQuery.ilike("category", label);
  }

  const [
    { data: submissionsData, error: submissionsError },
    { data: pendingData, error: pendingError },
  ] = await Promise.all([submissionsQuery, pendingQuery]);

  console.log("Featured venues - submissions query:", { cityToken, label, data: submissionsData, error: submissionsError });
  console.log("Featured venues - pending_events query:", { cityToken, data: pendingData, error: pendingError });

  if (submissionsError) console.error("Featured venues fetch error (submissions):", submissionsError);
  if (pendingError) console.error("Featured venues fetch error (pending_events):", pendingError);

  const fromSubmissions: Venue[] = (submissionsData ?? []).map((row) => ({
    name: row.venue_name,
    type: row.type,
    neighborhood: row.neighborhood,
    description: row.description,
    whyTonight: "",
    price: "$$" as const,
    tags: row.vibe_tags
      ? row.vibe_tags.split(",").map((t: string) => t.trim()).filter(Boolean)
      : [],
    featured: true,
    lat: row.lat ?? null,
    lng: row.lng ?? null,
    eventDate: null,
    eventTime: row.date_time,
  }));

  const sortedPending = [...(pendingData ?? [])].sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    return (a.display_order ?? 0) - (b.display_order ?? 0);
  });

  const mapPending = (row: (typeof sortedPending)[number]): Venue => ({
    name: row.event_name || row.venue_name,
    type: "Event",
    neighborhood: row.neighborhood ?? row.venue_name,
    description: row.description ?? "",
    whyTonight: "",
    price: mapPrice(row.price),
    tags: row.vibe_tags ?? [],
    featured: true,
    lat: row.lat ?? null,
    lng: row.lng ?? null,
    imageUrl: row.image_url ?? null,
    eventDate: row.date,
    eventTime: row.end_time ? `${row.start_time} – ${row.end_time}` : row.start_time,
  });

  // Pinned ("Feature This") events go to the very top of results.
  const pinned = sortedPending.filter((row) => row.featured).map(mapPending);
  const unpinned = sortedPending.filter((row) => !row.featured).map(mapPending);

  const combined = [...pinned, ...fromSubmissions, ...unpinned];

  if (combined.length < MIN_RESULTS && label) {
    const existingNames = combined.map((venue) => venue.name);
    const supplemental = await getSupplementalVenues(
      cityToken,
      label,
      MIN_RESULTS - combined.length,
      existingNames
    );
    return [...combined, ...supplemental];
  }

  return combined;
}
