"use client";

import { Moon } from "lucide-react";

export const SEEN_INTRO_KEY = "fyn_seen_intro";

interface Props {
  onContinue: () => void;
}

/**
 * One-time framing screen shown before a first-time visitor ever sees Live
 * Map — SKIP_ONBOARDING means the full 9-screen OnboardingFlow never runs,
 * so without this a cold visitor landed on a map with zero context for what
 * the app even is. Deliberately not a rebuild of onboarding: one screen,
 * one sentence, gone in one tap.
 */
export default function WelcomeIntro({ onContinue }: Props) {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-6 py-12 gap-8 text-center">
      <div className="flex flex-col items-center gap-4">
        <Moon className="text-accent" size={40} fill="currentColor" stroke="none" aria-hidden />
        <h1 className="font-display font-extrabold text-4xl sm:text-5xl tracking-tight">
          Find Your <span className="text-accent">Night.</span>
        </h1>
        <p className="text-muted text-base max-w-xs">
          Real people checking in live — so you know what&apos;s actually happening tonight,
          not just what&apos;s open.
        </p>
      </div>

      <button
        onClick={onContinue}
        className="w-full max-w-xs rounded-2xl bg-accent hover:bg-accent-hover text-black font-display font-bold text-xl tracking-wide py-3.5 active:scale-[0.98] transition-transform"
      >
        See What&apos;s Happening
      </button>
    </main>
  );
}
