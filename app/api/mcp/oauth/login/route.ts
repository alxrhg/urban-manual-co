/**
 * OAuth Login Handler
 *
 * Shows login UI or redirects to Supabase Auth
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.urbanmanual.co";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const oauthState = searchParams.get("oauth_state");

  if (!oauthState) {
    return NextResponse.json(
      { error: "invalid_request", error_description: "Missing OAuth state" },
      { status: 400 }
    );
  }

  // Return an HTML page with login options
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Connect to Urban Manual</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%);
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
      width: 100%;
      box-shadow: 0 4px 24px rgba(0,0,0,0.1);
    }
    .logo {
      font-size: 24px;
      font-weight: 300;
      margin-bottom: 8px;
      color: #111;
    }
    .subtitle {
      color: #666;
      font-size: 14px;
      margin-bottom: 32px;
    }
    .info-box {
      background: #f9f9f9;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 24px;
    }
    .info-box h3 {
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 8px;
      color: #333;
    }
    .info-box ul {
      list-style: none;
      font-size: 12px;
      color: #666;
    }
    .info-box li {
      padding: 4px 0;
      padding-left: 16px;
      position: relative;
    }
    .info-box li::before {
      content: "✓";
      position: absolute;
      left: 0;
      color: #22c55e;
    }
    .btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      width: 100%;
      padding: 14px 20px;
      border: none;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      text-decoration: none;
      margin-bottom: 12px;
    }
    .btn-google {
      background: white;
      border: 1px solid #ddd;
      color: #333;
    }
    .btn-google:hover {
      background: #f5f5f5;
      border-color: #ccc;
    }
    .btn-apple {
      background: #000;
      color: white;
    }
    .btn-apple:hover {
      background: #222;
    }
    .divider {
      display: flex;
      align-items: center;
      margin: 20px 0;
      color: #999;
      font-size: 12px;
    }
    .divider::before, .divider::after {
      content: "";
      flex: 1;
      border-bottom: 1px solid #eee;
    }
    .divider span {
      padding: 0 12px;
    }
    .footer {
      text-align: center;
      font-size: 11px;
      color: #999;
      margin-top: 24px;
    }
    .footer a {
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1 class="logo">Urban Manual</h1>
    <p class="subtitle">Connect your account to enable AI travel assistance</p>

    <div class="info-box">
      <h3>This app will be able to:</h3>
      <ul>
        <li>Search destinations and get recommendations</li>
        <li>Access your saved places and trips</li>
        <li>Create and manage trip itineraries</li>
      </ul>
    </div>

    <a href="${SITE_URL}/api/mcp/oauth/callback/google?oauth_state=${encodeURIComponent(oauthState)}" class="btn btn-google">
      <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
      Continue with Google
    </a>

    <a href="${SITE_URL}/api/mcp/oauth/callback/apple?oauth_state=${encodeURIComponent(oauthState)}" class="btn btn-apple">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
      Continue with Apple
    </a>

    <div class="footer">
      By continuing, you agree to Urban Manual's<br>
      <a href="${SITE_URL}/terms">Terms of Service</a> and <a href="${SITE_URL}/privacy">Privacy Policy</a>
    </div>
  </div>
</body>
</html>
  `;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}
