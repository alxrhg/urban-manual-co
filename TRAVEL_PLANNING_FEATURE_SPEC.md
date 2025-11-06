# Smart Travel Planning Feature - Comprehensive Specification

## Vision
Create an **intelligent travel planning experience** that seamlessly blends user freedom (via Google Places) with curated recommendations, powered by AI to optimize routes, suggest complementary experiences, and adapt to context.

**Key Differentiator:** Not just drag-and-drop, but a **collaborative AI assistant** that understands intent, optimizes logistics, and surfaces serendipitous discoveries.

---

## Core Principles

1. **Hybrid Discovery**: Users can search **anywhere** (Google Places global), but we **intelligently promote** our curated destinations
2. **Context-Aware Intelligence**: Adapts to day of week, time of day, weather, user preferences, travel distances
3. **Effortless Optimization**: AI handles logistics (routing, timing, transitions) so users focus on experiences
4. **Progressive Enhancement**: Works as simple list, but gets smarter with every interaction
5. **Serendipity Engine**: Suggests unexpected but delightful experiences based on user patterns

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    SMART TRAVEL PLANNER UI                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Search Bar   │  │ Date Picker  │  │ Optimization Panel   │  │
│  │ (Hybrid)     │  │ (Multi-day)  │  │ (AI Controls)        │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │        Daily Timeline View (Visual Schedule)              │  │
│  │  8am ──── 10am ──── 12pm ──── 3pm ──── 6pm ──── 9pm      │  │
│  │    🏛️        🍽️        🎨        ☕        🍷             │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │        Smart Suggestions Sidebar (Context-Aware)          │  │
│  │  • Nearby lunch spots (based on current location)         │  │
│  │  • Evening activities (based on time)                     │  │
│  │  • Curated picks (from your database)                     │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────────────┐
│              INTELLIGENCE LAYER (Backend Services)                │
│                                                                   │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────────┐  │
│  │ Hybrid Search   │  │ Route Optimizer  │  │ Context Engine │  │
│  │ Engine          │  │ (Gemini AI)      │  │ (Time/Weather) │  │
│  └─────────────────┘  └──────────────────┘  └────────────────┘  │
│                                                                   │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────────┐  │
│  │ Suggestion      │  │ Travel Time      │  │ Budget         │  │
│  │ Generator       │  │ Calculator       │  │ Tracker        │  │
│  │ (Embeddings)    │  │ (Distance Matrix)│  │                │  │
│  └─────────────────┘  └──────────────────┘  └────────────────┘  │
└───────────────────────────────────────────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────────────┐
│                      DATA SOURCES                                 │
│  ┌──────────────────┐     ┌─────────────────────────────────┐    │
│  │ Curated Database │ >>> │ Google Places API (Global)      │    │
│  │ (Priority)       │     │ (Fallback/Extended Search)      │    │
│  └──────────────────┘     └─────────────────────────────────┘    │
└───────────────────────────────────────────────────────────────────┘
```

---

## Feature Components

### 1. **Hybrid Search System** 🔍

**Goal:** Seamlessly blend curated destinations with Google Places global search.

#### Search Flow:
```
User Types "coffee shop near Eiffel Tower"
    │
    ├─→ [Parallel Search]
    │   ├─→ Query our database (embeddings + filters)
    │   │   Result: 5 curated cafes (with enriched data)
    │   └─→ Query Google Places API
    │       Result: 20 nearby cafes (with ratings)
    │
    ├─→ [Scoring & Ranking]
    │   For each result:
    │   - Curated places: base_score = 100
    │   - Google Places: base_score = 50
    │   - Add: rating boost (0-20 points)
    │   - Add: distance penalty (-5 per km)
    │   - Add: user preference match (0-15 points)
    │   - Add: time-of-day relevance (0-10 points)
    │
    └─→ [Merged Results]
        Display: Top 10 blended results
        Badge: "Curated" vs "From Google Places"
```

#### Implementation:
```typescript
// New service: lib/services/intelligence/hybrid-search.ts
interface HybridSearchResult {
  id: string
  source: 'curated' | 'google_places'
  place: Destination | GooglePlace
  score: number
  badges: ('curated' | 'popular' | 'trending' | 'nearby')[]
  reasoning?: string // AI-generated explanation
}

