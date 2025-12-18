# Trip-Native AI Architecture

## Vision

Transform Urban Manual's AI from a disconnected recommendation engine into a **trip-aware assistant** that:

- Knows where you're staying (hotel/accommodation)
- Understands your itinerary (what's planned, what's missing)
- Suggests contextually (near your hotel, fits your schedule)
- Can directly modify your trip (add, move, remove items)
- Remembers across sessions (your preferences, past trips)

## Current State vs Target State

```
CURRENT STATE (Disconnected)
┌─────────────────────────────────────────────────────────────┐
│ User: "I want dinner in Miami"                              │
│                                                             │
│ AI thinks: "User wants dinner in Miami"                     │
│ AI returns: [List of Miami restaurants]                     │
│                                                             │
│ ❌ Doesn't know: User is at Four Seasons                    │
│ ❌ Doesn't know: User likes steak                           │
│ ❌ Doesn't know: User has 7pm free on Thursday              │
│ ❌ Can't do: Add to trip automatically                      │
└─────────────────────────────────────────────────────────────┘

TARGET STATE (Trip-Native)
┌─────────────────────────────────────────────────────────────┐
│ User: "I want dinner in Miami"                              │
│                                                             │
│ AI thinks:                                                  │
│   - User staying at Four Seasons Miami Beach                │
│   - User has Thursday dinner slot open (7pm-9pm)            │
│   - User's taste: loves steak, prefers $$$, design-forward  │
│   - Four Seasons is in South Beach                          │
│   - Best steakhouses within 15min walk...                   │
│                                                             │
│ AI returns:                                                 │
│   "For Thursday dinner, I'd suggest Meat Market – it's a    │
│   10-minute walk from Four Seasons and known for their      │
│   dry-aged steaks. Want me to add it to your trip?"         │
│                                                             │
│   [Add to Thursday 7pm] [Show more options] [Different day] │
└─────────────────────────────────────────────────────────────┘
```

---

## Architecture Overview

### Data Flow (New)

```
┌──────────────────────────────────────────────────────────────────┐
│                         CLIENT                                   │
├─────────────────┬────────────────────┬──────────────────────────┤
│ TripBuilder     │ AI Chat            │ Destination Cards        │
│ Context         │ Component          │                          │
└────────┬────────┴─────────┬──────────┴──────────────────────────┘
         │                  │
         │ Syncs trip       │ Sends message + tripContext
         │ state            │
         ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    /api/smart-chat                              │
│                                                                 │
│ Request: {                                                      │
│   message: "I want dinner in Miami",                            │
│   sessionId: "xxx",                                             │
│   tripContext: {                          ← NEW                 │
│     tripId: "trip_123",                                         │
│     accommodationSlug: "four-seasons-miami",                    │
│     accommodationCoords: { lat: 25.79, lng: -80.13 },           │
│     dates: { start: "2024-03-15", end: "2024-03-18" },          │
│     itinerary: [                                                │
│       { day: 1, time: "19:00", slug: null, type: "gap" },       │
│       { day: 2, time: "12:00", slug: "zuma-miami", ... },       │
│     ],                                                          │
│     scheduleGaps: [                                             │
│       { day: 1, slot: "dinner", start: "19:00", end: "21:00" }, │
│     ]                                                           │
│   }                                                             │
│ }                                                               │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│              UNIFIED INTELLIGENCE CORE                          │
│                                                                 │
│ Enriches context with:                                          │
│ - Taste fingerprint (from user history)                         │
│ - Accommodation details (from destinations table)               │
│ - Weather for trip dates                                        │
│ - Local events during trip                                      │
│ - Cross-session memory                                          │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│              SMART CONVERSATION ENGINE                          │
│                                                                 │
│ Enhanced prompt includes:                                       │
│ - "User staying at Four Seasons Miami Beach (South Beach)"      │
│ - "Open slots: Thu dinner 7-9pm, Fri lunch 12-2pm"              │
│ - "User preferences: steakhouses, $$$, design-conscious"        │
│ - "Already planned: Zuma for Fri lunch"                         │
│                                                                 │
│ Search ranking factors:                                         │
│ - Distance from accommodation (weighted)                        │
│ - Fits available time slot                                      │
│ - Matches taste profile                                         │
│ - Complements existing itinerary                                │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│              RESPONSE + EXECUTABLE ACTIONS                      │
│                                                                 │
│ {                                                               │
│   content: "For Thursday dinner, I'd suggest Meat Market...",   │
│   destinations: [...],                                          │
│   executableActions: [                      ← NEW               │
│     {                                                           │
│       type: "add_to_trip",                                      │
│       label: "Add to Thursday 7pm",                             │
│       params: {                                                 │
│         tripId: "trip_123",                                     │
│         destinationSlug: "meat-market-miami",                   │
│         day: 1,                                                 │
│         timeSlot: "19:00"                                       │
│       }                                                         │
│     }                                                           │
│   ],                                                            │
│   tripAwareness: {                          ← NEW               │
│     suggestedForSlot: { day: 1, slot: "dinner" },               │
│     distanceFromHotel: "10 min walk",                           │
│     fitsSchedule: true                                          │
│   }                                                             │
│ }                                                               │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT                                   │
│                                                                 │
│ User clicks "Add to Thursday 7pm"                               │
│         │                                                       │
│         ▼                                                       │
│ POST /api/trips/[tripId]/items                                  │
│ { destinationSlug, day, timeSlot }                              │
│         │                                                       │
│         ▼                                                       │
│ TripBuilderContext.addToTrip() called                           │
│ UI updates immediately                                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Model Changes

### 1. Trips Table Enhancement

```sql
-- Migration: Add accommodation support to trips
ALTER TABLE trips ADD COLUMN IF NOT EXISTS accommodation_destination_id INTEGER REFERENCES destinations(id);
ALTER TABLE trips ADD COLUMN IF NOT EXISTS accommodation_slug TEXT;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS accommodation_checkin TIME;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS accommodation_checkout TIME;

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_trips_accommodation ON trips(accommodation_destination_id);
```

### 2. New Types

```typescript
// types/trip.ts - Enhanced

