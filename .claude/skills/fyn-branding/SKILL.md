---
name: fyn-branding
description: Use this skill for any Find Your Night brand decision — defining the visual identity, choosing colors and fonts, establishing logo rules, reviewing brand consistency, or generating brand materials for pitches and partners. Trigger whenever Courtney is making choices about how FYN looks and feels, needs a brand gut-check on a design or copy direction, is evaluating a logo option, or wants to produce brand guidelines for a vendor, investor, or partner. This is the source of truth for all brand decisions. Use it before fyn-uiux or fyn-marketing for any foundational brand question — those skills draw from this one.
---

# Find Your Night — Brand Identity Skill

## What This Skill Does

Two modes:

**Define mode** — FYN's visual identity isn't fully set yet. When Courtney needs to make brand decisions, this skill runs her through a structured process to make those choices deliberately, not by accident.

**Reference mode** — Once brand decisions are made, this skill holds them. It's the canonical source of truth that feeds fyn-uiux and fyn-marketing. When those skills have placeholders, the answer lives here.

If a section below has a placeholder, a brand definition session is needed to fill it in.

---

## Brand Foundation

### What FYN is
A personalized nightlife intelligence layer. The AI layer that understands who you are, what you're in the mood for, and points you somewhere you'll actually love. Opening FYN should feel like texting your most plugged-in friend.

### What FYN is NOT
Not a listings app. Not Yelp for bars. Not a travel tool. Not a nightlife aggregator. Not "inclusive" in the corporate sense. Not for everyone in a watered-down way.

### The energy this brand carries
Confident. Plugged-in. A little electric. Community-rooted. Has a point of view. Not corporate. Not neutral.

### Who it's for
Black Cincinnati as the launch community — because that's where the founder has credibility, real relationships, and real content. Universal product vision: the recommendation that works for anyone who wants a real night out, not a guess.

### One-sentence brand brief
The nightlife app that feels like a person — specifically, the most plugged-in person in your city.

---

## Visual Identity

> Sections marked **[NEEDS DECISION]** require a brand definition session. Once a decision is made, update this section. These values flow directly into fyn-uiux and fyn-marketing.

### Color Palette

| Role | Name | Hex | Status |
|---|---|---|---|
| Background | Near-black | `#0D0D13` | ✅ Set |
| Surface | Card | `#1A1A1A` | ✅ Set |
| Surface elevated | Modal | `#242424` | ✅ Set |
| Border | Subtle | `#2E2E2E` | ✅ Set |
| Text primary | White | `#FFFFFF` | ✅ Set |
| Text secondary | — | `#A0A0A0` | ✅ Set |
| Text muted | — | `#606060` | ✅ Set |
| **Primary accent** | Electric green | `#22C55E` | ✅ Set |
| **Secondary accent** | Hot pink | — | ✅ Set — used for callouts/emphasis (e.g. "Tonight's" in the Picks header); pair sparingly, don't let both compete on the same element |
| **Accent hover** | Lighter/more saturated variant of whichever accent is active | — | ✅ Set (direction locked, exact hover value TBD per-component) |

**Criteria for the accent color — any choice must pass all five:**
1. Pops on `#0D0D13` without burning the eye
2. Reads as nightlife/premium, not tech startup or corporate
3. Works at small sizes (chips, nav dots, tags)
4. Has a natural hover state (slightly lighter or more saturated)
5. Doesn't feel interchangeable with another app

---

### Typography

| Role | Font | Weight | Status |
|---|---|---|---|
| **Display / wordmark** | Syne | Bold/geometric weights | ✅ Set |
| **Heading** | Syne | — | ✅ Set |
| **Body** | Inter | — | ✅ Set |
| **Labels / chips** | Inter | — | ✅ Set (default; revisit if chips need a distinct feel from body copy) |

**Criteria for typography — any pairing must pass all four:**
1. Display font has genuine personality — nothing that ships with Figma templates
2. Body font is readable at 14px on a dark background
3. Pairing feels contemporary, not dated
4. Available via Google Fonts or has a web-safe license

---

### Logo

| Element | Status |
|---|---|
| Concept direction | ⚠️ **[NEEDS DECISION]** |
| Wordmark | ⚠️ **[NEEDS DECISION]** — "Find Your Night" or "FYN" |
| Icon / mark | ⚠️ **[NEEDS DECISION]** |
| App icon | ⚠️ **[NEEDS DECISION]** |
| Minimum usage size | ⚠️ **[NEEDS DECISION]** |
| Clear space rule | ⚠️ **[NEEDS DECISION]** |
| Dark background version | ⚠️ **[NEEDS DECISION]** |
| Light background version | ⚠️ **[NEEDS DECISION]** — needed for pitch decks |

**Logo criteria:**
- Must work at 16×16px (favicon) and full-width marketing
- Must work on dark AND light backgrounds
- Should not be so literal it reads as "nightlife illustration" (no cocktail glass, no skyline)
- Should hold up next to apps people actually respect

