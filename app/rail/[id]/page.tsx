"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Venue } from "@/lib/types";
import { getRailConfig } from "@/lib/homeRails";
import { readCachedCoords } from "@/lib/geoStorage";
import { createClient } from "@/lib/supabase/client";
import { sectionTextClass, railIcon } from "@/components/sectionColors";
import { VENUE_DETAIL_BACK_KEY } from "@/lib/storageKeys";
import VenueRailCard from "@/components/VenueRailCard";
import NotInterestedButton from "@/components/NotInterestedButton";
import PicksLink from "@/components/PicksLink";

const FULL_LIST_LIMIT = 60;

/**
 * Full listing for a single home rail (Popular Picks, Date Night,
 * Budget-Friendly, Casual Fun, Daytime Picks) — same get_rail_venues query
 * RailSection uses on Picks, just with a much higher limit and a wrapping
 * grid instead of a horizontal scroller. Rail id -> config comes from
 * lib/homeRails so this page never has to duplicate railType/categories.
 */
export default function RailListingPage() {
  const params = useParams<{ id: string }>();
  const config = getRailConfig(params.id);

  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [precise, setPrecise] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!cancelled) setUserId(user?.id ?? null);
    }
    loadUser();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!config) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);

    async function fetchRail() {
      const coords = readCachedCoords();
      if (cancelled) return;
      setPrecise(coords.precise);
      try {
        const res = await fetch("/api/rank/rail", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            railType: config!.railType,
            userId,
            lat: coords.lat,
            lng: coords.lng,
            limit: FULL_LIST_LIMIT,
            categories: config!.categories,
          }),
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
          console.error(`Failed to load ${config!.railType} rail listing:`, err);
          setVenues([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchRail();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.id, userId]);

  function hideVenue(placeId: string) {
    setVenues((prev) => prev.filter((v) => v.placeId !== placeId));
  }

  function rememberBackUrl() {
    try {
      sessionStorage.setItem(VENUE_DETAIL_BACK_KEY, window.location.pathname);
    } catch {}
  }

  if (!config) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen gap-4 px-5 text-center">
        <p className="text-muted">That rail doesn&apos;t exist.</p>
        <PicksLink className="text-accent text-sm underline underline-offset-4">
          ← Back to Picks
        </PicksLink>
      </main>
    );
  }

  const Icon = railIcon(config.id);
  const colorClass = sectionTextClass(config.colorClass);

  return (
    <main className="flex flex-col items-center min-h-screen py-12 gap-6">
      <div className="flex items-center justify-between w-full max-w-md px-6">
        <h1 className="font-display font-extrabold text-3xl tracking-tight flex items-center gap-2">
          <Icon className={colorClass} size={26} aria-hidden />
          {config.title}
        </h1>
        <PicksLink className="text-sm text-muted underline underline-offset-4">
          Back
        </PicksLink>
      </div>

      {loading && (
        <div className="flex flex-wrap gap-3.5 w-full max-w-md px-6">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex-none w-44 h-44 glass-card rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {!loading && venues.length === 0 && (
        <p className="text-muted text-sm px-6">Nothing here right now — check back soon.</p>
      )}

      {!loading && venues.length > 0 && (
        <div className="flex flex-wrap gap-3.5 w-full max-w-md px-6">
          {venues.map((venue) => {
            const card = (
              <VenueRailCard
                venue={venue}
                userId={userId}
                showDistance={precise}
                href={venue.id ? `/venue/${venue.id}` : undefined}
                onClick={rememberBackUrl}
                accentClass={colorClass}
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
      )}
    </main>
  );
}
