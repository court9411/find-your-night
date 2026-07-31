"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Calendar, Moon, Flame } from "lucide-react";
import { TonightRailItem, BUSY_NOW_THRESHOLD } from "@/lib/tonightRail";
import { mapPriceLevel } from "@/lib/venueMappers";
import { logAction } from "@/lib/track-action";
import { getAnonId } from "@/lib/anon";
import { useInView } from "@/lib/useInView";

interface Props {
  item: TonightRailItem;
  userId: string | null;
  showDistance?: boolean;
  onClick?: () => void;
}

function formatStartTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  });
}

/**
 * One card in the Tonight rail — event or venue, decided by item.itemType.
 * Same rail, same "See more" entry point (components/TonightRail.tsx,
 * app/rail/tonight/page.tsx); this just branches what's inside the shell.
 * Visual shell intentionally mirrors VenueRailCard's (w-44, image top,
 * gradient, p-6 body) so the mixed rail doesn't read as two different card
 * systems bolted together.
 */
export default function TonightCard({ item, userId, showDistance = false, onClick }: Props) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const isEvent = item.itemType === "event";
  const href = isEvent ? `/event/${item.id}` : `/venue/${item.id}`;
  const busyNow = item.liveDensityScore >= BUSY_NOW_THRESHOLD;

  useEffect(() => {
    if (inView) {
      logAction({ userId, anonId: getAnonId(), targetType: item.itemType, targetId: item.id, actionType: "viewed" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView]);

  function handleClick() {
    logAction({ userId, anonId: getAnonId(), targetType: item.itemType, targetId: item.id, actionType: "clicked" });
    onClick?.();
  }

  return (
    <div ref={ref} className="flex-none active:scale-95 transition-transform">
      <Link href={href} onClick={handleClick} className="block">
        <div className="flex-none w-44 rounded-2xl border border-card-border bg-card overflow-hidden">
          <div className="relative w-full h-28">
            {item.imageUrl ? (
              <img src={item.imageUrl} alt={item.title} className="w-full h-full object-contain bg-black/20" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-zinc-800 via-zinc-900 to-black flex items-center justify-center">
                {isEvent ? (
                  <Calendar className="text-accent" size={28} style={{ opacity: 0.5 }} aria-hidden />
                ) : (
                  <Moon className="text-accent" size={28} style={{ opacity: 0.5 }} fill="currentColor" stroke="none" aria-hidden />
                )}
              </div>
            )}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: "linear-gradient(to top, rgba(0,0,0,0.75), transparent 55%)" }}
              aria-hidden
            />
            {busyNow && (
              <div className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5">
                <Flame className="text-accent fill-current" size={10} stroke="none" aria-hidden />
                <span className="text-[9px] font-bold uppercase tracking-widest text-accent">Busy Now</span>
              </div>
            )}
          </div>
          <div className="p-6 flex flex-col gap-0.5 min-w-0">
            <p className="font-display text-base tracking-wide leading-tight line-clamp-2">{item.title}</p>
            {isEvent ? (
              <p className="text-[11px] text-muted leading-tight line-clamp-1">
                {item.venueName}
                {item.startTime && <> · {formatStartTime(item.startTime)}</>}
              </p>
            ) : (
              <p className="text-[11px] text-muted leading-tight line-clamp-1">
                {item.subtitle}
                {showDistance && item.distanceMi != null && <> · {item.distanceMi.toFixed(1)}mi</>}
              </p>
            )}
            {item.priceLevel != null && (
              <p className="text-[11px] text-accent font-semibold mt-0.5">{mapPriceLevel(item.priceLevel)}</p>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}
