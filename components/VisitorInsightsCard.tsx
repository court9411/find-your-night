"use client";

import { useEffect, useState } from "react";
import { crowdLabel, musicLabel, ratingEmoji, VisitRating } from "@/lib/visitSurvey";

interface VisitSummary {
  visitCount: number;
  avgRating: number | null;
  topCrowdLevel: string | null;
  topMusicQuality: string | null;
  wouldReturnPct: number | null;
  notes: string[];
}

interface Props {
  venueId: string | null | undefined;
}

// Rounds the average 1-4 rating to the nearest whole option so it can reuse
// the same emoji set the survey itself uses, rather than inventing a
// separate "average" visual.
function roundedRatingEmoji(avg: number | null): string {
  if (avg == null) return "";
  const rounded = Math.min(4, Math.max(1, Math.round(avg))) as VisitRating;
  return ratingEmoji(rounded);
}

export default function VisitorInsightsCard({ venueId }: Props) {
  const [summary, setSummary] = useState<VisitSummary | null>(null);

  useEffect(() => {
    if (!venueId) {
      setSummary(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/venues/visit-summary?venueId=${venueId}`)
      .then((res) => (res.ok ? res.json() : { summary: null }))
      .then((data) => {
        if (!cancelled) setSummary(data.summary ?? null);
      })
      .catch(() => {
        if (!cancelled) setSummary(null);
      });
    return () => {
      cancelled = true;
    };
  }, [venueId]);

  if (!summary) return null;

  const pills: string[] = [];
  if (summary.topCrowdLevel) pills.push(`${crowdLabel(summary.topCrowdLevel as never)} crowd`);
  if (summary.topMusicQuality) pills.push(musicLabel(summary.topMusicQuality as never));
  if (summary.wouldReturnPct != null) pills.push(`${summary.wouldReturnPct}% would return`);

  return (
    <div className="rounded-xl bg-white/5 border border-card-border px-4 py-3 flex flex-col gap-2">
      <p className="text-[10px] uppercase tracking-widest font-bold text-muted">
        From {summary.visitCount} scout {summary.visitCount === 1 ? "report" : "reports"}
      </p>
      <div className="flex items-center gap-2">
        {summary.avgRating != null && (
          <span className="text-xl" aria-hidden>
            {roundedRatingEmoji(summary.avgRating)}
          </span>
        )}
        <div className="flex flex-wrap gap-1.5">
          {pills.map((pill) => (
            <span
              key={pill}
              className="text-xs px-2.5 py-1 rounded-full bg-white/[0.06] text-white font-semibold"
            >
              {pill}
            </span>
          ))}
        </div>
      </div>
      {summary.notes.length > 0 && (
        <div className="flex flex-col gap-1 mt-1">
          {summary.notes.map((note, i) => (
            <p key={i} className="text-xs text-muted italic">
              &ldquo;{note}&rdquo;
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
