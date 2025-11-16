# List of 62 Backend Endpoints That Should Be Integrated

## Summary
Out of 148 total backend endpoints:
- **59** already in use before this PR
- **4** newly integrated in this PR (Phase 1)
- **62** should be integrated (listed below)
- **23** should NOT be integrated (admin/internal tools)

---

## The 62 Endpoints to Integrate

### Phase 2: Core Personalization (5 endpoints)
1. `/api/personalized-recommendations` - Hybrid recommendation engine
2. `/api/search/semantic` - Vector-based semantic search ⭐ **IMPLEMENTING NOW**
3. `/api/intelligence/neighborhoods/[city]` - Neighborhood data by city ⭐ **IMPLEMENTING NOW**
4. `/api/greeting/personalized` - Personalized greeting messages
5. `/api/intelligence/contextual-recommendations` - Context-aware suggestions

### Phase 3: Trip Planning & Discovery (7 endpoints)
6. `/api/agents/itinerary-builder` - AI itinerary generation ⭐ **IMPLEMENTING NOW**
7. `/api/graph/optimize-itinerary` - Route optimization
8. `/api/graph/suggest-next` - Next destination suggestions
9. `/api/itinerary/[city]` - City-specific itineraries
10. `/api/routes/calculate` - Route calculation between destinations
11. `/api/discovery/search/conversational` - Natural language search
12. `/api/search/combined` - Hybrid search (keyword + semantic)

### Phase 4: Engagement & Gamification (6 endpoints)
13. `/api/achievements/check` - Check user achievements
14. `/api/account/brand-affinity` - User brand preferences
15. `/api/recommendations/hybrid` - Combined collaborative + content filtering
16. `/api/recommendations/discovery` - Discovery-focused recommendations
17. `/api/google-trends/city` - City-specific trends
18. `/api/categories` - List all categories with counts

### Phase 5: Advanced AI Features (8 endpoints)
19. `/api/ai/query` - General AI query endpoint
20. `/api/gemini-recommendations` - Gemini AI recommendations
21. `/api/intelligence/deep-understand` - Deep understanding of user intent
22. `/api/intelligence/rich-context` - Rich contextual awareness
23. `/api/ai/vision` - Image analysis
24. `/api/discovery/search/multimodal` - Image + text search
25. `/api/intelligence/forecast` - Predict busy times
26. `/api/ai/tts` - Text-to-speech for accessibility

### Phase 6: Intelligence & Analytics (8 endpoints)
27. `/api/intelligence/opportunities` - Suggest best times to visit
28. `/api/intelligence/search-rank` - Improve search quality
29. `/api/intelligence/multi-day-plan` - Multi-day itineraries
30. `/api/intelligence/itinerary/generate` - Auto-generate itineraries
31. `/api/intelligence/knowledge-graph/similar` - Graph-based similarity
32. `/api/intelligence/districts/[city]` - District-level exploration
33. `/api/intelligence/neighborhoods/search` - Search within neighborhoods
34. `/api/location/context` - Location-based context

### Phase 7: Discovery Engine Features (11 endpoints)
35. `/api/discovery/ab-test/assignment` - A/B testing framework
36. `/api/discovery/events/batch` - Batch event tracking
37. `/api/discovery/fetch` - Discovery Engine data fetch
38. `/api/discovery/monitoring/status` - Admin dashboard (low priority)
39. `/api/discovery/monitoring/performance` - Admin dashboard (low priority)
40. `/api/discovery/analytics` - Analytics data
41. `/api/discovery/recommendations/contextual` - Context-aware recommendations
42. `/api/discovery-prompt` - Discovery prompts
43. `/api/discovery-prompts` - Multiple discovery prompts
44. `/api/discovery-prompts/cross-city` - Cross-city prompts
45. `/api/discovery-prompts/personalized` - Personalized prompts

### Phase 8: Utility & Enhancement (7 endpoints)
46. `/api/context/onboarding` - Personalized onboarding
47. `/api/agents/proactive-recommendations` - Proactive suggestions
48. `/api/prompts` - Prompt management
49. `/api/regenerate-content` - Content updates
50. `/api/destinations/[slug]/enriched` - Enhanced destination data
51. `/api/destinations/nearby` - Nearby destinations
52. `/api/contextual-search` - Context-aware search

### Phase 9: ML & Advanced Analytics (10 endpoints)
53. `/api/ml/recommend` - ML-powered recommendations
54. `/api/ml/sentiment` - Sentiment analysis
55. `/api/ml/topics` - Topic extraction
56. `/api/ml/anomaly` - Anomaly detection
57. `/api/ml/explain` - ML explanation
58. `/api/ml/sequence` - Sequence prediction
59. `/api/ml/forecast/demand` - Demand forecasting
60. `/api/ml/forecast/peak-times` - Peak times prediction
61. `/api/ml/forecast/trending` - Trending prediction
62. `/api/intelligence/taste-profile/[userId]` - User taste analysis

---

## Currently Implementing (This Session)

⭐ **Priority implementations requested by user:**

1. **Semantic Search** (`/api/search/semantic`) 
   - Component: `SemanticSearchToggle.tsx`
   - Integration: Search page with toggle option
   
2. **Neighborhoods** (`/api/intelligence/neighborhoods/[city]`)
   - Component: `NeighborhoodBrowser.tsx`
   - Integration: City pages and filters

3. **Itinerary Builder** (`/api/agents/itinerary-builder`)
   - Component: `AIItineraryBuilder.tsx`
   - Integration: New trip planning page

---

## 23 Endpoints That Should NOT Be Integrated

These are admin/monitoring/internal tools without user-facing UI:

1. `/api/health` - Server health check
2. `/api/cms-health` - CMS status
3. `/api/cron/account-data-requests` - Background job
4. `/api/cron/aggregate-user-data` - Background job
5. `/api/cron/compute-intelligence` - Background job
6. `/api/cron/train-ml-models` - Background job
7. `/api/jobs/generate-descriptions` - Background job
8. `/api/jobs/generate-sitemap` - Background job
9. `/api/jobs/geocode-missing` - Background job
10. `/api/ml/status` - ML service status
11. `/api/mapkit-token` - Token generation (internal)
12. `/api/build-version` - Build info (metadata)
13. `/api/trpc/[trpc]` - tRPC handler (framework)
14. `/api/workflows/ingest-destination` - Data ingestion
15. `/api/admin/reindex-destinations` - Admin operation
16. `/api/intelligence/embeddings/refresh` - Background job
17. `/api/intelligence/conversation-memory/[sessionId]` - Already integrated in chat
18. `/api/conversation/[user_id]` - Already integrated in chat
19. `/api/conversation-stream/[user_id]` - Already integrated in chat
20. `/api/collections/[collection_id]/comments` - Already integrated
21. `/api/collections/[collection_id]/comments/[comment_id]` - Already integrated
22. `/api/alerts/[user_id]` - Internal notification system
23. `/api/brands/[brand]` - Internal brand data

---

**Total Remaining After This Session:** 59 endpoints (62 - 3 being implemented now)
