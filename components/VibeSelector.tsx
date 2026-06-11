"use client";

import { Vibe } from "@/lib/types";
import { SEASONAL } from "@/lib/seasonal.config";
import {
  DrinksIcon,
  LiveMusicIcon,
  NightOutIcon,
  LateNightEatsIcon,
  RooftopIcon,
  CasualFunIcon,
  ArtsEventsIcon,
  SurpriseMeIcon,
} from "./VibeIcons";

export const VIBES: Vibe[] = [
  {
    id: "drinks",
    label: "Drinks & Bars",
    emoji: "🍸",
    prompt: "drinks and bars",
    gradient: "linear-gradient(145deg, rgba(255,107,53,0.22), rgba(255,61,113,0.05) 70%)",
    glow: "rgba(255,107,53,0.25)",
  },
  {
    id: "live-music",
    label: "Live Music",
    emoji: "🎵",
    prompt: "live music venues",
    gradient: "linear-gradient(145deg, rgba(123,92,255,0.24), rgba(58,141,255,0.05) 70%)",
    glow: "rgba(123,92,255,0.25)",
  },
  {
    id: "night-out",
    label: "Night Out",
    emoji: "🕺",
    prompt: "clubs and dancing",
    gradient: "linear-gradient(145deg, rgba(255,61,196,0.22), rgba(123,92,255,0.05) 70%)",
    glow: "rgba(255,61,196,0.25)",
  },
  {
    id: "late-night-eats",
    label: "Late Night Eats",
    emoji: "🍕",
    prompt: "late night eats",
    gradient: "linear-gradient(145deg, rgba(255,176,32,0.22), rgba(255,61,61,0.05) 70%)",
    glow: "rgba(255,176,32,0.25)",
  },
  {
    id: "rooftop",
    label: "Rooftop Vibes",
    emoji: "🌃",
    prompt: "rooftop bars and lounges",
    gradient: "linear-gradient(145deg, rgba(58,141,255,0.22), rgba(60,255,176,0.05) 70%)",
    glow: "rgba(58,141,255,0.25)",
  },
  {
    id: "casual-fun",
    label: "Casual Fun",
    emoji: "🎮",
    prompt: "arcades, bowling, and casual fun activities",
    gradient: "linear-gradient(145deg, rgba(60,255,176,0.20), rgba(58,141,255,0.05) 70%)",
    glow: "rgba(60,255,176,0.22)",
  },
  {
    id: "arts-events",
    label: "Arts & Events",
    emoji: "🎭",
    prompt: "arts, theater, and live events",
    gradient: "linear-gradient(145deg, rgba(186,85,255,0.22), rgba(255,61,113,0.05) 70%)",
    glow: "rgba(186,85,255,0.25)",
  },
  {
    id: "surprise-me",
    label: "Surprise Me",
    emoji: "🎲",
    prompt: "a surprising mix of the best things to do",
    gradient:
      "linear-gradient(145deg, rgba(255,107,53,0.20), rgba(123,92,255,0.14), rgba(60,255,176,0.05) 80%)",
    glow: "rgba(255,107,53,0.22)",
  },
];

const ICONS = [
  DrinksIcon,
  LiveMusicIcon,
  NightOutIcon,
  LateNightEatsIcon,
  RooftopIcon,
  CasualFunIcon,
  ArtsEventsIcon,
  SurpriseMeIcon,
];

interface VibeSelectorProps {
  onSelect: (vibe: Vibe) => void;
}

