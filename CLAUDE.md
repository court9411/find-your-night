# Find Your Night — Claude Project Context

This is the root context file for the Find Your Night project. When working in this project, always apply this context.

## The App
Find Your Night (find-your-night.vercel.app) is an AI-powered nightlife discovery app for Cincinnati — and eventually everywhere. All-inclusive by design: anyone should be able to open it and find a night that's right for them.

**Launch strategy**: Start with Black Cincinnati. That's the community the founder knows, has relationships in, and can get real content from. Nail it there, then expand into other niches (LGBTQ+, foodies, live music crowd, etc.), then new cities. Eventually user profiles let the app understand each individual and give genuinely personalized recommendations — not a generic list, but "here's your night specifically."

**The long-term vision**: FYN becomes a concierge, not a directory — an app that knows you well enough to recommend without asking. The venue/promoter dashboard is the eventual flywheel unlock: venues use FYN check-in as part of event entry, which drives forced downloads and real usage, not just organic discovery. That's the plan for the first ~500 users per city, then repeat the playbook in a new city.

**The core data flywheel** (the actual answer to "how do we build a smart recommendation engine" — product design, not AI):
Recommend a place → user saves it → app asks if they actually went → 20-second structured rating → database gets smarter → better recommendations → repeat. Every profile/data feature exists to feed this loop.

Built by Courtney (solo founder).

## App Structure (target — mid-build)
Bottom nav, 3 tabs, each with a distinct job:
- **🏠 Picks** — curated/ranked rail system (existing: Popular Picks, Date Night, Budget-Friendly, The Lineup). "Tell me what to do." Gets smarter over time as Night History data accumulates — no rebuild needed, same rails, better ranking underneath.
- **🗺️ Live Map** — new. Purely geographic + real-time. Scout check-ins live here. Map pins colored by live crowd_level (v1: simple colored pins, not a true heatmap layer — true density heatmap comes later once check-in volume across many venues can actually support it). This is where "what's popping right now" lives, and where the check-in entry point lives (tap a pin → check in).
- **👤 Profile** — reflective side only: Taste (Spotify-style compact display), Night History (confirmed visits + ratings), Saved Nights, Scout tier/status. Not the action side — actions (checking in) happen on the map, not here.

Floating **+ button** (bottom-right, thumb-reachable, accent-filled) opens `/submit` — the promoter submission flow. Not a 4th tab; submission is a much less frequent action than the three core loops.

## Stack
- **Framework**: Next.js (App Router)
- **Database**: Supabase
- **AI**: Anthropic API (Claude)
- **Deployment**: Vercel
- **Maps**: Google Maps Places API (Live Map tab will need the Maps JS rendering/Visualization library too, not just Places — new integration surface, treat as the riskiest build item)
- **Dev environment**: Claude Code in VS Code
- **Native wrap (planned, later)**: Capacitor — wraps the existing Next.js app for Android (Play Store) and iOS (App Store), rather than a separate React Native rebuild. Android first (no hardware blocker); iOS once a Mac + Xcode + Apple Developer account are in place. Do not start the wrap until the profile/data-engine features below are built and stable on web — wrapping mid-iteration slows the build loop.

