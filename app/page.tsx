"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { SVGProps } from "react";
import { VIBES } from "@/components/VibeSelector";
import { getActiveSeasonal } from "@/lib/seasonal.config";
import { loadGoogleMaps, findAddressComponent } from "@/lib/googleMaps";
import {
  DrinksIcon,
  FoodDrinksIcon,
  LiveMusicIcon,
  FreshAirIcon,
  LateNightEatsIcon,
  RooftopIcon,
  CasualFunIcon,
  ArtsEventsIcon,
  SurpriseMeIcon,
} from "@/components/VibeIcons";

type IconComp = (props: SVGProps<SVGSVGElement>) => JSX.Element;

const VIBE_ICON_MAP: Record<string, IconComp> = {
  drinks: DrinksIcon,
  "food-drinks": FoodDrinksIcon,
  "live-music": LiveMusicIcon,
  "fresh-air": FreshAirIcon,
  "late-night-eats": LateNightEatsIcon,
  rooftop: RooftopIcon,
  "casual-fun": CasualFunIcon,
  "arts-events": ArtsEventsIcon,
  "surprise-me": SurpriseMeIcon,
};

// Grid order per spec. Seasonal slot is injected at index 3.
const GRID_IDS = [
  "drinks",
  "food-drinks",
  "live-music",
  // seasonal slot at position 3
  "casual-fun",
  "fresh-air",
  "late-night-eats",
  "rooftop",
  "arts-events",
  "surprise-me",
];

const FALLBACK_COORDS = { lat: 39.1031, lng: -84.512 };
const GEO_COORDS_KEY = "fyn:geoCoords";
const GEO_AREA_KEY = "fyn:geoArea";
const GEO_DENIED_KEY = "fyn:geoDenied";

export default function JustAsk() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [coords, setCoords] = useState(FALLBACK_COORDS);
  const [areaName, setAreaName] = useState<string | null>(null);
  const [precise, setPrecise] = useState(false);
  const [showGeoNote, setShowGeoNote] = useState(false);

  const seasonal = getActiveSeasonal();

  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) return;
    if (sessionStorage.getItem(GEO_DENIED_KEY) === "1") return;

    // Reuse cached geolocation from this session
    const cached = sessionStorage.getItem(GEO_COORDS_KEY);
    if (cached) {
      try {
        setCoords(JSON.parse(cached));
        setPrecise(true);
        const area = sessionStorage.getItem(GEO_AREA_KEY);
        if (area) setAreaName(area);
        return;
      } catch {}
    }

    // Prompt for location — show a brief note before the browser dialog fires
    setShowGeoNote(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(c);
        setPrecise(true);
        setShowGeoNote(false);
        sessionStorage.setItem(GEO_COORDS_KEY, JSON.stringify(c));

        // Reverse geocode to get area name for the proximity chip
        try {
          const g = await loadGoogleMaps();
          const geocoder = new g.maps.Geocoder();
          geocoder.geocode({ location: c }, (results, status) => {
            if (status === "OK" && results?.[0]) {
              const area =
                findAddressComponent(
                  results[0].address_components,
                  "neighborhood",
                  "sublocality_level_1",
                  "sublocality",
                  "locality"
                ) || "Cincinnati";
              setAreaName(area);
              sessionStorage.setItem(GEO_AREA_KEY, area);
            }
          });
        } catch {}
      },
      () => {
        setShowGeoNote(false);
        sessionStorage.setItem(GEO_DENIED_KEY, "1");
      },
      { timeout: 8000 }
    );
  }, []);

  function buildParams(extra: Record<string, string>) {
    const p = new URLSearchParams(extra);
    p.set("lat", String(coords.lat));
    p.set("lng", String(coords.lng));
    if (precise) p.set("precise", "1");
    return p.toString();
  }

  function submit() {
    router.push(`/results?${buildParams({ q: query.trim() || "what's good tonight" })}`);
  }

  // Build 10-slot grid (9 vibes + seasonal slot at position 3)
  const slots: Array<{ kind: "vibe"; id: string } | { kind: "seasonal" }> = [];
  let vi = 0;
  const total = seasonal ? 10 : 9;
  for (let i = 0; i < total; i++) {
    if (i === 3 && seasonal) {
      slots.push({ kind: "seasonal" });
    } else {
      slots.push({ kind: "vibe", id: GRID_IDS[vi++] });
    }
  }

  const proximityLabel =
    precise && areaName ? `Near ${areaName}` : "Cincinnati · showing results near you";

  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-5 py-8">
      <div className="w-full max-w-sm flex flex-col items-center gap-4">
        <h1 className="font-display text-5xl sm:text-6xl tracking-wide text-center">
          Find Your <span className="text-accent">Night.</span>
        </h1>
        <p className="text-muted text-sm text-center -mt-1">What are you in the mood for?</p>

        {/* Free-text search input */}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Date night, live music, dive bar in Norwood…"
          className="w-full rounded-2xl bg-white/[0.06] border border-card-border px-4 py-3 text-sm placeholder:text-muted/60 focus:outline-none focus:border-accent/50 transition-colors"
        />

        {/* Brief note shown just before the browser location dialog fires */}
        {showGeoNote && (
          <p className="text-xs text-muted/60 text-center animate-fadeUp opacity-0">
            Allow location to see what&apos;s nearest to you
          </p>
        )}

        {/* Proximity chip — non-interactive, shows GPS state */}
        <div className="flex items-center gap-1.5 text-xs text-muted border border-card-border rounded-full px-3 py-1.5">
          <svg
            className="w-3 h-3 text-accent shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span>{proximityLabel}</span>
        </div>

        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted/50 -mb-1">
          or pick a vibe
        </p>

        {/* 2-column vibe chip grid — all 10 chips visible at 375px */}
        <div className="grid grid-cols-2 gap-2 w-full">
          {slots.map((slot) => {
            if (slot.kind === "seasonal" && seasonal) {
              return (
                <a
                  key="seasonal"
                  href={seasonal.link}
                  className="flex items-center gap-2 rounded-xl border border-accent/60 bg-accent/10 px-3 py-2.5 active:scale-95 transition-transform"
                >
                  <span className="text-sm leading-none">{seasonal.emoji}</span>
                  <span className="text-[11px] font-bold uppercase tracking-wide text-white leading-tight">
                    Seasonal
                  </span>
                </a>
              );
            }
            if (slot.kind === "vibe") {
              const vibe = VIBES.find((v) => v.id === slot.id);
              if (!vibe) return null;
              const Icon = VIBE_ICON_MAP[vibe.id];
              return (
                <button
                  key={vibe.id}
                  onClick={() =>
                    router.push(
                      `/results?${buildParams({
                        vibe: vibe.id,
                        label: vibe.label,
                        emoji: vibe.emoji,
                      })}`
                    )
                  }
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 active:scale-95 transition-transform text-left"
                >
                  {Icon && <Icon className="w-4 h-4 text-white/70 shrink-0" />}
                  <span className="text-[11px] font-bold uppercase tracking-wide leading-tight">
                    {vibe.label}
                  </span>
                </button>
              );
            }
            return null;
          })}
        </div>

        <button
          onClick={submit}
          className="w-full rounded-2xl bg-accent text-white font-display text-xl tracking-wide py-3.5 active:scale-[0.98] transition-transform mt-1"
        >
          Find My Night
        </button>

        <a href="/submit" className="text-xs text-muted/60 hover:text-muted transition-colors">
          Hosting an event? →
        </a>
      </div>
    </main>
  );
}
