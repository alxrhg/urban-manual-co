/**
 * MCP Prompts
 *
 * Reusable prompt templates for common travel planning scenarios.
 * These help guide consistent AI interactions for Urban Manual.
 */

import { Prompt, PromptMessage } from "@modelcontextprotocol/sdk/types.js";

// Define available prompts
export const prompts: Prompt[] = [
  {
    name: "trip_planning",
    description: "Help plan a trip to a destination with personalized recommendations",
    arguments: [
      {
        name: "destination",
        description: "City or destination to visit",
        required: true,
      },
      {
        name: "days",
        description: "Number of days for the trip",
        required: true,
      },
      {
        name: "interests",
        description: "Comma-separated list of interests (e.g., 'food, architecture, art')",
        required: false,
      },
      {
        name: "pace",
        description: "Trip pace: relaxed, moderate, or packed",
        required: false,
      },
    ],
  },
  {
    name: "restaurant_recommendation",
    description: "Get personalized restaurant recommendations",
    arguments: [
      {
        name: "city",
        description: "City to find restaurants in",
        required: true,
      },
      {
        name: "occasion",
        description: "Occasion type (e.g., 'date night', 'business dinner', 'casual lunch')",
        required: false,
      },
      {
        name: "cuisine",
        description: "Preferred cuisine type",
        required: false,
      },
      {
        name: "budget",
        description: "Budget level: budget, moderate, upscale, or luxury",
        required: false,
      },
    ],
  },
  {
    name: "day_in_city",
    description: "Plan a perfect day in a city",
    arguments: [
      {
        name: "city",
        description: "City to explore",
        required: true,
      },
      {
        name: "focus",
        description: "What to focus on (e.g., 'food tour', 'architecture walk', 'museum day')",
        required: false,
      },
      {
        name: "start_time",
        description: "Day start time (e.g., '09:00')",
        required: false,
      },
    ],
  },
  {
    name: "hidden_gems",
    description: "Discover hidden gems and local favorites in a city",
    arguments: [
      {
        name: "city",
        description: "City to explore",
        required: true,
      },
      {
        name: "category",
        description: "Category focus (e.g., 'restaurants', 'bars', 'cafes', 'all')",
        required: false,
      },
    ],
  },
  {
    name: "architecture_tour",
    description: "Plan an architecture-focused exploration",
    arguments: [
      {
        name: "city",
        description: "City to explore",
        required: true,
      },
      {
        name: "style",
        description: "Preferred architectural style (e.g., 'modernist', 'art deco', 'contemporary')",
        required: false,
      },
      {
        name: "architect",
        description: "Specific architect to focus on",
        required: false,
      },
    ],
  },
  {
    name: "romantic_evening",
    description: "Plan a romantic evening with dinner and drinks",
    arguments: [
      {
        name: "city",
        description: "City for the evening",
        required: true,
      },
      {
        name: "budget",
        description: "Budget level: moderate, upscale, or luxury",
        required: false,
      },
    ],
  },
  {
    name: "seasonal_visit",
    description: "Get seasonal recommendations for a city",
    arguments: [
      {
        name: "city",
        description: "City to visit",
        required: true,
      },
      {
        name: "month",
        description: "Month of visit (1-12)",
        required: false,
      },
    ],
  },
  {
    name: "similar_to",
    description: "Find places similar to a destination you loved",
    arguments: [
      {
        name: "destination",
        description: "Name or slug of the destination you loved",
        required: true,
      },
      {
        name: "city",
        description: "Optional: find similar in a specific city",
        required: false,
      },
    ],
  },
];

