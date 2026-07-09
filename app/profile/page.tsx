"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { UserProfile } from "@/lib/userProfile";
import { ONBOARD_PREFS_KEY } from "@/components/OnboardingFlow";
import { getAnonId } from "@/lib/anon";
import HostEventLink from "@/components/HostEventLink";
import TasteSummaryCard from "@/components/TasteSummaryCard";
import NightHistorySection from "@/components/NightHistorySection";
import SavedNightsSection from "@/components/SavedNightsSection";
import ScoutStatusCard from "@/components/ScoutStatusCard";

export default function ProfilePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

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

      const profileRes = await fetch("/api/profile");
      if (cancelled || !profileRes.ok) return;
      const { profile: loadedProfile }: { profile: UserProfile | null } = await profileRes.json();
      if (!loadedProfile) return;
      setProfile(loadedProfile);

      // Merge anon-era data: link anon_id, and adopt onboarding-collected
      // interests only if the user hasn't set real ones yet — never
      // clobber an existing profile's preferences.
      const patchBody: { anon_id?: string; activity_interests?: string[]; price_levels?: number[] } = {};
      if (anonId && !loadedProfile.anon_id) {
        patchBody.anon_id = anonId;
      }
      try {
        const raw = localStorage.getItem(ONBOARD_PREFS_KEY);
        const onboardPrefs: { activity_interests?: string[]; price_levels?: number[] } | null = raw
          ? JSON.parse(raw)
          : null;
        if (
          (loadedProfile.activity_interests ?? []).length === 0 &&
          onboardPrefs?.activity_interests &&
          onboardPrefs.activity_interests.length > 0
        ) {
          patchBody.activity_interests = onboardPrefs.activity_interests;
        }
        if (
          (loadedProfile.price_levels ?? []).length === 0 &&
          onboardPrefs?.price_levels &&
          onboardPrefs.price_levels.length > 0
        ) {
          patchBody.price_levels = onboardPrefs.price_levels;
        }
      } catch {}
      if (Object.keys(patchBody).length > 0) {
        fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patchBody),
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (!cancelled && data?.profile) setProfile(data.profile);
          })
          .catch(() => {});
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
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
        <HostEventLink />
      </main>
    );
  }

  return (
    <main className="flex flex-col min-h-screen px-5 py-10 pb-16 gap-5 max-w-lg mx-auto">
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

      {profile ? (
        <TasteSummaryCard
          vibePrefs={profile.vibe_prefs ?? []}
          musicPrefs={profile.music_prefs ?? []}
          priceLevels={profile.price_levels ?? []}
        />
      ) : (
        <div className="h-24 rounded-2xl bg-white/[0.04] animate-pulse" />
      )}

      <NightHistorySection />

      <SavedNightsSection />

      <ScoutStatusCard isFoundingScout={profile?.is_scout ?? false} />

      <div className="flex justify-center pt-2">
        <HostEventLink />
      </div>
    </main>
  );
}
