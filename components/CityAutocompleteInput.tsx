"use client";

import { useEffect, useRef } from "react";
import { loadGoogleMaps, resolveCityFromGeocodeResults } from "@/lib/googleMaps";

export interface CitySelection {
  city: string;
  lat?: number;
  lng?: number;
}

interface CityAutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onCitySelected: (selection: CitySelection) => void;
  placeholder?: string;
  className?: string;
}

export default function CityAutocompleteInput({
  value,
  onChange,
  onCitySelected,
  placeholder,
  className,
}: CityAutocompleteInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const onCitySelectedRef = useRef(onCitySelected);
  onCitySelectedRef.current = onCitySelected;

  useEffect(() => {
    let cancelled = false;
    let autocomplete: google.maps.places.Autocomplete | null = null;

    loadGoogleMaps()
      .then((g) => {
        if (cancelled || !inputRef.current) return;

        autocomplete = new g.maps.places.Autocomplete(inputRef.current, {
          fields: ["address_components", "geometry", "name"],
          types: ["(cities)"],
        });

        autocomplete.addListener("place_changed", () => {
          const place = autocomplete!.getPlace();
          const components = place.address_components ?? [];
          const cityName =
            resolveCityFromGeocodeResults([
              { address_components: components } as google.maps.GeocoderResult,
            ]) || place.name || "";

          if (!cityName) return;

          onCitySelectedRef.current({
            city: cityName,
            lat: place.geometry?.location?.lat(),
            lng: place.geometry?.location?.lng(),
          });
        });
      })
      .catch((err) => {
        console.error("Failed to load Google Maps Places:", err);
      });

    return () => {
      cancelled = true;
      if (autocomplete) {
        google.maps.event.clearInstanceListeners(autocomplete);
      }
    };
  }, []);

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={className}
      autoComplete="off"
    />
  );
}
