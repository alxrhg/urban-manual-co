# Algorithmic Feed Architecture
## TikTok-Style Discovery for The Urban Manual
**Date:** November 5, 2025

---

## Vision Statement

Transform The Urban Manual from a **search-based discovery tool** to an **algorithmic feed** that learns what you love and serves it to you—no search required.

**Inspiration:** TikTok's For You Page, Instagram Explore, Spotify Discover Weekly

**Core Principle:**
> "The platform learns from everything you do. The more you use it, the better it gets at showing you destinations you'll love."

---

## The Current Problem

### What Users Do Now (Friction):
1. Open app
2. Think "What should I search for?"
3. Type query or apply filters
4. Browse results
5. Repeat

**Problems:**
- ❌ Requires cognitive effort (what to search?)
- ❌ User might not know what they want
- ❌ Limits discovery to what they can articulate
- ❌ Feels like work, not entertainment
- ❌ No personalization unless they search

### What TikTok Does (Zero Friction):
1. Open app
2. Immediately see content you'll love
3. Swipe/scroll
4. Platform learns from every interaction
5. Gets better over time

**Benefits:**
- ✅ Zero cognitive load
- ✅ Serendipitous discovery
- ✅ Highly engaging (addictive)
- ✅ Personalized by default
- ✅ Feels like entertainment, not search

---

## The Solution: Algorithmic "For You" Feed

### Homepage Transformation

#### Before (Current):
```
┌─────────────────────────────────────┐
│ Search bar                          │
│ Filters: [City] [Category] [Price] │
│                                     │
│ Grid of 897 destinations            │
│ (same for everyone)                 │
└─────────────────────────────────────┘
```

#### After (Algorithmic Feed):
```
┌─────────────────────────────────────┐
│ For You    Following    Explore     │ ← Tabs
│                                     │
│ ┌─────────────────────────────┐   │
│ │ 🏙️ Narisawa, Tokyo          │   │ ← Card 1
│ │ ⭐ 4.8 · $$$$ · Michelin 2★ │   │
│ │ [Beautiful food image]       │   │
│ │ "Because you loved Sushi Saito" │
│ │ 💾 Save  ✕ Skip             │   │
│ └─────────────────────────────┘   │
│                                     │
│ ┌─────────────────────────────┐   │
│ │ 🍷 Bar Benfiddich, Tokyo    │   │ ← Card 2
│ │ ⭐ 4.9 · $$$ · Cocktail Bar │   │
│ │ [Beautiful bar image]        │   │
│ │ "Trending in Tokyo - 45 saves"│
│ │ 💾 Save  ✕ Skip             │   │
│ └─────────────────────────────┘   │
│                                     │
│ ↓ Infinite scroll continues...     │
└─────────────────────────────────────┘
```

---

## Architecture Components

### 1. Implicit Signal Tracking Engine

**Track EVERYTHING (not just saves/visits):**

```typescript
interface UserSignal {
  user_id: string;
  destination_id: string;
  signal_type:
    | 'view'          // Appeared on screen
    | 'dwell'         // Time spent viewing (seconds)
    | 'hover'         // Mouse hover
    | 'click'         // Clicked for details
    | 'save'          // Explicit save
    | 'skip'          // Explicitly skipped
    | 'visit_marked'  // Marked as visited
    | 'share'         // Shared with friend
    | 'zoom_image'    // Zoomed into image
    | 'read_details'  // Expanded description
  signal_value: number;  // Strength (0-1)
  context: {
    position_in_feed: number;     // Where in feed
    session_id: string;            // Session tracking
    time_of_day: string;           // When they browse
    device: string;                // Mobile/desktop
    previous_card?: string;        // What they just saw
  };
  created_at: timestamp;
}
```

**Signal Weights:**
```typescript
const SIGNAL_WEIGHTS = {
  view: 0.1,           // Weak signal - just scrolled past
  dwell_2s: 0.2,       // Paused briefly
  dwell_5s: 0.4,       // Interested
  dwell_10s: 0.6,      // Very interested
  hover: 0.3,          // Considering
  click: 0.5,          // Strong interest
  save: 1.0,           // Explicit positive
  skip: -0.5,          // Explicit negative
  visit_marked: 1.5,   // Strongest signal
  share: 1.2,          // Social proof + interest
  zoom_image: 0.4,     // Visual appeal
  read_details: 0.5,   // Deep engagement
};
```

