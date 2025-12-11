/**
 * MCP API Route
 *
 * Exposes Urban Manual's MCP server over HTTP+SSE.
 * Supports both single requests and SSE streaming for long-running operations.
 *
 * Endpoints:
 * - GET /api/mcp - Server info and capability discovery
 * - POST /api/mcp - Process JSON-RPC requests
 * - GET /api/mcp/sse - SSE endpoint for streaming (future)
 *
 * Authentication:
 * - OAuth 2.0 tokens (from /api/mcp/oauth/authorize flow)
 * - Supabase Auth JWT tokens
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { jwtVerify } from "jose";

// Import MCP handler
import { processRequest, getServerInfo, endpoints } from "@/lib/mcp/handler";

// JWT secret for MCP OAuth tokens
const JWT_SECRET = new TextEncoder().encode(
  process.env.MCP_JWT_SECRET || process.env.SUPABASE_JWT_SECRET || "urban-manual-mcp-secret-key-change-in-production"
);

// Rate limiter configuration
let ratelimit: Ratelimit | null = null;

function getRateLimiter() {
  if (ratelimit) return ratelimit;

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (redisUrl && redisToken) {
    const redis = new Redis({
      url: redisUrl,
      token: redisToken,
    });

    ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, "1 m"), // 100 requests per minute
      analytics: true,
      prefix: "mcp",
    });
  }

  return ratelimit;
}

/**
 * Authenticate request using OAuth or Supabase Auth
 * Returns user info if authenticated, null otherwise
 */
async function authenticateRequest(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return null;
    }

    const token = authHeader.slice(7);

    // First, try to verify as MCP OAuth JWT
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET, {
        issuer: "urban-manual-mcp",
      });

      if (payload.type === "access" && payload.sub) {
        return {
          id: payload.sub as string,
          email: null,
          role: "user",
          scope: payload.scope as string || "read",
          authType: "oauth",
        };
      }
    } catch {
      // Not an MCP OAuth token, try Supabase
    }

    // Try Supabase Auth token
    const supabase = await createServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      role: user.user_metadata?.role || "user",
      authType: "supabase",
    };
  } catch {
    return null;
  }
}

/**
 * Check rate limit for a request
 */
async function checkRateLimit(identifier: string) {
  const limiter = getRateLimiter();
  if (!limiter) return { success: true };

  return await limiter.limit(identifier);
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.urbanmanual.co";

/**
 * GET /api/mcp - Server info and capability discovery
 */
export async function GET() {
  try {
    return NextResponse.json({
      ...getServerInfo(),
      endpoints,
      oauth: {
        authorization_endpoint: `${SITE_URL}/api/mcp/oauth/authorize`,
        token_endpoint: `${SITE_URL}/api/mcp/oauth/token`,
        scopes_supported: ["read", "write", "trips"],
      },
      documentation: {
        description: "Urban Manual MCP Server - Travel Intelligence API",
        authentication: {
          oauth: "OAuth 2.0 Authorization Code flow",
          bearer: "Bearer token (Supabase Auth JWT or MCP OAuth token)",
        },
        rate_limit: "100 requests per minute",
        usage: {
          single_request: "POST /api/mcp with JSON-RPC body",
          discovery: "GET /api/mcp for available tools/resources/prompts",
          oauth_flow: "GET /api/mcp/oauth/authorize to start OAuth",
        },
      },
    });
  } catch (error) {
    console.error("[MCP API] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/mcp - Process JSON-RPC requests
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication (optional but recommended)
    const user = await authenticateRequest(request);

    // Rate limiting
    const identifier = user?.id || request.headers.get("x-forwarded-for")?.split(",")[0] || "anonymous";
    const rateLimitResult = await checkRateLimit(identifier);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message: "Rate limit exceeded. Please try again later.",
          },
          id: null,
        },
        {
          status: 429,
          headers: {
            "Retry-After": "60",
          },
        }
      );
    }

    // Parse request body
    const body = await request.json();

    // Validate JSON-RPC format
    if (!body.jsonrpc || body.jsonrpc !== "2.0" || !body.method) {
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          error: {
            code: -32600,
            message: "Invalid JSON-RPC request",
          },
          id: body.id || null,
        },
        { status: 400 }
      );
    }

    // Process the request
    const response = await processRequest({
      jsonrpc: "2.0",
      id: body.id,
      method: body.method,
      params: body.params || {},
    });

    // Return response with server info header
    return NextResponse.json(response, {
      headers: {
        "X-MCP-Server": "urban-manual-mcp/1.0.0",
      },
    });
  } catch (error) {
    console.error("[MCP API] Error:", error);

    return NextResponse.json(
      {
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : "Internal error",
        },
        id: null,
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS - CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}
