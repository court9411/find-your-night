---
name: fyn-venue-intel
description: Use this skill when researching new restaurants, bars, clubs, venues, or events — especially in Cincinnati. Trigger when Courtney asks what's new in the area, wants to find venues to add to the app, asks about the local nightlife scene, wants to track openings or closings, or wants structured data about a specific place. Also use for monitoring trends in nightlife, food & drink, or entertainment that could affect the app's content strategy. Casual questions like "what's new in Cincy?" or "any new spots?" should trigger this skill.
---

# Find Your Night — Venue & Event Intelligence Skill

## The Big Picture (read this first)
Find Your Night is an all-inclusive nightlife discovery app — the goal is that anyone can open it and find a night that's right for *them*. The launch strategy starts with Black Cincinnati because that's the community the founder knows deeply and has real relationships in. From there the app expands into other niches (different communities, vibes, interests), then new cities, and eventually builds personalized user profiles so the app understands each individual user and can point them somewhere genuinely good for them — not just a generic list.

**What this means for research right now**: Prioritize Black-owned venues, Black promoters, and spaces where the Black community in Cincinnati actually goes. Build that content base first. The infrastructure serves everyone — the launch content serves the launch community.

---

## Research Principles
1. **Recency matters** — a venue that opened 6 months ago is still "new" for app content
2. **Vibe over category** — "it's a bar" is less useful than "it's a low-key cocktail bar where the regulars know each other by name"
3. **Launch lens: Black Cincinnati** — for current research, prioritize Black-owned venues and spaces with strong Black community presence; flag this clearly in output
4. **All-inclusive by design** — every venue entry should be useful to any user, regardless of who surfaces it first; don't write descriptions that exclude
5. **Structured output** — every venue/event should end up in a format ready to review for app entry
6. **Source your claims** — don't describe a venue's vibe without citing where the info came from

---

## Cincinnati Research Sources

### New openings & business news
- **Cincinnati Business Courier** — covers new restaurant/bar openings
- **Cincinnati.com / Cincinnati Enquirer** — general news, neighborhood coverage
- **CityBeat Cincinnati** (citybeat.com) — alt-weekly, covers arts, music, nightlife
- **Eater Cincinnati** (cincinnati.eater.com) — restaurant/bar openings and closings

### Black Cincinnati-specific
- **The Cincinnati Herald** (cincinnaticherald.com) — Black newspaper running since 1955, covers community events and business
- **Black Cincinnati Facebook groups** — "Black Cincinnati", "Black Owned Cincinnati", "Cincinnati Black Business Network" — real-time word of mouth
- **Instagram**: `#BlackCincinnati`, `#BlackOwnedCincinnati`, `#CincyBlack`, `#BlackCincy`
- **Ohio Black Business Chamber** — directory of Black-owned businesses in Ohio
- **Local Black promoters' Instagram pages** — they announce events before anywhere else

### Liquor licenses = new bar alert (underused goldmine)
- **Ohio Liquor Control** (occc.ohio.gov) — new liquor license applications are public record and are the earliest possible signal that a new bar is opening. Search by county: Hamilton County = Cincinnati proper. Kenton/Campbell County = Covington/Newport KY.

### Real-time / social
- Google Maps: filter by "newly opened"
- Yelp: sort by "newest" in Cincinnati
- Instagram location tags: search by Cincinnati neighborhood
- Facebook Events: search Cincinnati, filter by date

### Event-specific
- **Do513** (do513.com) — Cincinnati's most comprehensive local events calendar
- **Eventbrite Cincinnati** — ticketed events
- Venue Instagram pages — stories and feed posts are the fastest event source
- Facebook Events — especially good for community and recurring events

---

## Cincinnati Neighborhoods to Watch

| Neighborhood | Vibe | Notes |
|---|---|---|
| Over-the-Rhine (OTR) | Cocktail bars, trendy, mixed | Highest density of new openings; heavily gentrified |
| Walnut Hills | Neighborhood bars, community feel, growing | Historically Black area, new energy coming in |
| Avondale | Community-rooted, local | Strong Black community presence |
| Bond Hill | Neighborhood, local spots | Long-established Black community |
| Northside | Eclectic, indie, dive bars | Very mixed, creative scene |
| Mt. Adams | Views, sports bars | Older nightlife scene |
| The Banks | Stadium-adjacent, newer | Chains + some local, event-driven crowd |
| Covington, KY | Growing fast, more affordable | New concepts opening regularly |
| Newport, KY | Dive bars, karaoke, eclectic | Strong regulars scene |
| Clifton / Ludlow Ave | College-adjacent | University of Cincinnati area, younger crowd |

*Note: Courtney knows this city better than this skill does — update neighborhood notes based on what you're actually seeing on the ground.*

---

## Venue Research Workflow

### Step 1: Initial Sweep
Search across sources above for the past 3–6 months. Look for:
- "Now open" or "coming soon" announcements
- New liquor license filings in Hamilton County
- Newly listed on Google Maps/Yelp
- Mentioned in CityBeat, Eater, Business Courier, or Cincinnati Herald

