# Explainable AI Recommendation System (Phase 3)

AI-powered recommendation explanations using Google Gemini to generate human-readable reasons why destinations match user preferences.

## 🎯 Overview

The Explainable AI system transforms opaque match scores from Phase 2 into transparent, trustworthy recommendations by:

- **AI-Generated Reasons** using Gemini 1.5 Flash for natural language explanations
- **Evidence Collection** from user history, destination attributes, and social signals
- **Visual Explanations** with React components and Framer Motion animations
- **Transparency** showing contribution scores and confidence levels

## 🏗️ Architecture

```
┌─────────────────┐
│  Taste Matcher  │  ← Phase 2: Match scores
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Explainable   │  ← Extract basic reasons
│   Recommender   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Gemini API     │  ← Generate AI reasons (2-3 per match)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Evidence       │  ← Collect supporting data
│  Generator      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Ranked Reasons │  ← Top 4 reasons + evidence
└─────────────────┘
```

## 📊 Reason Types

### 1. Taste Match
- **Cuisine Match**: Alignment with user's preferred cuisines
- **Price Fit**: Matches user's typical budget
- **Ambiance**: Atmosphere suits user's style
- **Discovery Factor**: Novelty level matches adventure preference

### 2. Social Proof
- **Popularity**: Save counts from other users
- **Trending**: Recently popular destinations

### 3. Timing
- **Seasonal**: Best season to visit
- **Current Events**: Relevant ongoing events

### 4. Location
- **Proximity**: Close to user's location or saved places
- **Neighborhood**: In preferred areas

### 5. Similar to Liked
- **Past Favorites**: Similar to previously saved destinations
- **Cuisine Consistency**: Matches frequent cuisine choices

## 🚀 Quick Start

### 1. Add Environment Variable

```env
GOOGLE_AI_API_KEY=your_gemini_api_key
```

Get your API key from: https://ai.google.dev/

### 2. Use in React Components

```tsx
import { ExplainableRecommendationsList } from '@/components/recommendations/ExplainableRecommendationsList'

function MyPage() {
  return (
    <div>
      <h1>Your Recommendations</h1>
      <ExplainableRecommendationsList limit={20} />
    </div>
  )
}
```

### 3. Show Inline Explanation on Destination Pages

```tsx
import { WhyThisMatches } from '@/components/recommendations/WhyThisMatches'

function DestinationPage({ destination }) {
  return (
    <div>
      <h1>{destination.name}</h1>
      <WhyThisMatches destinationId={destination.id} />
      {/* Rest of page */}
    </div>
  )
}
```

## 🔄 Workflow

### Step 1: Calculate Match Score (Phase 2)

```typescript
import { tasteMatcher } from '@/services/taste/matcher'

const match = await tasteMatcher.calculateMatch(userId, destinationId)
```

### Step 2: Generate Explanation

```typescript
import { explainableRecommender } from '@/services/recommendations/explainable'

const recommendation = await explainableRecommender.generateExplanation(
  userId,
  destinationId,
  match
)

// Returns:
{
  destination: { id, name, category, cuisine_type, ... },
  match_score: 0.85,
  confidence: 0.75,
  reasons: [
    {
      factor_type: 'taste_match',
      factor_name: 'Cuisine Match',
      contribution_score: 0.9,
      explanation: 'Matches your love for Italian cuisine',
      icon: '🍽️'
    },
    // ... 3 more reasons
  ],
  evidence: [
    {
      type: 'user_history',
      description: "You've enjoyed 8 similar Italian restaurants",
      data: { count: 8, cuisine: 'italian' }
    }
  ]
}
```

### Step 3: Display in UI

```tsx
import { useExplainableRecommendations } from '@/hooks/useExplainableRecommendations'

function MyComponent() {
  const { recommendations, isLoading } = useExplainableRecommendations(20)

  return (
    <div>
      {recommendations.map(rec => (
        <div key={rec.destination.id}>
          <h3>{rec.destination.name}</h3>
          <div>Match: {Math.round(rec.match_score * 100)}%</div>

          {rec.reasons.map(reason => (
            <div>
              {reason.icon} {reason.explanation}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
```

## 🧠 Gemini Prompt Engineering

### Prompt Structure

