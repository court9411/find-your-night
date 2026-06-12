import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { PendingEvent } from "@/lib/types";
import EventListingCard from "@/components/EventListingCard";
import { deleteExpiredEvents, todayDateString } from "@/lib/eventCleanup";

interface PageProps {
  params: { category: string };
}

export default async function CategoryEventsPage({ params }: PageProps) {
  const category = decodeURIComponent(params.category);

  await deleteExpiredEvents();

  const { data: events, error } = await supabaseAdmin
    .from("pending_events")
    .select("*")
    .eq("status", "approved")
    .eq("category", category)
    .gte("date", todayDateString())
    .order("featured", { ascending: false })
    .order("display_order", { ascending: true })
    .order("date", { ascending: true });

  if (error) {
    console.error("Category events fetch error:", error);
  }

  return (
    <main className="flex flex-col items-center min-h-screen px-6 py-12 gap-6">
      <div className="flex items-center justify-between w-full max-w-md">
        <h1 className="font-display text-4xl tracking-wide">{category}</h1>
        <Link href="/" className="text-sm text-muted underline underline-offset-4">
          Home
        </Link>
      </div>
      <p className="text-muted text-sm w-full max-w-md -mt-4">
        Tonight&apos;s lineup for {category}
      </p>

      {!events || events.length === 0 ? (
        <p className="text-muted text-sm">No events yet — check back soon.</p>
      ) : (
        <div className="flex flex-col gap-4 w-full max-w-md">
          {(events as PendingEvent[]).map((event, i) => (
            <EventListingCard key={event.id} event={event} index={i} />
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
