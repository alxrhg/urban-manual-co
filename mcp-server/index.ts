#!/usr/bin/env node
/**
 * Urban Manual MCP Server
 *
 * A comprehensive Model Context Protocol server exposing Urban Manual's
 * travel intelligence capabilities to AI assistants.
 *
 * Supports both stdio (local) and HTTP+SSE (remote) transports.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";

// Tool handlers
import { searchTools, handleSearchTool } from "./tools/search.js";
import { recommendationTools, handleRecommendationTool } from "./tools/recommendations.js";
import { tripTools, handleTripTool } from "./tools/trips.js";
import { destinationTools, handleDestinationTool } from "./tools/destinations.js";
import { collectionTools, handleCollectionTool } from "./tools/collections.js";
import { enrichmentTools, handleEnrichmentTool } from "./tools/enrichment.js";
import { chatTools, handleChatTool } from "./tools/chat.js";

// Resource handlers
import { resources, handleResourceRead } from "./resources/index.js";

// Prompt handlers
import { prompts, handleGetPrompt } from "./prompts/index.js";

// Server configuration
const SERVER_NAME = "urban-manual-mcp";
const SERVER_VERSION = "1.0.0";

// Combine all tools
const allTools = [
  ...searchTools,
  ...recommendationTools,
  ...tripTools,
  ...destinationTools,
  ...collectionTools,
  ...enrichmentTools,
  ...chatTools,
];

// Create server instance
const server = new Server(
  {
    name: SERVER_NAME,
    version: SERVER_VERSION,
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  }
);

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: allTools };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    // Route to appropriate handler based on tool name prefix
    if (name.startsWith("search_") || name === "autocomplete") {
      return await handleSearchTool(name, args);
    }
    if (name.startsWith("get_recommendations") || name.startsWith("similar_") || name === "personalized_picks") {
      return await handleRecommendationTool(name, args);
    }
    if (name.startsWith("trip_") || name.startsWith("itinerary_") || name === "plan_day") {
      return await handleTripTool(name, args);
    }
    if (name.startsWith("destination_") || name === "nearby_places" || name === "calculate_distance") {
      return await handleDestinationTool(name, args);
    }
    if (name.startsWith("collection_")) {
      return await handleCollectionTool(name, args);
    }
    if (name.startsWith("get_weather") || name.startsWith("get_events") || name.startsWith("get_trends") || name === "best_time_to_visit") {
      return await handleEnrichmentTool(name, args);
    }
    if (name.startsWith("chat_") || name === "concierge_query") {
      return await handleChatTool(name, args);
    }

    throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [{ type: "text", text: `Error: ${message}` }],
      isError: true,
    };
  }
});

// Handle resource listing
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return { resources };
});

// Handle resource reading
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  return await handleResourceRead(uri);
});

// Handle prompt listing
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return { prompts };
});

// Handle prompt retrieval
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  return await handleGetPrompt(name, args);
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`${SERVER_NAME} v${SERVER_VERSION} running on stdio`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
