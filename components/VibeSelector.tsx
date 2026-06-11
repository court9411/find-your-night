"use client";

import { Vibe } from "@/lib/types";
import { SEASONAL } from "@/lib/seasonal.config";

export const VIBES: Vibe[] = [
  { id: "drinks", label: "Drinks & Bars", emoji: "🍸", prompt: "drinks and bars" },
  { id: "live-music", label: "Live Music", emoji: "🎵", prompt: "live music venues" },
  { id: "night-out", label: "Night Out", emoji: "🕺", prompt: "clubs and dancing" },
  { id: "late-night-eats", label: "Late Night Eats", emoji: "🍕", prompt: "late night eats" },
  { id: "rooftop", label: "Rooftop Vibes", emoji: "🌃", prompt: "rooftop bars and lounges" },
  { id: "casual-fun", label: "Casual Fun", emoji: "🎮", prompt: "arcades, bowling, and casual fun activities" },
  { id: "arts-events", label: "Arts & Events", emoji: "🎭", prompt: "arts, theater, and live events" },
  { id: "surprise-me", label: "Surprise Me", emoji: "🎲", prompt: "a surprising mix of the best things to do" },
];

interface VibeSelectorProps {
  onSelect: (vibe: Vibe) => void;
}

export default function VibeSelector({ onSelect }: VibeSelectorProps) {
  const now = new Date();
  const month = now.getMonth() + 1;
  const showSeasonal = SEASONAL.months.includes(month);

  return (
    <div className="grid grid-cols-2 gap-3 w-full max-w-md">
      {VIBES.map((vibe, i) => (
        <button
          key={vibe.id}
          onClick={() => onSelect(vibe)}
          className="glass-card flex flex-col items-center justify-center gap-2 p-5 aspect-square animate-fadeUp opacity-0 transition-transform active:scale-95 hover:border-accent/50"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <span className="text-4xl">{vibe.emoji}</span>
          <span className="font-display text-xl tracking-wide text-center leading-tight">
            {vibe.label}
          </span>
        </button>
      ))}

      {showSeasonal && (
        <a
          href={SEASONAL.link}
          className="rounded-2xl p-5 aspect-square flex flex-col items-start justify-center gap-2 animate-fadeUp text-white"
          style={{ background: SEASONAL.gradient, animationDelay: `${VIBES.length * 60}ms` }}
        >
          <span className="text-2xl font-display">{SEASONAL.headline}</span>
          <span className="text-sm opacity-90">{SEASONAL.subtext}</span>
        </a>
      )}

      <a
        href="/submit"
        className="glass-card flex flex-row items-center justify-between p-5 aspect-square animate-fadeUp opacity-0 transition-transform hover:border-accent/50"
        style={{ animationDelay: `${(VIBES.length + (showSeasonal ? 1 : 0)) * 60}ms` }}
      >
        <div className="flex flex-col items-start">
          <span className="font-display text-lg">Hosting an event?</span>
          <span className="text-sm text-muted">Post it here</span>
        </div>
        <span className="text-2xl">→</span>
      </a>
    </div>
  );
}
