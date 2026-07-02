"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadGoogleMaps, findAddressComponent } from "@/lib/googleMaps";
import CityAutocompleteInput, { CitySelection } from "@/components/CityAutocompleteInput";
import { track } from "@/lib/analytics";
import OnboardingFlow, { ONBOARDED_KEY } from "@/components/OnboardingFlow";

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
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    setOnboarded(localStorage.getItem(ONBOARDED_KEY) === "1");
  }, []);

  useEffect(() => {
    if (!onboarded) return;
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
        track("location_granted", { source: "geolocation" });

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
        track("location_denied");
      },
      { timeout: 8000 }
    );
  }, [onboarded]);

  function handleCitySelected(selection: CitySelection) {
    if (selection.lat === undefined || selection.lng === undefined) return;
    const c = { lat: selection.lat, lng: selection.lng };
    setCoords(c);
    setPrecise(true);
    setAreaName(selection.city);
    sessionStorage.setItem(GEO_COORDS_KEY, JSON.stringify(c));
    sessionStorage.setItem(GEO_AREA_KEY, selection.city);
    track("location_granted", { source: "city_picker", city: selection.city });
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

  // Avoid flashing either screen until we know whether onboarding is needed
  if (onboarded === null) {
    return <main className="min-h-screen" />;
  }

  if (!onboarded) {
    return <OnboardingFlow onDone={() => setOnboarded(true)} />;
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-5 py-8">
      <button
        onClick={() => router.push("/profile")}
        aria-label="Profile"
        className="w-9 h-9 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center shrink-0 absolute top-12 right-5"
      >
        <svg
          className="w-5 h-5 text-white/70"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          viewBox="0 0 24 24"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0z" />
          <path d="M4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
      </button>
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
