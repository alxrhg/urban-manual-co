/**
 * MCP HTTP Handler
 *
 * Processes MCP JSON-RPC requests for the HTTP API.
 * This is the server-side handler used by the API routes.
 */

import { createServiceRoleClient } from "@/lib/supabase/server";

// Server info
const SERVER_NAME = "urban-manual-mcp";
const SERVER_VERSION = "1.0.0";

// Tool definitions
const searchTools = [
  {
    name: "search_destinations",
    description: "Search for travel destinations by query, city, category, or filters.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
        city: { type: "string", description: "Filter by city" },
        category: { type: "string", description: "Filter by category" },
        limit: { type: "number", description: "Max results (default: 10)" },
      },
    },
  },
  {
    name: "search_semantic",
    description: "AI-powered semantic search using embeddings.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Natural language query" },
        city: { type: "string" },
        limit: { type: "number" },
      },
      required: ["query"],
    },
  },
];

const recommendationTools = [
  {
    name: "get_recommendations",
    description: "Get AI-powered destination recommendations.",
    inputSchema: {
      type: "object",
      properties: {
        city: { type: "string" },
        category: { type: "string" },
        mood: { type: "string", description: "e.g., 'romantic dinner', 'casual brunch'" },
        budget: { type: "string", enum: ["budget", "moderate", "upscale", "luxury"] },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "similar_destinations",
    description: "Find destinations similar to a given place.",
    inputSchema: {
      type: "object",
      properties: {
        destination_slug: { type: "string", description: "Slug of destination to match" },
        same_city: { type: "boolean" },
        limit: { type: "number" },
      },
      required: ["destination_slug"],
    },
  },
];

const destinationTools = [
  {
    name: "destination_get",
    description: "Get full details of a destination by slug.",
    inputSchema: {
      type: "object",
      properties: {
        slug: { type: "string", description: "Destination slug" },
      },
      required: ["slug"],
    },
  },
  {
    name: "nearby_places",
    description: "Find destinations near a location.",
    inputSchema: {
      type: "object",
      properties: {
        latitude: { type: "number" },
        longitude: { type: "number" },
        destination_slug: { type: "string" },
        radius_km: { type: "number" },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "destination_list_by_city",
    description: "Get all destinations in a city.",
    inputSchema: {
      type: "object",
      properties: {
        city: { type: "string" },
        category: { type: "string" },
        limit: { type: "number" },
      },
      required: ["city"],
    },
  },
];

const enrichmentTools = [
  {
    name: "get_weather",
    description: "Get weather forecast for a city.",
    inputSchema: {
      type: "object",
      properties: {
        city: { type: "string" },
        days: { type: "number" },
      },
      required: ["city"],
    },
  },
  {
    name: "get_trends",
    description: "Get trending destinations.",
    inputSchema: {
      type: "object",
      properties: {
        city: { type: "string" },
        category: { type: "string" },
        limit: { type: "number" },
      },
    },
  },
];

const tripTools = [
  {
    name: "plan_trip",
    description: "Plan a multi-day trip to a city. Returns recommended destinations organized by day based on location and category. Use this when users ask to plan a trip.",
    inputSchema: {
      type: "object",
      properties: {
        city: { type: "string", description: "City to visit" },
        days: { type: "number", description: "Number of days (1-14)" },
        interests: { type: "array", items: { type: "string" }, description: "e.g., ['restaurants', 'architecture', 'cocktail bars']" },
      },
      required: ["city", "days"],
    },
  },
  {
    name: "trip_create",
    description: "Save a trip to the user's account.",
    inputSchema: {
      type: "object",
      properties: {
        user_id: { type: "string" },
        title: { type: "string" },
        destinations: { type: "array", items: { type: "string" } },
        start_date: { type: "string" },
        end_date: { type: "string" },
      },
      required: ["user_id", "title", "destinations", "start_date", "end_date"],
    },
  },
  {
    name: "trip_list",
    description: "List trips for a user.",
    inputSchema: {
      type: "object",
      properties: {
        user_id: { type: "string" },
        limit: { type: "number" },
      },
      required: ["user_id"],
    },
  },
];

// All tools
const allTools = [
  ...searchTools,
  ...recommendationTools,
  ...destinationTools,
  ...enrichmentTools,
  ...tripTools,
];

// Resources
const resources = [
  { uri: "urbanmanual://destinations", name: "All Destinations", description: "Complete destination list", mimeType: "application/json" },
  { uri: "urbanmanual://cities", name: "Cities", description: "All cities with destinations", mimeType: "application/json" },
  { uri: "urbanmanual://trending", name: "Trending", description: "Trending destinations", mimeType: "application/json" },
];

// Prompts - empty, use tools for conversational interaction
const prompts: { name: string; description: string; arguments?: { name: string; required?: boolean }[] }[] = [];

/**
 * Process a JSON-RPC request
 */
export async function processRequest(request: {
  jsonrpc: string;
  id: unknown;
  method: string;
  params?: Record<string, unknown>;
}): Promise<{
  jsonrpc: string;
  id: unknown;
  result?: unknown;
  error?: { code: number; message: string };
}> {
  const { id, method, params } = request;

  try {
    let result: unknown;

    switch (method) {
      case "initialize":
        result = {
          protocolVersion: "2024-11-05",
          serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
          capabilities: { tools: {}, resources: {}, prompts: {} },
        };
        break;

      case "tools/list":
        result = { tools: allTools };
        break;

      case "tools/call":
        result = await handleToolCall(
          (params as { name: string; arguments?: Record<string, unknown> }).name,
          (params as { name: string; arguments?: Record<string, unknown> }).arguments
        );
        break;

      case "resources/list":
        result = { resources };
        break;

      case "resources/read":
        result = await handleResourceRead((params as { uri: string }).uri);
        break;

      case "prompts/list":
        result = { prompts };
        break;

      case "prompts/get":
        result = { messages: [{ role: "user", content: { type: "text", text: `Prompt: ${(params as { name: string }).name}` } }] };
        break;

      case "ping":
        result = {};
        break;

      default:
        return { jsonrpc: "2.0", id, error: { code: -32601, message: `Unknown method: ${method}` } };
    }

    return { jsonrpc: "2.0", id, result };
  } catch (error) {
    return {
      jsonrpc: "2.0",
      id,
      error: { code: -32603, message: error instanceof Error ? error.message : "Internal error" },
    };
  }
}

/**
 * Handle tool calls
 */
async function handleToolCall(name: string, args?: Record<string, unknown>) {
  const supabase = createServiceRoleClient();

  switch (name) {
    case "search_destinations": {
      const { query, city, category, limit = 10 } = args || {};
      let dbQuery = supabase
        .from("destinations")
        .select("slug, name, city, category, micro_description, rating, image")
        .limit(Math.min(Number(limit), 50));

      if (city) dbQuery = dbQuery.ilike("city", `%${city}%`);
      if (category) dbQuery = dbQuery.ilike("category", `%${category}%`);
      if (query) dbQuery = dbQuery.or(`name.ilike.%${query}%,micro_description.ilike.%${query}%`);

      const { data, error } = await dbQuery;
      if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      return { content: [{ type: "text", text: JSON.stringify({ count: data?.length || 0, destinations: data || [] }, null, 2) }] };
    }

    case "get_recommendations": {
      const { city, category, mood, limit = 5 } = args || {};
      let dbQuery = supabase
        .from("destinations")
        .select("slug, name, city, category, micro_description, rating, image")
        .order("rating", { ascending: false, nullsFirst: false })
        .limit(Number(limit) * 2);

      if (city) dbQuery = dbQuery.ilike("city", `%${city}%`);
      if (category) dbQuery = dbQuery.ilike("category", `%${category}%`);
      if (mood) dbQuery = dbQuery.or(`micro_description.ilike.%${mood}%,description.ilike.%${mood}%`);

      const { data } = await dbQuery;
      return { content: [{ type: "text", text: JSON.stringify({ recommendations: (data || []).slice(0, Number(limit)) }, null, 2) }] };
    }

    case "similar_destinations": {
      const { destination_slug, same_city, limit = 5 } = args || {};
      const { data: source } = await supabase.from("destinations").select("*").eq("slug", destination_slug).single();

      if (!source) return { content: [{ type: "text", text: "Destination not found" }] };

      let dbQuery = supabase
        .from("destinations")
        .select("slug, name, city, category, micro_description, rating")
        .eq("category", source.category)
        .neq("slug", destination_slug)
        .limit(Number(limit));

      if (same_city) dbQuery = dbQuery.eq("city", source.city);

      const { data } = await dbQuery;
      return { content: [{ type: "text", text: JSON.stringify({ source: source.name, similar: data || [] }, null, 2) }] };
    }

    case "destination_get": {
      const { slug } = args || {};
      const { data, error } = await supabase.from("destinations").select("*").eq("slug", slug).single();

      if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }

    case "nearby_places": {
      const { latitude, longitude, destination_slug, radius_km = 2, limit = 10 } = args || {};
      let lat = latitude as number | undefined;
      let lng = longitude as number | undefined;

      if (destination_slug && (!lat || !lng)) {
        const { data } = await supabase.from("destinations").select("latitude, longitude").eq("slug", destination_slug).single();
        if (data) { lat = data.latitude; lng = data.longitude; }
      }

      if (!lat || !lng) return { content: [{ type: "text", text: "Coordinates required" }] };

      const radiusDeg = Number(radius_km) / 111;
      const { data } = await supabase
        .from("destinations")
        .select("slug, name, city, category, rating, latitude, longitude")
        .gte("latitude", lat - radiusDeg)
        .lte("latitude", lat + radiusDeg)
        .gte("longitude", lng - radiusDeg)
        .lte("longitude", lng + radiusDeg)
        .neq("slug", destination_slug || "")
        .limit(Number(limit));

      return { content: [{ type: "text", text: JSON.stringify({ center: { lat, lng }, places: data || [] }, null, 2) }] };
    }

    case "destination_list_by_city": {
      const { city, category, limit = 20 } = args || {};
      let dbQuery = supabase
        .from("destinations")
        .select("slug, name, category, micro_description, rating, image")
        .ilike("city", `%${city}%`)
        .order("rating", { ascending: false, nullsFirst: false })
        .limit(Number(limit));

      if (category) dbQuery = dbQuery.ilike("category", `%${category}%`);
      const { data } = await dbQuery;

      return { content: [{ type: "text", text: JSON.stringify({ city, count: data?.length || 0, destinations: data || [] }, null, 2) }] };
    }

    case "get_weather": {
      const { city, days = 3 } = args || {};
      try {
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(String(city))}&count=1`);
        const geo = await geoRes.json();
        if (!geo.results?.length) return { content: [{ type: "text", text: `City not found: ${city}` }] };

        const { latitude, longitude, name } = geo.results[0];
        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode&current_weather=true&timezone=auto&forecast_days=${Math.min(Number(days), 7)}`);
        const weather = await weatherRes.json();

        return { content: [{ type: "text", text: JSON.stringify({ location: name, current: weather.current_weather, forecast: weather.daily }, null, 2) }] };
      } catch (e) {
        return { content: [{ type: "text", text: `Weather error: ${e instanceof Error ? e.message : "Unknown"}` }] };
      }
    }

    case "get_trends": {
      const { city, category, limit = 10 } = args || {};
      let dbQuery = supabase
        .from("destinations")
        .select("slug, name, city, category, rating, views_count, saves_count")
        .order("views_count", { ascending: false, nullsFirst: false })
        .limit(Number(limit));

      if (city) dbQuery = dbQuery.ilike("city", `%${city}%`);
      if (category) dbQuery = dbQuery.ilike("category", `%${category}%`);

      const { data } = await dbQuery;
      return { content: [{ type: "text", text: JSON.stringify({ trending: data || [] }, null, 2) }] };
    }

    case "plan_trip": {
      const { city, days } = args || {};
      const numDays = Math.min(Math.max(Number(days) || 3, 1), 14);

      // Fetch ALL destinations for the city (no limit)
      const { data: allDestinations } = await supabase
        .from("destinations")
        .select("slug, name, city, category, micro_description, rating, latitude, longitude, image")
        .ilike("city", `%${city}%`)
        .order("rating", { ascending: false, nullsFirst: false });

      if (!allDestinations?.length) {
        return { content: [{ type: "text", text: `No destinations found in ${city}. Try a different city.` }] };
      }

      // Group by category
      type Destination = typeof allDestinations[number];
      const byCategory = new Map<string, Destination[]>();
      allDestinations.forEach(d => {
        const cat = d.category || "other";
        if (!byCategory.has(cat)) byCategory.set(cat, []);
        byCategory.get(cat)!.push(d);
      });

      // Create daily itinerary
      const itinerary: { day: number; theme: string; places: Destination[] }[] = [];
      const usedSlugs = new Set<string>();
      const categories = Array.from(byCategory.keys());

      for (let day = 1; day <= numDays; day++) {
        const dayPlaces: Destination[] = [];
        const theme = categories[(day - 1) % categories.length] || "exploration";

        // Add 4-5 places per day from different categories
        for (const [, places] of byCategory) {
          const available = places.filter(p => !usedSlugs.has(p.slug));
          if (available.length > 0) {
            const pick = available[0];
            dayPlaces.push(pick);
            usedSlugs.add(pick.slug);
            if (dayPlaces.length >= 5) break;
          }
        }

        itinerary.push({ day, theme, places: dayPlaces });
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            city,
            days: numDays,
            total_destinations_in_city: allDestinations.length,
            itinerary,
            categories: Array.from(byCategory.keys()),
          }, null, 2)
        }]
      };
    }

    case "trip_create": {
      const { user_id, title, destinations, start_date, end_date } = args || {};
      const { data, error } = await supabase
        .from("trips")
        .insert({ user_id, title, destination: JSON.stringify(destinations), start_date, end_date, status: "planning" })
        .select()
        .single();

      if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      return { content: [{ type: "text", text: JSON.stringify({ success: true, trip: data }, null, 2) }] };
    }

    case "trip_list": {
      const { user_id, limit = 10 } = args || {};
      const { data } = await supabase
        .from("trips")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", { ascending: false })
        .limit(Number(limit));

      return { content: [{ type: "text", text: JSON.stringify({ trips: data || [] }, null, 2) }] };
    }

    default:
      return { content: [{ type: "text", text: `Unknown tool: ${name}` }] };
  }
}

