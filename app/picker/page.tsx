"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Venue } from "@/lib/types";
import { getRankedVenues } from "@/lib/scoring";
import { readCachedCoords } from "@/lib/geoStorage";
import { getAnonId } from "@/lib/anon";
import { createClient } from "@/lib/supabase/client";
import { pickPickerVenues, NightOrDay, GroupSize, PICKER_MOOD_CONTEXT } from "@/lib/pickerMatch";
import { logPickerSwipe } from "@/lib/pickerSwipe";
import { seedPickerAffinity } from "@/lib/pickerAffinity";
import { haversineMiles } from "@/lib/geo";
import PickerSwipeStack from "@/components/PickerSwipeStack";
import PickerMatchCard from "@/components/PickerMatchCard";
import StaticPreferenceOnboarding, {
  StaticPreferenceAnswers,
} from "@/components/onboarding/StaticPreferenceOnboarding";

type Step = "checking" | "onboarding" | "night_or_day" | "group_size" | "loading" | "swipe" | "done" | "empty";

const NEARBY_MILES = 0.5;

const NIGHT_OR_DAY_OPTIONS: { value: NightOrDay; label: string; sub: string }[] = [
  { value: "night", label: "Night person", sub: "Bars, clubs, late-night energy" },
  { value: "day", label: "Daytime adventure", sub: "Outdoor, brunch, daylight hours" },
];

const GROUP_SIZE_OPTIONS: { value: GroupSize; label: string; sub: string }[] = [
  { value: "solo", label: "Solo", sub: "Just me tonight" },
  { value: "2", label: "2", sub: "Me and one other" },
  { value: "3-5", label: "3-5", sub: "Small group" },
  { value: "6+", label: "6+", sub: "Big crew" },
];

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

function CloseCorner({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="absolute top-6 right-5 text-xs text-muted/50 hover:text-muted transition-colors z-10">
      Close
    </button>
  );
}

