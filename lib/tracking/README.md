# Enhanced Tracking System (Phase 1)

A comprehensive behavioral tracking system that captures 50+ user interaction signals for ML/AI personalization.

## 🎯 Overview

The Enhanced Tracking System captures granular user behavior including:

- **Hover tracking** - Duration, count, click hesitation
- **Scroll behavior** - Depth, velocity, direction changes
- **Dwell time** - Active vs idle time
- **Content interaction** - Image views, text selection, video watching
- **Navigation patterns** - Back button, external links, booking clicks
- **Engagement metrics** - Calculated engagement score (0-1)

## 🏗️ Architecture

```
┌─────────────────┐
│  React Component│
│   (Destination) │
└────────┬────────┘
         │ useEnhancedTracking()
         ▼
┌─────────────────┐
│ EnhancedTracker │
│  (Client-Side)  │
└────────┬────────┘
         │ Batches Events
         ▼
┌─────────────────┐
│  EventBatcher   │
│ (IndexedDB)     │
└────────┬────────┘
         │ Every 5s or 50 events
         ▼
┌─────────────────┐
│ /api/tracking/  │
│     batch       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    PostgreSQL   │
│enriched_inter..│
└─────────────────┘
```

## 🚀 Quick Start

### 1. Run Database Migration

```sql
-- In Supabase SQL Editor
-- Execute: migrations/010_enhanced_tracking.sql
```

### 2. Add Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Integrate in React Components

#### Basic Usage

```tsx
import { useEnhancedTracking } from '@/hooks/useEnhancedTracking'

function DestinationPage({ destination }) {
  useEnhancedTracking({
    destinationId: destination.id,
    source: 'recommendation',
  })

  return (
    <div>
      {/* Your destination content */}
    </div>
  )
}
```

#### Specialized Hooks

```tsx
// Track destination view
useDestinationTracking(destinationId, 'search')

// Track search result
useSearchResultTracking(destinationId, 'italian restaurant', position)

// Track recommendation
useRecommendationTracking(destinationId, position)

// Track category browsing
useCategoryTracking(destinationId, 'restaurants')
```

### 4. Manual Tracking (Advanced)

```tsx
import {
  initializeEnhancedTracker,
  flushEnhancedTracking
} from '@/lib/tracking/enhanced-tracker'

// Initialize
const tracker = initializeEnhancedTracker({
  sessionId: 'session_123',
  userId: 'user_456',
  destinationId: 789,
})

// Manual flush (on navigation)
await flushEnhancedTracking()

// Cleanup
tracker.destroy()
```

## 📊 Captured Signals

### Mouse & Cursor (4 signals)
- `hover_duration_ms` - Total hover time
- `hover_count` - Number of hover events
- `cursor_path_complexity` - Movement pattern complexity (0-1)
- `click_hesitation_ms` - Time from hover to click

### Scroll Behavior (5 signals)
- `scroll_depth_percentage` - Max scroll depth (0-100)
- `max_scroll_depth` - Maximum depth reached
- `scroll_velocity_avg` - Average scroll speed (px/s)
- `scroll_direction_changes` - Up/down direction changes
- `time_to_first_scroll_ms` - Time until first scroll

### Dwell Time & Engagement (5 signals)
- `dwell_time_ms` - Total time on page
- `active_time_ms` - Time actively engaged
- `engagement_score` - Calculated engagement (0-1)
- `tab_switches` - Number of tab switches
- `idle_time_ms` - Time spent idle

### Content Interaction (6 signals)
- `images_viewed` - Array of viewed image URLs
- `image_interactions` - Image clicks/zooms
- `text_selections` - Text selection count
- `text_copied` - Whether text was copied
- `video_played` - Video play event
- `video_watch_duration_ms` - Video watch time

### Navigation (5 signals)
- `back_button_used` - Back button clicked
- `external_link_hovers` - Hover count on external links
- `share_button_hovers` - Share button hovers
- `save_button_hovers` - Save button hovers
- `booking_link_clicks` - Booking link clicks

