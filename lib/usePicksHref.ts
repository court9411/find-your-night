"use client";

import { useEffect, useState } from "react";
import { GEO_COORDS_KEY } from "@/lib/geoStorage";

/**
 * Resolves the Picks tab's URL using the geo coords app/page.tsx already
 * cached in sessionStorage once the user granted location — /results
 * requires ?lat&lng, so a bare "/results" link would just bounce back to
 * the landing screen. Falls back to bare "/results" when nothing's cached
 * yet (which itself redirects to "/" — the correct degrade, not a loop).
 *
 * Shared by every "Home"/"Back to app" affordance in the app so they all
 * land on Picks consistently, plus the bottom nav's own Picks tab.
 */
export function usePicksHref(): string {
  const [href, setHref] = useState("/results");

  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(GEO_COORDS_KEY);
      if (cached) {
        const { lat, lng } = JSON.parse(cached);
        if (typeof lat === "number" && typeof lng === "number") {
          setHref(`/results?lat=${lat}&lng=${lng}&precise=1`);
        }
      }
    } catch {}
  }, []);

  return href;
}
