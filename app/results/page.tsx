"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Zap, Moon, Sparkles, Sparkle, Star } from "lucide-react";
import { Venue } from "@/lib/types";
import { sortByProximity, Coords } from "@/lib/geo";
import { readCachedCoords } from "@/lib/geoStorage";
import { RESULTS_KEY, RESULT_BACK_KEY } from "@/lib/storageKeys";
import { LineupSection } from "@/components/LineupSection";
import { BigShowsSection } from "@/components/BigShowsSection";
import { RailSection } from "@/components/RailSection";
import { RailConfig } from "@/lib/homeRails";
import { track } from "@/lib/analytics";
import { getRankedVenues } from "@/lib/scoring";
import { logAction } from "@/lib/track-action";
import { getAnonId } from "@/lib/anon";
import { createClient } from "@/lib/supabase/client";
import NotInterestedButton from "@/components/NotInterestedButton";
import HostEventLink from "@/components/HostEventLink";
import VenueRailCard from "@/components/VenueRailCard";
import PicksSearch from "@/components/PicksSearch";
import PickerEntryCard from "@/components/PickerEntryCard";
import DidYouGoCard from "@/components/DidYouGoCard";
import VisitSurveyModal from "@/components/VisitSurveyModal";
import { PendingVisit } from "@/lib/visitSurvey";

const INITIAL_TONIGHT_COUNT = 8;