**Implementation:**
```typescript
// Track view when card enters viewport
<IntersectionObserver onChange={(visible) => {
  if (visible) {
    trackSignal({
      signal_type: 'view',
      destination_id: card.id,
      position_in_feed: index
    });

    // Start dwell timer
    startDwellTimer(card.id);
  }
}} />

// Track all interactions
<DestinationCard
  onMouseEnter={() => trackSignal({ signal_type: 'hover' })}
  onClick={() => trackSignal({ signal_type: 'click' })}
  onSave={() => trackSignal({ signal_type: 'save', signal_value: 1.0 })}
  onSkip={() => trackSignal({ signal_type: 'skip', signal_value: -0.5 })}
/>
```

---

### 2. Real-Time Preference Learning

**Build User Profile from Signals:**

```typescript
interface UserProfile {
  user_id: string;

  // Learned preferences
  preferred_categories: Record<string, number>;  // { 'Dining': 0.85, 'Bar': 0.72 }
  preferred_cities: Record<string, number>;      // { 'Tokyo': 0.90, 'Paris': 0.75 }
  preferred_price_range: { min: number; max: number };  // 2-4
  preferred_tags: Record<string, number>;        // { 'michelin': 0.88, 'intimate': 0.65 }

  // Behavioral patterns
  avg_session_length: number;                    // How long they browse
  peak_activity_hours: number[];                 // When they browse [18, 19, 20]
  scroll_velocity: number;                       // Fast scroller vs slow browser
  skip_rate: number;                             // How picky they are

  // Engagement metrics
  total_views: number;
  total_saves: number;
  total_visits: number;
  engagement_score: number;                      // Overall activity level

  // Diversity preferences
  exploration_vs_exploitation: number;           // 0.7 = likes variety

  // Temporal
  profile_updated_at: timestamp;
  profile_confidence: number;                    // 0-1, higher with more data
}
```

**Update Profile in Real-Time:**

```typescript
async function updateUserProfile(userId: string, signal: UserSignal) {
  const profile = await getUserProfile(userId);
  const destination = await getDestination(signal.destination_id);

  // Update category preferences
  const weight = SIGNAL_WEIGHTS[signal.signal_type];
  if (destination.category) {
    profile.preferred_categories[destination.category] =
      (profile.preferred_categories[destination.category] || 0.5) +
      (weight * 0.1); // Incremental learning
  }

  // Update city preferences
  if (destination.city) {
    profile.preferred_cities[destination.city] =
      (profile.preferred_cities[destination.city] || 0.5) +
      (weight * 0.1);
  }

  // Update price preferences
  if (destination.price_level && weight > 0) {
    profile.preferred_price_range = adjustRange(
      profile.preferred_price_range,
      destination.price_level
    );
  }

  // Update tags
  if (destination.tags) {
    destination.tags.forEach(tag => {
      profile.preferred_tags[tag] =
        (profile.preferred_tags[tag] || 0.5) + (weight * 0.05);
    });
  }

  // Normalize scores (keep in 0-1 range)
  profile.preferred_categories = normalize(profile.preferred_categories);
  profile.preferred_cities = normalize(profile.preferred_cities);
  profile.preferred_tags = normalize(profile.preferred_tags);

  // Update confidence (more signals = higher confidence)
  profile.profile_confidence = Math.min(
    profile.total_views / 100, // Max confidence at 100 views
    1.0
  );

  await saveUserProfile(profile);
}
```

---

### 3. Feed Generation Algorithm

**The Core: Personalized Ranking**

