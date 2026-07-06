import { supabaseAdmin } from "@/lib/supabaseAdmin";

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_SERVER_KEY;
const PHOTO_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const MAX_WIDTH_PX = 800; // sized for the venue card / detail hero

interface GooglePhotoRef {
  name: string;
  authorAttributions?: { displayName?: string; uri?: string }[];
}

interface VenueRow {
  id: string;
  name: string;
  place_id: string;
}

async function fetchFirstPhotoRef(placeId: string): Promise<GooglePhotoRef | null> {
  const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
    headers: {
      "X-Goog-Api-Key": GOOGLE_API_KEY!,
      "X-Goog-FieldMask": "photos",
    },
  });
  if (!res.ok) throw new Error(`Place Details ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.photos?.[0] ?? null;
}

async function fetchPhotoMedia(photoName: string): Promise<{ photoUri: string }> {
  const params = new URLSearchParams({ maxWidthPx: String(MAX_WIDTH_PX), skipHttpRedirect: "true" });
  const res = await fetch(`https://places.googleapis.com/v1/${photoName}/media?${params}`, {
    headers: { "X-Goog-Api-Key": GOOGLE_API_KEY! },
  });
  if (!res.ok) throw new Error(`Photo media ${res.status}: ${await res.text()}`);
  return res.json();
}

async function fetchVenuePhoto(placeId: string) {
  const photo = await fetchFirstPhotoRef(placeId);
  if (!photo) return null;

  const media = await fetchPhotoMedia(photo.name);
  const attribution = photo.authorAttributions?.[0] ?? null;

  return {
    photoUrl: media.photoUri,
    attributionName: attribution?.displayName ?? null,
    attributionUri: attribution?.uri ?? null,
  };
}

// Curated venues use synthetic place_ids (e.g. "curated-bar-29") for venues
// never matched to a real Google Place — Google always 400s on these.
async function fetchVenuesNeedingPhotos(limit: number): Promise<VenueRow[]> {
  const { data: venues, error: venuesError } = await supabaseAdmin
    .from("venues")
    .select("id, name, place_id")
    .not("place_id", "is", null)
    .neq("source", "curated");
  if (venuesError) throw venuesError;

  // Scoped to our own 'google' rows — a venue can also have a promoter/user/
  // findyournight row, and that row's freshness is unrelated to ours.
  const { data: existingPhotos, error: photosError } = await supabaseAdmin
    .from("venue_photos")
    .select("venue_id, fetched_at")
    .eq("photo_source", "google");
  if (photosError) throw photosError;

  const fetchedAtByVenueId = new Map((existingPhotos ?? []).map((p) => [p.venue_id, p.fetched_at]));
  const now = Date.now();

  const stale = (venues ?? []).filter((v) => {
    const fetchedAt = fetchedAtByVenueId.get(v.id);
    if (!fetchedAt) return true;
    return now - new Date(fetchedAt).getTime() > PHOTO_MAX_AGE_MS;
  });

  return stale.slice(0, limit);
}

async function upsertVenuePhoto(
  venueId: string,
  photo: { photoUrl: string; attributionName: string | null; attributionUri: string | null }
) {
  const { error } = await supabaseAdmin.from("venue_photos").upsert(
    {
      venue_id: venueId,
      photo_source: "google",
      photo_url: photo.photoUrl,
      attribution_name: photo.attributionName,
      attribution_uri: photo.attributionUri,
      fetched_at: new Date().toISOString(),
    },
    { onConflict: "venue_id,photo_source" }
  );
  if (error) throw error;
}

export interface PhotoSyncSummary {
  candidates: number;
  refreshed: number;
  noPhoto: number;
  failed: number;
  errors: { venue: string; message: string }[];
}

/**
 * Refreshes up to `limit` stale/missing venue photos per call. Bounded so a
 * single invocation stays well inside a serverless function's timeout —
 * called daily by the venue-photos cron route, it works through however
 * many venues are due without ever trying to do all ~450 at once.
 */
export async function runVenuePhotoSync(limit = 40): Promise<PhotoSyncSummary> {
  if (!GOOGLE_API_KEY) throw new Error("GOOGLE_MAPS_SERVER_KEY is not set");

  const venues = await fetchVenuesNeedingPhotos(limit);
  const summary: PhotoSyncSummary = { candidates: venues.length, refreshed: 0, noPhoto: 0, failed: 0, errors: [] };

  for (const venue of venues) {
    try {
      const photo = await fetchVenuePhoto(venue.place_id);
      if (!photo) {
        summary.noPhoto++;
      } else {
        await upsertVenuePhoto(venue.id, photo);
        summary.refreshed++;
      }
    } catch (err) {
      summary.failed++;
      summary.errors.push({ venue: venue.name, message: err instanceof Error ? err.message : String(err) });
    }
  }

  return summary;
}
