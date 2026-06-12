"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CityAutocompleteInput, { CitySelection } from "./CityAutocompleteInput";

interface CityFilterPickerProps {
  category: string;
}

export default function CityFilterPicker({ category }: CityFilterPickerProps) {
  const router = useRouter();
  const [value, setValue] = useState("");

  function goToCity(city: string) {
    const trimmed = city.trim();
    if (!trimmed) return;
    router.push(`/events/${encodeURIComponent(category)}?city=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        goToCity(value);
      }}
      className="flex gap-2 w-full max-w-md"
    >
      <CityAutocompleteInput
        value={value}
        onChange={setValue}
        onCitySelected={(selection: CitySelection) => goToCity(selection.city)}
        placeholder="Filter by city"
        className="glass-card flex-1 px-4 py-2 text-sm outline-none focus:border-accent/60 placeholder:text-muted"
      />
      <button
        type="submit"
        className="rounded-2xl glass-card px-4 py-2 text-sm shrink-0 hover:border-accent/50"
      >
        Go
      </button>
    </form>
  );
}