async function hybridSearch(
  query: string,
  context: {
    location?: { lat: number; lng: number }
    userId?: string
    timeOfDay?: string
    currentItinerary?: ItineraryItem[]
  }
): Promise<HybridSearchResult[]>
```

**Smart Ranking Factors:**
- **Curation Boost**: +50 base points for database destinations
- **Rating Weight**: (rating / 5) * 20 points
- **Distance Decay**: -5 points per km from current location
- **User Affinity**: +15 if matches saved categories
- **Time Relevance**: +10 if open now
- **Complementarity**: +10 if complements itinerary (e.g., lunch suggestion when only activities exist)

---

### 2. **AI-Powered Route Optimizer** 🧠

**Goal:** Automatically arrange destinations in optimal order based on multiple factors.

#### Optimization Criteria:
1. **Geographic Efficiency**: Minimize backtracking
2. **Time Windows**: Respect opening hours, meal times, sunset/sunrise
3. **Energy Flow**: High-energy activities early, relaxing activities evening
4. **Category Balance**: Distribute food, culture, nature throughout day
5. **Transit Time**: Buffer 15-30 min between locations
6. **User Preferences**: Prioritize "must-visit" items

#### AI Prompt Strategy:
```typescript
// Use Gemini to arrange destinations
const prompt = `
You are a travel optimization expert. Arrange these destinations for ${date}:

Destinations:
${destinations.map((d, i) => `${i+1}. ${d.name} (${d.category}, rating: ${d.rating}, lat/lng: ${d.latitude},${d.longitude})`)}

Constraints:
- Start time: ${startTime}
- End time: ${endTime}
- Transportation: ${transportMode} (avg speed: ${speed} km/h)
- Meal times: Lunch 12-2pm, Dinner 7-9pm

User preferences:
- Must visit: ${mustVisit.join(', ')}
- Preferred categories: ${preferences.join(', ')}
- Energy level: ${energyLevel}

Optimize for:
1. Minimize travel time (penalize backtracking)
2. Respect opening hours
3. Balance activity intensity (high-energy → moderate → relaxing)
4. Ensure meal breaks at appropriate times
5. Add 15-20 min buffer between locations

Return a JSON array with:
[
  {
    "destination_id": "...",
    "order": 1,
    "suggested_time": "09:00",
    "duration_minutes": 90,
    "reasoning": "Start with museum before crowds",
    "travel_time_to_next": 15
  },
  ...
]
`;
```

#### User Controls:
```typescript
interface OptimizationPreferences {
  startTime: string // "09:00"
  endTime: string // "22:00"
  pacePreference: 'relaxed' | 'moderate' | 'packed' // affects visit durations
  priorityItems: string[] // destination IDs that must be included
  avoidCategories?: string[] // skip certain types
  transportMode: 'walking' | 'public_transit' | 'driving'
  includeMealBreaks: boolean
  bufferMinutes: number // 15-30 min between stops
}
```

---

### 3. **Context-Aware Suggestion Engine** 💡

**Goal:** Proactively suggest relevant additions based on real-time context.

#### Suggestion Triggers:

| Trigger | Suggestion Logic | Example |
|---------|-----------------|---------|
| **Gap Detection** | No lunch between 12-2pm | "Add a lunch spot? Here are 3 nearby options" |
| **Location Clustering** | 3+ destinations in same area | "While you're here, check out [nearby hidden gem]" |
| **Time Slot Available** | 2+ hour gap | "Fill this time? Suggested: coffee shop + walk" |
| **Category Imbalance** | All museums, no outdoor | "Balance with a park? Suggested: [park nearby]" |
| **Evening Open** | After 6pm with no plans | "Evening activities: rooftop bars, night markets" |
| **Weather Integration** | Rain forecasted | "Indoor alternatives: [museums, galleries, cafes]" |
| **Day-of-Week** | Monday (museums closed) | "Note: [2 destinations] closed Mondays. Replace?" |

#### Implementation:
```typescript
// New service: lib/services/intelligence/context-suggestions.ts
interface ContextSuggestion {
  trigger: string
  type: 'fill_gap' | 'nearby' | 'balance' | 'weather_alt' | 'closure_warning'
  priority: 'low' | 'medium' | 'high'
  suggestions: Destination[]
  reasoning: string
  actionText: string // "Add to itinerary" | "Replace closed item" | "See options"
}

