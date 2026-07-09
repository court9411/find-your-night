"use client";

import { useState } from "react";
import { PendingVisit } from "@/lib/visitSurvey";
import { getCincyDateString } from "@/lib/cincyDate";
import { track } from "@/lib/analytics";

interface Props {
  visit: PendingVisit;
  onDismissed: () => void;
  onStartSurvey: () => void;
}

// "last night" for yesterday, weekday name within the last week, otherwise
// a short date — mirrors LineupSection's formatDateLabel but for the past.
function formatPassedDayLabel(dateStr: string): string {
  const today = new Date(`${getCincyDateString()}T00:00:00`);
  const then = new Date(`${dateStr}T00:00:00`);
  const diffDays = Math.round((today.getTime() - then.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays <= 1) return "last night";
  if (diffDays <= 6) return then.toLocaleDateString("en-US", { weekday: "long" });
  return then.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function DidYouGoCard({ visit, onDismissed, onStartSurvey }: Props) {
  const [submitting, setSubmitting] = useState(false);

  async function handleNotThisTime() {
    if (submitting) return;
    setSubmitting(true);
    try {
      await fetch("/api/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: visit.id, venueId: visit.venue_id, attended: false }),
      });
      track("visit_prompt_declined", { event_id: visit.id });
    } catch {
      // fire-and-forget — worst case the prompt reappears next visit
    }
    onDismissed();
  }

  return (
    <div className="mx-5 rounded-2xl glass-card p-4 flex flex-col gap-3">
      <div className="flex items-center gap-3 min-w-0">
        {visit.image_url ? (
          <img
            src={visit.image_url}
            alt={visit.event_name}
            className="w-14 h-14 rounded-xl object-contain bg-black/20 shrink-0"
          />
        ) : (
          <div
            className="w-14 h-14 rounded-xl bg-gradient-to-br from-zinc-800 via-zinc-900 to-black flex items-center justify-center shrink-0 text-xl"
            aria-hidden
          >
            🌙
          </div>
        )}
        <div className="min-w-0">
          <p className="font-display font-bold text-base tracking-wide leading-tight">
            Did you make it out {formatPassedDayLabel(visit.date)}?
          </p>
          <p className="text-xs text-muted mt-0.5 truncate">
            {visit.event_name} · {visit.venue_name}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onStartSurvey}
          className="flex-1 min-h-[44px] rounded-full bg-accent hover:bg-accent-hover text-black font-display font-bold text-sm tracking-wide py-2.5 active:scale-[0.98] transition-transform"
        >
          Yes, I went
        </button>
        <button
          onClick={handleNotThisTime}
          disabled={submitting}
          className="flex-1 min-h-[44px] rounded-full border border-card-border text-muted font-display font-bold text-sm tracking-wide py-2.5 active:scale-[0.98] transition-transform disabled:opacity-50"
        >
          Not this time
        </button>
      </div>
    </div>
  );
}
