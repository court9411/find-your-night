import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { Venue } from "@/lib/types";
import { PromoterEvent } from "@/lib/promoterEvent";
import { deriveType, mapPriceLevel, pickVenuePhoto, VenuePhotoRow } from "@/lib/venueMappers";
import { isVenueOpenNow, RegularHours } from "@/lib/venueHours";
import { getTonightDateString } from "@/lib/cincyDate";
import { isEventOver } from "@/lib/eventTiming";
import { getEffectiveDate } from "@/lib/recurrence";
import { CHECKINABLE_VENUE_CATEGORIES } from "@/lib/checkin";

export const dynamic = "force-dynamic";

const MIN_QUERY = 2;
const MAX_RESULTS = 8;

// Same shape the venue rail card needs, mapped via lib/venueMappers.
const VENUE_CARD_COLUMNS =
  "id, place_id, name, address, lat, lng, types, price_level, vibe_tags, black_owned, neighborhood, why_tonight, hours, happy_hour, regular_hours, venue_photos(photo_url, attribution_name, attribution_uri, photo_source)";

const EVENT_COLUMNS =
  "id, event_name, date, start_time, end_time, venue_name, venue_id, neighborhood, image_url, vibe_tags, description, price, ticket_link, like_count, is_recurring, recurrence_frequency, recurrence_days, recurrence_end_date";

function extractNeighborhood(address: string | null): string {
  if (!address) return "Cincinnati";
  const parts = address.split(",").map((p) => p.trim());
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    if (/^\d{5}(-\d{4})?$/.test(p)) continue;
    if (/^(OH|KY|IN|USA|United States)$/i.test(p)) continue;
    return p;
  }
  return "Cincinnati";
}

const hay = (s: string | null | undefined) => (s ?? "").toLowerCase();
const tagsMatch = (tags: string[] | null, q: string) => (tags ?? []).some((t) => t.toLowerCase().includes(q));

// name-startswith (2) > name-contains (1) > tag/description-only (0)
function venueRank(name: string, q: string): number {
  const n = name.toLowerCase();
  if (n.startsWith(q)) return 2;
  if (n.includes(q)) return 1;
  return 0;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 100);
  if (q.length < MIN_QUERY) return NextResponse.json({ venues: [], events: [] });
  const ql = q.toLowerCase();

  // ── Venues: lightweight candidate scan (name + tags + why_tonight), then
  // hydrate only the top matches with the columns the card needs. Restricted
  // to nightlife/entertainment + geocoded, mirroring what Picks/Live Map show
  // (there's no admin-exclude flag on venues; category is the real filter).
  const { data: vcand, error: vErr } = await supabaseAdmin
    .from("venues")
    .select("id, name, vibe_tags, why_tonight")
    .in("venue_category", [...CHECKINABLE_VENUE_CATEGORIES])
    .not("lat", "is", null);
  if (vErr) return NextResponse.json({ error: vErr.message }, { status: 500 });

  const vMatched = (vcand ?? [])
    .filter((v) => hay(v.name).includes(ql) || hay(v.why_tonight).includes(ql) || tagsMatch(v.vibe_tags, ql))
    .sort((a, b) => venueRank(b.name, ql) - venueRank(a.name, ql))
    .slice(0, MAX_RESULTS);
  const vIds = vMatched.map((v) => v.id);

  let venues: Venue[] = [];
  if (vIds.length > 0) {
    const { data: full } = await supabaseAdmin.from("venues").select(VENUE_CARD_COLUMNS).in("id", vIds);
    const byId = new Map((full ?? []).map((r) => [r.id as string, r]));
    venues = vIds
      .map((id) => byId.get(id))
      .filter((r): r is NonNullable<typeof r> => !!r)
      .map((row) => {
        const photo = pickVenuePhoto(row.venue_photos as VenuePhotoRow | VenuePhotoRow[] | null);
        return {
          id: row.id as string,
          name: row.name as string,
          type: deriveType(row.types as string[] | null),
          neighborhood: (row.neighborhood as string | null) || extractNeighborhood(row.address as string | null),
          description: "",
          whyTonight: (row.why_tonight as string | null) ?? "",
          price: mapPriceLevel(row.price_level as number | null),
          tags: (row.vibe_tags as string[] | null) ?? [],
          blackOwned: (row.black_owned as boolean | null) ?? null,
          address: row.address as string | null,
          hours: row.hours as string | null,
          happyHour: row.happy_hour as string | null,
          lat: row.lat as number | null,
          lng: row.lng as number | null,
          placeId: (row.place_id as string | null) ?? null,
          imageUrl: photo?.photo_url ?? null,
          photoAttribution: photo ? { name: photo.attribution_name, uri: photo.attribution_uri } : null,
          isOpenNow: isVenueOpenNow(row.regular_hours as RegularHours | null),
        };
      });
  }

  // ── Events: approved + has flyer image; match name + tags + description.
  // Resolve recurrence to the real next date and drop anything already over,
  // same as the Lineup feed — a search shouldn't surface dead past events.
  const now = new Date();
  const today = getTonightDateString(now);
  const { data: ecand, error: eErr } = await supabaseAdmin
    .from("pending_events")
    .select(EVENT_COLUMNS)
    .eq("status", "approved")
    .not("image_url", "is", null);
  if (eErr) return NextResponse.json({ error: eErr.message }, { status: 500 });

  const events: PromoterEvent[] = ((ecand ?? []) as PromoterEvent[])
    .filter(
      (e) => hay(e.event_name).includes(ql) || hay(e.description).includes(ql) || tagsMatch(e.vibe_tags, ql)
    )
    .map((e) => {
      const eff = getEffectiveDate(e, today);
      return eff ? { ...e, date: eff } : null;
    })
    .filter((e): e is PromoterEvent => e !== null)
    .filter((e) => !isEventOver(e, now))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .slice(0, MAX_RESULTS);

  return NextResponse.json({ venues, events });
}
