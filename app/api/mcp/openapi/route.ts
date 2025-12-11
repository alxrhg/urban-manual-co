/**
 * OpenAPI Schema Endpoint
 *
 * Serves the OpenAPI spec for ChatGPT Custom GPT Actions integration.
 */

import { NextResponse } from "next/server";

const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "Urban Manual Travel Intelligence API",
    description: "Access Urban Manual's curated travel destinations, AI recommendations, and trip planning tools.",
    version: "1.0.0",
  },
  servers: [{ url: "https://www.urbanmanual.co" }],
  paths: {
    "/api/mcp": {
      get: {
        operationId: "getServerInfo",
        summary: "Get MCP server capabilities",
        description: "Returns available tools, resources, and prompts",
        responses: { "200": { description: "Server info and capabilities" } },
      },
      post: {
        operationId: "mcpRequest",
        summary: "Execute MCP tool or query",
        description: "Process a JSON-RPC request to search destinations, get recommendations, plan trips, etc.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["jsonrpc", "method"],
                properties: {
                  jsonrpc: { type: "string", enum: ["2.0"] },
                  id: { type: ["string", "number"] },
                  method: { type: "string", description: "MCP method (tools/list, tools/call, resources/list, resources/read, prompts/list, prompts/get)" },
                  params: { type: "object", description: "Method parameters" },
                },
              },
              examples: {
                listTools: { summary: "List available tools", value: { jsonrpc: "2.0", id: 1, method: "tools/list", params: {} } },
                searchDestinations: { summary: "Search destinations in Tokyo", value: { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "search_destinations", arguments: { city: "Tokyo", category: "restaurant", limit: 5 } } } },
                getRecommendations: { summary: "Get personalized recommendations", value: { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "get_recommendations", arguments: { city: "Paris", mood: "romantic dinner", budget: "upscale" } } } },
                getWeather: { summary: "Get weather for a city", value: { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "get_weather", arguments: { city: "London", days: 3 } } } },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "JSON-RPC response",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    jsonrpc: { type: "string" },
                    id: { type: ["string", "number"] },
                    result: { type: "object" },
                    error: { type: "object", properties: { code: { type: "number" }, message: { type: "string" } } },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", description: "Urban Manual account JWT token" },
    },
  },
  security: [{ bearerAuth: [] }],
};

export async function GET() {
  return NextResponse.json(openApiSpec, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
