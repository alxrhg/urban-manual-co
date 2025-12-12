/**
 * OAuth 2.0 Token Endpoint
 *
 * Exchanges authorization code for access token.
 * Supports both authorization_code and refresh_token grant types.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { randomBytes, createHash } from "crypto";
import { SignJWT } from "jose";

// Token expiry times
const ACCESS_TOKEN_EXPIRY = 60 * 60 * 24 * 7; // 7 days in seconds
const REFRESH_TOKEN_EXPIRY = 60 * 60 * 24 * 30; // 30 days in seconds

// JWT secret - REQUIRED, no fallback to prevent insecure deployments
const JWT_SECRET_RAW = process.env.MCP_JWT_SECRET || process.env.SUPABASE_JWT_SECRET;
const JWT_SECRET = JWT_SECRET_RAW ? new TextEncoder().encode(JWT_SECRET_RAW) : null;

export async function POST(request: NextRequest) {
  // Fail securely if JWT secret is not configured
  if (!JWT_SECRET) {
    console.error("OAuth token endpoint called but MCP_JWT_SECRET/SUPABASE_JWT_SECRET not configured");
    return tokenError("server_error", "OAuth not configured");
  }

  // Parse form data or JSON
  let body: Record<string, string>;
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const formData = await request.formData();
    body = Object.fromEntries(formData.entries()) as Record<string, string>;
  } else {
    body = await request.json();
  }

  const { grant_type, code, refresh_token, client_id, client_secret, code_verifier } = body;

  // Validate grant type
  if (!grant_type || !["authorization_code", "refresh_token"].includes(grant_type)) {
    return tokenError("unsupported_grant_type", "Grant type must be 'authorization_code' or 'refresh_token'");
  }

  const supabase = createServiceRoleClient();

  if (grant_type === "authorization_code") {
    if (!code) {
      return tokenError("invalid_request", "Authorization code is required");
    }

    // Find the code in the database - no fallback to unsigned codes
    const { data: codeData, error: codeError } = await supabase
      .from("mcp_oauth_codes")
      .select("*")
      .eq("code", code)
      .single();

    if (codeError || !codeData) {
      return tokenError("invalid_grant", "Invalid or expired authorization code");
    }

    // Validate code hasn't expired
    if (new Date(codeData.expires_at) < new Date()) {
      // Delete expired code
      await supabase.from("mcp_oauth_codes").delete().eq("code", code);
      return tokenError("invalid_grant", "Authorization code has expired");
    }

    // Verify PKCE if code_challenge was provided
    if (codeData.code_challenge && codeData.code_challenge_method === "S256") {
      if (!code_verifier) {
        return tokenError("invalid_request", "Code verifier is required");
      }
      const expectedChallenge = createHash("sha256")
        .update(code_verifier)
        .digest("base64url");
      if (expectedChallenge !== codeData.code_challenge) {
        return tokenError("invalid_grant", "Code verifier does not match");
      }
    }

    const userId = codeData.user_id;
    const scope = codeData.scope;
    const clientIdFromCode = codeData.client_id;

    // Delete used code (codes are single-use)
    await supabase.from("mcp_oauth_codes").delete().eq("code", code);

    // Generate tokens
    const { accessToken, refreshToken } = await generateTokens(userId, clientIdFromCode, scope);

    // Store refresh token
    await supabase.from("mcp_refresh_tokens").insert({
      token_hash: createHash("sha256").update(refreshToken).digest("hex"),
      user_id: userId,
      client_id: clientIdFromCode,
      scope,
      expires_at: new Date(Date.now() + REFRESH_TOKEN_EXPIRY * 1000).toISOString(),
    });

    return NextResponse.json({
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: ACCESS_TOKEN_EXPIRY,
      refresh_token: refreshToken,
      scope,
    });
  }

  if (grant_type === "refresh_token") {
    if (!refresh_token) {
      return tokenError("invalid_request", "Refresh token is required");
    }

    // Find refresh token
    const tokenHash = createHash("sha256").update(refresh_token).digest("hex");
    const { data: tokenData, error: tokenError2 } = await supabase
      .from("mcp_refresh_tokens")
      .select("*")
      .eq("token_hash", tokenHash)
      .single();

    if (tokenError2 || !tokenData) {
      return tokenError("invalid_grant", "Invalid refresh token");
    }

    // Check expiry
    if (new Date(tokenData.expires_at) < new Date()) {
      await supabase.from("mcp_refresh_tokens").delete().eq("token_hash", tokenHash);
      return tokenError("invalid_grant", "Refresh token has expired");
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = await generateTokens(
      tokenData.user_id,
      tokenData.client_id,
      tokenData.scope
    );

    // Rotate refresh token
    await supabase.from("mcp_refresh_tokens").delete().eq("token_hash", tokenHash);
    await supabase.from("mcp_refresh_tokens").insert({
      token_hash: createHash("sha256").update(newRefreshToken).digest("hex"),
      user_id: tokenData.user_id,
      client_id: tokenData.client_id,
      scope: tokenData.scope,
      expires_at: new Date(Date.now() + REFRESH_TOKEN_EXPIRY * 1000).toISOString(),
    });

    return NextResponse.json({
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: ACCESS_TOKEN_EXPIRY,
      refresh_token: newRefreshToken,
      scope: tokenData.scope,
    });
  }

  return tokenError("server_error", "Unexpected error");
}

async function generateTokens(userId: string, clientId: string, scope: string) {
  // JWT_SECRET is guaranteed to be non-null here since POST validates it first
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET not configured");
  }

  const now = Math.floor(Date.now() / 1000);

  // Generate JWT access token
  const accessToken = await new SignJWT({
    sub: userId,
    client_id: clientId,
    scope,
    type: "access",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(now + ACCESS_TOKEN_EXPIRY)
    .setIssuer("urban-manual-mcp")
    .sign(JWT_SECRET);

  // Generate opaque refresh token
  const refreshToken = randomBytes(48).toString("base64url");

  return { accessToken, refreshToken };
}

function tokenError(error: string, description: string) {
  return NextResponse.json(
    { error, error_description: description },
    { status: 400 }
  );
}

// Also support GET for debugging (returns endpoint info)
export async function GET() {
  return NextResponse.json({
    token_endpoint: "/api/mcp/oauth/token",
    supported_grant_types: ["authorization_code", "refresh_token"],
    token_endpoint_auth_methods_supported: ["none", "client_secret_post"],
  });
}
