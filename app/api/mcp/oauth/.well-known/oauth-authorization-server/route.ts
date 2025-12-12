/**
 * OAuth 2.0 Authorization Server Metadata
 *
 * Returns OAuth configuration for MCP clients to discover endpoints.
 * See: https://datatracker.ietf.org/doc/html/rfc8414
 */

import { NextResponse } from "next/server";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.urbanmanual.co";

export async function GET() {
  const metadata = {
    issuer: `${SITE_URL}`,
    authorization_endpoint: `${SITE_URL}/api/mcp/oauth/authorize`,
    token_endpoint: `${SITE_URL}/api/mcp/oauth/token`,
    registration_endpoint: `${SITE_URL}/api/mcp/oauth/register`,
    scopes_supported: ["read", "write", "trips", "recommendations"],
    response_types_supported: ["code"],
    response_modes_supported: ["query"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    token_endpoint_auth_methods_supported: ["none", "client_secret_post"],
    code_challenge_methods_supported: ["S256", "plain"],
    service_documentation: `${SITE_URL}/docs/mcp-user-guide`,
  };

  return NextResponse.json(metadata, {
    headers: {
      "Cache-Control": "public, max-age=3600",
    },
  });
}