```typescript
async function generateFeed(
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<DestinationCard[]> {

  // Step 1: Get user profile
  const profile = await getUserProfile(userId);

  // Step 2: Get candidate pool (smart filtering)
  const candidates = await getCandidates(userId, profile);

  // Step 3: Score each candidate
  const scored = await Promise.all(
    candidates.map(async (dest) => {
      const score = await calculateFeedScore(dest, profile, userId);
      return { destination: dest, score };
    })
  );

  // Step 4: Rank by score
  const ranked = scored.sort((a, b) => b.score - a.score);

  // Step 5: Apply diversity & freshness
  const diversified = applyDiversity(ranked, profile);

  // Step 6: Inject trending & serendipity
  const final = injectVariety(diversified, profile);

  return final.slice(offset, offset + limit);
}
```

**Candidate Selection (Smart Pre-Filtering):**

```typescript
async function getCandidates(userId: string, profile: UserProfile) {
  // Get destinations user hasn't seen recently
  const recentlyViewed = await getRecentlyViewed(userId, days: 7);
  const saved = await getSavedDestinations(userId);
  const visited = await getVisitedDestinations(userId);

  // Build query based on profile
  let query = supabase
    .from('destinations')
    .select('*')
    .not('id', 'in', `(${[...recentlyViewed, ...saved, ...visited].join(',')})`)
    .limit(200); // Get larger pool for ranking

  // Filter by top preferred cities (80% of feed)
  const topCities = Object.entries(profile.preferred_cities)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([city]) => city);

  if (topCities.length > 0 && Math.random() < 0.8) {
    query = query.in('city', topCities);
  }

  // Filter by preferred categories (70% of time)
  const topCategories = Object.entries(profile.preferred_categories)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cat]) => cat);

  if (topCategories.length > 0 && Math.random() < 0.7) {
    query = query.in('category', topCategories);
  }

  // Filter by price range
  if (profile.preferred_price_range) {
    query = query
      .gte('price_level', profile.preferred_price_range.min)
      .lte('price_level', profile.preferred_price_range.max);
  }

  const { data } = await query;
  return data || [];
}
```

**Feed Scoring Algorithm:**

```typescript
async function calculateFeedScore(
  destination: Destination,
  profile: UserProfile,
  userId: string
): Promise<number> {

  let score = 0;

  // 1. PERSONALIZATION (40% weight)
  const personalizationScore =
    (profile.preferred_cities[destination.city] || 0.3) * 0.15 +
    (profile.preferred_categories[destination.category] || 0.3) * 0.15 +
    calculateTagsMatch(destination.tags, profile.preferred_tags) * 0.10;

  score += personalizationScore * 0.4;

  // 2. QUALITY SIGNALS (30% weight)
  const qualityScore =
    (destination.rating / 5) * 0.15 +                    // Rating
    (destination.michelin_stars ? 0.1 : 0) +             // Michelin bonus
    (destination.crown ? 0.05 : 0);                      // Crown badge

  score += qualityScore * 0.3;

  // 3. COLLABORATIVE FILTERING (15% weight)
  const collaborativeScore = await getCollaborativeScore(destination.id, userId);
  score += collaborativeScore * 0.15;

  // 4. POPULARITY & TRENDING (10% weight)
  const popularityScore = await getPopularityScore(destination.id);
  const trendingBoost = await isTrending(destination.id) ? 0.1 : 0;
  score += (popularityScore + trendingBoost) * 0.1;

  // 5. FRESHNESS (5% weight)
  // Boost recently added destinations
  const daysSinceAdded = daysBetween(destination.created_at, now());
  const freshnessScore = daysSinceAdded < 30 ? 0.05 : 0;
  score += freshnessScore;

  // DIVERSITY PENALTY
  // Penalize if too similar to recent views
  const similarityToRecent = await getSimilarityToRecentViews(destination.id, userId);
  score -= similarityToRecent * 0.1;

  // EXPLORATION BONUS
  // Boost destinations outside usual preferences (for discovery)
  const explorationBonus = profile.exploration_vs_exploitation > 0.5
    ? calculateExplorationBonus(destination, profile)
    : 0;
  score += explorationBonus;

  return Math.min(Math.max(score, 0), 1); // Clamp to 0-1
}
```

**Diversity Injection:**

