# Exa Enrichment Guide

This guide explains how to use Exa to enrich your database with additional web information about destinations.

## Overview

The Exa enrichment script (`scripts/enrich-with-exa.ts`) fetches web information about destinations using Exa and stores it in the database. This data can then be used by your AI chat and other features without needing to fetch from the web in real-time.

## Setup

### 1. Run the Migration

First, run the migration to add the necessary columns:

```bash
# If using Supabase CLI
supabase migration up

# Or run the SQL directly in your Supabase dashboard
# File: supabase/migrations/027_add_web_content_enrichment.sql
```

This adds:
- **Architect/Design Fields:**
  - `architect` - Architect name
  - `interior_designer` - Interior designer name
  - `design_firm` - Design firm/studio name
  - `architectural_style` - Style (e.g., "Modernist", "Brutalist", "Contemporary")
  - `design_period` - Period (e.g., "1960s", "Contemporary")
  - `architect_info_json` - Full architect/design details with sources
  - `architect_info_updated_at` - Timestamp of last architect info update
- **General Web Content:**
  - `web_content_json` - JSONB column storing general Exa search results
  - `web_content_updated_at` - Timestamp of last web content update

### 2. Configure Exa Access

You have two options:

#### Option A: Use Exa MCP (Local)
If you have Exa MCP configured locally, you'll need to modify `scripts/enrich-with-exa.ts` to call your MCP endpoint. The script includes placeholder comments showing where to add the MCP call.

#### Option B: Use Exa API Key
Add your Exa API key to `.env.local`:

```bash
EXA_API_KEY=your_exa_api_key_here
```

The script will automatically use the API key if available.

## Usage

### Basic Enrichment

Enrich the next 10 destinations that haven't been enriched:

```bash
npm run enrich:exa
```

### Enrich with Limit

Enrich a specific number of destinations:

```bash
npm run enrich:exa -- --limit 50
```

### Enrich with Offset

Start from a specific offset:

```bash
npm run enrich:exa -- --limit 50 --offset 100
```

### Enrich All Destinations

Enrich all destinations (including those already enriched):

```bash
npm run enrich:exa -- --all
```

### Re-enrich Old Data

The script automatically re-enriches destinations older than 30 days. To force re-enrichment of all destinations:

```bash
npm run enrich:exa -- --all
```

## How It Works

1. **Fetches destinations** from the database that need enrichment
2. **Searches Exa for architect/design info** using: `{name} architect interior design {city}`
   - Extracts architect, interior designer, design firm, architectural style, and design period
   - Stores in structured fields (`architect`, `interior_designer`, etc.) and `architect_info_json`
3. **Searches Exa for general web content** using: `{name} {category} {city}`
4. **Stores results** in:
   - Structured fields for architect/design info
   - `architect_info_json` - Full architect details with sources
   - `web_content_json` - General web search results array with:
     - `title` - Article/page title
     - `url` - Source URL
     - `text` - Extracted text content
     - `score` - Relevance score
     - `publishedDate` - Publication date (if available)

## Rate Limiting

The script includes a 1-second delay between requests to avoid overwhelming Exa. You can adjust this in the script if needed.

## Using the Enriched Data

Once enriched, you can access the web content in your queries:

```typescript
const { data } = await supabase
  .from('destinations')
  .select('name, web_content_json')
  .eq('slug', 'some-destination');

const webContent = data?.web_content_json; // Array of Exa results
```

## Example Use Cases

- **AI Chat**: Use stored web content to provide more detailed responses
- **Destination Pages**: Display recent articles or reviews about a place
- **Trends**: Identify trending destinations based on recent web mentions
- **Content Enrichment**: Automatically update descriptions with current information

## Notes

- The script only enriches top-level destinations (not nested destinations)
- Web content is stored as JSONB for efficient querying
- The script tracks when content was last updated for re-enrichment
- Failed enrichments are logged but don't stop the process

