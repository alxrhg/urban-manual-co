/**
 * CSRF Token Hook
 *
 * Provides CSRF tokens for client-side forms and API requests.
 * Automatically fetches and caches the token.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { CSRF_CONFIG } from '@/lib/security/csrf';

/**
 * Get CSRF token from cookie
 */
function getTokenFromCookie(): string | null {
  if (typeof document === 'undefined') return null;

  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === CSRF_CONFIG.cookieName) {
      return value;
    }
  }
  return null;
}

/**
 * Hook to manage CSRF tokens
 *
 * Usage:
 * ```tsx
 * const { token, headers, refresh } = useCsrf();
 *
 * const response = await fetch('/api/something', {
 *   method: 'POST',
 *   headers: {
 *     ...headers,
 *     'Content-Type': 'application/json',
 *   },
 *   body: JSON.stringify(data),
 * });
 * ```
 */
export function useCsrf() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchToken = useCallback(async () => {
    try {
      // First check if we have a valid token in cookies
      const existingToken = getTokenFromCookie();
      if (existingToken) {
        setToken(existingToken);
        setLoading(false);
        return;
      }

      // Fetch a new token
      const response = await fetch('/api/csrf');
      if (response.ok) {
        const data = await response.json();
        setToken(data.token);
      }
    } catch (error) {
      console.error('Failed to fetch CSRF token:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchToken();
  }, [fetchToken]);

  const refresh = useCallback(async () => {
    setLoading(true);
    // Clear existing cookie
    if (typeof document !== 'undefined') {
      document.cookie = `${CSRF_CONFIG.cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    }
    await fetchToken();
  }, [fetchToken]);

  // Headers to include in requests
  const headers = token
    ? { [CSRF_CONFIG.headerName]: token }
    : {};

  return {
    token,
    loading,
    headers,
    headerName: CSRF_CONFIG.headerName,
    refresh,
  };
}

/**
 * Utility to create fetch with CSRF headers
 */
export function createCsrfFetch(token: string | null) {
  return async (url: string, options: RequestInit = {}): Promise<Response> => {
    const headers = new Headers(options.headers);

    if (token) {
      headers.set(CSRF_CONFIG.headerName, token);
    }

    return fetch(url, {
      ...options,
      headers,
      credentials: 'same-origin',
    });
  };
}
