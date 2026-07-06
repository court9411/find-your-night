"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ACTIVITY_OPTIONS, BUDGET_OPTIONS } from "@/lib/preferenceOptions";
import {
  DrinksIcon,
  FoodDrinksIcon,
  LiveMusicIcon,
  FreshAirIcon,
  LateNightEatsIcon,
  RooftopIcon,
  CasualFunIcon,
  ArtsEventsIcon,
} from "@/components/VibeIcons";
import CityAutocompleteInput, { CitySelection } from "@/components/CityAutocompleteInput";
import { loadGoogleMaps, findAddressComponent } from "@/lib/googleMaps";
import { createClient } from "@/lib/supabase/client";
import { FALLBACK_COORDS, GEO_COORDS_KEY, GEO_AREA_KEY, GEO_DENIED_KEY } from "@/lib/geoStorage";
import { track } from "@/lib/analytics";
import { Venue } from "@/lib/types";
import { getRankedVenues } from "@/lib/scoring";
import { sortByProximity } from "@/lib/geo";
import { getAnonId } from "@/lib/anon";
import { pickTopVenues } from "@/lib/personalize";
import { RESULTS_KEY, RESULT_BACK_KEY } from "@/lib/storageKeys";

export const ONBOARDED_KEY = "fyn:onboarded";
export const ONBOARD_PREFS_KEY = "fyn:onboardPrefs";

type Step =
  | "hook"
  | "value"
  | "vibes"
  | "budget"
  | "learning"
  | "location"
  | "email"
  | "finding"
  | "picks";

const ACTIVITY_ICONS = [
  DrinksIcon,
  FoodDrinksIcon,
  LiveMusicIcon,
  FreshAirIcon,
  LateNightEatsIcon,
  RooftopIcon,
  CasualFunIcon,
  ArtsEventsIcon,
];

const BUDGET_DESCRIPTIONS: Record<number, string> = {
  1: "Free / cheap",
  2: "Casual",
  3: "Nice night out",
  4: "Splurge",
};

const VALUE_CARDS = [
  { emoji: "🍸", name: "Salazar Rooftop" },
  { emoji: "🎵", name: "MOTR Live Set" },
  { emoji: "🌆", name: "Rhinegeist Hour" },
];

const FINDING_MESSAGES = [
  "Checking tonight's DJs…",
  "Finding hidden gems…",
  "Scanning for rooftop energy…",
  "Locking in your night…",
];

