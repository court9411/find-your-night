"use client";

import { useState } from "react";
import { ACTIVITY_OPTIONS, ACTIVITY_OPTION_LABELS, BUDGET_OPTIONS, MUSIC_OPTIONS } from "@/lib/preferenceOptions";
import {
  DrinksIcon,
  LiveMusicIcon,
  ComedyIcon,
  FoodDrinksIcon,
  RooftopIcon,
  FreshAirIcon,
  ArtsEventsIcon,
  DancingIcon,
} from "@/components/VibeIcons";
import OnboardingProgress from "@/components/onboarding/OnboardingProgress";

// Order matches ACTIVITY_OPTIONS exactly: Drinks, Live Music, Comedy, Food,
// Rooftops, Outdoors, Arts, Dancing. Exported so OnboardingFlow's
// LearningScreen can look icons up by the same ACTIVITY_OPTIONS index.
export const ACTIVITY_ICONS = [
  DrinksIcon,
  LiveMusicIcon,
  ComedyIcon,
  FoodDrinksIcon,
  RooftopIcon,
  FreshAirIcon,
  ArtsEventsIcon,
  DancingIcon,
];

const BUDGET_DESCRIPTIONS: Record<number, string> = {
  1: "Free / cheap",
  2: "Casual",
  3: "Nice night out",
  4: "Splurge",
};

export interface StaticPreferenceAnswers {
  activityInterests: string[];
  musicPrefs: string[];
  priceLevels: number[];
}

interface Props {
  onComplete: (answers: StaticPreferenceAnswers) => void;
}

type Screen = "activity" | "music" | "price";
const TOTAL_SCREENS = 3;

function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-full bg-accent hover:bg-accent-hover text-black font-display font-bold text-lg tracking-wide py-4 active:scale-[0.98] transition-transform disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function SkipCorner({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="absolute top-6 right-5 text-xs text-muted/50 hover:text-muted transition-colors z-10"
    >
      Skip
    </button>
  );
}

// Shared, self-contained "static questions" onboarding: activity interests,
// music taste, price comfort zone. Mounted in two places — inside the full
// signup narrative (OnboardingFlow) and standalone as a one-time gate before
// the Smart Picker for existing users who never completed it — so it tracks
// its own local 3-screen progress regardless of where it's embedded.
export default function StaticPreferenceOnboarding({ onComplete }: Props) {
  const [screen, setScreen] = useState<Screen>("activity");
  const [activityInterests, setActivityInterests] = useState<string[]>([]);
  const [musicPrefs, setMusicPrefs] = useState<string[]>([]);
  const [priceLevels, setPriceLevels] = useState<number[]>([]);

  function toggleActivity(opt: string) {
    setActivityInterests((prev) => (prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt]));
  }

  function toggleMusic(opt: string) {
    setMusicPrefs((prev) => (prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt]));
  }

  function toggleBudget(value: number) {
    setPriceLevels((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  }

  // Skipping still counts as "asked once" — finalize immediately with
  // whatever was picked so far rather than looping back or blocking.
  function finish(overrides?: Partial<StaticPreferenceAnswers>) {
    onComplete({
      activityInterests,
      musicPrefs,
      priceLevels,
      ...overrides,
    });
  }

  if (screen === "activity") {
    return (
      <main className="relative flex flex-col justify-between min-h-dvh px-6 pt-24 pb-10">
        <SkipCorner onClick={() => finish()} />
        <div>
          <OnboardingProgress step={1} total={TOTAL_SCREENS} />
          <h2 className="font-display font-bold text-white text-[28px]">What&apos;s your vibe?</h2>
          <p className="mt-2 text-sm text-muted">Pick a few. We&apos;ll do the rest.</p>

          <div className="mt-6 flex flex-wrap gap-3">
            {ACTIVITY_OPTIONS.map((opt, i) => {
              const Icon = ACTIVITY_ICONS[i];
              const isOn = activityInterests.includes(opt);
              return (
                <button
                  key={opt}
                  onClick={() => toggleActivity(opt)}
                  className={`px-4 py-3 rounded-2xl flex items-center gap-2 text-sm font-semibold transition-all active:scale-95 ${
                    isOn ? "bg-accent text-black animate-cardPop shadow-[0_0_16px_rgba(34,197,94,0.35)]" : "bg-transparent text-white border border-[#2E2E2E]"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{ACTIVITY_OPTION_LABELS[opt] ?? opt}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <PrimaryButton onClick={() => setScreen("music")}>Lock It In</PrimaryButton>
        </div>
      </main>
    );
  }

  if (screen === "music") {
    return (
      <main className="relative flex flex-col justify-between min-h-dvh px-6 pt-24 pb-10">
        <SkipCorner onClick={() => finish()} />
        <div>
          <OnboardingProgress step={2} total={TOTAL_SCREENS} />
          <h2 className="font-display font-bold text-white text-[28px]">What&apos;s the soundtrack?</h2>
          <p className="mt-2 text-sm text-muted">Pick your genres. We&apos;ll match the room.</p>

          <div className="mt-6 flex flex-wrap gap-3">
            {MUSIC_OPTIONS.map((opt) => {
              const isOn = musicPrefs.includes(opt);
              return (
                <button
                  key={opt}
                  onClick={() => toggleMusic(opt)}
                  className={`px-4 py-3 rounded-2xl text-sm font-semibold transition-all active:scale-95 ${
                    isOn ? "bg-accent text-black animate-cardPop shadow-[0_0_16px_rgba(34,197,94,0.35)]" : "bg-transparent text-white border border-[#2E2E2E]"
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <PrimaryButton onClick={() => setScreen("price")}>Lock It In</PrimaryButton>
        </div>
      </main>
    );
  }

  // screen === "price"
  return (
    <main className="relative flex flex-col justify-between min-h-dvh px-6 pt-24 pb-10">
      <SkipCorner onClick={() => finish()} />
      <div>
        <OnboardingProgress step={3} total={TOTAL_SCREENS} />
        <h2 className="font-display font-bold text-white text-[28px]">What&apos;s tonight worth to you?</h2>
        <p className="mt-2 text-sm text-muted">So we don&apos;t send you somewhere that blows your night.</p>

        <div className="mt-6 flex flex-col gap-3">
          {BUDGET_OPTIONS.map((opt) => {
            const isOn = priceLevels.includes(opt.value);
            return (
              <button
                key={opt.value}
                onClick={() => toggleBudget(opt.value)}
                className={`w-full px-5 py-4 rounded-2xl flex items-center justify-between transition-all active:scale-[0.98] ${
                  isOn ? "bg-accent animate-cardPop shadow-[0_0_16px_rgba(34,197,94,0.35)]" : "bg-transparent border border-[#2E2E2E]"
                }`}
              >
                <span className={`font-display font-bold text-lg ${isOn ? "text-black" : "text-accent"}`}>
                  {opt.label}
                </span>
                <span className={`text-sm font-medium ${isOn ? "text-black" : "text-white"}`}>
                  {BUDGET_DESCRIPTIONS[opt.value]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <PrimaryButton onClick={() => finish()}>Lock It In</PrimaryButton>
      </div>
    </main>
  );
}
