"use client";

import { useState } from "react";

interface LocationStepProps {
  onSubmit: (city: string) => void;
}

export default function LocationStep({ onSubmit }: LocationStepProps) {
  const [city, setCity] = useState("");
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = city.trim();
    if (!trimmed) {
      setError("Enter a city to continue");
      return;
    }
    onSubmit(trimmed);
  }

  function handleUseLocation() {
    if (!navigator.geolocation) {
      setError("Location isn't available on this browser — type your city below");
      return;
    }
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
            { headers: { Accept: "application/json" } }
          );
          const data = await res.json();
          const resolvedCity =
            data?.address?.city ||
            data?.address?.town ||
            data?.address?.village ||
            data?.address?.county;
          if (resolvedCity) {
            onSubmit(resolvedCity);
          } else {
            setError("Couldn't determine your city — type it below");
          }
        } catch {
          setError("Couldn't determine your city — type it below");
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
        setError("Location access denied — type your city below");
      },
      { timeout: 8000 }
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full max-w-md">
      <button
        onClick={handleUseLocation}
        disabled={locating}
        className="w-full rounded-2xl bg-accent text-white font-display text-2xl tracking-wide py-4 transition-transform active:scale-95 disabled:opacity-60"
      >
        {locating ? "Locating..." : "Use My Location"}
      </button>

      <div className="flex items-center gap-3 text-muted text-sm">
        <div className="h-px flex-1 bg-card-border" />
        OR ENTER YOUR CITY
        <div className="h-px flex-1 bg-card-border" />
      </div>

      <form onSubmit={handleManualSubmit} className="flex flex-col gap-3">
        <input
          type="text"
          value={city}
          onChange={(e) => {
            setCity(e.target.value);
            setError("");
          }}
          placeholder="e.g. Cincinnati"
          className="glass-card w-full px-5 py-4 text-lg outline-none focus:border-accent/60 placeholder:text-muted"
        />
        {error && <p className="text-sm text-accent">{error}</p>}
        <button
          type="submit"
          className="w-full rounded-2xl glass-card font-display text-xl tracking-wide py-4 transition-transform active:scale-95 hover:border-accent/50"
        >
          Continue
        </button>
      </form>
    </div>
  );
}
