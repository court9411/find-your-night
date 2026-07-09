"use client";

import { useEffect, useState } from "react";
import { CHECKIN_COUNTDOWN_MINUTES, SelectedVenue } from "@/lib/checkin";

interface Props {
  venue: SelectedVenue;
  onRefresh: () => void;
  onDone: () => void;
}

function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export default function CheckInSuccess({ venue, onRefresh, onDone }: Props) {
  const [expiresAt] = useState(() => Date.now() + CHECKIN_COUNTDOWN_MINUTES * 60000);
  const [secondsLeft, setSecondsLeft] = useState(CHECKIN_COUNTDOWN_MINUTES * 60);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft(Math.max(0, Math.round((expiresAt - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const expired = secondsLeft <= 0;

  return (
    <div className="flex flex-col items-center gap-6 px-5 py-4 text-center">
      <span className="text-6xl" aria-hidden>
        {expired ? "⏱️" : "✅"}
      </span>
      <div>
        <h2 className="font-display font-extrabold text-2xl tracking-tight">
          {expired ? "Status expired" : "You're checked in!"}
        </h2>
        <p className="text-sm text-muted mt-1">{venue.name}</p>
      </div>

      {!expired ? (
        <>
          <div className="rounded-2xl glass-card px-8 py-5">
            <p className="text-[11px] uppercase tracking-widest text-muted/60 font-semibold mb-1">
              Live for
            </p>
            <p className="font-display font-extrabold text-4xl tabular-nums text-accent">
              {formatCountdown(secondsLeft)}
            </p>
          </div>
          <p className="text-xs text-muted max-w-xs">
            Other scouts see your update while it&apos;s live. It fades after the timer runs out.
          </p>
        </>
      ) : (
        <p className="text-sm text-muted max-w-xs">
          Still here? Post another update so the Live Map stays fresh.
        </p>
      )}

      <div className="w-full max-w-xs flex flex-col gap-3 mt-2">
        {expired && (
          <button
            onClick={onRefresh}
            className="w-full min-h-[52px] rounded-full bg-accent hover:bg-accent-hover text-black font-display font-bold text-lg tracking-wide active:scale-[0.98] transition-transform"
          >
            Still here? Refresh status
          </button>
        )}
        <button
          onClick={onDone}
          className="w-full min-h-[52px] rounded-full border border-card-border text-muted font-display font-bold text-base tracking-wide active:scale-[0.98] transition-transform"
        >
          Done
        </button>
      </div>
    </div>
  );
}