```typescript
function applyDiversity(
  ranked: ScoredDestination[],
  profile: UserProfile
): ScoredDestination[] {
  const diversified: ScoredDestination[] = [];
  const cityCount = new Map<string, number>();
  const categoryCount = new Map<string, number>();

  // Ensure variety in feed
  for (const item of ranked) {
    const dest = item.destination;

    // Limit consecutive items from same city
    const cityOccurrences = cityCount.get(dest.city) || 0;
    if (cityOccurrences >= 2) {
      continue; // Skip to avoid city clustering
    }

    // Limit consecutive items from same category
    const categoryOccurrences = categoryCount.get(dest.category) || 0;
    if (categoryOccurrences >= 2) {
      continue;
    }

    diversified.push(item);
    cityCount.set(dest.city, cityOccurrences + 1);
    categoryCount.set(dest.category, categoryOccurrences + 1);

    // Reset counters every 5 items
    if (diversified.length % 5 === 0) {
      cityCount.clear();
      categoryCount.clear();
    }
  }

  return diversified;
}
```

**Serendipity Injection:**

```typescript
function injectVariety(
  feed: ScoredDestination[],
  profile: UserProfile
): ScoredDestination[] {

  // Every 5th card: inject something unexpected
  const withVariety: ScoredDestination[] = [];

  for (let i = 0; i < feed.length; i++) {
    withVariety.push(feed[i]);

    // Inject serendipity card
    if ((i + 1) % 5 === 0) {
      const serendipityCard = pickSerendipityCard(profile);
      if (serendipityCard) {
        withVariety.push({
          destination: serendipityCard,
          score: 0.7, // Mid-tier score
          reason: 'Something different for you'
        });
      }
    }
  }

  return withVariety;
}

async function pickSerendipityCard(profile: UserProfile) {
  // Pick from:
  // - Different city than usual
  // - Different category than usual
  // - Different price range
  // - Trending globally (not just for user)

  const oppositePreferences = {
    city: getLeastViewedCities(profile),
    category: getLeastViewedCategories(profile),
    price_level: getUnexploredPriceRange(profile)
  };

  const { data } = await supabase
    .from('destinations')
    .select('*')
    .in('city', oppositePreferences.city)
    .in('category', oppositePreferences.category)
    .gte('rating', 4.5) // High quality only
    .limit(10);

  return data?.[Math.floor(Math.random() * data.length)];
}
```

---

### 4. Cold Start Problem Solution

**Problem:** New users have no profile data

**Solution: 30-Second Taste Questionnaire**

```tsx
<OnboardingFlow>
  <Step1>
    <Title>Welcome! Let's find places you'll love 🌍</Title>
    <Subtitle>This takes 30 seconds</Subtitle>
  </Step1>

  <Step2>
    <Title>Which cities interest you?</Title>
    <CityGrid>
      {['Tokyo', 'Paris', 'London', 'NYC', 'SF', 'Barcelona', 'Seoul', 'Singapore'].map(city => (
        <CityCard
          city={city}
          image={cityImage}
          onSelect={addToProfile}
        />
      ))}
    </CityGrid>
    <SubText>Select 2-3</SubText>
  </Step2>

  <Step3>
    <Title>What kind of places?</Title>
    <CategorySwiper>
      {categories.map(cat => (
        <CategoryCard
          category={cat}
          image={exampleImage}
          onSwipeRight={like}
          onSwipeLeft={skip}
        />
      ))}
    </CategorySwiper>
    <SubText>Swipe right = yes, left = no</SubText>
  </Step3>

  <Step4>
    <Title>Quick vibe check</Title>
    <DestinationSwiper>
      {sampleDestinations.map(dest => (
        <FullCard
          destination={dest}
          onSwipeRight={like}
          onSwipeLeft={skip}
        />
      ))}
    </DestinationSwiper>
    <SubText>Swipe on 10 places</SubText>
  </Step4>

  <Step5>
    <Title>✨ You're all set!</Title>
    <Subtitle>We've built your personalized feed</Subtitle>
    <Button>Start Exploring</Button>
  </Step5>
</OnboardingFlow>
```

