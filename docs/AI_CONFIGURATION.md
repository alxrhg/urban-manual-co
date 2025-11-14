# AI Configuration Guide

This document describes the configuration options for AI/ML features in Urban Manual.

## Environment Variables

### Cache Configuration

Control caching behavior for AI operations:

```env
# Cache TTL (Time To Live) in milliseconds
AI_EMBEDDING_CACHE_TTL=300000        # Default: 5 minutes
AI_INTENT_CACHE_TTL=300000           # Default: 5 minutes  
AI_SEARCH_CACHE_TTL=300000           # Default: 5 minutes

# Maximum cache sizes (LRU eviction when exceeded)
AI_MAX_EMBEDDING_CACHE_SIZE=100      # Default: 100 entries
AI_MAX_INTENT_CACHE_SIZE=100         # Default: 100 entries
AI_MAX_SEARCH_CACHE_SIZE=100         # Default: 100 entries
```

**Recommendations:**
- Increase TTL for production to reduce API costs (e.g., `600000` = 10 minutes)
- Increase cache sizes if you have sufficient memory (e.g., `500` entries)
- Decrease TTL for development to see changes faster (e.g., `60000` = 1 minute)

### Timeout Configuration

Control timeouts for AI operations to prevent hanging requests:

```env
# Timeouts in milliseconds
AI_EMBEDDING_TIMEOUT=5000            # Default: 5 seconds
AI_INTENT_TIMEOUT=4000               # Default: 4 seconds
AI_RESPONSE_TIMEOUT=5000             # Default: 5 seconds
AI_CONVERSATION_TIMEOUT=5000         # Default: 5 seconds
```

**Recommendations:**
- Increase timeouts if using slower models or experiencing timeouts
- Decrease timeouts for faster user experience (minimum 3000ms recommended)

### Database Query Configuration

Optimize database operations:

```env
# Batch sizes for bulk operations
DB_EMBEDDING_BATCH_SIZE=50           # Default: 50 destinations
DB_RECOMMENDATION_BATCH_SIZE=100     # Default: 100 destinations

# Query limits
DB_MAX_SEARCH_RESULTS=50             # Default: 50 results
DB_MAX_ENRICHMENT_RESULTS=3          # Default: 3 results (top results to enrich)
```

**Recommendations:**
- Increase `DB_MAX_ENRICHMENT_RESULTS` to 5-10 for richer data (costs more)
- Decrease to 1-2 for minimal enrichment and faster responses

### Performance Monitoring

Enable performance tracking and logging:

```env
AI_MONITORING_ENABLED=true           # Default: false
AI_LOG_SLOW_QUERIES=true             # Default: false
AI_SLOW_QUERY_THRESHOLD=1000         # Default: 1000ms (1 second)
```

**Monitoring Features:**
- Track execution times for all AI operations
- Log warnings for slow queries
- Generate performance statistics

**Access Statistics:**
```typescript
import { performanceMonitor } from '@/lib/ai/performance-monitor';

// Get statistics
const stats = performanceMonitor.getStatistics();
console.log(stats);
// Output: { operation: { count, avgDuration, maxDuration, minDuration } }
```

### Rate Limiting

Protect against abuse and control costs:

```env
AI_RATE_LIMIT_ENABLED=true           # Default: true
AI_MAX_REQUESTS_PER_MINUTE=30        # Default: 30 requests/minute
AI_MAX_REQUESTS_PER_HOUR=500         # Default: 500 requests/hour
```

**Recommendations:**
- Production: `60` requests/minute, `2000` requests/hour
- Development: Disable with `AI_RATE_LIMIT_ENABLED=false`
- Free tier: Lower limits to `15` requests/minute, `200` requests/hour

### Model Configuration

Configure AI models and their parameters:

