"use client";

import { useEffect, useState } from "react";
import { Venue } from "@/lib/types";
import { RailConfig } from "@/lib/homeRails";
import { VENUE_DETAIL_BACK_KEY } from "@/lib/storageKeys";
import NotInterestedButton from "@/components/NotInterestedButton";
import VenueRailCard from "@/components/VenueRailCard";

interface Props {
  config: RailConfig;
  lat?: number | null;
  lng?: number | null;
  userId: string | null;
}

/**
 * One themed home rail (Trending, Date Night, Free Stuff, ...) — same
 * ranked-venue engine as the main Tonight rail, filtered server-side by
 * config.railType via get_rail_venues. Hides itself entirely on an empty
 * or errored fetch, same convention as WhatsHappeningSection, so a rail
 * with no matches (or a not-yet-deployed RPC) just doesn't render.
 */
export function RailSection({ config, lat = null, lng = null, userId }: Props) {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    async function fetchRail() {
      try {
        const res = await fetch("/api/rank/rail", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ railType: config.railType, userId, lat, lng, limit: 10 }),
        });
        if (cancelled) return;
        if (!res.ok) {
          setVenues([]);
          return;
        }
        const data = await res.json();
        if (!cancelled) setVenues(data.venues ?? []);
      } catch (err) {
        if (!cancelled) {
          console.error(`Failed to load ${config.railType} rail:`, err);
          setVenues([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchRail();
    return () => {
      cancelled = true;
    };
  }, [config.railType, lat, lng, userId]);

  function hideVenue(placeId: string) {
    setVenues((prev) => prev.filter((v) => v.placeId !== placeId));
  }

  function rememberBackUrl() {
    try {
      sessionStorage.setItem(VENUE_DETAIL_BACK_KEY, window.location.pathname + window.location.search);
    } catch {}
  }

  if (loading) {
    return (
      <div className="w-full">
        <div className="h-5 w-36 bg-white/10 rounded-full animate-pulse mb-3 mx-5" />
        <div className="flex gap-3 overflow-hidden px-5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex-none w-44 h-44 glass-card rounded-2xl animate-pulse"
              style={{ animationDelay: `${i * 80}ms` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (venues.length === 0) return null;

  return (
    <div className="w-full">
      <h3 className="font-display font-bold text-xl tracking-wide px-5 mb-3">
        {config.emoji} {config.title}
      </h3>
      <div
        className="flex gap-3 overflow-x-auto px-5 pb-1"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {venues.map((venue) => {
          const card = (
            <VenueRailCard
              venue={venue}
              userId={userId}
              showDistance={!!lat}
              href={venue.id ? `/venue/${venue.id}` : undefined}
              onClick={rememberBackUrl}
            />
          );
          return (
            <div key={venue.id ?? venue.placeId ?? venue.name} className="flex-none">
              {venue.placeId ? (
                <NotInterestedButton
                  itemType="venue"
                  itemId={venue.placeId}
                  onConfirm={() => hideVenue(venue.placeId!)}
                >
                  {card}
                </NotInterestedButton>
              ) : (
                card
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
