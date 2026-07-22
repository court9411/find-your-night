"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Venue } from "@/lib/types";
import { getRankedVenues } from "@/lib/scoring";
import { readCachedCoords } from "@/lib/geoStorage";
import { getAnonId } from "@/lib/anon";
import { createClient } from "@/lib/supabase/client";
import { pickPickerVenues, sortByCategoryPreference, NightOrDay, GroupSize, AgeRange } from "@/lib/pickerMatch";
import { logPickerSwipe } from "@/lib/pickerSwipe";
import { seedPickerAffinity } from "@/lib/pickerAffinity";
import { haversineMiles } from "@/lib/geo";
import PickerSwipeStack from "@/components/PickerSwipeStack";
import PickerMatchCard from "@/components/PickerMatchCard";

type Step = "night_or_day" | "group_age" | "loading" | "swipe" | "done" | "empty";

const NEARBY_MILES = 0.5;

const NIGHT_OR_DAY_OPTIONS: { value: NightOrDay; label: string; sub: string }[] = [
  { value: "night", label: "Night person", sub: "Bars, clubs, late-night energy" },
  { value: "day", label: "Daytime adventure", sub: "Outdoor, brunch, daylight hours" },
];

const GROUP_SIZE_OPTIONS: GroupSize[] = ["solo", "2", "3-5", "6+"];
const AGE_RANGE_OPTIONS: AgeRange[] = ["21-24", "25-29", "30-34", "35-44", "45+"];

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
  const [step, setStep] = useState<Step>("night_or_day");
  const [nightOrDay, setNightOrDay] = useState<NightOrDay | null>(null);
  const [groupSize, setGroupSize] = useState<GroupSize | null>(null);
  const [ageRange, setAgeRange] = useState<AgeRange | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [picks, setPicks] = useState<Venue[]>([]);
  const [sparse, setSparse] = useState(false);
  const [interested, setInterested] = useState<Venue[]>([]);
  const [winner, setWinner] = useState<Venue | null>(null);
  // Every venue id fetched so far (shown or queued) — passed as excludeIds
  // on refill so the queue never duplicates a venue within one session.
  // Ref, not state: doesn't need to trigger a render on its own.
  const seenIdsRef = useRef<Set<string>>(new Set());
  // Venue ids already sent to seed_tag_affinity_from_picker — the RPC adds
  // weight per call rather than replacing it, so re-sending an id already
  // seeded would double-count that venue's tags. Tracked separately from
  // seenIdsRef (that one's about avoiding duplicate *cards*, this one's
  // about avoiding duplicate *affinity weight*).
  const seededIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    async function loadUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!cancelled) setUserId(user?.id ?? null);
    }
    loadUser();
    return () => {
      cancelled = true;
    };
  }, []);

  async function findPicks() {
    if (!nightOrDay) return;
    setStep("loading");
    try {
      const coords = readCachedCoords();
      const anonId = getAnonId();
      const ranked = await getRankedVenues({ userId, anonId, lat: coords.lat, lng: coords.lng, limit: 20 });

      if (ranked.length === 0) {
        setStep("empty");
        return;
      }

      const { picks: nextPicks, sparse: nextSparse } = pickPickerVenues(ranked, { nightOrDay });
      nextPicks.forEach((v) => {
        if (v.id) seenIdsRef.current.add(v.id);
      });
      setPicks(nextPicks);
      setSparse(nextSparse);
      setStep("swipe");
    } catch (err) {
      console.error("Smart Night Picker: failed to load ranked venues:", err);
      setStep("empty");
    }
  }

  // Sends only the swipes not yet seeded this session (see seededIdsRef) so
  // get_ranked_venues's pref_match signal actually reflects what's been
  // swiped, instead of scoring everyone flat.
  async function seedAffinity() {
    const newlyLiked = interested
      .filter((v) => v.id && !seededIdsRef.current.has(v.id))
      .map((v) => v.id as string);
    if (newlyLiked.length === 0) return;
    newlyLiked.forEach((id) => seededIdsRef.current.add(id));
    await seedPickerAffinity({ userId, anonId: getAnonId(), likedVenueIds: newlyLiked });
  }

  // Fires while a few cards are still left in the stack, so a fresh batch
  // is ready before the user actually runs out. Silently no-ops if nothing
  // new comes back — the swipe stack just reaches onExhausted naturally
  // once the cursor catches up, same as if this were never called.
  async function fetchMoreVenues() {
    if (!nightOrDay) return;
    try {
      // Before asking for more, make sure this session's swipes-so-far have
      // actually landed in user_tag_affinity — otherwise the refill is just
      // as blind to preference as the very first fetch was.
      await seedAffinity();
      const coords = readCachedCoords();
      const anonId = getAnonId();
      const ranked = await getRankedVenues({
        userId,
        anonId,
        lat: coords.lat,
        lng: coords.lng,
        limit: 20,
        excludeIds: Array.from(seenIdsRef.current),
      });
      if (ranked.length === 0) return;

      const ordered = sortByCategoryPreference(ranked, nightOrDay);
      ordered.forEach((v) => {
        if (v.id) seenIdsRef.current.add(v.id);
      });
      setPicks((prev) => [...prev, ...ordered]);
    } catch (err) {
      console.error("Smart Night Picker: refill fetch failed:", err);
    }
  }

  function handleSwipe(venue: Venue, direction: "left" | "right") {
    if (direction === "right") {
      setInterested((prev) => [...prev, venue]);
      if (venue.id && nightOrDay && groupSize && ageRange) {
        logPickerSwipe({ userId, anonId: getAnonId(), venueId: venue.id, nightOrDay, groupSize, ageRange });
      }
    }
  }

  function handleExhausted() {
    // Fire-and-forget: the winner screen shouldn't wait on a network call
    // whose payoff is future sessions, not this one.
    seedAffinity();
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
          <PrimaryButton onClick={() => setStep("group_age")} disabled={!nightOrDay}>
            Next
          </PrimaryButton>
        </div>
      </main>
    );
  }

  if (step === "group_age") {
    return (
      <main className="relative flex flex-col justify-between min-h-dvh px-6 pt-24 pb-10">
        <CloseCorner onClick={() => router.push("/results")} />
        <div className="animate-fadeUp opacity-0">
          <h2 className="font-display font-bold text-white text-[28px]">Who&apos;s coming, and who are you?</h2>
          <p className="mt-2 text-sm text-muted">Helps us fine-tune future picks.</p>

          <p className="mt-6 text-xs font-semibold uppercase tracking-widest text-muted">Group size</p>
          <div className="mt-3 flex flex-wrap gap-3">
            {GROUP_SIZE_OPTIONS.map((opt) => {
              const isOn = groupSize === opt;
              return (
                <button
                  key={opt}
                  onClick={() => setGroupSize(opt)}
                  className={`px-4 py-3 rounded-2xl text-sm font-semibold transition-all active:scale-95 ${
                    isOn
                      ? "bg-accent text-black animate-cardPop shadow-[0_0_16px_rgba(34,197,94,0.35)]"
                      : "bg-transparent text-white border border-[#2E2E2E]"
                  }`}
                >
                  {opt === "solo" ? "Solo" : opt}
                </button>
              );
            })}
          </div>

          <p className="mt-6 text-xs font-semibold uppercase tracking-widest text-muted">Age range</p>
          <div className="mt-3 flex flex-wrap gap-3">
            {AGE_RANGE_OPTIONS.map((opt) => {
              const isOn = ageRange === opt;
              return (
                <button
                  key={opt}
                  onClick={() => setAgeRange(opt)}
                  className={`px-4 py-3 rounded-2xl text-sm font-semibold transition-all active:scale-95 ${
                    isOn
                      ? "bg-accent text-black animate-cardPop shadow-[0_0_16px_rgba(34,197,94,0.35)]"
                      : "bg-transparent text-white border border-[#2E2E2E]"
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <PrimaryButton onClick={findPicks} disabled={!groupSize || !ageRange}>
            Find My Picks
          </PrimaryButton>
        </div>
      </main>
    );
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
      <main className="flex flex-col min-h-dvh px-5 pt-12 pb-10">
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => router.push("/results")} className="flex items-center gap-1 text-muted text-sm active:opacity-70">
            <span aria-hidden>←</span>
            <span>Back</span>
          </button>
        </div>
        <h2 className="font-display font-bold text-2xl tracking-wide text-center mt-2">Swipe to decide</h2>
        {sparse && (
          <p className="text-xs text-muted text-center mt-1 max-w-xs mx-auto">
            Not many strong matches near you tonight — here&apos;s what we&apos;ve got.
          </p>
        )}
        <div className="flex-1 flex items-center justify-center mt-4">
          <PickerSwipeStack
            venues={picks}
            onSwipe={handleSwipe}
            onExhausted={handleExhausted}
            onLowOnCards={fetchMoreVenues}
          />
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