**Quick Profile Building:**

```typescript
async function buildQuickProfile(onboardingData: OnboardingData) {
  const profile: UserProfile = {
    user_id: userId,

    // From city selection
    preferred_cities: Object.fromEntries(
      onboardingData.selectedCities.map(city => [city, 0.8])
    ),

    // From category swipes
    preferred_categories: Object.fromEntries(
      onboardingData.categorySwipes
        .filter(s => s.liked)
        .map(s => [s.category, 0.7])
    ),

    // From destination swipes
    preferred_tags: extractTagsFromSwipes(onboardingData.destinationSwipes),
    preferred_price_range: inferPriceRange(onboardingData.destinationSwipes),

    // Defaults
    exploration_vs_exploitation: 0.6, // Balanced
    profile_confidence: 0.5, // Medium (will improve with usage)
    total_views: 10,
    engagement_score: 0.5
  };

  return profile;
}
```

---

### 5. Feed UI/UX Design

**Mobile-First (Swipeable Cards):**

```tsx
<FeedContainer>
  <Tabs>
    <Tab active>For You</Tab>
    <Tab>Following</Tab>
    <Tab>Explore</Tab>
  </Tabs>

  <InfiniteScroll onLoadMore={loadMoreCards}>
    {feedCards.map((card, index) => (
      <SwipeableCard
        key={card.id}
        destination={card.destination}
        reason={card.reason}
        position={index}
        onSwipeRight={() => {
          saveDestination(card.id);
          trackSignal({ signal_type: 'save', signal_value: 1.0 });
        }}
        onSwipeLeft={() => {
          skipDestination(card.id);
          trackSignal({ signal_type: 'skip', signal_value: -0.5 });
        }}
        onClick={() => {
          openDetails(card.id);
          trackSignal({ signal_type: 'click', signal_value: 0.5 });
        }}
      >
        <CardImage src={card.image} onZoom={trackZoom} />

        <CardHeader>
          <Title>{card.destination.name}</Title>
          <Location>{card.destination.city}</Location>
        </CardHeader>

        <CardMeta>
          <Rating>{card.destination.rating} ⭐</Rating>
          <Price>{card.destination.price_level}</Price>
          {card.destination.michelin_stars && (
            <Michelin>{card.destination.michelin_stars}★</Michelin>
          )}
        </CardMeta>

        <CardReason>
          <Icon>✨</Icon>
          <Text>{card.reason}</Text>
        </CardReason>

        <CardActions>
          <SkipButton>✕ Skip</SkipButton>
          <SaveButton>💾 Save</SaveButton>
        </CardActions>

        {/* Live status */}
        {card.realtime_status && (
          <StatusBadge status={card.realtime_status}>
            🔴 Busy right now
          </StatusBadge>
        )}
      </SwipeableCard>
    ))}
  </InfiniteScroll>
</FeedContainer>
```

**Desktop (Infinite Scroll Grid):**

```tsx
<FeedGrid>
  {feedCards.map((card, index) => (
    <DestinationCard
      key={card.id}
      destination={card.destination}
      reason={card.reason}
      onEnterViewport={() => trackView(card.id, index)}
      onHover={() => trackHover(card.id)}
      onClick={() => {
        trackClick(card.id);
        openDrawer(card.id);
      }}
      onSave={() => trackSave(card.id)}
      onSkip={() => trackSkip(card.id)}
    />
  ))}
</FeedGrid>
```

---

### 6. Performance Optimizations

**Feed Caching:**

```typescript
// Pre-generate feeds for active users
async function preGenerateFeed(userId: string) {
  const feed = await generateFeed(userId, limit: 50);

  // Cache for 1 hour
  await redis.set(
    `feed:${userId}`,
    JSON.stringify(feed),
    'EX',
    3600
  );
}

// Cron job: Pre-generate feeds for users likely to open app
// Run at peak hours (8am, 12pm, 6pm user's timezone)
```

**Incremental Loading:**

