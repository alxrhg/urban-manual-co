import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * Middleware to protect admin routes with Supabase authentication
 */
export async function middleware(request: NextRequest) {
  // Protect /admin routes (custom admin page)
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // Skip API routes
    if (request.nextUrl.pathname.startsWith('/api')) {
      return NextResponse.next()
    }

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

      if (!supabaseUrl || !supabaseKey) {
        return NextResponse.redirect(new URL('/auth/login?error=config', request.url))
      }

      const response = NextResponse.next({
        request: {
          headers: request.headers,
        },
      })

      const supabase = createServerClient(supabaseUrl, supabaseKey, {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value)
              response.cookies.set(name, value, options)
            })
          },
        },
      })

      // Get session from Supabase
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error || !session) {
        // Redirect to login if not authenticated
        return NextResponse.redirect(new URL('/auth/login?redirect=/admin', request.url))
      }

      // Check if user has admin role
      const role = (session.user.app_metadata as Record<string, any> | null)?.role
      if (role !== 'admin') {
        // Redirect to account page if not admin
        return NextResponse.redirect(new URL('/account?error=unauthorized', request.url))
      }

      // User is authenticated and is admin - allow access
      return response
    } catch (error) {
      console.error('[Admin Auth Middleware] Error:', error)
      return NextResponse.redirect(new URL('/auth/login?error=auth_failed', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}

