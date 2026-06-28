"use client";

import { useState } from "react";
import { loadGoogleMaps, resolveCityFromGeocodeResults } from "@/lib/googleMaps";
import CityAutocompleteInput, { CitySelection } from "@/components/CityAutocompleteInput";

interface LocationStepProps {
  onSubmit: (city: string, coords?: { lat: number; lng: number }, precise?: boolean) => void;
}

const ZIP_CODE_REGEX = /^\d{5}$/;

export default function LocationStep({ onSubmit }: LocationStepProps) {
  const [city, setCity] = useState("");
  const [locating, setLocating] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState("");

  function handleCitySelected(selection: CitySelection) {
    setCity(selection.city);
    setError("");
    const coords =
      selection.lat !== undefined && selection.lng !== undefined
        ? { lat: selection.lat, lng: selection.lng }
        : undefined;
    // Coordinates here are the city center from Places, not the user's
    // precise location.
    onSubmit(selection.city, coords, false);
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = city.trim();
    if (!trimmed) {
      setError("Enter a city to continue");
      return;
    }

    if (ZIP_CODE_REGEX.test(trimmed)) {
      setResolving(true);
      setError("");
      try {
        const g = await loadGoogleMaps();
        const geocoder = new g.maps.Geocoder();
        geocoder.geocode({ address: trimmed }, (results, status) => {
          setResolving(false);
          const resolvedCity =
            status === "OK" && results
              ? resolveCityFromGeocodeResults(results)
              : "";
          if (resolvedCity) {
            const location = results?.[0]?.geometry?.location;
            const coords = location ? { lat: location.lat(), lng: location.lng() } : undefined;
            onSubmit(resolvedCity, coords, false);
          } else {
            setError("Couldn't find that zip code — try a city name instead");
          }
        });
      } catch {
        setResolving(false);
        setError("Couldn't find that zip code — try a city name instead");
      }
      return;
    }

    setResolving(true);
    try {
      const g = await loadGoogleMaps();
      const geocoder = new g.maps.Geocoder();
      geocoder.geocode({ address: trimmed }, (results, status) => {
        setResolving(false);
        const location = status === "OK" ? results?.[0]?.geometry?.location : undefined;
        const coords = location ? { lat: location.lat(), lng: location.lng() } : undefined;
        onSubmit(trimmed, coords, false);
      });
    } catch {
      setResolving(false);
      onSubmit(trimmed);
    }
  }

  function handleUseLocation() {
    if (!navigator.geolocation) {
      setError("No problem — just type your city below");
      return;
    }
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const g = await loadGoogleMaps();
          const geocoder = new g.maps.Geocoder();
          geocoder.geocode(
            { location: { lat: latitude, lng: longitude } },
            (results, status) => {
              setLocating(false);
              const resolvedCity =
                status === "OK" && results
                  ? resolveCityFromGeocodeResults(results)
                  : "";
              if (resolvedCity) {
                onSubmit(resolvedCity, { lat: latitude, lng: longitude }, true);
              } else {
                setError("No problem — just type your city below");
              }
            }
          );
        } catch {
          setLocating(false);
          setError("No problem — just type your city below");
        }
      },
      () => {
        setLocating(false);
        setError("No problem — just type your city below");
      },
      { timeout: 8000 }
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full max-w-md">
      <button
        onClick={handleUseLocation}
        disabled={locating}
        className="w-full rounded-2xl bg-accent hover:bg-accent-hover text-black font-display font-bold text-2xl tracking-wide py-4 transition-transform active:scale-95 disabled:opacity-60"
      >
        {locating ? "Locating..." : "Use My Location"}
      </button>

      <div className="flex items-center gap-3 text-muted text-sm">
        <div className="h-px flex-1 bg-card-border" />
        OR ENTER YOUR CITY
        <div className="h-px flex-1 bg-card-border" />
      </div>

      <form onSubmit={handleManualSubmit} className="flex flex-col gap-3">
        <CityAutocompleteInput
          value={city}
          onChange={(value) => {
            setCity(value);
            setError("");
          }}
          onCitySelected={handleCitySelected}
          placeholder="e.g. Cincinnati or 45231"
          className="glass-card w-full px-5 py-4 text-lg outline-none focus:border-accent/60 placeholder:text-muted"
        />
        {error && <p className="text-sm text-accent">{error}</p>}
        <button
          type="submit"
          disabled={resolving}
          className="w-full rounded-2xl glass-card font-display text-xl tracking-wide py-4 transition-transform active:scale-95 hover:border-accent/50 disabled:opacity-60"
        >
          {resolving ? "Looking up..." : "Continue"}
        </button>
      </form>
    </div>
  );
}
