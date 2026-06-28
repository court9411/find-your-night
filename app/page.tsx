"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadGoogleMaps, findAddressComponent } from "@/lib/googleMaps";
import CityAutocompleteInput, { CitySelection } from "@/components/CityAutocompleteInput";

const FALLBACK_COORDS = { lat: 39.1031, lng: -84.512 };
const GEO_COORDS_KEY = "fyn:geoCoords";
const GEO_AREA_KEY = "fyn:geoArea";
const GEO_DENIED_KEY = "fyn:geoDenied";

export default function JustAsk() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [coords, setCoords] = useState(FALLBACK_COORDS);
  const [areaName, setAreaName] = useState<string | null>(null);
  const [precise, setPrecise] = useState(false);
  const [showGeoNote, setShowGeoNote] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) return;
    if (sessionStorage.getItem(GEO_DENIED_KEY) === "1") return;

    // Reuse cached geolocation from this session
    const cached = sessionStorage.getItem(GEO_COORDS_KEY);
    if (cached) {
      try {
        setCoords(JSON.parse(cached));
        setPrecise(true);
        const area = sessionStorage.getItem(GEO_AREA_KEY);
        if (area) setAreaName(area);
        return;
      } catch {}
    }

    // Prompt for location — show a brief note before the browser dialog fires
    setShowGeoNote(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(c);
        setPrecise(true);
        setShowGeoNote(false);
        sessionStorage.setItem(GEO_COORDS_KEY, JSON.stringify(c));

        // Reverse geocode to get area name for the proximity chip
        try {
          const g = await loadGoogleMaps();
          const geocoder = new g.maps.Geocoder();
          geocoder.geocode({ location: c }, (results, status) => {
            if (status === "OK" && results?.[0]) {
              const area =
                findAddressComponent(
                  results[0].address_components,
                  "neighborhood",
                  "sublocality_level_1",
                  "sublocality",
                  "locality"
                ) || "Cincinnati";
              setAreaName(area);
              sessionStorage.setItem(GEO_AREA_KEY, area);
            }
          });
        } catch {}
      },
      () => {
        setShowGeoNote(false);
        sessionStorage.setItem(GEO_DENIED_KEY, "1");
      },
      { timeout: 8000 }
    );
  }, []);

  function handleCitySelected(selection: CitySelection) {
    if (selection.lat === undefined || selection.lng === undefined) return;
    const c = { lat: selection.lat, lng: selection.lng };
    setCoords(c);
    setPrecise(true);
    setAreaName(selection.city);
    sessionStorage.setItem(GEO_COORDS_KEY, JSON.stringify(c));
    sessionStorage.setItem(GEO_AREA_KEY, selection.city);
  }

  function buildParams() {
    const p = new URLSearchParams();
    p.set("lat", String(coords.lat));
    p.set("lng", String(coords.lng));
    if (precise) p.set("precise", "1");
    return p.toString();
  }

  function submit() {
    router.push(`/results?${buildParams()}`);
  }

  const proximityLabel =
    precise && areaName ? `Near ${areaName}` : "Cincinnati · showing results near you";

  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-5 py-8">
      <div className="w-full max-w-sm flex flex-col items-center gap-4">
        <h1 className="font-display font-extrabold text-5xl sm:text-6xl tracking-tight text-center">
          Find Your <span className="text-accent">Night.</span>
        </h1>
        <p className="text-muted text-sm text-center -mt-1">Where are you tonight?</p>

        {/* Location input */}
        <CityAutocompleteInput
          value={query}
          onChange={setQuery}
          onCitySelected={handleCitySelected}
          placeholder="Enter your neighborhood, city, or zip…"
          className="w-full rounded-2xl bg-white/[0.06] border border-card-border px-4 py-3 text-sm placeholder:text-muted/60 focus:outline-none focus:border-accent/50 transition-colors"
        />

        {/* Brief note shown just before the browser location dialog fires */}
        {showGeoNote && (
          <p className="text-xs text-muted/60 text-center animate-fadeUp opacity-0">
            Allow location to see what&apos;s nearest to you
          </p>
        )}

        {/* Proximity chip — non-interactive, shows GPS state */}
        <div className="flex items-center gap-1.5 text-xs text-muted border border-card-border rounded-full px-3 py-1.5">
          <svg
            className="w-3 h-3 text-accent shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span>{proximityLabel}</span>
        </div>

        <button
          onClick={submit}
          className="w-full rounded-2xl bg-accent hover:bg-accent-hover text-black font-display font-bold text-xl tracking-wide py-3.5 active:scale-[0.98] transition-transform mt-1"
        >
          Find My Night
        </button>

        <a href="/submit" className="text-xs text-muted/60 hover:text-muted transition-colors">
          Hosting an event? →
        </a>
      </div>
    </main>
  );
}
