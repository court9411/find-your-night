"use client";

import { useEffect, useRef } from "react";
import { loadGoogleMaps } from "@/lib/googleMaps";

export interface PlaceDetails {
  name: string;
  address: string;
  neighborhood: string;
  city: string;
  lat: number;
  lng: number;
}

interface PlaceAutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelected: (place: PlaceDetails) => void;
  placeholder?: string;
  className?: string;
  onFocus?: () => void;
  onBlur?: () => void;
}

function findComponent(
  components: google.maps.GeocoderAddressComponent[],
  ...types: string[]
): string {
  for (const type of types) {
    const match = components.find((c) => c.types.includes(type));
    if (match) return match.long_name;
  }
  return "";
}

export default function PlaceAutocompleteInput({
  value,
  onChange,
  onPlaceSelected,
  placeholder,
  className,
}: PlaceAutocompleteInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const onPlaceSelectedRef = useRef(onPlaceSelected);
  onPlaceSelectedRef.current = onPlaceSelected;

  useEffect(() => {
    let cancelled = false;
    let autocomplete: google.maps.places.Autocomplete | null = null;

    loadGoogleMaps()
      .then((g) => {
        if (cancelled || !inputRef.current) return;

        autocomplete = new g.maps.places.Autocomplete(inputRef.current, {
          fields: ["name", "formatted_address", "address_components", "geometry"],
          types: ["establishment"],
        });

        autocomplete.addListener("place_changed", () => {
          const place = autocomplete!.getPlace();
          if (!place.geometry?.location) return;

          const components = place.address_components ?? [];
          const neighborhood = findComponent(
            components,
            "neighborhood",
            "sublocality_level_1",
            "sublocality"
          );
          const city = findComponent(
            components,
            "locality",
            "postal_town",
            "administrative_area_level_2"
          );

          onPlaceSelectedRef.current({
            name: place.name ?? "",
            address: place.formatted_address ?? "",
            neighborhood,
            city,
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
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
