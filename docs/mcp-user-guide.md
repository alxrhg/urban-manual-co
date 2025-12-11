# Urban Manual AI Assistant Integration

Connect Urban Manual's travel intelligence to your favorite AI assistant.

## What You Get

Access 900+ curated destinations through AI with:
- **Smart Search** - Find places by mood, cuisine, architecture, or any criteria
- **AI Recommendations** - Personalized picks based on your taste profile
- **Trip Planning** - Generate day-by-day itineraries automatically
- **Real-time Info** - Weather, events, trending destinations
- **Your Collections** - Access saved places and trip history

---

## Setup for Claude Desktop

### 1. Get Your API Token

1. Log in to [urbanmanual.co](https://www.urbanmanual.co)
2. Go to **Account → Settings → API Access**
3. Click **Generate Token**
4. Copy your token (keep it secret!)

### 2. Configure Claude Desktop

**On macOS:**
Open `~/Library/Application Support/Claude/claude_desktop_config.json`

**On Windows:**
Open `%APPDATA%\Claude\claude_desktop_config.json`

Add this configuration:

```json
{
  "mcpServers": {
    "urban-manual": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://www.urbanmanual.co/api/mcp"],
      "env": {
        "MCP_AUTH_TOKEN": "YOUR_TOKEN_HERE"
      }
    }
  }
}
```

### 3. Restart Claude Desktop

The Urban Manual tools will now be available in your Claude conversations.

### Example Prompts

- "Find romantic restaurants in Paris for tonight"
- "Plan a 3-day trip to Tokyo focused on architecture"
- "What are the hidden gems in Copenhagen?"
- "Show me places similar to Noma"
- "What's the best time to visit London?"

---

## Setup for ChatGPT (Custom GPT)

### Creating a Custom GPT with Urban Manual

1. Go to [chat.openai.com](https://chat.openai.com)
2. Click **Explore GPTs → Create**
3. In the **Configure** tab:
   - Name: "Urban Manual Travel Concierge"
   - Description: "Your personal travel guide with access to 900+ curated destinations"

4. Scroll to **Actions → Create new action**
5. Import from URL: `https://www.urbanmanual.co/api/mcp/openapi`
6. Set **Authentication**:
   - Type: **API Key**
   - Auth Type: **Bearer**
   - Enter your Urban Manual API token

7. Save and publish your GPT

### Using with ChatGPT

Once configured, you can ask:
- "Search Urban Manual for coffee shops in Tokyo"
- "Get recommendations for a date night in NYC"
- "What's trending on Urban Manual right now?"

---

## Available Tools

### Search & Discovery
| Tool | Description |
|------|-------------|
| `search_destinations` | Search by city, category, query |
| `search_semantic` | AI-powered conceptual search |
| `autocomplete` | Get suggestions as you type |

### Recommendations
| Tool | Description |
|------|-------------|
| `get_recommendations` | Personalized destination picks |
| `similar_destinations` | "Find more like this" |
| `get_recommendations_contextual` | Based on time, weather, location |

### Trip Planning
| Tool | Description |
|------|-------------|
| `trip_create` | Start a new trip |
| `itinerary_generate` | AI-generate full itinerary |
| `plan_day` | Optimize a single day |
| `itinerary_analyze` | Check for issues |

### Your Data
| Tool | Description |
|------|-------------|
| `collection_get_saved` | Your saved places |
| `collection_get_visited` | Places you've been |
| `trip_list` | Your trips |

### Context & Info
| Tool | Description |
|------|-------------|
| `get_weather` | Current conditions & forecast |
| `get_trends` | What's popular now |
| `best_time_to_visit` | Optimal timing |

---

## Rate Limits

| Plan | Requests/minute |
|------|-----------------|
| Free | 20 |
| Pro | 100 |
| Team | 500 |

---

## Troubleshooting

### "Unauthorized" Error
- Check your API token is correct
- Regenerate token if expired
- Ensure you're logged in to Urban Manual

### "Rate Limit Exceeded"
- Wait 60 seconds and retry
- Consider upgrading your plan
- Use batch requests for multiple queries

### Claude Desktop Not Connecting
- Verify the config file syntax (valid JSON)
- Restart Claude Desktop after changes
- Check for typos in the URL

---

## Privacy & Security

- Your API token is tied to your account
- All requests are logged to your account
- Tokens can be revoked anytime in Settings
- Data is encrypted in transit (HTTPS)

---

## Need Help?

- **Documentation**: [urbanmanual.co/docs](https://www.urbanmanual.co/docs)
- **Support**: support@urbanmanual.co
- **Community**: [Discord](https://discord.gg/urbanmanual)