```env
# OpenAI Models
OPENAI_EMBEDDING_MODEL=text-embedding-3-large
OPENAI_MODEL=gpt-4o-mini              # Default chat model
OPENAI_MODEL_COMPLEX=gpt-4.1          # For complex queries
GEMINI_MODEL=gemini-1.5-flash-latest  # Fallback model

# Temperature settings
AI_INTENT_TEMPERATURE=0.2             # Default: 0.2 (more deterministic)
AI_RESPONSE_TEMPERATURE=0.7           # Default: 0.7 (more creative)
```

**Model Selection:**
- **gpt-4o-mini**: Fast, cost-effective for most queries
- **gpt-4.1**: Better for complex reasoning, planning, comparisons
- **gemini-1.5-flash-latest**: Free fallback option

**Temperature:**
- `0.0-0.3`: Deterministic, consistent (intent parsing)
- `0.7-1.0`: Creative, varied (response generation)

### Feature Flags

Enable/disable specific features:

```env
AI_STREAMING_ENABLED=false           # Default: false (not implemented yet)
AI_ENRICHMENT_ENABLED=true           # Default: true
AI_PERSONALIZATION_ENABLED=true      # Default: true
AI_COLLABORATIVE_FILTERING_ENABLED=true  # Default: true
```

## Performance Optimization Tips

### 1. Optimize Cache Settings

For high-traffic production environments:

```env
# Longer TTL reduces API calls
AI_EMBEDDING_CACHE_TTL=600000        # 10 minutes
AI_INTENT_CACHE_TTL=600000           # 10 minutes
AI_SEARCH_CACHE_TTL=300000           # 5 minutes (user-specific)

# Larger caches for better hit rates
AI_MAX_EMBEDDING_CACHE_SIZE=500
AI_MAX_INTENT_CACHE_SIZE=500
AI_MAX_SEARCH_CACHE_SIZE=200
```

### 2. Adjust Timeouts for Your Use Case

For fast user experience:

```env
AI_EMBEDDING_TIMEOUT=3000            # 3 seconds (aggressive)
AI_INTENT_TIMEOUT=3000               # 3 seconds
AI_RESPONSE_TIMEOUT=4000             # 4 seconds
```

For better accuracy (tolerating slower responses):

```env
AI_EMBEDDING_TIMEOUT=8000            # 8 seconds
AI_INTENT_TIMEOUT=6000               # 6 seconds
AI_RESPONSE_TIMEOUT=8000             # 8 seconds
```

### 3. Database Query Optimization

For faster responses with minimal data:

```env
DB_MAX_SEARCH_RESULTS=20             # Fewer results
DB_MAX_ENRICHMENT_RESULTS=1          # Minimal enrichment
```

For richer data with more context:

```env
DB_MAX_SEARCH_RESULTS=100            # More results
DB_MAX_ENRICHMENT_RESULTS=10         # Full enrichment
```

### 4. Cost Optimization

Reduce OpenAI API costs:

```env
# Increase cache TTL and sizes
AI_EMBEDDING_CACHE_TTL=1800000       # 30 minutes
AI_INTENT_CACHE_TTL=1800000          # 30 minutes
AI_MAX_EMBEDDING_CACHE_SIZE=1000
AI_MAX_INTENT_CACHE_SIZE=1000

# Use simpler models
OPENAI_MODEL=gpt-4o-mini             # Cheaper than gpt-4.1
OPENAI_MODEL_COMPLEX=gpt-4o-mini     # Even for complex queries

# Enable rate limiting
AI_RATE_LIMIT_ENABLED=true
AI_MAX_REQUESTS_PER_MINUTE=20        # Lower limit
AI_MAX_REQUESTS_PER_HOUR=300
```

## Monitoring and Debugging

### Enable Monitoring

```env
AI_MONITORING_ENABLED=true
AI_LOG_SLOW_QUERIES=true
AI_SLOW_QUERY_THRESHOLD=500          # Log queries > 500ms
```

### View Performance Metrics

```typescript
import { performanceMonitor } from '@/lib/ai/performance-monitor';

// Get all metrics
const allMetrics = performanceMonitor.getMetrics();

// Get metrics for specific operation
const embeddingMetrics = performanceMonitor.getMetrics('embedding_generation');

// Get average duration
const avgDuration = performanceMonitor.getAverageDuration('ai_chat_request');

// Get statistics for all operations
const stats = performanceMonitor.getStatistics();
console.log(JSON.stringify(stats, null, 2));

// Clear metrics (e.g., after deployment)
performanceMonitor.clear();
```

