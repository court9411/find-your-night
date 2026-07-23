"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import CityAutocompleteInput, { CitySelection } from "@/components/CityAutocompleteInput";
import type { UserProfile } from "@/lib/userProfile";
import ChipGroup from "@/components/ChipGroup";
import { VIBE_OPTIONS, MUSIC_OPTIONS, ACTIVITY_OPTIONS, ACTIVITY_OPTION_LABELS, BUDGET_OPTIONS } from "@/lib/preferenceOptions";

export default function ProfileEditPage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Form state
  const [homeCity, setHomeCity] = useState("");
  const [cityQuery, setCityQuery] = useState("");
  const [vibePref, setVibePref] = useState<string[]>([]);
  const [musicPref, setMusicPref] = useState<string[]>([]);
  const [priceLevels, setPriceLevels] = useState<number[]>([]);
  const [activityInterests, setActivityInterests] = useState<string[]>([]);

  const [saving, setSaving] = useState(false);
  const [saved, setSavedFlag] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      setAuthChecked(true);
      if (!user) return;
      setUserId(user.id);

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
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
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
        <p className="text-muted text-sm max-w-xs">Sign in to edit your taste.</p>
        <Link
          href="/login"
          className="w-full max-w-xs rounded-2xl bg-accent hover:bg-accent-hover text-black font-display font-bold text-xl tracking-wide py-3.5 text-center"
        >
          Sign In
        </Link>
      </main>
    );
  }

  return (
    <main className="flex flex-col min-h-screen px-5 py-10 pb-16 gap-6 max-w-lg mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="font-display font-extrabold text-3xl tracking-tight">Edit Taste</h1>
        <Link href="/profile" className="text-sm text-muted underline underline-offset-4">
          ← Back
        </Link>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-6">
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

        <ChipGroup label="Vibe" options={VIBE_OPTIONS} selected={vibePref} onChange={setVibePref} />

        <ChipGroup label="Music" options={MUSIC_OPTIONS} selected={musicPref} onChange={setMusicPref} />

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
          labels={ACTIVITY_OPTION_LABELS}
        />

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-2xl bg-accent hover:bg-accent-hover text-black font-display font-bold text-xl tracking-wide py-3.5 active:scale-[0.98] transition-transform disabled:opacity-50"
        >
          {saving ? "Saving…" : saved ? "Saved ✓" : "Save Preferences"}
        </button>
      </form>
    </main>
  );
}
