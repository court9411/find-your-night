let loadPromise: Promise<typeof google> | null = null;

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
