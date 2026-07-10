"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { PromoterEvent, formatEventTime } from "@/lib/promoterEvent";
import { track } from "@/lib/analytics";
import { logAction } from "@/lib/track-action";
import { getAnonId } from "@/lib/anon";
import { useInView } from "@/lib/useInView";
import NotInterestedButton from "@/components/NotInterestedButton";
import { VENUE_DETAIL_BACK_KEY } from "@/lib/storageKeys";

interface Props {
  event: PromoterEvent;
  index: number;
  section: "tonight" | "this_week" | "lineup" | "big_shows";
  queueKey: string;
  queueIds: string[];
  userId: string | null;
  dateLabel?: string;
  onHide: (eventId: string) => void;
}

export default function EventRailCard({
  event,
  index,
  section,
  queueKey,
  queueIds,
  userId,
  dateLabel,
  onHide,
}: Props) {
  const { ref, inView } = useInView<HTMLDivElement>();

  useEffect(() => {
    if (inView) {
      logAction({ userId, anonId: getAnonId(), targetType: "event", targetId: event.id, actionType: "viewed" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView]);

  const href = event.venue_id ? `/venue/${event.venue_id}?event=${event.id}` : `/event/${event.id}`;

  function handleClick() {
    sessionStorage.setItem(queueKey, JSON.stringify({ ids: queueIds, index }));
    if (event.venue_id) {
      sessionStorage.setItem(VENUE_DETAIL_BACK_KEY, window.location.pathname + window.location.search);
    }
    track("event_card_clicked", {
      event_id: event.id,
      event_name: event.event_name,
      position_in_carousel: index,
      section,
    });
    logAction({ userId, anonId: getAnonId(), targetType: "event", targetId: event.id, actionType: "clicked" });
  }

  return (
    <div ref={ref} className="flex-shrink-0">
      <NotInterestedButton itemType="event" itemId={event.id} onConfirm={() => onHide(event.id)}>
        <Link
          href={href}
          onClick={handleClick}
          className="block active:scale-95 transition-transform duration-100"
        >
          <div className="w-44 rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800/60">
            <div className="relative w-44 h-44 bg-black/30">
              <Image
                src={event.image_url}
                alt={event.event_name}
                fill
                className="object-contain"
                sizes="176px"
                unoptimized
              />
              {dateLabel && (
                <span className="absolute top-1.5 left-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-accent text-black">
                  {dateLabel}
                </span>
              )}
            </div>
            <div className="p-2.5 min-w-0">
              <p className="text-white text-xs font-semibold line-clamp-2 leading-snug">
                {event.event_name}
              </p>
              <p className="text-zinc-500 text-[10px] truncate mt-0.5">
                {event.venue_name}
                {event.neighborhood ? ` · ${event.neighborhood}` : ""}
              </p>
              {event.start_time && (
                <p className="text-zinc-600 text-[10px] mt-0.5">{formatEventTime(event.start_time)}</p>
              )}
            </div>
          </div>
        </Link>
      </NotInterestedButton>
    </div>
  );
}