/**
 * Handle resource reads
 */
async function handleResourceRead(uri: string) {
  const supabase = createServiceRoleClient();

  if (uri === "urbanmanual://destinations") {
    const { data } = await supabase.from("destinations").select("slug, name, city, category, rating").order("city");
    return { contents: [{ uri, mimeType: "application/json", text: JSON.stringify({ count: data?.length || 0, destinations: data || [] }, null, 2) }] };
  }

  if (uri === "urbanmanual://cities") {
    const { data } = await supabase.from("destinations").select("city, country");
    const counts = new Map<string, number>();
    data?.forEach(d => counts.set(d.city, (counts.get(d.city) || 0) + 1));
    const cities = Array.from(counts.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
    return { contents: [{ uri, mimeType: "application/json", text: JSON.stringify({ cities }, null, 2) }] };
  }

  if (uri === "urbanmanual://trending") {
    const { data } = await supabase.from("destinations").select("slug, name, city, category, views_count").order("views_count", { ascending: false }).limit(20);
    return { contents: [{ uri, mimeType: "application/json", text: JSON.stringify({ trending: data || [] }, null, 2) }] };
  }

  return { contents: [{ uri, mimeType: "application/json", text: JSON.stringify({ error: "Resource not found" }) }] };
}

/**
 * Get server info
 */
export function getServerInfo() {
  return {
    name: SERVER_NAME,
    version: SERVER_VERSION,
    capabilities: { tools: allTools.length, resources: resources.length, prompts: prompts.length },
  };
}

/**
 * Get available endpoints
 */
export const endpoints = {
  tools: allTools.map(t => ({ name: t.name, description: t.description })),
  resources: resources.map(r => ({ uri: r.uri, name: r.name })),
  prompts: prompts.map(p => ({ name: p.name, description: p.description })),
};
