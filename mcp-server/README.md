# Urban Manual MCP Server

A comprehensive Model Context Protocol (MCP) server that exposes Urban Manual's travel intelligence capabilities to AI assistants like Claude.

## Features

### Tools (60+)

**Search & Discovery**
- `search_destinations` - Search destinations by query, city, category, filters
- `search_semantic` - AI-powered semantic search using embeddings
- `autocomplete` - Get autocomplete suggestions
- `search_by_architect` - Find places by architect/designer
- `search_multimodal` - Advanced multi-criteria search

**Recommendations**
- `get_recommendations` - AI-powered destination recommendations
- `get_recommendations_contextual` - Context-aware (time, weather, location)
- `similar_destinations` - Find similar places
- `personalized_picks` - User-personalized recommendations
- `get_recommendations_for_trip` - Trip-optimized suggestions

**Trip Planning**
- `trip_create` - Create new trips
- `trip_get` / `trip_list` - Retrieve trips
- `itinerary_add_item` / `itinerary_remove_item` - Manage itinerary
- `itinerary_generate` - AI-powered itinerary generation
- `plan_day` - Plan a single day
- `itinerary_analyze` - Check for scheduling issues
- `itinerary_optimize` - Optimize route order

**Destinations**
- `destination_get` - Full destination details
- `nearby_places` - Find nearby destinations
- `calculate_distance` - Distance/travel time between places
- `destination_opening_hours` - Get opening hours
- `destination_list_by_city` - All destinations in a city
- `destination_cities` / `destination_categories` - List cities/categories

**Collections**
- `collection_create` / `collection_list` / `collection_get`
- `collection_add_destination` / `collection_remove_destination`
- `collection_save_place` - Quick save
- `collection_mark_visited` - Mark as visited
- `collection_get_saved` / `collection_get_visited`

**Enrichment**
- `get_weather` - Current weather and forecast
- `get_events` - Local events
- `get_trends` - Trending destinations
- `best_time_to_visit` - Optimal visit timing
- `get_seasonality` - Seasonal information
- `get_discovery_prompts` - AI discovery prompts

**Chat & Concierge**
- `concierge_query` - AI concierge with RAG
- `chat_get_context` - Conversation context
- `chat_save_message` - Save to history
- `chat_get_suggestions` - Follow-up suggestions
- `chat_analyze_intent` - Intent/entity extraction

### Resources

- `urbanmanual://destinations` - All destinations
- `urbanmanual://destinations/{city}` - City destinations
- `urbanmanual://destination/{slug}` - Single destination
- `urbanmanual://cities` - All cities
- `urbanmanual://categories` - All categories
- `urbanmanual://architects` - Architects database
- `urbanmanual://movements` - Architectural movements
- `urbanmanual://user/{id}/trips` - User trips
- `urbanmanual://user/{id}/saved` - Saved places
- `urbanmanual://user/{id}/visited` - Visited places
- `urbanmanual://trending` - Trending now
- `urbanmanual://stats` - Platform statistics

### Prompts

- `trip_planning` - Plan a multi-day trip
- `restaurant_recommendation` - Find restaurants
- `day_in_city` - Plan a perfect day
- `hidden_gems` - Discover local favorites
- `architecture_tour` - Architecture-focused exploration
- `romantic_evening` - Date night planning
- `seasonal_visit` - Seasonal recommendations
- `similar_to` - Find similar places

## Installation

### From the Urban Manual monorepo

```bash
cd mcp-server
npm install
npm run build
```

### Environment Variables

Required:
```env
# Supabase (required)
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# For semantic search (optional but recommended)
OPENAI_API_KEY=your-openai-key
UPSTASH_VECTOR_REST_URL=your-upstash-url
UPSTASH_VECTOR_REST_TOKEN=your-upstash-token
```

## Usage

### Local Development (stdio)

```bash
# Run in development mode
npm run dev

# Test with MCP Inspector
npm run inspect
```

### Online / HTTP API (Recommended)

The MCP server is also available as an HTTP API, deployed on Vercel:

**Base URL:** `https://www.urbanmanual.co/api/mcp`

#### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/mcp` | GET | Server info and capability discovery |
| `/api/mcp` | POST | Process single JSON-RPC request |
| `/api/mcp/batch` | POST | Process multiple requests in parallel |
| `/api/mcp/sse` | GET | SSE streaming connection |

#### Authentication

Include a Supabase Auth JWT token in the Authorization header:

```bash
Authorization: Bearer <your-jwt-token>
```

#### Example: Single Request

```bash
curl -X POST https://www.urbanmanual.co/api/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "search_destinations",
      "arguments": { "city": "Tokyo", "category": "restaurant" }
    }
  }'
```

#### Example: Batch Request

```bash
curl -X POST https://www.urbanmanual.co/api/mcp/batch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "requests": [
      { "jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {} },
      { "jsonrpc": "2.0", "id": 2, "method": "tools/call", "params": { "name": "get_weather", "arguments": { "city": "Paris" } } }
    ]
  }'
```

#### Rate Limits

- Single requests: 100/minute
- Batch requests: 50/minute (max 20 requests per batch)

### With Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "urban-manual": {
      "command": "node",
      "args": ["/path/to/urban-manual-co/mcp-server/dist/index.js"],
      "env": {
        "SUPABASE_URL": "your-url",
        "SUPABASE_SERVICE_ROLE_KEY": "your-key",
        "OPENAI_API_KEY": "your-key"
      }
    }
  }
}
```

### With Claude Code

The MCP server can be used directly with Claude Code for enhanced travel planning capabilities.

## Development

```bash
# Type check
npm run typecheck

# Build
npm run build

# Clean build artifacts
npm run clean
```

## Architecture

```
mcp-server/
├── index.ts           # Server entry point (stdio)
├── http-handler.ts    # HTTP transport handler
├── tools/
│   ├── search.ts      # Search tools
│   ├── recommendations.ts
│   ├── trips.ts       # Trip planning
│   ├── destinations.ts
│   ├── collections.ts
│   ├── enrichment.ts  # Weather, events, trends
│   └── chat.ts        # Concierge & chat
├── resources/
│   └── index.ts       # MCP resources
├── prompts/
│   └── index.ts       # MCP prompts
└── utils/
    ├── supabase.ts    # Database client
    ├── vector.ts      # Vector search
    └── types.ts       # Type definitions

app/api/mcp/
├── route.ts           # Main HTTP endpoint
├── batch/route.ts     # Batch processing
└── sse/route.ts       # SSE streaming
```

## License

Private - Urban Manual