### Interaction Patterns (3 signals)
- `click_count` - Total clicks
- `double_click_count` - Double clicks
- `right_click_count` - Right clicks

### Context (6 signals)
- `viewport_width` - Viewport width (px)
- `viewport_height` - Viewport height (px)
- `device_orientation` - Portrait/landscape
- `battery_level` - Battery % (if available)
- `connection_type` - Network type (4g, wifi, etc.)
- `source` - Traffic source

**Total: 50+ signals**

## 🧮 Engagement Score Calculation

The engagement score (0-1) is calculated using weighted factors:

```typescript
score =
  dwell_time (0-300s normalized) × 0.3 +
  scroll_depth (0-100%) × 0.2 +
  hover_duration (0-10s normalized) × 0.1 +
  active_time_ratio × 0.2 +
  text_copied (boolean) × 0.1 +
  image_interactions (>2) × 0.1
```

Higher scores indicate stronger engagement.

## 🔧 Performance Optimizations

### Client-Side
- **Request Idle Callback** - Non-blocking tracking
- **Event Delegation** - Efficient event listeners
- **Passive Listeners** - Smooth scrolling
- **Throttling** - Cursor tracking sampled every 100ms
- **Memory Limits** - Max 100 cursor points stored

### Server-Side
- **Batch Processing** - Process 50 events at once
- **Rate Limiting** - 60 requests/minute per user
- **IndexedDB Retry** - Failed batches stored locally
- **Beacon API** - Guaranteed delivery on page unload

### Network
- **Auto-flushing** - Every 5 seconds OR 50 events
- **Keep-Alive** - Requests persist across page transitions
- **Beacon Fallback** - Uses `navigator.sendBeacon()` on unload

## 📈 Database Schema

### `enriched_interactions` Table

Primary table storing all interaction signals.

```sql
CREATE TABLE enriched_interactions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  destination_id INT REFERENCES destinations(id),
  session_id UUID REFERENCES user_sessions(id),

  -- 50+ signal fields
  hover_duration_ms INT,
  scroll_depth_percentage INT,
  dwell_time_ms INT,
  engagement_score FLOAT,
  -- ... (see migration file for complete schema)

  created_at TIMESTAMP DEFAULT NOW()
);
```

### `interaction_features` Materialized View

Aggregated metrics per user for ML training.

```sql
CREATE MATERIALIZED VIEW interaction_features AS
SELECT
  user_id,
  AVG(hover_duration_ms) as avg_hover_duration,
  AVG(scroll_depth_percentage) as avg_scroll_depth,
  AVG(engagement_score) as avg_engagement_score,
  -- ... (aggregated features)
FROM enriched_interactions
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY user_id;
```

Refresh daily:
```sql
SELECT refresh_interaction_features();
```

## 🔍 Querying Tracking Data

### Get User's Recent Interactions

```sql
SELECT
  destination_id,
  dwell_time_ms,
  engagement_score,
  scroll_depth_percentage,
  created_at
FROM enriched_interactions
WHERE user_id = 'user_id_here'
ORDER BY created_at DESC
LIMIT 50;
```

### Get High-Engagement Interactions

```sql
SELECT
  user_id,
  destination_id,
  engagement_score,
  dwell_time_ms,
  scroll_depth_percentage
FROM enriched_interactions
WHERE engagement_score > 0.7
  AND created_at > NOW() - INTERVAL '7 days'
ORDER BY engagement_score DESC;
```

### Get Aggregated User Behavior

```sql
SELECT * FROM interaction_features
WHERE user_id = 'user_id_here';
```

## 🐛 Debugging

### Check Event Queue

```typescript
import { getGlobalBatcher } from '@/lib/tracking/event-batcher'

const batcher = getGlobalBatcher()
console.log('Queue size:', batcher.getQueueSize())
console.log('Failed batches:', await batcher.getFailedBatchCount())
```

