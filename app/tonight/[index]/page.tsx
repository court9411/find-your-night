"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Venue, FeaturedVenueEvent } from "@/lib/types";
import { RESULTS_KEY, RESULT_BACK_KEY } from "@/lib/storageKeys";
import VenueDetailScreen from "@/components/VenueDetailScreen";

export default function StoryView() {
  const { index: indexParam } = useParams<{ index: string }>();
  const router = useRouter();
  const index = Number(indexParam ?? 0);

  const [venues, setVenues] = useState<Venue[]>([]);
  const [backUrl, setBackUrl] = useState("/results");
  const [hydrated, setHydrated] = useState(false);
  const [event, setEvent] = useState<FeaturedVenueEvent | null>(null);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(RESULTS_KEY);
      if (stored) setVenues(JSON.parse(stored));
      const back = sessionStorage.getItem(RESULT_BACK_KEY);
      if (back) setBackUrl(back);
    } catch {}
    setHydrated(true);
  }, []);

  const venue: Venue | undefined = venues[index];
  const total = venues.length;

  // Fetch the venue's featured event (rich content: flyer, rewritten blurb, tags) —
  // the rail already knows whether *something* is on tonight (venue.liveTonight),
  // this just hydrates the full detail for whichever venue is currently shown.
  useEffect(() => {
    let cancelled = false;
    setEvent(null);
    if (!venue?.id) return;

    async function fetchEvent() {
      try {
        const res = await fetch("/api/venue-detail", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ venueId: venue!.id, eventId: venue!.liveTonight?.id ?? null }),
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled) setEvent(data.event ?? null);
      } catch (err) {
        if (!cancelled) console.error("Failed to load venue event:", err);
      }
    }
    fetchEvent();
    return () => {
      cancelled = true;
    };
  }, [venue?.id]);

  function navigate(to: number) {
    if (to < 0 || to >= total) return;
    router.push(`/tonight/${to}`);
  }

  // Loading: sessionStorage not yet read
  if (!hydrated) {
    return (
      <main className="flex flex-col min-h-screen px-5 pt-12">
        <div className="glass-card h-64 animate-pulse rounded-2xl" />
      </main>
    );
  }

  // No session data (e.g. direct navigation or expired session)
  if (hydrated && venues.length === 0) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen gap-4 px-5 text-center">
        <span className="text-5xl">🌙</span>
        <p className="text-muted">Session expired. Go back and search again.</p>
        <button
          onClick={() => router.push("/")}
          className="rounded-2xl bg-accent hover:bg-accent-hover text-black font-display font-bold text-xl tracking-wide px-8 py-3"
        >
          Start over
        </button>
      </main>
    );
  }

  // Out-of-bounds index
  if (!venue) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen gap-4 px-5 text-center">
        <p className="text-muted">No result at this position.</p>
        <button onClick={() => router.push(backUrl)} className="text-accent text-sm underline underline-offset-4">
          ← Back to results
        </button>
      </main>
    );
  }

  return (
    <VenueDetailScreen
      venue={venue}
      event={event}
      onBack={() => router.push(backUrl)}
      onSkip={() => navigate(index + 1)}
      skipDisabled={index >= total - 1}
      positionLabel={`${index + 1} of ${total}`}
      onPrevZone={index > 0 ? () => navigate(index - 1) : undefined}
      onNextZone={index < total - 1 ? () => navigate(index + 1) : undefined}
      progressDots={{ total, index, onDotClick: navigate }}
    />
  );
}
