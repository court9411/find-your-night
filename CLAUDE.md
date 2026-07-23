# Find Your Night — Claude Project Context

This is the root context file for the Find Your Night project. When working in this project, always apply this context.

## The App
Find Your Night (find-your-night.vercel.app) is an AI-powered nightlife discovery app for Cincinnati — and eventually everywhere. All-inclusive by design: anyone should be able to open it and find a night that's right for them.

**Launch strategy**: Start with Black Cincinnati. That's the community the founder knows, has relationships in, and can get real content from. Nail it there, then expand into other niches (LGBTQ+, foodies, live music crowd, etc.), then new cities.

Built by Courtney (solo founder).

## The real differentiator: reduce uncertainty, not list venues
FYN is not competing with Yelp/Google/Instagram on venue coverage — it's answering a question they structurally can't: **"what's the vibe right now?"** That answer decays in hours and requires a real human physically present tonight, which no search engine or static listing can fake. Every feature should be filtered through: **does this reduce uncertainty about tonight, specifically?**

- ❌ 1,000 venue descriptions → ✅ "It's dead tonight."
- ❌ Generic star reviews → ✅ "Crowd starts around 10:30."
- ❌ Static stock photos → ✅ "A scout uploaded this photo 37 minutes ago."
- ❌ "4.6 stars" → ✅ "Mostly 25–35 tonight."

This is why Live Map / check-ins are not just one feature among many — they're the mechanism the entire differentiator depends on.

## Two user types, different psychological jobs
- **Explorers** (~90-95% of users) — just want the answer. Low effort, "just tell me." This is Picks-brain.
- **Scouts** (~5-10%) — love being first, discovering, posting, getting recognition. This is a status/recognition loop, not a discovery loop. You don't need thousands — 50-100 great Cincinnati scouts keeps the app alive for everyone else.

**Explorer retention is gated behind Scout density.** An Explorer only gets the "dang, it found me something" moment if there's real, fresh signal on the map when they open it. Right now that signal is thin, so building for Scouts *is* building for Explorers — it's the precondition, not a separate track.

## Business model (5 layers, sequenced deliberately)
1. **FindYourNight (free)** — recommendations, heat map, check-ins, reviews, AI explanations. Stays free as long as possible; usage is the asset every other layer is built on.
2. **Venue Intelligence (paid)** — dashboard for venue owners: views/saves/check-ins, vibe scores, structured feedback ("too crowded after 11," "great for first dates"). Only sellable once check-in volume per venue is dense enough to be credible, not noise.
3. **Promotion** — venues pay for featured placement, push, weekend spotlight. Google Ads for nightlife.
4. **Data** — aggregate behavioral patterns (which DJs fill rooms, neighborhood trends, repeat-visit conversion). Valuable because it's behavioral, not personal.
5. **Tickets & Reservations** — take a percentage on table reservations, tickets, cover, VIP.

Sequencing is deliberate: free product builds trust and volume → trust makes the data in layer 2 credible → 2 and 3 fund the business → 4 and 5 are the long-tail payoff. Don't skip ahead — layers 2+ don't work without real density from layer 1.

## App Structure (built)
Bottom nav, 3 tabs, each with a distinct job:
- **🏠 Picks** — default landing route (`/results`, reverted from Live Map on 2026-07-21 — a map with sparse pins read as confusing for a first/returning impression rather than inviting). Curated/ranked rail system (The Lineup, Popular Picks, Date Night, Budget-Friendly, Casual Fun). "Tell me what to do." Doesn't depend on live density, so it holds up even while Scout coverage is thin.
- **🗺️ Live Map** — (`/map`). Purely geographic + real-time. Map pins colored by live crowd_level (v1: simple colored pins, not a true heatmap — that comes later once check-in volume justifies it). Check-in entry point lives here (tap a pin, or the silent proximity prompt described below).
- **👤 Profile** — reflective side only: Taste (Spotify-style), Night History, Saved Nights, Scout tier/status. Not the action side.

Floating **+ button** opens `/submit` — the promoter submission flow.

## Stack
- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase
- **AI**: Anthropic API (Claude)
- **Deployment**: Vercel
- **Maps**: Google Maps Places API + Maps JS rendering/Visualization library
- **Dev environment**: Claude Code in VS Code
- **Native wrap (planned, later)**: Capacitor — Android first, iOS pending Mac + Xcode. Do not start until profile/data-engine features are stable on web.