The system uses carefully crafted prompts to generate high-quality reasons:

```typescript
const prompt = `
You are a restaurant recommendation expert. Generate 2-3 concise, specific reasons (15-25 words each) why this destination matches the user's taste.

User Profile:
- Top cuisines: ${topCuisines}
- Typical price range: ${'$'.repeat(avgPricePoint)}
- Exploration style: ${noveltySeekingLabel}
- Recently saved ${savedCount} places

Destination:
- Name: ${destination.name}
- Category: ${destination.category}
- Cuisine: ${destination.cuisine_type}
- Price: ${'$'.repeat(destination.price_level)}
- Rating: ${destination.rating}/5

Match Scores:
- Food: ${foodScore}%
- Ambiance: ${ambianceScore}%
- Price: ${priceScore}%

Focus on:
1. The HIGHEST scoring dimension (most impactful factor)
2. Specific connections to user's history (if applicable)
3. Unique attributes of the destination

Be conversational, specific, and avoid generic phrases.

Return ONLY a JSON array of reasons:
[
  {
    "factor_type": "taste_match",
    "factor_name": "Short name (2-3 words)",
    "contribution_score": 0.85,
    "explanation": "Specific, engaging reason (15-25 words)",
    "icon": "emoji"
  }
]
`
```

### Prompt Best Practices

1. **Be Specific**: Include exact user data (cuisines, price, scores)
2. **Set Constraints**: 15-25 words per reason, 2-3 reasons total
3. **Request JSON**: Structured output for easy parsing
4. **Provide Context**: User profile + destination + match scores
5. **Avoid Generic**: Request specific, personalized language

## 📈 Reason Ranking Algorithm

Reasons are ranked by contribution score (descending):

```typescript
private rankReasons(reasons: ReasonFactor[]): ReasonFactor[] {
  return reasons.sort((a, b) => b.contribution_score - a.contribution_score)
}
```

**Contribution Score Sources:**
- Dimension scores from taste matcher (0.7-1.0 for high matches)
- Derived from match calculations
- AI-generated based on dimension importance

**Top 4 Reasons** are selected for display to avoid overwhelming users.

## 🔍 Evidence Collection

Evidence provides transparency and builds trust:

### User History Evidence

```typescript
const cuisineMatches = recentInteractions.filter(
  i => i.destinations?.cuisine_type === destination.cuisine_type
).length

if (cuisineMatches >= 3) {
  evidence.push({
    type: 'user_history',
    description: `You've enjoyed ${cuisineMatches} similar ${destination.cuisine_type} restaurants`,
    data: { count: cuisineMatches, cuisine: destination.cuisine_type }
  })
}
```

### Destination Attribute Evidence

```typescript
if (destination.rating >= 4.5) {
  evidence.push({
    type: 'destination_attribute',
    description: `Highly rated (${destination.rating}/5)`,
    data: { rating: destination.rating }
  })
}
```

### Social Signal Evidence

```typescript
const saveCount = await supabase
  .from('saved_destinations')
  .select('*', { count: 'exact' })
  .eq('destination_id', destinationId)

if (saveCount > 100) {
  evidence.push({
    type: 'social_signal',
    description: `${saveCount}+ users have saved this place`,
    data: { save_count: saveCount }
  })
}
```

## 🎨 UI Components

### ExplainableRecommendationCard

Full-featured card with reasons, evidence, and match score:

```tsx
<ExplainableRecommendationCard
  recommendation={recommendation}
  index={0}
/>
```

**Features:**
- Match score badge with confidence level
- 4 top reasons with icons and contribution bars
- Collapsible evidence section
- Destination tags
- Framer Motion animations

### ExplainableRecommendationsList

Complete list view with loading states and error handling:

```tsx
<ExplainableRecommendationsList
  limit={20}
  className="my-custom-class"
/>
```

**Features:**
- SWR data fetching with caching
- Loading skeletons
- Error state with retry
- Empty state
- Refresh button

### WhyThisMatches

Inline explanation for destination detail pages:

```tsx
<WhyThisMatches
  destinationId={123}
  className="mb-8"
