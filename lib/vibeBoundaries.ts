// Extra inclusion/exclusion guidance injected into AI prompts for vibe
// categories whose definitions need to be explicit to avoid overlap with
// other categories. Keyed by the vibe's `label` (matches VIBE_CATEGORIES
// and the `label` sent to /api/search and /api/featured).
export const VIBE_BOUNDARIES: Record<string, string> = {
  "Casual Fun": `
CASUAL FUN BOUNDARIES:
- Surface social, activity-based experiences where the activity is the main draw: trivia nights and game shows, bowling, escape rooms, arcades/barcades, comedy and improv shows, mini golf, axe throwing, paint nights/pottery/creative social experiences, board game cafes, karaoke.
- Do NOT suggest bars, lounges, or clubs where drinking is the primary activity. Do NOT suggest outdoor/nature activities like parks, trails, or hiking — those belong to a different category.
- If a venue is technically a bar but has a strong activity component (e.g. bowling lanes, a dedicated trivia night), only include it if the activity is clearly the draw — and lead the description with the activity, not the drinks.`,

  "Fresh Air": `
FRESH AIR BOUNDARIES:
- Surface outdoor and active experiences in and around Cincinnati: parks and greenspaces (e.g. Eden Park, Devou Park, Mt. Airy Forest, Smale Riverfront Park, Sawyer Point), hiking/walking trails (Little Miami Trail, Ohio River Trail, Loveland Bike Trail), outdoor fitness and active events (outdoor yoga, boot camps, group runs), outdoor recreation (kayaking, cycling, disc golf), outdoor festivals or events held in parks/open-air spaces, and nature-focused day trips within reasonable distance of Cincinnati.
- Do NOT suggest bars or restaurants, even ones with a patio. Do NOT suggest rooftop bars (outdoor but not active/nature). Do NOT suggest any indoor venue or nightlife.
- Write descriptions like a recommendation from someone who actually goes outside — name specific trails or parks, which entrance to use, the best time of day, and what to bring. Avoid generic phrasing like "a great outdoor space."`,
};
