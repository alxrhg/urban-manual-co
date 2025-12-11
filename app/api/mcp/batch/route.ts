/**
 * MCP Batch Endpoint
 *
 * Process multiple JSON-RPC requests in a single HTTP call.
 * Useful for reducing latency when making multiple tool calls.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Import MCP handler
import { processRequest } from "@/lib/mcp/handler";

// Rate limiter
let ratelimit: Ratelimit | null = null;

function getRateLimiter() {
  if (ratelimit) return ratelimit;

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (redisUrl && redisToken) {
    const redis = new Redis({ url: redisUrl, token: redisToken });
    ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(50, "1 m"), // 50 batch requests per minute
      analytics: true,
      prefix: "mcp-batch",
    });
  }

  return ratelimit;
}

/**
 * Authenticate request
 */
async function authenticateRequest(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return null;

    const token = authHeader.slice(7);
    const supabase = await createServerClient();
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) return null;
    return { id: user.id, email: user.email };
  } catch {
    return null;
  }
}

/**
 * POST /api/mcp/batch - Process multiple JSON-RPC requests
 *
 * Request body:
 * {
 *   "requests": [
 *     { "jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {} },
 *     { "jsonrpc": "2.0", "id": 2, "method": "tools/call", "params": { "name": "search_destinations", "arguments": { "city": "Tokyo" } } }
 *   ]
 * }
 *
 * Response:
 * {
 *   "responses": [
 *     { "jsonrpc": "2.0", "id": 1, "result": { ... } },
 *     { "jsonrpc": "2.0", "id": 2, "result": { ... } }
 *   ]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate (optional)
    const user = await authenticateRequest(request);

    // Rate limit
    const identifier = user?.id || request.ip || "anonymous";
    const limiter = getRateLimiter();
    if (limiter) {
      const { success } = await limiter.limit(identifier);
      if (!success) {
        return NextResponse.json(
          { error: "Rate limit exceeded" },
          { status: 429 }
        );
      }
    }

    // Parse body
    const body = await request.json();

    if (!body.requests || !Array.isArray(body.requests)) {
      return NextResponse.json(
        { error: "Invalid batch request. Expected { requests: [...] }" },
        { status: 400 }
      );
    }

    // Limit batch size
    const MAX_BATCH_SIZE = 20;
    if (body.requests.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        { error: `Batch size exceeds maximum of ${MAX_BATCH_SIZE}` },
        { status: 400 }
      );
    }

    // Process all requests in parallel
    const responses = await Promise.all(
      body.requests.map(async (req: { jsonrpc: string; id: unknown; method: string; params?: unknown }) => {
        if (!req.jsonrpc || req.jsonrpc !== "2.0" || !req.method) {
          return {
            jsonrpc: "2.0",
            id: req.id || null,
            error: { code: -32600, message: "Invalid JSON-RPC request" },
          };
        }

        return await processRequest({
          jsonrpc: "2.0",
          id: req.id,
          method: req.method,
          params: req.params || {},
        });
      })
    );

    return NextResponse.json(
      { responses },
      {
        headers: {
          "X-MCP-Server": "urban-manual-mcp/1.0.0",
          "X-Batch-Size": String(body.requests.length),
        },
      }
    );
  } catch (error) {
    console.error("[MCP Batch] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}