### Next.js 14 gotcha — GET route handlers can silently static-cache
A `GET` route handler with **no** `Request` param and **no** call to `cookies()`/`headers()` (e.g. any route using only `supabaseAdmin`, no auth) gets statically cached by Next 14 by default — meaning it can freeze at build/deploy time and serve stale data to everyone in production, invisibly, since `next dev` never exhibits this. Bit us once on `/api/venues/pins` (map pins never updated after check-in, in prod only). Any new admin-only, no-auth GET route needs `export const dynamic = "force-dynamic"` unless it's genuinely meant to be static.

### Native-wrap readiness — guardrails to follow now
- **Camera**: `<input type="file" capture="environment">`, isolated behind a single hook (e.g. `usePhotoCapture()`).
- **Geolocation**: wrapped in `useLocation()` ([lib/useLocation.ts](lib/useLocation.ts)) — already in use for check-in and the proximity prompt. Never call `navigator.geolocation` directly from a component.
- **No localStorage/sessionStorage for anything that matters** (auth, form-in-progress). Supabase-backed state is fine.
- **Push notifications**: skip browser push polyfills entirely, go straight to Capacitor's plugin later.

## Current phase: pre-App-Store polish (as of 2026-07-23)

Retention/Scout-density work (below) is real and not abandoned, but it is
not what's being actively worked right now. Active focus is finishing
Picks + Profile to a "premium feel" bar before Capacitor wrap + App Store
submission. Target: submit within the next 1-2 weeks.

**Picks page redesign, in progress:**
- Neon header treatment: "Tonight's" in hot pink (#FF2E92-ish, exact glow
  TBD in code), "Picks" in electric green, cocktail-glass divider —
  landed, keep as-is.
- Smart Night Picker promoted from a small card to the dominant
  above-the-fold element, directly under search. It's the app's real
  differentiator (an answer, not a browse surface) and needs to read
  that way visually.
- Live/event content (The Lineup) ranks above algorithmic rails (Popular
  Picks, Date Night, etc.) — a promoter's submitted event is
  higher-signal and more time-sensitive than a generic venue match, and
  should be positioned accordingly. Order, top to bottom: Search → Smart
  Picker → The Lineup / live event rail → Popular Picks → Date Night →
  Budget-Friendly → Casual Fun.
