/**
 * Recommendation Tools
 *
 * AI-powered recommendation capabilities including:
 * - Personalized recommendations based on user preferences
 * - Similar destination suggestions
 * - Contextual recommendations (time, weather, location)
 * - Cold-start recommendations for new users
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { createServiceClient } from "../utils/supabase.js";
import { searchVectors } from "../utils/vector.js";

export const recommendationTools: Tool[] = [
  {
    name: "get_recommendations",
    description:
      "Get AI-powered destination recommendations. Can be personalized based on user preferences or general suggestions based on criteria.",
    inputSchema: {
      type: "object",
      properties: {
        city: {
          type: "string",
          description: "City to get recommendations for",
        },
        category: {
          type: "string",
          description: "Category of places (restaurant, hotel, bar, etc.)",
        },
        preferences: {
          type: "array",
          items: { type: "string" },
          description: "User preferences (e.g., ['outdoor seating', 'romantic', 'fine dining'])",
        },
        exclude_visited: {
          type: "array",
          items: { type: "string" },
          description: "Slugs of destinations to exclude (already visited)",
        },
        mood: {
          type: "string",
          description: "Current mood or occasion (e.g., 'date night', 'business dinner', 'casual brunch')",
        },
        budget: {
          type: "string",
          enum: ["budget", "moderate", "upscale", "luxury"],
          description: "Budget level preference",
        },
        limit: {
          type: "number",
          description: "Number of recommendations (default: 5)",
        },
      },
    },
  },
  {
    name: "get_recommendations_contextual",
    description:
      "Get context-aware recommendations based on time of day, weather, and current location. Perfect for 'what should I do right now?' queries.",
    inputSchema: {
      type: "object",
      properties: {
        city: {
          type: "string",
          description: "Current city",
        },
        time_of_day: {
          type: "string",
          enum: ["morning", "afternoon", "evening", "night"],
          description: "Current time of day",
        },
        weather: {
          type: "string",
          enum: ["sunny", "cloudy", "rainy", "cold", "hot"],
          description: "Current weather conditions",
        },
        location: {
          type: "object",
          properties: {
            latitude: { type: "number" },
            longitude: { type: "number" },
          },
          description: "Current location for nearby suggestions",
        },
        group_size: {
          type: "number",
          description: "Number of people in the group",
        },
        has_kids: {
          type: "boolean",
          description: "Whether traveling with children",
        },
        limit: {
          type: "number",
          description: "Number of recommendations (default: 5)",
        },
      },
      required: ["city"],
    },
  },
  {
    name: "similar_destinations",
    description:
      "Find destinations similar to a given place. Great for 'I loved X, find me more like it' queries.",
    inputSchema: {
      type: "object",
      properties: {
        destination_slug: {
          type: "string",
          description: "Slug of the destination to find similar places for",
        },
        same_city: {
          type: "boolean",
          description: "Only show results in the same city (default: false)",
        },
        same_category: {
          type: "boolean",
          description: "Only show results in the same category (default: true)",
        },
        limit: {
          type: "number",
          description: "Number of similar destinations (default: 5)",
        },
      },
      required: ["destination_slug"],
    },
  },
  {
    name: "personalized_picks",
    description:
      "Get highly personalized recommendations based on a user's taste profile, past visits, and saved places.",
    inputSchema: {
      type: "object",
      properties: {
        user_id: {
          type: "string",
          description: "User ID for personalization",
        },
        city: {
          type: "string",
          description: "City to focus recommendations on",
        },
        discovery_mode: {
          type: "boolean",
          description: "If true, prioritize new and unexpected suggestions over safe picks",
        },
        limit: {
          type: "number",
          description: "Number of picks (default: 5)",
        },
      },
      required: ["user_id"],
    },
  },
  {
    name: "get_recommendations_for_trip",
    description:
      "Get destination recommendations optimized for a multi-day trip, considering variety, geography, and scheduling.",
    inputSchema: {
      type: "object",
      properties: {
        cities: {
          type: "array",
          items: { type: "string" },
          description: "Cities being visited on the trip",
        },
        days: {
          type: "number",
          description: "Number of days for the trip",
        },
        interests: {
          type: "array",
          items: { type: "string" },
          description: "Trip interests (e.g., ['architecture', 'food', 'art'])",
        },
        pace: {
          type: "string",
          enum: ["relaxed", "moderate", "packed"],
          description: "Desired trip pace",
        },
        must_see: {
          type: "array",
          items: { type: "string" },
          description: "Must-visit destinations (slugs)",
        },
      },
      required: ["cities", "days"],
    },
  },
];

export async function handleRecommendationTool(
  name: string,
  args: Record<string, unknown> | undefined
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const supabase = createServiceClient();

  switch (name) {
    case "get_recommendations": {
      const { city, category, preferences, exclude_visited, mood, budget, limit = 5 } = args || {};

      // Build semantic query from preferences and mood
      const queryParts: string[] = [];
      if (mood) queryParts.push(String(mood));
      if (preferences && Array.isArray(preferences)) {
        queryParts.push(...(preferences as string[]));
      }
      if (budget) queryParts.push(`${budget} budget`);

      let results;
      if (queryParts.length > 0) {
        // Use semantic search for preference-based recommendations
        results = await searchVectors(queryParts.join(" "), {
          city: city as string | undefined,
          category: category as string | undefined,
          limit: Number(limit) * 2,
        });
      } else {
        // Fall back to database query
        let dbQuery = supabase
          .from("destinations")
          .select("slug, name, city, category, micro_description, rating, image, latitude, longitude")
          .order("rating", { ascending: false })
          .limit(Number(limit) * 2);

        if (city) dbQuery = dbQuery.ilike("city", `%${city}%`);
        if (category) dbQuery = dbQuery.ilike("category", `%${category}%`);

        const { data } = await dbQuery;
        results = data || [];
      }

      // Filter out visited places
      if (exclude_visited && Array.isArray(exclude_visited)) {
        results = results.filter((r) => !exclude_visited.includes(r.slug));
      }

      // Apply budget filter
      if (budget) {
        const budgetMap: Record<string, number[]> = {
          budget: [1],
          moderate: [1, 2],
          upscale: [2, 3],
          luxury: [3, 4],
        };
        const levels = budgetMap[budget as string] || [];
        if (levels.length > 0) {
          results = results.filter((r) => !r.price_level || levels.includes(r.price_level));
        }
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                count: results.slice(0, Number(limit)).length,
                recommendations: results.slice(0, Number(limit)),
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case "get_recommendations_contextual": {
      const { city, time_of_day, weather, location, group_size, has_kids, limit = 5 } = args || {};

      // Map time of day to appropriate categories
      const timeCategories: Record<string, string[]> = {
        morning: ["cafe", "museum", "attraction"],
        afternoon: ["restaurant", "museum", "attraction", "shop"],
        evening: ["restaurant", "bar"],
        night: ["bar", "restaurant"],
      };

      const categories = time_of_day ? timeCategories[time_of_day as string] || [] : [];

      // Build contextual query
      const contextParts: string[] = [];
      if (weather === "rainy") contextParts.push("indoor");
      if (weather === "sunny") contextParts.push("outdoor", "terrace");
      if (has_kids) contextParts.push("family friendly");
      if (group_size && Number(group_size) > 4) contextParts.push("large groups");

      let results;
      if (contextParts.length > 0) {
        results = await searchVectors(contextParts.join(" "), {
          city: city as string | undefined,
          limit: Number(limit) * 2,
        });
      } else {
        let dbQuery = supabase
          .from("destinations")
          .select("slug, name, city, category, micro_description, rating, image, latitude, longitude")
          .order("rating", { ascending: false })
          .limit(Number(limit) * 2);

        if (city) dbQuery = dbQuery.ilike("city", `%${city}%`);
        if (categories.length > 0) {
          dbQuery = dbQuery.in("category", categories);
        }

        const { data } = await dbQuery;
        results = data || [];
      }

      // Filter by categories for time of day
      if (categories.length > 0) {
        results = results.filter((r) => categories.some((c) => r.category?.toLowerCase().includes(c)));
      }

      // Sort by proximity if location provided
      if (location && typeof location === "object") {
        const loc = location as { latitude?: number; longitude?: number };
        if (loc.latitude && loc.longitude) {
          results = results
            .map((r) => ({
              ...r,
              distance: r.latitude && r.longitude
                ? Math.sqrt(
                    Math.pow((r.latitude - loc.latitude!) * 111, 2) +
                    Math.pow((r.longitude - loc.longitude!) * 111 * Math.cos(loc.latitude! * (Math.PI / 180)), 2)
                  )
                : Infinity,
            }))
            .sort((a, b) => a.distance - b.distance);
        }
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                context: { time_of_day, weather, city },
                count: results.slice(0, Number(limit)).length,
                recommendations: results.slice(0, Number(limit)),
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case "similar_destinations": {
      const { destination_slug, same_city = false, same_category = true, limit = 5 } = args || {};

      if (!destination_slug) {
        return { content: [{ type: "text", text: "Error: destination_slug is required" }] };
      }

      // Get the source destination
      const { data: source } = await supabase
        .from("destinations")
        .select("*")
        .eq("slug", destination_slug)
        .single();

      if (!source) {
        return { content: [{ type: "text", text: "Error: Destination not found" }] };
      }

      // Search for similar using description
      const searchQuery = [source.micro_description, source.description, source.category].filter(Boolean).join(" ");

      const results = await searchVectors(searchQuery, {
        city: same_city ? source.city : undefined,
        category: same_category ? source.category : undefined,
        limit: Number(limit) + 1, // +1 to exclude self
      });

      // Remove the source destination from results
      const filtered = results.filter((r) => r.slug !== destination_slug);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                source: { name: source.name, city: source.city, category: source.category },
                count: filtered.slice(0, Number(limit)).length,
                similar: filtered.slice(0, Number(limit)),
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case "personalized_picks": {
      const { user_id, city, discovery_mode = false, limit = 5 } = args || {};

      if (!user_id) {
        return { content: [{ type: "text", text: "Error: user_id is required" }] };
      }

      // Get user's visited and saved places
      const [{ data: visited }, { data: saved }, { data: preferences }] = await Promise.all([
        supabase.from("visited_places").select("destination_slug").eq("user_id", user_id),
        supabase.from("saved_places").select("destination_slug").eq("user_id", user_id),
        supabase.from("user_preferences").select("*").eq("user_id", user_id).single(),
      ]);

      const visitedSlugs = visited?.map((v) => v.destination_slug) || [];
      const savedSlugs = saved?.map((s) => s.destination_slug) || [];

      // Build preference-based query
      const prefParts: string[] = [];
      if (preferences?.favorite_categories) {
        prefParts.push(...(preferences.favorite_categories as string[]));
      }
      if (preferences?.preferred_cuisines) {
        prefParts.push(...(preferences.preferred_cuisines as string[]));
      }
      if (discovery_mode) {
        prefParts.push("unique", "hidden gem", "local favorite");
      }

      let results;
      if (prefParts.length > 0) {
        results = await searchVectors(prefParts.join(" "), {
          city: city as string | undefined,
          limit: Number(limit) * 3,
        });
      } else {
        const { data } = await supabase
          .from("destinations")
          .select("slug, name, city, category, micro_description, rating, image")
          .order("rating", { ascending: false })
          .limit(Number(limit) * 3);
        results = data || [];
      }

      // Filter out visited places
      results = results.filter((r) => !visitedSlugs.includes(r.slug));

      // Boost saved places (they indicated interest)
      results = results.map((r) => ({
        ...r,
        score: savedSlugs.includes(r.slug) ? (r.score || 1) * 1.5 : r.score || 1,
      }));

      // Sort by score
      results.sort((a, b) => (b.score || 0) - (a.score || 0));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                personalization: {
                  visited_count: visitedSlugs.length,
                  saved_count: savedSlugs.length,
                  discovery_mode,
                },
                count: results.slice(0, Number(limit)).length,
                picks: results.slice(0, Number(limit)),
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case "get_recommendations_for_trip": {
      const { cities, days, interests, pace = "moderate", must_see } = args || {};

      if (!cities || !Array.isArray(cities) || !days) {
        return { content: [{ type: "text", text: "Error: cities and days are required" }] };
      }

      // Calculate items per day based on pace
      const itemsPerDay: Record<string, number> = {
        relaxed: 3,
        moderate: 5,
        packed: 7,
      };
      const dailyItems = itemsPerDay[pace as string] || 5;
      const totalItems = dailyItems * Number(days);

      // Get recommendations for each city
      const allRecommendations: Array<Record<string, unknown>> = [];

      for (const city of cities as string[]) {
        const interestQuery = interests && Array.isArray(interests) ? (interests as string[]).join(" ") : "";

        let cityResults;
        if (interestQuery) {
          cityResults = await searchVectors(interestQuery, {
            city,
            limit: Math.ceil(totalItems / (cities as string[]).length) * 2,
          });
        } else {
          const { data } = await supabase
            .from("destinations")
            .select("slug, name, city, category, micro_description, rating, image, latitude, longitude")
            .ilike("city", `%${city}%`)
            .order("rating", { ascending: false })
            .limit(Math.ceil(totalItems / (cities as string[]).length) * 2);
          cityResults = data || [];
        }

        allRecommendations.push(
          ...cityResults.map((r) => ({
            ...r,
            is_must_see: must_see && Array.isArray(must_see) && (must_see as string[]).includes(r.slug),
          }))
        );
      }

      // Sort: must-see first, then by rating
      allRecommendations.sort((a, b) => {
        if (a.is_must_see && !b.is_must_see) return -1;
        if (!a.is_must_see && b.is_must_see) return 1;
        return ((b.rating as number) || 0) - ((a.rating as number) || 0);
      });

      // Ensure variety in categories
      const byCategory = new Map<string, Array<Record<string, unknown>>>();
      allRecommendations.forEach((r) => {
        const cat = (r.category as string) || "other";
        if (!byCategory.has(cat)) byCategory.set(cat, []);
        byCategory.get(cat)!.push(r);
      });

      // Interleave categories for variety
      const balanced: Array<Record<string, unknown>> = [];
      let added = true;
      while (added && balanced.length < totalItems) {
        added = false;
        for (const [, items] of byCategory) {
          if (items.length > 0 && balanced.length < totalItems) {
            balanced.push(items.shift()!);
            added = true;
          }
        }
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                trip_params: { cities, days, pace, interests },
                suggested_per_day: dailyItems,
                count: balanced.length,
                recommendations: balanced,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    default:
      return { content: [{ type: "text", text: `Unknown recommendation tool: ${name}` }] };
  }
}
