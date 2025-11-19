# Concierge API - AI-Powered Travel Recommendations

The Concierge API combines internal semantic search with external web research to provide personalized, explainable travel recommendations. It's designed to answer open-ended travel queries like "I want a romantic weekend getaway with great food" or "Where should I go for an adventure trip in Europe?"

## Overview

**Endpoint**: `POST /api/concierge/query`

**What it does**:
1. Understands natural language travel queries using semantic search
2. Finds relevant destinations from your database using vector similarity
3. Enriches results with up-to-date web context (Tavily/Exa)
4. Generates a personalized explanation using AI (OpenAI/Gemini)
5. Returns ranked destinations with explanations and external references

## Features

- ✅ **Natural Language Understanding**: Understands complex, conversational queries
- ✅ **Semantic Matching**: Finds destinations based on meaning, not just keywords
- ✅ **Web Enrichment**: Augments results with current travel info from the web
- ✅ **AI Explanations**: Provides friendly, personalized explanations
- ✅ **User Context**: Considers budget, travel style, and interests
- ✅ **External References**: Includes 1-3 relevant web links for deeper research
- ✅ **Rate Limiting**: Built-in cost controls for external API calls

## API Request

### Endpoint
```
POST /api/concierge/query
```

### Request Body

```typescript
{
  "query": string;                    // Required: User's travel query
  "userContext"?: {                   // Optional: User preferences
    "budget"?: string;                // e.g., "budget", "mid-range", "luxury"
    "travelStyle"?: string;           // e.g., "adventure", "relaxation", "cultural"
    "interests"?: string[];           // e.g., ["food", "history", "nature"]
  };
  "limit"?: number;                   // Optional: Max destinations (default: 5)
  "includeExternal"?: boolean;        // Optional: Include web research (default: true)
}
```

### Example Request

```bash
curl -X POST https://your-app.vercel.app/api/concierge/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "romantic restaurants with Michelin stars for anniversary dinner",
    "userContext": {
      "budget": "luxury",
      "travelStyle": "romantic",
      "interests": ["fine dining", "wine"]
    },
    "limit": 5,
    "includeExternal": true
  }'
```

## API Response

### Response Format

```typescript
{
  "explanation": string;              // AI-generated personalized explanation
  "destinations": [
    {
      "id": number;
      "name": string;
      "city": string;
      "country": string;
      "category": string;
      "similarity_score": number;     // 0-1 similarity score
      "reason": string;                // Why this matches the query
    }
  ];
  "externalReferences"?: [            // Optional: Web research results
    {
      "title": string;
      "url": string;
      "snippet": string;
      "source": "Tavily" | "Exa";
    }
  ];
  "userContext"?: string;             // Formatted user preferences
}
```

### Example Response

```json
{
  "explanation": "For your romantic anniversary dinner, I've found exceptional Michelin-starred restaurants perfect for the occasion. These destinations combine world-class cuisine with intimate atmospheres, and each has been recognized for culinary excellence. Paris and Tokyo lead with multiple options featuring innovative fine dining experiences.",
  "destinations": [
    {
      "id": 123,
      "name": "L'Arpège",
      "city": "Paris",
      "country": "France",
      "category": "Fine Dining",
      "similarity_score": 0.94,
      "reason": "3 Michelin stars • Luxury • Fine Dining"
    },
    {
      "id": 456,
      "name": "Sukiyabashi Jiro",
      "city": "Tokyo",
      "country": "Japan",
      "category": "Sushi Restaurant",
      "similarity_score": 0.91,
      "reason": "3 Michelin stars • Luxury • Fine Dining"
    }
  ],
  "externalReferences": [
    {
      "title": "Best Romantic Restaurants for Anniversaries in Paris",
      "url": "https://example.com/paris-romantic",
      "snippet": "Paris offers some of the world's most romantic dining experiences, with Michelin-starred restaurants creating unforgettable moments...",
      "source": "Tavily"
    },
    {
      "title": "Michelin Guide 2024: Top Romantic Spots",
      "url": "https://example.com/michelin-romantic",
      "snippet": "The latest Michelin guide highlights restaurants perfect for special occasions, with intimate settings and exceptional service...",
      "source": "Tavily"
    }
  ],
  "userContext": "Budget: luxury | Style: romantic | Interests: fine dining, wine"
}
```

