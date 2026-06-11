"use client";

import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "@/lib/googleMaps";
import { Venue } from "@/lib/types";

interface VenueMapProps {
  city: string;
  venues: Venue[];
}

// Dark map theme to match the app's late-night aesthetic
const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#1a1a24" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a1a24" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8a8a9a" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2a2a38" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0d0d14" }] },
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
];

export default function VenueMap({ city, venues }: VenueMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    loadGoogleMaps()
      .then((g) => {
        if (cancelled || !mapRef.current) return;

        const geocoder = new g.maps.Geocoder();
        geocoder.geocode({ address: city }, (results, status) => {
          if (cancelled || !mapRef.current) return;

          const center =
            status === "OK" && results?.[0]
              ? {
                  lat: results[0].geometry.location.lat(),
                  lng: results[0].geometry.location.lng(),
                }
              : { lat: 0, lng: 0 };

          const map = new g.maps.Map(mapRef.current, {
            center,
            zoom: 12,
            disableDefaultUI: true,
            zoomControl: true,
            styles: MAP_STYLES,
          });

          const located = venues.filter(
            (v): v is Venue & { lat: number; lng: number } =>
              v.lat != null && v.lng != null
          );

          located.forEach((venue) => {
            const marker = new g.maps.Marker({
              position: { lat: venue.lat, lng: venue.lng },
              map,
              title: venue.name,
            });

            const info = new g.maps.InfoWindow({
              content: `<div style="color:#111;font-family:sans-serif;padding:2px 4px;"><strong>${venue.name}</strong><br/>${venue.neighborhood}</div>`,
            });

            marker.addListener("click", () => info.open(map, marker));
          });

          if (located.length === 0) {
            new g.maps.Marker({ position: center, map, title: city });
          }
        });
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load map");
      });

    return () => {
      cancelled = true;
    };
  }, [city, venues]);

  if (error) {
    return (
      <div className="glass-card w-full max-w-md px-5 py-6 text-center text-sm text-muted">
        {error}
      </div>
    );
  }

  return (
    <div
      ref={mapRef}
      className="w-full max-w-md rounded-2xl overflow-hidden border border-card-border"
      style={{ height: "320px" }}
    />
  );
}
