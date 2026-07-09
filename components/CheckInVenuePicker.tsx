"use client";

import { useEffect, useRef, useState } from "react";
import { useLocation } from "@/lib/useLocation";
import { NearbyVenue, VenueSearchResult, SelectedVenue } from "@/lib/checkin";

interface Props {
  onNearbyMatch: (venue: NearbyVenue, coords: { lat: number; lng: number }) => void;
  onSelectVenue: (venue: SelectedVenue) => void;
}

const SEARCH_DEBOUNCE_MS = 300;

export default function CheckInVenuePicker({ onNearbyMatch, onSelectVenue }: Props) {
  const location = useLocation();
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsEmpty, setGpsEmpty] = useState(false);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<VenueSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/venues/search?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        setResults(data.venues ?? []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  async function handleUseLocation() {
    setGpsError(null);
    setGpsEmpty(false);
    try {
      const coords = await location.request();
      const res = await fetch(`/api/venues/nearby?lat=${coords.lat}&lng=${coords.lng}`);
      const data = await res.json();
      if (data.venue) {
        onNearbyMatch(data.venue, coords);
      } else {
        setGpsEmpty(true);
      }
    } catch (err) {
      setGpsError(err instanceof Error ? err.message : "Couldn't get your location.");
    }
  }

  return (
    <div className="flex flex-col gap-6 px-5">
      <button
        onClick={handleUseLocation}
        disabled={location.loading}
        className="w-full min-h-[52px] rounded-2xl bg-accent hover:bg-accent-hover text-black font-display font-bold text-xl tracking-wide py-3.5 active:scale-[0.98] transition-transform disabled:opacity-60"
      >
        {location.loading ? "Finding you…" : "📍 Use My Location"}
      </button>
      {gpsError && <p className="text-sm text-accent -mt-3">{gpsError}</p>}
      {gpsEmpty && (
        <p className="text-sm text-muted -mt-3">
          No venue found nearby — try searching by name below.
        </p>
      )}

      <div className="flex items-center gap-3 text-muted text-sm">
        <div className="h-px flex-1 bg-card-border" />
        OR SEARCH
        <div className="h-px flex-1 bg-card-border" />
      </div>

      <div className="flex flex-col gap-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search venues…"
          className="w-full rounded-2xl bg-white/[0.06] border border-card-border px-4 py-3.5 text-sm placeholder:text-muted/60 focus:outline-none focus:border-accent/50 transition-colors"
        />

        {searching && <p className="text-xs text-muted/60 px-1">Searching…</p>}

        {results.length > 0 && (
          <div className="flex flex-col gap-2">
            {results.map((venue) => (
              <button
                key={venue.id}
                onClick={() => onSelectVenue(venue)}
                className="w-full text-left rounded-xl bg-white/[0.04] border border-card-border px-4 py-3 active:scale-[0.98] transition-transform"
              >
                <p className="font-display font-bold text-sm">{venue.name}</p>
                {venue.neighborhood && <p className="text-xs text-muted mt-0.5">{venue.neighborhood}</p>}
              </button>
            ))}
          </div>
        )}

        {!searching && query.trim() && results.length === 0 && (
          <p className="text-xs text-muted/60 px-1">No venues found for &ldquo;{query.trim()}&rdquo;.</p>
        )}
      </div>
    </div>
  );
}
