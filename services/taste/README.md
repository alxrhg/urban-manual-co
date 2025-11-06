# Taste Profile ML Engine (Phase 2)

A multi-dimensional taste profiling system using OpenAI embeddings to create rich user preference models for personalized recommendations.

## 🎯 Overview

The Taste Profile ML Engine transforms raw interaction data from Phase 1 into rich, multi-dimensional taste profiles using:

- **Vector Embeddings** (384-dim) from OpenAI for food, ambiance, and culture
- **Behavioral Signals** extracted from user interactions
- **Multi-Dimensional Scoring** across 5 key dimensions
- **Similarity Matching** using cosine similarity for recommendations

## 🏗️ Architecture

```
┌──────────────────┐
│ User Interactions│
│   (Phase 1 Data) │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Signal Extractor │  ← Extracts behavioral patterns
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Embedding Gen.   │  ← OpenAI embeddings (384-dim)
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Taste Profile   │  ← 5 dimensions + embeddings
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Taste Matcher   │  ← Cosine similarity matching
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Recommendations  │
└──────────────────┘
```

## 📊 Taste Dimensions

### 1. Food Dimension (35% weight)
- **Embedding**: 384-dim vector from cuisine preferences
- **Scores**:
  - `michelin_affinity` (0-1) - Preference for Michelin-quality
  - `street_food_affinity` (0-1) - Casual/budget dining
  - `fine_dining_affinity` (0-1) - Upscale dining
  - `experimental_score` (0-1) - Traditional vs experimental

### 2. Ambiance Dimension (25% weight)
- **Embedding**: 384-dim vector from venue characteristics
- **Scores**:
  - `crowd_tolerance` (0-1) - Busy vs quiet preference
  - `formality_preference` (0-1) - Casual vs formal
  - `indoor_outdoor_ratio` (0-1) - Indoor vs outdoor
  - `modern_vs_historic` (0-1) - Modern vs historic

### 3. Price Dimension (20% weight)
- `avg_price_point` (1-4) - Average price level
- `price_variance` - Standard deviation
- `value_sensitivity` (0-1) - Price/quality importance
- `splurge_frequency` (0-1) - Occasional luxury frequency

### 4. Adventure Dimension (10% weight)
- `novelty_seeking` (0-1) - New vs familiar
- `tourist_vs_local` (-1 to 1) - Tourist vs local preference
- `spontaneity_score` (0-1) - Planned vs spontaneous
- `risk_tolerance` (0-1) - Experimental choices

### 5. Culture Dimension (10% weight)
- **Embedding**: 384-dim vector from cultural interests
- **Scores**:
  - `art_affinity` (0-1) - Art/gallery interest
  - `history_affinity` (0-1) - Historical sites
  - `architecture_affinity` (0-1) - Architecture interest

## 🚀 Quick Start

### 1. Run Database Migration

```sql
-- In Supabase SQL Editor
-- Execute: migrations/011_taste_profiles.sql
```

### 2. Add Environment Variable

```env
OPENAI_API_KEY=your_openai_api_key
```

### 3. Generate Taste Profile for User

```typescript
// API call
const response = await fetch('/api/taste/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ user_id: 'user_123' }),
})

const { profile } = await response.json()
```

### 4. Use in React Components

```tsx
import { useTasteProfile, useTasteRecommendations } from '@/hooks/useTasteProfile'

function MyComponent() {
  const { profile, generateProfile } = useTasteProfile()
  const { recommendations } = useTasteRecommendations(20)

  if (!profile) {
    return <button onClick={generateProfile}>Create Taste Profile</button>
  }

  return (
    <div>
      <h2>Your Taste Profile</h2>
      <p>Confidence: {Math.round(profile.confidence_score * 100)}%</p>
      <p>Interactions: {profile.interaction_count}</p>

      <h3>Top Cuisines:</h3>
      {Object.entries(profile.cuisine_preferences)
        .slice(0, 5)
        .map(([cuisine, count]) => (
          <div key={cuisine}>{cuisine}: {count}</div>
        ))}

      <h3>Recommendations:</h3>
      {recommendations.map(rec => (
        <div key={rec.destination_id}>
          Match: {Math.round(rec.overall_score * 100)}%
        </div>
      ))}
    </div>
  )
}
```

## 🔄 Workflow

### Step 1: Extract Signals

```typescript
import { tasteSignalExtractor } from '@/services/taste/signal-extractor'

const signals = await tasteSignalExtractor.extractSignals('user_id', 30) // Last 30 days

// Returns:
{
  cuisine_distribution: { "italian": 15, "japanese": 10 },
  price_distribution: { "2": 20, "3": 10 },
  avg_engagement_by_cuisine: { "italian": 0.8 },
  browsing_speed: 0.6,
  exploration_rate: 0.7,
  // ... more signals
}
```

