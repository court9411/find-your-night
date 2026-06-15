"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import LocationStep from "@/components/LocationStep";
import VibeSelector from "@/components/VibeSelector";
import { Vibe } from "@/lib/types";

type Step = "landing" | "location" | "vibe";

const CITY_STORAGE_KEY = "fyn:city";
const COORDS_STORAGE_KEY = "fyn:coords";
const PRECISE_STORAGE_KEY = "fyn:precise";

function getNightEnergy(hour: number): string {
  if (hour >= 17 && hour < 20) return "the city is waking up";
  if (hour >= 20 && hour < 22) return "the night is just getting started";
  if (hour >= 22 || hour < 2) return "things are heating up";
  if (hour >= 2 && hour < 5) return "last call energy";
  return "set your plans for tonight";
}

function HomeContent() {
  const [step, setStep] = useState<Step>("landing");
  const [city, setCity] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [precise, setPrecise] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("step") !== "vibe") return;

    const storedCity = localStorage.getItem(CITY_STORAGE_KEY);
    if (!storedCity) return;

    setCity(storedCity);

    const storedCoords = localStorage.getItem(COORDS_STORAGE_KEY);
    if (storedCoords) {
      try {
        setCoords(JSON.parse(storedCoords));
      } catch {
        setCoords(null);
      }
    }

    setPrecise(localStorage.getItem(PRECISE_STORAGE_KEY) === "1");

    setStep("vibe");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleCitySubmit(
    selectedCity: string,
    selectedCoords?: { lat: number; lng: number },
    selectedPrecise?: boolean
  ) {
    setCity(selectedCity);
    setCoords(selectedCoords ?? null);
    setPrecise(Boolean(selectedPrecise));

    localStorage.setItem(CITY_STORAGE_KEY, selectedCity);
    if (selectedCoords) {
      localStorage.setItem(COORDS_STORAGE_KEY, JSON.stringify(selectedCoords));
    } else {
      localStorage.removeItem(COORDS_STORAGE_KEY);
    }
    localStorage.setItem(PRECISE_STORAGE_KEY, selectedPrecise ? "1" : "0");

    setStep("vibe");
  }

  function handleVibeSelect(vibe: Vibe) {
    const params = new URLSearchParams({
      city,
      vibe: vibe.prompt,
      label: vibe.label,
      emoji: vibe.emoji,
    });
    if (coords) {
      params.set("lat", String(coords.lat));
      params.set("lng", String(coords.lng));
      if (precise) params.set("precise", "1");
    }
    router.push(`/results?${params.toString()}`);
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-6 py-12 gap-8">
      {step === "landing" && (
        <div className="flex flex-col items-center gap-6 text-center animate-fadeUp">
          <h1 className="font-display text-6xl sm:text-7xl tracking-wide">
            FIND YOUR <span className="text-accent">NIGHT</span>
          </h1>
          <p className="text-muted text-lg max-w-sm">
              Find the right night, every night.
          </p>
          <button
            onClick={() => setStep("location")}
            className="rounded-2xl bg-accent text-white font-display text-2xl tracking-wide px-10 py-4 transition-transform active:scale-95"
          >
            Get Started
          </button>
        </div>
      )}

      {step === "location" && (
        <div className="flex flex-col items-center gap-6 w-full animate-fadeUp">
          <h2 className="font-display text-4xl tracking-wide text-center">Where are you?</h2>
          <LocationStep onSubmit={handleCitySubmit} />
        </div>
      )}

      {step === "vibe" && (
        <div className="flex flex-col items-center gap-6 w-full animate-fadeUp">
          <h2 className="font-display text-4xl tracking-wide text-center">
            What&apos;s the vibe?
          </h2>
          <p className="text-muted text-sm -mt-4">{city}</p>
          <p className="flex items-center gap-2 text-sm text-muted -mt-4">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
            </span>
            {new Date().toLocaleDateString("en-US", { weekday: "long" })} night ·{" "}
            {getNightEnergy(new Date().getHours())}
          </p>
          <VibeSelector onSelect={handleVibeSelect} city={city} />
        </div>
      )}
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}
