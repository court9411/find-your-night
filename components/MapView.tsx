"use client";

import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "@/lib/googleMaps";
import { DARK_MAP_STYLE } from "@/lib/mapStyle";
import { LiveDensityVenue, VenuePin, crowdLevelPinColor } from "@/lib/checkin";
import { createLiveDensityOverlay, LiveDensityOverlayHandle } from "@/lib/liveDensityOverlay";
import { createOpenVenueOverlay, OpenVenueOverlayHandle } from "@/lib/openVenueOverlay";
import { isVenueOpenNow } from "@/lib/venueHours";

const OPEN_STATUS_REFRESH_MS = 5 * 60 * 1000;

interface Props {
  venues: VenuePin[];
  liveVenues: LiveDensityVenue[];
  center: { lat: number; lng: number };
  focusCoords: { lat: number; lng: number } | null;
  onPinClick: (venue: VenuePin) => void;
  onLoadError: (message: string) => void;
}

export default function MapView({ venues, liveVenues, center, focusCoords, onPinClick, onLoadError }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const liveOverlayRef = useRef<LiveDensityOverlayHandle | null>(null);
  const openOverlayRef = useRef<OpenVenueOverlayHandle | null>(null);
  const onPinClickRef = useRef(onPinClick);
  onPinClickRef.current = onPinClick;
  const [mapReady, setMapReady] = useState(false);
  const [now, setNow] = useState(() => new Date());

  // Load the map once. center is only used as the initial viewport — later
  // recentering goes through focusCoords, so it's intentionally excluded
  // from this effect's deps.
  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then((g) => {
        if (cancelled || !containerRef.current) return;
        mapRef.current = new g.maps.Map(containerRef.current, {
          center,
          zoom: 13,
          styles: DARK_MAP_STYLE,
          disableDefaultUI: true,
          zoomControl: true,
          clickableIcons: false,
        });
        setMapReady(true);
      })
      .catch((err) => {
        console.error("Failed to load Google Maps:", err);
        onLoadError(
          "The map couldn't load. The Google Maps JavaScript API may not be enabled for this project's API key in Google Cloud Console."
        );
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Render/refresh pins whenever the venue list changes.
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    const seen = new Set<string>();

    for (const venue of venues) {
      seen.add(venue.id);
      const position = { lat: venue.lat, lng: venue.lng };
      const color = crowdLevelPinColor(venue.crowdLevel);
      const existing = markersRef.current.get(venue.id);

      if (existing) {
        existing.setIcon(pinIcon(color));
        continue;
      }

      const marker = new google.maps.Marker({
        map,
        position,
        title: venue.name,
        icon: pinIcon(color),
      });
      marker.addListener("click", () => onPinClickRef.current(venue));
      markersRef.current.set(venue.id, marker);
    }

    // Drop markers for venues no longer in the list.
    markersRef.current.forEach((marker, id) => {
      if (!seen.has(id)) {
        marker.setMap(null);
        markersRef.current.delete(id);
      }
    });
  }, [mapReady, venues]);

  // "Open now" changes over the course of the night as venues close —
  // recompute periodically rather than only when a fresh pins fetch happens.
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), OPEN_STATUS_REFRESH_MS);
    return () => clearInterval(interval);
  }, []);

  // Create the "open now" ambient overlay once the map exists, tear it down
  // on unmount. This is created (and thus DOM-inserted) before the
  // live-density overlay below so it paints underneath it — same pane, and
  // later-appended siblings render on top with no z-index needed.
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    openOverlayRef.current = createOpenVenueOverlay(mapRef.current);
    return () => {
      openOverlayRef.current?.remove();
      openOverlayRef.current = null;
    };
  }, [mapReady]);

  // Feed the ambient overlay every currently-open venue, regardless of
  // whether it's also live-tier — the two glows are meant to layer, not be
  // mutually exclusive. mapReady is in the deps for the same reason as the
  // live-density effect below: the ref only exists once it flips true.
  useEffect(() => {
    openOverlayRef.current?.setVenues(
      venues.filter((v) => isVenueOpenNow(v.regularHours, now) === true).map((v) => ({ lat: v.lat, lng: v.lng }))
    );
  }, [venues, now, mapReady]);

  // Create the live-density glow overlay once the map exists, tear it down
  // on unmount. Data is applied separately below so this doesn't recreate
  // the overlay on every 60s poll tick.
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    liveOverlayRef.current = createLiveDensityOverlay(mapRef.current);
    return () => {
      liveOverlayRef.current?.remove();
      liveOverlayRef.current = null;
    };
  }, [mapReady]);

  // Feed the overlay "live"-tier venues only; "none"-tier venues stay plain
  // grey markers via the pin effect above and never enter this layer. An
  // empty array here is the common case for now and simply renders no glow
  // — not an error state.
  useEffect(() => {
    liveOverlayRef.current?.setVenues(liveVenues.filter((v) => v.confidence_tier === "live"));
    // mapReady is in the deps (not just referenced) because the overlay ref
    // is only created once mapReady flips true — without it, live-density
    // data that arrives before the map finishes loading would never get
    // applied, since this effect wouldn't otherwise re-run once the ref exists.
  }, [liveVenues, mapReady]);

  // Pan/zoom on demand (GPS match, search selection, pin tap).
  useEffect(() => {
    if (!mapReady || !mapRef.current || !focusCoords) return;
    mapRef.current.panTo(focusCoords);
    if ((mapRef.current.getZoom() ?? 0) < 15) mapRef.current.setZoom(15);
  }, [mapReady, focusCoords]);

  return <div ref={containerRef} className="absolute inset-0" />;
}

function pinIcon(color: string): google.maps.Symbol {
  return {
    path: google.maps.SymbolPath.CIRCLE,
    scale: 8,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: "#0e0e14",
    strokeWeight: 2,
  };
}
