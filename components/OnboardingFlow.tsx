"use client";

import { useEffect, useState } from "react";
import ChipGroup from "@/components/ChipGroup";
import { ACTIVITY_OPTIONS } from "@/lib/preferenceOptions";
import { track } from "@/lib/analytics";

export const ONBOARDED_KEY = "fyn:onboarded";
export const ONBOARD_PREFS_KEY = "fyn:onboardPrefs";

interface OnboardingFlowProps {
  onDone: () => void;
}

export default function OnboardingFlow({ onDone }: OnboardingFlowProps) {
  const [step, setStep] = useState<"welcome" | "vibes">("welcome");
  const [activityInterests, setActivityInterests] = useState<string[]>([]);

  useEffect(() => {
    track("onboarding_started");
  }, []);

  function finish(interests: string[]) {
    if (interests.length > 0) {
      localStorage.setItem(ONBOARD_PREFS_KEY, JSON.stringify({ activity_interests: interests }));
    }
    localStorage.setItem(ONBOARDED_KEY, "1");
    onDone();
  }

  function skip(fromStep: "welcome" | "vibes") {
    track("onboarding_skipped", { step: fromStep });
    localStorage.setItem(ONBOARDED_KEY, "1");
    onDone();
  }

  function handleDone() {
    track("onboarding_completed", { activity_interests: activityInterests });
    finish(activityInterests);
  }

  if (step === "welcome") {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen px-5 py-8">
        <div className="w-full max-w-sm flex flex-col items-center gap-4 animate-fadeUp opacity-0">
          <h1 className="font-display font-extrabold text-5xl sm:text-6xl tracking-tight text-center">
            Find Your <span className="text-accent">Night.</span>
          </h1>
          <p className="text-muted text-sm text-center -mt-1">
            Real Cincinnati spots, picked for tonight.
          </p>

          <button
            onClick={() => setStep("vibes")}
            className="w-full rounded-2xl bg-accent hover:bg-accent-hover text-black font-display font-bold text-xl tracking-wide py-3.5 active:scale-[0.98] transition-transform mt-1"
          >
            Let&apos;s Go
          </button>

          <button
            onClick={() => skip("welcome")}
            className="text-xs text-muted/60 hover:text-muted transition-colors"
          >
            Skip
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-5 py-8">
      <div className="w-full max-w-sm flex flex-col items-center gap-5 animate-fadeUp opacity-0">
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="font-display font-extrabold text-3xl tracking-tight">
            What are you usually into?
          </h1>
          <p className="text-muted text-sm">Pick a few — you can change this anytime.</p>
        </div>

        <div className="w-full">
          <ChipGroup
            label="Interests"
            options={ACTIVITY_OPTIONS}
            selected={activityInterests}
            onChange={setActivityInterests}
          />
        </div>

        <button
          onClick={handleDone}
          className="w-full rounded-2xl bg-accent hover:bg-accent-hover text-black font-display font-bold text-xl tracking-wide py-3.5 active:scale-[0.98] transition-transform mt-1"
        >
          Done
        </button>

        <button
          onClick={() => skip("vibes")}
          className="text-xs text-muted/60 hover:text-muted transition-colors"
        >
          Skip
        </button>
      </div>
    </main>
  );
}
