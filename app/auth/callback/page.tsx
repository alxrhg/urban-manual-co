'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      // Wait a bit for Supabase to initialize and detect session from URL
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check if Supabase already handled the session automatically
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const next = searchParams.get('next') || '/';
        router.push(next);
        return;
      }

      // Try to get code from query params or hash
      const code = searchParams.get('code');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');
      const next = searchParams.get('next') || '/';

      // Check URL hash for access_token (implicit flow fallback)
      const hash = window.location.hash.substring(1);
      const hashParams = new URLSearchParams(hash);
      const accessToken = hashParams.get('access_token');
      const hashError = hashParams.get('error');

      // Handle OAuth errors
      if (error || hashError) {
        const errorMessage = errorDescription || error || hashError;
        router.push(`/auth/login?error=${encodeURIComponent(errorMessage)}`);
        return;
      }

      // If we have an access_token in hash, this is implicit flow
      // Supabase should handle this automatically with detectSessionInUrl
      if (accessToken) {
        // Wait a bit more for Supabase to process
        await new Promise(resolve => setTimeout(resolve, 500));
        const { data: { session: hashSession } } = await supabase.auth.getSession();
        if (hashSession) {
          router.push(next);
          return;
        }
      }

      // Exchange code for session (PKCE flow - client-side)
      if (code) {
        try {
          // Wait a bit for code verifier to be available
          await new Promise(resolve => setTimeout(resolve, 200));
          
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          
          if (exchangeError) {
            console.error('Code exchange error:', exchangeError);
            
            // If code verifier is missing, try to let Supabase handle it automatically
            if (exchangeError.message?.includes('code verifier')) {
              // Wait and check if Supabase auto-handled it
              await new Promise(resolve => setTimeout(resolve, 1000));
              const { data: { session: autoSession } } = await supabase.auth.getSession();
              if (autoSession) {
                router.push(next);
                return;
              }
            }
            
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

      // No code or token provided - wait a bit more for Supabase auto-detection
      await new Promise(resolve => setTimeout(resolve, 1000));
      const { data: { session: finalSession } } = await supabase.auth.getSession();
      if (finalSession) {
        router.push(next);
        return;
      }

      // Still no session - show error
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

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-500 text-sm mb-2">Loading...</div>
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}

