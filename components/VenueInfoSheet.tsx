"use client";

import { SelectedVenue } from "@/lib/checkin";
import RightNowBlock from "@/components/RightNowBlock";
import VisitorInsightsCard from "@/components/VisitorInsightsCard";

interface Props {
  venue: SelectedVenue;
  onClose: () => void;
  onCheckIn: () => void;
}

export default function VenueInfoSheet({ venue, onClose, onCheckIn }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50" onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div
        className="w-full rounded-t-3xl bg-[#0f0f16] border-t border-card-border px-5 pt-5 flex flex-col gap-4 animate-fadeUp"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)" }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display font-extrabold text-2xl tracking-tight leading-tight">{venue.name}</h3>
            {venue.neighborhood && <p className="text-sm text-muted mt-0.5">{venue.neighborhood}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-muted active:opacity-70"
          >
            ✕
          </button>
        </div>

        <RightNowBlock venueId={venue.id} />
        <VisitorInsightsCard venueId={venue.id} />

        <button
          onClick={onCheckIn}
          className="w-full min-h-[52px] rounded-full bg-accent hover:bg-accent-hover text-black font-display font-bold text-lg tracking-wide active:scale-[0.98] transition-transform"
        >
          Check In Here
        </button>
      </div>
    </div>
  );
}
