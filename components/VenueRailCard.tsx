"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Venue } from "@/lib/types";
import { formatMatchReason } from "@/lib/matchReason";
import { logAction } from "@/lib/track-action";
import { getAnonId } from "@/lib/anon";
import { useInView } from "@/lib/useInView";

interface Props {
  venue: Venue;
  userId: string | null;
  showDistance?: boolean;
  /** Provide for standalone rails that link straight to the venue page. */
  href?: string;
  /** Fired on click in addition to logging — navigation (router.push / Link) or session bookkeeping. */
  onClick?: () => void;
}

/**
 * Compact horizontal-rail card shared by every venue rail (the main
 * Tonight rail, and the themed home rails). Rails differ in *what* they
 * fetch, not what a card looks like — see lib/homeRails.ts.
 */
export default function VenueRailCard({ venue, userId, showDistance = false, href, onClick }: Props) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const matchReason = formatMatchReason(venue);
  // distanceMiles (client-side Haversine, set by sortByProximity for the
  // Tonight rail) vs. distanceMi (server-computed, returned directly by the
  // ranking RPCs for the themed home rails) — same unit, different source
  // depending on which rail fetched this venue.
  const distanceMiles = venue.distanceMiles ?? venue.distanceMi ?? null;

  useEffect(() => {
    if (inView && venue.id) {
      logAction({ userId, anonId: getAnonId(), targetType: "venue", targetId: venue.id, actionType: "viewed" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView]);

  function handleClick() {
    if (venue.id) {
      logAction({ userId, anonId: getAnonId(), targetType: "venue", targetId: venue.id, actionType: "clicked" });
    }
    onClick?.();
  }

  const card = (
    <div className="flex-none w-44 rounded-2xl border border-card-border bg-card overflow-hidden">
      {venue.imageUrl ? (
        <img src={venue.imageUrl} alt={venue.name} className="w-full h-28 object-contain bg-black/20" />
      ) : (
        <div className="w-full h-28 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black flex items-center justify-center">
          <span className="text-3xl opacity-30" aria-hidden>
            🌙
          </span>
        </div>
      )}
      <div className="p-3 flex flex-col gap-0.5">
        {venue.liveTonight && (
          <div className="flex items-center gap-1 mb-0.5">
            <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent" />
            </span>
            <span className="text-[9px] font-bold uppercase tracking-widest text-accent">Live Tonight</span>
          </div>
        )}
        <p className="font-display text-base tracking-wide leading-tight line-clamp-1">{venue.name}</p>
        <p className="text-[11px] text-muted leading-tight line-clamp-1">
          {venue.type} · {venue.neighborhood}
          {showDistance && distanceMiles != null && <> · {distanceMiles.toFixed(1)}mi</>}
        </p>
        {matchReason && (
          <p className="text-[10px] text-accent font-semibold leading-tight line-clamp-1">{matchReason}</p>
        )}
        <p className="text-[11px] text-accent font-semibold mt-0.5">{venue.price}</p>
      </div>
    </div>
  );

  return (
    <div ref={ref} className="flex-none active:scale-95 transition-transform">
      {href ? (
        <Link href={href} onClick={handleClick} className="block">
          {card}
        </Link>
      ) : (
        <div onClick={handleClick} className="cursor-pointer">
          {card}
        </div>
      )}
    </div>
  );
}
