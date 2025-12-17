import { initializeMcpApiHandler } from "mcp-handler";
import { z } from "zod";
import { baseURL } from "@/baseUrl";

/**
 * MCP (Model Context Protocol) server for Urban Manual.
 * Enables ChatGPT to interact with Urban Manual's travel guide data.
 */

// Helper to create OpenAI widget metadata
function widgetMeta(
  templateUri: string,
  options?: {
    invokingMessage?: string;
    completedMessage?: string;
    showWidget?: boolean;
    border?: boolean;
  }
) {
  return {
    openai: {
      outputTemplate: {
        uri: templateUri,
      },
      widget: {
        showWidget: options?.showWidget ?? true,
        border: options?.border ?? true,
        domains: [new URL(baseURL).hostname],
      },
      invokingMessage: options?.invokingMessage || "Loading...",
      completedMessage: options?.completedMessage || "Done",
    },
  };
}

// Initialize MCP handler with Urban Manual resources and tools
const handler = initializeMcpApiHandler(
  (server) => {
    // Register content widget resource
    server.resource(
      "urban-manual-widget",
      "Urban Manual travel guide widget",
      {
        uri: `${baseURL}/mcp/widget`,
        mimeType: "text/html",
      },
      async () => {
        return {
          contents: [
            {
              uri: `${baseURL}/mcp/widget`,
              mimeType: "text/html",
              text: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Urban Manual</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; margin: 0; }
    h1 { font-size: 24px; margin-bottom: 8px; }
    p { color: #666; margin: 0; }
    a { color: #0066cc; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>Urban Manual</h1>
  <p>Your curated guide to the world's best hotels, restaurants & travel destinations.</p>
  <p style="margin-top: 16px;"><a href="${baseURL}" target="_blank">Visit Urban Manual</a></p>
</body>
</html>`,
            },
          ],
        };
      }
    );

    // Search destinations tool
    server.tool(
      "search_destinations",
      "Search for travel destinations including hotels, restaurants, bars, and more across cities worldwide",
      {
        query: z
          .string()
          .describe(
            "Search query (e.g., 'Michelin restaurants Tokyo', 'rooftop bars London', 'boutique hotels Paris')"
          ),
        city: z
          .string()
          .optional()
          .describe("Filter by city name (e.g., 'Tokyo', 'London', 'Paris')"),
        category: z
          .string()
          .optional()
          .describe(
            "Filter by category: restaurant, hotel, bar, cafe, shop, museum, park, etc."
          ),
        limit: z
          .number()
          .optional()
          .default(10)
          .describe("Maximum number of results to return (default: 10)"),
      },
      async ({ query, city, category, limit }) => {
        try {
          const searchParams = new URLSearchParams();
          searchParams.set("q", query);
          if (city) searchParams.set("city", city);
          if (category) searchParams.set("category", category);
          if (limit) searchParams.set("limit", limit.toString());

          const response = await fetch(
            `${baseURL}/api/search?${searchParams.toString()}`
          );

          if (!response.ok) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Search failed with status ${response.status}`,
                },
              ],
            };
          }

          const data = await response.json();
          const destinations = data.results || data.destinations || [];

          if (destinations.length === 0) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `No destinations found for "${query}"${city ? ` in ${city}` : ""}${category ? ` (${category})` : ""}`,
                },
              ],
            };
          }

          // Format results
          const resultText = destinations
            .slice(0, limit || 10)
            .map(
              (d: {
                name: string;
                city: string;
                country?: string;
                category: string;
                micro_description?: string;
                rating?: number;
                michelin_stars?: number;
                slug: string;
              }) => {
                const stars = d.michelin_stars
                  ? ` [${"★".repeat(d.michelin_stars)} Michelin]`
                  : "";
                const rating = d.rating ? ` (${d.rating}★)` : "";
                return `- **${d.name}**${stars}${rating}
  ${d.city}${d.country ? `, ${d.country}` : ""} | ${d.category}
  ${d.micro_description || ""}
  [View on Urban Manual](${baseURL}/destination/${d.slug})`;
              }
            )
            .join("\n\n");

          return {
            content: [
              {
                type: "text" as const,
                text: `Found ${destinations.length} destinations for "${query}":\n\n${resultText}`,
              },
            ],
            structuredContent: {
              query,
              city,
              category,
              resultCount: destinations.length,
              destinations: destinations.slice(0, limit || 10).map(
                (d: {
                  name: string;
                  slug: string;
                  city: string;
                  country?: string;
                  category: string;
                  rating?: number;
                  michelin_stars?: number;
                  micro_description?: string;
                }) => ({
                  name: d.name,
                  slug: d.slug,
                  city: d.city,
                  country: d.country,
                  category: d.category,
                  rating: d.rating,
                  michelinStars: d.michelin_stars,
                  description: d.micro_description,
                  url: `${baseURL}/destination/${d.slug}`,
                })
              ),
            },
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Error searching destinations: ${error instanceof Error ? error.message : "Unknown error"}`,
              },
            ],
          };
        }
      },
      widgetMeta(`${baseURL}/mcp/widget`, {
        invokingMessage: "Searching Urban Manual destinations...",
        completedMessage: "Search complete",
      })
    );

    // Get destination details tool
    server.tool(
      "get_destination",
      "Get detailed information about a specific travel destination",
      {
        slug: z
          .string()
          .describe(
            "The destination slug (URL identifier, e.g., 'sukiyabashi-jiro-tokyo' or 'the-ritz-london')"
          ),
      },
      async ({ slug }) => {
        try {
          const response = await fetch(
            `${baseURL}/api/destinations/${slug}/enriched`
          );

          if (!response.ok) {
            if (response.status === 404) {
              return {
                content: [
                  {
                    type: "text" as const,
                    text: `Destination "${slug}" not found. Try searching for it first.`,
                  },
                ],
              };
            }
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Failed to fetch destination: ${response.status}`,
                },
              ],
            };
          }

          const destination = await response.json();

          // Format the destination details
          const stars = destination.michelin_stars
            ? `${"★".repeat(destination.michelin_stars)} Michelin Star${destination.michelin_stars > 1 ? "s" : ""}`
            : null;
          const rating = destination.rating
            ? `${destination.rating}★ rating`
            : null;
          const priceLevel = destination.price_level
            ? "$".repeat(destination.price_level)
            : null;

          let detailText = `# ${destination.name}\n\n`;
          detailText += `**Location:** ${destination.city}${destination.country ? `, ${destination.country}` : ""}\n`;
          detailText += `**Category:** ${destination.category}\n`;

          if (stars) detailText += `**${stars}**\n`;
          if (rating) detailText += `**Rating:** ${rating}\n`;
          if (priceLevel) detailText += `**Price Level:** ${priceLevel}\n`;

          if (destination.description) {
            detailText += `\n${destination.description}\n`;
          } else if (destination.micro_description) {
            detailText += `\n${destination.micro_description}\n`;
          }

          if (destination.formatted_address) {
            detailText += `\n**Address:** ${destination.formatted_address}\n`;
          }
          if (destination.phone_number) {
            detailText += `**Phone:** ${destination.phone_number}\n`;
          }
          if (destination.website) {
            detailText += `**Website:** ${destination.website}\n`;
          }

          detailText += `\n[View full details on Urban Manual](${baseURL}/destination/${slug})`;

          return {
            content: [
              {
                type: "text" as const,
                text: detailText,
              },
            ],
            structuredContent: {
              name: destination.name,
              slug: destination.slug,
              city: destination.city,
              country: destination.country,
              category: destination.category,
              description:
                destination.description || destination.micro_description,
              rating: destination.rating,
              michelinStars: destination.michelin_stars,
              priceLevel: destination.price_level,
              address: destination.formatted_address,
              phone: destination.phone_number,
              website: destination.website,
              coordinates: destination.latitude
                ? {
                    lat: destination.latitude,
                    lng: destination.longitude,
                  }
                : null,
              url: `${baseURL}/destination/${slug}`,
            },
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Error fetching destination: ${error instanceof Error ? error.message : "Unknown error"}`,
              },
            ],
          };
        }
      },
      widgetMeta(`${baseURL}/mcp/widget`, {
        invokingMessage: "Loading destination details...",
        completedMessage: "Destination loaded",
      })
    );

    // Get nearby destinations tool
    server.tool(
      "get_nearby_destinations",
      "Find destinations near a specific location or another destination",
      {
        latitude: z.number().describe("Latitude coordinate"),
        longitude: z.number().describe("Longitude coordinate"),
        radius: z
          .number()
          .optional()
          .default(2)
          .describe("Search radius in kilometers (default: 2)"),
        category: z
          .string()
          .optional()
          .describe("Filter by category: restaurant, hotel, bar, cafe, etc."),
        limit: z
          .number()
          .optional()
          .default(10)
          .describe("Maximum number of results (default: 10)"),
      },
      async ({ latitude, longitude, radius, category, limit }) => {
        try {
          const searchParams = new URLSearchParams();
          searchParams.set("lat", latitude.toString());
          searchParams.set("lng", longitude.toString());
          searchParams.set("radius", (radius || 2).toString());
          if (category) searchParams.set("category", category);
          searchParams.set("limit", (limit || 10).toString());

          const response = await fetch(
            `${baseURL}/api/destinations/nearby?${searchParams.toString()}`
          );

          if (!response.ok) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Failed to fetch nearby destinations: ${response.status}`,
                },
              ],
            };
          }

          const data = await response.json();
          const destinations = data.destinations || [];

          if (destinations.length === 0) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `No destinations found within ${radius || 2}km of the specified location.`,
                },
              ],
            };
          }

          // Format results
          const resultText = destinations
            .map(
              (d: {
                name: string;
                city: string;
                category: string;
                distance_km?: number;
                micro_description?: string;
                slug: string;
              }) => {
                const distance = d.distance_km
                  ? ` (${d.distance_km.toFixed(1)}km away)`
                  : "";
                return `- **${d.name}**${distance}
  ${d.city} | ${d.category}
  ${d.micro_description || ""}
  [View](${baseURL}/destination/${d.slug})`;
              }
            )
            .join("\n\n");

          return {
            content: [
              {
                type: "text" as const,
                text: `Found ${destinations.length} destinations nearby:\n\n${resultText}`,
              },
            ],
            structuredContent: {
              latitude,
              longitude,
              radius: radius || 2,
              resultCount: destinations.length,
              destinations: destinations.map(
                (d: {
                  name: string;
                  slug: string;
                  city: string;
                  category: string;
                  distance_km?: number;
                  micro_description?: string;
                }) => ({
                  name: d.name,
                  slug: d.slug,
                  city: d.city,
                  category: d.category,
                  distanceKm: d.distance_km,
                  description: d.micro_description,
                  url: `${baseURL}/destination/${d.slug}`,
                })
              ),
            },
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Error finding nearby destinations: ${error instanceof Error ? error.message : "Unknown error"}`,
              },
            ],
          };
        }
      },
      widgetMeta(`${baseURL}/mcp/widget`, {
        invokingMessage: "Finding nearby destinations...",
        completedMessage: "Search complete",
      })
    );

    // Get cities tool
    server.tool(
      "get_cities",
      "Get a list of all cities covered by Urban Manual",
      {},
      async () => {
        try {
          const response = await fetch(`${baseURL}/api/cities`);

          if (!response.ok) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Failed to fetch cities: ${response.status}`,
                },
              ],
            };
          }

          const data = await response.json();
          const cities = data.cities || [];

          // Format cities by country
          const citiesByCountry: Record<string, string[]> = {};
          cities.forEach(
            (city: { name: string; country?: string; city?: string }) => {
              const cityName = city.name || city.city;
              const country = city.country || "Other";
              if (!citiesByCountry[country]) {
                citiesByCountry[country] = [];
              }
              citiesByCountry[country].push(cityName);
            }
          );

          let resultText = `# Cities on Urban Manual (${cities.length} total)\n\n`;
          Object.entries(citiesByCountry)
            .sort(([a], [b]) => a.localeCompare(b))
            .forEach(([country, cityList]) => {
              resultText += `**${country}:** ${cityList.join(", ")}\n`;
            });

          resultText += `\n[Explore all cities on Urban Manual](${baseURL}/cities)`;

          return {
            content: [
              {
                type: "text" as const,
                text: resultText,
              },
            ],
            structuredContent: {
              totalCities: cities.length,
              citiesByCountry,
            },
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Error fetching cities: ${error instanceof Error ? error.message : "Unknown error"}`,
              },
            ],
          };
        }
      },
      widgetMeta(`${baseURL}/mcp/widget`, {
        invokingMessage: "Loading cities...",
        completedMessage: "Cities loaded",
      })
    );
  },
  {
    name: "Urban Manual MCP Server",
    version: "1.0.0",
  }
);

export { handler as GET, handler as POST };