```typescript
// Load in batches
const BATCH_SIZE = 10;

async function loadFeedBatch(userId: string, offset: number) {
  // Check cache first
  const cached = await getCachedFeed(userId);
  if (cached && cached.length > offset) {
    return cached.slice(offset, offset + BATCH_SIZE);
  }

  // Generate fresh
  return await generateFeed(userId, BATCH_SIZE, offset);
}
```

**Image Optimization:**

```typescript
// Lazy load images
<img
  src={lowQualityPlaceholder}
  data-src={highQualityImage}
  loading="lazy"
  onEnterViewport={loadHighQuality}
/>

// Use Next.js Image optimization
<Image
  src={destination.image}
  width={600}
  height={400}
  quality={85}
  priority={index < 3} // Priority for first 3 cards
/>
```

---

### 7. A/B Testing Framework

**Test Different Algorithms:**

```typescript
const EXPERIMENTS = {
  'feed-algo-v1': {
    weights: { personalization: 0.4, quality: 0.3, collaborative: 0.15, popularity: 0.1, freshness: 0.05 }
  },
  'feed-algo-v2': {
    weights: { personalization: 0.5, quality: 0.2, collaborative: 0.15, popularity: 0.1, freshness: 0.05 }
  },
  'feed-algo-v3': {
    weights: { personalization: 0.35, quality: 0.25, collaborative: 0.2, popularity: 0.15, freshness: 0.05 }
  }
};

async function assignExperiment(userId: string) {
  const hash = hashUserId(userId);
  const variant = hash % 3; // 3 variants

  return EXPERIMENTS[`feed-algo-v${variant + 1}`];
}

// Track metrics per variant
async function trackFeedEngagement(userId: string, metrics: Metrics) {
  const experiment = await getUserExperiment(userId);

  await analytics.track({
    event: 'feed_engagement',
    user_id: userId,
    experiment: experiment.name,
    metrics: {
      time_in_feed: metrics.timeInFeed,
      cards_viewed: metrics.cardsViewed,
      save_rate: metrics.saves / metrics.views,
      skip_rate: metrics.skips / metrics.views,
      click_through_rate: metrics.clicks / metrics.views
    }
  });
}
```

---

## Implementation Roadmap

### Phase 1: Core Feed (Week 1) - $300

**Days 1-2: Signal Tracking Infrastructure**
- [ ] Create `user_signals` table
- [ ] Implement tracking SDK (view, dwell, hover, click, save, skip)
- [ ] Build real-time profile update pipeline
- [ ] Test signal collection

**Days 3-4: Feed Generation Algorithm**
- [ ] Implement `generateFeed()` function
- [ ] Candidate selection logic
- [ ] Scoring algorithm
- [ ] Diversity & serendipity injection

**Days 5-7: Feed UI**
- [ ] Mobile swipeable cards
- [ ] Desktop infinite scroll grid
- [ ] Card designs with "reason" labels
- [ ] Save/skip interactions
- [ ] Feed state management

---

### Phase 2: Personalization (Week 2) - $250

**Days 8-9: User Profile System**
- [ ] Create `user_profiles` table
- [ ] Profile building from signals
- [ ] Real-time preference learning
- [ ] Profile confidence scoring

**Days 10-11: Cold Start Solution**
- [ ] Onboarding flow design
- [ ] City selection
- [ ] Category swiper
- [ ] Destination swiper (10 cards)
- [ ] Quick profile generation

**Days 12-14: Refinements**
- [ ] Collaborative filtering integration
- [ ] Co-visitation signals
- [ ] Trending detection
- [ ] A/B testing framework

---

### Phase 3: Intelligence Integration (Week 3) - $200

**Days 15-16: Real-Time Context**
- [ ] Inject real-time status into feed cards
- [ ] "Busy right now" badges
- [ ] "Best time to visit" hints
- [ ] "Closing soon" warnings

**Days 17-18: Enhanced Signals**
- [ ] Social signals ("12 people saved this week")
- [ ] Friend activity ("3 friends visited")
- [ ] Trending badges
- [ ] Seasonal opportunities

