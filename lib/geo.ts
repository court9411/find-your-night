import { Venue } from "@/lib/types";
import { shuffle } from "@/lib/shuffle";

export interface Coords {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_MILES = 3958.8;
const NEAR_MILES = 3;
const MID_MILES = 5;

export function haversineMiles(a: Coords, b: Coords): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinDLng * sinDLng;
  return EARTH_RADIUS_MILES * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

// Sorts venues into three proximity buckets relative to the user
// (0-5mi, 5-15mi, 15+mi/unknown), shuffling within each bucket so the
// order still feels fresh. Falls back to a plain shuffle if the user's
// coordinates aren't known.
export function sortByProximity<T extends Venue>(venues: T[], userCoords: Coords | null): T[] {
  if (!userCoords) return shuffle(venues);

  const withDistance = venues.map((venue) => {
    const hasCoords = typeof venue.lat === "number" && typeof venue.lng === "number";
    return {
      venue,
      distanceMiles: hasCoords
        ? haversineMiles(userCoords, { lat: venue.lat as number, lng: venue.lng as number })
        : null,
    };
  });

  const near = withDistance.filter((v) => v.distanceMiles !== null && v.distanceMiles <= NEAR_MILES);
  const mid = withDistance.filter(
    (v) => v.distanceMiles !== null && v.distanceMiles > NEAR_MILES && v.distanceMiles <= MID_MILES
  );
  const far = withDistance.filter((v) => v.distanceMiles !== null && v.distanceMiles > MID_MILES);
  const unknown = withDistance.filter((v) => v.distanceMiles === null);

  return [...shuffle(near), ...shuffle(mid), ...shuffle(far), ...shuffle(unknown)].map(
    ({ venue, distanceMiles }) => ({
      ...venue,
      distanceMiles: distanceMiles ?? undefined,
    })
  );
}
