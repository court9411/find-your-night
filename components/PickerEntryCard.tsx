"use client";

import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";

/**
 * Entry point into the Smart Night Picker (/picker) — the app's real
 * differentiator (an answer, not a browse surface), so this reads as the
 * dominant above-the-fold element, directly under search and ahead of
 * every rail. Deliberately heavier than DidYouGoCard's banner: bigger
 * icon, its own glow, a standalone CTA button rather than a tap-anywhere
 * list item.
 */
export default function PickerEntryCard() {
  const router = useRouter();

  return (
    <div
      className="mx-5 relative overflow-hidden rounded-3xl border border-accent-pink/30 p-6 flex flex-col items-center text-center gap-3"
      style={{
        background:
          "radial-gradient(ellipse 120% 100% at 50% -20%, rgba(255,61,187,0.18), transparent 60%), rgba(255,255,255,0.04)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="relative w-14 h-14 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center">
        <span className="absolute inset-0 rounded-full animate-pulseRing" aria-hidden />
        <Sparkles className="text-accent" size={26} aria-hidden />
      </div>

      <div>
        <p className="font-display font-extrabold text-xl tracking-wide leading-tight">
          Not sure what tonight is?
        </p>
        <p className="text-sm text-muted mt-1.5 max-w-[15rem] mx-auto">
          3 quick swipes. One solid answer — no scrolling required.
        </p>
      </div>

      <button
        onClick={() => router.push("/picker")}
        className="mt-1 w-full min-h-[48px] rounded-full bg-accent hover:bg-accent-hover text-black font-display font-bold text-base tracking-wide active:scale-[0.98] transition-transform"
      >
        Find My Night →
      </button>
    </div>
  );
}