**Days 19-21: Optimization**
- [ ] Feed caching
- [ ] Pre-generation for active users
- [ ] Image lazy loading
- [ ] Performance monitoring

---

### Phase 4: Advanced Features (Week 4) - $140

**Days 22-23: Feed Variants**
- [ ] "Following" tab (friends' activity)
- [ ] "Explore" tab (trending globally)
- [ ] City-specific feeds
- [ ] Category-specific feeds

**Days 24-25: Engagement Loops**
- [ ] Daily feed refresh notifications
- [ ] "New in [Your City]" alerts
- [ ] Weekly digest emails
- [ ] Streak gamification

**Days 26-28: Analytics & Iteration**
- [ ] Feed engagement dashboards
- [ ] Algorithm performance metrics
- [ ] User satisfaction surveys
- [ ] A/B test analysis

---

## Success Metrics

### Engagement Metrics
| Metric | Current (Search) | Target (Feed) | Growth |
|--------|------------------|---------------|--------|
| Daily Active Users | - | - | +200% |
| Avg Session Length | 3 min | 12 min | +300% |
| Sessions per Week | 1.5 | 4.5 | +200% |
| Cards Viewed per Session | ~10 | ~50 | +400% |
| Save Rate | 5% | 15% | +200% |
| Time to First Save | 5 min | 30 sec | -90% |

### Algorithm Performance
| Metric | Target |
|--------|--------|
| Feed Relevance Score | >0.75 |
| Click-Through Rate | >20% |
| Save Rate | >15% |
| Skip Rate | <30% |
| Profile Confidence (after 1 week) | >0.7 |

### Business Impact
| Metric | Target |
|--------|--------|
| User Retention (7-day) | >50% |
| User Retention (30-day) | >35% |
| Viral Coefficient | >0.3 |
| NPS Score | >60 |

---

## Why This Wins

### 1. **Zero Friction Discovery**
- No search required
- No filters to think about
- Just scroll and discover

### 2. **Hyper-Personalized**
- Learns from every interaction
- Gets smarter over time
- Different for each user

### 3. **Addictive Engagement Loop**
```
Open app → See relevant content → Save → Platform learns → Better recommendations → Come back tomorrow → Repeat
```

### 4. **Differentiates from Competitors**
- Google Maps: Requires search
- TripAdvisor: Generic lists
- Urban Manual: **Algorithmic curation**

### 5. **Leverages Existing Intelligence**
- 4-model recommendation engine ✅
- Real-time status ✅
- Knowledge graph ✅
- Forecasting ✅
- All backend ready ✅

---

## Technical Debt Considerations

### Database Impact
- New table: `user_signals` (high write volume)
- New table: `user_profiles` (frequent updates)
- Consider: PostgreSQL partitioning for `user_signals` by date
- Consider: Redis caching for `user_profiles`

### Scalability
- Feed generation can be expensive
- Solution: Pre-generate for active users
- Cache feeds for 1 hour
- Use background jobs for heavy computation

### Privacy
- Transparent data usage
- Allow profile reset
- Explain recommendations
- Opt-out of tracking

---

## ROI Analysis

**Investment:** $890 remaining budget

**Returns:**
- Engagement: +300%
- Retention: +250%
- Sessions: +200%
- User satisfaction: Massive improvement
- Competitive moat: Algorithmic feed vs. search tools

**Payoff Timeline:**
- Week 1: Core feed live
- Week 2: Personalization working
- Week 3: Intelligence integrated
- Week 4: Optimization & iteration

**Long-term Value:**
- Platform becomes sticky (daily habit)
- Network effects (follow friends)
- Data moat (better data = better algorithm)
- User growth through word-of-mouth

---

## Next Steps

1. **Review & Approve** this architecture
2. **Start Phase 1** (Signal tracking + Feed generation)
3. **Ship MVP** in 7 days (basic feed working)
4. **Iterate** based on user behavior
5. **Scale** to all users

---

**The transformation:**

❌ **Before:** Search tool (users work to find places)
✅ **After:** Discovery engine (platform serves what you'll love)

**This is how you become TikTok for travel.** 🚀
