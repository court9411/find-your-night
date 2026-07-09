"use client";

import { useCallback, useState } from "react";

export interface LocationCoords {
  lat: number;
  lng: number;
  accuracy: number | null;
}

/**
 * Wraps navigator.geolocation.getCurrentPosition behind a single hook, per
 * CLAUDE.md's native-wrap guardrails — this is the one file that swaps to
 * Capacitor's Geolocation plugin later, nothing else changes.
 */
export function useLocation() {
  const [coords, setCoords] = useState<LocationCoords | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = useCallback((): Promise<LocationCoords> => {
    return new Promise((resolve, reject) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        const message = "Location isn't available on this device.";
        setError(message);
        reject(new Error(message));
        return;
      }

      setLoading(true);
      setError(null);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const next: LocationCoords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy ?? null,
          };
          setCoords(next);
          setLoading(false);
          resolve(next);
        },
        (err) => {
          const message =
            err.code === err.PERMISSION_DENIED
              ? "Location access was denied. Enable it in your browser settings to check in."
              : "Couldn't get your location. Try again.";
          setError(message);
          setLoading(false);
          reject(new Error(message));
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }, []);

  return { coords, loading, error, request };
}
