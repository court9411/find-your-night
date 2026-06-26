"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Venue } from "@/lib/types";
import { formatEventDateLine } from "@/lib/formatEventDate";
import { RESULTS_KEY, RESULT_BACK_KEY } from "@/lib/storageKeys";

export default function StoryView() {
  const { index: indexParam } = useParams<{ index: string }>();
  const router = useRouter();
  const index = Number(indexParam ?? 0);

  const [venues, setVenues] = useState<Venue[]>([]);
  const [backUrl, setBackUrl] = useState("/results");
  const [hydrated, setHydrated] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(RESULTS_KEY);
      if (stored) setVenues(JSON.parse(stored));
      const back = sessionStorage.getItem(RESULT_BACK_KEY);
      if (back) setBackUrl(back);
    } catch {}
    setHydrated(true);
  }, []);

  // Reset saved state when index changes
  useEffect(() => {
    setSaved(false);
  }, [index]);

  const venue: Venue | undefined = venues[index];
  const total = venues.length;

  function navigate(to: number) {
    if (to < 0 || to >= total) return;
    router.push(`/tonight/${to}`);
  }

  // Loading: sessionStorage not yet read
  if (!hydrated) {
    return (
      <main className="flex flex-col min-h-screen px-5 pt-12">
        <div className="glass-card h-64 animate-pulse rounded-2xl" />
      </main>
    );
  }

  // No session data (e.g. direct navigation or expired session)
  if (hydrated && venues.length === 0) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen gap-4 px-5 text-center">
        <span className="text-5xl">🌙</span>
        <p className="text-muted">Session expired. Go back and search again.</p>
        <button
          onClick={() => router.push("/")}
          className="rounded-2xl bg-accent text-white font-display text-xl tracking-wide px-8 py-3"
        >
          Start over
        </button>
      </main>
    );
  }

  // Out-of-bounds index
  if (!venue) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen gap-4 px-5 text-center">
        <p className="text-muted">No result at this position.</p>
        <button onClick={() => router.push(backUrl)} className="text-accent text-sm underline underline-offset-4">
          ← Back to results
        </button>
      </main>
    );
  }

  return (
    <main className="flex flex-col min-h-screen pb-12">
      {/* Back + counter */}
      <div className="flex items-center justify-between px-5 pt-12 pb-4">
        <button
          onClick={() => router.push(backUrl)}
          className="flex items-center gap-1 text-muted text-sm active:opacity-70"
        >
          <span aria-hidden>←</span>
          <span>Tonight</span>
        </button>
        <span className="text-xs text-muted/60 font-medium">
          {index + 1} of {total}
        </span>
      </div>

      {/* Image area — only renders when there's a real photo */}
      {venue.imageUrl && (
        <div className="relative mx-5 rounded-2xl overflow-hidden mb-5">
          <img
            src={venue.imageUrl}
            alt={venue.name}
            className="w-full h-56 object-cover"
          />

          {/* Previous tap zone */}
          {index > 0 && (
            <button
              onClick={() => navigate(index - 1)}
              className="absolute inset-y-0 left-0 w-1/3"
              aria-label="Previous result"
            />
          )}

          {/* Next tap zone */}
          {index < total - 1 && (
            <button
              onClick={() => navigate(index + 1)}
              className="absolute inset-y-0 right-0 w-1/3"
              aria-label="Next result"
            />
          )}

          {/* Progress dots — show for sets up to 12 */}
          {total > 1 && total <= 12 && (
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
              {venues.map((_, i) => (
                <button
                  key={i}
                  onClick={() => navigate(i)}
                  aria-label={`Go to result ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all duration-200 ${
                    i === index ? "w-4 bg-white" : "w-1.5 bg-white/30"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}


      {/* Content */}
      <div className="px-5 flex flex-col gap-4">
        {/* Name + meta */}
        <div>
          {venue.featured && (
            <span className="inline-block text-xs px-2 py-1 rounded-full bg-accent text-white font-semibold tracking-wide mb-2">
              🌟 Local Event
            </span>
          )}
          <h1 className="font-display text-3xl sm:text-4xl tracking-wide leading-tight">
            {venue.name}
          </h1>
          <p className="text-sm text-muted mt-1">
            {venue.type} · {venue.neighborhood} · {venue.price}
          </p>
          {(venue.eventDate || venue.eventTime) && (
            <p className="text-sm text-muted/70 mt-0.5">
              {formatEventDateLine(venue.eventDate ?? null, venue.eventTime ?? null)}
            </p>
          )}
        </div>

        {/* Address / Hours / Happy Hour */}
        {(venue.address || venue.hours || venue.happyHour) && (
          <div className="rounded-xl bg-white/5 border border-card-border px-4 py-3 flex flex-col gap-2">
            {venue.address && (
              <a
                href={
                  venue.lat != null && venue.lng != null
                    ? `https://www.google.com/maps/search/?api=1&query=${venue.lat},${venue.lng}`
                    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.address)}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-2 text-sm text-accent underline underline-offset-4"
              >
                <span aria-hidden>📍</span>
                <span>{venue.address}</span>
              </a>
            )}
            {venue.hours && (
              <p className="flex items-start gap-2 text-sm text-muted">
                <span aria-hidden>🕒</span>
                <span>{venue.hours}</span>
              </p>
            )}
            {venue.happyHour && (
              <p className="flex items-start gap-2 text-sm text-muted">
                <span aria-hidden>🍹</span>
                <span>Happy hour: {venue.happyHour}</span>
              </p>
            )}
          </div>
        )}

        {/* WHY TONIGHT */}
        {venue.whyTonight && (
          <div className="rounded-xl border-l-2 border-accent bg-accent/10 px-4 py-3">
            <p className="text-[10px] uppercase tracking-widest font-bold text-accent mb-1.5">
              Why Tonight
            </p>
            <p className="text-sm leading-relaxed">{venue.whyTonight}</p>
          </div>
        )}

        {/* Description */}
        {venue.description && (
          <p className="text-sm text-muted/80 leading-relaxed">{venue.description}</p>
        )}

        {/* Vibe tags */}
        {venue.tags && venue.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {venue.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-card-border text-muted"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Skip / Save */}
        <div className="flex gap-3 mt-2">
          <button
            onClick={() => navigate(index + 1)}
            disabled={index >= total - 1}
            className="flex-1 rounded-2xl border border-card-border py-3 text-sm font-semibold text-muted active:scale-95 transition-transform disabled:opacity-30"
          >
            Skip →
          </button>
          <button
            onClick={() => setSaved((s) => !s)}
            className={`flex-1 rounded-2xl py-3 text-sm font-semibold active:scale-95 transition-all ${
              saved
                ? "bg-accent text-white"
                : "bg-accent/20 border border-accent/30 text-accent"
            }`}
          >
            {saved ? "Saved ❤️" : "Save"}
          </button>
        </div>
      </div>
    </main>
  );
}
