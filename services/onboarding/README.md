# Cold-Start Solution (Phase 5)

Onboarding questionnaire that bootstraps taste profiles for new users without interaction history.

## 🎯 Overview

Solves the cold-start problem by:
- **9-Question Onboarding** covering cuisines, budget, ambiance, style, and moods
- **Taste Profile Bootstrapping** creates initial profile with 0.4 confidence
- **Initial Recommendations** provides 20 curated destinations based on preferences
- **Embedding Generation** creates food/ambiance/culture vectors from responses

## 🚀 Quick Start

### 1. Run Database Migration

```sql
-- Execute: migrations/013_cold_start_solution.sql
```

### 2. Use Onboarding Wizard

```tsx
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard'

function OnboardingPage() {
  return (
    <OnboardingWizard
      onComplete={() => router.push('/discover')}
    />
  )
}
```

### 3. Check Onboarding Status

```tsx
import { useOnboardingRequired } from '@/hooks/useOnboarding'

function App() {
  const { isRequired, isChecking } = useOnboardingRequired()

  if (isRequired) {
    return <OnboardingWizard />
  }

  return <MainApp />
}
```

## 📊 Onboarding Questions

1. **Preferred Cuisines** (multi-select): Italian, Japanese, Mexican, etc.
2. **Budget** (single-select): $, $$, $$$, $$$$
3. **Ambiance** (multi-select): Cozy, vibrant, quiet, romantic, etc.
4. **Dining Context** (single-select): Solo, couples, groups, family
5. **Adventure Level** (scale 0-10): Stick to favorites ↔ Love new things
6. **Tourist vs Local** (single-select): Tourist spots, mix, local gems
7. **Dietary Restrictions** (multi-select): None, vegetarian, vegan, etc.
8. **Interests** (multi-select): Art, history, architecture, nature, etc.
9. **Favorite Moods** (multi-select): Romantic, energetic, cozy, etc.

## 🔄 Bootstrap Process

```typescript
// 1. Save onboarding responses
await onboardingProcessor.saveResponses(responses)

// 2. Create taste profile
await onboardingProcessor.bootstrapTasteProfile(userId)
// - Converts cuisines to embeddings
// - Maps budget → price preferences
// - Maps ambiance → formality preferences
// - Sets confidence_score = 0.4 (vs 0.85 for 50+ interactions)

// 3. Get initial recommendations
const recommendations = await onboardingProcessor.getInitialRecommendations(
  userId,
  20
)
```

## 🎨 UI Components

### OnboardingWizard

```tsx
<OnboardingWizard
  onComplete={() => {
    // Handle completion
  }}
/>
```

**Features:**
- Multi-step wizard with progress bar
- Animated transitions between steps
- Question types: multi-select, single-select, scale
- Skip option
- Time tracking

## 📈 Profile Quality

| Interaction Count | Confidence | Source | Quality |
|------------------|------------|--------|---------|
| 0 (Onboarding)   | 0.40       | Cold-start | Bootstrap |
| 10               | 0.50       | Interactions | Medium |
| 50               | 0.85       | Interactions | High |

**Hybrid Approach:** After 10 interactions, taste profile transitions from onboarding-based to interaction-based.

## 🔧 API Endpoints

### Get Questions & Progress

```http
GET /api/onboarding?user_id=uuid
```

### Submit Responses

```http
POST /api/onboarding
Content-Type: application/json

{
  "user_id": "uuid",
  "preferred_cuisines": ["italian", "japanese"],
  "typical_budget": 2,
  "preferred_ambiance": ["cozy", "romantic"],
  "primary_dining_context": "couples",
  "novelty_seeking": 0.7,
  "tourist_vs_local": 0.8,
  "favorite_moods": ["romantic", "cozy"]
}
```

## 💡 Tips

1. **Keep it Short**: 9 questions max (5-7 min completion)
2. **Visual Design**: Use icons, colors, engaging UI
3. **Allow Skip**: Don't force completion
4. **Track Time**: Monitor completion rates
5. **Update Profile**: Regenerate after 10+ interactions

## 📝 License

Proprietary - Urban Manual
