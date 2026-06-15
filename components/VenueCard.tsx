"use client";

import { useState } from "react";
import { Venue } from "@/lib/types";
import { formatEventDateLine } from "@/lib/formatEventDate";

interface VenueCardProps {
  venue: Venue;
  index: number;
  showDistance?: boolean;
}

export default function VenueCard({ venue, index, showDistance }: VenueCardProps) {
  const [saved, setSaved] = useState(false);

  async function handleShare() {
    const shareData = {
      title: venue.name,
      text: `${venue.name} — ${venue.description}`,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // user cancelled share
      }
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(`${shareData.title}\n${shareData.text}`);
    }
  }

  return (
    <div
      className="glass-card overflow-hidden flex flex-col gap-3 animate-fadeUp opacity-0"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {venue.imageUrl && (
        <img
          src={venue.imageUrl}
          alt={venue.name}
          className="w-full aspect-video object-cover"
        />
      )}

      <div className="p-5 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            {venue.featured && (
              <span className="inline-block text-xs px-2 py-1 rounded-full bg-accent text-white font-semibold tracking-wide mb-1">
                🌟 Local Event
              </span>
            )}
            <h3 className="font-display text-2xl tracking-wide leading-tight">{venue.name}</h3>
            <p className="text-sm text-muted">
              {venue.type} · {venue.neighborhood}
              {showDistance && venue.distanceMiles !== undefined && (
                <> · {venue.distanceMiles.toFixed(1)} mi away</>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setSaved((s) => !s)}
              aria-label="Save spot"
              className="text-2xl transition-transform active:scale-90"
            >
              {saved ? "❤️" : "🤍"}
            </button>
            <button
              onClick={handleShare}
              aria-label="Share spot"
              className="text-xl transition-transform active:scale-90"
            >
              📤
            </button>
          </div>
        </div>

        <p className="text-sm leading-relaxed">{venue.description}</p>

        {venue.whyTonight ? (
          <div className="rounded-xl bg-accent/10 border border-accent/20 px-3 py-2">
            <p className="text-xs uppercase tracking-wide text-accent font-semibold mb-1">
              Why Tonight
            </p>
            <p className="text-sm">{venue.whyTonight}</p>
          </div>
        ) : (
          (venue.eventDate || venue.eventTime) && (
            <div className="rounded-xl bg-accent/10 border border-accent/20 px-3 py-2">
              <p className="text-sm font-semibold">
                {formatEventDateLine(venue.eventDate, venue.eventTime)}
              </p>
            </div>
          )
        )}

        <div className="flex items-center justify-between">
          <span className="font-display text-lg tracking-wide text-accent">{venue.price}</span>
          <div className="flex flex-wrap gap-2 justify-end">
            {venue.tags?.map((tag) => (
              <span
                key={tag}
                className="text-xs px-2 py-1 rounded-full bg-white/5 border border-card-border text-muted"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
