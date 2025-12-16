/**
 * CopilotKit Runtime API Route
 *
 * Connects CopilotKit frontend to Google Gemini for A2UI-enabled chat.
 * This enables AI-generated rich UI components in chat responses.
 */

import {
  CopilotRuntime,
  GoogleGenerativeAIAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { NextRequest } from "next/server";

// Initialize the Gemini adapter
const serviceAdapter = new GoogleGenerativeAIAdapter({
  model: "gemini-2.0-flash-exp", // Using latest Gemini model
});

// Initialize CopilotKit runtime with travel-focused system prompt
const runtime = new CopilotRuntime({
  actions: [
    {
      name: "searchDestinations",
      description: "Search for travel destinations, restaurants, hotels, and attractions",
      parameters: [
        {
          name: "query",
          type: "string",
          description: "The search query for destinations",
          required: true,
        },
        {
          name: "city",
          type: "string",
          description: "Filter by city name",
          required: false,
        },
        {
          name: "category",
          type: "string",
          description: "Filter by category (restaurant, hotel, bar, cafe, attraction)",
          required: false,
        },
      ],
      handler: async ({ query, city, category }: { query: string; city?: string; category?: string }) => {
        // Call the existing search API
        const params = new URLSearchParams({ q: query });
        if (city) params.append("city", city);
        if (category) params.append("category", category);

        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
        const response = await fetch(`${baseUrl}/api/search?${params}`);
        const data = await response.json();

        return {
          destinations: data.results?.slice(0, 5) || [],
          totalResults: data.total || 0,
        };
      },
    },
    {
      name: "getDestinationDetails",
      description: "Get detailed information about a specific destination by slug",
      parameters: [
        {
          name: "slug",
          type: "string",
          description: "The URL slug of the destination",
          required: true,
        },
      ],
      handler: async ({ slug }: { slug: string }) => {
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
        const response = await fetch(`${baseUrl}/api/destinations/${slug}`);
        const data = await response.json();
        return data;
      },
    },
    {
      name: "getCityGuide",
      description: "Get a travel guide for a specific city including top destinations",
      parameters: [
        {
          name: "city",
          type: "string",
          description: "The city name",
          required: true,
        },
      ],
      handler: async ({ city }: { city: string }) => {
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
        const response = await fetch(`${baseUrl}/api/cities/${encodeURIComponent(city.toLowerCase())}`);
        const data = await response.json();
        return data;
      },
    },
  ],
});

export const POST = async (req: NextRequest) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter,
    endpoint: "/api/copilotkit",
  });

  return handleRequest(req);
};