export interface TripAccommodation {
  destinationId?: number;
  slug: string;
  name: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  neighborhood?: string;
  checkinTime?: string;  // "15:00"
  checkoutTime?: string; // "11:00"
}

export interface TripContext {
  tripId: string;
  title: string;
  city: string;
  dates: {
    start: string;  // ISO date
    end: string;
  };
  accommodation?: TripAccommodation;
  itinerary: ItineraryItem[];
  scheduleGaps: ScheduleGap[];
  travelers: number;
}

export interface ScheduleGap {
  day: number;
  date: string;
  slot: 'breakfast' | 'morning' | 'lunch' | 'afternoon' | 'dinner' | 'evening';
  startTime: string;
  endTime: string;
  duration: number; // minutes
}

export interface ItineraryItem {
  id: string;
  day: number;
  timeSlot: string;
  destinationSlug: string;
  destinationName: string;
  category: string;
  duration: number;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}
```

### 3. Enhanced ActiveTripContext (Unified Intelligence Core)

```typescript
// services/intelligence/unified-intelligence-core.ts

export interface ActiveTripContext {
  id: string;
  name: string;
  destinations: string[];  // city names
  startDate?: string;
  endDate?: string;

  // NEW: Accommodation awareness
  accommodation?: {
    slug: string;
    name: string;
    coordinates: { lat: number; lng: number };
    neighborhood?: string;
    checkinTime?: string;
    checkoutTime?: string;
  };

  // Enhanced itinerary
  itineraryItems: ItineraryItemContext[];

  // NEW: Calculated gaps
  scheduleGaps: ScheduleGap[];

  // NEW: Trip metadata
  travelers: number;
  tripStyle?: string[];  // ['food', 'architecture', 'nightlife']
}
```

---

## API Changes

### 1. Smart Chat Endpoint Enhancement

```typescript
// app/api/smart-chat/route.ts

interface SmartChatRequest {
  message: string;
  sessionId?: string;
  includeProactiveActions?: boolean;
  maxDestinations?: number;