## Use Cases

### 1. Open-Ended Travel Planning
```json
{
  "query": "Where should I go for a week-long vacation in Europe in summer?",
  "userContext": {
    "budget": "mid-range",
    "interests": ["culture", "history", "food"]
  }
}
```

### 2. Specific Experience Search
```json
{
  "query": "Best places for sunset views and cocktails",
  "limit": 10
}
```

### 3. Budget-Conscious Recommendations
```json
{
  "query": "Amazing street food experiences",
  "userContext": {
    "budget": "budget",
    "travelStyle": "authentic local experience"
  }
}
```

### 4. Luxury Experience Discovery
```json
{
  "query": "Ultra-luxury dining with molecular gastronomy",
  "userContext": {
    "budget": "luxury",
    "interests": ["innovative cuisine", "wine pairing"]
  },
  "includeExternal": true
}
```

## How It Works

### Architecture Flow

```
User Query
    ↓
1. Generate Embedding (ML Service or OpenAI)
    ↓
2. Semantic Search (Upstash Vector)
    ↓
3. Fetch Destination Data (Supabase)
    ↓
4. External Web Research (Tavily/Exa) [Optional]
    ↓
5. AI Explanation (OpenAI/Gemini)
    ↓
6. Format & Return Response
```

### Step-by-Step Process

**Step 1: Query Understanding**
- Converts natural language query to 1536-dim embedding vector
- Uses ML service (primary) or OpenAI (fallback)

**Step 2: Semantic Search**
- Queries Upstash Vector for similar destinations
- Returns top 2× limit results (for filtering)
- Filters by similarity threshold (>0.7)

**Step 3: Data Enrichment**
- Fetches full destination details from Supabase
- Includes category, pricing, Michelin stars, descriptions

**Step 4: External Research** (Optional)
- Queries Tavily or Exa for current travel info
- Focuses on top 2-3 cities from results
- Limited to 3 references to control costs

**Step 5: AI Explanation**
- Synthesizes all data with OpenAI or Gemini
- Creates personalized 2-3 sentence explanation
- Considers user context and preferences
- Falls back to template-based explanation if no LLM available

**Step 6: Response Formatting**
- Ranks destinations by similarity score
- Generates reasons for each match
- Formats external references
- Returns structured JSON response

## External APIs

### Tavily (Recommended)

**What**: Real-time web search API optimized for AI applications  
**Cost**: Free tier: 1,000 searches/month  
**Setup**: https://tavily.com  
**Env Var**: `TAVILY_API_KEY`

**Example Usage**:
```bash
curl -X POST https://api.tavily.com/search \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "YOUR_KEY",
    "query": "romantic restaurants in Paris",
    "max_results": 3
  }'
```

### Exa (Alternative)

**What**: Neural search engine for high-quality web content  
**Cost**: Free tier: 1,000 searches/month  
**Setup**: https://exa.ai  
**Env Var**: `EXA_API_KEY`

**Example Usage**:
```bash
curl -X POST https://api.exa.ai/search \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_KEY" \
  -d '{
    "query": "romantic restaurants in Paris",
    "num_results": 3
  }'
```

## Configuration

### Required Environment Variables

```bash
# Core Search Infrastructure
UPSTASH_VECTOR_REST_URL=https://...
UPSTASH_VECTOR_REST_TOKEN=...
OPENAI_API_KEY=sk-...              # For embeddings and explanation
SUPABASE_SERVICE_ROLE_KEY=...      # For database access
```

### Optional Environment Variables

```bash
# External Search (at least one recommended)
TAVILY_API_KEY=...                 # Preferred for travel content
EXA_API_KEY=...                    # Alternative search API

# AI Explanation (OpenAI preferred)
GEMINI_API_KEY=...                 # Fallback if no OpenAI

# ML Service (for custom embeddings)
ML_SERVICE_URL=http://localhost:8000
ML_SERVICE_API_KEY=...
```

## Cost Estimation

### For 1,000 concierge queries/month:

**With External Research Enabled**:
- Upstash Vector: Free tier (10k queries)
- OpenAI Embeddings: ~$0.40 (1k embeddings × $0.0004)
- OpenAI GPT-3.5-turbo: ~$1.50 (1k explanations × $0.0015)
- Tavily/Exa: Free tier (1k searches)
- **Total: ~$2/month**

