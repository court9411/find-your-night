"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { VIBES } from "@/components/VibeSelector";
import { Venue } from "@/lib/types";
import { sortByProximity, Coords } from "@/lib/geo";
import { RESULTS_KEY, RESULT_BACK_KEY } from "@/lib/storageKeys";

type RailId = "now" | "tonight" | "late";

function parseTimeToMinutes(timeStr: string | null | undefined): number | null {
  if (!timeStr) return null;
  const m = timeStr.match(/(\d+)(?::(\d+))?\s*(AM|PM|am|pm)?/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2] ?? "0", 10);
  const period = m[3]?.toUpperCase();
  if (period === "PM" && h !== 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return h * 60 + min;
}

function assignRail(venue: Venue): RailId {
  const todayStr = new Date().toISOString().slice(0, 10);
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const parts = venue.eventTime ? venue.eventTime.split(/\s*[–\-]\s*/) : [];
  const startMinutes = parseTimeToMinutes(parts[0]);
  const endMinutes = parts[1] ? parseTimeToMinutes(parts[1]) : null;

  // Future-date events are never "happening now"
  const isToday = !venue.eventDate || venue.eventDate === todayStr;

  if (startMinutes !== null) {
    const effectiveEnd = endMinutes ?? startMinutes + 120;
    if (isToday && nowMinutes >= startMinutes && nowMinutes < effectiveEnd) return "now";
    if (startMinutes >= 22 * 60 || startMinutes < 2 * 60) return "late";
    return "tonight";
  }

  const t = (venue.type ?? "").toLowerCase();
  if (/late.?night|after.?hour/.test(t)) return "late";
  return "tonight";
}