### Step 2: Generate Embeddings

```typescript
import { tasteEmbeddingGenerator } from '@/services/taste/embedding-generator'

const profile = await tasteEmbeddingGenerator.generateTasteProfile('user_id', signals)

// Returns:
{
  user_id: 'user_id',
  food_embedding: [0.123, -0.456, ...], // 384 dimensions
  cuisine_preferences: { "italian": 15 },
  michelin_affinity: 0.7,
  avg_price_point: 2.8,
  novelty_seeking: 0.6,
  confidence_score: 0.75,
  // ... full profile
}
```

### Step 3: Calculate Matches

```typescript
import { tasteMatcher } from '@/services/taste/matcher'

const match = await tasteMatcher.calculateMatch('user_id', 123)

// Returns:
{
  overall_score: 0.85,
  dimension_scores: {
    food: 0.9,
    ambiance: 0.8,
    price: 0.95,
    adventure: 0.7,
    culture: 0.6,
  },
  confidence: 0.75,
  reasons: [
    "Cuisine aligns with your taste preferences",
    "Price point ($3) fits your typical budget",
  ]
}
```

## 📈 Confidence Score Calculation

Confidence increases logarithmically with interactions:

```typescript
confidence = log(interaction_count + 1) / log(100)
```

| Interactions | Confidence | Quality |
|-------------|-----------|---------|
| 5           | 0.35      | Low     |
| 10          | 0.50      | Medium  |
| 25          | 0.70      | Good    |
| 50          | 0.85      | High    |
| 100         | 0.95      | Very High |

**Minimum recommended**: 10 interactions for meaningful profiles

## 🔍 Signal Extraction Details

### Cuisine Distribution
Counts interactions per cuisine type, weighted by engagement score.

```typescript
{
  "italian": 15,
  "japanese": 10,
  "french": 8
}
```

### Price Distribution
Distribution of price levels (1-4) from interactions.

```typescript
{
  "1": 5,  // Budget
  "2": 20, // Moderate
  "3": 10, // Upscale
  "4": 2   // Fine dining
}
```

### Engagement Patterns
- **High Engagement Destinations**: engagement_score >= 0.7
- **Avg Engagement by Cuisine**: Mean engagement per cuisine
- **Browsing Speed**: Avg dwell time (normalized)
- **Exploration Rate**: Unique destinations / total interactions

### Temporal Patterns
- **Preferred Time of Day**: Top 2 periods (morning, lunch, afternoon, evening, night)
- **Preferred Day of Week**: Days with above-average activity

## 🎯 Matching Algorithm

### Overall Score Formula

```
overall_score =
  food_match × 0.35 +
  ambiance_match × 0.25 +
  price_match × 0.20 +
  adventure_match × 0.10 +
  culture_match × 0.10
```

### Dimension Matching

#### Food Match (70% embedding + 30% features)
```typescript
food_match =
  cosine_similarity(user.food_embedding, dest.food_embedding) × 0.7 +
  michelin_bonus × 0.2 +
  experimental_match × 0.1
```

#### Price Match (inverse distance)
```typescript
price_match = {
  1.0 if |user.price - dest.price| <= 1
  0.6 if |user.price - dest.price| == 2
  0.2 if |user.price - dest.price| >= 3
}
```

#### Ambiance Match (70% embedding + 30% formality)
```typescript
ambiance_match =
  cosine_similarity(user.ambiance_embedding, dest.ambiance_embedding) × 0.7 +
  (1 - |user.formality - dest.formality|) × 0.3
```

## 🔄 Taste Evolution Tracking

Take monthly snapshots to track taste changes:

```typescript
// Automatically triggered when profile is regenerated
{
  snapshot_date: '2025-01-01',
  taste_snapshot: { /* full profile */ },
  delta_novelty_seeking: +0.15, // Increased novelty seeking
  delta_price_point: -0.3,      // Moved to lower prices
  overall_change_magnitude: 0.25, // Euclidean distance
  insights: {
    shifts: ["Now prefers more casual dining"],
    stable: ["Still loves Italian cuisine"]
  }
}
```

## 📊 Database Schema

### `taste_profiles`
Main table storing user taste profiles.

```sql
CREATE TABLE taste_profiles (
  id UUID PRIMARY KEY,
  user_id UUID UNIQUE REFERENCES auth.users(id),

  -- Food dimension
  food_embedding vector(384),
  cuisine_preferences JSONB,
  michelin_affinity FLOAT,
  avg_price_point FLOAT,

  -- ... (see migration for full schema)

  confidence_score FLOAT,
  interaction_count INT,
  updated_at TIMESTAMP
);
```