async function generateContextSuggestions(
  itinerary: ItineraryItem[],
  date: Date,
  context: {
    weather?: WeatherForecast
    userPreferences?: UserProfile
  }
): Promise<ContextSuggestion[]>
```

---

### 4. **Smart Timeline View** 📅

**Goal:** Visual, intuitive daily schedule with drag-to-adjust and auto-recalculation.

#### UI Components:

```tsx
// New component: components/SmartTimelineView.tsx
<TimelineView date={date}>
  {/* Hour markers */}
  <TimeScale start="08:00" end="23:00" interval={1} />

  {/* Itinerary items as draggable blocks */}
  {optimizedItems.map(item => (
    <TimelineBlock
      key={item.id}
      startTime={item.suggested_time}
      duration={item.duration_minutes}
      destination={item.destination}
      onDragEnd={handleReoptimize}
      color={getCategoryColor(item.category)}
    >
      <ItemCard>
        <Image src={item.image} />
        <Title>{item.name}</Title>
        <Time>{item.suggested_time} - {calculateEndTime(item)}</Time>
        <TravelIndicator>
          🚶 {item.travel_time_to_next} min to next
        </TravelIndicator>
      </ItemCard>
    </TimelineBlock>
  ))}

  {/* Context suggestions in gaps */}
  {gaps.map(gap => (
    <SuggestionSlot time={gap.startTime} duration={gap.duration}>
      <SuggestButton onClick={() => showSuggestions(gap)}>
        + Add activity ({gap.duration} min available)
      </SuggestButton>
    </SuggestionSlot>
  ))}
</TimelineView>
```

#### Features:
- **Drag-to-reorder**: Auto-recalculates travel times
- **Duration adjustment**: Slide to extend/shorten visits
- **Gap highlighting**: Visual indicators for empty time slots
- **Travel time visualization**: Lines connecting destinations with walking/transit icons
- **Real-time totals**: Distance, cost, time summary at bottom

---

### 5. **Multi-Day Trip Planner** 🗓️

**Goal:** Extend single-day planning to multi-day trips with cross-day optimization.

#### Data Model Extension:
```typescript
// Extend existing Trip model
interface EnhancedTrip extends Trip {
  days: TripDay[]
  optimization_settings: OptimizationPreferences
  total_distance_km?: number
  total_budget?: number
  lodging?: {
    name: string
    address: string
    check_in: Date
    check_out: Date
  }
}

interface TripDay {
  date: Date
  itinerary_items: ItineraryItem[]
  notes?: string
  theme?: string // "Food Tour", "Museums Day", "Nature Day"
  is_optimized: boolean
}
```

#### Cross-Day Intelligence:
- **Geographic Clustering**: Group destinations by area across days
- **Pacing Analysis**: Alternate intense days with relaxed days
- **Accommodation-Aware**: Start/end each day near lodging
- **Weather-Adaptive**: Shuffle indoor/outdoor activities based on forecast
- **Day Themes**: Auto-suggest themes ("Foodie Monday", "Culture Tuesday")

---

### 6. **Budget & Logistics Tracker** 💰

**Goal:** Surface practical info (costs, reservations, closures) proactively.

#### Features:
```typescript
interface LogisticsInfo {
  // Cost estimates
  totalEstimatedCost: {
    admission: number
    meals: number
    transportation: number
    currency: string
  }

  // Reservations needed
  reservationRequired: {
    destination: Destination
    booking_url?: string
    urgency: 'required' | 'recommended' | 'optional'
    leadTime: string // "Book 2 weeks ahead"
  }[]

