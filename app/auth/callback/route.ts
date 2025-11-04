import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

/**
 * Get the correct base URL for redirects
 * In production, use the custom domain, otherwise use the request origin
 */
function getBaseUrl(request: Request): string {
  // Check for custom domain in production
  const host = request.headers.get('host');
  const forwardedHost = request.headers.get('x-forwarded-host');
  
  // Use custom domain if available
  if (forwardedHost && !forwardedHost.includes('vercel.app')) {
    return `https://${forwardedHost}`;
  }
  
  if (host && !host.includes('vercel.app') && !host.includes('localhost')) {
    return `https://${host}`;
  }
  
  // Development or fallback
  const protocol = request.headers.get('x-forwarded-proto') || 'https';
  return `${protocol}://${host || 'localhost:3000'}`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  
  const baseUrl = getBaseUrl(request);
  
  // if "next" is in param, use it as the redirect URL
  let next = searchParams.get('next') ?? '/';
  if (!next.startsWith('/')) {
    // if "next" is not a relative URL, use the default
    next = '/';
  }

  // Handle OAuth errors from Apple
  if (error) {
    const errorMessage = errorDescription || error;
    return NextResponse.redirect(`${baseUrl}/auth/login?error=${encodeURIComponent(errorMessage)}`);
  }

  if (code) {
    try {
      const supabase = await createServerClient();
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      
      if (!exchangeError && data.session) {
        // Always redirect to root domain (homepage) after successful auth
        return NextResponse.redirect(`${baseUrl}${next}`);
      } else {
        // Exchange failed
        return NextResponse.redirect(`${baseUrl}/auth/login?error=${encodeURIComponent(exchangeError?.message || 'Failed to authenticate')}`);
      }
    } catch (err: any) {
      console.error('OAuth callback error:', err);
      return NextResponse.redirect(`${baseUrl}/auth/login?error=${encodeURIComponent(err.message || 'Authentication failed')}`);
    }
  }

  // No code provided
  return NextResponse.redirect(`${baseUrl}/auth/login?error=${encodeURIComponent('No authentication code provided')}`);
}

