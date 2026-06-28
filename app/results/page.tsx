"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Venue } from "@/lib/types";
import { sortByProximity, Coords } from "@/lib/geo";
import { RESULTS_KEY, RESULT_BACK_KEY } from "@/lib/storageKeys";
import { WhatsHappeningSection } from "@/components/WhatsHappeningSection";
import { FuturePlansSection } from "@/components/FuturePlansSection";

const INITIAL_TONIGHT_COUNT = 8;

function TonightContent() {
  const params = useSearchParams();
  const router = useRouter();

  const latParam = params.get("lat");
  const lngParam = params.get("lng");
  const isPrecise = params.get("precise") === "1";

  const userCoords: Coords | null =
    latParam !== null && lngParam !== null
      ? { lat: Number(latParam), lng: Number(lngParam) }
      : null;

  const [venues, setVenues] = useState<Venue[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [showAllTonight, setShowAllTonight] = useState(false);

  useEffect(() => {
    if (!userCoords) {
      router.replace("/");
      return;
    }
    const coords = userCoords;

    let cancelled = false;
    setLoading(true);
    setVenues(null);
    setErrorMsg("");

    async function fetchAll() {
      try {
        const [submittedRes, barsRes] = await Promise.all([
          fetch("/api/featured", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ city: "Cincinnati" }),
          }),
          fetch("/api/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ label: "Drinks & Bars", lat: coords.lat, lng: coords.lng }),
          }),
        ]);
        if (cancelled) return;

        const submittedData = await submittedRes.json();
        const barsData = await barsRes.json();
        if (cancelled) return;

        const submitted: Venue[] = submittedRes.ok ? (submittedData.venues ?? []) : [];
        const bars: Venue[] = barsRes.ok ? (barsData.venues ?? []) : [];

        const sorted = sortByProximity([...submitted, ...bars], coords);
        sessionStorage.setItem(RESULTS_KEY, JSON.stringify(sorted));
        sessionStorage.setItem(RESULT_BACK_KEY, `/results?${params.toString()}`);
        setVenues(sorted);
      } catch (err) {
        if (!cancelled) {
          setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchAll();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latParam, lngParam]);

  function toStory(index: number) {
    router.push(`/tonight/${index}`);
  }

  const visibleVenues = venues && (showAllTonight ? venues : venues.slice(0, INITIAL_TONIGHT_COUNT));
  const hasMoreVenues = !!venues && venues.length > INITIAL_TONIGHT_COUNT && !showAllTonight;

  return (
    <main className="flex flex-col min-h-screen pb-12">
      {/* Header */}
      <div className="flex items-start justify-between px-5 pt-12 pb-4">
        <div>
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-1 text-muted text-sm mb-1 active:opacity-70"
          >
            <span aria-hidden>←</span>
            <span>Back</span>
          </button>
          <h1 className="font-display font-extrabold text-4xl tracking-tight">Tonight</h1>
        </div>
        <button
          onClick={() => router.push("/profile")}
          aria-label="Profile"
          className="w-9 h-9 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center shrink-0 mt-1"
        >
          <svg
            className="w-5 h-5 text-white/70"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0z" />
            <path d="M4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
        </button>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="flex flex-col gap-4 px-5 mt-2">
          <div className="h-5 w-32 bg-white/10 rounded-full animate-pulse" />
          <div className="flex gap-3 overflow-hidden">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex-none w-44 h-44 glass-card rounded-2xl animate-pulse"
                style={{ animationDelay: `${i * 80}ms` }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {!loading && errorMsg && (
        <div className="flex flex-col items-center gap-4 py-12 px-5 text-center">
          <p className="text-accent">{errorMsg}</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-2xl glass-card font-display text-xl tracking-wide px-8 py-3"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Empty */}
      {!loading && !errorMsg && venues !== null && venues.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 min-h-[40vh] px-5 text-center">
          <span className="text-5xl">🌙</span>
          <p className="text-muted">No spots found nearby yet.</p>
        </div>
      )}

      {/* Results */}
      {!loading && !errorMsg && venues && venues.length > 0 && (
        <div className="flex flex-col gap-6">
          <div>
            <h3 className="font-display font-bold text-xl tracking-wide px-5 mb-3">Tonight</h3>
            <div
              className="flex gap-3 overflow-x-auto px-5 pb-1"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {visibleVenues!.map((venue, index) => (
                <RailCard
                  key={`${venue.name}-${index}`}
                  venue={venue}
                  onClick={() => toStory(index)}
                  showDistance={isPrecise}
                />
              ))}
              {hasMoreVenues && (
                <button
                  onClick={() => setShowAllTonight(true)}
                  className="flex-none w-28 rounded-2xl border border-card-border bg-card flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform"
                >
                  <span className="text-2xl">→</span>
                  <span className="text-xs text-accent font-semibold">See more</span>
                </button>
              )}
            </div>
          </div>

          <WhatsHappeningSection />
          <FuturePlansSection />
        </div>
      )}
    </main>
  );
}

function RailCard({
  venue,
  onClick,
  showDistance,
}: {
  venue: Venue;
  onClick: () => void;
  showDistance: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className="flex-none w-44 rounded-2xl border border-card-border bg-card overflow-hidden cursor-pointer active:scale-95 transition-transform"
    >
      {venue.imageUrl && (
        <img
          src={venue.imageUrl}
          alt={venue.name}
          className="w-full h-28 object-contain bg-black/20"
        />
      )}
      <div className="p-3 flex flex-col gap-0.5">
        <p className="font-display text-base tracking-wide leading-tight line-clamp-1">
          {venue.name}
        </p>
        <p className="text-[11px] text-muted leading-tight line-clamp-1">
          {venue.type} · {venue.neighborhood}
          {showDistance && venue.distanceMiles !== undefined && (
            <> · {venue.distanceMiles.toFixed(1)}mi</>
          )}
        </p>
        <p className="text-[11px] text-accent font-semibold mt-0.5">{venue.price}</p>
      </div>
    </div>
  );
}

export default function TonightPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col min-h-screen px-5 pt-12 gap-4">
          <div className="glass-card h-52 animate-pulse rounded-2xl" />
          <div className="flex gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex-none w-44 h-44 glass-card rounded-2xl animate-pulse" />
            ))}
          </div>
        </div>
      }
    >
      <TonightContent />
    </Suspense>
  );
}