### Clear Failed Batches

```typescript
await batcher.clearFailedBatches()
```

### Manual Flush

```typescript
await batcher.flush()
```

### View IndexedDB

1. Open Chrome DevTools
2. Go to Application > Storage > IndexedDB
3. Find `urban_manual_tracking` database
4. View `failed_batches` store

## 🔒 Privacy & Compliance

### GDPR Compliance

Users must consent to detailed tracking:

```tsx
const { user, profile } = useAuth()

if (!profile.allow_tracking) {
  // Don't initialize enhanced tracking
  return
}

useEnhancedTracking({ destinationId, enabled: profile.allow_tracking })
```

### Data Retention

```sql
-- Auto-delete old interactions (> 90 days)
DELETE FROM enriched_interactions
WHERE created_at < NOW() - INTERVAL '90 days';
```

### Anonymization

```sql
-- Anonymize interactions for churned users
UPDATE enriched_interactions
SET user_id = NULL
WHERE user_id IN (SELECT id FROM auth.users WHERE deleted_at IS NOT NULL);
```

## 📊 Analytics & Insights

### Average Engagement by Source

```sql
SELECT
  source,
  COUNT(*) as interaction_count,
  AVG(engagement_score) as avg_engagement,
  AVG(dwell_time_ms / 1000.0) as avg_dwell_seconds
FROM enriched_interactions
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY source
ORDER BY avg_engagement DESC;
```

### User Behavior Patterns

```sql
SELECT
  user_id,
  AVG(scroll_depth_percentage) as avg_scroll_depth,
  AVG(dwell_time_ms / 1000.0) as avg_dwell_seconds,
  SUM(CASE WHEN text_copied THEN 1 ELSE 0 END) as copy_count,
  SUM(booking_link_clicks) as booking_clicks
FROM enriched_interactions
GROUP BY user_id
HAVING COUNT(*) > 10;
```

## 🚨 Troubleshooting

### Events Not Saving

1. **Check Network Tab** - Look for `/api/tracking/batch` requests
2. **Verify Environment Variables** - Ensure `SUPABASE_SERVICE_ROLE_KEY` is set
3. **Check RLS Policies** - Service role should bypass RLS
4. **View Failed Batches** - Check IndexedDB for failed batches

### High Memory Usage

1. **Reduce Cursor Sampling** - Increase throttle interval from 100ms
2. **Limit Cursor Points** - Reduce `MAX_CURSOR_POINTS` from 100
3. **Disable on Mobile** - Skip tracking on low-memory devices

### Performance Issues

1. **Use Request Idle Callback** - Already implemented
2. **Debounce Scroll Handler** - Already implemented
3. **Passive Event Listeners** - Already implemented
4. **Increase Batch Size** - Change `BATCH_SIZE` from 50 to 100

## 🧪 Testing

### Unit Tests

```bash
npm test lib/tracking/enhanced-tracker.test.ts
npm test lib/tracking/event-batcher.test.ts
```

### Integration Tests

```bash
npm test app/api/tracking/batch/route.test.ts
```

### Manual Testing

1. Open destination page
2. Interact (scroll, hover, click)
3. Wait 5 seconds for auto-flush
4. Check Network tab for `POST /api/tracking/batch`
5. Verify data in `enriched_interactions` table

## 📚 Next Steps

After Phase 1 is complete, move to:

- **Phase 2:** Taste Profile ML Engine (uses this data)
- **Phase 3:** Explainable Recommendations
- **Phase 5:** Cold-Start Solution

## 🤝 Contributing

When adding new signals:

1. Add field to `InteractionSignal` interface
2. Update database migration
3. Update API endpoint to process new field
4. Update engagement score calculation if needed
5. Document the new signal in this README

## 📝 License

Proprietary - Urban Manual
