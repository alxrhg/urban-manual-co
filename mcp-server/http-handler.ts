/**
 * HTTP Handler for MCP Server
 *
 * Provides HTTP+SSE transport for running MCP over the web.
 * This allows the MCP server to be deployed as a Vercel API route.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ErrorCode,
  McpError,
  JSONRPCMessage,
  JSONRPCRequest,
  JSONRPCResponse,
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

/**
 * Process a single JSON-RPC request and return a response
 */
export async function processRequest(request: JSONRPCRequest): Promise<JSONRPCResponse> {
  const { id, method, params } = request;

  try {
    let result: unknown;

    switch (method) {
      case "initialize":
        result = {
          protocolVersion: "2024-11-05",
          serverInfo: {
            name: SERVER_NAME,
            version: SERVER_VERSION,
          },
          capabilities: {
            tools: {},
            resources: {},
            prompts: {},
          },
        };
        break;

      case "tools/list":
        result = { tools: allTools };
        break;

      case "tools/call": {
        const { name, arguments: args } = params as { name: string; arguments?: Record<string, unknown> };
        result = await handleToolCall(name, args);
        break;
      }

      case "resources/list":
        result = { resources };
        break;

      case "resources/read": {
        const { uri } = params as { uri: string };
        result = await handleResourceRead(uri);
        break;
      }

      case "prompts/list":
        result = { prompts };
        break;

      case "prompts/get": {
        const { name, arguments: args } = params as { name: string; arguments?: Record<string, string> };
        result = await handleGetPrompt(name, args);
        break;
      }

      case "ping":
        result = {};
        break;

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown method: ${method}`);
    }

    return {
      jsonrpc: "2.0",
      id,
      result,
    };
  } catch (error) {
    const mcpError = error instanceof McpError
      ? error
      : new McpError(
          ErrorCode.InternalError,
          error instanceof Error ? error.message : "Unknown error"
        );

    return {
      jsonrpc: "2.0",
      id,
      error: {
        code: mcpError.code,
        message: mcpError.message,
      },
    };
  }
}

/**
 * Route tool calls to appropriate handlers
 */
async function handleToolCall(
  name: string,
  args: Record<string, unknown> | undefined
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  try {
    // Route to appropriate handler based on tool name
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
    if (name.startsWith("get_weather") || name.startsWith("get_events") || name.startsWith("get_trends") || name === "best_time_to_visit" || name === "get_seasonality" || name === "get_discovery_prompts") {
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
}

/**
 * Server info for capability discovery
 */
export function getServerInfo() {
  return {
    name: SERVER_NAME,
    version: SERVER_VERSION,
    capabilities: {
      tools: allTools.length,
      resources: resources.length,
      prompts: prompts.length,
    },
  };
}

/**
 * List of available endpoints for documentation
 */
export const endpoints = {
  tools: allTools.map((t) => ({ name: t.name, description: t.description })),
  resources: resources.map((r) => ({ uri: r.uri, name: r.name, description: r.description })),
  prompts: prompts.map((p) => ({ name: p.name, description: p.description })),
};
