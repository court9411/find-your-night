"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Venue, FeaturedVenueEvent } from "@/lib/types";
import { VENUE_DETAIL_BACK_KEY } from "@/lib/storageKeys";
import VenueDetailScreen from "@/components/VenueDetailScreen";

function VenueDetailContent() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const eventId = searchParams.get("event");
  const router = useRouter();

  const [backUrl, setBackUrl] = useState("/results");
  const [venue, setVenue] = useState<Venue | null>(null);
  const [event, setEvent] = useState<FeaturedVenueEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    try {
      const back = sessionStorage.getItem(VENUE_DETAIL_BACK_KEY);
      if (back) setBackUrl(back);
    } catch {}
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);

    async function fetchVenue() {
      try {
        const res = await fetch("/api/venue-detail", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ venueId: id, eventId }),
        });
        if (cancelled) return;
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        setVenue(data.venue ?? null);
        setEvent(data.event ?? null);
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load venue detail:", err);
          setNotFound(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchVenue();
    return () => {
      cancelled = true;
    };
  }, [id, eventId]);

  if (loading) {
    return (
      <main className="flex flex-col min-h-screen px-5 pt-12">
        <div className="glass-card h-64 animate-pulse rounded-2xl" />
      </main>
    );
  }

  if (notFound || !venue) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen gap-4 px-5 text-center">
        <span className="text-5xl">🌙</span>
        <p className="text-muted">Couldn&apos;t find this spot.</p>
        <button onClick={() => router.push(backUrl)} className="text-accent text-sm underline underline-offset-4">
          ← Back
        </button>
      </main>
    );
  }

  return (
    <VenueDetailScreen
      venue={venue}
      event={event}
      onBack={() => router.push(backUrl)}
      onSkip={() => router.push(backUrl)}
      skipDisabled={false}
    />
  );
}

export default function VenueDetailPage() {
  return (
    <Suspense
      fallback={
        <main className="flex flex-col min-h-screen px-5 pt-12">
          <div className="glass-card h-64 animate-pulse rounded-2xl" />
        </main>
      }
    >
      <VenueDetailContent />
    </Suspense>
  );
}
