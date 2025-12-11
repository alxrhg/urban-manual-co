/**
 * MCP SSE Endpoint
 *
 * Server-Sent Events endpoint for MCP streaming transport.
 * This allows long-lived connections for real-time updates.
 */

import { NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

/**
 * Authenticate request using Supabase Auth
 */
async function authenticateRequest(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get("token");

    if (!token) {
      const authHeader = request.headers.get("authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return null;
      }
      const headerToken = authHeader.slice(7);
      return await validateToken(headerToken);
    }

    return await validateToken(token);
  } catch {
    return null;
  }
}

async function validateToken(token: string) {
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
  };
}

/**
 * GET /api/mcp/sse - SSE streaming endpoint
 */
export async function GET(request: NextRequest) {
  // Authenticate
  const user = await authenticateRequest(request);

  if (!user) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Create SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection event
      const connectEvent = `event: connected\ndata: ${JSON.stringify({
        server: "urban-manual-mcp",
        version: "1.0.0",
        user: user.id,
        timestamp: new Date().toISOString(),
      })}\n\n`;
      controller.enqueue(encoder.encode(connectEvent));

      // Send periodic heartbeat to keep connection alive
      const heartbeatInterval = setInterval(() => {
        try {
          const heartbeat = `event: heartbeat\ndata: ${JSON.stringify({
            timestamp: new Date().toISOString(),
          })}\n\n`;
          controller.enqueue(encoder.encode(heartbeat));
        } catch {
          clearInterval(heartbeatInterval);
        }
      }, 30000); // Every 30 seconds

      // Clean up on close
      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeatInterval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "X-MCP-Server": "urban-manual-mcp/1.0.0",
    },
  });
}

/**
 * POST /api/mcp/sse - Send message via SSE channel
 * This endpoint allows sending JSON-RPC requests that will be processed
 * and responses streamed back via SSE.
 */
export async function POST(request: NextRequest) {
  // For now, redirect to main endpoint
  // Full SSE bidirectional support requires WebSocket or more complex setup
  const mainEndpoint = new URL("/api/mcp", request.url);

  return Response.redirect(mainEndpoint.toString(), 307);
}
