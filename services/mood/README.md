# Discovery Mood System (Phase 4)

Context-aware destination discovery through mood-based filtering. Users select their current mood/intent and get recommendations that match not just their taste, but how they feel right now.

## 🎯 Overview

The Discovery Mood System adds contextual filtering to recommendations by:

- **18 Standardized Moods** organized into 4 categories
- **AI-Powered Mood Mapping** using Gemini to assign moods to destinations
- **Mood Compatibility Matrix** for related mood suggestions
- **Session Tracking** to learn user mood preferences over time
- **Flexible Filtering** with mood-first or taste-first approaches

## 🏗️ Architecture

```
┌─────────────────┐
│ User Selects    │
│ Mood ("Romantic")│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Mood Filter    │  ← Filters destinations by mood
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Destination     │  ← Destinations with mood mappings
│ Mood Mappings   │     (strength 0-1, confidence 0-1)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Mood Scoring    │  ← Direct match + compatibility bonus
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Combined Score  │  ← 60% taste + 40% mood (taste-first)
│                 │    OR 70% mood + 30% taste (mood-first)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Ranked Results  │
└─────────────────┘
```

## 📊 Mood Taxonomy

### Category 1: Energy Level
- **Energetic** ⚡ - High-energy, vibrant experiences
- **Relaxed** 🌊 - Calm, peaceful environments
- **Cozy** ☕ - Comfortable, warm atmospheres

### Category 2: Social Context
- **Romantic** 💕 - Date nights, intimate moments
- **Social** 🎉 - Group gatherings, making memories
- **Solo** 🧘 - Personal time, reflection
- **Family** 👨‍👩‍👧‍👦 - Family-friendly experiences

### Category 3: Exploration Style
- **Adventurous** 🗺️ - Completely new experiences
- **Curious** 🔍 - Discovery with familiarity
- **Familiar** 🏠 - Tried-and-true favorites

### Category 4: Purpose/Intent
- **Celebration** 🎊 - Special occasions
- **Working** 💼 - Productive environments
- **Exploring** 📸 - Tourist sightseeing
- **Local Vibes** 🌆 - Experience like a local

### Special Moods
- **Inspiring** ✨ - Creativity and inspiration
- **Nostalgic** 📜 - Reminds of good memories
- **Trendy** 🔥 - Popular and buzzing
- **Hidden Gem** 💎 - Off-the-beaten-path

## 🚀 Quick Start

### 1. Run Database Migration

```sql
-- In Supabase SQL Editor
-- Execute: migrations/012_mood_system.sql
```

This creates:
- `mood_taxonomy` - Mood definitions
- `destination_moods` - Mood mappings for destinations
- `user_mood_history` - User mood sessions
- `mood_compatibility` - Mood relationships

### 2. Map Destinations to Moods

```typescript
import { moodMapper } from '@/services/mood/mood-mapper'

// Map a single destination
const destination = await getDestination(123)
const mappings = await moodMapper.mapDestination(destination)
await moodMapper.saveMoodMappings(123, mappings)

// Batch map unmapped destinations
const unmapped = await moodMapper.getUnmappedDestinations(100)
await moodMapper.batchMapDestinations(unmapped)
```

### 3. Use in React Components

```tsx
import { MoodSelector } from '@/components/mood/MoodSelector'
import { MoodFilteredRecommendations } from '@/components/mood/MoodFilteredRecommendations'
import { useMoodSelector } from '@/hooks/useMoodFilter'

function DiscoveryPage() {
  const { selectedMood, selectMood } = useMoodSelector()

  return (
    <div>
      <MoodSelector
        selectedMood={selectedMood}
        onMoodSelect={selectMood}
      />

      <MoodFilteredRecommendations
        moodKey={selectedMood}
        limit={20}
      />
    </div>
  )
}
```

## 🔄 Workflow

### Step 1: Map Destinations to Moods

```typescript
import { moodMapper } from '@/services/mood/mood-mapper'

const destination = {
  id: 123,
  name: 'Romantic Rooftop Bar',
  category: 'bar',
  price_level: 3,
  tags: ['rooftop', 'intimate', 'views']
}

const mappings = await moodMapper.mapDestination(destination)

// Returns:
[
  { mood_key: 'romantic', strength: 0.9, confidence: 0.9 },
  { mood_key: 'energetic', strength: 0.7, confidence: 0.8 },
  { mood_key: 'social', strength: 0.6, confidence: 0.7 },
  { mood_key: 'trendy', strength: 0.8, confidence: 0.7 }
]
```

