"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import CityAutocompleteInput, { CitySelection } from "@/components/CityAutocompleteInput";
import type { UserProfile } from "@/lib/userProfile";
import ChipGroup from "@/components/ChipGroup";
import { VIBE_OPTIONS, MUSIC_OPTIONS, ACTIVITY_OPTIONS, BUDGET_OPTIONS } from "@/lib/preferenceOptions";
import { ONBOARD_PREFS_KEY } from "@/components/OnboardingFlow";
import { getAnonId } from "@/lib/anon";

// ── Saved event shape from /api/interactions ──────────────────────────────────

interface SavedEventRow {
  id: string;
  event_id: string;
  pending_events: {
    id: string;
    event_name: string;
    date: string;
    start_time: string | null;
    venue_name: string;
    neighborhood: string | null;
    image_url: string | null;
    price: string | null;
  } | null;
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Form state
  const [homeCity, setHomeCity] = useState("");
  const [cityQuery, setCityQuery] = useState("");
  const [vibePref, setVibePref] = useState<string[]>([]);
  const [musicPref, setMusicPref] = useState<string[]>([]);
  const [priceLevels, setPriceLevels] = useState<number[]>([]);
  const [activityInterests, setActivityInterests] = useState<string[]>([]);

  // Saved events
  const [savedEvents, setSavedEvents] = useState<SavedEventRow[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);

  // Save state
  const [saving, setSaving] = useState(false);
  const [saved, setSavedFlag] = useState(false);

  // Check auth + load profile + load saved events
  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (cancelled) return;
      setAuthChecked(true);

      if (!user) return;
      setUserId(user.id);
      setEmail(user.email ?? null);

      // Persist anon_id on the profile so pre-auth scoring signals (RPC
      // calls made before login) can be linked to this account server-side.
      // PostHog's own anon->user linking happens separately, in PostHogProvider.
      const anonId = typeof window !== "undefined" ? getAnonId() : null;

