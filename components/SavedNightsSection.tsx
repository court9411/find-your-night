"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SavedNightItem } from "@/lib/profileData";

function formatDateLabel(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function SavedNightsSection() {
  const [items, setItems] = useState<SavedNightItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/profile/saved-nights")
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
      <h2 className="font-display font-bold text-xl tracking-tight">Saved Nights</h2>

      {items === null && (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-white/[0.04] animate-pulse" />
          ))}
        </div>
      )}

      {items !== null && items.length === 0 && (
        <p className="text-muted text-sm">No saved nights yet. Tap the bookmark on any event or venue to save it.</p>
      )}

      {items !== null && items.length > 0 && (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <Link
              key={item.id}
              href={item.type === "event" ? `/event/${item.targetId}` : `/venue/${item.targetId}`}
              className="rounded-xl bg-white/[0.04] border border-card-border px-4 py-3 flex items-center gap-3 active:scale-[0.98] transition-transform"
            >
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-12 h-12 rounded-lg object-contain bg-black/20 shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-zinc-800 via-zinc-900 to-black flex items-center justify-center shrink-0 text-lg" aria-hidden>
                  🌙
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm truncate">{item.name}</p>
                <p className="text-xs text-muted truncate">
                  {item.neighborhood ? item.neighborhood : item.type === "venue" ? "Venue" : "Event"}
                  {item.date ? ` · ${formatDateLabel(item.date)}` : ""}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
