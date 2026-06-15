import { Coords } from "@/lib/geo";

// Server-side forward geocode of a free-form address/place string via the
// Google Geocoding HTTP API. Used to backfill lat/lng for venues that don't
// have coordinates stored yet.
export async function geocodeAddress(address: string): Promise<Coords | null> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey || !address.trim()) return null;

  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
    );
    const data = await res.json();
    if (data.status !== "OK" || !Array.isArray(data.results) || !data.results.length) {
      return null;
    }
    const location = data.results[0]?.geometry?.location;
    if (typeof location?.lat !== "number" || typeof location?.lng !== "number") return null;
    return { lat: location.lat, lng: location.lng };
  } catch {
    return null;
  }
}
