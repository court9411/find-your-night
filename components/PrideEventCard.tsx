import { PrideEvent } from "@/lib/types";

interface PrideEventCardProps {
  event: PrideEvent;
  index: number;
}

export default function PrideEventCard({ event, index }: PrideEventCardProps) {
  return (
    <div
      className="glass-card p-5 flex flex-col gap-3 animate-fadeUp opacity-0 border-accent/20"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-2xl tracking-wide leading-tight">{event.name}</h3>
          <p className="text-sm text-muted">
            {event.type} · {event.neighborhood}
          </p>
        </div>
        <span className="font-display text-lg tracking-wide text-accent shrink-0">
          {event.price}
        </span>
      </div>

      <div className="rounded-xl bg-accent/10 border border-accent/20 px-3 py-2">
        <p className="text-sm font-semibold">
          {event.date} · {event.time}
        </p>
      </div>

      <p className="text-sm leading-relaxed">{event.description}</p>

      <div className="flex flex-wrap gap-2">
        {event.tags?.map((tag) => (
          <span
            key={tag}
            className="text-xs px-2 py-1 rounded-full bg-white/5 border border-card-border text-muted"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}
