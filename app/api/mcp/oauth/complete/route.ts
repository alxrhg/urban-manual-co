/**
 * OAuth Complete Handler
 *
 * Called after Supabase OAuth completes. Generates authorization code
 * and redirects back to the MCP client.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { randomBytes, createHmac } from "crypto";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.urbanmanual.co";

// Authorization codes expire after 10 minutes
const CODE_EXPIRY_MS = 10 * 60 * 1000;

// HMAC secret for verifying OAuth state - must match authorize endpoint
const STATE_SIGNING_SECRET = process.env.MCP_JWT_SECRET || process.env.SUPABASE_JWT_SECRET;

/**
 * Verify and parse a signed OAuth state
 * Returns null if signature is invalid or state is malformed
 */
function verifySignedState(signedState: string): object | null {
  if (!STATE_SIGNING_SECRET) {
    return null;
  }

  const parts = signedState.split(".");
  if (parts.length !== 2) {
    return null;
  }

  const [payload, signature] = parts;
  const expectedSignature = createHmac("sha256", STATE_SIGNING_SECRET)
    .update(payload)
    .digest("base64url");

  // Constant-time comparison to prevent timing attacks
  if (signature.length !== expectedSignature.length) {
    return null;
  }

  let mismatch = 0;
  for (let i = 0; i < signature.length; i++) {
    mismatch |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
  }

  if (mismatch !== 0) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString());
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const oauthState = searchParams.get("oauth_state");

  if (!oauthState) {
    return errorPage("Missing OAuth state. Please try connecting again.");
  }

  // Verify and decode signed OAuth state
  const verifiedState = verifySignedState(oauthState);
  if (!verifiedState) {
    return errorPage("Invalid or tampered OAuth state. Please try connecting again.");
  }

  const state = verifiedState as {
    sessionId: string;
    clientId: string;
    redirectUri: string;
    state?: string;
    scope?: string;
    codeChallenge?: string;
    codeChallengeMethod?: string;
    createdAt: number;
  };

  // Check if state is expired (30 minutes max)
  if (Date.now() - state.createdAt > 30 * 60 * 1000) {
    return errorPage("Authorization session expired. Please try connecting again.");
  }

  // Get authenticated user from Supabase
  const supabase = await createServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    // User not authenticated, redirect back to login
    const loginUrl = new URL(`${SITE_URL}/api/mcp/oauth/login`);
    loginUrl.searchParams.set("oauth_state", oauthState);
    loginUrl.searchParams.set("error", "auth_required");
    return NextResponse.redirect(loginUrl);
  }

  // Generate authorization code
  const authCode = randomBytes(32).toString("hex");

  // Store the authorization code with user info (using service role for database access)
  const serviceClient = createServiceRoleClient();

  // Create or get mcp_oauth_codes table entry
  // For now, we'll use a simple approach - store in user metadata or a dedicated table
  const codeData = {
    code: authCode,
    user_id: user.id,
    client_id: state.clientId,
    scope: state.scope || "read",
    code_challenge: state.codeChallenge,
    code_challenge_method: state.codeChallengeMethod,
    expires_at: new Date(Date.now() + CODE_EXPIRY_MS).toISOString(),
    created_at: new Date().toISOString(),
  };

  // Store in mcp_oauth_codes table
  const { error: insertError } = await serviceClient
    .from("mcp_oauth_codes")
    .insert(codeData);

  if (insertError) {
    // Database error - fail securely instead of falling back to unsigned codes
    console.error("Failed to store OAuth code:", insertError);
    return errorPage("Authorization failed. Please try again later.");
  }

  // Redirect back to MCP client with authorization code
  const redirectUrl = new URL(state.redirectUri);
  redirectUrl.searchParams.set("code", authCode);
  if (state.state) {
    redirectUrl.searchParams.set("state", state.state);
  }

  return NextResponse.redirect(redirectUrl);
}

function errorPage(message: string) {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Authorization Error - Urban Manual</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 16px;
      padding: 40px;
      max-width: 400px;
      text-align: center;
      box-shadow: 0 4px 24px rgba(0,0,0,0.1);
    }
    h1 { font-size: 20px; margin-bottom: 16px; color: #111; }
    p { color: #666; font-size: 14px; margin-bottom: 24px; }
    a {
      display: inline-block;
      padding: 12px 24px;
      background: #000;
      color: white;
      text-decoration: none;
      border-radius: 8px;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Authorization Error</h1>
    <p>${message}</p>
    <a href="javascript:window.close()">Close Window</a>
  </div>
</body>
</html>
  `;
  return new NextResponse(html, { headers: { "Content-Type": "text/html" } });
}