  // NEW: Trip context
  tripContext?: {
    tripId: string;
    accommodationSlug?: string;
    dates?: { start: string; end: string };
    currentDay?: number;  // Which day of trip user is on/planning
    scheduleGaps?: ScheduleGap[];
  };
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { message, sessionId, tripContext } = body;

  // If tripContext provided, enrich it
  let enrichedTripContext = null;
  if (tripContext?.tripId) {
    enrichedTripContext = await enrichTripContext(tripContext);
  }

  const response = await smartConversationEngine.processMessage(message, {
    sessionId,
    tripContext: enrichedTripContext,
    // ... other options
  });

  return NextResponse.json(response);
}

async function enrichTripContext(tripContext: TripContext) {
  const supabase = createServerClient();

  // Get full trip with accommodation
  const { data: trip } = await supabase
    .from('trips')
    .select(`
      *,
      accommodation:destinations!accommodation_destination_id(
        slug, name, latitude, longitude, neighborhood
      ),
      itinerary_items(*)
    `)
    .eq('id', tripContext.tripId)
    .single();

  // Calculate schedule gaps
  const scheduleGaps = calculateScheduleGaps(trip);

  return {
    ...tripContext,
    accommodation: trip?.accommodation,
    itinerary: trip?.itinerary_items,
    scheduleGaps,
  };
}
```

### 2. New Trip Modification Endpoint

```typescript
// app/api/trips/[tripId]/items/route.ts

export async function POST(
  request: NextRequest,
  { params }: { params: { tripId: string } }
) {
  const body = await request.json();
  const { destinationSlug, day, timeSlot, duration } = body;

  // Verify user owns trip
  const user = await getUser(request);
  const trip = await verifyTripOwnership(params.tripId, user.id);

  // Get destination details
  const destination = await getDestinationBySlug(destinationSlug);

  // Calculate order index
  const orderIndex = await getNextOrderIndex(params.tripId, day);

  // Insert item
  const { data: item } = await supabase
    .from('itinerary_items')
    .insert({
      trip_id: params.tripId,
      destination_slug: destinationSlug,
      day,
      time: timeSlot,
      order_index: orderIndex,
      duration: duration || getEstimatedDuration(destination.category),
      title: destination.name,
    })
    .select()
    .single();

  return NextResponse.json({ success: true, item });
}
```

### 3. Set Accommodation Endpoint

```typescript
// app/api/trips/[tripId]/accommodation/route.ts

export async function PUT(
  request: NextRequest,
  { params }: { params: { tripId: string } }
) {
  const body = await request.json();
  const { destinationSlug, checkinTime, checkoutTime } = body;

  // Get destination ID
  const { data: destination } = await supabase
    .from('destinations')
    .select('id')
    .eq('slug', destinationSlug)
    .single();

  // Update trip
  await supabase
    .from('trips')
    .update({
      accommodation_destination_id: destination?.id,
      accommodation_slug: destinationSlug,
      accommodation_checkin: checkinTime,
      accommodation_checkout: checkoutTime,
    })
    .eq('id', params.tripId);

  return NextResponse.json({ success: true });
}
```

---

## Prompt Engineering

### Enhanced System Prompt

```typescript
// services/intelligence/prompts/trip-aware-prompt.ts