/>
```

**Features:**
- Compact design
- Top 3 reasons
- Match percentage badge
- Auto-generates on mount
- Silent fail (non-critical)

## 🔧 API Endpoints

### Get Explainable Recommendations

```http
GET /api/recommendations/explainable?user_id=uuid&limit=20
```

**Response:**
```json
{
  "success": true,
  "count": 20,
  "recommendations": [
    {
      "destination": {
        "id": 123,
        "name": "Osteria Francescana",
        "category": "restaurant",
        "cuisine_type": "italian",
        "price_level": 4,
        "rating": 4.8,
        "city": "Modena"
      },
      "match_score": 0.89,
      "confidence": 0.82,
      "reasons": [
        {
          "factor_type": "taste_match",
          "factor_name": "Cuisine Match",
          "contribution_score": 0.93,
          "explanation": "Perfectly aligns with your preference for Italian fine dining experiences",
          "icon": "🍽️"
        }
      ],
      "evidence": [
        {
          "type": "user_history",
          "description": "You've enjoyed 12 similar Italian restaurants",
          "data": { "count": 12, "cuisine": "italian" }
        }
      ]
    }
  ]
}
```

### Get Single Explanation

```http
POST /api/recommendations/explainable
Content-Type: application/json

{
  "user_id": "uuid",
  "destination_id": 123
}
```

**Response:**
```json
{
  "success": true,
  "recommendation": { /* same structure as above */ }
}
```

## 📊 React Hooks

### useExplainableRecommendations

```typescript
const {
  recommendations,  // RecommendationWithReason[]
  isLoading,       // boolean
  error,           // Error | null
  refresh          // () => void
} = useExplainableRecommendations(20)
```

### useDestinationExplanation

```typescript
const {
  recommendation,  // RecommendationWithReason | null
  isGenerating,    // boolean
  error           // Error | null
} = useDestinationExplanation(destinationId)
```

### useTopReason

```typescript
const topReason = useTopReason(recommendation?.reasons)
// Returns reason with highest contribution_score
```

### useConfidenceLevel

```typescript
const { label, color } = useConfidenceLevel(0.85)
// Returns: { label: 'Very High', color: 'green' }
```

### useMatchScoreLabel

```typescript
const label = useMatchScoreLabel(0.89)
// Returns: "89% · Excellent Match"
```

## 💰 Cost Estimation

### Gemini API Usage

- **Model**: `gemini-1.5-flash`
- **Cost**: ~$0.00001 per API call
- **Per Recommendation**: 1 API call = ~$0.00001
- **Batch of 20**: ~$0.0002

### Optimization Strategies

1. **Caching**: Store generated explanations for 24 hours
2. **Lazy Loading**: Only generate explanations when user scrolls to card
3. **Batch Processing**: Generate explanations in background job
4. **Rate Limiting**: Max 100 requests per user per day

## 🐛 Debugging

### Check if Gemini is Working

```typescript
// Test Gemini API
import { explainableRecommender } from '@/services/recommendations/explainable'

const test = await explainableRecommender.generateExplanation(
  'user_id',
  123,
  matchScore
)

console.log('Reasons:', test?.reasons)
```

### View Raw API Response

```bash
curl -X POST http://localhost:3000/api/recommendations/explainable \
  -H "Content-Type: application/json" \
  -d '{"user_id":"uuid","destination_id":123}'
