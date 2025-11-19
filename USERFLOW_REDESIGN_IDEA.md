# Userflow Redesign Concept

This document proposes a refreshed end-to-end flow for Urban Manual that keeps the editorial tone while making the journey from “I’m curious” to “I booked a trip” shorter and more measurable.

## Guiding Principles
1. **Narrated discovery** – move beyond a static grid with an AI-guided welcome that highlights a curated trio of destinations and saved trips.
2. **Progressive detail** – reveal richer data as intent increases: tease highlights on cards, open a right-rail for immersive detail, then transition into a planning canvas.
3. **Plan-first interactions** – every action should funnel into a lightweight itinerary builder to keep users invested.
4. **Memory & motivation** – surface a “travel streak” and personalized nudges whenever a user returns.

## Flow Overview
| Phase | Screen(s) | Core Actions | Key Components |
| --- | --- | --- | --- |
| 1. Arrival | Welcome hero + “What’s inspiring you?” prompt | AI intro, quick filters (Cities, Vibes, Time) | Gemini concierge, intent chips |
| 2. Browsing | Adaptive mosaic of destinations | Scroll, swipe, save, compare | Smart tiles w/ peek details, inline save |
| 3. Deep dive | Split-view destination detail | Timeline, Michelin context, map preview | Sticky action dock, story carousel |
| 4. Planning | Multi-day itinerary canvas | Drag destinations, auto-estimate budgets, invite friends | Timeline board, AI suggestions |
| 5. Reflection | Post-trip recap & stats | Upload photos, log notes, share summary | Memory reel, visited map |

## Detailed Steps
1. **Personalized Onboarding Layer**
   - When anonymous, ask 3-tap preference quiz (City vibe, Trip length, Budget).
   - For signed-in users, greet with streak badge, unfinished itinerary, and “Last searched topics.”
   - Instrument intent via Supabase `user_preferences` table; default to local storage for anonymous users.

2. **Contextual Explore Grid**
   - Replace uniform cards with **smart tiles** that show a hero image, Michelin icon, and a “peek panel” on hover/tap for highlights.
   - Sorting row includes: Trending, Michelin, Near you (MapKit + IP fallback), and “Saved Only.”
   - Infinite scroll grouped by editorial playlists (Weekend Classics, Street Food, Hidden Bars) fed from existing categories taxonomy.

3. **Right-Rail Story Drawer**
   - Clicking a tile opens a right-side drawer (desktop) or full-height sheet (mobile).
   - Drawer structure: hero slideshow → essentials (rating, stars, best season) → micro-itinerary (Morning/Afternoon/Night) → CTA cluster (“Add to plan”, “Mark visited”, “Ask AI about this”).
   - Keeps map context visible on larger screens.

4. **Plan Workspace**
   - Persistent floating “Plan” pill shows number of items in itinerary.
   - Tapping opens a canvas with three columns (Day 1/Day 2/Ideas). Drag destinations from a mini search, reorder, and let AI auto-fill gaps.
   - Integrates Supabase `visited_places` to show prior visits and avoid duplicates.

5. **Reflection Loop**
   - After marking a place visited, prompt to rate, add memory, and optionally share to the built-in journal.
   - Dashboard highlights “Cities unlocked,” “Michelin trail,” and shows AI-generated caption suggestions for sharing.

## Instrumentation & Success Metrics
- Funnel tracking: hero interactions → tile opens → plan additions → itinerary exports.
- Session checkpoints stored via `user_sessions` table (timestamp, intent tag, CTA clicked).
- Success metric targets:
  - +25% in destinations added per session.
  - 2× increase in itinerary saves week-over-week.
  - 40% of “mark visited” flows also capture a note or rating.

## Next Steps
1. Build Figma prototype reflecting new layout (split-view + plan canvas).
2. Update Supabase schema with `user_preferences` + `user_sessions` tables.
3. Ship experiment behind feature flag to validate uplift vs. current flow.