### Native-wrap readiness — guardrails to follow now
The wrap itself is later, but a few current features touch APIs that behave differently in a Capacitor WebView vs. a browser. Writing them this way now avoids a rewrite later:
- **Camera (photo uploads on survey/check-in)**: use a standard `<input type="file" capture="environment">`, but isolate it behind a single small component/hook (e.g. `usePhotoCapture()`) rather than inlining the input everywhere it's needed. When Capacitor lands, that one hook swaps to the native Camera plugin — nothing else changes.
- **Geolocation (check-in proximity verification)**: same pattern — wrap `navigator.geolocation` calls in a single `useLocation()` hook, not called directly from components. Capacitor's Geolocation plugin becomes a drop-in swap inside that one file later.
- **No localStorage/sessionStorage for anything that matters** (auth state, form-in-progress, etc.) — Capacitor WebView storage isn't guaranteed to persist the same way. Supabase-backed state (already the pattern here) is fine and stays fine.
- **Push notifications**: don't build a browser push polyfill now. Skip straight to Capacitor's push plugin when that infra work happens — building browser push first just means building it twice.
- **Web app manifest**: worth adding now regardless of the wrap timeline — enables "Add to Home Screen" on Android/iOS today, and Capacitor consumes the same icons/splash config later.
## Current Priority — 3-day build sprint (ahead of Cincy Black Tech Week)
Goal: nav shell + survey/check-in flow + a bare-bones Live Map, demoable in person. Onboarding flow is explicitly parked for this sprint — not broken, just not the focus.

