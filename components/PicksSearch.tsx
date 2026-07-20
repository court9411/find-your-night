"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X, Zap, Calendar } from "lucide-react";
import { Venue } from "@/lib/types";
import { PromoterEvent } from "@/lib/promoterEvent";
import VenueRailCard from "@/components/VenueRailCard";
import EventRailCard from "@/components/EventRailCard";

const DEBOUNCE_MS = 300;
const MIN_QUERY = 2;
const SEARCH_QUEUE_KEY = "fyn_search_queue";

interface Props {
  userId: string | null;
  /** Lets the Picks page hide its normal rails while a search is active. */
  onActiveChange?: (active: boolean) => void;
}

interface Results {
  venues: Venue[];
  events: PromoterEvent[];
}

function eventDateLabel(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((date.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return `${date.toLocaleDateString("en-US", { weekday: "short" })} ${date.toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
  })}`;
}

export default function PicksSearch({ userId, onActiveChange }: Props) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [results, setResults] = useState<Results | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const active = query.trim().length > 0;

  useEffect(() => {
    onActiveChange?.(active);
  }, [active, onActiveChange]);

  // Debounce the query before it drives a fetch.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebounced(query.trim()), DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  useEffect(() => {
    if (debounced.length < MIN_QUERY) {
      setResults(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/picks/search?q=${encodeURIComponent(debounced)}`)
      .then((res) => (res.ok ? res.json() : { venues: [], events: [] }))
      .then((data) => {
        if (!cancelled) setResults({ venues: data.venues ?? [], events: data.events ?? [] });
      })
      .catch(() => {
        if (!cancelled) setResults({ venues: [], events: [] });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  function clear() {
    setQuery("");
    setDebounced("");
    setResults(null);
  }

  function hideEvent(id: string) {
    setResults((prev) => (prev ? { ...prev, events: prev.events.filter((e) => e.id !== id) } : prev));
  }

  const hasResults = !!results && (results.venues.length > 0 || results.events.length > 0);
  const noResults =
    active && !loading && debounced.length >= MIN_QUERY && !!results && !hasResults;

  return (
    <div className="px-5 pb-3">
      {/* Input */}
      <div className="relative">
        <Search
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
          size={18}
          aria-hidden
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search venues & events…"
          aria-label="Search venues and events"
          className="w-full rounded-2xl bg-white/[0.06] border border-card-border pl-11 pr-10 py-3 text-sm placeholder:text-muted/60 focus:outline-none focus:border-accent/60 transition-colors"
        />
        {active && (
          <button
            onClick={clear}
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-muted active:opacity-70"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Results (only while searching) */}
      {active && (
        <div className="mt-4 flex flex-col gap-6">
          {loading && (
            <div className="flex gap-3.5 overflow-hidden">
              {[0, 1].map((i) => (
                <div key={i} className="flex-none w-44 h-44 glass-card rounded-2xl animate-pulse" />
              ))}
            </div>
          )}

          {!loading && debounced.length < MIN_QUERY && (
            <p className="text-xs text-muted/60 px-1">Keep typing to search…</p>
          )}

          {noResults && (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <span className="text-4xl">🔍</span>
              <p className="text-muted text-sm">No matches for &ldquo;{debounced}&rdquo;.</p>
              <p className="text-muted/60 text-xs">Try a venue name, event, or a vibe like &ldquo;rooftop.&rdquo;</p>
            </div>
          )}

          {hasResults && results.venues.length > 0 && (
            <div>
              <h3 className="font-display font-bold text-base tracking-wide mb-3 flex items-center gap-2">
                <Zap className="text-accent" size={18} aria-hidden />
                Venues
              </h3>
              <div className="flex flex-wrap gap-3.5">
                {results.venues.map((venue) => (
                  <VenueRailCard
                    key={venue.id ?? venue.name}
                    venue={venue}
                    userId={userId}
                    href={venue.id ? `/venue/${venue.id}` : undefined}
                  />
                ))}
              </div>
            </div>
          )}

          {hasResults && results.events.length > 0 && (
            <div>
              <h3 className="font-display font-bold text-base tracking-wide mb-3 flex items-center gap-2">
                <Calendar className="text-accent" size={18} aria-hidden />
                Events
              </h3>
              <div className="flex flex-wrap gap-3.5">
                {results.events.map((event, index) => (
                  <EventRailCard
                    key={event.id}
                    event={event}
                    index={index}
                    section="lineup"
                    queueKey={SEARCH_QUEUE_KEY}
                    queueIds={results.events.map((e) => e.id)}
                    userId={userId}
                    dateLabel={eventDateLabel(event.date)}
                    onHide={hideEvent}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
