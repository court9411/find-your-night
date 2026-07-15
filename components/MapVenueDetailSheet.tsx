"use client";

import { useEffect, useState } from "react";
import { SelectedVenue } from "@/lib/checkin";
import { Venue, FeaturedVenueEvent } from "@/lib/types";
import VenueDetailScreen from "@/components/VenueDetailScreen";

interface Props {
  venue: SelectedVenue;
  onClose: () => void;
  onCheckIn: () => void;
}

// Full venue card (same component the Picks swipe flow and /venue/[id] use)
// opened as an overlay over the map, fetched by id via the same public
// /api/venue-detail endpoint those screens already call.
export default function MapVenueDetailSheet({ venue, onClose, onCheckIn }: Props) {
  const [fullVenue, setFullVenue] = useState<Venue | null>(null);
  const [event, setEvent] = useState<FeaturedVenueEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);

    fetch("/api/venue-detail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ venueId: venue.id, eventId: null }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (cancelled) return;
        setFullVenue(data.venue ?? null);
        setEvent(data.event ?? null);
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [venue.id]);

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      {loading ? (
        <div className="flex flex-col min-h-screen px-5 pt-12">
          <button onClick={onClose} className="flex items-center gap-1 text-muted text-sm active:opacity-70 mb-4 self-start">
            <span aria-hidden>←</span>
            <span>Back</span>
          </button>
          <div className="glass-card h-64 animate-pulse rounded-2xl" />
        </div>
      ) : notFound || !fullVenue ? (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-5 text-center">
          <span className="text-5xl">🌙</span>
          <p className="text-muted">Couldn&apos;t find this spot.</p>
          <button onClick={onClose} className="text-accent text-sm underline underline-offset-4">
            ← Back
          </button>
        </div>
      ) : (
        <VenueDetailScreen venue={fullVenue} event={event} onBack={onClose} onSkip={onClose} onCheckIn={onCheckIn} />
      )}
    </div>
  );
}
