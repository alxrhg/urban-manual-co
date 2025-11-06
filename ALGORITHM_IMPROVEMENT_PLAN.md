# Algorithm Improvement Plan
## Comprehensive Strategy for Enhanced Personalization & Intelligence

**Created:** November 6, 2025
**Status:** Strategic Planning Document
**Branch:** `claude/plan-algorithm-improvements-011CUqn7editiJNCzzsdehBm`

---

## Executive Summary

This document provides a comprehensive analysis of Urban Manual's current algorithm implementations and outlines a data-driven improvement strategy. The focus is on **enhancing existing algorithms using publicly available data** without adding new destinations at this time.

**Key Objectives:**
1. Improve recommendation quality and personalization
2. Leverage publicly available APIs and data sources
3. Enhance existing data with real-time information
4. Build smarter ranking and scoring algorithms
5. Implement predictive intelligence features

---

## Current State Analysis

### 1. What We Have Now

#### **A. Recommendation Algorithms (4 Layers)**

| Algorithm | Purpose | Strengths | Weaknesses |
|-----------|---------|-----------|------------|
| **Cold Start** | New visitors | Time-based, fast | Generic, not personalized |
| **Rapid Learning** | Session-based | Adapts quickly | Limited to current session |
| **Content-Based** | Returning users | Uses saved/visited history | Requires user history |
| **AI-Powered (Gemini)** | High-value recommendations | Deep personalization | API cost, slower |

**Implementation:** `/lib/recommendations.ts`, `/lib/ai-recommendations/engine.ts`

#### **B. Search & Ranking Systems**

| System | Technology | Data Sources |
|--------|-----------|--------------|
| **Enhanced Re-Ranker** | Multi-signal scoring | Embeddings, engagement, quality, intent |
| **Semantic Search** | OpenAI embeddings | text-embedding-3-large (1536-dim) |
| **Intelligent Search** | Contextual expansion | Vector similarity + location expansion |

**Implementation:** `/lib/search/reranker.ts`, `/lib/search/semanticSearch.ts`

#### **C. Engagement Tracking**

- **Views Count:** Tracked via `user_interactions` table
- **Saves Count:** Tracked via `saved_places` table
- **Visits Count:** Tracked via `visited_places` table
- **Real-time Updates:** Database triggers maintain counts

#### **D. External Data Sources (Currently Used)**

| API | Data Fetched | Usage | Cost |
|-----|-------------|-------|------|
| **Google Places API** | Rating, reviews, hours, phone, photos | Destination enrichment | Pay per request |
| **Google Routes API** | Distance matrix, travel times | Nearby calculations | Pay per request |
| **Open-Meteo** | Weather, forecasts | Weather-based recommendations | **FREE** ✅ |
| **Eventbrite API** | Nearby events | Event discovery | **FREE** (with token) ✅ |
| **OpenAI** | Embeddings | Semantic search | Pay per token |
| **Google Gemini** | AI recommendations | Personalization scores | Pay per request |

**Implementation:** `/lib/enrichment/*.ts`, `/services/*.ts`

---

## 2. Data We Can Fetch (Publicly Available)

### **2.1 Real-Time Data (FREE/Low Cost)**

#### **Weather Intelligence** ✅ Already Integrated
- **Source:** Open-Meteo API (no API key required)
- **Available Data:**
  - Current weather (temp, conditions, humidity, wind)
  - 7-day forecast
  - Historical weather data
  - Precipitation probability
- **Use Cases:**
  - Weather-appropriate recommendations ("Indoor spots for rainy days")
  - Seasonal timing advice
  - Best months to visit calculations

#### **Events & Festivals** ✅ Partially Integrated
- **Source:** Eventbrite API v3 (free with OAuth token)
- **Available Data:**
  - Upcoming events by location + radius
  - Event categories (18 types)
  - Event dates, venues, pricing
- **Additional Free Sources:**
  - **Predicthq.com** (limited free tier) - event intelligence
  - **OpenStreetMap** - geographic event data
  - **Government tourism APIs** - official event calendars
- **Use Cases:**
  - Event-based recommendations ("Food festival this weekend")
  - Avoid-crowds alerts
  - Seasonal opportunity detection

#### **Geographic & Location Data** 🆓
- **Source:** OpenStreetMap (Overpass API) - completely free
- **Available Data:**
  - POI locations and types
  - Neighborhood boundaries
  - Transit routes and stops
  - Walking paths and landmarks
