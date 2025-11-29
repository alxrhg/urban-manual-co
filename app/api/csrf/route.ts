/**
 * CSRF Token API Route
 *
 * GET /api/csrf
 *
 * Returns a CSRF token and sets it as a cookie.
 * Client should include this token in subsequent mutating requests.
 */

import { NextResponse } from 'next/server';
import { generateCsrfToken, setCsrfCookie } from '@/lib/security/csrf';

export async function GET() {
  const token = generateCsrfToken();

  const response = NextResponse.json({ token });
  setCsrfCookie(response, token);

  return response;
}
