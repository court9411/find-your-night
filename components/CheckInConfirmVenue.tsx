"use client";

import { NearbyVenue } from "@/lib/checkin";

interface Props {
  venue: NearbyVenue;
  onConfirm: () => void;
  onNotThis: () => void;
}

export default function CheckInConfirmVenue({ venue, onConfirm, onNotThis }: Props) {
  return (
    <div className="flex flex-col gap-6 px-5">
      <div className="rounded-2xl glass-card p-5 flex flex-col gap-2 text-center">
        <span className="text-3xl" aria-hidden>
          📍
        </span>
        <p className="text-sm text-muted">Is this where you are?</p>
        <h2 className="font-display font-extrabold text-2xl tracking-tight">{venue.name}</h2>
        {venue.neighborhood && <p className="text-sm text-muted">{venue.neighborhood}</p>}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onNotThis}
          className="flex-1 min-h-[52px] rounded-2xl border border-card-border text-muted font-display font-bold text-base tracking-wide active:scale-95 transition-transform"
        >
          Not this
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 min-h-[52px] rounded-2xl bg-accent hover:bg-accent-hover text-black font-display font-bold text-base tracking-wide active:scale-95 transition-transform"
        >
          Yes, check in
        </button>
      </div>
    </div>
  );
}
