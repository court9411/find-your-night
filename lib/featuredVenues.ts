import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { Price, Venue } from "@/lib/types";
import { deleteExpiredEvents, todayDateString } from "@/lib/eventCleanup";
import { generateWhyTonight } from "@/lib/whyTonight";
import { geocodeAddress } from "@/lib/geocode";
import { shuffle } from "@/lib/shuffle";

function nDaysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

// Geocodes and persists lat/lng for rows that don't have coordinates yet,
// so future requests for the same venue/event don't re-geocode. Mutates
// each row's lat/lng in place when geocoding succeeds.
async function backfillCoords<T extends { id: string; lat: number | null; lng: number | null }>(
  table: "submissions" | "pending_events",
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
      const { error } = await supabaseAdmin.from(table).update({ lat: coords.lat, lng: coords.lng }).eq("id", row.id);
      if (error) console.error(`Failed to persist geocoded coords for ${table}:`, error);
    })
  );
}

function mapPrice(price: string | null): Price {
  if (!price) return "$$";
  if (price.includes("$$$")) return "$$$";
  if (price.includes("$$")) return "$$";
  if (price.includes("$")) return "$";
  if (/free/i.test(price)) return "$";
  return "$$";
}

const SEASONAL_CATEGORIES = ["Juneteenth", "Pride", "July4th"];

async function fetchPendingEvents(cityToken: string, label: string, maxDays: number) {
  let q = supabase
    .from("pending_events")
    .select("id, event_name, venue_name, neighborhood, address, description, date, start_time, end_time, price, vibe_tags, city, display_order, featured, category, lat, lng, image_url")
    .eq("status", "approved")
    .gte("date", todayDateString())
    .lte("date", nDaysFromNow(maxDays))
    .order("date", { ascending: true })
    .order("start_time", { ascending: true })
    .ilike("city", `%${cityToken}%`);

  const isSeasonalLabel = SEASONAL_CATEGORIES.some(
    (c) => c.toLowerCase() === label?.toLowerCase()
  );

  if (isSeasonalLabel) {
    // User clicked a seasonal chip — show only that category
    q = q.ilike("category", label);
  } else if (label && label !== "Surprise Me") {
    // Vibe search — filter to the vibe and exclude seasonal categories
    q = q.ilike("category", label);
    for (const cat of SEASONAL_CATEGORIES) {
      q = q.not("category", "ilike", cat);
    }
  } else {
    // General search / Surprise Me — exclude seasonal categories
    for (const cat of SEASONAL_CATEGORIES) {
      q = q.not("category", "ilike", cat);
    }
  }

  return q;
}

export async function getFeaturedVenues(city: string, label: string): Promise<Venue[]> {
  const cityToken = city.split(",")[0].trim();
  if (!cityToken) return [];

  await deleteExpiredEvents();

  let submissionsQuery = supabase
    .from("submissions")
    .select("id, venue_name, type, neighborhood, city, date_time, description, vibe_tags, lat, lng")
    .eq("status", "approved")
    .ilike("city", `%${cityToken}%`);

  if (label && label !== "Surprise Me") {
    submissionsQuery = submissionsQuery.ilike("vibe_tags", `%${label}%`);
  }

  // Run submissions and first pending query in parallel; fall back to 14 days only if needed
  const [{ data: submissionsData, error: submissionsError }, first7] = await Promise.all([
    submissionsQuery,
    fetchPendingEvents(cityToken, label, 7),
  ]);

  let pendingData = first7.data;
  let pendingError = first7.error;

  if ((pendingData?.length ?? 0) < 3) {
    const fallback = await fetchPendingEvents(cityToken, label, 14);
    if (!fallback.error) {
      pendingData = fallback.data;
      pendingError = null;
    }
  }

  console.log("Featured venues - submissions query:", { cityToken, label, data: submissionsData, error: submissionsError });
  console.log("Featured venues - pending_events query:", { cityToken, data: pendingData, error: pendingError });

  if (submissionsError) console.error("Featured venues fetch error (submissions):", submissionsError);
  if (pendingError) console.error("Featured venues fetch error (pending_events):", pendingError);

  await Promise.all([
    backfillCoords("submissions", submissionsData ?? [], (row) =>
      [row.venue_name, row.neighborhood, row.city].filter(Boolean).join(", ") || null
    ),
    backfillCoords("pending_events", pendingData ?? [], (row) =>
      row.address || [row.venue_name, row.neighborhood, row.city].filter(Boolean).join(", ") || null
    ),
  ]);

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
  const unpinned = shuffle(sortedPending.filter((row) => !row.featured).map(mapPending));

  const combined = [...pinned, ...shuffle(fromSubmissions), ...unpinned];

  const needsWhyTonight = combined.filter((venue) => !venue.whyTonight);
  if (needsWhyTonight.length > 0) {
    const generated = await generateWhyTonight(
      needsWhyTonight.map((venue) => ({
        name: venue.name,
        description: venue.description,
        eventDate: venue.eventDate,
        eventTime: venue.eventTime,
        tags: venue.tags,
      }))
    );
    needsWhyTonight.forEach((venue, i) => {
      venue.whyTonight = generated[i];
    });
  }

  return combined;
}
