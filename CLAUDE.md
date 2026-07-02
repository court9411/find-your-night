# Find Your Night — Claude Project Context

This is the root context file for the Find Your Night project. When working in this project, always apply this context.

## The App
Find Your Night (find-your-night.vercel.app) is an AI-powered nightlife discovery app for Cincinnati — and eventually everywhere. All-inclusive by design: anyone should be able to open it and find a night that's right for them.

**Launch strategy**: Start with Black Cincinnati. That's the community the founder knows, has relationships in, and can get real content from. Nail it there, then expand into other niches (LGBTQ+, foodies, live music crowd, etc.), then new cities. Eventually user profiles let the app understand each individual and give genuinely personalized recommendations — not a generic list, but "here's your night specifically."

Built by Courtney (solo founder).

## Stack
- **Framework**: Next.js (App Router)
- **Database**: Supabase
- **AI**: Anthropic API (Claude)
- **Deployment**: Vercel
- **Maps**: Google Maps Places API
- **Dev environment**: Claude Code in VS Code

## Current Priority
Cincinnati Pride soft launch (June 26–28, 2026) happened and got real traction — estimated 60-100+ unique users plus 300+ in-person conversations that weekend, with organic posts circulating on Instagram and Facebook. Now gearing up for the next app drop.

Next phase: splitting into two apps, built in sequence — **finish the user app first**, don't start the venue/promoter app until the user side is flawless.
1. **User app** (this repo, Claude Code) — get this fully polished first:
   - Onboarding flow for new users (not yet built)
   - UI for surfacing curated/vetted spots to users once they're ranked (depends on the DB-side scoring work below)
   - General UX polish across the existing flows
2. **Venue/promoter app** (new, separate, later) — dashboards for venues and promoters to view activity and feedback on their events. Expands on the old "Promoter profiles" backlog item below, but as its own app. Not started until (1) is done.

**DB-side scoring/curation work is handled by a separate Claude session working directly in Supabase, not Claude Code.** As of this writing that work (a computed score blending like_count/featured/recency, and gating the ~424 unvetted Google-sourced venues out of results until curated) hadn't been built yet — check current DB state rather than assuming it's done.

## Post-Launch Backlog (in rough priority order)
1. Onboarding flow for new users
2. UI for surfacing curated spots once DB-side scoring/curation lands
3. Featured events rail on results page
4. /submit in permanent nav
5. "Who's Going" social feature (avatar counts)
6. Venue/promoter dashboard app — separate app, after user side is polished
7. User accounts (Supabase or Clerk) — shipped: OTP email login via Supabase Auth, profile preferences, saved events

## Submission Flow (built, deployed)
Promoter pastes URL or uploads flyer → Claude API extracts structured event details → Promoter confirms in one tap → Stored in Supabase with pending/approved status → /admin review view

## Skills Available
This project has three custom skills. When relevant, Claude should consult them:

- **fyn-marketing** (`skills/fyn-marketing/SKILL.md`) — brand voice, social templates, hashtags, campaign planning
- **fyn-uiux** (`skills/fyn-uiux/SKILL.md`) — design tokens, component patterns, mobile rules, user flows
- **fyn-venue-intel** (`skills/fyn-venue-intel/SKILL.md`) — research workflow for new venues/events, output formats, Cincinnati sources
- **fyn-build-next** (`skills/fyn-build-next/SKILL.md`) — master strategic advisor; run this to get a prioritized list of Claude skills and app features to build next, evaluated against the full company vision

## Ground Rules
- Mobile-first in all UI decisions
- LGBTQ+-inclusive by default, not as an afterthought
- Always check: does this add friction to a promoter or user? If yes, simplify.
- Prefer shipping over perfecting