## Rate Limiting

### How It Works

- **Per-user**: If userId provided, limits per user
- **Per-IP**: If no userId, limits per IP address
- **Anonymous**: Fallback identifier

### Handling Rate Limit Errors

Client-side handling:

```typescript
const response = await fetch('/api/ai-chat', {
  method: 'POST',
  body: JSON.stringify({ query, userId }),
});

if (response.status === 429) {
  const data = await response.json();
  const resetTime = new Date(data.resetTime);
  console.log(`Rate limited. Try again at ${resetTime.toLocaleTimeString()}`);
}
```

## Recommended Configurations

### Development

```env
AI_MONITORING_ENABLED=true
AI_LOG_SLOW_QUERIES=true
AI_RATE_LIMIT_ENABLED=false          # No rate limiting in dev
AI_EMBEDDING_CACHE_TTL=60000         # 1 minute (see changes faster)
AI_INTENT_CACHE_TTL=60000
```

### Production (High Traffic)

```env
AI_MONITORING_ENABLED=true
AI_LOG_SLOW_QUERIES=true
AI_SLOW_QUERY_THRESHOLD=1000
AI_RATE_LIMIT_ENABLED=true
AI_MAX_REQUESTS_PER_MINUTE=60
AI_MAX_REQUESTS_PER_HOUR=2000
AI_EMBEDDING_CACHE_TTL=600000        # 10 minutes
AI_INTENT_CACHE_TTL=600000
AI_MAX_EMBEDDING_CACHE_SIZE=500
AI_MAX_INTENT_CACHE_SIZE=500
```

### Production (Cost-Optimized)

```env
AI_MONITORING_ENABLED=false          # Reduce overhead
AI_RATE_LIMIT_ENABLED=true
AI_MAX_REQUESTS_PER_MINUTE=30
AI_MAX_REQUESTS_PER_HOUR=500
AI_EMBEDDING_CACHE_TTL=1800000       # 30 minutes
AI_INTENT_CACHE_TTL=1800000
AI_MAX_EMBEDDING_CACHE_SIZE=1000
AI_MAX_INTENT_CACHE_SIZE=1000
OPENAI_MODEL=gpt-4o-mini
OPENAI_MODEL_COMPLEX=gpt-4o-mini
DB_MAX_ENRICHMENT_RESULTS=1          # Minimal enrichment
```

## Troubleshooting

### High API Costs

1. Increase cache TTL and sizes
2. Enable rate limiting
3. Use cheaper models (gpt-4o-mini)
4. Reduce enrichment results

### Slow Response Times

1. Decrease timeouts (3-4 seconds)
2. Reduce DB_MAX_SEARCH_RESULTS
3. Reduce DB_MAX_ENRICHMENT_RESULTS
4. Enable monitoring to identify bottlenecks

### Frequent Timeouts

1. Increase timeout values
2. Check OpenAI API status
3. Verify network connectivity
4. Consider using faster models

### Cache Hit Rate Low

1. Increase cache TTL
2. Increase cache sizes
3. Check if queries are similar enough
4. Enable monitoring to verify cache behavior

## Migration from Previous Configuration

Previous hardcoded values:
```typescript
const CACHE_TTL = 5 * 60 * 1000;  // Now: AI_EMBEDDING_CACHE_TTL
const MAX_CACHE_SIZE = 100;        // Now: AI_MAX_EMBEDDING_CACHE_SIZE
timeout: 5000                      // Now: AI_EMBEDDING_TIMEOUT
temperature: 0.2                   // Now: AI_INTENT_TEMPERATURE
temperature: 0.7                   // Now: AI_RESPONSE_TEMPERATURE
```

All previous defaults are maintained. No breaking changes - all environment variables are optional with sensible defaults.
