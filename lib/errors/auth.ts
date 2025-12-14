/**
 * Unified Authentication Utilities
 *
 * This module provides standardized authentication patterns for API routes.
 * It integrates with the error handling system for consistent error responses.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { createServerClient } from '@/lib/supabase/server';
import { CustomError, ErrorCode } from './types';
import { withErrorHandling } from './api-handler';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Ensure Supabase is configured
 */
function requireSupabaseConfig() {
  if (!SUPABASE_URL || SUPABASE_URL.includes('placeholder') || SUPABASE_URL.includes('invalid')) {
    throw new CustomError(
      ErrorCode.INTERNAL_SERVER_ERROR,
      'Supabase URL is not configured',
      500
    );
  }

  if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.includes('placeholder') || SUPABASE_ANON_KEY.includes('invalid')) {
    throw new CustomError(
      ErrorCode.INTERNAL_SERVER_ERROR,
      'Supabase anon key is not configured',
      500
    );
  }
}

/**
 * Extract Bearer token from request
 */
function getBearerToken(request: Request): string | null {
  const header = request.headers.get('authorization') || request.headers.get('Authorization');
  if (!header || !header.startsWith('Bearer ')) {
    return null;
  }
  return header.slice('Bearer '.length).trim() || null;
}

/**
 * Get the current authenticated user from request.
 * Returns null if not authenticated (does not throw).
 */
export async function getUser(request?: NextRequest): Promise<User | null> {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return null;
    }
    return user;
  } catch {
    return null;
  }
}

/**
 * Require authentication - throws if not authenticated.
 * Use this when authentication is mandatory.
 */
export async function requireAuth(request?: NextRequest): Promise<User> {
  const supabase = await createServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new CustomError(ErrorCode.UNAUTHORIZED, 'Authentication required', 401);
  }

  return user;
}

/**
 * Require admin role - throws if not authenticated or not admin.
 * Returns both the user and a service role client for admin operations.
 */
export async function requireAdmin(request: Request): Promise<{
  user: User;
  serviceClient: SupabaseClient;
}> {
  requireSupabaseConfig();

  // Get bearer token if present (for API clients)
  const token = getBearerToken(request);
  let user: User | null = null;

  if (token) {
    // Use bearer token authentication
    const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw new CustomError(ErrorCode.UNAUTHORIZED, 'Invalid or expired token', 401);
    }
    user = data.user;
  } else {
    // Use cookie-based authentication
    const supabase = await createServerClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw new CustomError(ErrorCode.UNAUTHORIZED, 'Authentication required', 401);
    }
    user = data.user;
  }

  // Check admin role
  const role = (user.app_metadata as Record<string, any> | null)?.role;
  if (role !== 'admin') {
    throw new CustomError(ErrorCode.FORBIDDEN, 'Admin access required', 403);
  }

  // Require service role key for admin operations
  if (!SUPABASE_SERVICE_ROLE_KEY || SUPABASE_SERVICE_ROLE_KEY.includes('placeholder') || SUPABASE_SERVICE_ROLE_KEY.includes('invalid')) {
    throw new CustomError(
      ErrorCode.INTERNAL_SERVER_ERROR,
      'Service role key not configured',
      500
    );
  }

  const serviceClient = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY);

  return { user, serviceClient };
}

// Type definitions for handler context
export interface AuthContext {
  user: User;
}

export interface AdminContext {
  user: User;
  serviceClient: SupabaseClient;
}

export interface OptionalAuthContext {
  user: User | null;
}

type ApiHandler<TContext = void> = TContext extends void
  ? (req: NextRequest, params?: any) => Promise<NextResponse>
  : (req: NextRequest, ctx: TContext, params?: any) => Promise<NextResponse>;

/**
 * Wrapper for API routes that require authentication.
 * Combines withErrorHandling and authentication check.
 *
 * @example
 * ```ts
 * export const GET = withAuth(async (request, { user }) => {
 *   // user is guaranteed to exist here
 *   return createSuccessResponse({ userId: user.id });
 * });
 * ```
 */
export function withAuth(
  handler: (req: NextRequest, ctx: AuthContext, params?: any) => Promise<NextResponse>
) {
  return withErrorHandling(async (req: NextRequest, params?: any) => {
    const user = await requireAuth(req);
    return handler(req, { user }, params);
  });
}

/**
 * Wrapper for API routes that require admin access.
 * Combines withErrorHandling and admin authentication check.
 *
 * @example
 * ```ts
 * export const POST = withAdminAuth(async (request, { user, serviceClient }) => {
 *   // user is admin, serviceClient bypasses RLS
 *   const { data } = await serviceClient.from('users').select('*');
 *   return createSuccessResponse({ data });
 * });
 * ```
 */
export function withAdminAuth(
  handler: (req: NextRequest, ctx: AdminContext, params?: any) => Promise<NextResponse>
) {
  return withErrorHandling(async (req: NextRequest, params?: any) => {
    const { user, serviceClient } = await requireAdmin(req);
    return handler(req, { user, serviceClient }, params);
  });
}

/**
 * Wrapper for API routes with optional authentication.
 * User may or may not be logged in.
 *
 * @example
 * ```ts
 * export const GET = withOptionalAuth(async (request, { user }) => {
 *   if (user) {
 *     // Personalized response
 *   } else {
 *     // Anonymous response
 *   }
 *   return createSuccessResponse({ data });
 * });
 * ```
 */
export function withOptionalAuth(
  handler: (req: NextRequest, ctx: OptionalAuthContext, params?: any) => Promise<NextResponse>
) {
  return withErrorHandling(async (req: NextRequest, params?: any) => {
    const user = await getUser(req);
    return handler(req, { user }, params);
  });
}
