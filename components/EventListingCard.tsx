import Link from "next/link";
import { PendingEvent } from "@/lib/types";
import { formatRecurrenceBadge } from "@/lib/recurrence";
import EventImage from "@/components/EventImage";
import SaveButton from "@/components/SaveButton";

interface EventListingCardProps {
  event: PendingEvent;
  index: number;
}

export default function EventListingCard({ event, index }: EventListingCardProps) {
  const formattedDate = new Date(`${event.date}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const recurrenceBadge = formatRecurrenceBadge(event);
  const href = event.venue_id ? `/venue/${event.venue_id}?event=${event.id}` : `/event/${event.id}`;

  return (
    <div
      className="glass-card overflow-hidden flex flex-col gap-3 animate-fadeUp opacity-0 border-accent/20"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <Link href={href} className="flex flex-col gap-3">
        {event.image_url && (
          <EventImage
            src={event.image_url}
            alt={event.event_name}
            className="w-full max-h-[70vh] object-contain bg-black/30"
          />
        )}

        <div className="px-5 pt-5 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-display font-bold text-2xl tracking-wide leading-tight">{event.event_name}</h3>
              <p className="text-sm text-muted">
                {event.is_private_location
                  ? `${event.venue_name}${event.city ? ` · ${event.city}` : ""}`
                  : `${event.venue_name}${event.neighborhood ? ` · ${event.neighborhood}` : ""}`}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {event.price && (
                <span className="font-display text-lg tracking-wide text-accent">
                  {event.price}
                </span>
              )}
              {event.id && (
                <SaveButton itemType="event" itemId={event.id} />
              )}
            </div>
          </div>

          <div className="rounded-xl bg-accent/10 border border-accent/20 px-3 py-2 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">
              {formattedDate} · {event.start_time}
            </p>
            {recurrenceBadge && (
              <span className="text-[10px] font-bold uppercase tracking-wide text-accent shrink-0">
                {recurrenceBadge}
              </span>
            )}
          </div>

          {event.description && <p className="text-sm leading-relaxed">{event.description}</p>}

          {event.is_private_location && event.private_location_note && (
            <div className="rounded-xl bg-white/5 border border-card-border px-3 py-2">
              <p className="text-sm text-muted">📍 {event.private_location_note}</p>
            </div>
          )}

          {(event.is_private_location || event.vibe_tags?.length > 0) && (
            <div className="flex flex-wrap gap-2">
              {event.is_private_location && (
                <span className="text-xs px-2 py-1 rounded-full bg-accent/10 text-accent border border-accent/30 font-body font-semibold">
                  📍 Private location
                </span>
              )}
              {event.vibe_tags?.map((tag) => (
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
      </Link>

      {event.ticket_link && (
        <div className="px-5 pb-5 -mt-1">
          <a
            href={event.ticket_link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-accent underline underline-offset-4"
          >
            Tickets / Details
          </a>
        </div>
      )}
      {!event.ticket_link && <div className="pb-5" />}
    </div>
  );
}
