import { supabase } from "@/lib/supabase";
import { Venue } from "@/lib/types";

export async function getFeaturedVenues(city: string, label: string): Promise<Venue[]> {
  const cityToken = city.split(",")[0].trim();
  if (!cityToken) return [];

  let query = supabase
    .from("submissions")
    .select("venue_name, type, neighborhood, date_time, description, vibe_tags")
    .eq("status", "approved")
    .ilike("city", `%${cityToken}%`);

  if (label && label !== "Surprise Me") {
    query = query.ilike("vibe_tags", `%${label}%`);
  }

  const { data, error } = await query;

  if (error || !data) {
    if (error) console.error("Featured venues fetch error:", error);
    return [];
  }

  return data.map((row) => ({
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
}
