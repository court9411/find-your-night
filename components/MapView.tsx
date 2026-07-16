"use client";

import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "@/lib/googleMaps";
import { DARK_MAP_STYLE } from "@/lib/mapStyle";
import { VenuePin, crowdLevelPinColor } from "@/lib/checkin";

interface Props {
  venues: VenuePin[];
  center: { lat: number; lng: number };
  focusCoords: { lat: number; lng: number } | null;
  onPinClick: (venue: VenuePin) => void;
  onLoadError: (message: string) => void;
}

export default function MapView({ venues, center, focusCoords, onPinClick, onLoadError }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const onPinClickRef = useRef(onPinClick);
  onPinClickRef.current = onPinClick;
  const [mapReady, setMapReady] = useState(false);

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

  // Render/refresh pins whenever the venue list changes. The pin dot color is
  // the map's single crowd signal: it comes straight from the most recent
  // check-in's crowd_level (no score threshold, no approval) so one check-in
  // recolors the pin. Ambient glow overlays were intentionally removed —
  // their green halo collided with the "filling up" green and muddied this
  // read while live density is still too thin to justify a second layer.
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