export default function VibeSelector({ onSelect }: VibeSelectorProps) {
  const now = new Date();
  const month = now.getMonth() + 1;
  const showSeasonal = SEASONAL.months.includes(month);

  return (
    <div className="flex flex-col gap-3 w-full max-w-md">
      {showSeasonal && (
        <a
          href={SEASONAL.link}
          className="w-full rounded-2xl p-5 flex flex-col items-start justify-center gap-2 animate-fadeUp text-white"
          style={{ background: SEASONAL.gradient, minHeight: "140px" }}
        >
          <span className="text-2xl font-display">{SEASONAL.headline}</span>
          <span className="text-sm opacity-90">{SEASONAL.subtext}</span>
        </a>
      )}

      {(() => {
        const [featured, ...rest] = VIBES;
        const wildcard = rest[rest.length - 1];
        const gridItems = rest.slice(0, -1);
        const FeaturedIcon = ICONS[0];
        const WildcardIcon = ICONS[ICONS.length - 1];
        const baseOffset = showSeasonal ? 1 : 0;
        return (
          <>
            <button
              onClick={() => onSelect(featured)}
              className="group relative flex w-full flex-row items-center gap-4 overflow-hidden rounded-2xl border border-white/[0.08] p-6 animate-fadeUp opacity-0 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.98] active:brightness-90 active:duration-100 active:ease-out hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_10px_30px_-10px_var(--glow)]"
              style={{
                background: `${featured.gradient}, rgba(255,255,255,0.03)`,
                ["--glow" as string]: featured.glow,
                minHeight: "150px",
                animationDelay: `${baseOffset * 60}ms`,
              }}
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              />
              <span className="absolute right-4 top-4 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium tracking-wide text-white backdrop-blur-sm">
                Popular Tonight
              </span>
              <FeaturedIcon
                className="relative h-12 w-12 shrink-0 text-white transition-transform duration-300 ease-out group-hover:scale-110 group-hover:-translate-y-0.5 group-active:scale-95"
                style={{ filter: "drop-shadow(0 0 6px var(--glow))" }}
              />
              <span className="relative font-display text-2xl tracking-wide text-left leading-tight">
                {featured.label}
              </span>
            </button>

            <div className="grid grid-cols-2 gap-3 w-full">
              {gridItems.map((vibe, i) => {
                const Icon = ICONS[i + 1];
                return (
                  <button
                    key={vibe.id}
                    onClick={() => onSelect(vibe)}
                    className="group relative flex flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border border-white/[0.08] p-5 aspect-square animate-fadeUp opacity-0 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.96] active:brightness-90 active:duration-100 active:ease-out hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_10px_30px_-10px_var(--glow)]"
                    style={{
                      background: `${vibe.gradient}, rgba(255,255,255,0.03)`,
                      ["--glow" as string]: vibe.glow,
                      animationDelay: `${(i + 1 + baseOffset) * 60}ms`,
                    }}
                  >
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    />
                    <Icon
                      className="relative h-9 w-9 text-white transition-transform duration-300 ease-out group-hover:scale-110 group-hover:-translate-y-0.5 group-active:scale-95"
                      style={{ filter: "drop-shadow(0 0 6px var(--glow))" }}
                    />
                    <span className="relative font-display text-xl tracking-wide text-center leading-tight">
                      {vibe.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => onSelect(wildcard)}
              className="group relative flex w-full flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl border border-dashed border-white/25 p-6 animate-fadeUp opacity-0 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.98] active:brightness-90 active:duration-100 active:ease-out hover:-translate-y-1 hover:border-white/50 hover:shadow-[0_10px_30px_-10px_var(--glow)]"
              style={{
                background: `${wildcard.gradient}, rgba(255,255,255,0.03)`,
                ["--glow" as string]: wildcard.glow,
                minHeight: "140px",
                animationDelay: `${(gridItems.length + 1 + baseOffset) * 60}ms`,
              }}
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              />
              <span className="absolute left-4 top-4 rounded-full border border-white/40 bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white shadow-[0_0_12px_rgba(255,255,255,0.15)] backdrop-blur-sm">
                Wildcard
              </span>
              <WildcardIcon
                className="relative h-10 w-10 animate-scan transition-transform duration-300 ease-out group-hover:scale-110 group-hover:-rotate-12 group-active:scale-95"
                style={{ filter: "drop-shadow(0 0 8px var(--glow))" }}
              />
              <span className="relative font-display text-2xl tracking-wide">{wildcard.label}</span>
              <span className="relative text-sm text-white/70">Let the night decide</span>
            </button>
          </>
        );
      })()}

      <a
        href="/submit"
        className="group relative w-full flex flex-row items-center justify-between overflow-hidden rounded-2xl border border-accent/20 p-6 animate-fadeUp opacity-0 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.98] active:brightness-90 active:duration-100 active:ease-out hover:-translate-y-1 hover:border-accent/50 hover:shadow-[0_10px_30px_-10px_rgba(255,107,53,0.3)]"
        style={{
          background:
            "linear-gradient(145deg, rgba(255,107,53,0.14), rgba(255,107,53,0.02) 70%), rgba(255,255,255,0.03)",
          minHeight: "84px",
          animationDelay: `${(VIBES.length + (showSeasonal ? 1 : 0)) * 60}ms`,
        }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        />
        <div className="relative flex flex-col items-start gap-1">
          <span className="font-display text-xl">Hosting an event?</span>
          <span className="text-sm text-muted">Post it here</span>
        </div>
        <span className="relative text-2xl text-accent transition-transform duration-300 ease-out group-hover:translate-x-1">
          →
        </span>
      </a>
    </div>
  );
}