- **Use Cases:**
  - Better neighborhood detection
  - Walking distance calculations
  - Transit accessibility scoring
  - Nearby POI enrichment

#### **Public Transit Data** 🆓
- **Sources:**
  - Google Transit (via Google Maps API)
  - City-specific GTFS feeds (many are free)
- **Available Data:**
  - Real-time transit schedules
  - Route information
  - Stop locations
  - Service alerts
- **Use Cases:**
  - Transit accessibility scores
  - "Easy to reach by subway" tags
  - Time-to-destination calculations

#### **Social Signals** 🆓 (Public Data)
- **Sources:**
  - Instagram public hashtag counts (via unofficial APIs)
  - Google Trends data
  - Wikipedia page views (free API)
- **Available Data:**
  - Trending hashtags by location
  - Search interest over time
  - Seasonal popularity patterns
- **Use Cases:**
  - Trending destination detection
  - Popularity momentum tracking
  - Seasonal demand patterns

#### **Time-Based Data**
- **Timezone data** (via timezone APIs) - Free
- **Sunrise/sunset times** (via SunriseSunset.io) - Free
- **Public holidays** (via Calendarific or Nager.Date APIs) - Free tiers available
- **Use Cases:**
  - Time-appropriate recommendations
  - Golden hour photography spots
  - Holiday/closure predictions

### **2.2 Enhanced Google Places Data** 💰 (We Already Pay)

Since we already use Google Places API, we can extract MORE value:

#### **Currently NOT Fetching (But Available):**
- **Live Popularity Data:**
  - `current_opening_hours.periods` - exact hours
  - `opening_hours.weekday_text` - human-readable hours
  - Busy times (if available in response)

- **Detailed Reviews:**
  - Review text with sentiment
  - Review ratings by aspect (food, service, atmosphere)
  - Review photos
  - Reviewer profiles

- **Accessibility Information:**
  - Wheelchair accessibility
  - Parking availability
  - Entrance accessibility

- **Dining Details:**
  - Dine-in, takeout, delivery options
  - Reservations availability
  - Price level (we have this but not using fully)
  - Menu links

- **Ambiance Attributes:**
  - `serves_breakfast`, `serves_brunch`, `serves_lunch`, `serves_dinner`
  - `serves_beer`, `serves_wine`
  - `outdoor_seating`
  - `good_for_children`
  - `good_for_groups`

**Implementation:** Add to `/scripts/enrich-with-google.ts` and `/lib/enrichment.ts`

---

## 3. Algorithm Improvements (Prioritized)

### **Phase 1: Low-Hanging Fruit (Weeks 1-2)** 🟢

#### **1.1 Enhanced Google Places Enrichment**
**Effort:** Low | **Impact:** High | **Cost:** None (already paying)

**Actions:**
1. Update enrichment script to fetch ALL available Google Places fields
2. Add new database columns for missing attributes:
   ```sql
   ALTER TABLE destinations ADD COLUMN IF NOT EXISTS accessibility_json jsonb;
   ALTER TABLE destinations ADD COLUMN IF NOT EXISTS dining_options jsonb;
   ALTER TABLE destinations ADD COLUMN IF NOT EXISTS ambiance_attributes jsonb;
   ALTER TABLE destinations ADD COLUMN IF NOT EXISTS serves_breakfast boolean;
   ALTER TABLE destinations ADD COLUMN IF NOT EXISTS serves_dinner boolean;
   ALTER TABLE destinations ADD COLUMN IF NOT EXISTS outdoor_seating boolean;
   ALTER TABLE destinations ADD COLUMN IF NOT EXISTS good_for_groups boolean;
   ```
3. Update destination type to include new fields
4. Use in recommendations and filtering

**Files to Update:**
- `/scripts/enrich-with-google.ts`
- `/types/destination.ts`
- `/lib/search/reranker.ts` (add ambiance matching)

#### **1.2 Weather-Enhanced Recommendations**
**Effort:** Low | **Impact:** Medium | **Cost:** Free

**Already Have:** Open-Meteo integration in `/lib/enrichment/weather.ts`

**Actions:**
1. Add weather-awareness to recommendation algorithm
2. Create weather-appropriate scoring:
   ```typescript
   // Rainy day boost for indoor venues
   if (isRainy && hasIndoorSeating) score += 0.15;

   // Sunny day boost for outdoor/rooftop
   if (isSunny && hasOutdoorSeating) score += 0.15;

   // Temperature-appropriate suggestions
   if (isHot && (isIceCream || hasCooling)) score += 0.1;
   ```
