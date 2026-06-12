let loadPromise: Promise<typeof google> | null = null;

export const ZIP_CODE_REGEX = /^\d{5}$/;

declare global {
  interface Window {
    google?: typeof google;
    __initGoogleMaps?: () => void;
  }
}

// Loads the Google Maps JS API (places + marker libraries) once and caches the promise.
export function loadGoogleMaps(): Promise<typeof google> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps can only be loaded in the browser"));
  }

  if (window.google?.maps) {
    return Promise.resolve(window.google);
  }

  if (loadPromise) return loadPromise;

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return Promise.reject(new Error("Google Maps API key is not configured"));
  }

  loadPromise = new Promise((resolve, reject) => {
    window.__initGoogleMaps = () => {
      if (window.google) resolve(window.google);
      else reject(new Error("Google Maps failed to initialize"));
    };

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,marker&loading=async&callback=__initGoogleMaps`;
    script.async = true;
    script.onerror = () => reject(new Error("Failed to load Google Maps script"));
    document.head.appendChild(script);
  });

  return loadPromise;
}

// Finds the first matching address component for the given types, in priority order.
export function findAddressComponent(
  components: google.maps.GeocoderAddressComponent[],
  ...types: string[]
): string {
  for (const type of types) {
    const match = components.find((c) => c.types.includes(type));
    if (match) return match.long_name;
  }
  return "";
}

// Resolves a real city name from a set of reverse-geocode results, avoiding
// county-level names (e.g. "Hamilton County") which aren't useful for venue searches.
export function resolveCityFromGeocodeResults(
  results: google.maps.GeocoderResult[]
): string {
  // Prefer an actual locality/postal town from any result, most specific first.
  for (const result of results) {
    const locality = findAddressComponent(
      result.address_components,
      "locality",
      "postal_town",
      "sublocality"
    );
    if (locality) return locality;
  }

  // Fall back to the county-level component, stripped of "County" so it
  // isn't passed to the venue search verbatim.
  for (const result of results) {
    const county = findAddressComponent(
      result.address_components,
      "administrative_area_level_2"
    );
    if (county) {
      return county.replace(/\s+County$/i, "").trim();
    }
  }

  return "";
}

// Server-side reverse geocode of a 5-digit zip code to a city name, via the
// Geocoding HTTP API. Used so direct/shared links with a zip in `?city=`
// resolve to a real city before filtering events.
export async function resolveCityFromZip(zip: string): Promise<string> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return "";

  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(zip)}&key=${apiKey}`
    );
    const data = await res.json();
    if (data.status !== "OK" || !Array.isArray(data.results)) return "";
    return resolveCityFromGeocodeResults(data.results as google.maps.GeocoderResult[]);
  } catch {
    return "";
  }
}