function TonightContent() {
  const params = useSearchParams();
  const router = useRouter();

  const latParam = params.get("lat");
  const lngParam = params.get("lng");
  const hasParamCoords = latParam !== null && lngParam !== null;

  // Picks (via usePicksHref) falls back to a bare "/results" when nothing's
  // cached yet, and this page used to redirect to "/" when that happened —
  // which then bounced bypassed/onboarded users straight to Live Map,
  // making the Picks tab look broken. Degrade to a cached or fallback
  // location instead, same as MapExplorer already does, so Picks always
  // renders something.
  const cachedCoords = !hasParamCoords ? readCachedCoords() : null;

  const userCoords: Coords = hasParamCoords
    ? { lat: Number(latParam), lng: Number(lngParam) }
    : { lat: cachedCoords!.lat, lng: cachedCoords!.lng };

  const isPrecise = hasParamCoords ? params.get("precise") === "1" : (cachedCoords?.precise ?? false);

  const [venues, setVenues] = useState<Venue[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [showAllTonight, setShowAllTonight] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [activeRails, setActiveRails] = useState<RailConfig[]>([]);
  const [pendingVisit, setPendingVisit] = useState<PendingVisit | null>(null);
  const [surveyOpen, setSurveyOpen] = useState(false);
  const [searchActive, setSearchActive] = useState(false);

  async function fetchPendingVisit() {
    try {
      const res = await fetch("/api/visits/pending");
      if (!res.ok) return;
      const data = await res.json();
      setPendingVisit(data.visit ?? null);
    } catch (err) {
      console.error("Failed to load pending visit prompt:", err);
    }
  }

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
    if (!userId) {
      setPendingVisit(null);
      return;
    }
    fetchPendingVisit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    // Which rail set to show (daytime vs. nightlife) has to come from the
    // server — the browser's Date() reflects the device's own timezone,
    // not Cincinnati's, and /api/rank/rail's day-of-week scoping needs to
    // agree with whichever set actually renders. See app/api/home-context.
    let cancelled = false;
    async function loadHomeContext() {
      try {
        const res = await fetch("/api/home-context");
        if (cancelled || !res.ok) return;
        const data = await res.json();
        if (!cancelled) setActiveRails(data.rails ?? []);
      } catch (err) {
        if (!cancelled) console.error("Failed to load home context:", err);
      }
    }
    loadHomeContext();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const coords = userCoords;

    let cancelled = false;
    setLoading(true);
    setVenues(null);
    setErrorMsg("");

    async function fetchAll() {
      try {
        const anonId = getAnonId();
        const [submittedRes, rankedVenues] = await Promise.all([
          fetch("/api/featured", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ city: "Cincinnati" }),
          }),
          getRankedVenues({
            userId,
            anonId,
            lat: coords.lat,
            lng: coords.lng,
            limit: 20,
          }),
        ]);
        if (cancelled) return;

        const submittedData = await submittedRes.json();
        if (cancelled) return;

        const submitted: Venue[] = submittedRes.ok ? (submittedData.venues ?? []) : [];

        const sorted = sortByProximity([...submitted, ...rankedVenues], coords);
        sessionStorage.setItem(RESULTS_KEY, JSON.stringify(sorted));
        sessionStorage.setItem(RESULT_BACK_KEY, `/results?${params.toString()}`);
        setVenues(sorted);
        track("results_viewed", { venue_count: sorted.length, precise_location: isPrecise });
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
  }, [userCoords.lat, userCoords.lng, userId]);

  function toStory(index: number) {
    router.push(`/tonight/${index}`);
  }

  // Re-fetch after any outcome — "not this time" writes a row so the next
  // saved-and-passed event (if any) surfaces; abandoning the survey writes
  // nothing, so the same prompt correctly reappears.
  function handleVisitPromptResolved() {
    setPendingVisit(null);
    setSurveyOpen(false);
    fetchPendingVisit();
  }

  function hideVenue(target: Venue) {
    setVenues((prev) => {
      if (!prev) return prev;
      const next = prev.filter((v) => v !== target);
      try {
        sessionStorage.setItem(RESULTS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
    if (target.id) {
      logAction({ userId, anonId: getAnonId(), targetType: "venue", targetId: target.id, actionType: "hidden" });
    }
  }

  const visibleVenues = venues && (showAllTonight ? venues : venues.slice(0, INITIAL_TONIGHT_COUNT));
  const hasMoreVenues = !!venues && venues.length > INITIAL_TONIGHT_COUNT && !showAllTonight;

  return (
    <main className="flex flex-col min-h-screen pb-12">
      {/* Header */}
      <div className="relative flex flex-col items-center px-5 pt-8 pb-5 text-center overflow-hidden">
        <button
          onClick={() => router.push("/profile")}
          aria-label="Profile"
          className="absolute top-2 right-5 w-9 h-9 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center shrink-0 z-10"
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

        {/* Decorative star/sparkle scatter around the neon lockup */}
        <Sparkle
          className="absolute top-3 left-9 text-accent-pink fill-current"
          size={16}
          style={{ filter: "drop-shadow(0 0 4px rgba(255,20,147,0.8))" }}
          aria-hidden
        />
        <Star
          className="absolute top-0 left-1/2 -translate-x-24 text-amber-300 fill-current"
          size={20}
          style={{ filter: "drop-shadow(0 0 5px rgba(253,224,71,0.85))" }}
          aria-hidden
        />
        <Sparkle
          className="absolute top-16 left-6 text-accent-pink/80 fill-current"
          size={12}
          style={{ filter: "drop-shadow(0 0 3px rgba(255,20,147,0.7))" }}
          aria-hidden
        />
        <Star
          className="absolute top-7 right-16 text-amber-300/90 fill-current"
          size={13}
          style={{ filter: "drop-shadow(0 0 4px rgba(253,224,71,0.75))" }}
          aria-hidden
        />
        <Sparkle
          className="absolute bottom-6 right-11 text-accent-pink/80 fill-current"
          size={14}
          style={{ filter: "drop-shadow(0 0 4px rgba(255,20,147,0.7))" }}
          aria-hidden
        />

        {/* Crescent moon neon outline, arcing behind the lockup */}
        <Moon
          className="absolute top-0 right-2 text-[#ff54c8]"
          size={110}
          strokeWidth={1.25}
          style={{ filter: "drop-shadow(0 0 3px #fff) drop-shadow(0 0 8px rgba(255,20,147,0.9)) drop-shadow(0 0 20px rgba(255,20,147,0.6))" }}
          aria-hidden
        />

        <h1 className="relative z-10 font-script text-5xl sm:text-6xl leading-[0.95]">
          <span className="text-neon-pink block">Tonight&apos;s</span>
          <span className="text-neon-green block -mt-2">Picks</span>
        </h1>

        <div className="relative z-10 flex items-center gap-2.5 mt-3 text-accent-pink/60">
          <span className="tracking-[6px] text-xs">•••</span>
          <span className="text-lg" aria-hidden>🍸</span>
          <span className="tracking-[6px] text-xs">•••</span>
        </div>

        <p className="relative z-10 text-sm text-muted mt-3 max-w-[16rem]">
          Handpicked spots &amp; events to make your night unforgettable.
        </p>
      </div>

      {/* Search venues & events — hides the normal rails while active */}
      <PicksSearch userId={userId} onActiveChange={setSearchActive} />

      {!searchActive && (
        <>
      <div className="pb-4">
        <PickerEntryCard />
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

      {/* "Did you go?" trigger — independent of the Tonight venues fetch
          below (separate data source), so it must not be gated behind
          venues loading/erroring/being empty. */}
      {pendingVisit && (
        <div className="pt-2 pb-4">
          <DidYouGoCard
            visit={pendingVisit}
            onDismissed={handleVisitPromptResolved}
            onStartSurvey={() => setSurveyOpen(true)}
          />
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
            <h3 className="px-5 mb-3 flex items-center gap-2">
              <Zap className="text-accent fill-current shrink-0" size={18} aria-hidden />
              <span className="font-script text-neon-pink text-2xl leading-none">Tonight</span>
              <span
                className="flex-1 h-px bg-gradient-to-r from-accent-pink/70 to-transparent"
                style={{ boxShadow: "0 0 6px rgba(255,61,187,0.6)" }}
                aria-hidden
              />
              <Sparkle className="text-accent fill-current shrink-0" size={14} aria-hidden />
            </h3>
            <div
              className="flex gap-3.5 overflow-x-auto px-5 pb-1"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {visibleVenues!.map((venue, index) => {
                const card = (
                  <VenueRailCard
                    venue={venue}
                    onClick={() => toStory(index)}
                    showDistance={isPrecise}
                    userId={userId}
                  />
                );
                return (
                  <div key={`${venue.name}-${index}`} className="flex-none">
                    {venue.placeId ? (
                      <NotInterestedButton
                        itemType="venue"
                        itemId={venue.placeId}
                        onConfirm={() => hideVenue(venue)}
                      >
                        {card}
                      </NotInterestedButton>
                    ) : (
                      card
                    )}
                  </div>
                );
              })}
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

          {activeRails.map((rail) => (
            <RailSection key={rail.id} config={rail} lat={userCoords.lat} lng={userCoords.lng} userId={userId} />
          ))}

          <BigShowsSection userId={userId} />

          <LineupSection userId={userId} />
        </div>
      )}

      <div className="flex justify-center pt-6 pb-2">
        <HostEventLink />
      </div>
        </>
      )}

      {surveyOpen && pendingVisit && (
        <VisitSurveyModal
          visit={pendingVisit}
          onClose={() => setSurveyOpen(false)}
          onComplete={handleVisitPromptResolved}
        />
      )}
    </main>
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
