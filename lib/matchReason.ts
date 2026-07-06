export interface MatchSignals {
  matchedTags?: string[] | null;
  budgetMatch?: boolean | null;
  distanceMi?: number | null;
}

const NEARBY_MILES = 5;

/**
 * Turns get_ranked_venues signals into a short "why this is in your rail"
 * line — a trust signal distinct from the venue's static why_tonight
 * blurb ("what is this place"). Returns null when there's no meaningful
 * signal, so callers can omit the line rather than show something generic.
 */
export function formatMatchReason({ matchedTags, budgetMatch, distanceMi }: MatchSignals): string | null {
  if (matchedTags && matchedTags.length > 0) {
    const [first, second] = matchedTags;
    return second ? `Matches your ${first} + ${second} picks` : `Matches your ${first} picks`;
  }

  if (budgetMatch && distanceMi != null && distanceMi < NEARBY_MILES) {
    return "Fits your budget, nearby";
  }

  return null;
}