### Step 2: Filter Recommendations by Mood

```typescript
import { moodFilter } from '@/services/mood/mood-filter'
import { tasteMatcher } from '@/services/taste/matcher'

// Approach 1: Taste-first (start with taste matches, filter by mood)
const tasteMatches = await tasteMatcher.getCachedMatches(userId, 50)
const filtered = await moodFilter.filterByMood(userId, 'romantic', tasteMatches)

// Approach 2: Mood-first (start with mood matches, apply taste)
const moodMatches = await moodFilter.getMoodRecommendations(
  userId,
  'romantic',
  20,
  0.3 // 30% taste weight, 70% mood weight
)
```

### Step 3: Track Mood Session

```typescript
import { moodFilter } from '@/services/mood/mood-filter'
import { v4 as uuidv4 } from 'uuid'

const sessionId = uuidv4()

// Start session
await moodFilter.startMoodSession(userId, 'romantic', sessionId)

// User browses...
// Update session periodically
await moodFilter.updateMoodSession(sessionId, 15, 3) // 15 interactions, 3 saved
```

## 🧠 Mood Mapping Algorithm

### Heuristic Rules

```typescript
// Price level → Moods
price_level >= 4 → celebration (0.7), romantic (0.6)
price_level <= 2 → local_vibes (0.5)

// Category → Moods
bar/club → energetic (0.8), social (0.9)
cafe → cozy (0.8), working (0.6), solo (0.5)
museum → inspiring (0.9), curious (0.7)
park → relaxed (0.9), family (0.7)

// Tags → Moods
'romantic' → romantic (0.9)
'hidden' → hidden_gem (0.8), adventurous (0.6)
'trendy' → trendy (0.9)
'quiet' → relaxed (0.8), solo (0.6)
'family' → family (0.9)
```

### AI Enhancement

Uses Gemini to analyze destination attributes and assign moods:

```typescript
const prompt = `
Analyze this destination and assign appropriate moods (3-6 moods).

Destination:
- Name: ${name}
- Category: ${category}
- Tags: ${tags}

Available Moods: [list of 18 moods with descriptions]

Return JSON array with mood_key, strength (0-1), confidence (0-1), reasoning.
`
```

### Merging Strategy

```typescript
// If both heuristic and AI agree on a mood:
merged_strength = (heuristic_strength + ai_strength) / 2
merged_confidence = (heuristic_confidence + ai_confidence) / 2

// If only one source suggests a mood:
merged_strength = source_strength
merged_confidence = source_confidence
```

## 📈 Mood Scoring Algorithm

### Direct Match Score

```typescript
// Destination has this mood mapped
destination_moods.find(m => m.mood_key === selected_mood)?.strength || 0
```

### Compatibility Bonus

```typescript
// Add bonus from compatible moods
for each mood in destination_moods:
  if mood_compatibility[selected_mood][mood.mood_key] > 0:
    bonus += mood.strength * compatibility_score * 0.3

total_mood_score = min(direct_score + bonus, 1.0)
```

### Combined Score

**Taste-First Approach** (default for users with taste profiles):
```typescript
combined_score = taste_score * 0.6 + mood_score * 0.4
```

**Mood-First Approach** (for new users or exploratory browsing):
```typescript
combined_score = mood_score * 0.7 + taste_score * 0.3
```

## 🎨 UI Components

### MoodSelector

Full-featured mood selection interface:

```tsx
<MoodSelector
  selectedMood={selectedMood}
  onMoodSelect={handleSelect}
  className="mb-8"
/>
```

**Features:**
- Moods organized by category
- Expandable/collapsible categories
- Suggested moods based on history
- Color-coded mood cards
- Selected state indicator
- Mood descriptions on hover

### MoodFilteredRecommendations

Displays mood-filtered results:

```tsx
<MoodFilteredRecommendations
  moodKey="romantic"
  limit={20}
  approach="mood_first"
/>
```

**Features:**
- Loading skeletons
- Empty state
- Error handling with retry
- Overall match + mood score display
- Dimension score breakdown
- Session tracking integration

## 🔧 API Endpoints

### Get All Moods

