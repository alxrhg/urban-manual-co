import { NextRequest, NextResponse } from "next/server";

/**
 * Middleware for CORS handling required by ChatGPT Apps SDK.
 * Handles browser preflight requests for cross-origin React Server Components fetching.
 */
export function middleware(request: NextRequest) {
  // Handle preflight OPTIONS requests
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "*",
      },
    });
  }

  // For all other requests, add CORS headers
  const response = NextResponse.next();
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "*");

  return response;
}

export const config = {
  matcher: "/:path*",
};