function TonightContent() {
  const params = useSearchParams();
  const router = useRouter();

  const q = params.get("q") ?? "";
  const vibeId = params.get("vibe") ?? "";
  const vibeLabel = params.get("label") ?? "";
  const latParam = params.get("lat");
  const lngParam = params.get("lng");
  const isPrecise = params.get("precise") === "1";

  const userCoords: Coords | null =
    latParam !== null && lngParam !== null
      ? { lat: Number(latParam), lng: Number(lngParam) }
      : null;

  const breadcrumbLabel = q || vibeLabel || "Tonight";

  const [venues, setVenues] = useState<Venue[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!q && !vibeId) {
      router.replace("/");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setVenues(null);
    setErrorMsg("");

    async function fetchAll() {
      try {
        // Resolve vibe — check by ID first, then fall back to prompt text for old-format URLs
        const vibe =
          VIBES.find((v) => v.id === vibeId) ??
          VIBES.find((v) => v.prompt.toLowerCase() === vibeId.toLowerCase()) ??
          null;

        // Fire both fetches simultaneously
        const featuredPromise = fetch("/api/featured", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ city: "Cincinnati", label: vibeLabel || "" }),
        });
        const searchPromise = fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            q
              ? { q, lat: userCoords?.lat ?? null, lng: userCoords?.lng ?? null }
              : { vibe: vibe?.prompt ?? vibeId, label: vibeLabel }
          ),
        });

        // Phase 1 — show featured venues as soon as the DB query returns (~300ms)
        const featuredRes = await featuredPromise;
        if (cancelled) return;
        const featuredData = await featuredRes.json();
        if (cancelled) return;
        const featured: Venue[] = featuredRes.ok ? (featuredData.venues ?? []) : [];

        sessionStorage.setItem(RESULTS_KEY, JSON.stringify(featured));
        sessionStorage.setItem(RESULT_BACK_KEY, `/results?${params.toString()}`);
        setVenues(featured);
        setLoading(false);
        setSearching(true);

        // Phase 2 — merge AI results when they arrive (~3–5s)
        const searchRes = await searchPromise;
        if (cancelled) return;
        const searchData = await searchRes.json();
        if (cancelled) return;
        const ai: Venue[] = searchRes.ok ? (searchData.venues ?? []) : [];

        const combined = sortByProximity([...featured, ...ai], userCoords);
        sessionStorage.setItem(RESULTS_KEY, JSON.stringify(combined));
        setVenues(combined);
      } catch (err) {
        if (!cancelled) {
          setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setSearching(false);
        }
      }
    }

    fetchAll();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, vibeId, vibeLabel, latParam, lngParam]);

  function toStory(index: number) {
    router.push(`/tonight/${index}`);
  }

  const featured = venues?.[0] ?? null;
  const rest = venues?.slice(1) ?? [];

  // Distribute rest into time rails, keeping original index in the full venues array
  const railItems: Record<RailId, Array<{ venue: Venue; index: number }>> = {
    now: [],
    tonight: [],
    late: [],
  };
  rest.forEach((v, i) => {
    railItems[assignRail(v)].push({ venue: v, index: i + 1 });
  });

  const hasRails =
    railItems.now.length > 0 || railItems.tonight.length > 0 || railItems.late.length > 0;

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
            <span className="truncate max-w-[200px]">{breadcrumbLabel}</span>
          </button>
          <h1 className="font-display text-4xl tracking-wide">Tonight</h1>
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
          <div className="glass-card h-52 animate-pulse rounded-2xl" />
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
          <p className="text-muted">No spots found. Try a different search.</p>
          <button
            onClick={() => router.push("/")}
            className="text-accent text-sm underline underline-offset-4"
          >
            Start over
          </button>
        </div>
      )}

      {/* Results */}
      {!loading && !errorMsg && featured && (
        <div className="flex flex-col gap-6">
          {/* Featured card — top result */}
          <div className="px-5">
            <div
              className="glass-card overflow-hidden cursor-pointer active:scale-[0.99] transition-transform"
              onClick={() => toStory(0)}
            >
              {featured.imageUrl && (
                <img
                  src={featured.imageUrl}
                  alt={featured.name}
                  className="w-full h-48 object-cover"
                />
              )}
              <div className="p-5 flex flex-col gap-2">
                {featured.featured && (
                  <span className="inline-block text-xs px-2 py-1 rounded-full bg-accent text-white font-semibold tracking-wide w-fit mb-0.5">
                    🌟 Local Event
                  </span>
                )}
                <h2 className="font-display text-2xl tracking-wide leading-tight">
                  {featured.name}
                </h2>
                <p className="text-sm text-muted">
                  {featured.type} · {featured.neighborhood} · {featured.price}
                </p>
                {featured.whyTonight && (
                  <p className="text-sm text-muted/80 leading-relaxed line-clamp-2">
                    {featured.whyTonight}
                  </p>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toStory(0);
                  }}
                  className="mt-2 rounded-xl bg-accent text-white text-sm font-semibold py-2.5 px-4 w-fit active:scale-95 transition-transform"
                >
                  See details
                </button>
              </div>
            </div>
          </div>

          {/* Time rails */}
          {hasRails && (
            <div className="flex flex-col gap-6">
              {railItems.now.length > 0 && (
                <TimeRail
                  railId="now"
                  label="Happening now"
                  items={railItems.now}
                  onSelect={(index) => toStory(index)}
                  showDistance={isPrecise}
                />
              )}
              {railItems.tonight.length > 0 && (
                <TimeRail
                  railId="tonight"
                  label="Tonight"
                  items={railItems.tonight}
                  onSelect={(index) => toStory(index)}
                  showDistance={isPrecise}
                />
              )}
              {railItems.late.length > 0 && (
                <TimeRail
                  railId="late"
                  label="Late night"
                  items={railItems.late}
                  onSelect={(index) => toStory(index)}
                  showDistance={isPrecise}
                />
              )}
            </div>
          )}

          {/* AI results loading indicator */}
          {searching && (
            <p className="text-center text-xs text-muted/40 py-2 animate-pulse px-5">
              Finding more spots…
            </p>
          )}
        </div>
      )}
    </main>
  );
}

interface TimeRailProps {
  railId: RailId;
  label: string;
  items: Array<{ venue: Venue; index: number }>;
  onSelect: (index: number) => void;
  showDistance: boolean;
}

function TimeRail({ railId, label, items, onSelect, showDistance }: TimeRailProps) {
  return (
    <div>
      <div className="flex items-center gap-2 px-5 mb-3">
        {railId === "now" && (
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
          </span>
        )}
        <h3 className="font-display text-xl tracking-wide">{label}</h3>
      </div>
      {/* Horizontal scrolling rail */}
      <div
        className="flex gap-3 overflow-x-auto px-5 pb-1"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {items.map(({ venue, index }) => (
          <RailCard
            key={`${venue.name}-${index}`}
            venue={venue}
            onClick={() => onSelect(index)}
            showDistance={showDistance}
          />
        ))}
      </div>
    </div>
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
        <img src={venue.imageUrl} alt={venue.name} className="w-full h-28 object-cover" />
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