**Without External Research**:
- Upstash Vector: Free tier
- OpenAI: ~$2/month
- **Total: ~$2/month**

### Cost Control Features

1. **External Search Toggle**: Set `includeExternal: false` to skip web research
2. **Result Limits**: Control `limit` parameter (default: 5)
3. **LLM Fallback**: Uses template if no LLM configured
4. **Caching**: Vector results cached in Upstash

## Performance

- **Embedding Generation**: 100-300ms
- **Vector Search**: 50-100ms
- **External Research**: 500-1000ms (if enabled)
- **AI Explanation**: 1-3 seconds
- **Total Response Time**: 2-4 seconds (with external), 1-2 seconds (without)

## Error Handling

### Common Errors

**400 Bad Request**: Missing or invalid query
```json
{ "error": "Query is required" }
```

**500 Internal Server Error**: Database or API failure
```json
{ "error": "Internal server error" }
```

### Graceful Degradation

1. **No External API**: Continues without web research
2. **No LLM**: Uses template-based explanation
3. **No ML Service**: Falls back to OpenAI embeddings
4. **Low Similarity**: Returns empty results with helpful message

## Security

- ✅ All API keys via environment variables
- ✅ No hardcoded credentials
- ✅ Supabase RLS bypassed only with service key
- ✅ External API responses sanitized
- ✅ User input validated and sanitized
- ✅ Error messages don't leak sensitive info

## Testing

### Manual Test

```bash
# Test without external research (faster)
curl -X POST http://localhost:3000/api/concierge/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "romantic restaurants",
    "limit": 3,
    "includeExternal": false
  }'

# Test with full features
curl -X POST http://localhost:3000/api/concierge/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "best sushi in Tokyo",
    "userContext": {
      "budget": "luxury"
    },
    "includeExternal": true
  }'
```

### Integration Test Example

```typescript
import { describe, it, expect } from 'vitest';

describe('Concierge API', () => {
  it('returns personalized recommendations', async () => {
    const response = await fetch('/api/concierge/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'romantic restaurants',
        limit: 5,
        includeExternal: false,
      }),
    });

    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.explanation).toBeTruthy();
    expect(data.destinations).toHaveLength(5);
    expect(data.destinations[0]).toHaveProperty('similarity_score');
  });
});
```

## Monitoring

### Key Metrics to Track

1. **Response Time**: Target <3 seconds
2. **Similarity Scores**: Average should be >0.75
3. **External API Success Rate**: Should be >95%
4. **LLM Explanation Quality**: Monitor user feedback
5. **Cost per Query**: Track OpenAI + external API costs

### Logging

```typescript
console.log('Concierge query:', {
  query,
  resultsCount: destinations.length,
  hasExternal: !!externalReferences,
  avgSimilarity: avgScore,
  duration: Date.now() - startTime,
});
```

## Production Checklist

- [ ] Environment variables configured
- [ ] Upstash Vector index created (1536 dimensions)
- [ ] Destinations indexed in vector database
- [ ] OpenAI API key with sufficient quota
- [ ] Tavily or Exa API key (optional)
- [ ] Rate limiting configured (if high traffic)
- [ ] Monitoring and logging enabled
- [ ] Error tracking (Sentry) configured
- [ ] Cost alerts set up
- [ ] Admin authentication added

## Future Enhancements

1. **Caching**: Redis cache for popular queries
2. **Personalization**: User history and preferences
3. **Multi-modal**: Image search integration
4. **Real-time**: Streaming responses
5. **Analytics**: Track popular queries and conversions
6. **A/B Testing**: Test different prompts and ranking algorithms
7. **Feedback Loop**: Learn from user selections
8. **Local Knowledge**: Integrate local event data

## Support

For issues or questions:
- Check logs in Vercel Dashboard
- Review `SEARCH_AND_WORKFLOWS.md` for search infrastructure
- Review `UPSTASH_INTEGRATION.md` for vector search setup
- Review `OPS_SEARCH_AND_INDEXING.md` for operations

## Related Documentation

- `SEARCH_AND_WORKFLOWS.md` - Search infrastructure
- `UPSTASH_INTEGRATION.md` - Vector setup guide
- `OPS_SEARCH_AND_INDEXING.md` - Operations runbook
- `SECURITY_REVIEW_UPSTASH.md` - Security considerations
