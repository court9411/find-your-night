export const FALLBACK_COORDS = { lat: 39.1031, lng: -84.512 };
export const GEO_COORDS_KEY = "fyn:geoCoords";
export const GEO_AREA_KEY = "fyn:geoArea";
export const GEO_DENIED_KEY = "fyn:geoDenied";

export interface CachedCoords {
  lat: number;
  lng: number;
  /** True when these are a real cached location (geolocation grant or city
   * picker); false when nothing was cached and this is FALLBACK_COORDS. */
  precise: boolean;
}

/**
 * Reads the geolocation app/page.tsx cached in sessionStorage, falling back
 * to FALLBACK_COORDS (Cincinnati center) when nothing's cached yet — the
 * shared "never leaves a page with no coords to work with" degrade used by
 * both the map and Picks.
 */
export function readCachedCoords(): CachedCoords {
  try {
    const cached = sessionStorage.getItem(GEO_COORDS_KEY);
    if (cached) {
      const { lat, lng } = JSON.parse(cached);
      if (typeof lat === "number" && typeof lng === "number") return { lat, lng, precise: true };
    }
  } catch {}
  return { ...FALLBACK_COORDS, precise: false };
}
