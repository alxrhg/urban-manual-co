import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  
  // if "next" is in param, use it as the redirect URL
  let next = searchParams.get('next') ?? '/';
  if (!next.startsWith('/')) {
    // if "next" is not a relative URL, use the default
    next = '/';
  }

  // Handle OAuth errors from Apple
  if (error) {
    const errorMessage = errorDescription || error;
    return NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent(errorMessage)}`);
  }

  if (code) {
    try {
      const supabase = await createServerClient();
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      
      if (!exchangeError && data.session) {
        const forwardedHost = request.headers.get('x-forwarded-host'); // original origin before load balancer
        const isLocalEnv = process.env.NODE_ENV === 'development';
        
        if (isLocalEnv) {
          return NextResponse.redirect(`${origin}${next}`);
        } else if (forwardedHost) {
          return NextResponse.redirect(`https://${forwardedHost}${next}`);
        } else {
          return NextResponse.redirect(`${origin}${next}`);
        }
      } else {
        // Exchange failed
        return NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent(exchangeError?.message || 'Failed to authenticate')}`);
      }
    } catch (err: any) {
      console.error('OAuth callback error:', err);
      return NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent(err.message || 'Authentication failed')}`);
    }
  }

  // No code provided
  return NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent('No authentication code provided')}`);
}