- "Tonight" rail (the match-reason cards, e.g. "Matches your sports-ba...")
  is being renamed to avoid colliding with the "Tonight's Picks" hero
  text — working name "Happening Now." Match-reason copy needs to stop
  truncating mid-word ("Because you like sports bars" not "Matches your
  sports-ba...").
- Daytime Picks rail should reorder based on time of day rather than
  holding a fixed position — a coffee-shop rail ranking high at 10pm
  doesn't serve anyone. Not yet built.
- Floating **+** button needs a label/identity — currently ambiguous
  what it does (Add Event? Post update? Check in?).
- Profile section: completing remaining gaps (scope TBD, check current
  state before assuming what's left).

**Retention work below is still real, just not this week's priority** —
don't let App Store prep silently kill it, revisit once submitted.

## Next phase: Partner Dashboard (starts once App Store submission is in,
## during Apple review — separate repo, not this one)

Decision made 2026-07-23: this is a **separate Next.js app**, own repo,
own Vercel deployment (e.g. `partners.findyournight.app`), **same
Supabase project** — RLS draws the boundary between partner and consumer
data, no reason to split the backend. Auth can be Supabase auth in both
apps; a person can hold both a partner and a consumer account.

Reasoning: the consumer app now has App Store review in its release path.
A separate partner app can ship changes on its own schedule without ever
touching something sitting in Apple's queue.

**True MVP scope (do not let this creep back to the full spec):**
1. Partner auth + roles (owner/admin/manager/editor/viewer) — accounts
   belong to **organizations**, organizations manage venues/events. Do
   not attach venues/events directly to a single user — a venue will
   eventually have an owner, manager, and promoter with different
   permissions, and retrofitting this later is expensive.
2. Claim venue/promoter application (simple: pick venue, submit info,
   wait for approval)
3. Internal approval queue (events + claims only for v1 — not the full
   moderation suite)
4. Event create/edit/draft/submit/cancel
5. Stretch, if time allows: "Tonight" updates (quick live posts —
   "DJ starts at 10," "patio open," expiring automatically). Small build,
   high signal value, ties directly into the Live/Learned signal tiers
   already established for the consumer app.

**Explicitly deferred past MVP, even though an earlier planning pass
described them in detail:** venue profile editing, basic analytics
(profile views/saves/clicks), the fuller admin tooling (impersonation,
duplicate merging, editorial notes, content featuring). Reasonable v1.5/v2
scope, not now.

**Milestone that defines "done" for v1:** a promoter signs in, submits an
event, Courtney approves it, it appears correctly inside FindYourNight.
That's the point this stops requiring Courtney to personally enter every
event.

Suggested tables (expand existing schema, don't rebuild):
`organizations`, `organization_members`, `venue_claims`, `promoter_profiles`,
`event_organizers`, `partner_updates`, `approval_requests`, `audit_logs`.
Publishing workflow: `draft → submitted → approved → published → expired`,
with `rejected` and `changes_requested` branches off `submitted`.

## Product #1 roadmap (set 2026-07-11)
A full code + DB audit was run this session (grep across every API route, every fetch-on-mount component, and Supabase's security/performance advisors) to find what's weakest in the core loop before scaling Scout volume. Status below.

**🟢 1. Connect check-ins → ranking — highest priority, still open.** This is the heart of the product: every visit should make recommendations better. Confirmed gap: `get_ranked_venues`, `get_rail_venues`, and `get_ranked_events` — the RPCs Picks actually calls — have zero references to `venue_checkins` or `venue_visits` anywhere in this repo. The data is captured but not consumed. This logic lives in Supabase and is owned by the separate DB-focused Claude session — raise it there, don't attempt to rewrite the ranking RPCs from this side blind. Partial mitigation shipped this session (see below): visit data is now at least *visible* to users directly, even though it doesn't yet feed ranking.

**🟢 2. "Did You Go?" survey — data now surfaced, not just stored.** The survey capture itself was already fully built (`DidYouGoCard` on Picks → `VisitSurveyModal` → `/api/visits`). What was missing: the answers went into `venue_visits` and were never shown to anyone. Fixed this session — `VisitorInsightsCard` ([components/VisitorInsightsCard.tsx](components/VisitorInsightsCard.tsx)) aggregates `venue_visits` server-side (`/api/venues/visit-summary`, admin-scoped read since the table's RLS is per-user, only the aggregate is ever returned) into "🔥 · Busy crowd · 78% would return" plus up to 2 recent surprise-note quotes, shown on both the venue detail page and the map's check-in sheet, right alongside `RightNowBlock`. Won't render anything until `venue_visits` actually has rows for a venue (0 rows as of this writing) — same self-hiding convention as every other rail/card in the app. Remaining known gap: survey still only triggers for date-bound saved events, not plain venue-only saves.

**🟡 3. Admin caching — fixed.** `app/api/admin/pending-events/route.ts` and `app/api/admin/submissions/route.ts` now have `export const dynamic = "force-dynamic"`, closing the same silent-caching risk as the pins bug.

**🟡 4. Security — tightened.**
- `event_likes`'s wide-open `USING(true)`/`WITH CHECK(true)` INSERT/DELETE policies are dropped. The app's real write path (rate-limited `increment_event_like` RPC via service_role) is unaffected; only direct-REST-API abuse is now blocked.
- `approve_pending_venue()` — **correction from earlier in this audit**: this is NOT dead code. `pending_venues` is real, purpose-built DB work already done for the user-submit-a-venue feature (see below) — the frontend just hadn't caught up yet. The real issue was that the function was callable via RPC by `anon`/`authenticated`/`PUBLIC` roles, letting anyone force-approve any submission straight into the live `venues` table, bypassing admin review. Execute is now revoked from all of those (including the `PUBLIC` pseudo-role, which every role implicitly inherits from — revoking only the named roles isn't sufficient by itself, learned that the hard way mid-fix). Only `postgres`/`service_role` can call it now.
- Missing indexes on `venue_checkins.user_id` and `venue_visits.event_id` — added.
- RLS policies on `venue_checkins`, `venue_visits`, `user_actions`, `user_tag_affinity`, and `pending_venues` rewritten to cache `auth.uid()` per-statement instead of re-evaluating per row.
- Deferred, low-priority: `venue_checkins_recent`/`scout_stats` SECURITY DEFINER views (fine — check-ins are meant to be publicly viewable), leaked-password-protection disabled in Supabase Auth, `function_search_path_mutable` warnings on most DB functions, a few `anon`-executable SECURITY DEFINER functions that are genuinely supposed to be anon-callable (`handle_new_user`, `increment_event_like`, `like_event`, onboarding seed functions).

## Users can add a venue (built this session)
DB side (`pending_venues`, `approve_pending_venue()`) already existed — see correction above — the frontend didn't. Now built:
- `/submit/venue` — auth-gated form: venue name/location via the existing `PlaceAutocompleteInput` (Google Places), category, price level, vibe tags (reuses `VALID_VIBE_TAGS`), description, optional photo via `usePhotoCapture()`. Linked from the existing `/submit` (event) flow.
- `POST /api/venues/submit` — resolves `market_id` via the existing `resolve_market_id()` RPC, uploads the optional photo to the real `venue-images` bucket via [lib/venuePhotoStorage.ts](lib/venuePhotoStorage.ts) (same bucket `approve_pending_venue()` already copies into `venue_photos` on approval), inserts through the user-scoped client so RLS enforces `submitted_by = auth.uid()` for real.
- Admin review UI — a "Pending Venues" tab in `/admin` ([app/admin/page.tsx](app/admin/page.tsx)) lists submissions with an editable opening-date field; approve calls `approve_pending_venue()` (server-only now, see security section above) and sets `opened_date` on the resulting live venue in one action. Reject/delete both work too.

## "New Venues" — data exists, UI intentionally not built yet
`venues.opened_date` (nullable `date`, added this session — distinct from any DB-insert timestamp, since this tracks the real-world opening) is now populated for ~13 Cincinnati/NKY venues that opened in the last year, researched via web/local-press search (CityBeat, WCPO, Fox19, Local12, everythingcincy.com — **direct TikTok/IG/FB search does not meaningfully work through available tools**, don't assume that's a repeatable research channel without being pointed at specific accounts) plus founder-supplied dates for ones Courtney knew personally (Drunken Academy, Whiskey Yard, The Night Kap's new Bramble Ave location — Whetsel Ave is the older existing location, not a duplicate to merge).

**Explicit decision (2026-07-11): do not build the Picks rail UI yet.** ~13 dated venues isn't enough density for a "New Venues" rail to feel real — same lesson as the Live Map cold-start problem elsewhere in this doc: a thin rail reads as broken, not as content. Let `opened_date` keep accumulating (via admin approval and periodic research passes) until there's enough volume that the rail wouldn't feel sparse on a random Tuesday. When that threshold is judged to be reached, the build itself is trivial — `get_rail_venues`-independent, just a `venues` query ordered by `opened_date` — the blocker is data density, not engineering.

## Parked, not this phase
General gamification/Night Score, "Who's Going" avatar counts, confidence indicator on Live Map ("🟢 Confirmed by 4 Scouts"), full Profile stats dashboard, native wrap via Capacitor, push notification infra. All good ideas — none are the current bottleneck, which is Scout density and retention.

## Submission Flow (built, deployed)
Promoter pastes URL or uploads flyer → Claude API extracts structured event details → Promoter confirms in one tap → Stored in Supabase with pending/approved status → /admin review view

## Skills Available
Live in `.claude/skills/` as of 2026-07-23. Claude Code should reference these automatically when relevant — don't assume context that should come from a skill instead.
- **fyn-marketing** — brand voice, social templates, campaign planning
- **fyn-uiux** — design tokens, component patterns, mobile rules, user flows
- **fyn-venue-intel** — research workflow for new venues/events, Cincinnati sources
- **fyn-branding** — brand identity source of truth (colors, type, logo rules)
- **fyn-database** — Supabase schema, RPCs, conventions, safe migration practices
- **fyn-build-next** — master strategic advisor against the full company vision

Keep this list and the skill files themselves in sync — if a color, font, or major decision gets locked, update the relevant skill file in the same session, not just this doc.
## Ground Rules
- Mobile-first in all UI decisions
- LGBTQ+-inclusive by default, not as an afterthought
- Every feature should pass the uncertainty-reduction filter above, or generate signal for the recommendation engine — if it does neither, it's not this phase's priority
- Scouting is open to all users; trust is enforced via location verification + rate limiting, not invite-gating
- Always check: does this add friction to a promoter or user? If yes, simplify.
- Prefer shipping over perfecting