3. Add weather context to AI search queries
4. Display weather-aware recommendations on homepage

**Files to Update:**
- `/lib/recommendations.ts` - add weather scoring
- `/lib/search/reranker.ts` - integrate weather context
- `/app/page.tsx` - weather-aware homepage carousel

#### **1.3 Time-of-Day Intelligence**
**Effort:** Low | **Impact:** High | **Cost:** Free

**Actions:**
1. Use `opening_hours_json` (from Google Places) for real-time filtering
2. Add "Open Now" boost to search ranking
3. Time-appropriate recommendations:
   ```typescript
   function getTimeOfDayBoost(destination, currentHour) {
     if (currentHour >= 6 && currentHour < 11 && destination.serves_breakfast) return 0.2;
     if (currentHour >= 11 && currentHour < 15 && destination.category === 'lunch') return 0.2;
     if (currentHour >= 17 && currentHour < 22 && destination.serves_dinner) return 0.2;
     if (currentHour >= 22 && destination.category === 'nightlife') return 0.2;
     return 0;
   }
   ```
4. Filter out closed venues in search results (optional)

**Files to Update:**
- `/lib/recommendations.ts` - add time-of-day scoring
- `/lib/search/reranker.ts` - boost open venues
- `/components/DestinationCard.tsx` - show "Open Now" badge

#### **1.4 Event-Based Opportunity Detection**
**Effort:** Medium | **Impact:** Medium | **Cost:** Free (Eventbrite)

**Already Have:** Eventbrite integration in `/lib/enrichment/events.ts`

**Actions:**
1. Create scheduled job to fetch events for each city (weekly)
2. Store events in database:
   ```sql
   CREATE TABLE IF NOT EXISTS city_events (
     id UUID PRIMARY KEY,
     city TEXT NOT NULL,
     event_name TEXT,
     event_date TIMESTAMPTZ,
     category TEXT,
     venue_lat DECIMAL,
     venue_lng DECIMAL,
     source TEXT DEFAULT 'eventbrite',
     fetched_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```
3. Add event proximity scoring to recommendations
4. Display "Events Nearby" section on destination pages
5. Create event-based discovery prompts

**Files to Create:**
- `/scripts/fetch-city-events.ts` - scheduled job
- `/app/api/events/[city]/route.ts` - API endpoint
- `/components/EventsNearby.tsx` - UI component

---

### **Phase 2: Smart Scoring Improvements (Weeks 3-4)** 🟡

#### **2.1 Advanced Engagement Scoring**
**Effort:** Medium | **Impact:** High | **Cost:** None

**Current Issue:** Simple counts (saves, views, visits) don't account for recency or momentum

**Actions:**
1. Implement time-decay scoring:
   ```typescript
   function calculateEngagementScore(destination) {
     const recentSaves = getRecentSaves(destination.id, 30); // last 30 days
     const allTimeSaves = destination.saves_count;
     const momentum = (recentSaves / allTimeSaves) * 100; // % growth

     const score = {
       popularity: allTimeSaves * 0.3,
       momentum: momentum * 0.5,
       recency: recentSaves * 0.2
     };

     return score.popularity + score.momentum + score.recency;
   }
   ```

