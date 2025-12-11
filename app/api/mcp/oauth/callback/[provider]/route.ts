/**
 * OAuth Provider Callback
 *
 * Initiates Supabase OAuth flow with the specified provider
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.urbanmanual.co";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const searchParams = request.nextUrl.searchParams;
  const oauthState = searchParams.get("oauth_state");

  if (!oauthState) {
    return NextResponse.json(
      { error: "invalid_request", error_description: "Missing OAuth state" },
      { status: 400 }
    );
  }

  // Validate provider
  const validProviders = ["google", "apple"];
  if (!validProviders.includes(provider)) {
    return NextResponse.json(
      { error: "invalid_provider", error_description: "Unsupported OAuth provider" },
      { status: 400 }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Initiate Supabase OAuth - redirect to provider
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: provider as "google" | "apple",
    options: {
      redirectTo: `${SITE_URL}/api/mcp/oauth/complete?oauth_state=${encodeURIComponent(oauthState)}`,
      skipBrowserRedirect: true,
    },
  });

  if (error || !data.url) {
    return NextResponse.json(
      { error: "oauth_error", error_description: error?.message || "Failed to initiate OAuth" },
      { status: 500 }
    );
  }

  return NextResponse.redirect(data.url);
}
