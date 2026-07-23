// Single source of truth for temporary, hand-flipped feature flags.

/**
 * Re-enabled 2026-07-23 for new signups going forward (App Store prep phase
 * needs onboarding running again for new installs). Users who already have
 * ONBOARDED_KEY set in localStorage, or are already mid-session, are
 * unaffected — this only gates the very first visit. Existing users who
 * signed up during the SKIP_ONBOARDING=true window and never completed
 * onboarding are caught separately, via user_profiles.onboarding_completed_at,
 * the first time they open the Smart Picker (see app/picker/page.tsx).
 */
export const SKIP_ONBOARDING = false;
