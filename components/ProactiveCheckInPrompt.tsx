"use client";

import { NearbyVenue } from "@/lib/checkin";

interface Props {
  venue: NearbyVenue;
  onCheckIn: () => void;
  onDismiss: () => void;
}

export default function ProactiveCheckInPrompt({ venue, onCheckIn, onDismiss }: Props) {
  return (
    <div className="absolute bottom-24 left-4 right-4 z-30 rounded-2xl glass-card p-4 flex items-start gap-3 shadow-lg backdrop-blur-md">
      <span className="text-2xl shrink-0" aria-hidden>
        📍
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-snug">
          FindYourNight tracks what&apos;s actually happening tonight — you&apos;re at{" "}
          <span className="font-display font-bold">{venue.name}</span>, want to be the first to
          report it?
        </p>
        <div className="flex gap-2 mt-3">
          <button
            onClick={onCheckIn}
            className="min-h-[40px] rounded-full bg-accent hover:bg-accent-hover text-black font-display font-bold text-sm px-4 tracking-wide active:scale-95 transition-transform"
          >
            Check In
          </button>
          <button
            onClick={onDismiss}
            className="min-h-[40px] rounded-full border border-card-border text-muted font-display font-bold text-sm px-4 tracking-wide active:scale-95 transition-transform"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
