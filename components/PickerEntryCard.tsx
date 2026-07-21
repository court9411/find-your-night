"use client";

import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";

/**
 * Always-visible entry point into the Smart Night Picker (/picker) — a
 * quiz + swipe flow for Explorers who don't want to browse rails at all.
 * Lighter-weight than DidYouGoCard's banner (this isn't conditional on any
 * state), but same glass-card family.
 */
export default function PickerEntryCard() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push("/picker")}
      className="mx-5 rounded-2xl glass-card p-4 flex items-center gap-3 text-left active:scale-[0.98] transition-transform"
    >
      <div className="w-10 h-10 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center shrink-0">
        <Sparkles className="text-accent" size={18} aria-hidden />
      </div>
      <div className="min-w-0">
        <p className="font-display font-bold text-sm tracking-wide">Not sure? Let us pick.</p>
        <p className="text-xs text-muted mt-0.5">3 quick swipes, one solid answer.</p>
      </div>
    </button>
  );
}