export function buildTripAwarePrompt(context: {
  tripContext?: ActiveTripContext;
  tasteFingerprint?: TasteFingerprint;
  userMessage: string;
}) {
  const { tripContext, tasteFingerprint, userMessage } = context;

  let tripSection = '';

  if (tripContext) {
    tripSection = `
## ACTIVE TRIP CONTEXT

The user is planning/on a trip:
- **Trip**: ${tripContext.name}
- **Destination**: ${tripContext.destinations.join(', ')}
- **Dates**: ${tripContext.startDate} to ${tripContext.endDate}
- **Travelers**: ${tripContext.travelers}

${tripContext.accommodation ? `
### Accommodation
- **Staying at**: ${tripContext.accommodation.name}
- **Location**: ${tripContext.accommodation.neighborhood || 'N/A'}
- **Coordinates**: ${tripContext.accommodation.coordinates.lat}, ${tripContext.accommodation.coordinates.lng}
- **Check-in**: ${tripContext.accommodation.checkinTime || '15:00'}
- **Check-out**: ${tripContext.accommodation.checkoutTime || '11:00'}

When suggesting places, ALWAYS consider proximity to their hotel. Mention walking/travel time.
` : ''}

### Current Itinerary
${tripContext.itineraryItems.length > 0
  ? tripContext.itineraryItems.map(item =>
      `- Day ${item.day}, ${item.timeSlot}: ${item.destinationName} (${item.category})`
    ).join('\n')
  : 'No items planned yet.'
}

### Schedule Gaps (Available Slots)
${tripContext.scheduleGaps.length > 0
  ? tripContext.scheduleGaps.map(gap =>
      `- Day ${gap.day} (${gap.date}): ${gap.slot} slot open (${gap.startTime}-${gap.endTime})`
    ).join('\n')
  : 'Schedule is full.'
}

**IMPORTANT**: When user asks for recommendations, prioritize filling these gaps. Suggest specific times.
`;
  }

  const tasteSection = tasteFingerprint ? `
## USER TASTE PROFILE

${tasteFingerprint.pricePreference ? `- Price preference: ${tasteFingerprint.pricePreference}` : ''}
${tasteFingerprint.categoryAffinities ? `- Favorite categories: ${Object.entries(tasteFingerprint.categoryAffinities)
  .filter(([_, score]) => score > 0.5)
  .map(([cat, _]) => cat)
  .join(', ')}` : ''}
${tasteFingerprint.designSensitivity > 0.7 ? '- Highly design-conscious, appreciates architecture' : ''}
${tasteFingerprint.adventurousness > 0.7 ? '- Adventurous, likes discovering hidden gems' : ''}
${tasteFingerprint.adventurousness < 0.3 ? '- Prefers reliable, well-reviewed spots' : ''}
` : '';

  return `
You are the Urban Manual AI assistant - a knowledgeable, design-savvy travel concierge.

${tripSection}

${tasteSection}

## RESPONSE GUIDELINES

1. **Be trip-aware**: Reference their hotel, existing plans, and open time slots
2. **Be specific about timing**: "This would be perfect for your Thursday dinner slot"
3. **Mention proximity**: "It's a 10-minute walk from Four Seasons"
4. **Suggest actionable additions**: Offer to add items to specific days/times
5. **Consider flow**: Suggest things that make sense sequentially (don't suggest Wynwood after dinner in South Beach)
6. **Be concise**: 2-3 sentences max for the response, let the destinations speak

## USER MESSAGE
${userMessage}
`;
}
```

### Distance-Aware Ranking

```typescript
// services/intelligence/trip-aware-ranking.ts

export function rankDestinationsForTrip(
  destinations: Destination[],
  tripContext: ActiveTripContext,
  intent: QueryIntent
): RankedDestination[] {
  return destinations.map(dest => {
    let score = dest.baseScore || 0.5;
    const factors: RankingFactor[] = [];

    // Factor 1: Distance from accommodation
    if (tripContext.accommodation && dest.latitude && dest.longitude) {
      const distance = calculateDistance(
        tripContext.accommodation.coordinates,
        { lat: dest.latitude, lng: dest.longitude }
      );
      const walkingTime = estimateWalkingTime(distance);

      if (walkingTime <= 10) {
        score += 0.15;
        factors.push({
          type: 'proximity',
          description: `${walkingTime} min walk from hotel`,
          strength: 'strong'
        });
      } else if (walkingTime <= 20) {
        score += 0.08;
        factors.push({
          type: 'proximity',
          description: `${walkingTime} min walk from hotel`,
          strength: 'moderate'
        });
      }
    }

    // Factor 2: Fits schedule gap
    if (tripContext.scheduleGaps.length > 0) {
      const fittingGap = findFittingGap(dest, tripContext.scheduleGaps, intent);
      if (fittingGap) {
        score += 0.12;
        factors.push({
          type: 'schedule',
          description: `Perfect for ${fittingGap.slot} on Day ${fittingGap.day}`,
          strength: 'strong'
        });
      }
    }

    // Factor 3: Complements existing itinerary
    const complementScore = calculateComplementScore(dest, tripContext.itineraryItems);
    score += complementScore * 0.1;

    // Factor 4: Neighborhood clustering
    const neighborhoodMatch = checkNeighborhoodClustering(dest, tripContext);
    if (neighborhoodMatch) {
      score += 0.08;
      factors.push({
        type: 'neighborhood',
        description: `In ${neighborhoodMatch.neighborhood}, near your other plans`,
        strength: 'moderate'
      });
    }

    return {
      destination: dest,
      score,
      factors,
      suggestedSlot: findBestSlot(dest, tripContext.scheduleGaps),
      distanceFromHotel: tripContext.accommodation
        ? calculateDistanceString(tripContext.accommodation.coordinates, dest)
        : null
    };
  }).sort((a, b) => b.score - a.score);
}
```

---

## Client Integration

### 1. Pass Trip Context to Chat

```typescript
// components/AISearchChat.tsx (or wherever chat is)