export default function SmartNightPicker() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("checking");
  const [nightOrDay, setNightOrDay] = useState<NightOrDay | null>(null);
  const [groupSize, setGroupSize] = useState<GroupSize | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [picks, setPicks] = useState<Venue[]>([]);
  const [sparse, setSparse] = useState(false);
  const [interested, setInterested] = useState<Venue[]>([]);
  const [winner, setWinner] = useState<Venue | null>(null);

  // One-time gate: an existing user who never completed the static
  // onboarding questions (checked via onboarding_completed_at, not the
  // narrative flow's localStorage flag — this needs to work cross-device)
  // sees them here before falling into the Picker's own session questions.
  // Anonymous users have no profile row to gate on, so they skip straight
  // through, same as today.
  useEffect(() => {
    let cancelled = false;
    async function loadUserAndGate() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      setUserId(user?.id ?? null);

      if (!user) {
        setStep("night_or_day");
        return;
      }

      try {
        const res = await fetch("/api/profile", { cache: "no-store" });
        if (!res.ok) throw new Error(`/api/profile returned ${res.status}`);
        const { profile } = await res.json();
        if (cancelled) return;
        setStep(profile?.onboarding_completed_at ? "night_or_day" : "onboarding");
      } catch (err) {
        // Fail closed, not open — a transient fetch/auth hiccup here should
        // never silently let a never-onboarded user skip straight past the
        // gate. Worst case on error: an already-onboarded user sees the
        // questions again, which is far safer than the reverse.
        console.error("Picker onboarding gate check failed:", err);
        if (!cancelled) setStep("onboarding");
      }
    }
    loadUserAndGate();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleOnboardingComplete(answers: StaticPreferenceAnswers) {
    fetch("/api/onboarding/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        anonId: getAnonId(),
        activityInterests: answers.activityInterests,
        musicPrefs: answers.musicPrefs,
        priceLevels: answers.priceLevels,
      }),
    }).catch(() => {});
    setStep("night_or_day");
  }

  // Picker promises "3 quick swipes, one solid answer" (PickerEntryCard) —
  // pickPickerVenues already caps at exactly 3, and there's deliberately no
  // mid-session refill/backfill here anymore, so the stack never grows
  // past what that promise says.
  async function findPicks() {
    if (!nightOrDay) return;
    setStep("loading");
    try {
      const coords = readCachedCoords();
      const anonId = getAnonId();
      const { venueCategories, sessionVibes } = PICKER_MOOD_CONTEXT[nightOrDay];
      const rankArgs = { lat: coords.lat, lng: coords.lng, limit: 20, venueCategories, sessionVibes, groupSize };
      let ranked = await getRankedVenues({ userId, anonId, ...rankArgs });

      // rank_venues_for_user (the RPC this call hits) can legitimately run
      // dry for a signed-in account with enough history — e.g. everything
      // nearby already swiped through — while the same call with no
      // p_user_id still has a full pool. Retry once without personalization
      // rather than dead-ending someone who's simply used the app a lot;
      // same "degrade instead of go blank" convention as the Tonight rail's
      // live-density fallback.
      if (ranked.length === 0 && userId) {
        ranked = await getRankedVenues({ userId: null, anonId, ...rankArgs });
      }

      if (ranked.length === 0) {
        setStep("empty");
        return;
      }

      const { picks: nextPicks, sparse: nextSparse } = pickPickerVenues(ranked, { nightOrDay });
      setPicks(nextPicks);
      setSparse(nextSparse);
      setStep("swipe");
    } catch (err) {
      console.error("Smart Night Picker: failed to load ranked venues:", err);
      setStep("empty");
    }
  }

  function handleSwipe(venue: Venue, direction: "left" | "right") {
    if (direction === "right") {
      setInterested((prev) => [...prev, venue]);
    }
    // Both directions get logged now that picker_swipes.direction accepts
    // 'left' too — passes are cheap negative signal alongside the likes.
    if (venue.id && nightOrDay && groupSize) {
      logPickerSwipe({ userId, anonId: getAnonId(), venueId: venue.id, direction, nightOrDay, groupSize });
    }
  }

  function handleExhausted() {
    const likedIds = interested.filter((v) => v.id).map((v) => v.id as string);
    // Fire-and-forget: the winner screen shouldn't wait on a network call
    // whose payoff is future sessions, not this one.
    if (likedIds.length > 0) {
      seedPickerAffinity({ userId, anonId: getAnonId(), likedVenueIds: likedIds });
    }
    setWinner(interested[0] ?? picks[0] ?? null);
    setStep("done");
  }

  if (step === "night_or_day") {
    return (
      <main className="relative flex flex-col justify-between min-h-dvh px-6 pt-24 pb-10">
        <CloseCorner onClick={() => router.push("/results")} />
        <div className="animate-fadeUp opacity-0">
          <h2 className="font-display font-bold text-white text-[28px]">Night person, or daytime adventure?</h2>
          <p className="mt-2 text-sm text-muted">We&apos;ll shape your 3 picks around this.</p>

          <div className="mt-6 flex flex-col gap-3">
            {NIGHT_OR_DAY_OPTIONS.map((opt) => {
              const isOn = nightOrDay === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setNightOrDay(opt.value)}
                  className={`w-full px-5 py-4 rounded-2xl flex flex-col items-start text-left transition-all active:scale-[0.98] ${
                    isOn
                      ? "bg-accent animate-cardPop shadow-[0_0_16px_rgba(34,197,94,0.35)]"
                      : "bg-transparent border border-[#2E2E2E]"
                  }`}
                >
                  <span className={`font-display font-bold text-lg ${isOn ? "text-black" : "text-accent"}`}>{opt.label}</span>
                  <span className={`text-sm font-medium mt-0.5 ${isOn ? "text-black" : "text-white"}`}>{opt.sub}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <PrimaryButton onClick={() => setStep("group_size")} disabled={!nightOrDay}>
            Next
          </PrimaryButton>
        </div>
      </main>
    );
  }

  if (step === "group_size") {
    return (
      <main className="relative flex flex-col justify-between min-h-dvh px-6 pt-24 pb-10">
        <CloseCorner onClick={() => router.push("/results")} />
        <div className="animate-fadeUp opacity-0">
          <h2 className="font-display font-bold text-white text-[28px]">Who&apos;s coming tonight?</h2>
          <p className="mt-2 text-sm text-muted">Helps us fine-tune future picks.</p>

          <div className="mt-6 flex flex-col gap-3">
            {GROUP_SIZE_OPTIONS.map((opt) => {
              const isOn = groupSize === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setGroupSize(opt.value)}
                  className={`w-full px-5 py-4 rounded-2xl flex flex-col items-start text-left transition-all active:scale-[0.98] ${
                    isOn
                      ? "bg-accent animate-cardPop shadow-[0_0_16px_rgba(34,197,94,0.35)]"
                      : "bg-transparent border border-[#2E2E2E]"
                  }`}
                >
                  <span className={`font-display font-bold text-lg ${isOn ? "text-black" : "text-accent"}`}>{opt.label}</span>
                  <span className={`text-sm font-medium mt-0.5 ${isOn ? "text-black" : "text-white"}`}>{opt.sub}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <PrimaryButton onClick={findPicks} disabled={!groupSize}>
            Find My Picks
          </PrimaryButton>
        </div>
      </main>
    );
  }

  if (step === "checking") {
    return <main className="min-h-dvh" />;
  }

  if (step === "onboarding") {
    return <StaticPreferenceOnboarding onComplete={handleOnboardingComplete} />;
  }

  if (step === "loading") {
    return (
      <main className="flex flex-col items-center justify-center min-h-dvh px-6 gap-4 text-center">
        <span className="text-4xl animate-pulse" aria-hidden>
          🌙
        </span>
        <p className="font-display font-bold text-lg">Sizing up your night…</p>
      </main>
    );
  }

  if (step === "swipe") {
    return (
      <main className="flex flex-col h-dvh px-3 pt-4 pb-4">
        <div className="flex items-center justify-between px-2 mb-1 shrink-0">
          <button onClick={() => router.push("/results")} className="flex items-center gap-1 text-muted text-sm active:opacity-70">
            <span aria-hidden>←</span>
            <span>Back</span>
          </button>
          <h2 className="font-display font-bold text-base tracking-wide">Swipe to decide</h2>
          <span className="w-10" aria-hidden />
        </div>
        {sparse && (
          <p className="text-xs text-muted text-center mb-1 max-w-xs mx-auto shrink-0">
            Not many strong matches near you tonight — here&apos;s what we&apos;ve got.
          </p>
        )}
        <div className="flex-1 min-h-0">
          <PickerSwipeStack venues={picks} onSwipe={handleSwipe} onExhausted={handleExhausted} />
        </div>
      </main>
    );
  }

  if (step === "empty") {
    return (
      <main className="flex flex-col items-center justify-center min-h-dvh gap-4 px-5 text-center">
        <span className="text-5xl" aria-hidden>
          🌙
        </span>
        <p className="text-muted">No spots found nearby yet.</p>
        <button
          onClick={() => router.push("/results")}
          className="rounded-2xl bg-accent hover:bg-accent-hover text-black font-display font-bold text-xl tracking-wide px-8 py-3"
        >
          Back to Picks
        </button>
      </main>
    );
  }

  // step === "done"
  if (!winner) {
    return (
      <main className="flex flex-col items-center justify-center min-h-dvh gap-4 px-5 text-center">
        <p className="text-muted">Couldn&apos;t land on a pick this time.</p>
        <button onClick={() => router.push("/results")} className="text-accent text-sm underline underline-offset-4">
          ← Back to Picks
        </button>
      </main>
    );
  }

  const nearbyCount = picks.filter(
    (v) =>
      v !== winner &&
      typeof v.lat === "number" &&
      typeof v.lng === "number" &&
      typeof winner.lat === "number" &&
      typeof winner.lng === "number" &&
      haversineMiles({ lat: winner.lat, lng: winner.lng }, { lat: v.lat, lng: v.lng }) <= NEARBY_MILES
  ).length;

  return <PickerMatchCard venue={winner} nearbyCount={nearbyCount} onBack={() => router.push("/results")} />;
}
