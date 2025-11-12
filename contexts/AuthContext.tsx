'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    returnTo?: string
  ) => Promise<{ user: User | null; session: Session | null }>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  sendMagicLink: (email: string, returnTo?: string) => Promise<void>;
  pendingVerificationEmail: string | null;
  verificationPending: boolean;
  clearPendingVerification: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);

  useEffect(() => {
    // Check active sessions and set the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setPendingVerificationEmail(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signUp = async (
    email: string,
    password: string,
    returnTo = '/'
  ): Promise<{ user: User | null; session: Session | null }> => {
    const redirectUrl = new URL('/auth/callback', window.location.origin);
    if (returnTo) {
      redirectUrl.searchParams.set('next', returnTo);
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl.toString(),
      },
    });
    if (error) throw error;

    if (!data.session) {
      setPendingVerificationEmail(email);
    } else {
      setPendingVerificationEmail(null);
    }

    return { user: data.user, session: data.session };
  };

  const signInWithApple = async () => {
    // Use the current origin for the callback URL
    // Must be absolute URL - Supabase will use this as-is
    const callbackUrl = `${window.location.origin}/auth/callback`;
    
    // Don't clear auth state - this can interfere with PKCE code verifier storage
    // The code verifier needs to persist in localStorage for the callback
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: callbackUrl,
      },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setPendingVerificationEmail(null);
  };

  const sendMagicLink = async (email: string, returnTo = '/') => {
    const redirectUrl = new URL('/auth/callback', window.location.origin);
    if (returnTo) {
      redirectUrl.searchParams.set('next', returnTo);
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectUrl.toString(),
      },
    });

    if (error) throw error;
    setPendingVerificationEmail(email);
  };

  const clearPendingVerification = () => setPendingVerificationEmail(null);

  const verificationPending = useMemo(
    () => Boolean(pendingVerificationEmail && !user),
    [pendingVerificationEmail, user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        signInWithApple,
        signOut,
        sendMagicLink,
        pendingVerificationEmail,
        verificationPending,
        clearPendingVerification,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