```http
GET /api/mood/list
GET /api/mood/list?category=energy
GET /api/mood/list?user_id=uuid (includes suggestions)
```

**Response:**
```json
{
  "success": true,
  "moods_by_category": {
    "energy": [
      {
        "mood_key": "energetic",
        "mood_name": "Energetic",
        "mood_category": "energy",
        "description": "High-energy, vibrant experiences",
        "icon": "⚡",
        "color_scheme": {
          "primary": "#FF6B6B",
          "secondary": "#FFA07A"
        }
      }
    ]
  },
  "suggested_moods": ["romantic", "cozy"],
  "total_moods": 18
}
```

### Filter by Mood

```http
GET /api/mood/filter?user_id=uuid&mood=romantic&limit=20&approach=mood_first
```

**Response:**
```json
{
  "success": true,
  "mood": "romantic",
  "approach": "mood_first",
  "count": 20,
  "recommendations": [
    {
      "destination_id": 123,
      "overall_score": 0.87,
      "mood_score": 0.92,
      "mood_breakdown": {
        "romantic": 0.92,
        "cozy": 0.45
      },
      "dimension_scores": {
        "food": 0.85,
        "ambiance": 0.90,
        "price": 0.88,
        "adventure": 0.60,
        "culture": 0.70
      },
      "confidence": 0.80
    }
  ]
}
```

### Track Mood Session

```http
POST /api/mood/session
Content-Type: application/json

{
  "user_id": "uuid",
  "mood": "romantic",
  "session_id": "session-uuid"
}
```

```http
PUT /api/mood/session
Content-Type: application/json

{
  "session_id": "session-uuid",
  "interactions_count": 15,
  "saved_count": 3
}
```

## 📊 React Hooks

### useMoods

```typescript
const {
  moodsByCategory,  // Record<string, Mood[]>
  suggestedMoods,   // string[]
  isLoading,        // boolean
  error            // Error | null
} = useMoods()
```

### useMoodRecommendations

```typescript
const {
  recommendations,   // MoodFilteredRecommendation[]
  mood,             // string
  approach,         // 'mood_first' | 'taste_first'
  isLoading,        // boolean
  error,            // Error | null
  refresh,          // () => void
  trackInteraction, // () => void
  trackSaved,       // () => void
  sessionId        // string
} = useMoodRecommendations('romantic', 20, 'mood_first')
```

### useMoodSelector

```typescript
const {
  selectedMood,   // string | null
  moodHistory,    // string[]
  selectMood,     // (mood: string) => void
  clearMood      // () => void
} = useMoodSelector()
```

### useMoodMetadata

```typescript
const mood = useMoodMetadata('romantic')
// Returns: { mood_key, mood_name, description, icon, color_scheme, ... }
```

### useMoodColor

```typescript
const { primary, secondary } = useMoodColor('romantic')
// Returns: { primary: '#FF69B4', secondary: '#FFB6C1' }
```

## 💰 Cost Estimation

### Gemini API Usage

- **Model**: `gemini-1.5-flash`
- **Cost**: ~$0.00001 per destination mapping
- **Initial Mapping** (1000 destinations): ~$0.01
- **Incremental** (new destinations): ~$0.00001 each

### Storage

- **Mood Mappings**: ~200 bytes per destination-mood pair
- **1000 destinations × 4 moods avg**: ~800KB
- **User Mood History**: ~150 bytes per session
- **10,000 users × 50 sessions**: ~750KB

**Total for 10K users + 1K destinations**: ~1.5MB

## 🐛 Debugging

### Check Mood Mappings

```sql
-- View moods for a destination
SELECT
  dm.mood_key,
  mt.mood_name,
  dm.strength,
  dm.confidence
FROM destination_moods dm
JOIN mood_taxonomy mt ON dm.mood_key = mt.mood_key
WHERE dm.destination_id = 123
ORDER BY dm.strength DESC;
```

### View User Mood Preferences

```sql
SELECT * FROM get_user_mood_preferences('user_uuid');
```

### Test Mood Scoring

```sql
SELECT calculate_mood_score(123, 'romantic');
-- Returns mood score (0-1)
```

### Remap Destination

```typescript
// Force remap with AI
const destination = await getDestination(123)
const mappings = await moodMapper.mapDestination(destination)
await moodMapper.saveMoodMappings(123, mappings, 'ai')
```

