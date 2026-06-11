import { supabase } from "@/lib/supabase";
import { Price, Venue } from "@/lib/types";

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

  let submissionsQuery = supabase
    .from("submissions")
    .select("venue_name, type, neighborhood, date_time, description, vibe_tags")
    .eq("status", "approved")
    .ilike("city", `%${cityToken}%`);

  if (label && label !== "Surprise Me") {
    submissionsQuery = submissionsQuery.ilike("vibe_tags", `%${label}%`);
  }

  const pendingQuery = supabase
    .from("pending_events")
    .select("event_name, venue_name, neighborhood, description, date, start_time, end_time, price, vibe_tags, city")
    .eq("status", "approved")
    .ilike("city", `%${cityToken}%`);

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
    whyTonight: `Happening ${row.date_time}`,
    price: "$$" as const,
    tags: row.vibe_tags
      ? row.vibe_tags.split(",").map((t: string) => t.trim()).filter(Boolean)
      : [],
    featured: true,
  }));

  const fromPending: Venue[] = (pendingData ?? []).map((row) => ({
    name: row.event_name || row.venue_name,
    type: "Event",
    neighborhood: row.neighborhood ?? row.venue_name,
    description: row.description ?? "",
    whyTonight: row.end_time
      ? `Happening ${row.date} from ${row.start_time} to ${row.end_time}`
      : `Happening ${row.date} at ${row.start_time}`,
    price: mapPrice(row.price),
    tags: row.vibe_tags ?? [],
    featured: true,
  }));

  return [...fromSubmissions, ...fromPending];
}
