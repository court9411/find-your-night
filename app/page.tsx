"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import LocationStep from "@/components/LocationStep";
import VibeSelector from "@/components/VibeSelector";
import { Vibe } from "@/lib/types";

type Step = "landing" | "location" | "vibe";

export default function Home() {
  const [step, setStep] = useState<Step>("landing");
  const [city, setCity] = useState("");
  const router = useRouter();

  function handleCitySubmit(selectedCity: string) {
    setCity(selectedCity);
    setStep("vibe");
  }

  function handleVibeSelect(vibe: Vibe) {
    const params = new URLSearchParams({
      city,
      vibe: vibe.prompt,
      label: vibe.label,
      emoji: vibe.emoji,
    });
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
              Stay Connected In Real Life.
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
          <VibeSelector onSelect={handleVibeSelect} />
        </div>
      )}
    </main>
  );
}
