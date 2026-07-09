import posthog from "posthog-js";

type EventName =
  | "event_card_clicked"
  | "event_detail_viewed"
  | "ticket_link_clicked"
  | "event_liked"
  | "event_shared"
  | "submit_started"
  | "submit_completed"
  | "submit_abandoned"
  | "location_granted"
  | "location_denied"
  | "results_viewed"
  | "onboarding_started"
  | "onboarding_completed"
  | "onboarding_skipped"
  | "visit_prompt_shown"
  | "visit_prompt_declined"
  | "visit_survey_started"
  | "visit_survey_abandoned"
  | "visit_survey_completed";

export function track(event: EventName, properties?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  try {
    posthog.capture(event, properties);
  } catch {
    // never break the app for analytics
  }
}
