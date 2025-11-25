 # Urban Manual · End-to-End User Journey Redesign

 _Authored: 25 Nov 2025 · Owner: Product + Design · Scope: Web_

 ## 1. Objectives & Guardrails
 - **Reduce steps to core actions** (discover → evaluate → save/plan) from 6+ clicks to ≤3 on both desktop and mobile.
 - **Make the AI layer feel proactive** by surfacing intent shortcuts before the user types.
 - **Preserve the editorial, minimal aesthetic** (Lovably-inspired typography, glass panels) while adding structure.
 - **Instrument every phase** so we can track completion/drop-off for each journey.

 Success metrics:
 | Metric | Current Baseline | Target |
 | --- | --- | --- |
 | Destination detail open rate | 37% of feed impressions | 55%+ |
 | “Save” or “Add to trip” after viewing detail | 12% | 35% |
 | Trips created per activated user | 0.3 | 1.0 |
 | Return visits within 7 days | 28% | 45% |

 ---

 ## 2. Current Journey Snapshot (What we observed)
 1. **Search-first, linear homepage** – `Home` (`app/page.tsx`) wires dozens of dynamic sections and still expects users to start with freeform search before revealing structure. There is no explicit “What are you trying to do?” entry point.
 2. **Single CTA in navigation** – The header only shows the logo + account button (`components/Header.tsx`), forcing users to open drawers for every task.
 3. **Drawer maze** – `AccountDrawer` contains sub-drawers for saved, visited, trips, settings, etc., and the project currently allows different drawers to stack (`DRAWER_INVENTORY.md`). Users often lose context and need extra clicks to get back to the feed.
 4. **Trips hidden inside account** – Planning features (`components/TripsDrawer.tsx`, `components/TripPlanner.tsx`) sit behind drawers; nothing on the homepage points to itineraries until after someone signs in and finds the right drawer.
 5. **Map/List split feels optional** – `HomeMapSplitView` is rendered after users opt-in, meaning spatial context—crucial for travel planning—is buried.

 ---

 ## 3. North-Star Journey
 | Phase | User Goal | Primary Surfaces | Notes |
 | --- | --- | --- | --- |
 | 0. Intent Capture | Tell Urban Manual what I’m trying to do | Launch overlay (“Tonight”, “Weekend trip”, “Remote work week”, “Surprise me”), contextual greeting | Optional for returning users, mandatory for new sessions |
 | 1. Inspiration Feed | Skim a curated set of places w/ context | Hero feed, AI story tiles, “What people in _city_ are booking” rail | Replaces passive grid with goal-driven sections |
 | 2. Shortlist | Evaluate a destination quickly | Right-side detail panel, quick actions (Save, Add to Trip, Share, Chat) | Keep user anchored in feed; no modal takeover |
 | 3. Plan + Organize | Build or update itineraries/lists | Trip Workspace, List Builder, AI Sequencer | Persistent dock entry; drag into “My Trip” |
 | 4. Prep & Go | Know what’s next during travel | Day view, map route, Apple Wallet export | Stays available from floating dock |
 | 5. Reflect & Share | Update stats, share highlights | Account → Journeys view, achievements, export kit | Encourages retention post-trip |

 ---

 ## 4. Experience Architecture

 ```
 ┌───────────────┬─────────────────────┬─────────────────────┐
 │ Context Rail   │ Discovery Canvas    │ Action / Memory Hub │
 │ (intent chips, │ (cards, stories,    │ (detail drawer,     │
 │ filters, chat) │ map, sequences)     │ shortlist, trip dock)│
 └───────────────┴─────────────────────┴─────────────────────┘
 ```

 - **Left Rail (Context):** replaces the empty gutter with intent chips, saved searches, and AI prompts. Hooks into `GreetingHero` props (intent, achievements) so content is personalized without modal interruptions.
 - **Center Canvas (Discovery):** retains `UniversalGrid`, `SmartRecommendations`, `HomeMapSplitView`, but sequences them into thematic “chapters” that correspond to user intent (e.g., “Tonight in Tokyo”, “Finish your Paris list”).
 - **Right Hub (Action):** merges the destination drawer + trips drawer into a persistent action rail. Selecting a card animates its detail into the rail; primary actions remain visible when scrolling the feed.

 ---

 ## 5. Key Flows (Before vs. After)

 ### Flow A · “Find a dinner spot tonight”
 | Step | Current | Redesigned |
 | --- | --- | --- |
 | 1 | Hit homepage → manually type search intent | See hero question “What do we plan tonight?” + contextual chip |
 | 2 | Scroll 3–4 sections to find relevant list | Surface “Tonight near you” rail with 5 cards and map preview |
 | 3 | Click card → full drawer overlay | Open inline detail within action rail; `Save` + `Share` instantly available |
 | 4 | Save via account drawer | Action rail exposes “Add to Tonight list” without opening account |

 ### Flow B · “Plan a 3-day Lisbon trip”
 | Step | Current | Redesigned |
 | --- | --- | --- |
 | 1 | Learn about trips only after opening Account → Trips drawer | Floating “Trip Dock” button in header toggles the workspace |
 | 2 | Create trip in drawer; limited context | Trip Workspace opens as split view: itinerary timeline + map + AI suggestions |
 | 3 | Drag cards? currently not possible | Drag any card from discovery grid into days/slots; route preview updates live |
 | 4 | Export? hidden | Primary buttons: `Export to Wallet`, `Send to Calendar`, `Share link` anchored in workspace |

 ### Flow C · “Review my travel stats”
 | Step | Current | Redesigned |
 | --- | --- | --- |
 | 1 | Open Account drawer | Account button still opens drawer, but top tabs = Profile / Journeys / Lists / Settings |
 | 2 | Jump to visited via nested drawer | Dedicated “Journeys” tab shows map, timeline, achievements |
 | 3 | Share? not possible | Add Share kit + autop-generated summary copy |

 ---

 ## 6. Feature-Level Changes

 ### 6.1 Launchpad & Intent Capture
 - Replace default greeting with a **Goal Picker** (chips + inline input). Connect to `GreetingHero` to feed `onSubmit` with structured payload `{goal, city, timeRange}`.
 - Persist last 3 intents per user (Supabase table) and show as “Resume planning” cards.

 ### 6.2 Discovery Canvas Chapters
 - Convert the homepage into 4–6 **stacked sections**, each tied to a journey phase:
   1. “Continue your plan” (if existing trip is active)
   2. “Tonight / This weekend” based on location + `JourneyInsights`
   3. “Editors’ picks in city”
   4. “Map-first suggestions” (default to map split view)
   5. “AI says you might love…”
 - Each section ends with a micro-CTA (e.g., “Add all to list”, “Ask AI for alternatives”).

 ### 6.3 Action Rail (Destination + Planner)
 - Refactor `DestinationDrawer` into a **right rail** that stays docked on desktop and becomes a full-height slide on mobile.
 - Inline quick actions:
   - `Shortlist` (temporary collection synced to local storage/account)
   - `Add to Trip` (opens mini day picker)
   - `Share` (copy link + pass to Chat drawer)
   - `Chat about this place` (passes context to `ChatDrawer`)
 - When user opens the Trip workspace, the rail transforms into itinerary inspector (same surface, new content).

 ### 6.4 Trip Workspace
 - Promote `TripsDrawer` to a full page (`/trips`, server component) with persistent access via floating dock + header link.
 - Layout: day timeline (left), map (right), AI panel (bottom). Provide board view for collections.
 - Add “Auto-build day” button that calls `/api/trips/suggest` with current shortlist.

 ### 6.5 Global Dock & Drawer Rules
 - Introduce a **dock** (bottom on mobile, right on desktop) with 3 icons: Trips, Saved, Chat. Only these can open simultaneously; open one closes others.
 - Drawer context enforces single-open rule and remembers last state (solves overlapping overlays).
 - Move “Account” and “Settings” to header dropdown; keep dock focused on action surfaces.

 ### 6.6 Journeys & Memory
 - Account drawer becomes portal to `/account` page where:
   - Stats, achievements, map, timeline, photo journal live.
   - “Share my year in travel” generates summary + assets.
   - Collections/Lists graduate into shareable pages with cover art, tags, collaborator controls.

 ---

 ## 7. Implementation Plan

 | Phase | Timeline | Scope | Key Deliverables |
 | --- | --- | --- | --- |
 | 1. Foundation | Week 1 | Drawer state refactor, launchpad scaffolding | New DrawerController hook, dock component, intent schema |
 | 2. Discovery Canvas | Week 2 | Homepage restructuring | Chapterized layout, goal picker, map-first section |
 | 3. Action Rail & Trip Dock | Week 3 | Destination detail + Trip workspace | Unified rail component, `/trips` route, drag-to-trip |
 | 4. Journeys & Share Kit | Week 4 | Account revamp | `/account` page tabs, achievements, share exports |

 Cross-cutting tasks:
 - Instrumentation events per phase (`intent_selected`, `chapter_scrolled`, `destination_action`, `trip_day_updated`).
 - Responsive QA (desktop, tablet, small mobile).
 - Content design (microcopy for CTA, empty states).

 ---

 ## 8. Component Mapping & Ownership

 | Existing Component | Action | Owner |
 | --- | --- | --- |
 | `app/page.tsx` | Break into `LaunchpadSection`, `ChapterSection`, `ActionRailProvider`; lazy-load heavy rails | Web |
 | `components/Header.tsx` | Add navigation pills (“Discover”, “Trips”, “Journeys”), dock toggle, responsive layout | Web |
 | `contexts/DrawerContext.tsx` + `lib/stores/drawer-store.ts` | Support mutually exclusive drawers + dock metadata | Platform |
 | `src/features/detail/DestinationDrawer.tsx` | Convert to Action Rail, expose `children` slots for Trip workspace | Web |
 | `components/TripsDrawer.tsx` & `components/TripPlanner.tsx` | Promote to `/trips` route with server data fetching | Product |
 | `components/AccountDrawer.tsx` | Slim down to quick access; link to new `/account` | Account squad |

 ---

 ## 9. Telemetry & Experimentation
 - Add `journey_phase` dimension to every analytics event.
 - Run A/B on goal picker vs. current search hero; measure CTA clicks, search conversions.
 - Track dwell time in Action Rail vs. Destination Drawer baseline.
 - Heatmap the new dock on mobile to ensure reachability.

 ---

 ## 10. Next Steps Checklist
 - [ ] Sign off with Design on layout wireframes.
 - [ ] Create tickets for Drawer refactor + Goal picker (blocking).
 - [ ] Define Supabase schema for `user_intents`, `shortlists`, `journeys`.
 - [ ] Plan migration path: feature flags to enable per environment.
 - [ ] Usability test with 5 power users (remote) focusing on Trip Dock and Action Rail.

 ---

 _This document should be used as the blueprint for aligning design, product, and engineering on the UX overhaul. Update it as decisions are made or scope changes._ 

