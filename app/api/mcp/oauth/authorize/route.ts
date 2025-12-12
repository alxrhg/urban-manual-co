/**
 * OAuth 2.0 Authorization Endpoint for MCP
 *
 * Handles the authorization request from MCP clients (Claude Desktop, etc.)
 * Redirects to Supabase Auth for user login, then back with authorization code.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { randomBytes, createHmac } from "crypto";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.urbanmanual.co";

// HMAC secret for signing OAuth state - required in production
const STATE_SIGNING_SECRET = process.env.MCP_JWT_SECRET || process.env.SUPABASE_JWT_SECRET;

/**
 * Create a signed OAuth state to prevent tampering
 */
function createSignedState(data: object): string {
  if (!STATE_SIGNING_SECRET) {
    throw new Error("Missing required secret for OAuth state signing");
  }
  const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
  const signature = createHmac("sha256", STATE_SIGNING_SECRET)
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}

// Store pending authorization requests (in production, use Redis/database)
// For now, we'll encode state in the redirect
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // OAuth 2.0 parameters
  const clientId = searchParams.get("client_id");
  const redirectUri = searchParams.get("redirect_uri");
  const responseType = searchParams.get("response_type");
  const state = searchParams.get("state");
  const scope = searchParams.get("scope") || "read";
  const codeChallenge = searchParams.get("code_challenge"); // PKCE
  const codeChallengeMethod = searchParams.get("code_challenge_method");

  // Validate required parameters
  if (!clientId || !redirectUri || !responseType) {
    return NextResponse.json(
      { error: "invalid_request", error_description: "Missing required parameters" },
      { status: 400 }
    );
  }

  // Only support authorization code flow
  if (responseType !== "code") {
    return NextResponse.json(
      { error: "unsupported_response_type", error_description: "Only 'code' response type is supported" },
      { status: 400 }
    );
  }

  // Validate client_id (for now, accept "urban-manual-mcp" or any valid format)
  const validClients = ["urban-manual-mcp", "claude-desktop", "chatgpt"];
  if (!validClients.includes(clientId) && !clientId.startsWith("um_")) {
    return NextResponse.json(
      { error: "invalid_client", error_description: "Unknown client_id" },
      { status: 400 }
    );
  }

  // Ensure signing secret is available
  if (!STATE_SIGNING_SECRET) {
    return NextResponse.json(
      { error: "server_error", error_description: "OAuth not configured" },
      { status: 500 }
    );
  }

  // Generate authorization session ID
  const sessionId = randomBytes(32).toString("hex");

  // Store OAuth state with HMAC signature to prevent tampering
  const oauthState = createSignedState({
    sessionId,
    clientId,
    redirectUri,
    state,
    scope,
    codeChallenge,
    codeChallengeMethod,
    createdAt: Date.now(),
  });

  // Redirect to our OAuth login page
  const loginUrl = new URL(`${SITE_URL}/api/mcp/oauth/login`);
  loginUrl.searchParams.set("oauth_state", oauthState);

  return NextResponse.redirect(loginUrl);
}
