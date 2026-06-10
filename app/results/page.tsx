"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import LoadingScreen from "@/components/LoadingScreen";
import VenueCard from "@/components/VenueCard";
import SkeletonCard from "@/components/SkeletonCard";
import { Venue } from "@/lib/types";

const SKELETON_COUNT = 5;

function ResultsContent() {
  const params = useSearchParams();
  const router = useRouter();

  const city = params.get("city") ?? "";
  const vibe = params.get("vibe") ?? "";
  const label = params.get("label") ?? "Your Vibe";
  const emoji = params.get("emoji") ?? "🌙";

  const [featuredVenues, setFeaturedVenues] = useState<Venue[] | null>(null);
  const [aiVenues, setAiVenues] = useState<Venue[] | null>(null);
  const [aiError, setAiError] = useState("");

  useEffect(() => {
    if (!city || !vibe) {
      router.replace("/");
      return;
    }

    let cancelled = false;
    setFeaturedVenues(null);
    setAiVenues(null);
    setAiError("");

    async function fetchFeatured() {
      try {
        const res = await fetch("/api/featured", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ city, label }),
        });
        const data = await res.json();
        if (!cancelled) {
          setFeaturedVenues(res.ok ? data.venues ?? [] : []);
        }
      } catch {
        if (!cancelled) {
          setFeaturedVenues([]);
        }
      }
    }

    async function fetchAi() {
      try {
        const res = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ city, vibe, label }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error ?? "Something went wrong");
        }
        if (!cancelled) {
          setAiVenues(data.venues ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setAiError(err instanceof Error ? err.message : "Something went wrong");
        }
      }
    }

    fetchFeatured();
    fetchAi();

    return () => {
      cancelled = true;
    };
  }, [city, vibe, label, router]);

  const showInitialLoading = featuredVenues === null;
  const noResults =
    featuredVenues !== null &&
    featuredVenues.length === 0 &&
    aiVenues !== null &&
    aiVenues.length === 0;

  return (
    <main className="flex flex-col items-center min-h-screen px-6 py-12 gap-6">
      <div className="flex items-center justify-between w-full max-w-md">
        <h1 className="font-display text-3xl tracking-wide">
          {emoji} {label}
        </h1>
        <button
          onClick={() => router.push("/")}
          className="text-sm text-muted underline underline-offset-4"
        >
          Start Over
        </button>
      </div>
      <p className="text-muted text-sm -mt-4 w-full max-w-md">{city}</p>

      {showInitialLoading && <LoadingScreen emoji={emoji} city={city} />}

      {!showInitialLoading && (
        <div className="flex flex-col gap-4 w-full max-w-md">
          {featuredVenues!.map((venue, i) => (
            <VenueCard key={`${venue.name}-${i}`} venue={venue} index={i} />
          ))}

          {aiVenues === null &&
            !aiError &&
            Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <SkeletonCard key={`skeleton-${i}`} index={featuredVenues!.length + i} />
            ))}

          {aiVenues !== null &&
            aiVenues.map((venue, i) => (
              <VenueCard
                key={`${venue.name}-${i}`}
                venue={venue}
                index={featuredVenues!.length + i}
              />
            ))}

          {aiError && (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <p className="text-accent">{aiError}</p>
              <button
                onClick={() => window.location.reload()}
                className="rounded-2xl glass-card font-display text-xl tracking-wide px-8 py-3"
              >
                Try Again
              </button>
            </div>
          )}

          {noResults && (
            <div className="flex flex-col items-center justify-center gap-3 min-h-[40vh] text-center">
              <span className="text-5xl">🌙</span>
              <p className="text-muted">No spots found. Try a different vibe or city.</p>
            </div>
          )}
        </div>
      )}
    </main>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<LoadingScreen emoji="🌙" city="" />}>
      <ResultsContent />
    </Suspense>
  );
}
