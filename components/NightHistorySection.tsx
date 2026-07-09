"use client";

import { useEffect, useState } from "react";
import { NightHistoryItem } from "@/lib/profileData";
import { ratingEmoji } from "@/lib/visitSurvey";

function formatDateLabel(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function NightHistorySection() {
  const [items, setItems] = useState<NightHistoryItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/profile/night-history")
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((data) => {
        if (!cancelled) setItems(data.items ?? []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="rounded-2xl glass-card p-5 flex flex-col gap-3">
      <h2 className="font-display font-bold text-xl tracking-tight">Night History</h2>

      {items === null && (
        <div className="flex flex-col gap-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-white/[0.04] animate-pulse" />
          ))}
        </div>
      )}

      {items !== null && items.length === 0 && (
        <p className="text-muted text-sm">No nights logged yet — rate a night out after you go.</p>
      )}

      {items !== null && items.length > 0 && (
        <div className="flex flex-col divide-y divide-card-border">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{item.venueName}</p>
                <p className="text-xs text-muted mt-0.5">{formatDateLabel(item.date)}</p>
              </div>
              <span className="text-2xl shrink-0" aria-hidden>
                {ratingEmoji(item.rating)}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