  // Closures & warnings
  alerts: {
    type: 'closed' | 'holiday' | 'construction' | 'weather'
    destination: Destination
    message: string
    severity: 'critical' | 'warning' | 'info'
    alternativeSuggestions?: Destination[]
  }[]

  // Transit passes
  transitRecommendations: {
    passType: string // "Paris Metro Day Pass"
    cost: number
    savings: number
    purchaseUrl: string
  }[]
}
```

#### UI Presentation:
- **Budget Bar**: Visual progress toward estimated total
- **Alert Badges**: Red dot on destinations requiring action
- **Smart Notifications**: "⚠️ Book [restaurant] now for Saturday"
- **Cost Breakdown**: Per-day and per-category summaries

---

### 7. **Collaborative Planning** 👥

**Goal:** Enable group trip planning with voting and preferences.

#### Features (Future Phase):
- **Invite Collaborators**: Share trip via link
- **Voting System**: Thumbs up/down on suggested destinations
- **Individual Preferences**: Each user sets dietary restrictions, mobility needs
- **Consensus Algorithm**: AI balances preferences across group
- **Chat Integration**: In-app discussion per destination

---

### 8. **Export & Sharing** 📤

**Goal:** Make itinerary portable and shareable.

#### Export Formats:
1. **PDF Itinerary**: Beautifully formatted day-by-day plan with maps
2. **Google Calendar**: Each destination as calendar event with location
3. **Apple Wallet**: Save as pass for offline access
4. **Link Sharing**: Public/private shareable URLs
5. **Mobile App** (future): Offline-first native app

---

## Technical Implementation Plan

### Phase 1: Foundation (Week 1-2)
- [ ] Enhance `ItineraryContext` to support multi-day trips
- [ ] Create `TripDay` model and database migrations
- [ ] Implement hybrid search service blending curated + Google Places
- [ ] Build search results ranking algorithm
- [ ] Add "source" badges to destination cards

### Phase 2: Intelligence Layer (Week 3-4)
- [ ] Build route optimizer using Gemini AI
- [ ] Integrate Google Distance Matrix API for travel times
- [ ] Implement context-aware suggestion engine
- [ ] Create gap detection and complementary suggestion logic
- [ ] Add weather API integration for adaptive suggestions

### Phase 3: UI/UX (Week 5-6)
- [ ] Design and build `SmartTimelineView` component
- [ ] Implement drag-and-drop with auto-reoptimization
- [ ] Create suggestion sidebar with contextual cards
- [ ] Build optimization controls panel
- [ ] Add budget tracker visualization

### Phase 4: Multi-Day & Logistics (Week 7-8)
- [ ] Extend UI to support multi-day planning
- [ ] Implement cross-day optimization
- [ ] Build logistics tracker (reservations, closures, costs)
- [ ] Add day theme suggestions
- [ ] Create alert system for time-sensitive actions

### Phase 5: Polish & Export (Week 9-10)
- [ ] Build PDF export with custom templates
- [ ] Implement calendar integration (Google/Apple)
- [ ] Create shareable public itinerary pages
- [ ] Add mobile-responsive optimizations
- [ ] Performance testing and caching strategy

---

## Key APIs & Services Needed

### New Integrations:
1. **Google Distance Matrix API**
   - Purpose: Calculate travel times between destinations
   - Endpoint: `https://maps.googleapis.com/maps/api/distancematrix/json`
   - Usage: Route optimization and time estimates

2. **Weather API** (OpenWeatherMap or WeatherAPI)
   - Purpose: Adaptive suggestions for rain/heat
   - Endpoint: `https://api.openweathermap.org/data/3.0/onecall`
   - Usage: Indoor/outdoor activity recommendations

3. **Opening Hours API** (Google Places)
   - Purpose: Validate itinerary against business hours
   - Already have: `opening_hours_json` field in database
   - Usage: Closure warnings and alternative suggestions

### Existing Services to Enhance:
1. **`lib/services/intelligence/itinerary.ts`** → Add route optimization
2. **`lib/services/intelligence/recommendations-advanced.ts`** → Add context-aware ranking
3. **`contexts/ItineraryContext.tsx`** → Support multi-day structure
4. **`types/destination.ts`** → Add `source` field for hybrid search

