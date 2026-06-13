import { PendingEvent } from "@/lib/types";
import EventImage from "@/components/EventImage";

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

  return (
    <div
      className="glass-card overflow-hidden flex flex-col gap-3 animate-fadeUp opacity-0 border-accent/20"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {event.image_url && (
        <EventImage
          src={event.image_url}
          alt={event.event_name}
          className="w-full max-h-[70vh] object-contain bg-black/30"
        />
      )}

      <div className="p-5 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-2xl tracking-wide leading-tight">{event.event_name}</h3>
            <p className="text-sm text-muted">
              {event.is_private_location
                ? `${event.venue_name}${event.city ? ` · ${event.city}` : ""}`
                : `${event.venue_name}${event.neighborhood ? ` · ${event.neighborhood}` : ""}`}
            </p>
          </div>
          {event.price && (
            <span className="font-display text-lg tracking-wide text-accent shrink-0">
              {event.price}
            </span>
          )}
        </div>

        <div className="rounded-xl bg-accent/10 border border-accent/20 px-3 py-2">
          <p className="text-sm font-semibold">
            {formattedDate} · {event.start_time}
          </p>
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
              <span className="text-xs px-2 py-1 rounded-full bg-accent/10 border border-accent/30 text-accent">
                📍 Private location
              </span>
            )}
            {event.vibe_tags?.map((tag) => (
              <span
                key={tag}
                className="text-xs px-2 py-1 rounded-full bg-white/5 border border-card-border text-muted"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {event.ticket_link && (
          <a
            href={event.ticket_link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-accent underline underline-offset-4"
          >
            Tickets / Details
          </a>
        )}
      </div>
    </div>
  );
}