### `taste_match_scores` (Cache)
Cached match scores with 7-day TTL.

```sql
CREATE TABLE taste_match_scores (
  user_id UUID,
  destination_id INT,
  overall_score FLOAT,
  food_match FLOAT,
  -- ... dimension scores
  expires_at TIMESTAMP,
  UNIQUE(user_id, destination_id)
);
```

## 🔧 API Endpoints

### Generate Taste Profile
```http
POST /api/taste/generate
Content-Type: application/json

{
  "user_id": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "profile": {
    "user_id": "uuid",
    "confidence_score": 0.75,
    "interaction_count": 42,
    "top_cuisines": [
      { "cuisine": "italian", "count": 15 },
      { "cuisine": "japanese", "count": 10 }
    ],
    "avg_price_point": 2.8,
    "novelty_seeking": 0.6
  }
}
```

### Get Match Score
```http
GET /api/taste/match?user_id=uuid&destination_id=123
```

**Response:**
```json
{
  "match": {
    "overall_score": 0.85,
    "dimension_scores": {
      "food": 0.9,
      "ambiance": 0.8,
      "price": 0.95,
      "adventure": 0.7,
      "culture": 0.6
    },
    "confidence": 0.75,
    "reasons": [
      "Cuisine aligns with your taste preferences",
      "Price point ($3) fits your typical budget"
    ]
  }
}
```

## 💰 Cost Estimation

### OpenAI Embeddings
- Model: `text-embedding-3-small` (384 dimensions)
- Cost: $0.00002 per 1K tokens
- Per profile generation: ~3 embedding calls = 300 tokens
- **Cost per profile**: ~$0.000006 (essentially free)

### Storage
- Vector storage: ~4.6KB per profile (3 × 384 × 4 bytes)
- For 10,000 users: ~46MB

## 🐛 Debugging

### Check if Profile Exists
```sql
SELECT * FROM taste_profiles WHERE user_id = 'uuid';
```

### View Top Matches
```sql
SELECT
  destination_id,
  overall_score,
  food_match,
  price_match
FROM taste_match_scores
WHERE user_id = 'uuid'
ORDER BY overall_score DESC
LIMIT 10;
```

### Check Interaction Count
```sql
SELECT COUNT(*) FROM enriched_interactions WHERE user_id = 'uuid';
```

### Regenerate Profile
```typescript
await fetch('/api/taste/generate', {
  method: 'POST',
  body: JSON.stringify({ user_id: 'uuid' }),
})
```

## 🧪 Testing

### Generate Test Profile
```typescript
// For user with 50+ interactions
const { profile } = await generateTasteProfile('test_user_id')

expect(profile.confidence_score).toBeGreaterThan(0.7)
expect(profile.food_embedding).toHaveLength(384)
expect(profile.avg_price_point).toBeGreaterThan(1)
expect(profile.avg_price_point).toBeLessThan(4)
```

### Test Matching
```typescript
const match = await tasteMatcher.calculateMatch('user_id', 123)

expect(match.overall_score).toBeGreaterThan(0)
expect(match.overall_score).toBeLessThan(1)
expect(match.dimension_scores.food).toBeDefined()
```

## 📊 Performance

- **Signal Extraction**: ~500ms (30 days of data)
- **Embedding Generation**: ~1-2s (3 OpenAI API calls)
- **Profile Save**: ~100ms
- **Match Calculation**: ~50ms per destination
- **Batch Matching** (100 destinations): ~5s

**Optimization**: Cache match scores for 7 days

## 🚦 Production Checklist

- [ ] Run database migration
- [ ] Add OpenAI API key
- [ ] Install required packages: `npm install openai`
- [ ] Test with 10+ user interactions
- [ ] Verify embeddings are generated
- [ ] Check match scores are calculated
- [ ] Set up cron job for profile updates
- [ ] Monitor OpenAI API usage

## 🔄 Update Frequency

**Recommended schedule:**
- **New users**: After 10 interactions
- **Active users**: Weekly
- **All users**: Monthly snapshot for evolution tracking

```typescript
// Cron job example (weekly updates)
// Schedule: 0 2 * * 0 (2 AM every Sunday)
```

## 📚 Next Steps

After Phase 2 is deployed:

- **Phase 3**: Explainable AI (generate reasons using Gemini)
- **Phase 4**: Discovery Mood System (filter by mood)
- **Phase 5**: Cold-Start Solution (onboarding questionnaire)

## 🤝 Integration with Other Phases

- **Phase 1**: Requires enriched_interactions data
- **Phase 3**: Provides match scores for explanation
- **Phase 5**: Bootstraps profiles from onboarding
- **Phase 11**: Visualizes taste profiles in dashboard

## 📝 License

Proprietary - Urban Manual
