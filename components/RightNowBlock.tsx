"use client";

import { useEffect, useState } from "react";
import { RecentCheckin, crowdLevelLabel } from "@/lib/checkin";

interface Props {
  venueId: string | null | undefined;
}

function formatMinutesAgo(minutesAgo: number): string {
  const rounded = Math.max(0, Math.round(minutesAgo));
  if (rounded < 1) return "just now";
  return `${rounded} min ago`;
}

export default function RightNowBlock({ venueId }: Props) {
  const [checkin, setCheckin] = useState<RecentCheckin | null>(null);

  useEffect(() => {
    if (!venueId) {
      setCheckin(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/checkins/recent?venueId=${venueId}`)
      .then((res) => (res.ok ? res.json() : { checkin: null }))
      .then((data) => {
        if (!cancelled) setCheckin(data.checkin ?? null);
      })
      .catch(() => {
        if (!cancelled) setCheckin(null);
      });
    return () => { cancelled = true; };
  }, [venueId]);

  if (!checkin) return null;

  return (
    <div className="rounded-xl bg-accent/10 border border-accent/20 px-4 py-3 flex flex-col gap-2">
      <p className="text-[10px] uppercase tracking-widest font-bold text-accent">
        Right Now · {formatMinutesAgo(checkin.minutes_ago)}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {checkin.crowd_level && (
          <span className="text-xs px-2.5 py-1 rounded-full bg-white/[0.06] text-white font-semibold">
            {crowdLevelLabel(checkin.crowd_level)}
          </span>
        )}
        {checkin.music_tags?.map((tag) => (
          <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-white/[0.06] text-white font-semibold">
            {tag}
          </span>
        ))}
        {checkin.cover_amount != null && (
          <span className="text-xs px-2.5 py-1 rounded-full bg-white/[0.06] text-white font-semibold">
            ${checkin.cover_amount} cover
          </span>
        )}
      </div>
    </div>
  );
}