2. Create "Trending" algorithm:
   ```sql
   -- Create trending_scores table
   CREATE TABLE IF NOT EXISTS trending_scores (
     destination_id INT PRIMARY KEY,
     trending_score DECIMAL,
     momentum_pct DECIMAL,
     calculated_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

3. Add trending badge to UI for top 10% momentum

**Files to Update:**
- `/lib/popularity.ts` - add momentum calculation
- `/services/intelligence/recommendations-advanced.ts` - use trending scores

#### **2.2 Collaborative Filtering Enhancement**
**Effort:** Medium | **Impact:** High | **Cost:** None

**Current:** Basic collaborative filtering in `/services/intelligence/recommendations-advanced.ts`

**Actions:**
1. Build user similarity matrix:
   ```typescript
   // Find users with similar save/visit patterns
   function findSimilarUsers(userId: string, limit = 50) {
     // Calculate Jaccard similarity based on saved destinations
     // Return top N similar users
   }
   ```

2. Improve recommendation quality:
   ```typescript
   function collaborativeRecommendations(userId: string) {
     const similarUsers = findSimilarUsers(userId);
     const theirSaves = getSavedDestinations(similarUsers);
     const notYetSaved = filterOutUserSaves(userId, theirSaves);

     // Score by frequency among similar users
     return scoreByPopularityAmongSimilar(notYetSaved, similarUsers);
   }
   ```

3. Cache similarity matrices (update weekly)

**Files to Update:**
- `/services/intelligence/recommendations-advanced.ts` - enhance CF algorithm
- Create `/lib/user-similarity.ts` - similarity calculations

#### **2.3 Category & Tag Affinity Learning**
**Effort:** Medium | **Impact:** High | **Cost:** None

**Actions:**
1. Build user category preferences from history:
   ```typescript
   interface CategoryAffinity {
     category: string;
     score: number; // 0-1
     confidence: number; // based on sample size
     trending: 'up' | 'down' | 'stable';
   }

   function calculateCategoryAffinity(userId: string): CategoryAffinity[] {
     const saves = getUserSavedDestinations(userId);
     const visits = getUserVisitHistory(userId);

     // Weight: visits = 3x, saves = 2x, views = 1x
     // Apply recency decay
     // Calculate confidence based on sample size
   }
   ```

2. Use affinity for personalized filtering
3. Store in user profile for fast access

**Files to Create:**
- `/lib/affinity-learning.ts` - affinity calculation
- `/types/personalization.ts` - add CategoryAffinity type

#### **2.4 Geographic Intelligence**
**Effort:** Medium | **Impact:** Medium | **Cost:** Free (OSM)

**Actions:**
1. Integrate OpenStreetMap Overpass API
2. Extract neighborhood boundaries and names
3. Calculate neighborhood popularity scores
4. Add transit accessibility scoring:
   ```typescript
   function calculateTransitScore(destination) {
     const nearbyStops = getTransitStops(destination.latitude, destination.longitude, 500); // 500m radius
     const stopCount = nearbyStops.length;
     const lineCount = unique(nearbyStops.map(s => s.line)).length;

     return Math.min(1.0, (stopCount * 0.1 + lineCount * 0.15));
   }
   ```

**Files to Create:**
- `/lib/enrichment/openstreetmap.ts` - OSM integration
- `/lib/transit-scoring.ts` - transit accessibility

---

### **Phase 3: Predictive Intelligence (Weeks 5-6)** 🟡

#### **3.1 Demand Forecasting**
**Effort:** High | **Impact:** Medium | **Cost:** None

**Current:** Basic forecasting in `/services/intelligence/forecasting.ts`

**Actions:**
1. Collect historical interaction data:
   ```sql
   CREATE TABLE IF NOT EXISTS daily_metrics (
     id UUID PRIMARY KEY,
     destination_id INT,
     city TEXT,
     date DATE,
     views_count INT,
     saves_count INT,
     visits_count INT,
     calculated_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

2. Implement time-series analysis:
   - Weekly seasonality detection
   - Holiday effect modeling
   - Event-driven spikes
   - Trend analysis

3. Predict "peak windows" for each destination/city
4. Display "Best Time to Visit" on destination pages

**Files to Update:**
- `/services/intelligence/forecasting.ts` - enhance forecasting
- Create `/scripts/aggregate-daily-metrics.ts` - data collection

#### **3.2 Social Momentum Tracking**
**Effort:** Medium | **Impact:** Medium | **Cost:** Free

**Actions:**
1. Track Google Trends data for destination names
2. Track Instagram hashtag counts (public data)
3. Calculate social momentum:
   ```typescript
   interface SocialMomentum {
     destination_id: number;
     google_trends_score: number; // 0-100
     instagram_mentions: number;
     momentum_7d: number; // % change
     momentum_30d: number;
   }
   ```

4. Use for trending detection
5. Display "Trending on Instagram" badges

**Files to Create:**
- `/lib/social-signals.ts` - social data fetching
- `/scripts/update-social-momentum.ts` - scheduled job

#### **3.3 Smart "Discovery Prompts" Generation**
**Effort:** Medium | **Impact:** High | **Cost:** None

**Current:** Manual discovery prompts in `/lib/discovery-prompts.ts`

**Actions:**
1. Auto-generate prompts based on:
   - Upcoming events (from Eventbrite)
   - Weather forecasts (sunny weekend → rooftop bars)
   - Seasonal patterns (cherry blossoms, autumn leaves)
   - Social trends (trending on Instagram)
   - New destinations (recently added/enriched)

2. Create prompt generation pipeline:
   ```typescript
   interface GeneratedPrompt {
     type: 'event' | 'weather' | 'seasonal' | 'trending' | 'new';
     city: string;
     title: string;
     description: string;
     start_date: Date;
     end_date: Date;
     priority: number;
     destinations: number[]; // relevant destination IDs
   }
   ```

3. Display on homepage and city pages

**Files to Update:**
- `/lib/discovery-prompts-generative.ts` - already exists, enhance it
- Create `/scripts/generate-discovery-prompts.ts` - scheduled generation

---

### **Phase 4: Advanced Features (Weeks 7-8)** 🔵

#### **4.1 Knowledge Graph for Relationships**
**Effort:** High | **Impact:** Medium | **Cost:** None

**Current:** Basic implementation in `/services/intelligence/knowledge-graph.ts`

**Actions:**
1. Build destination similarity graph using:
   - Shared tags/categories
   - Similar user bases (collaborative signal)
   - Geographic proximity
   - Visual similarity (if using image embeddings)

2. Create relationship types:
   ```typescript
   type RelationshipType =
     | 'similar'        // Similar vibe/experience
     | 'nearby'         // Geographic proximity
     | 'alternative'    // Same category, different style
     | 'complementary'  // Often visited together
     | 'sequential'     // Often visited in sequence
     | 'thematic';      // Shared theme
   ```

3. Use for:
   - "You might also like" recommendations
   - Itinerary building
   - Alternative suggestions

**Files to Update:**
- `/services/intelligence/knowledge-graph.ts` - enhance graph building
- Create `/scripts/build-knowledge-graph.ts` - graph generation

#### **4.2 Multi-Signal Hybrid Recommendation**
**Effort:** High | **Impact:** High | **Cost:** None

**Actions:**
1. Combine ALL signals into unified scoring:
   ```typescript
   function calculateHybridScore(destination, user, context) {
     const signals = {
       // Personalization (40%)
       contentBased: calculateContentBasedScore(destination, user),
       collaborative: calculateCollaborativeScore(destination, user),
       categoryAffinity: calculateAffinityScore(destination, user),

       // Context (30%)
       timeOfDay: getTimeOfDayBoost(destination, context.hour),
       weather: getWeatherBoost(destination, context.weather),
       location: getLocationBoost(destination, context.userLocation),
       events: getEventBoost(destination, context.nearbyEvents),

       // Quality (20%)
       rating: destination.rating / 5.0,
       reviews: Math.log10(destination.user_ratings_total || 1) / 5,
       michelin: destination.michelin_stars ? 0.3 : 0,

       // Trending (10%)
       engagement: calculateEngagementScore(destination),
       momentum: calculateMomentumScore(destination),
       social: getSocialMomentum(destination)
     };

     return (
       signals.contentBased * 0.15 +
       signals.collaborative * 0.15 +
       signals.categoryAffinity * 0.10 +

       signals.timeOfDay * 0.10 +
       signals.weather * 0.08 +
       signals.location * 0.07 +
       signals.events * 0.05 +

       signals.rating * 0.10 +
       signals.reviews * 0.05 +
       signals.michelin * 0.05 +

       signals.engagement * 0.05 +
       signals.momentum * 0.03 +
       signals.social * 0.02
     );
   }
   ```

2. A/B test different weight configurations
3. Make configurable per user segment

**Files to Create:**
- `/lib/hybrid-scoring.ts` - unified scoring system

---

## 4. Data We Should NOT Pursue (Yet)

### **❌ Expensive/Complex Data Sources**
- Real-time flight/hotel pricing (high cost, complex APIs)
- Restaurant reservation systems (Resy/OpenTable APIs - require partnerships)
- Paid event databases (PredictHQ paid tier)
- Social media APIs with rate limits (Twitter/Instagram official APIs)
- Street-level imagery analysis (Google Street View API - expensive)

### **❌ Data Requiring Partnerships**
- Restaurant menus and pricing
- Booking availability (hotels, tours)
- Private review platforms
- Influencer/creator content

### **❌ Data Requiring Heavy ML Infrastructure**
- Custom image recognition models (use existing embeddings instead)
- NLP on user-generated content (privacy concerns)
- Real-time video/stream analysis
- Custom large language models

---

## 5. Quick Wins Summary

### **Immediate Actions (This Week)**
1. ✅ **Enhance Google Places enrichment** - Fetch all available fields
2. ✅ **Weather-based recommendations** - Use existing Open-Meteo integration
3. ✅ **Time-of-day scoring** - Use opening hours for smarter filtering
4. ✅ **Open Now badges** - Display real-time status

### **Next 2 Weeks**
5. **Event-based opportunities** - Weekly event fetching + proximity scoring
6. **Engagement momentum** - Time-decay and trending scores
7. **Category affinity learning** - Build user preference profiles
8. **Transit accessibility** - OSM integration for transit scores

### **Weeks 5-8**
9. **Demand forecasting** - Predict peak times and best windows
10. **Social momentum tracking** - Google Trends + Instagram signals
11. **Auto-generated discovery prompts** - Event/weather/trend-based
12. **Knowledge graph relationships** - Enhanced "you might also like"

---

## 6. Success Metrics

### **Algorithm Performance**
- **Recommendation CTR:** % of recommendations clicked (target: >15%)
- **Search relevance:** User engagement with top 5 results (target: >50%)
- **Personalization lift:** Difference between personalized vs. generic (target: +25%)

### **User Engagement**
- **Session duration:** Time spent browsing (target: +20%)
- **Saves per session:** Average saves per visit (target: +30%)
- **Return rate:** Users returning within 7 days (target: >40%)

### **Data Quality**
- **Enrichment coverage:** % of destinations with full data (target: >80%)
- **Data freshness:** % of data updated in last 30 days (target: >90%)
- **API success rate:** % of successful API calls (target: >99%)

---

## 7. Implementation Roadmap

### **Week 1-2: Enhanced Enrichment** 🟢 **START HERE**
- [ ] Update Google Places enrichment script
- [ ] Add new database columns for ambiance/dining attributes
- [ ] Deploy enrichment updates to production
- [ ] Backfill existing destinations

### **Week 3-4: Smart Scoring**
- [ ] Implement engagement momentum calculation
- [ ] Build category affinity learning
- [ ] Enhance collaborative filtering
- [ ] Add weather/time-of-day boosts

### **Week 5-6: Predictive Features**
- [ ] Set up daily metrics collection
- [ ] Implement demand forecasting
- [ ] Add social momentum tracking
- [ ] Auto-generate discovery prompts

### **Week 7-8: Advanced Intelligence**
- [ ] Build knowledge graph relationships
- [ ] Implement hybrid scoring system
- [ ] A/B test different scoring weights
- [ ] Monitor and optimize

---

## 8. Technical Considerations

### **Performance**
- Cache expensive calculations (similarity matrices, trending scores)
- Use database indexes for fast lookups
- Implement pagination for large result sets
- Consider read replicas for heavy queries

### **Cost Management**
- Rate-limit API calls (Google Places, OpenAI)
- Cache API responses (weather, events)
- Use free tiers where possible (Open-Meteo, OSM)
- Monitor API usage and costs

### **Data Privacy**
- Anonymize user data in analytics
- Provide opt-out for personalization
- Clear data retention policies
- GDPR compliance for EU users

### **Scalability**
- Use background jobs for heavy processing
- Implement queue system for enrichment tasks
- Database sharding if needed
- CDN for static assets

---

## 9. Next Steps

### **Immediate (This Week)**
1. Review and approve this plan
2. Create feature branch for enrichment improvements
3. Update Google Places enrichment script
4. Test enrichment on sample destinations
5. Deploy to production

### **Short-term (Weeks 2-4)**
6. Implement engagement momentum tracking
7. Build category affinity system
8. Add weather and time-of-day intelligence
9. Integrate event-based opportunities

### **Medium-term (Weeks 5-8)**
10. Launch predictive features
11. Build knowledge graph
12. Implement hybrid scoring
13. A/B test and optimize

---

## Conclusion

This plan focuses on **maximizing value from existing infrastructure and free/low-cost data sources** before investing in expensive solutions. By enhancing our enrichment, improving scoring algorithms, and adding predictive intelligence, we can significantly improve recommendation quality and user engagement without major infrastructure changes.

**Key Principle:** Use what we have more intelligently before adding complexity.

**Next Review:** Week 4 (assess progress, adjust priorities)

---

**Document Status:** Ready for Implementation
**Approval Required:** Yes
**Estimated Timeline:** 8 weeks to full implementation
**Estimated Cost:** < $100/month in additional API costs
