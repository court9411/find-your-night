import { LiveDensityVenue } from "@/lib/checkin";

// Google removed the Maps JS visualization library's HeatmapLayer as of
// v3.65 (May 2026) — it now throws at construction time. This is a
// hand-rolled replacement: one radial-gradient glow div per "live"-tier
// venue, positioned via OverlayView's own projection so it stays correct
// across pan/zoom, same as HeatmapLayer would have.
const GLOW_COLOR_RGB = "34, 197, 94"; // brand accent #22C55E

// live_score has no fixed ceiling (it's a decayed sum, see
// get_venue_live_density's half-life logic) and there's no real check-in
// volume yet to calibrate against — this is a starting guess for "fully
// saturated glow," tune once real Scout density exists.
const LIVE_SCORE_SATURATION = 15;

const MIN_RADIUS_PX = 24;
const MAX_RADIUS_PX = 64;
const MIN_OPACITY = 0.35;
const MAX_OPACITY = 0.6;

// Lazily defined so `google.maps.OverlayView` is only referenced once Maps
// JS has actually loaded — referencing it at module-eval time (before the
// script tag resolves) would throw.
function buildOverlayClass() {
  return class LiveDensityOverlay extends google.maps.OverlayView {
    private div: HTMLDivElement | null = null;
    private venues: LiveDensityVenue[] = [];

    onAdd() {
      const div = document.createElement("div");
      div.style.position = "absolute";
      div.style.inset = "0";
      div.style.pointerEvents = "none";
      this.div = div;
      this.getPanes()?.overlayLayer.appendChild(div);
    }

    onRemove() {
      this.div?.remove();
      this.div = null;
    }

    setVenues(venues: LiveDensityVenue[]) {
      this.venues = venues;
      this.draw();
    }

    draw() {
      const div = this.div;
      const projection = this.getProjection();
      if (!div || !projection) return;

      div.innerHTML = "";
      for (const venue of this.venues) {
        const point = projection.fromLatLngToDivPixel(new google.maps.LatLng(venue.lat, venue.lng));
        if (!point) continue;

        const intensity = Math.min(1, venue.live_score / LIVE_SCORE_SATURATION);
        const radius = MIN_RADIUS_PX + intensity * (MAX_RADIUS_PX - MIN_RADIUS_PX);
        const opacity = MIN_OPACITY + intensity * (MAX_OPACITY - MIN_OPACITY);

        const glow = document.createElement("div");
        glow.style.position = "absolute";
        glow.style.left = `${point.x - radius}px`;
        glow.style.top = `${point.y - radius}px`;
        glow.style.width = `${radius * 2}px`;
        glow.style.height = `${radius * 2}px`;
        glow.style.borderRadius = "50%";
        glow.style.background = `radial-gradient(circle, rgba(${GLOW_COLOR_RGB}, ${opacity}) 0%, rgba(${GLOW_COLOR_RGB}, 0) 70%)`;
        div.appendChild(glow);
      }
    }
  };
}

export interface LiveDensityOverlayHandle {
  setVenues: (venues: LiveDensityVenue[]) => void;
  remove: () => void;
}

// Attaches the glow overlay to `map` and returns a small handle so callers
// don't need to touch the underlying OverlayView instance directly.
export function createLiveDensityOverlay(map: google.maps.Map): LiveDensityOverlayHandle {
  const Overlay = buildOverlayClass();
  const overlay = new Overlay();
  overlay.setMap(map);
  return {
    setVenues: (venues) => overlay.setVenues(venues),
    remove: () => overlay.setMap(null),
  };
}