      // Load profile
      const profileRes = await fetch("/api/profile");
      if (!cancelled && profileRes.ok) {
        const { profile }: { profile: UserProfile | null } = await profileRes.json();
        if (profile) {
          setHomeCity(profile.home_city ?? "");
          setCityQuery(profile.home_city ?? "");
          setVibePref(profile.vibe_prefs ?? []);
          setMusicPref(profile.music_prefs ?? []);
          setPriceLevels(profile.price_levels ?? []);
          setActivityInterests(profile.activity_interests ?? []);

          // Merge anon-era data: link anon_id, and adopt onboarding-collected
          // interests only if the user hasn't set real ones yet — never
          // clobber an existing profile's preferences.
          const patchBody: { anon_id?: string; activity_interests?: string[] } = {};
          if (anonId && !profile.anon_id) {
            patchBody.anon_id = anonId;
          }
          if ((profile.activity_interests ?? []).length === 0) {
            try {
              const raw = localStorage.getItem(ONBOARD_PREFS_KEY);
              const onboardPrefs: { activity_interests?: string[] } | null = raw ? JSON.parse(raw) : null;
              if (onboardPrefs?.activity_interests && onboardPrefs.activity_interests.length > 0) {
                patchBody.activity_interests = onboardPrefs.activity_interests;
                setActivityInterests(onboardPrefs.activity_interests);
              }
            } catch {}
          }
          if (Object.keys(patchBody).length > 0) {
            fetch("/api/profile", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(patchBody),
            }).catch(() => {});
          }
        }
      }

      // Load saved events
      setSavedLoading(true);
      const intRes = await fetch("/api/interactions?type=saved&itemType=event");
      if (!cancelled && intRes.ok) {
        const { items } = await intRes.json();
        setSavedEvents(items ?? []);
      }
      setSavedLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, []);

  function handleCitySelected(selection: CitySelection) {
    setHomeCity(selection.city);
    setCityQuery(selection.city);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSavedFlag(false);

    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        home_city: homeCity || null,
        vibe_prefs: vibePref,
        music_prefs: musicPref,
        price_levels: priceLevels,
        activity_interests: activityInterests,
      }),
    });

    setSaving(false);
    setSavedFlag(true);
    setTimeout(() => setSavedFlag(false), 2500);
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  // ── Not authed ──────────────────────────────────────────────────────────────
  if (!authChecked) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen px-6">
        <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </main>
    );
  }

  if (!userId) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen px-6 py-12 gap-6 text-center">
        <span className="text-5xl">👤</span>
        <h1 className="font-display font-extrabold text-4xl tracking-tight">Your Profile</h1>
        <p className="text-muted text-sm max-w-xs">
          Save events, personalize your picks, and get recommendations that are actually for you.
        </p>
        <Link
          href="/login"
          className="w-full max-w-xs rounded-2xl bg-accent hover:bg-accent-hover text-black font-display font-bold text-xl tracking-wide py-3.5 text-center"
        >
          Sign In
        </Link>
        <Link href="/" className="text-xs text-muted/60 hover:text-muted transition-colors">
          ← Back to app
        </Link>
      </main>
    );
  }

  // ── Authed ──────────────────────────────────────────────────────────────────
  return (
    <main className="flex flex-col min-h-screen px-5 py-10 pb-16 gap-8 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-extrabold text-3xl tracking-tight">Your Profile</h1>
          {email && <p className="text-muted text-xs mt-0.5">{email}</p>}
        </div>
        <button
          onClick={handleSignOut}
          className="text-xs text-muted/60 hover:text-muted underline underline-offset-4 transition-colors"
        >
          Sign out
        </button>
      </div>

      {/* Preferences form */}
      <form onSubmit={handleSave} className="flex flex-col gap-6">
        {/* Home city */}
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted font-semibold uppercase tracking-wider">Home City</p>
          <CityAutocompleteInput
            value={cityQuery}
            onChange={setCityQuery}
            onCitySelected={handleCitySelected}
            placeholder="Cincinnati, OH"
            className="w-full rounded-2xl bg-white/[0.06] border border-card-border px-4 py-3 text-sm placeholder:text-muted/60 focus:outline-none focus:border-accent/50 transition-colors"
          />
        </div>

        <ChipGroup
          label="Vibe"
          options={VIBE_OPTIONS}
          selected={vibePref}
          onChange={setVibePref}
        />

        <ChipGroup
          label="Music"
          options={MUSIC_OPTIONS}
          selected={musicPref}
          onChange={setMusicPref}
        />

        {/* Budget */}
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted font-semibold uppercase tracking-wider">Budget</p>
          <div className="flex gap-2">
            {BUDGET_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() =>
                  setPriceLevels(
                    priceLevels.includes(opt.value)
                      ? priceLevels.filter((p) => p !== opt.value)
                      : [...priceLevels, opt.value]
                  )
                }
                className={`flex-1 rounded-2xl py-2.5 text-sm font-display font-bold tracking-wide transition-colors active:scale-95 ${
                  priceLevels.includes(opt.value)
                    ? "bg-accent text-black"
                    : "bg-white/[0.06] border border-card-border text-muted hover:text-white"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <ChipGroup
          label="Interests"
          options={ACTIVITY_OPTIONS}
          selected={activityInterests}
          onChange={setActivityInterests}
        />

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-2xl bg-accent hover:bg-accent-hover text-black font-display font-bold text-xl tracking-wide py-3.5 active:scale-[0.98] transition-transform disabled:opacity-50"
        >
          {saving ? "Saving…" : saved ? "Saved ✓" : "Save Preferences"}
        </button>
      </form>

      {/* Saved events */}
      <div className="flex flex-col gap-4">
        <h2 className="font-display font-bold text-xl tracking-tight">Saved Events</h2>

        {savedLoading && (
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 glass-card rounded-2xl animate-pulse" />
            ))}
          </div>
        )}

        {!savedLoading && savedEvents.length === 0 && (
          <p className="text-muted text-sm">
            No saved events yet. Tap the bookmark on any event to save it.
          </p>
        )}

        {!savedLoading && savedEvents.map((row) => {
          const ev = row.pending_events;
          if (!ev) return null;
          const dateLabel = new Date(`${ev.date}T00:00:00`).toLocaleDateString("en-US", {
            weekday: "short", month: "short", day: "numeric",
          });
          return (
            <Link
              key={row.id}
              href={`/event/${ev.id}`}
              className="glass-card p-4 flex items-center gap-3 active:scale-[0.98] transition-transform"
            >
              {ev.image_url && (
                <img
                  src={ev.image_url}
                  alt={ev.event_name}
                  className="w-14 h-14 rounded-xl object-contain bg-black/20 shrink-0"
                />
              )}
              <div className="flex flex-col gap-0.5 min-w-0">
                <p className="font-display font-bold text-base tracking-wide truncate">{ev.event_name}</p>
                <p className="text-xs text-muted truncate">
                  {ev.venue_name}{ev.neighborhood ? ` · ${ev.neighborhood}` : ""}
                </p>
                <p className="text-xs text-accent font-semibold">{dateLabel}</p>
              </div>
            </Link>
          );
        })}
      </div>

      <Link href="/" className="text-xs text-muted/60 hover:text-muted transition-colors text-center">
        ← Back to app
      </Link>
    </main>
  );
}