---

## Smart Features That Make It Unique

### 1. **Learning from User Behavior**
- Track which suggestions users accept/reject
- Adapt ranking weights over time
- Personalize optimization preferences

### 2. **Serendipity Moments**
- "Hidden gem nearby" suggestions (low-popularity, high-rating)
- "Locals favorite" badge for curated off-the-beaten-path spots
- "Only 10 min detour" nudges for unexpected discoveries

### 3. **Narrative Generation**
- AI-generated day summaries: "A day of art and gastronomy"
- Transition text: "After the museum, take a scenic 15-min walk along the river to lunch"
- Trip story export: Narrative PDF with photos and descriptions

### 4. **Adaptive Pacing**
- Detect over-scheduling (>8 hours of activities)
- Suggest downtime: "Add a 1-hour break at [nearby park]"
- Energy budgeting: Start with 100 energy points, track depletion

### 5. **Real-Time Replanning**
- "Running late?" button → Auto-adjust remaining schedule
- Skip destination → Regenerate optimal route
- Weather changed → Swap outdoor for indoor activities

---

## Success Metrics

### User Engagement:
- **Optimization Usage Rate**: % of itineraries that use AI optimization
- **Suggestion Acceptance Rate**: % of context suggestions added to itinerary
- **Multi-Day Trip Creation**: % of users creating >1 day trips
- **Completion Rate**: % of itineraries marked as "traveled"

### Intelligence Effectiveness:
- **Route Efficiency**: Average km saved vs. naive ordering
- **Time Accuracy**: Predicted vs. actual travel times (user feedback)
- **Gap Fill Rate**: % of detected gaps that get filled
- **Closure Avoidance**: % of closure conflicts prevented

### Business Impact:
- **Curated Discovery**: % of curated destinations in final itineraries
- **Booking Conversions**: Click-through rate on reservation links
- **Sharing Rate**: % of itineraries shared publicly
- **Return Usage**: % of users creating multiple trips

---

## Competitive Differentiation

| Competitor | Their Approach | Our Approach |
|------------|----------------|--------------|
| **Google Trips** (deprecated) | Simple lists, basic maps | AI-optimized, context-aware, curated focus |
| **TripAdvisor Trips** | Drag-and-drop, manual | Intelligent suggestions, auto-optimization |
| **Roadtrippers** | Route-centric for road trips | Experience-centric for city exploration |
| **Wanderlog** | Collaborative planning | AI-powered + curated recommendations |
| **Sygic Travel** | Offline maps focus | Real-time adaptive intelligence |

**Our Unique Value:**
> "The only travel planner that learns your style, optimizes logistics automatically, and surfaces curated local gems—all powered by AI that actually understands how people travel."

---

## Open Questions for User

1. **Curation Strategy**: How do you want to prioritize curated vs. Google Places?
   - Option A: Always show curated first, Google Places as "expand search"
   - Option B: Blend seamlessly with scoring, subtle badges
   - Option C: User toggle: "Curated only" vs "All results"

2. **Optimization Control**: How much control do users want?
   - Option A: "Magic button" → Fully automatic
   - Option B: "Suggest order" → Users approve before applying
   - Option C: Advanced mode with knobs for every parameter

3. **Monetization**: Premium features?
   - Option A: Free basic, paid for AI optimization & exports
   - Option B: Free for single-day, paid for multi-day
   - Option C: Commission on bookings (OpenTable, Resy, etc.)

4. **Mobile Strategy**: Web-first or native app?
   - Option A: PWA with offline support
   - Option B: React Native app later
   - Option C: Mobile-web only initially

---

## Next Steps

1. **Review & Prioritize**: Which phases resonate most?
2. **Technical Spike**: Test Distance Matrix API + Gemini optimization
3. **Design Mockups**: Visualize timeline UI and suggestion cards
4. **Data Validation**: Ensure database has needed fields (opening hours, coordinates)
5. **User Research**: Interview 5-10 users on travel planning pain points

---

**Ready to build something amazing!** 🚀

Let me know which aspects you'd like to dive deeper into, and we can start implementation planning.