```

### Check Reason Quality

```sql
-- Log Gemini responses for analysis
CREATE TABLE gemini_logs (
  id UUID PRIMARY KEY,
  user_id UUID,
  destination_id INT,
  prompt TEXT,
  response TEXT,
  parsed_reasons JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 🧪 Testing

### Unit Test: Reason Extraction

```typescript
import { explainableRecommender } from '@/services/recommendations/explainable'

test('extracts basic reasons from high food score', () => {
  const match = {
    dimension_scores: { food: 0.9, price: 0.8, ambiance: 0.7 },
    overall_score: 0.85
  }

  const destination = {
    name: 'Test Restaurant',
    cuisine_type: 'italian',
    price_level: 3
  }

  const reasons = explainableRecommender['extractBasicReasons'](match, destination)

  expect(reasons).toContainEqual(
    expect.objectContaining({
      factor_type: 'taste_match',
      factor_name: 'Cuisine Match'
    })
  )
})
```

### Integration Test: Full Flow

```typescript
test('generates full explanation for user', async () => {
  const recommendation = await explainableRecommender.generateExplanation(
    'test_user',
    123,
    mockMatchScore
  )

  expect(recommendation).toBeDefined()
  expect(recommendation.reasons.length).toBeGreaterThan(0)
  expect(recommendation.reasons.length).toBeLessThanOrEqual(4)
  expect(recommendation.evidence.length).toBeGreaterThan(0)
})
```

### A/B Test: UI Variants

```typescript
// Track which variant performs better
import { trackEvent } from '@/lib/tracking/enhanced-tracker'

function ExplainableCard({ variant }: { variant: 'A' | 'B' }) {
  const onClick = () => {
    trackEvent({
      event_name: 'recommendation_clicked',
      properties: { variant }
    })
  }

  // Show different UIs based on variant
  return variant === 'A' ? <FullCard /> : <CompactCard />
}
```

## 📈 Performance

- **Reason Extraction**: ~10ms (no API calls)
- **Gemini API Call**: ~500-800ms (with streaming)
- **Evidence Collection**: ~100ms (database queries)
- **Total per Destination**: ~600-900ms

### Optimization: Batch Processing

```typescript
// Generate explanations in parallel
const recommendations = await Promise.all(
  matches.map(match =>
    explainableRecommender.generateExplanation(userId, match.destination_id, match)
  )
)

// For 20 recommendations: ~1-2s (parallelized)
```

### Optimization: Progressive Loading

```typescript
// Show basic reasons immediately, load AI reasons progressively
const basicReasons = explainableRecommender['extractBasicReasons'](match, destination)
// Display basicReasons instantly

const aiReasons = await explainableRecommender['generateAIReasons'](...)
// Add aiReasons when ready
```

## 🚦 Production Checklist

- [ ] Add GOOGLE_AI_API_KEY to environment variables
- [ ] Test Gemini API connectivity
- [ ] Verify reason quality with sample data
- [ ] Implement caching for generated explanations
- [ ] Set up error logging for Gemini failures
- [ ] Add rate limiting on API endpoints
- [ ] Monitor Gemini API costs
- [ ] A/B test UI variants
- [ ] Collect user feedback on explanation quality

## 🔄 Update Frequency

**When to Regenerate Explanations:**
- **Taste Profile Updated**: Regenerate all cached explanations
- **New Destinations Added**: Generate on-demand
- **User Requests Refresh**: Real-time generation

**Caching Strategy:**
- **Cache Duration**: 24 hours
- **Cache Invalidation**: On taste profile update
- **Pregeneration**: Top 50 destinations for active users

## 📚 Next Steps

After Phase 3 is deployed:

- **Phase 4**: Discovery Mood System (filter by mood)
- **Phase 5**: Cold-Start Solution (onboarding questionnaire)
- **Phase 6**: Weather Intelligence Integration

## 🤝 Integration with Other Phases

- **Phase 1**: Uses enriched_interactions for evidence
- **Phase 2**: Requires taste profiles and match scores
- **Phase 4**: Reasons can be filtered by mood
- **Phase 9**: Explanations appear in push notifications
- **Phase 10**: Featured in weekly email summaries

## 💡 Tips & Best Practices

### 1. Customize Gemini Prompts

Adjust prompts for your brand voice:

```typescript
const prompt = `
You are a ${brandVoice} recommendation expert.
Generate reasons in a ${tone} tone...
`
```

### 2. Handle Gemini Failures Gracefully

```typescript
try {
  const aiReasons = await generateAIReasons(...)
} catch (error) {
  // Fall back to basic reasons only
  console.error('Gemini failed, using basic reasons')
  return basicReasons
}
```

### 3. Monitor Reason Quality

```typescript
// Log low-quality responses
if (reasons.length === 0 || reasons[0].explanation.length < 10) {
  console.warn('Low quality Gemini response', { userId, destinationId })
}
```

### 4. Personalize Icons

```typescript
const iconMap = {
  'Cuisine Match': '🍽️',
  'Price Fit': '💰',
  'Ambiance': '✨',
  'Discovery Factor': '🗺️',
  // Add custom icons
}
```

## 📝 License

Proprietary - Urban Manual