### Step 2: Evaluate Each Venue
For every venue found, answer:
1. What type of place is it? (bar, club, restaurant+bar, lounge, rooftop, venue, etc.)
2. What night do you go? (any night, weekends, specific event nights)
3. What's the actual vibe? Describe it specifically — not just the category
4. Black-owned? Black community presence? (Flag clearly — this is current launch priority)
5. Any notable recurring programming? (themed nights, live music, DJ nights, etc.)
6. Price point?
7. Neighborhood?
8. Active Instagram presence? (signals they're actually running events)
9. Who goes here? (be honest — age range, crowd type, energy)

### Step 3: Score FYN Fit
Rate 1–5 based on how useful this venue would be to a FYN user right now:
- **5**: Strong fit — great vibe, active programming, Black-owned or strong community presence, would send a friend here
- **4**: Good fit — solid venue, good vibe, inclusive, worth adding
- **3**: Worth adding — decent spot, may be more useful as the app grows into more niches
- **2**: Marginal — needs more info, not very active, or niche doesn't overlap yet
- **1**: Not a fit right now — wrong energy, not active, or wouldn't recommend it

---

## Output Format

Always output venue findings in this structure:

```
━━━━━━━━━━━━━━━━━━━━━━━━
VENUE: [Name]
━━━━━━━━━━━━━━━━━━━━━━━━
Type:            [bar / club / restaurant+bar / lounge / rooftop / venue / etc.]
Address:         [full address]
Neighborhood:    [neighborhood name]
City:            Cincinnati, OH

Vibe tags:       [3–5 specific tags — e.g. "Cocktail Bar, Late Night, Date Night, Regular Crowd"]
Price:           [$ / $$ / $$$]
Hours:           [if known]
Best night:      [if known — be specific: "Friday for the DJ set, not Saturday"]

Black-owned:     [Yes / No / Unknown]
Community fit:   [Strong Black community presence / Mixed / Unknown]
Age range:       [approximate — e.g. "25–40"]
Door policy:     [21+ / 18+ / All ages / if known]

Instagram:       @[handle if found]
Website:         [if found]

FYN Fit Score:   [1–5]
Notes:           [vibe description in 2–3 sentences — write it like a recommendation, not a listing]
Source:          [where you found this — link if possible]
━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Event Research Workflow

### Recurring events to prioritize right now
- DJ nights and dance parties with Black promoters
- Black-organized events and cultural nights
- Live music with local Black artists
- Themed nights with regular community attendance
- Pop-up events and one-time shows

### Output format for events
```
━━━━━━━━━━━━━━━━━━━━━━━━
EVENT: [Name]
━━━━━━━━━━━━━━━━━━━━━━━━
Venue:           [venue name + address]
Date/Time:       [date and time, or recurring schedule]
Type:            [one-time / recurring]
Recurring:       [every Thursday / first Friday / etc. — if applicable]

Vibe tags:       [Dance Party / Live Music / DJ Night / Cultural / etc.]
Ticket:          [free / $X cover / ticketed — link if available]
Age:             [21+ / 18+ / all ages]
Promoter:        [@handle if known — these are future partners]

Description:     [2–3 sentences — what actually happens here, what's the energy]
Source:          [link]
━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Weekly Monitoring Routine

Run this before content planning sessions or at least once a week:

1. **Google "Cincinnati new bar [current month year]"**
2. **Check Eater Cincinnati** for new openings
3. **Check Do513** for this week's events
4. **Check Cincinnati Herald** for community events and business news
5. **Search Instagram** `#BlackCincinnati` and `#CincyNightlife` for anything new
6. **Check Eventbrite Cincinnati** filtered by nightlife/music/entertainment
7. **Optional**: Ohio Liquor Control — new license filings in Hamilton County

Weekly digest output: flag each item with 🆕 New venue | 🏿 Black-owned | 🔁 Recurring event | ⭐ High priority for app

---

## Niche Expansion — What to Watch For Later
As the app grows beyond the launch community, start building research pipelines for:
- **LGBTQ+ venues and events** — this community overlaps significantly and is a natural next niche
- **Foodies / upscale dining** — different vibe, different user, same city
- **Live music / arts crowd** — venues like Woodward Theater, Ludlow Garage, etc.
- **Sports fans** — The Banks scene, watch party venues on game nights
- **Young professionals** — OTR bar crawl crowd

Each niche will eventually feed into the user profile system — so when someone tells the app what they're into, it already has the content to serve them. Right now just flag venues that would be strong fits for future niches even if they're not the current priority.

---

## Notes on Data Quality
- Don't describe a venue's vibe based only on their own Instagram — they always look great
- Cross-reference at least 2 sources before adding a venue
- Hours and addresses change — treat anything over 6 months old as unverified
- If a venue's community fit is unknown, flag it as unknown rather than assuming
- Promoters are your best real-time source — their announcement posts are faster than any publication
