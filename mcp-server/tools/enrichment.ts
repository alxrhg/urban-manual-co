/**
 * Enrichment Tools
 *
 * Tools for getting contextual data:
 * - Weather information
 * - Local events
 * - Trending destinations
 * - Best time to visit
 * - Seasonality data
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { createServiceClient } from "../utils/supabase.js";

export const enrichmentTools: Tool[] = [
  {
    name: "get_weather",
    description: "Get current weather and forecast for a city. Useful for planning activities.",
    inputSchema: {
      type: "object",
      properties: {
        city: {
          type: "string",
          description: "City name",
        },
        country: {
          type: "string",
          description: "Country code (e.g., 'US', 'JP')",
        },
        days: {
          type: "number",
          description: "Forecast days (default: 3, max: 7)",
        },
      },
      required: ["city"],
    },
  },
  {
    name: "get_events",
    description: "Get upcoming events in a city.",
    inputSchema: {
      type: "object",
      properties: {
        city: {
          type: "string",
          description: "City name",
        },
        date_from: {
          type: "string",
          description: "Start date (ISO format)",
        },
        date_to: {
          type: "string",
          description: "End date (ISO format)",
        },
        category: {
          type: "string",
          enum: ["music", "art", "food", "sports", "festival", "all"],
          description: "Event category filter",
        },
        limit: {
          type: "number",
          description: "Maximum events (default: 10)",
        },
      },
      required: ["city"],
    },
  },
  {
    name: "get_trends",
    description: "Get trending destinations and what's popular right now.",
    inputSchema: {
      type: "object",
      properties: {
        city: {
          type: "string",
          description: "Optional city filter",
        },
        category: {
          type: "string",
          description: "Optional category filter",
        },
        timeframe: {
          type: "string",
          enum: ["today", "this_week", "this_month"],
          description: "Trending timeframe (default: this_week)",
        },
        limit: {
          type: "number",
          description: "Maximum results (default: 10)",
        },
      },
    },
  },
  {
    name: "best_time_to_visit",
    description: "Get the best time to visit a destination or city based on weather, crowds, and events.",
    inputSchema: {
      type: "object",
      properties: {
        city: {
          type: "string",
          description: "City to analyze",
        },
        destination_slug: {
          type: "string",
          description: "Specific destination to check",
        },
        preferences: {
          type: "object",
          properties: {
            avoid_crowds: { type: "boolean" },
            prefer_warm: { type: "boolean" },
            prefer_dry: { type: "boolean" },
          },
          description: "Visitor preferences",
        },
      },
    },
  },
  {
    name: "get_seasonality",
    description: "Get seasonal information for a city including peak times, weather patterns, and recommendations.",
    inputSchema: {
      type: "object",
      properties: {
        city: {
          type: "string",
          description: "City name",
        },
        month: {
          type: "number",
          description: "Specific month (1-12)",
        },
      },
      required: ["city"],
    },
  },
  {
    name: "get_discovery_prompts",
    description: "Get AI-generated discovery prompts based on current time, season, and trends.",
    inputSchema: {
      type: "object",
      properties: {
        city: {
          type: "string",
          description: "City for localized prompts",
        },
        user_id: {
          type: "string",
          description: "User ID for personalized prompts",
        },
        count: {
          type: "number",
          description: "Number of prompts (default: 5)",
        },
      },
    },
  },
];

export async function handleEnrichmentTool(
  name: string,
  args: Record<string, unknown> | undefined
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const supabase = createServiceClient();

  switch (name) {
    case "get_weather": {
      const { city, country, days = 3 } = args || {};

      if (!city) {
        return { content: [{ type: "text", text: "Error: city is required" }] };
      }

      // Use Open-Meteo API (free, no key required)
      try {
        // First, geocode the city
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(String(city))}&count=1`;
        const geoResponse = await fetch(geoUrl);
        const geoData = await geoResponse.json();

        if (!geoData.results || geoData.results.length === 0) {
          return { content: [{ type: "text", text: `Could not find location: ${city}` }] };
        }

        const { latitude, longitude, name: locationName, country: countryName } = geoData.results[0];

        // Get weather forecast
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode&current_weather=true&timezone=auto&forecast_days=${Math.min(Number(days), 7)}`;
        const weatherResponse = await fetch(weatherUrl);
        const weatherData = await weatherResponse.json();

        // Map weather codes to descriptions
        const weatherCodes: Record<number, string> = {
          0: "Clear sky",
          1: "Mainly clear",
          2: "Partly cloudy",
          3: "Overcast",
          45: "Foggy",
          48: "Depositing rime fog",
          51: "Light drizzle",
          53: "Moderate drizzle",
          55: "Dense drizzle",
          61: "Slight rain",
          63: "Moderate rain",
          65: "Heavy rain",
          71: "Slight snow",
          73: "Moderate snow",
          75: "Heavy snow",
          80: "Slight rain showers",
          81: "Moderate rain showers",
          82: "Violent rain showers",
          95: "Thunderstorm",
        };

        const forecast = weatherData.daily.time.map((date: string, i: number) => ({
          date,
          temp_high_c: weatherData.daily.temperature_2m_max[i],
          temp_low_c: weatherData.daily.temperature_2m_min[i],
          temp_high_f: Math.round(weatherData.daily.temperature_2m_max[i] * 9 / 5 + 32),
          temp_low_f: Math.round(weatherData.daily.temperature_2m_min[i] * 9 / 5 + 32),
          precipitation_chance: weatherData.daily.precipitation_probability_max[i],
          condition: weatherCodes[weatherData.daily.weathercode[i]] || "Unknown",
        }));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  location: { name: locationName, country: countryName, latitude, longitude },
                  current: {
                    temp_c: weatherData.current_weather.temperature,
                    temp_f: Math.round(weatherData.current_weather.temperature * 9 / 5 + 32),
                    condition: weatherCodes[weatherData.current_weather.weathercode] || "Unknown",
                    wind_kmh: weatherData.current_weather.windspeed,
                  },
                  forecast,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error fetching weather: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    }

    case "get_events": {
      const { city, date_from, date_to, category = "all", limit = 10 } = args || {};

      if (!city) {
        return { content: [{ type: "text", text: "Error: city is required" }] };
      }

      // Check if we have cached events in database
      let query = supabase
        .from("events")
        .select("*")
        .ilike("city", `%${city}%`)
        .limit(Number(limit));

      if (date_from) {
        query = query.gte("start_date", date_from);
      }
      if (date_to) {
        query = query.lte("start_date", date_to);
      }
      if (category !== "all") {
        query = query.ilike("category", `%${category}%`);
      }

      const { data: events, error } = await query;

      if (error) {
        // Table might not exist, return sample data structure
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  city,
                  note: "Events data not available. Consider integrating with an events API.",
                  suggested_sources: [
                    "Eventbrite API",
                    "Ticketmaster API",
                    "Local tourism board APIs",
                  ],
                },
                null,
                2
              ),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                city,
                date_range: { from: date_from || "now", to: date_to || "open" },
                count: events?.length || 0,
                events: events || [],
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case "get_trends": {
      const { city, category, timeframe = "this_week", limit = 10 } = args || {};

      // Get destinations with highest recent views
      let query = supabase
        .from("destinations")
        .select("slug, name, city, category, micro_description, rating, image, views_count, saves_count")
        .order("views_count", { ascending: false, nullsFirst: false })
        .limit(Number(limit) * 2);

      if (city) {
        query = query.ilike("city", `%${city}%`);
      }
      if (category) {
        query = query.ilike("category", `%${category}%`);
      }

      const { data, error } = await query;

      if (error) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      }

      // Calculate trend score (views + saves * 2)
      const trending = (data || [])
        .map((d) => ({
          ...d,
          trend_score: (d.views_count || 0) + (d.saves_count || 0) * 2,
        }))
        .sort((a, b) => b.trend_score - a.trend_score)
        .slice(0, Number(limit));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                timeframe,
                filters: { city: city || "all", category: category || "all" },
                count: trending.length,
                trending,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case "best_time_to_visit": {
      const { city, destination_slug, preferences } = args || {};

      if (!city && !destination_slug) {
        return { content: [{ type: "text", text: "Error: city or destination_slug required" }] };
      }

      let targetCity = city as string;

      if (destination_slug) {
        const { data } = await supabase
          .from("destinations")
          .select("city")
          .eq("slug", destination_slug)
          .single();
        if (data) {
          targetCity = data.city;
        }
      }

      // City-based recommendations (could be enhanced with actual data)
      const citySeasons: Record<string, {
        best_months: number[];
        avoid_months: number[];
        peak_season: string;
        notes: string;
      }> = {
        tokyo: {
          best_months: [3, 4, 10, 11],
          avoid_months: [6, 7, 8],
          peak_season: "Cherry blossom (late March-early April)",
          notes: "Spring for cherry blossoms, fall for foliage. Summer is hot and humid.",
        },
        paris: {
          best_months: [4, 5, 6, 9, 10],
          avoid_months: [7, 8],
          peak_season: "Summer (July-August) - most crowded",
          notes: "Spring and fall offer mild weather and fewer crowds.",
        },
        london: {
          best_months: [5, 6, 9],
          avoid_months: [12, 1, 2],
          peak_season: "Summer (June-August)",
          notes: "Late spring offers best weather. Winter is cold and dark.",
        },
        "new york": {
          best_months: [4, 5, 9, 10],
          avoid_months: [1, 2, 7, 8],
          peak_season: "Holiday season (December)",
          notes: "Fall is spectacular. Summer can be very hot, winter very cold.",
        },
        copenhagen: {
          best_months: [5, 6, 7, 8],
          avoid_months: [11, 12, 1, 2],
          peak_season: "Summer (June-August)",
          notes: "Long summer days are magical. Winter is dark but cozy (hygge).",
        },
      };

      const cityLower = targetCity.toLowerCase();
      const seasonInfo = citySeasons[cityLower] || {
        best_months: [4, 5, 9, 10],
        avoid_months: [],
        peak_season: "Varies",
        notes: "Research local weather patterns for best timing.",
      };

      const prefs = preferences as Record<string, boolean> | undefined;
      let adjustedBest = [...seasonInfo.best_months];

      if (prefs?.avoid_crowds) {
        // Move away from peak months
        adjustedBest = adjustedBest.filter((m) => ![7, 8, 12].includes(m));
      }

      const monthNames = [
        "", "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                city: targetCity,
                destination: destination_slug || null,
                recommendation: {
                  best_months: adjustedBest.map((m) => ({ month: m, name: monthNames[m] })),
                  avoid_months: seasonInfo.avoid_months.map((m) => ({ month: m, name: monthNames[m] })),
                  peak_season: seasonInfo.peak_season,
                  notes: seasonInfo.notes,
                },
                preferences_applied: prefs || {},
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case "get_seasonality": {
      const { city, month } = args || {};

      if (!city) {
        return { content: [{ type: "text", text: "Error: city is required" }] };
      }

      const currentMonth = month || new Date().getMonth() + 1;
      const monthNames = [
        "", "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];

      // Seasonal activity recommendations
      const seasonalActivities: Record<number, string[]> = {
        1: ["museums", "indoor dining", "winter sports"],
        2: ["museums", "indoor dining", "winter activities"],
        3: ["parks", "early outdoor dining", "walking tours"],
        4: ["parks", "outdoor cafes", "gardens", "walking tours"],
        5: ["rooftops", "outdoor dining", "markets", "cycling"],
        6: ["beaches", "rooftops", "festivals", "outdoor events"],
        7: ["beaches", "rooftops", "outdoor concerts", "al fresco dining"],
        8: ["beaches", "rooftops", "outdoor events", "night markets"],
        9: ["food festivals", "wine tours", "parks", "cultural events"],
        10: ["food tours", "museums", "fall foliage", "hiking"],
        11: ["museums", "food tours", "holiday markets"],
        12: ["holiday markets", "festive dining", "indoor attractions"],
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                city,
                month: {
                  number: currentMonth,
                  name: monthNames[currentMonth],
                },
                season: getSeason(currentMonth),
                recommended_activities: seasonalActivities[currentMonth] || [],
                tip: getSeasonalTip(currentMonth),
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case "get_discovery_prompts": {
      const { city, user_id, count = 5 } = args || {};

      const now = new Date();
      const hour = now.getHours();
      const month = now.getMonth() + 1;

      // Time-based prompts
      const timePrompts: Record<string, string[]> = {
        morning: [
          "Best breakfast spots to start the day",
          "Coffee shops with great atmosphere",
          "Morning walks and parks",
        ],
        afternoon: [
          "Perfect lunch destinations",
          "Museums and galleries to explore",
          "Hidden gems for afternoon discovery",
        ],
        evening: [
          "Dinner reservations to make",
          "Best sunset viewing spots",
          "Cocktail bars for the evening",
        ],
        night: [
          "Late night dining options",
          "Best bars for a nightcap",
          "Night views and atmosphere",
        ],
      };

      // Season-based prompts
      const seasonPrompts: Record<string, string[]> = {
        spring: ["Outdoor terraces now open", "Spring menus to try", "Cherry blossom spots"],
        summer: ["Best rooftop bars", "Al fresco dining picks", "Beach day destinations"],
        fall: ["Cozy restaurants for autumn", "Fall food festivals", "Scenic autumn walks"],
        winter: ["Warm and cozy spots", "Holiday special menus", "Indoor activities"],
      };

      const timeOfDay = hour < 12 ? "morning" : hour < 17 ? "afternoon" : hour < 21 ? "evening" : "night";
      const season = getSeason(month);

      const prompts = [
        ...timePrompts[timeOfDay],
        ...seasonPrompts[season],
      ];

      // Add city-specific if provided
      if (city) {
        prompts.push(`Hidden gems in ${city}`, `Local favorites in ${city}`);
      }

      // Shuffle and limit
      const shuffled = prompts.sort(() => Math.random() - 0.5).slice(0, Number(count));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                context: {
                  time_of_day: timeOfDay,
                  season,
                  city: city || "global",
                },
                prompts: shuffled.map((text, i) => ({ id: i + 1, prompt: text })),
              },
              null,
              2
            ),
          },
        ],
      };
    }

    default:
      return { content: [{ type: "text", text: `Unknown enrichment tool: ${name}` }] };
  }
}

function getSeason(month: number): string {
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "fall";
  return "winter";
}

function getSeasonalTip(month: number): string {
  const tips: Record<number, string> = {
    1: "New Year brings special tasting menus at many restaurants",
    2: "Valentine's Day reservations book up fast",
    3: "Spring menus start appearing",
    4: "Outdoor seating begins opening",
    5: "Perfect weather for walking tours",
    6: "Rooftop season is in full swing",
    7: "Book ahead - peak tourist season",
    8: "Many locals on vacation - some places closed",
    9: "Food festivals and harvest menus",
    10: "Fall foliage activities",
    11: "Holiday menus and early winter specials",
    12: "Holiday markets and festive dining",
  };
  return tips[month] || "Great time to explore";
}
