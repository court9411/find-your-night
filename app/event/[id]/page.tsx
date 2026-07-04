import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { PendingEvent } from "@/lib/types";
import { formatEventDateLine } from "@/lib/formatEventDate";
import EventImage from "@/components/EventImage";
import EventLikeShare from "@/components/EventLikeShare";
import EventDetailTracker from "@/components/EventDetailTracker";
import TicketLink from "@/components/TicketLink";
import SaveButton from "@/components/SaveButton";
import DirectionsLink from "@/components/DirectionsLink";

interface PageProps {
  params: { id: string };
}

export default async function EventPage({ params }: PageProps) {
  const { data: event, error } = await supabaseAdmin
    .from("pending_events")
    .select("*")
    .eq("id", params.id)
    .eq("status", "approved")
    .single();

  if (error || !event) {
    notFound();
  }

  const e = event as PendingEvent;
  const dateLine = formatEventDateLine(e.date, e.start_time);

  return (
    <main className="flex flex-col items-center min-h-screen px-6 py-12 gap-6">
      <EventDetailTracker eventId={e.id as string} eventName={e.event_name} vibeTags={e.vibe_tags ?? []} />
      <div className="flex items-center justify-between w-full max-w-md">
        <Link href="/" className="text-sm text-muted underline underline-offset-4">
          Home
        </Link>
        <SaveButton itemType="event" itemId={e.id as string} />
      </div>

      {e.image_url && (
        <div className="w-full max-w-md rounded-2xl overflow-hidden animate-fadeUp opacity-0">
          <EventImage
            src={e.image_url}
            alt={e.event_name}
            className="w-full h-auto block"
          />
        </div>
      )}

      <div className="glass-card flex flex-col gap-3 w-full max-w-md border-accent/20 animate-fadeUp opacity-0">
        <div className="p-5 flex flex-col gap-3">
          <h1 className="font-display font-extrabold text-3xl tracking-tight leading-tight">{e.event_name}</h1>

          <p className="text-sm text-muted">
            {e.is_private_location
              ? `📍 Private location${e.city ? ` · ${e.city}` : ""}`
              : `${e.venue_name}${e.neighborhood ? ` · ${e.neighborhood}` : ""}`}
          </p>

          {!e.is_private_location && e.address && (
            <DirectionsLink
              targetType="event"
              targetId={e.id as string}
              address={e.address}
              lat={e.lat}
              lng={e.lng}
            />
          )}

          <div className="rounded-xl bg-accent/10 border border-accent/20 px-3 py-2">
            <p className="text-sm font-semibold">{dateLine}</p>
          </div>

          {e.is_private_location && e.private_location_note && (
            <div className="rounded-xl bg-white/5 border border-card-border px-3 py-2">
              <p className="text-sm text-muted">📍 {e.private_location_note}</p>
            </div>
          )}

          {e.description && <p className="text-sm leading-relaxed">{e.description}</p>}

          <div className="flex items-center justify-between gap-3">
            {e.price && (
              <span className="font-display text-lg tracking-wide text-accent shrink-0">
                {e.price}
              </span>
            )}
            {(e.is_private_location || e.vibe_tags?.length > 0) && (
              <div className="flex flex-wrap gap-2 justify-end">
                {e.is_private_location && (
                  <span className="text-xs px-2 py-1 rounded-full bg-accent/10 text-accent border border-accent/30 font-body font-semibold">
                    📍 Private location
                  </span>
                )}
                {e.vibe_tags?.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-1 rounded-full bg-accent/10 text-accent border border-accent/30 font-body font-semibold"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {e.ticket_link && (
            <TicketLink
              href={e.ticket_link}
              eventId={e.id as string}
              eventName={e.event_name}
              hasPrice={!!e.price}
            />
          )}

          <EventLikeShare
            eventId={e.id as string}
            eventName={e.event_name}
            initialLikeCount={e.like_count ?? 0}
          />
        </div>
      </div>
    </main>
  );

}
