"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Moon } from "lucide-react";
import { Venue } from "@/lib/types";
import { RecentCheckin, CrowdLevel, crowdLevelLabel } from "@/lib/checkin";
import { VENUE_DETAIL_BACK_KEY } from "@/lib/storageKeys";

interface Props {
  venue: Venue;
  /** Count of other venues from the same picker session within walking
   * distance — computed by the caller (app/picker/page.tsx) from its own
   * queue, no separate query needed here. */
  nearbyCount: number;
  onBack: () => void;
}

const CROWD_LEVEL_SEGMENTS: Record<CrowdLevel, number> = {
  empty: 1,
  filling_up: 2,
  busy: 3,
  packed: 4,
};
const CROWD_BAR_SEGMENTS = 4;

function formatMinutesAgo(minutesAgo: number): string {
  const rounded = Math.max(0, Math.round(minutesAgo));
  if (rounded < 1) return "just now";
  return `${rounded} min ago`;
}

/**
 * The Smart Night Picker's end-state card — a lighter, match-context-aware
 * summary of the winning venue (match %, live crowd signal, why it fits),
 * not a replacement for the full venue page (linked out at the bottom for
 * anyone who wants hours/save/directions).
 */
export default function PickerMatchCard({ venue, nearbyCount, onBack }: Props) {
  const router = useRouter();
  const [checkin, setCheckin] = useState<RecentCheckin | null>(null);

  useEffect(() => {
    if (!venue.id) return;
    let cancelled = false;
    fetch(`/api/checkins/recent?venueId=${venue.id}`)
      .then((res) => (res.ok ? res.json() : { checkin: null }))
      .then((data) => {
        if (!cancelled) setCheckin(data.checkin ?? null);
      })
      .catch(() => {
        if (!cancelled) setCheckin(null);
      });
    return () => {
      cancelled = true;
    };
  }, [venue.id]);

  function seeFullDetails() {
    if (!venue.id) return;
    try {
      sessionStorage.setItem(VENUE_DETAIL_BACK_KEY, "/results");
    } catch {}
    router.push(`/venue/${venue.id}`);
  }

  const matchPercent =
    typeof venue.finalScore === "number" ? Math.round(Math.min(100, Math.max(0, venue.finalScore * 100))) : null;
  const bestForTags = (venue.matchedTags ?? []).slice(0, 2);
  const filledSegments = checkin?.crowd_level ? CROWD_LEVEL_SEGMENTS[checkin.crowd_level] : 0;

  return (
    <main className="flex flex-col min-h-screen px-5 pt-12 pb-10">
      <button onClick={onBack} className="flex items-center gap-1 text-muted text-sm active:opacity-70 mb-4">
        <span aria-hidden>←</span>
        <span>Back</span>
      </button>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="relative w-full h-48">
          {venue.imageUrl ? (
            <img src={venue.imageUrl} alt={venue.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-zinc-800 via-zinc-900 to-black flex items-center justify-center">
              <Moon className="text-accent" size={36} style={{ opacity: 0.5 }} fill="currentColor" stroke="none" aria-hidden />
            </div>
          )}
        </div>

        <div className="p-5 flex flex-col gap-4">
          <div>
            <h1 className="font-display font-extrabold text-2xl tracking-tight leading-tight">
              {venue.name}
              {matchPercent !== null && <span className="text-accent"> · {matchPercent}% Match</span>}
            </h1>
          </div>

          <div className="h-px bg-card-border" aria-hidden />

          {checkin && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted mb-1.5">
                Crowd
              </p>
              <div className="flex items-center gap-2">
                <div className="flex gap-1" aria-hidden>
                  {Array.from({ length: CROWD_BAR_SEGMENTS }).map((_, i) => (
                    <span
                      key={i}
                      className={`w-5 h-2.5 rounded-sm ${i < filledSegments ? "bg-accent" : "bg-white/10"}`}
                    />
                  ))}
                </div>
                <span className="text-xs text-muted">
                  {crowdLevelLabel(checkin.crowd_level)} · Live · updated {formatMinutesAgo(checkin.minutes_ago)}
                </span>
              </div>
            </div>
          )}

          {bestForTags.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted mb-1.5">Best For</p>
              <div className="flex flex-wrap gap-1.5">
                {bestForTags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2.5 py-1 rounded-full bg-accent/10 text-accent border border-accent/30 font-semibold"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <p className="text-sm text-muted">
            {venue.price} · {venue.neighborhood}
            {venue.distanceMi != null && <> · {venue.distanceMi.toFixed(1)}mi</>}
          </p>

          {nearbyCount > 0 && (
            <p className="text-xs text-muted/70">
              {nearbyCount} more spot{nearbyCount === 1 ? "" : "s"} within walking distance
            </p>
          )}

          <button
            onClick={seeFullDetails}
            disabled={!venue.id}
            className="text-accent text-sm font-semibold text-left mt-1 disabled:opacity-40"
          >
            See full details →
          </button>
        </div>
      </div>
    </main>
  );
}
