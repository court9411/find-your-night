// Single source of truth for temporary, hand-flipped feature flags.

/**
 * Re-disabled 2026-07-28 — the narrative flow (hook/value/preferences/
 * learning) was confusing new signups, so it's being skipped again for now
 * pending a redesign. Was briefly re-enabled 2026-07-23 for App Store prep
 * (new installs need *some* onboarding); that need hasn't gone away, so
 * revisit before submission. Users who already have ONBOARDED_KEY set in
 * localStorage, or are already mid-session, are unaffected either way —
 * this only gates the very first visit. Existing users who never completed
 * onboarding are still caught separately, via
 * user_profiles.onboarding_completed_at, the first time they open the Smart
 * Picker (see app/picker/page.tsx) — untouched by this flag.
 */
export const SKIP_ONBOARDING = true;
