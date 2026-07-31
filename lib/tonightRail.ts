// Shared shape for get_tonight_rail rows, whichever stage produced them —
// see app/api/rank/tonight/route.ts (DB mapping) and components/TonightCard.tsx
// (rendering). Event rows populate title/venueName/startTime; venue rows
// populate title (= venue name)/subtitle (= neighborhood) and leave
// venueName/startTime null. Both populate imageUrl/distanceMi/priceLevel/
// liveDensityScore.
export interface TonightRailItem {
  itemType: "event" | "venue";
  id: string;
  title: string;
  subtitle: string | null;
  venueName: string | null;
  startTime: string | null;
  imageUrl: string | null;
  distanceMi: number | null;
  priceLevel: number | null;
  liveDensityScore: number;
}

// Matches get_venue_live_density's own p_live_threshold default (3) — the
// same cutoff the RPC itself uses for its "live" confidence_tier, reused
// here so the frontend's "busy now" badge means the same thing the DB
// already calls "live" rather than an arbitrary new number.
export const BUSY_NOW_THRESHOLD = 3;
