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
Soft launch at Cincinnati Pride, June 26–28, 2026.
Feature freeze: ~June 22. Remaining time = content loading, mobile testing, marketing.

## Post-Launch Backlog (in rough priority order)
1. Featured events rail on results page
2. /submit in permanent nav
3. Promoter profiles
4. "Who's Going" social feature (avatar counts)
5. User accounts (Supabase or Clerk)

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
- Prefer shipping over perfecting pre-launch
