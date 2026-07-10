// Single source of truth for temporary, hand-flipped feature flags.

/**
 * TEMPORARY — bypasses the forced onboarding redirect in app/page.tsx so new
 * signups land straight in the main app instead of the 9-screen flow.
 * Onboarding itself (routes, components, DB writes) is fully intact and
 * untouched; this only skips the auto-trigger.
 *
 * Flip back to false before App Store submission — onboarding needs to run
 * for new installs again at that point.
 */
export const SKIP_ONBOARDING = true;