## 🧪 Testing

### Test Mood Mapping

```typescript
test('maps romantic restaurant correctly', async () => {
  const destination = {
    id: 123,
    name: 'Candlelit Bistro',
    category: 'restaurant',
    price_level: 4,
    tags: ['romantic', 'intimate', 'fine-dining']
  }

  const mappings = await moodMapper.mapDestination(destination)

  expect(mappings).toContainEqual(
    expect.objectContaining({
      mood_key: 'romantic',
      strength: expect.any(Number)
    })
  )

  expect(mappings.find(m => m.mood_key === 'romantic')?.strength).toBeGreaterThan(0.7)
})
```

### Test Mood Filtering

```typescript
test('filters recommendations by mood', async () => {
  const recommendations = await moodFilter.getMoodRecommendations(
    'user_id',
    'romantic',
    10
  )

  expect(recommendations.length).toBeGreaterThan(0)
  expect(recommendations[0].mood_score).toBeGreaterThan(0.5)
})
```

## 📈 Performance

- **Mood Mapping** (per destination): ~600-900ms (Gemini API call)
- **Batch Mapping** (100 destinations): ~60-90s (with rate limiting)
- **Mood Filtering** (20 results): ~100-200ms (database queries)
- **Get All Moods**: ~50ms (cached in client)

### Optimization Strategies

1. **Precompute Mappings**: Map destinations in background job
2. **Cache Mood List**: Store in React state/SWR cache
3. **Lazy Loading**: Load recommendations on scroll
4. **Database Indexing**: Indexes on `destination_id`, `mood_key`, `strength`

## 🚦 Production Checklist

- [ ] Run database migration (012_mood_system.sql)
- [ ] Map existing destinations to moods
- [ ] Test mood filtering with sample users
- [ ] Verify mood scores are accurate
- [ ] Set up background job for new destination mapping
- [ ] Monitor Gemini API usage
- [ ] A/B test mood-first vs taste-first approaches
- [ ] Collect user feedback on mood accuracy

## 🔄 Update Frequency

**Mood Mappings:**
- **New Destinations**: Map immediately on creation
- **Existing Destinations**: Remap if tags/category change
- **Quality Check**: Monthly audit of low-confidence mappings

**User Mood Preferences:**
- **Real-time**: Track every mood session
- **Analysis**: Weekly aggregation for suggestions

## 📚 Next Steps

After Phase 4 is deployed:

- **Phase 5**: Cold-Start Solution (onboarding questionnaire)
- **Phase 6**: Weather Intelligence Integration
- **Phase 7**: Best Time to Visit Predictions

## 🤝 Integration with Other Phases

- **Phase 1**: Uses enriched_interactions for mood session tracking
- **Phase 2**: Combines with taste profiles for hybrid scoring
- **Phase 3**: Mood context added to explanations
- **Phase 5**: Mood preferences collected during onboarding
- **Phase 9**: Mood-based push notifications

## 💡 Tips & Best Practices

### 1. When to Use Mood-First vs Taste-First

**Mood-First** (70% mood, 30% taste):
- New users without taste profiles
- Exploratory browsing
- Special occasions
- Trying something different

**Taste-First** (60% taste, 40% mood):
- Users with strong taste profiles
- Regular browsing
- High confidence in preferences
- Familiar exploration

### 2. Mood Mapping Quality

```typescript
// Review low-confidence mappings
const lowConfidence = await supabase
  .from('destination_moods')
  .select('*')
  .lt('confidence', 0.5)

// Remap with AI for better accuracy
for (const mapping of lowConfidence) {
  await moodMapper.mapDestination(mapping.destination_id)
}
```

### 3. Personalize Suggested Moods

```typescript
// Show time-based suggestions
const currentHour = new Date().getHours()

const suggestedMood =
  currentHour >= 18 ? 'romantic' :    // Evening
  currentHour >= 12 ? 'social' :       // Afternoon
  currentHour >= 9 ? 'working' :       // Morning
  'relaxed'                            // Late night
```

### 4. Mood Transitions

```typescript
// Suggest opposite mood after browsing
const oppositeMood = await moodFilter.getMoodMetadata(
  currentMood.opposite_mood_key
)

// "Feeling energetic? Also try Relaxed vibes"
```

## 📝 License

Proprietary - Urban Manual
