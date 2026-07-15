// Dim, static "open now" ambient layer — distinct from the brighter,
// score-weighted glow in liveDensityOverlay.ts. Same brand-green OverlayView
// approach (see that file for why this isn't google.maps.visualization),
// but flat radius/opacity since "open" is a boolean, not a scored signal.
const GLOW_COLOR_RGB = "34, 197, 94"; // brand accent #22C55E
const RADIUS_PX = 32;
const OPACITY = 0.18;

export interface OpenVenuePoint {
  lat: number;
  lng: number;
}

// Lazily defined so `google.maps.OverlayView` is only referenced once Maps
// JS has actually loaded — referencing it at module-eval time (before the
// script tag resolves) would throw.
function buildOverlayClass() {
  return class OpenVenueOverlay extends google.maps.OverlayView {
    private div: HTMLDivElement | null = null;
    private venues: OpenVenuePoint[] = [];

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

    setVenues(venues: OpenVenuePoint[]) {
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

        const glow = document.createElement("div");
        glow.style.position = "absolute";
        glow.style.left = `${point.x - RADIUS_PX}px`;
        glow.style.top = `${point.y - RADIUS_PX}px`;
        glow.style.width = `${RADIUS_PX * 2}px`;
        glow.style.height = `${RADIUS_PX * 2}px`;
        glow.style.borderRadius = "50%";
        glow.style.background = `radial-gradient(circle, rgba(${GLOW_COLOR_RGB}, ${OPACITY}) 0%, rgba(${GLOW_COLOR_RGB}, 0) 70%)`;
        div.appendChild(glow);
      }
    }
  };
}

export interface OpenVenueOverlayHandle {
  setVenues: (venues: OpenVenuePoint[]) => void;
  remove: () => void;
}

// Attaches the ambient glow overlay to `map` and returns a small handle so
// callers don't need to touch the underlying OverlayView instance directly.
export function createOpenVenueOverlay(map: google.maps.Map): OpenVenueOverlayHandle {
  const Overlay = buildOverlayClass();
  const overlay = new Overlay();
  overlay.setMap(map);
  return {
    setVenues: (venues) => overlay.setVenues(venues),
    remove: () => overlay.setMap(null),
  };
}
