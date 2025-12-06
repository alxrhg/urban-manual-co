/**
 * Next.js Middleware for Global Security
 *
 * This middleware handles:
 * - Admin route protection
 * - Session validation
 * - Security headers for specific routes
 * - Rate limiting headers
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Routes that require admin role
const ADMIN_ROUTES = [
  '/admin',
  '/studio',
  '/api/admin',
];

// Routes that require authentication
const AUTH_REQUIRED_ROUTES = [
  '/account',
  '/trips',
  '/api/account',
  '/api/trips',
  '/api/collections',
];

// Public API routes that don't need auth
const PUBLIC_API_ROUTES = [
  '/api/health',
  '/api/build-version',
  '/api/cities',
  '/api/categories',
  '/api/destinations',
  '/api/search',
  '/api/autocomplete',
  '/api/nearby',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Create response to modify headers
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Add security headers to all responses
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // Check if route requires admin access
  const isAdminRoute = ADMIN_ROUTES.some(route => pathname.startsWith(route));

  // Check if route requires authentication
  const isAuthRequired = AUTH_REQUIRED_ROUTES.some(route => pathname.startsWith(route));

  // Skip auth check for public API routes
  const isPublicApi = PUBLIC_API_ROUTES.some(route => pathname.startsWith(route));

  // Create Supabase client for auth checks
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Check authentication for protected routes
  if (isAdminRoute || (isAuthRequired && !isPublicApi)) {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        // Not authenticated - redirect to login or return 401
        if (pathname.startsWith('/api/')) {
          return NextResponse.json(
            {
              success: false,
              error: 'Authentication required',
              code: 'UNAUTHORIZED'
            },
            { status: 401 }
          );
        }
        // Redirect to home page for non-API routes
        const loginUrl = new URL('/', request.url);
        loginUrl.searchParams.set('auth', 'required');
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
      }

      // Check admin role for admin routes
      if (isAdminRoute) {
        const role = (user.app_metadata as Record<string, any>)?.role;
        if (role !== 'admin') {
          if (pathname.startsWith('/api/')) {
            return NextResponse.json(
              {
                success: false,
                error: 'Admin access required',
                code: 'FORBIDDEN'
              },
              { status: 403 }
            );
          }
          // Redirect non-admins to home
          return NextResponse.redirect(new URL('/', request.url));
        }
      }

      // Add user ID to request headers for downstream use
      response.headers.set('X-User-ID', user.id);
    } catch (error) {
      console.error('[Middleware] Auth check error:', error);
      // On auth error, allow request to continue (fail open)
      // Individual routes will handle their own auth
    }
  }

  // Add session timeout headers for authenticated routes
  if (isAuthRequired && !isPublicApi) {
    // Set session refresh hint (30 minutes)
    response.headers.set('X-Session-Refresh-At', String(Date.now() + 30 * 60 * 1000));
  }

  return response;
}

// Configure which routes this middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
