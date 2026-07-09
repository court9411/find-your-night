import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { PendingEvent } from "@/lib/types";
import EventListingCard from "@/components/EventListingCard";
import CityFilterPicker from "@/components/CityFilterPicker";
import { deleteExpiredEvents, todayDateString } from "@/lib/eventCleanup";
import { SEASONAL_ENTRIES } from "@/lib/seasonal.config";
import { resolveCityFromZip, ZIP_CODE_REGEX } from "@/lib/googleMaps";
import { WhatsHappeningSection } from "@/components/WhatsHappeningSection";
import PicksLink from "@/components/PicksLink";

interface PageProps {
  params: { category: string };
  searchParams: { city?: string };
}

export default async function CategoryEventsPage({ params, searchParams }: PageProps) {
  const category = decodeURIComponent(params.category);
  const cityParam = searchParams.city?.trim();
  // Match results page behavior: only compare the city name, not the state/country.
  let cityToken = cityParam ? cityParam.split(",")[0].trim() : "";
  // Direct/shared links may pass a zip code (e.g. ?city=45231) — resolve it to
  // a real city name so it matches the city stored on events.
  if (cityToken && ZIP_CODE_REGEX.test(cityToken)) {
    const resolved = await resolveCityFromZip(cityToken);
    if (resolved) cityToken = resolved;
  }
  // Seasonal categories (e.g. "July4th") use a friendlier display label for the heading.
  const heading = SEASONAL_ENTRIES.find((entry) => entry.category === category)?.label ?? category;

  await deleteExpiredEvents();

  let query = supabaseAdmin
    .from("pending_events")
    .select("*")
    .eq("status", "approved")
    .ilike("category", category)
    .gte("date", todayDateString())
    .order("featured", { ascending: false })
    .order("display_order", { ascending: true })
    .order("date", { ascending: true });

  if (cityToken) {
    query = query.ilike("city", `%${cityToken}%`);
  }

  const { data: events, error } = await query;

  if (error) {
    console.error("Category events fetch error:", error);
  }

  const hasEvents = !!events && events.length > 0;

  // No city set: group events by city under subheadings.
  const groupedByCity: { city: string; events: PendingEvent[] }[] = [];
  if (!cityToken && hasEvents) {
    const groups = new Map<string, PendingEvent[]>();
    for (const event of events as PendingEvent[]) {
      const key = event.city?.trim() || "Other";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(event);
    }
    groups.forEach((cityEvents, city) => {
      groupedByCity.push({ city, events: cityEvents });
    });
  }

  return (
    <main className="flex flex-col items-center min-h-screen py-12 gap-6">
      <div className="flex items-center justify-between w-full max-w-md px-6">
        <h1 className="font-display font-extrabold text-4xl tracking-tight">{heading}</h1>
        <PicksLink className="text-sm text-muted underline underline-offset-4">
          Home
        </PicksLink>
      </div>
      <p className="text-muted text-sm w-full max-w-md -mt-4 px-6">
        {cityToken ? `Tonight's lineup for ${heading} near ${cityToken}` : `Tonight's lineup for ${heading}`}
      </p>

      {!cityToken && (
        <div className="flex flex-col gap-2 w-full max-w-md -mt-4 px-6">
          <p className="text-muted text-xs">Showing all cities</p>
          <CityFilterPicker category={category} />
        </div>
      )}

      <WhatsHappeningSection />

      {!hasEvents ? (
        <p className="text-muted text-sm px-6">No events yet — check back soon.</p>
      ) : cityToken ? (
        <div className="flex flex-col gap-4 w-full max-w-md px-6">
          {(events as PendingEvent[]).map((event, i) => (
            <EventListingCard key={event.id} event={event} index={i} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-6 w-full max-w-md px-6">
          {groupedByCity.map(({ city, events: cityEvents }) => (
            <div key={city} className="flex flex-col gap-4">
              <h2 className="font-display font-bold text-xl tracking-wide text-accent">{city}</h2>
              {cityEvents.map((event, i) => (
                <EventListingCard key={event.id} event={event} index={i} />
              ))}
            </div>
          ))}
        </div>
      )}

      <Link
        href="/submit"
        className="rounded-2xl glass-card font-display text-xl tracking-wide px-8 py-3 transition-transform active:scale-95 hover:border-accent/50"
      >
        Submit an Event
      </Link>
    </main>
  );
}