function CityLightsBG() {
  const dots = [
    { top: "10%", left: "15%", size: 90, opacity: 0.15, delay: "0s" },
    { top: "60%", left: "75%", size: 130, opacity: 0.1, delay: "1.2s" },
    { top: "75%", left: "20%", size: 70, opacity: 0.06, delay: "0.6s", white: true },
    { top: "20%", left: "70%", size: 60, opacity: 0.08, delay: "1.8s", white: true },
  ];
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {dots.map((d, i) => (
        <div
          key={i}
          className="absolute rounded-full blur-2xl animate-driftFloat bg-accent"
          style={{
            top: d.top,
            left: d.left,
            width: d.size,
            height: d.size,
            opacity: d.opacity,
            animationDelay: d.delay,
            backgroundColor: d.white ? "#ffffff" : undefined,
          }}
        />
      ))}
    </div>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-full bg-accent hover:bg-accent-hover text-black font-display font-bold text-lg tracking-wide py-4 active:scale-[0.98] transition-transform disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function SecondaryLink({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full py-3 text-sm text-center text-muted hover:text-white transition-colors">
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

export default function OnboardingFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("hook");

  const [activityInterests, setActivityInterests] = useState<string[]>([]);
  const [priceLevels, setPriceLevels] = useState<number[]>([]);

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [areaName, setAreaName] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [showManualCity, setShowManualCity] = useState(false);
  const [cityQuery, setCityQuery] = useState("");

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [emailStep, setEmailStep] = useState<"email" | "code">("email");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState("");

  const [allVenues, setAllVenues] = useState<Venue[]>([]);
  const [pickedVenues, setPickedVenues] = useState<Venue[]>([]);

  useEffect(() => {
    track("onboarding_started");
  }, []);

  function toggleActivity(opt: string) {
    setActivityInterests((prev) => (prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt]));
  }

  function toggleBudget(value: number) {
    setPriceLevels((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  }

  function skipFrom(fromStep: Step) {
    track("onboarding_skipped", { step: fromStep });
    setStep("email");
  }

  function useMyLocation() {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setStep("email");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(c);
        setLocating(false);
        track("location_granted", { source: "geolocation" });

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
            }
          });
        } catch {}

        setStep("email");
      },
      () => {
        setLocating(false);
        sessionStorage.setItem(GEO_DENIED_KEY, "1");
        track("location_denied");
        setStep("email");
      },
      { timeout: 8000 }
    );
  }

  function handleManualCity(selection: CitySelection) {
    if (selection.lat !== undefined && selection.lng !== undefined) {
      setCoords({ lat: selection.lat, lng: selection.lng });
      setAreaName(selection.city);
      track("location_granted", { source: "city_picker", city: selection.city });
    }
    setStep("email");
  }

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    setEmailLoading(true);
    setEmailError("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { shouldCreateUser: true },
    });

    setEmailLoading(false);

    if (error) {
      setEmailError(error.message);
      return;
    }

    setEmailStep("code");
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim();
    if (trimmed.length !== 6) {
      setEmailError("Enter the 6-digit code from your email.");
      return;
    }

    setEmailLoading(true);
    setEmailError("");

    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: trimmed,
      type: "email",
    });

    setEmailLoading(false);

    if (error) {
      setEmailError("That code is wrong or has expired. Request a new one below.");
      return;
    }

    setStep("finding");
  }

  function resultsUrl() {
    const finalCoords = coords ?? FALLBACK_COORDS;
    const p = new URLSearchParams();
    p.set("lat", String(finalCoords.lat));
    p.set("lng", String(finalCoords.lng));
    if (coords) p.set("precise", "1");
    return `/results?${p.toString()}`;
  }

  function persistOnboarding() {
    localStorage.setItem(ONBOARDED_KEY, "1");
    if (activityInterests.length > 0 || priceLevels.length > 0) {
      localStorage.setItem(
        ONBOARD_PREFS_KEY,
        JSON.stringify({ activity_interests: activityInterests, price_levels: priceLevels })
      );
    }
    if (coords) {
      sessionStorage.setItem(GEO_COORDS_KEY, JSON.stringify(coords));
      if (areaName) sessionStorage.setItem(GEO_AREA_KEY, areaName);
    }
    track("onboarding_completed", {
      activity_interests: activityInterests,
      price_levels: priceLevels,
      precise_location: !!coords,
    });
  }

  function finalizeAndRoute() {
    persistOnboarding();
    router.push(resultsUrl());
  }

  // Tapping a pick card mid-onboarding counts as "arrived" — persist same as
  // finishing normally, then drop into the story view with the full ranked
  // list cached so back/next navigation there works exactly like /results.
  function viewVenueDetail(venue: Venue) {
    persistOnboarding();
    const index = Math.max(0, allVenues.indexOf(venue));
    sessionStorage.setItem(RESULTS_KEY, JSON.stringify(allVenues));
    sessionStorage.setItem(RESULT_BACK_KEY, resultsUrl());
    router.push(`/tonight/${index}`);
  }

  // ── Screen 1: Hook ──────────────────────────────────────────────────────────
  if (step === "hook") {
    return (
      <main className="relative flex flex-col justify-between min-h-screen px-6 pt-24 pb-10 overflow-hidden">
        <CityLightsBG />
        <SkipCorner onClick={() => skipFrom("hook")} />
        <div key="hook" className="relative animate-fadeUp opacity-0">
          <h1 className="font-display font-extrabold text-white text-[40px] leading-[1.05] tracking-tight">
            What&apos;s the move tonight?
          </h1>
          <p className="mt-4 text-[15px] text-muted">
            You already know there&apos;s something happening. We&apos;ll find it.
          </p>
        </div>
        <div className="relative">
          <PrimaryButton onClick={() => setStep("value")}>Find My Night</PrimaryButton>
        </div>
      </main>
    );
  }

  // ── Screen 2: How It Works ────────────────────────────────────────────────
  if (step === "value") {
    return <ValueScreen onNext={() => setStep("vibes")} onSkip={() => skipFrom("value")} />;
  }

  // ── Screen 3: Build Your Vibe ─────────────────────────────────────────────
  if (step === "vibes") {
    return (
      <main className="relative flex flex-col justify-between min-h-screen px-6 pt-24 pb-10">
        <SkipCorner onClick={() => skipFrom("vibes")} />
        <div key="vibes" className="animate-fadeUp opacity-0">
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
                  <span>{opt}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <PrimaryButton onClick={() => setStep("budget")}>Lock It In</PrimaryButton>
        </div>
      </main>
    );
  }

  // ── Screen 4: Budget ──────────────────────────────────────────────────────
  if (step === "budget") {
    return (
      <main className="relative flex flex-col justify-between min-h-screen px-6 pt-24 pb-10">
        <SkipCorner onClick={() => skipFrom("budget")} />
        <div key="budget" className="animate-fadeUp opacity-0">
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
          <PrimaryButton onClick={() => setStep("learning")}>Lock It In</PrimaryButton>
        </div>
      </main>
    );
  }

  // ── Screen 5: It's Learning ───────────────────────────────────────────────
  if (step === "learning") {
    return (
      <LearningScreen
        activityInterests={activityInterests}
        onNext={() => setStep("location")}
        onSkip={() => skipFrom("learning")}
      />
    );
  }

  // ── Screen 6: Location ────────────────────────────────────────────────────
  if (step === "location") {
    return (
      <main className="relative flex flex-col justify-between min-h-screen px-6 pt-24 pb-10">
        <SkipCorner onClick={() => skipFrom("location")} />
        <div key="location" className="animate-fadeUp opacity-0">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 bg-[#1A1A1A] border border-[#2E2E2E]">
            <svg className="w-[22px] h-[22px] text-accent" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
          <h2 className="font-display font-bold text-white text-[28px]">Let&apos;s see what&apos;s near you.</h2>
          <p className="mt-3 text-[15px] text-muted">
            Your location finds tonight&apos;s spots. That&apos;s it — never shared, never sold.
          </p>

          {showManualCity && (
            <div className="mt-6">
              <CityAutocompleteInput
                value={cityQuery}
                onChange={setCityQuery}
                onCitySelected={handleManualCity}
                placeholder="Enter your neighborhood, city, or zip…"
                className="w-full rounded-2xl bg-white/[0.06] border border-card-border px-4 py-3.5 text-sm placeholder:text-muted/60 focus:outline-none focus:border-accent/50 transition-colors"
              />
            </div>
          )}
        </div>

        <div>
          <PrimaryButton onClick={useMyLocation} disabled={locating}>
            {locating ? "Finding you…" : "Use My Location"}
          </PrimaryButton>
          {!showManualCity && (
            <SecondaryLink onClick={() => setShowManualCity(true)}>I&apos;ll pick a spot myself</SecondaryLink>
          )}
        </div>
      </main>
    );
  }

  // ── Screen 7: Email ───────────────────────────────────────────────────────
  if (step === "email") {
    return (
      <main className="relative flex flex-col justify-between min-h-screen px-6 pt-24 pb-10">
        <div key="email" className="animate-fadeUp opacity-0">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 bg-[#1A1A1A] border border-[#2E2E2E]">
            <svg className="w-[22px] h-[22px] text-accent" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 5h18v14H3z" />
              <path d="m3 6 9 7 9-7" />
            </svg>
          </div>

          {emailStep === "email" ? (
            <>
              <h2 className="font-display font-bold text-white text-[28px]">Keep your vibe.</h2>
              <p className="mt-3 text-[15px] text-muted">Save it once — no re-picking every time you open the app.</p>

              <form onSubmit={handleSendCode} className="mt-6 flex flex-col gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  autoComplete="email"
                  inputMode="email"
                  className="w-full rounded-xl bg-[#1A1A1A] border border-[#2E2E2E] px-4 py-4 text-sm text-white placeholder:text-muted/60 focus:outline-none focus:border-accent/50 transition-colors"
                />
                {emailError && <p className="text-red-300 text-xs">{emailError}</p>}
                <PrimaryButton type="submit" disabled={emailLoading || !email.trim()}>
                  {emailLoading ? "Sending…" : "Save My Spot"}
                </PrimaryButton>
              </form>
            </>
          ) : (
            <>
              <h2 className="font-display font-bold text-white text-[28px]">Check your email.</h2>
              <p className="mt-3 text-[15px] text-muted">
                Enter the 6-digit code we sent to <span className="text-white font-semibold">{email}</span>
              </p>

              <form onSubmit={handleVerifyCode} className="mt-6 flex flex-col gap-3">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  className="w-full rounded-xl bg-[#1A1A1A] border border-[#2E2E2E] px-4 py-4 text-center text-2xl font-display tracking-[0.5em] text-white placeholder:text-muted/30 focus:outline-none focus:border-accent/50 transition-colors"
                />
                {emailError && <p className="text-red-300 text-xs">{emailError}</p>}
                <PrimaryButton type="submit" disabled={emailLoading || code.length !== 6}>
                  {emailLoading ? "Verifying…" : "Verify & Save"}
                </PrimaryButton>
              </form>
            </>
          )}
        </div>

        <div>
          <SecondaryLink
            onClick={() => {
              track("onboarding_skipped", { step: "email" });
              setStep("finding");
            }}
          >
            Skip for now
          </SecondaryLink>
        </div>
      </main>
    );
  }

  // ── Screen 8: Finding Tonight (payoff) ────────────────────────────────────
  if (step === "finding") {
    return (
      <FindingScreen
        coords={coords ?? FALLBACK_COORDS}
        onPicks={(venues) => {
          setAllVenues(venues);
          setPickedVenues(pickTopVenues(venues, { activityInterests, priceLevels }));
          setStep("picks");
        }}
        onEmpty={finalizeAndRoute}
      />
    );
  }

  // ── Screen 9: Your Top Picks ──────────────────────────────────────────────
  return <PicksScreen venues={pickedVenues} onSelectVenue={viewVenueDetail} onContinue={finalizeAndRoute} />;
}

// ── Screen 2 subcomponent — staggers example cards in ──────────────────────
function ValueScreen({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const [visible, setVisible] = useState(0);
  useEffect(() => {
    if (visible >= VALUE_CARDS.length) return;
    const t = setTimeout(() => setVisible((v) => v + 1), 350);
    return () => clearTimeout(t);
  }, [visible]);

  return (
    <main className="relative flex flex-col justify-between min-h-screen px-6 pt-20 pb-10">
      <SkipCorner onClick={onSkip} />
      <div className="flex flex-col items-center gap-3 mt-4">
        {VALUE_CARDS.map((c, i) => (
          <div
            key={c.name}
            className="w-full rounded-2xl px-4 py-3 flex items-center gap-3 bg-[#1A1A1A] border border-[#2E2E2E] transition-all duration-500"
            style={{
              opacity: visible > i ? 1 : 0,
              transform: visible > i ? "translateY(0)" : "translateY(16px)",
            }}
          >
            <span className="text-2xl">{c.emoji}</span>
            <span className="text-white text-sm font-medium">{c.name}</span>
          </div>
        ))}
      </div>

      <div className="animate-fadeUp opacity-0">
        <h2 className="font-display font-bold text-white text-[26px] leading-tight">
          We already checked Instagram, the group chats, and Eventbrite so you don&apos;t have to.
        </h2>
        <p className="mt-3 text-[15px] text-muted">
          Real bars. Real DJs. Real events — updated every day, straight from Cincinnati.
        </p>
        <div className="mt-6">
          <PrimaryButton onClick={onNext}>Show Me →</PrimaryButton>
        </div>
      </div>
    </main>
  );
}

// ── Screen 5 subcomponent — the AI moment ───────────────────────────────────
function LearningScreen({
  activityInterests,
  onNext,
  onSkip,
}: {
  activityInterests: string[];
  onNext: () => void;
  onSkip: () => void;
}) {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 900);
    const t2 = setTimeout(() => setStage(2), 1900);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const iconIndexes = activityInterests
    .map((label) => ACTIVITY_OPTIONS.indexOf(label))
    .filter((i) => i >= 0)
    .slice(0, 4);

  return (
    <main className="relative flex flex-col justify-between min-h-screen px-6 pt-24 pb-10">
      <SkipCorner onClick={onSkip} />
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="relative flex items-center justify-center" style={{ height: 140 }}>
          {stage === 0 &&
            iconIndexes.map((idx, i) => {
              const Icon = ACTIVITY_ICONS[idx];
              return (
                <span
                  key={idx}
                  className="absolute animate-fadeUp opacity-0"
                  style={{ transform: `translate(${(i - 1.5) * 34}px, ${i % 2 === 0 ? -20 : 20}px)` }}
                >
                  <Icon className="w-7 h-7 text-accent" />
                </span>
              );
            })}
          <div
            className="rounded-full w-16 h-16 bg-accent transition-opacity duration-500"
            style={{
              opacity: stage >= 1 ? 1 : 0,
              animation: stage >= 1 ? "pulseRing 1.6s ease-out infinite" : "none",
            }}
          />
        </div>
      </div>

      {stage === 2 && (
        <div className="animate-fadeUp opacity-0">
          <h2 className="font-display font-bold text-white text-[26px] leading-tight">
            Your nights get smarter every time you open this.
          </h2>
          <p className="mt-3 text-[15px] text-muted">
            The more you use FindYourNight, the sharper your recommendations get. This is just the start.
          </p>
          <div className="mt-6">
            <PrimaryButton onClick={onNext}>Let&apos;s Go</PrimaryButton>
          </div>
        </div>
      )}
    </main>
  );
}

// ── Screen 8 subcomponent — progress + rotating status lines ────────────────
// Runs the perceived-progress animation and the real venue fetch side by
// side, and only advances once both are done — so it never flashes past the
// animation, but also never waits longer than the fetch actually takes.
function FindingScreen({
  coords,
  onPicks,
  onEmpty,
}: {
  coords: { lat: number; lng: number };
  onPicks: (venues: Venue[]) => void;
  onEmpty: () => void;
}) {
  const [progress, setProgress] = useState(0);
  const [msgIndex, setMsgIndex] = useState(0);
  const animDoneRef = useRef(false);
  const venuesRef = useRef<Venue[] | null>(null);
  const advancedRef = useRef(false);
  const onPicksRef = useRef(onPicks);
  const onEmptyRef = useRef(onEmpty);
  onPicksRef.current = onPicks;
  onEmptyRef.current = onEmpty;

  function maybeAdvance() {
    if (advancedRef.current) return;
    if (!animDoneRef.current || venuesRef.current === null) return;
    advancedRef.current = true;
    const venues = venuesRef.current;
    if (venues.length > 0) onPicksRef.current(venues);
    else onEmptyRef.current();
  }

  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(progressInterval);
          if (!animDoneRef.current) {
            animDoneRef.current = true;
            setTimeout(maybeAdvance, 300);
          }
          return 100;
        }
        return p + 4;
      });
    }, 90);
    const msgInterval = setInterval(() => {
      setMsgIndex((i) => (i + 1) % FINDING_MESSAGES.length);
    }, 850);
    return () => {
      clearInterval(progressInterval);
      clearInterval(msgInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      let venues: Venue[] = [];
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const ranked = await getRankedVenues({
          userId: user?.id ?? null,
          anonId: getAnonId(),
          lat: coords.lat,
          lng: coords.lng,
          limit: 20,
        });
        venues = sortByProximity(ranked, coords);
      } catch {
        venues = [];
      }
      if (!cancelled) {
        venuesRef.current = venues;
        maybeAdvance();
      }
    }
    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords.lat, coords.lng]);

  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-8">
      <div className="w-full max-w-[220px]">
        <div className="h-1 w-full rounded-full overflow-hidden bg-[#242424]">
          <div
            className="h-full rounded-full bg-accent"
            style={{ width: `${progress}%`, transition: "width 0.09s linear" }}
          />
        </div>
      </div>
      <p className="mt-6 text-sm text-muted">{FINDING_MESSAGES[msgIndex]}</p>
    </main>
  );
}

