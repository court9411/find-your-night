---
name: fyn-uiux
description: Use this skill for any Find Your Night design, UI, or UX decision — component design, page layout, color, typography, mobile behavior, user flows, interaction patterns, accessibility, or anything visual. Trigger whenever Courtney asks about how something should look, feel, or work in the app, even if the request is phrased as a dev question. Also use for new feature design, redesigns, or reviewing existing screens.
---

# Find Your Night — UI/UX Skill

## App Identity
Find Your Night is a nightlife discovery app. The UI should feel like being handed a hot tip by someone who knows — fast, confident, a little electric. Not a Yelp clone. Not a travel app. Something you'd actually open at 9pm when you're trying to figure out your night.

**The one-sentence design brief**: A dark, fast, vibe-first mobile experience that helps people in Cincinnati find their night in under 60 seconds.

---

## Tech Stack
- **Framework**: Next.js (App Router)
- **Styling**: Tailwind CSS
- **Deployment**: Vercel
- **Database**: Supabase
- **Maps**: Google Maps Places API

---

## Core Design Principles

### 1. Mobile-first, always
The primary use case is someone on their phone, probably already getting ready to go out. Every layout decision starts at 375px (iPhone SE). Desktop is secondary.

### 2. Speed over completeness
Don't show everything. Show the right thing. A user should know whether a venue is for them within 2 seconds of seeing the card. Cut anything that slows that judgment.

### 3. Vibe-forward hierarchy
The vibe/category/feeling of a place always outranks the facts (address, hours). Facts are secondary confirmation, not the lead.

### 4. Dark by default
Nightlife app = dark mode as the primary experience. High-contrast text on dark backgrounds. Vibrant accent colors that pop.

### 5. Thumb-friendly
Primary actions live in the bottom 60% of the screen. Nothing important in the top corners on mobile.

---

## Design Tokens

**Fill in with your actual values — these are placeholders:**

### Colors
```
Background:       #0D0D13  (near-black, locked brand token)
Surface:          #1A1A1A  (cards, panels)
Surface elevated: #242424  (modals, dropdowns)
Border:           #2E2E2E  (subtle dividers)

Primary accent:   #22C55E  (electric green — locked brand token, primary)
Secondary accent: Hot pink (locked brand token — used for "Tonight's" in the
                   Picks header treatment; pair sparingly with electric green,
                   don't let both compete for attention on the same element)
Accent hover:     [slightly lighter/more saturated version of whichever accent is active]

Text primary:     #FFFFFF
Text secondary:   #A0A0A0
Text muted:       #606060

Success:          #22C55E
Error:            #EF4444
Warning:          #F59E0B
```

### Typography
```
Display (headings):  Syne  (locked brand token — personality font, use for
                      headlines, section titles, the "Tonight's Picks" header)
Body:                Inter  (locked brand token — body copy, labels, data)
Mono (code/labels):  [e.g. JetBrains Mono — for any data display]

Scale:
  xs:   12px / 16px line height
  sm:   14px / 20px
  base: 16px / 24px
  lg:   18px / 28px
  xl:   20px / 28px
  2xl:  24px / 32px
  3xl:  30px / 36px
```

### Spacing
Stick to Tailwind's scale. Common values: 4 (16px), 6 (24px), 8 (32px), 12 (48px)

### Border radius
- Cards: `rounded-2xl` (16px)
- Buttons: `rounded-full` (fully rounded) or `rounded-xl`
- Chips/tags: `rounded-full`
- Inputs: `rounded-xl`

---

## Component Patterns

### Event / Venue Card
**Shows**: Event or venue name, vibe tags (2–3 max), key detail (date or neighborhood), thumbnail image
**Rules**:
- Min height: enough for thumb tap — at least 80px tap target
- Image always present (even a colored placeholder)
- Vibe tags are the first thing the eye hits after the name
- Address/distance is secondary, below the fold of the card

```
┌─────────────────────────────────┐
│ [image]  Event Name             │
│          🏳️‍🌈 Drag  🍹 Bar  🎵 Live│
│          Sat Jun 28 · OTR       │
└─────────────────────────────────┘
```

### Vibe Selector (recently redesigned)
- Pill/chip style, multiselect
- Selected state: filled with accent color
- Unselected: outlined or muted
- Horizontal scroll on mobile
- Don't reorder after selection (disorienting)

### Filter Bar
- Sticky below header on scroll
- Compact: icon + label chips
- Active filters show badge count
- "Clear all" always visible when filters are active

### Navigation
- Bottom tab bar on mobile (not hamburger)
- Max 4–5 tabs
- Icons + labels (not just icons)
- Active state: accent color

### Submit Flow (Promoter)
- Max 3 steps
- Show progress indicator
- Each step: one job only
- Confirmation screen before final submit
- Never lose their work on back navigation

### Admin Review View
- Dense list — this is a power user view
- Quick approve/reject actions (swipe or big buttons)
- Show key details at a glance: event name, venue, date, status
- Pending = top of list

---

## User Flows (protect these)

### Discovery Flow
1. Open app → See events/venues for tonight (or this weekend)
2. Filter by vibe (optional)
3. Tap card → See details
4. **Target**: Decision made in ≤ 3 taps

### Promoter Submission Flow
1. Land on /submit
2. Paste URL or upload flyer
3. Claude extracts details → Promoter confirms/edits
4. Submit → Done
5. **Target**: Under 2 minutes from start to submit

### Admin Review Flow
1. Open /admin
2. See pending submissions
3. Review → Approve or reject
4. **Target**: Under 30 seconds per item

---

## Pre-Launch Page Audit (three-lens framework)

When reviewing any existing page or screen — not just new design — run it through all three lenses. A page that passes two out of three still needs work.

### 1. Premium feel
Does it look and behave like a real, funded product, or like a bootcamp project? Check spacing, motion, hierarchy, and whether the brand tokens above (Syne, electric green, hot pink, near-black) are actually landing on the page — not just present somewhere in the CSS.

### 2. Right data
Is this page capturing or surfacing what it actually needs to — for the user, and eventually for partners — without bolting on fields nobody's asked for yet? Under-collecting and over-collecting are both failures here.

### 3. The #1 job
Does this page help someone answer "is this place going to be good tonight, and is it for me?" — or has it quietly drifted into being a generic listings page? Every screen gets checked against this, not just Picks. This lens overrides the other two: a page can look premium and collect great data and still fail if it's not doing the core job.

---

## Mobile Checklist (run before any launch)
- [ ] Tap targets ≥ 44px (Apple HIG minimum)
- [ ] Text readable at system default size (16px base)
- [ ] Layout tested at 375px (iPhone SE — smallest common phone)
- [ ] Layout tested at 430px (iPhone 15 Pro Max — largest common)
- [ ] No horizontal scroll on any screen (unless intentional)
- [ ] Primary actions reachable with one thumb (bottom 60%)
- [ ] Keyboard doesn't cover input fields
- [ ] Images load fast or have skeleton/placeholder
- [ ] Dark mode looks right (don't assume)

---

## Accessibility Rules
- Color contrast: ≥ 4.5:1 for body text, ≥ 3:1 for large text (WCAG AA)
- Never rely on color alone — pair with icon or label
- All images: descriptive alt text
- Focus states: visible (outline or ring), never `outline: none` without replacement
- Inputs: always have visible labels (not just placeholder text)

---

## What NOT to Do
- No light mode without explicit user request — we're a nightlife app
- No full-width tables on mobile
- No infinite scroll without a "load more" escape valve
- No modals that can't be dismissed
- No auto-playing sound or video
- No making the user re-enter info they already gave us
- Don't center-align body text (only headlines)
