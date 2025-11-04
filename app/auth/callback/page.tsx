'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');
      const next = searchParams.get('next') || '/';

      // Handle OAuth errors
      if (error) {
        const errorMessage = errorDescription || error;
        router.push(`/auth/login?error=${encodeURIComponent(errorMessage)}`);
        return;
      }

      // Exchange code for session (PKCE flow - client-side)
      if (code) {
        try {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          
          if (exchangeError) {
            console.error('Code exchange error:', exchangeError);
            router.push(`/auth/login?error=${encodeURIComponent(exchangeError.message || 'Failed to authenticate')}`);
            return;
          }

          if (data.session) {
            // Successfully authenticated - redirect to home or next page
            router.push(next);
            return;
          }
        } catch (err: any) {
          console.error('OAuth callback error:', err);
          router.push(`/auth/login?error=${encodeURIComponent(err.message || 'Authentication failed')}`);
          return;
        }
      }

      // No code provided
      router.push(`/auth/login?error=${encodeURIComponent('No authentication code provided')}`);
    };

    handleCallback();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <div className="text-gray-500 text-sm mb-2">Completing sign in...</div>
        <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto"></div>
      </div>
    </div>
  );
}

