# Find Your Night — Project Brief

## What This App Does

A nightlife and experience discovery app for locals who don’t know what to do tonight.
The user picks a vibe (drinks, live music, dancing, rooftop, etc.) and the app uses AI
to surface real venues and experiences nearby that match. Clean, fast, built for mobile.

-----

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Database & Auth**: Supabase (user accounts, “who’s going” data)
- **AI**: Anthropic Claude API (claude-sonnet-4-20250514)
- **Deployment**: Vercel

-----

## Design System

**Aesthetic**: Late-night city energy. Dark, bold, cinematic.

**Colors**:

- Background: #09090F (near black)
- Primary accent: #FF6B35 (orange — like city lights)
- Text: #FFFFFF
- Muted text: rgba(255,255,255,0.4)
- Card background: rgba(255,255,255,0.04)
- Card border: rgba(255,255,255,0.08)

**Fonts** (Google Fonts):

- Display/headings: “Bebas Neue” — bold, uppercase, cinematic
- Body: “Outfit” — clean, modern, weights 300–700

**Background effect**: Subtle radial gradients suggesting city lights/bokeh

**Cards**: Rounded (16px), glass-effect, subtle border, animate in with fadeUp on load

-----

## Core User Flow

1. **Landing screen** — App name “FIND YOUR NIGHT”, tagline, location button
1. **Location** — Browser geolocation. If denied, show text input for manual city entry
1. **Vibe selector** — 8 cards the user taps to pick their mood:
- 🍸 Drinks & Bars
- 🎵 Live Music
- 🕺 Night Out (clubs, dancing)
- 🍕 Late Night Eats
- 🌃 Rooftop Vibes
- 🎮 Casual Fun (arcades, bowling)
- 🎭 Arts & Events
- 🎲 Surprise Me
1. **Loading screen** — animated, shows selected vibe emoji + “Scanning the city…”
1. **Results** — 5 venue cards showing: name, type, neighborhood, description, why tonight, price range, tags

-----

## AI Integration

Call the Anthropic API server-side (Next.js API route at `/api/search`).
NEVER expose the API key to the frontend.

**Prompt pattern**:

```
You are a local nightlife guide. Suggest 5 real venues in [city] 
for a [day] night matching this vibe: "[vibe]".
Return ONLY a JSON array with: name, type, neighborhood, 
description, whyTonight, price ($|$$|$$$), tags.
```

-----

## MVP Features (Build First)

- [x] Landing page with location detection + manual city fallback
- [x] Vibe selector (8 options)
- [x] AI-powered venue search via API route
- [x] Results page with venue cards
- [ ] Save a spot (bookmark/heart button)
- [ ] Share a spot (native share sheet)

-----

## Phase 2 Features (Build Next)

- **User accounts** via Supabase Auth (email or Google login)
- **“Who’s Going”** — users tap “I’m Going” on a venue, see how many others are going tonight
- **Saved spots** synced to user profile
- **Venue profiles** — dedicated page per venue with map, hours, vibe tags
- **Push notifications** — “It’s Friday, here’s tonight’s top pick near you”

-----

## Phase 3 Features (Future)

- **Host dashboard** — venues claim their profile, post open invite events, specials
- **Social layer** — follow friends, see where they’re going
- **Preference learning** — app learns your taste over time
- **Capacitor wrapper** — iOS & Android app store builds from same codebase

-----

## File Structure to Create

```
findyournight/
├── app/
│   ├── page.tsx              # Landing + vibe selector
│   ├── results/page.tsx      # Results page
│   ├── api/
│   │   └── search/route.ts   # Anthropic API call (server-side)
│   └── layout.tsx            # Global layout, fonts
├── components/
│   ├── LocationStep.tsx
│   ├── VibeSelector.tsx
│   ├── LoadingScreen.tsx
│   ├── VenueCard.tsx
│   └── ResultsGrid.tsx
├── lib/
│   └── types.ts              # TypeScript types
├── .env.local                # ANTHROPIC_API_KEY (never commit this)
└── CLAUDE.md                 # This file
```

-----

## Environment Variables Needed

```
ANTHROPIC_API_KEY=your_key_here
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
```

-----

## Important Notes

- Mobile-first design — most users will be on their phone
- Keep it fast — results should load in under 3 seconds
- The vibe is everything — copy, animations, and design should feel like a night out
- When in doubt, make it darker and bolder