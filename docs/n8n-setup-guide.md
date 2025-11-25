# n8n Discovery Pipeline Setup Guide

This guide explains how to set up automated place discovery using n8n.

## Overview

The pipeline:
1. **Fetches** new places from Google Places API
2. **Stores** them as candidates in the `discovery_candidates` table
3. **Notifies** you via Slack/Email when new places are found
4. **You review** in the admin panel (`/admin/discover`)
5. **Approve/Reject** candidates with one click

## API Endpoints

### 1. Fetch New Places
```
POST /api/discovery/fetch
```

**Request Body:**
```json
{
  "city": "Tokyo",           // Optional: single city
  "cities": ["Tokyo", "Paris"], // Optional: multiple cities
  "category": "Restaurant",  // Optional: filter by category
  "minRating": 4.2,          // Optional: minimum Google rating (default: 4.0)
  "limit": 20                // Optional: max results per city (default: 20)
}
```

**Valid Categories:** `Restaurant`, `Cafe`, `Bar`, `Hotel`, `Culture`, `Shopping`, `Bakery`, `Park`, `Other`

**Response:**
```json
{
  "success": true,
  "inserted": 5,
  "total_found": 20,
  "already_exists": 15,
  "cities_processed": ["Tokyo"],
  "category_filter": "Restaurant",
  "candidates": [...]
}
```

### 2. List Candidates
```
GET /api/discovery/candidates?city=Tokyo&category=Restaurant&limit=50&offset=0
```

**Response:**
```json
{
  "candidates": [...],
  "total": 42,
  "limit": 50,
  "offset": 0
}
```

### 3. Approve Candidate
```
POST /api/discovery/candidates/{id}/approve
```

Enriches the place with Google Places data and adds to destinations.

### 4. Reject Candidate
```
POST /api/discovery/candidates/{id}/reject
```

## n8n Setup

### Step 1: Import the Workflow

1. Go to n8n → Workflows → Import from File
2. Select `docs/n8n-discovery-workflow.json`

### Step 2: Configure Variables

In n8n, go to **Settings → Variables** and add:

| Variable | Value |
|----------|-------|
| `URBAN_MANUAL_URL` | `https://www.urbanmanual.co` |

### Step 3: Configure Slack (Optional)

1. Create a Slack credential in n8n
2. Update the Slack node with your credential ID
3. Change the channel name if needed

### Step 4: Activate the Workflow

The workflow runs every 12 hours by default.

## Workflow Variations

### Targeted City Discovery

Create a manual trigger workflow for specific cities:

```json
{
  "city": "Lisbon",
  "category": "Restaurant",
  "minRating": 4.3,
  "limit": 30
}
```

### Category Rotation

Rotate through categories on different days:

```javascript
// In a Code node
const categories = ['Restaurant', 'Cafe', 'Bar', 'Hotel', 'Culture'];
const dayOfWeek = new Date().getDay();
const category = categories[dayOfWeek % categories.length];

return {
  json: {
    fetchParams: {
      category,
      minRating: 4.0,
      limit: 25
    }
  }
};
```

### Multiple Cities Batch

Fetch from your top cities:

```json
{
  "cities": ["Tokyo", "Paris", "London", "New York", "Barcelona"],
  "minRating": 4.2,
  "limit": 15
}
```

## Webhook for Real-time Triggers

You can also trigger discovery via webhook:

```bash
curl -X POST https://your-n8n-instance.com/webhook/discovery-trigger \
  -H "Content-Type: application/json" \
  -d '{"city": "Berlin", "category": "Cafe"}'
```

## Monitoring

### Check Pending Candidates
```bash
curl https://www.urbanmanual.co/api/discovery/candidates
```

### Clear All Candidates
```bash
curl -X DELETE https://www.urbanmanual.co/api/discovery/candidates
```

## Example n8n Workflows

### 1. Basic Discovery (Every 12 Hours)
- Schedule Trigger (12h interval)
- HTTP Request → POST /api/discovery/fetch
- IF node → Check if inserted > 0
- Slack notification

### 2. City-Specific Discovery (Manual)
- Webhook Trigger
- Set node → Configure city/category from webhook
- HTTP Request → POST /api/discovery/fetch
- Slack notification with results

### 3. Weekly Report
- Schedule Trigger (Weekly)
- HTTP Request → GET /api/discovery/candidates
- Aggregate stats
- Email summary

## Admin Panel

Review and approve candidates at:
```
https://www.urbanmanual.co/admin/discover
```

Features:
- Filter by city and category
- See Google ratings and review counts
- Direct link to Google Maps
- One-click approve/reject
- Pagination for large queues