// Handle prompt requests
export async function handleGetPrompt(
  name: string,
  args?: Record<string, string>
): Promise<{ description?: string; messages: PromptMessage[] }> {
  switch (name) {
    case "trip_planning": {
      const { destination, days, interests, pace = "moderate" } = args || {};
      return {
        description: `Plan a ${days}-day trip to ${destination}`,
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `I'm planning a ${days}-day trip to ${destination}. ${
                interests ? `I'm especially interested in: ${interests}.` : ""
              } I prefer a ${pace} pace - ${
                pace === "relaxed"
                  ? "I don't want to rush and prefer quality over quantity."
                  : pace === "packed"
                  ? "I want to see and do as much as possible."
                  : "a good balance of activities and downtime."
              }

Please help me plan this trip using Urban Manual's curated destinations. I'd like:
1. A day-by-day itinerary with specific recommendations
2. Restaurant suggestions for meals
3. The best times to visit each place
4. Any tips for making the most of my time

Please use the trip planning and recommendation tools to find the best destinations for me.`,
            },
          },
        ],
      };
    }

    case "restaurant_recommendation": {
      const { city, occasion, cuisine, budget } = args || {};
      return {
        description: `Restaurant recommendations in ${city}`,
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `I'm looking for restaurant recommendations in ${city}. ${
                occasion ? `This is for a ${occasion}.` : ""
              } ${cuisine ? `I'm in the mood for ${cuisine} cuisine.` : ""} ${
                budget ? `My budget is ${budget}.` : ""
              }

Please search Urban Manual's curated restaurants and give me your top recommendations. For each restaurant, tell me:
- What makes it special
- What to order
- Best time to go
- If I need a reservation`,
            },
          },
        ],
      };
    }

    case "day_in_city": {
      const { city, focus, start_time = "09:00" } = args || {};
      return {
        description: `Perfect day in ${city}`,
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Plan me a perfect day in ${city}${focus ? `, focusing on ${focus}` : ""}.
I'd like to start around ${start_time}.

Please create a detailed schedule with:
- Morning activities
- Lunch recommendation
- Afternoon activities
- Dinner recommendation
- Optional evening activity

For each suggestion, include the best time to visit and roughly how long to spend there. Use Urban Manual's destinations to make this truly special.`,
            },
          },
        ],
      };
    }

    case "hidden_gems": {
      const { city, category = "all" } = args || {};
      return {
        description: `Hidden gems in ${city}`,
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `I want to discover hidden gems and local favorites in ${city}${
                category !== "all" ? `, especially ${category}` : ""
              }. I'm not looking for the typical tourist spots - I want places that locals love and visitors might miss.

Please search Urban Manual for unique, off-the-beaten-path destinations. Tell me:
- Why each place is special
- The best way to experience it
- Any insider tips`,
            },
          },
        ],
      };
    }

    case "architecture_tour": {
      const { city, style, architect } = args || {};
      return {
        description: `Architecture tour in ${city}`,
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `I want to explore the architecture of ${city}. ${
                style ? `I'm particularly interested in ${style} architecture.` : ""
              } ${architect ? `I'd love to see work by ${architect} if possible.` : ""}

Please create an architecture-focused itinerary using Urban Manual's destinations. For each building/space:
- The architect and year
- Architectural significance
- Best viewing angles/times
- Any interior access information

Also suggest a good route to walk between them.`,
            },
          },
        ],
      };
    }

    case "romantic_evening": {
      const { city, budget = "upscale" } = args || {};
      return {
        description: `Romantic evening in ${city}`,
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Plan a romantic evening in ${city} with a ${budget} budget.

I'd like:
1. A special dinner restaurant with intimate atmosphere
2. A bar for pre-dinner drinks or post-dinner nightcap
3. Optional: somewhere beautiful to walk between

For each place, tell me:
- What makes it romantic
- Best table/seat to request
- What to order
- Dress code

Please use Urban Manual's curated selection to find the most romantic spots.`,
            },
          },
        ],
      };
    }

    case "seasonal_visit": {
      const { city, month } = args || {};
      const monthNames = [
        "",
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];
      const monthName = month ? monthNames[parseInt(month)] : "this time of year";

      return {
        description: `Seasonal guide to ${city}`,
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `I'm visiting ${city} in ${monthName}. What should I know about visiting during this season?

Please tell me:
1. Weather expectations and what to pack
2. What's in season (food, events, activities)
3. Places that are particularly good this time of year
4. Anything to avoid or be aware of
5. Specific seasonal recommendations from Urban Manual's destinations

Focus on making the most of the season - seasonal menus, outdoor terraces if weather permits, or cozy indoor spots if not.`,
            },
          },
        ],
      };
    }

    case "similar_to": {
      const { destination, city } = args || {};
      return {
        description: `Find places similar to ${destination}`,
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `I absolutely loved ${destination}. Can you find me similar places${
                city ? ` in ${city}` : ""
              }?

Please search Urban Manual for destinations that share similar qualities - whether that's the atmosphere, cuisine style, design aesthetic, or overall vibe. For each recommendation, explain:
- Why it's similar
- What makes it unique in its own right
- How it compares to my favorite`,
            },
          },
        ],
      };
    }

    default:
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Unknown prompt: ${name}. Available prompts: ${prompts.map((p) => p.name).join(", ")}`,
            },
          },
        ],
      };
  }
}