// ── Screen 9 subcomponent — the payoff: real top picks before the full feed ─
function PicksScreen({
  venues,
  onSelectVenue,
  onContinue,
}: {
  venues: Venue[];
  onSelectVenue: (venue: Venue) => void;
  onContinue: () => void;
}) {
  return (
    <main className="relative flex flex-col justify-between min-h-screen px-6 pt-20 pb-10">
      <div key="picks" className="animate-fadeUp opacity-0">
        <h2 className="font-display font-bold text-white text-[28px]">Your top picks tonight.</h2>
        <p className="mt-2 text-sm text-muted">Based on what you just picked.</p>

        <div className="mt-6 flex flex-col gap-3">
          {venues.map((venue, i) => (
            <button
              key={venue.id ?? venue.name}
              onClick={() => onSelectVenue(venue)}
              className="w-full text-left rounded-2xl px-4 py-3.5 bg-[#1A1A1A] border border-[#2E2E2E] animate-fadeUp opacity-0 active:scale-[0.98] transition-transform"
              style={{ animationDelay: `${i * 120}ms` }}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-display text-lg tracking-wide text-white leading-tight">{venue.name}</p>
                <span className="text-accent font-display font-bold text-sm shrink-0">{venue.price}</span>
              </div>
              <p className="text-xs text-muted mt-1">
                {venue.type}
                {venue.neighborhood ? ` · ${venue.neighborhood}` : ""}
              </p>
              {venue.liveTonight && (
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent" />
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-accent">Live Tonight</span>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      <div>
        <PrimaryButton onClick={onContinue}>See Tonight&apos;s Full Lineup →</PrimaryButton>
      </div>
    </main>
  );
}