---

## Brand Definition Session

Run this when a brand element needs to be decided. Don't skip steps.

### Step 1 — Scope
Identify exactly what's being decided: accent color, typography, logo direction, or all three for a full brand sprint. Don't try to define everything at once unless you have time for a proper session.

### Step 2 — Gut check questions
Ask these before presenting any options. Listen to the words Courtney uses — they matter.
1. When you picture FYN in its best form — the app someone trusts and loves — what does it look like? Any words, textures, or images come to mind?
2. Are there brands, apps, or aesthetics you're drawn to? (Does not have to be nightlife.)
3. What do you NOT want it to look like — what feels wrong or off?
4. Is there a competitor or adjacent brand whose visual identity you respect, even if you don't like their product?
5. When someone opens FYN at 9pm on a Friday, what should the first screen make them feel?

### Step 3 — Present concrete options
For each element, present exactly 3 directions — not concepts, actual values:
- Name the direction clearly
- Give the hex value, font name, or logo approach
- Describe how it behaves in context (dark background, small size, etc.)
- Name what it signals culturally and emotionally

### Step 4 — Make the decision
Courtney chooses. Write it down. Update the Visual Identity section above. These values are now locked unless she explicitly runs a revision session.

### Step 5 — Sync to other skills
After any brand decision:
- Update fyn-uiux with confirmed accent color and typography tokens
- Update fyn-marketing if any brand voice direction shifts
- Note the date the decision was made

---

## Brand Language

### Voice — source of truth
Write like the most plugged-in person in the city. Confident. Real. No filter. The insider tip that makes you feel in on something — regardless of who you are.

**Not:** corporate, over-explaining, performative, neutral, press-release, or watered-down.

The voice is consistent whether you're writing a social caption, a UI label, an error message, or a pitch deck one-liner. The formality adjusts; the confidence does not.

### Phrases that live in the FYN universe
"The move." "Find your night." "You already know." "Pull up." "The vibe." "Locked in." "What's really good." "For real, though."

### Phrases that don't
"Thrilled to announce." "Excited to share." "Inclusive experience." "For everyone." "Diverse nightlife options." "Something for every taste." Any language that sounds like it came from a PR intern or a DEI committee.

### The brand name — usage rules
- **Full name**: Find Your Night
- **Short form**: FYN (works in UI, social handles, informal context)
- **Pronunciation**: "Fine" — not spelled out as letters
- **In copy**: "Find Your Night" on first mention; "FYN" acceptable after that
- **Never**: "Find your Night" (wrong caps), "FYN app" (redundant), "the FYN platform" (corporate)
- **Tagline**: TBD ⚠️ — should emerge from voice, not be forced

---

## Brand Application

### How this skill feeds the others

| Skill | What it gets from fyn-branding |
|---|---|
| **fyn-uiux** | Accent color hex values, typography decisions, logo usage rules |
| **fyn-marketing** | Brand voice source of truth, approved phrases, naming conventions |
| **fyn-build-next** | Brand readiness check — does the identity scale to new cities and communities? |

### Brand by context

| Context | What matters most |
|---|---|
| App UI | Dark palette, accent color, speed — handled by fyn-uiux once tokens are set |
| Social content | Voice, energy, specificity — handled by fyn-marketing |
| Pitch decks | Professional but distinctive — full brand system must be defined first |
| Partner / promoter materials | Clarity and credibility over energy |
| Press materials | The story matters more than the aesthetic |
| App store listing | Voice + credibility — not hype |

---

## Brand Gut Check

Run any brand decision — visual or copy — through this before committing.

**Does it feel like FYN?**
- [ ] Would a plugged-in 28-year-old in Cincinnati find this credible?
- [ ] Does it work on a dark background at mobile size?
- [ ] Is there personality here, or is it interchangeable with any other app?
- [ ] Does it serve the community without performing for it?
- [ ] Would this hold up in two years, or is it chasing a moment?

**Does it avoid the traps?**
- [ ] Not a Yelp clone aesthetic (busy, review-forward, beige)
- [ ] Not a generic tech startup look (gradients, rounded sans, purple-to-blue)
- [ ] Not over-explained (one idea, said once, clearly)
- [ ] Not generic nightlife (stock photos, neon signs, cocktail imagery as hero visual)

**Does it scale?**
- [ ] Would this work in a new city with a different launch community?
- [ ] Is it distinctive enough to be recognized across touchpoints?
- [ ] Does it leave room for personalization features without feeling inconsistent?

---

## What This Skill Never Does

- Never locks in brand decisions without Courtney's explicit sign-off
- Never recommends generic brand choices — stock-photo-ready is the wrong direction
- Never treats the dark background palette as optional — nightlife app, dark mode is the brand
- Never separates brand from community — FYN's credibility IS its community trust
- Never treats brand as purely visual — the voice is equally the brand
- Never updates fyn-uiux or fyn-marketing with unconfirmed values
