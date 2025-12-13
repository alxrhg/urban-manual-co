/**
 * API Token Management
 *
 * Allows users to generate and manage API tokens for MCP access.
 */

import { NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";
import {
  withAuth,
  createSuccessResponse,
  createValidationError,
  AuthContext,
} from "@/lib/errors";

/**
 * GET /api/account/api-token - Get current token info (not the token itself)
 */
export const GET = withAuth(async (_request: NextRequest, { user }: AuthContext) => {
  const supabase = await createServerClient();

  // Check if user has an API token
  const { data: tokenData } = await supabase
    .from("user_api_tokens")
    .select("id, created_at, last_used_at, name")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return createSuccessResponse({
    has_token: (tokenData?.length || 0) > 0,
    tokens: tokenData?.map(t => ({
      id: t.id,
      name: t.name,
      created_at: t.created_at,
      last_used_at: t.last_used_at,
    })) || [],
  });
});

/**
 * POST /api/account/api-token - Generate a new API token
 */
export const POST = withAuth(async (request: NextRequest, { user }: AuthContext) => {
  const supabase = await createServerClient();

  const body = await request.json().catch(() => ({}));
  const tokenName = body.name || "Default";

  // Generate a secure random token
  const tokenValue = `um_${randomBytes(32).toString("hex")}`;

  // Hash the token for storage (we only store the hash)
  const tokenHash = await hashToken(tokenValue);

  // Store the token hash
  const { data, error } = await supabase
    .from("user_api_tokens")
    .insert({
      user_id: user.id,
      token_hash: tokenHash,
      name: tokenName,
    })
    .select("id, name, created_at")
    .single();

  if (error) {
    // If table doesn't exist, return the JWT as fallback
    console.warn("[API Token] Table not found, using JWT fallback");

    // Get current session for JWT
    const { data: { session } } = await supabase.auth.getSession();

    return createSuccessResponse({
      token: session?.access_token,
      type: "jwt",
      note: "Using session JWT. For dedicated API tokens, contact support.",
      expires_at: session?.expires_at,
    });
  }

  // Return the token (only shown once!)
  return createSuccessResponse({
    token: tokenValue,
    type: "api_key",
    id: data.id,
    name: data.name,
    created_at: data.created_at,
    warning: "Save this token now - it won't be shown again!",
  });
});

/**
 * DELETE /api/account/api-token - Revoke an API token
 */
export const DELETE = withAuth(async (request: NextRequest, { user }: AuthContext) => {
  const supabase = await createServerClient();

  const { searchParams } = new URL(request.url);
  const tokenId = searchParams.get("id");

  if (!tokenId) {
    throw createValidationError("Token ID required");
  }

  const { error } = await supabase
    .from("user_api_tokens")
    .delete()
    .eq("id", tokenId)
    .eq("user_id", user.id); // Ensure user owns this token

  if (error) {
    throw new Error(error.message);
  }

  return createSuccessResponse({ success: true });
});

/**
 * Hash a token for secure storage
 */
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}