Build order:
1. **Nav shell** — Picks / Live Map / Profile bottom nav + floating + button. Ships first, makes everything else feel real immediately. *(Handoff prompt already written — see below.)*
2. **Post-visit survey + "Did You Go?" trigger** — wired to `venue_visits` (schema live in Supabase). In-app trigger (card/badge when a Saved Night's date has passed), not push — no push infra yet. 6-step flow: emotion rating (😞🙂🔥🤯, stored as int 1-4) → crowd → music (Wrong Vibe/Fine/Loved It) → price → would-return + optional photo → optional "what surprised you?" (100 char, feeds future why_tonight generation).
3. **Check-in flow + Right Now block** — search-by-name (fuzzy, via `search_venues()`) or GPS "use my location" entry point. Scout check-in form wired to `venue_checkins`. Live countdown (90 min) on confirmation, "Still here? Refresh status" button after expiry.
4. **Live Map v1** — new tab, colored pins by live crowd_level, check-in entry point lives here.
5. **Profile redesign** — Taste (Spotify-style), Night History, tier badge. Mostly display work once 2–3 exist.
6. **Onboarding flow** — deferred, not this sprint. Currently **bypassed** via `SKIP_ONBOARDING` in [lib/featureFlags.ts](lib/featureFlags.ts): new signups skip the 9-screen flow entirely and land straight in the main app. Onboarding's code/routes/components are untouched, just not auto-triggered. **Re-enable this flag before App Store submission work begins** — don't forget it's on.

**Default landing route is Live Map (`/map`), not Picks** — `/` (the PWA `start_url`) now redirects onboarded/bypassed users straight to Live Map instead of showing the old "Where are you tonight?" location-ask screen. That screen's code is still intact in [app/page.tsx](app/page.tsx) (unreachable while the redirect stands), since `/results` falls back to `/` when it has no cached coords — the redirect just continues on to `/map` from there instead. Bottom nav still shows all 3 tabs normally; this only changes first-launch behavior.

**Scouting is open to all users** (not invite-gated) — decided after initially scoping it as invite-only. Trust/quality is enforced mechanically instead of via gatekeeping:
- Every check-in requires real GPS proximity to the venue (within 150m), enforced at the database level via RLS — prevents fake/remote check-ins
- Rate-limited to one check-in per user per venue per 20 minutes — prevents tier-farming spam
- Tier progression computed from real check-in history (`scout_stats` view): New Scout → Scout (5+) → Verified Scout (25+) → City Scout (100+). This is the retention mechanic — Reddit karma / Google Local Guides pattern. Unlike general gamification (see Parked below), this one is justified because scout check-in *volume and reliability* is itself the product input for Live Map, not just a vanity metric.
- The original 5 invited friends keep an `is_scout` flag, repurposed as a permanent "Founding Scout" badge rather than an access gate.

**DB work already complete** (applied directly via Supabase MCP, not yet consumed by frontend):
- `venue_visits` — post-visit survey storage, emotion-scale rating (1-4), music_quality (wrong_vibe/fine/loved_it), optional surprise_note
- `venue_checkins` — scout check-ins, checkin_type (scout/entry), crowd_level, wait_minutes, cover_amount, music_tags (array), checkin_lat/lng, location + rate-limit enforced via RLS
- `venue_checkins_recent` — rolling 90-min freshness view per venue, use this instead of hand-rolling decay logic client-side
- `scout_stats` — tier calculation view
- `search_venues()` — fuzzy/typo-tolerant venue name search (pg_trgm), reusable beyond check-in (submit flow, admin)
- Saved Nights required no new table — already covered by existing `user_venue_interactions` / `user_event_interactions` (interaction_type = 'saved')

Music genre taxonomy (must stay consistent between user_profiles.music_prefs, check-in tags, and any future rec-engine matching): **Hip-Hop / Rap, R&B / Soul, Afrobeats, House / EDM, Latin, Jazz / Neo Soul, Live Bands, Gospel.** (Currently only asked in profile settings, not onboarding — flagged as a gap, not yet resolved.)

**Parked, not this phase**: general gamification/Night Score (Explorer level, "helped N people") — doesn't generate rec-engine signal, pure vanity metric, different from scout tiers above. Also parked: confidence indicator on Live Map ("🟢 Confirmed by 4 Scouts") and full stats dashboard on Profile ("47 nights out, favorite neighborhood...") — both good ideas, both need real aggregation-logic decisions before they're a quick add.

2. **Venue/promoter app** (separate, later) — a **web dashboard**, not a native app. Venues/promoters view activity, event feedback, and eventually manage check-in-as-entry for their events. Subscription gate planned: free for the first 10 venues / 2000 users per city, paid after that threshold. Not started until user app is done.

**DB-side scoring/curation work** (computed score blending like_count/featured/recency, gating unvetted Google-sourced venues out of results until curated) is handled by a separate Claude session working directly in Supabase — check current DB state rather than assuming it's done.

## Post-Sprint Backlog (after the 3-day push)
1. UI for surfacing curated spots once DB-side scoring/curation lands
2. Live Map v2 — true density heatmap layer (Google Maps Visualization library) once check-in volume justifies it over simple pins
3. Confidence indicator on Live Map (multi-scout agreement)
4. Full Profile stats dashboard
5. Onboarding flow for new users
6. Featured events rail on results page
7. "Who's Going" social feature (avatar counts)
8. Venue/promoter dashboard (web app) — includes entry check-in flow and subscription gate
9. Native wrap via Capacitor — Android first, iOS pending Mac
10. Push notification infra (unlocks smarter survey/check-in nudges than in-app triggers)

## Submission Flow (built, deployed)
Promoter pastes URL or uploads flyer → Claude API extracts structured event details → Promoter confirms in one tap → Stored in Supabase with pending/approved status → /admin review view

## Skills Available
This project has custom skills. When relevant, Claude should consult them:

- **fyn-marketing** (`skills/fyn-marketing/SKILL.md`) — brand voice, social templates, hashtags, campaign planning
- **fyn-uiux** (`skills/fyn-uiux/SKILL.md`) — design tokens, component patterns, mobile rules, user flows
- **fyn-venue-intel** (`skills/fyn-venue-intel/SKILL.md`) — research workflow for new venues/events, output formats, Cincinnati sources
- **fyn-branding** (`skills/fyn-branding/SKILL.md`) — brand identity source of truth
- **fyn-build-next** (`skills/fyn-build-next/SKILL.md`) — master strategic advisor; run this to get a prioritized list of Claude skills and app features to build next, evaluated against the full company vision

## Ground Rules
- Mobile-first in all UI decisions
- LGBTQ+-inclusive by default, not as an afterthought
- Every profile/data feature should generate signal for the recommendation engine — if it doesn't, it's not this phase's priority
- Scouting is open to all users; trust is enforced via location verification + rate limiting, not invite-gating
- Always check: does this add friction to a promoter or user? If yes, simplify.
- Prefer shipping over perfecting