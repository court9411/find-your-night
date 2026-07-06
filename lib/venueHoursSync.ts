import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { RegularHours } from "@/lib/venueHours";

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_SERVER_KEY;
const HOURS_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // ~monthly

interface VenueRow {
  id: string;
  name: string;
  place_id: string;
  regular_hours_fetched_at: string | null;
}

async function fetchRegularHours(placeId: string): Promise<RegularHours | null> {
  const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
    headers: {
      "X-Goog-Api-Key": GOOGLE_API_KEY!,
      "X-Goog-FieldMask": "regularOpeningHours",
    },
  });
  if (!res.ok) throw new Error(`Place Details ${res.status}: ${await res.text()}`);
  const data = await res.json();
  // Google omits this field entirely for venues with no published hours.
  return data.regularOpeningHours ?? null;
}

// Curated venues use synthetic place_ids (e.g. "curated-bar-29") for venues
// never matched to a real Google Place — Google always 400s on these.
async function fetchVenuesNeedingHours(limit: number): Promise<VenueRow[]> {
  const { data: venues, error } = await supabaseAdmin
    .from("venues")
    .select("id, name, place_id, regular_hours_fetched_at")
    .not("place_id", "is", null)
    .neq("source", "curated");
  if (error) throw error;

  const now = Date.now();
  const stale = (venues ?? []).filter((v) => {
    if (!v.regular_hours_fetched_at) return true;
    return now - new Date(v.regular_hours_fetched_at).getTime() > HOURS_MAX_AGE_MS;
  });

  return stale.slice(0, limit);
}

async function updateVenueHours(venueId: string, regularHours: RegularHours | null) {
  const { error } = await supabaseAdmin
    .from("venues")
    .update({ regular_hours: regularHours, regular_hours_fetched_at: new Date().toISOString() })
    .eq("id", venueId);
  if (error) throw error;
}

export interface HoursSyncSummary {
  candidates: number;
  refreshed: number;
  noHours: number;
  failed: number;
  errors: { venue: string; message: string }[];
}

/**
 * Refreshes up to `limit` stale/missing venue hours per call. Bounded so a
 * single invocation stays well inside a serverless function's timeout —
 * called daily by the venue-hours cron route, it works through however many
 * venues are due without ever trying to do all ~450 at once.
 */
export async function runVenueHoursSync(limit = 60): Promise<HoursSyncSummary> {
  if (!GOOGLE_API_KEY) throw new Error("GOOGLE_MAPS_SERVER_KEY is not set");

  const venues = await fetchVenuesNeedingHours(limit);
  const summary: HoursSyncSummary = { candidates: venues.length, refreshed: 0, noHours: 0, failed: 0, errors: [] };

  for (const venue of venues) {
    try {
      const regularHours = await fetchRegularHours(venue.place_id);
      // Stamp fetched_at either way — Google genuinely has no hours for some
      // venues, and we don't want to re-request those every single run.
      await updateVenueHours(venue.id, regularHours);
      if (regularHours) {
        summary.refreshed++;
      } else {
        summary.noHours++;
      }
    } catch (err) {
      // Leave regular_hours_fetched_at untouched on a fetch failure so this
      // venue gets retried on the next cron run instead of waiting a month.
      summary.failed++;
      summary.errors.push({ venue: venue.name, message: err instanceof Error ? err.message : String(err) });
    }
  }

  return summary;
}
