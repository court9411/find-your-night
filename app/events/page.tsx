import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { PendingEvent } from "@/lib/types";
import EventListingCard from "@/components/EventListingCard";
import { getCincyDateString } from "@/lib/cincyDate";

export const dynamic = "force-dynamic";

export default async function AllEventsPage() {
  const today = getCincyDateString();

  const { data, error } = await supabaseAdmin
    .from("pending_events")
    .select("*")
    .eq("source", "promoter")
    .eq("status", "approved")
    .gte("date", today)
    .not("image_url", "is", null)
    .order("date", { ascending: true })
    .order("start_time", { ascending: true })
    .order("like_count", { ascending: false })
    .limit(60);

  if (error) {
    console.error("All events fetch error:", error);
  }

  const events = (data ?? []) as PendingEvent[];
  const tonight = events.filter((e) => e.date === today);
  const upcoming = events.filter((e) => e.date !== today);

  return (
    <main className="flex flex-col items-center min-h-screen py-12 gap-6">
      <div className="flex items-center justify-between w-full max-w-md px-6">
        <h1 className="font-display text-4xl tracking-wide">All Events</h1>
        <Link href="/results" className="text-sm text-muted underline underline-offset-4">
          Back
        </Link>
      </div>

      {events.length === 0 ? (
        <p className="text-muted text-sm px-6">No events yet — check back soon.</p>
      ) : (
        <div className="flex flex-col gap-8 w-full max-w-md px-6">
          {tonight.length > 0 && (
            <div className="flex flex-col gap-4">
              <h2 className="font-display text-xl tracking-wide text-accent">Tonight</h2>
              {tonight.map((event, i) => (
                <EventListingCard key={event.id} event={event} index={i} />
              ))}
            </div>
          )}

          {upcoming.length > 0 && (
            <div className="flex flex-col gap-4">
              <h2 className="font-display text-xl tracking-wide text-accent">Coming Up</h2>
              {upcoming.map((event, i) => (
                <EventListingCard key={event.id} event={event} index={i} />
              ))}
            </div>
          )}
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
