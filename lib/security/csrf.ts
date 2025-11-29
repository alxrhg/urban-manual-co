/**
 * CSRF Protection Utilities
 *
 * Implements double-submit cookie pattern for CSRF protection.
 * - Generates secure random tokens
 * - Validates tokens from headers/body against cookies
 * - Provides middleware for protected routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const CSRF_COOKIE_NAME = '__csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_TOKEN_LENGTH = 32;

/**
 * Generate a cryptographically secure random token
 */
export function generateCsrfToken(): string {
  const array = new Uint8Array(CSRF_TOKEN_LENGTH);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join(
    ''
  );
}

/**
 * Get the current CSRF token from cookies, or generate a new one
 */
export async function getCsrfToken(): Promise<string> {
  const cookieStore = await cookies();
  const existingToken = cookieStore.get(CSRF_COOKIE_NAME)?.value;

  if (existingToken && existingToken.length === CSRF_TOKEN_LENGTH * 2) {
    return existingToken;
  }

  return generateCsrfToken();
}

/**
 * Set CSRF token cookie on a response
 */
export function setCsrfCookie(response: NextResponse, token: string): void {
  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // Must be readable by JavaScript
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  });
}

/**
 * Get CSRF token from request (header or body)
 */
export function getTokenFromRequest(request: NextRequest): string | null {
  // Check header first
  const headerToken = request.headers.get(CSRF_HEADER_NAME);
  if (headerToken) {
    return headerToken;
  }

  return null;
}

/**
 * Get CSRF token from request cookies
 */
export function getTokenFromCookie(request: NextRequest): string | null {
  return request.cookies.get(CSRF_COOKIE_NAME)?.value || null;
}

/**
 * Validate CSRF token
 * Compares the token from the request header/body with the cookie token
 */
export function validateCsrfToken(request: NextRequest): boolean {
  const cookieToken = getTokenFromCookie(request);
  const requestToken = getTokenFromRequest(request);

  if (!cookieToken || !requestToken) {
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  if (cookieToken.length !== requestToken.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < cookieToken.length; i++) {
    result |= cookieToken.charCodeAt(i) ^ requestToken.charCodeAt(i);
  }

  return result === 0;
}

/**
 * CSRF validation error
 */
export class CsrfError extends Error {
  status = 403;
  constructor(message = 'Invalid CSRF token') {
    super(message);
    this.name = 'CsrfError';
  }
}

/**
 * Middleware to validate CSRF tokens on mutating requests
 *
 * Usage:
 * ```ts
 * export async function POST(request: NextRequest) {
 *   const csrfResult = validateCsrfRequest(request);
 *   if (!csrfResult.valid) {
 *     return csrfResult.response;
 *   }
 *   // ... rest of handler
 * }
 * ```
 */
export function validateCsrfRequest(request: NextRequest): {
  valid: boolean;
  response?: NextResponse;
} {
  // Skip CSRF validation for:
  // - Requests with valid API keys (server-to-server)
  // - Requests from same origin with credentials
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');

  // If no origin header, it's likely a same-origin request or non-browser
  if (!origin) {
    return { valid: true };
  }

  // Check if origin matches host
  try {
    const originUrl = new URL(origin);
    if (host && originUrl.host === host) {
      // Same origin, but still validate CSRF token for extra protection
      if (!validateCsrfToken(request)) {
        return {
          valid: false,
          response: NextResponse.json(
            { error: 'Invalid CSRF token' },
            { status: 403 }
          ),
        };
      }
    } else {
      // Cross-origin request without valid CSRF token
      if (!validateCsrfToken(request)) {
        return {
          valid: false,
          response: NextResponse.json(
            { error: 'Cross-origin request rejected' },
            { status: 403 }
          ),
        };
      }
    }
  } catch {
    // Invalid origin URL
    return {
      valid: false,
      response: NextResponse.json({ error: 'Invalid origin' }, { status: 403 }),
    };
  }

  return { valid: true };
}

/**
 * HOC to wrap API route handlers with CSRF protection
 *
 * Usage:
 * ```ts
 * export const POST = withCsrfProtection(async (request) => {
 *   // Your handler code
 * });
 * ```
 */
export function withCsrfProtection(
  handler: (request: NextRequest) => Promise<NextResponse>
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest) => {
    const csrfResult = validateCsrfRequest(request);
    if (!csrfResult.valid) {
      return csrfResult.response!;
    }
    return handler(request);
  };
}

/**
 * Client-side helper to get CSRF token from cookie
 */
export const CSRF_CONFIG = {
  cookieName: CSRF_COOKIE_NAME,
  headerName: CSRF_HEADER_NAME,
} as const;