function AISearchChat() {
  const { activeTrip } = useTripBuilder();

  const sendMessage = async (message: string) => {
    // Build trip context from active trip
    const tripContext = activeTrip ? {
      tripId: activeTrip.id,
      accommodationSlug: activeTrip.accommodation?.slug,
      dates: {
        start: activeTrip.startDate,
        end: activeTrip.endDate,
      },
      scheduleGaps: calculateClientSideGaps(activeTrip),
    } : undefined;

    const response = await fetch('/api/smart-chat', {
      method: 'POST',
      body: JSON.stringify({
        message,
        sessionId,
        tripContext,  // <- NEW
      }),
    });

    // ... handle response
  };
}
```

### 2. Handle Executable Actions

```typescript
// components/chat/ExecutableActions.tsx

interface ExecutableAction {
  type: 'add_to_trip' | 'set_accommodation' | 'remove_from_trip' | 'move_item';
  label: string;
  params: Record<string, any>;
}

function ExecutableActions({ actions }: { actions: ExecutableAction[] }) {
  const { addToTrip, setAccommodation } = useTripBuilder();

  const executeAction = async (action: ExecutableAction) => {
    switch (action.type) {
      case 'add_to_trip':
        // Call API
        await fetch(`/api/trips/${action.params.tripId}/items`, {
          method: 'POST',
          body: JSON.stringify({
            destinationSlug: action.params.destinationSlug,
            day: action.params.day,
            timeSlot: action.params.timeSlot,
          }),
        });
        // Update local state
        addToTrip(action.params.destination, action.params.day, action.params.timeSlot);
        break;

      case 'set_accommodation':
        await fetch(`/api/trips/${action.params.tripId}/accommodation`, {
          method: 'PUT',
          body: JSON.stringify({
            destinationSlug: action.params.destinationSlug,
          }),
        });
        setAccommodation(action.params.destination);
        break;
    }
  };

  return (
    <div className="flex gap-2 mt-3">
      {actions.map((action, i) => (
        <button
          key={i}
          onClick={() => executeAction(action)}
          className="px-3 py-1.5 bg-black text-white text-sm rounded-full hover:bg-gray-800"
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
```

### 3. Enhanced TripBuilderContext

```typescript
// contexts/TripBuilderContext.tsx - additions

interface TripBuilderContextType {
  // ... existing

  // NEW: Accommodation management
  accommodation: TripAccommodation | null;
  setAccommodation: (destination: Destination) => Promise<void>;
  clearAccommodation: () => void;

  // NEW: Gap calculation
  getScheduleGaps: () => ScheduleGap[];

  // NEW: Trip context for AI
  getTripContextForAI: () => TripContext | null;
}

// Implementation
const setAccommodation = async (destination: Destination) => {
  if (!activeTrip?.id) return;

  // Update server
  await fetch(`/api/trips/${activeTrip.id}/accommodation`, {
    method: 'PUT',
    body: JSON.stringify({ destinationSlug: destination.slug }),
  });

  // Update local state
  setActiveTrip(prev => ({
    ...prev,
    accommodation: {
      slug: destination.slug,
      name: destination.name,
      coordinates: {
        latitude: destination.latitude,
        longitude: destination.longitude,
      },
      neighborhood: destination.neighborhood,
    },
  }));
};

const getTripContextForAI = (): TripContext | null => {
  if (!activeTrip) return null;

  return {
    tripId: activeTrip.id,
    title: activeTrip.title,
    city: activeTrip.city,
    dates: {
      start: activeTrip.startDate,
      end: activeTrip.endDate,
    },
    accommodation: activeTrip.accommodation,
    itinerary: flattenItinerary(activeTrip.days),
    scheduleGaps: calculateScheduleGaps(activeTrip),
    travelers: activeTrip.travelers,
  };
};
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Database migration: Add accommodation fields to trips
- [ ] Update TripBuilderContext with accommodation support
- [ ] Create `/api/trips/[tripId]/accommodation` endpoint
- [ ] Add `getTripContextForAI()` helper

### Phase 2: API Integration (Week 2)
- [ ] Update `/api/smart-chat` to accept tripContext
- [ ] Implement `enrichTripContext()` server-side
- [ ] Add schedule gap calculation
- [ ] Update Unified Intelligence Core types

### Phase 3: Prompt Engineering (Week 2-3)
- [ ] Create trip-aware prompt template
- [ ] Implement distance-aware ranking
- [ ] Add proximity calculations
- [ ] Test with various scenarios

### Phase 4: Executable Actions (Week 3)
- [ ] Define ExecutableAction types
- [ ] Create `/api/trips/[tripId]/items` endpoint
- [ ] Build ExecutableActions component
- [ ] Wire up TripBuilderContext handlers

### Phase 5: Client Integration (Week 4)
- [ ] Update AISearchChat to pass tripContext
- [ ] Add action buttons to chat responses
- [ ] Sync trip state after actions
- [ ] Handle optimistic updates

### Phase 6: Polish & Edge Cases (Week 4)
- [ ] Handle no-trip scenarios gracefully
- [ ] Add loading states for actions
- [ ] Error handling and rollback
- [ ] Test multi-city trips

---

## Example Interactions

### Scenario 1: Dinner Recommendation

**User**: "I want dinner tonight"

**AI Context**:
- Trip: "Miami Weekend"
- Accommodation: Four Seasons Miami Beach
- Today: Day 2 (Saturday)
- Dinner slot: Open (19:00-21:00)
- Taste: Steakhouses, $$$, design-conscious

**AI Response**:
> For tonight's dinner, I'd recommend **Meat Market** in South Beach. It's a 10-minute walk from Four Seasons, and their dry-aged ribeye is outstanding. The industrial-chic space should appeal to your design sensibility.
>
> [Add to Saturday 7pm] [Show more options]

### Scenario 2: Fill My Day

**User**: "What should I do tomorrow afternoon?"

**AI Context**:
- Trip: "Tokyo Design Tour"
- Accommodation: Aman Tokyo (Otemachi)
- Tomorrow: Day 3, Lunch at Sushi Saito (12:00), Dinner open
- Afternoon gap: 14:00-18:00
- Taste: Architecture, museums, quiet spaces

**AI Response**:
> After lunch at Sushi Saito, head to **21_21 Design Sight** in Roppongi – it's a stunning Tadao Ando building with a great current exhibition. Then walk through Midtown Garden to **The National Art Center** (another architectural gem by Kisho Kurokawa). Both fit perfectly in your 2-6pm window.
>
> [Add 21_21 at 2pm] [Add National Art Center at 4pm] [Different suggestions]

### Scenario 3: Set Hotel

**User**: "I'm staying at the Ace Hotel in Kyoto"

**AI Response**:
> Got it! I've set **Ace Hotel Kyoto** as your accommodation. It's in a beautifully converted 1920s telephone exchange building in Karasuma – great central location for exploring.
>
> Want me to suggest some spots within walking distance for your first evening?
>
> [Yes, dinner nearby] [Show the area] [I'll browse myself]

---

## Success Metrics

1. **Trip Context Utilization**: % of chat responses that reference trip details
2. **Action Completion Rate**: % of suggested actions (add to trip) that users execute
3. **Schedule Fit**: % of recommendations that fit user's open time slots
4. **Proximity Relevance**: Average distance of suggestions from accommodation
5. **Conversation Depth**: Average turns per planning session (should increase)
