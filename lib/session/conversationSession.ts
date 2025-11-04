/**
 * Conversation Session Management for Frontend
 *
 * Handles session tokens for anonymous users and manages conversation persistence
 */

const SESSION_TOKEN_KEY = 'urban_manual_session_token';
const SESSION_ID_KEY = 'urban_manual_session_id';

/**
 * Generate a random session token
 */
export function generateSessionToken(): string {
  // Generate a random 32-character token
  const array = new Uint8Array(24);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(array);
  } else {
    // Fallback for environments without crypto
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }

  return 'sess_' + Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Get or create session token from localStorage
 */
export function getOrCreateSessionToken(): string {
  if (typeof window === 'undefined') {
    // Server-side: generate temporary token
    return generateSessionToken();
  }

  try {
    let token = localStorage.getItem(SESSION_TOKEN_KEY);

    if (!token) {
      token = generateSessionToken();
      localStorage.setItem(SESSION_TOKEN_KEY, token);
    }

    return token;
  } catch (error) {
    // localStorage not available (privacy mode, etc.)
    console.warn('localStorage not available, using temporary session');
    return generateSessionToken();
  }
}

/**
 * Clear session token (on logout or reset)
 */
export function clearSessionToken(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(SESSION_TOKEN_KEY);
    localStorage.removeItem(SESSION_ID_KEY);
  } catch (error) {
    console.warn('Failed to clear session token:', error);
  }
}

/**
 * Store session ID from server response
 */
export function storeSessionId(sessionId: string): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(SESSION_ID_KEY, sessionId);
  } catch (error) {
    console.warn('Failed to store session ID:', error);
  }
}

/**
 * Get stored session ID
 */
export function getSessionId(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    return localStorage.getItem(SESSION_ID_KEY);
  } catch (error) {
    return null;
  }
}

/**
 * Upgrade anonymous session to authenticated session
 * Call this after user logs in
 */
export async function upgradeSession(userId: string): Promise<boolean> {
  const sessionToken = getOrCreateSessionToken();
  const sessionId = getSessionId();

  if (!sessionId) {
    console.warn('No session to upgrade');
    return false;
  }

  try {
    // Call API to upgrade session
    const response = await fetch('/api/conversation/upgrade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        sessionToken,
        userId,
      }),
    });

    if (response.ok) {
      // Clear session token since user is now authenticated
      localStorage.removeItem(SESSION_TOKEN_KEY);
      return true;
    }

    return false;
  } catch (error) {
    console.error('Failed to upgrade session:', error);
    return false;
  }
}

/**
 * Conversation Session Manager Hook
 * Usage: const { sessionToken, sessionId, resetSession } = useConversationSession()
 */
export interface ConversationSession {
  sessionToken: string;
  sessionId: string | null;
  isReady: boolean;
}

export function useConversationSession(): ConversationSession & {
  resetSession: () => void;
  updateSessionId: (sessionId: string) => void;
} {
  const [sessionToken] = React.useState(() => getOrCreateSessionToken());
  const [sessionId, setSessionId] = React.useState<string | null>(() => getSessionId());
  const [isReady, setIsReady] = React.useState(false);

  React.useEffect(() => {
    // Mark as ready after hydration
    setIsReady(true);
  }, []);

  const resetSession = React.useCallback(() => {
    clearSessionToken();
    const newToken = generateSessionToken();
    localStorage.setItem(SESSION_TOKEN_KEY, newToken);
    setSessionId(null);
  }, []);

  const updateSessionId = React.useCallback((newSessionId: string) => {
    storeSessionId(newSessionId);
    setSessionId(newSessionId);
  }, []);

  return {
    sessionToken,
    sessionId,
    isReady,
    resetSession,
    updateSessionId,
  };
}

// Export React for the hook
import React from 'react';

/**
 * Conversation Message Type
 */
export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  destinations?: any[];
  timestamp?: Date;
}

/**
 * Load conversation history from server
 */
export async function loadConversationHistory(
  sessionId?: string,
  sessionToken?: string,
  limit: number = 20
): Promise<ConversationMessage[]> {
  try {
    const params = new URLSearchParams();
    if (sessionId) params.append('sessionId', sessionId);
    if (sessionToken) params.append('sessionToken', sessionToken);
    params.append('limit', limit.toString());

    const response = await fetch(`/api/conversation/history?${params}`);

    if (!response.ok) {
      console.warn('Failed to load conversation history');
      return [];
    }

    const data = await response.json();
    return data.messages || [];
  } catch (error) {
    console.error('Error loading conversation history:', error);
    return [];
  }
}

/**
 * Session Info Type
 */
export interface SessionInfo {
  sessionId: string;
  sessionToken?: string;
  context: {
    city?: string;
    category?: string;
    mood?: string;
    [key: string]: any;
  };
  messageCount: number;
}

/**
 * Get session info from server
 */
export async function getSessionInfo(
  sessionId?: string,
  sessionToken?: string
): Promise<SessionInfo | null> {
  try {
    const params = new URLSearchParams();
    if (sessionId) params.append('sessionId', sessionId);
    if (sessionToken) params.append('sessionToken', sessionToken);

    const response = await fetch(`/api/conversation/session?${params}`);

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting session info:', error);
    return null;
  }
}

/**
 * Clear conversation history (start fresh)
 */
export async function clearConversation(sessionId: string): Promise<boolean> {
  try {
    const response = await fetch('/api/conversation/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });

    return response.ok;
  } catch (error) {
    console.error('Error clearing conversation:', error);
    return false;
  }
}
