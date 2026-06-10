"use client";

import { Vibe } from "@/lib/types";

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
    </div>
  );
}
