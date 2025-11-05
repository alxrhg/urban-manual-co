'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Conversation session management for authenticated and anonymous users
 *
 * Features:
 * - Automatic session token generation for anonymous users
 * - localStorage persistence
 * - Session ID tracking after first API call
 * - Upgrade support (anonymous → authenticated)
 * - Conversation history loading
 */

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  destinations?: any[];
}

export interface ConversationContext {
  city?: string;
  category?: string;
  meal?: string;
  cuisine?: string;
  mood?: string;
  price_level?: string;
}

export interface SessionState {
  sessionToken: string | null;
  sessionId: string | null;
  isReady: boolean;
  conversationHistory: ConversationMessage[];
  conversationContext: ConversationContext;
}

/**
 * Hook for managing conversation session state
 * Handles both authenticated users (userId) and anonymous users (sessionToken)
 */
export function useConversationSession(userId?: string) {
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [conversationContext, setConversationContext] = useState<ConversationContext>({});

  /**
   * Initialize or retrieve session
   */
  const initializeSession = useCallback(async () => {
    try {
      // For authenticated users, use userId
      if (userId) {
        const response = await fetch(`/api/ai-chat?userId=${userId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.sessionId) {
            setSessionId(data.sessionId);

            // Load conversation history if exists
            if (data.messages && data.messages.length > 0) {
              const formattedHistory = data.messages.map((msg: any) => ({
                role: msg.role,
                content: msg.content,
                destinations: msg.destinations || undefined,
              }));
              setConversationHistory(formattedHistory);
            }

            // Load conversation context
            if (data.context) {
              setConversationContext(data.context);
            }
          }
        }
        setIsReady(true);
      } else {
        // For anonymous users, use session token
        let token = localStorage.getItem('urban_manual_session_token');
        if (!token) {
          // Generate new token
          token = `anon_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
          localStorage.setItem('urban_manual_session_token', token);
        }
        setSessionToken(token);

        // Try to load existing conversation
        const response = await fetch(`/api/ai-chat?sessionToken=${encodeURIComponent(token)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.sessionId) {
            setSessionId(data.sessionId);

            // Load conversation history if exists
            if (data.messages && data.messages.length > 0) {
              const formattedHistory = data.messages.map((msg: any) => ({
                role: msg.role,
                content: msg.content,
                destinations: msg.destinations || undefined,
              }));
              setConversationHistory(formattedHistory);
            }

            // Load conversation context
            if (data.context) {
              setConversationContext(data.context);
            }
          }
        }
        setIsReady(true);
      }
    } catch (error) {
      console.error('Failed to initialize conversation session:', error);
      // Generate token even if loading fails (for anonymous users)
      if (!userId) {
        const token = `anon_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
        localStorage.setItem('urban_manual_session_token', token);
        setSessionToken(token);
      }
      setIsReady(true);
    }
  }, [userId]);

  /**
   * Update session ID (called after first API response)
   */
  const updateSessionId = useCallback((newSessionId: string) => {
    setSessionId(newSessionId);
  }, []);

  /**
   * Update session token (for anonymous users)
   */
  const updateSessionToken = useCallback((newToken: string) => {
    setSessionToken(newToken);
    localStorage.setItem('urban_manual_session_token', newToken);
  }, []);

  /**
   * Add messages to conversation history
   */
  const addMessages = useCallback((messages: ConversationMessage[]) => {
    setConversationHistory((prev) => [...prev, ...messages]);
  }, []);

  /**
   * Update conversation context
   */
  const updateContext = useCallback((newContext: Partial<ConversationContext>) => {
    setConversationContext((prev) => ({ ...prev, ...newContext }));
  }, []);

  /**
   * Clear conversation history
   */
  const clearHistory = useCallback(() => {
    setConversationHistory([]);
    setConversationContext({});
  }, []);

  /**
   * Clear session and start fresh
   */
  const resetSession = useCallback(() => {
    setSessionId(null);
    setConversationHistory([]);
    setConversationContext({});

    if (!userId) {
      // Generate new session token for anonymous users
      const token = `anon_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      localStorage.setItem('urban_manual_session_token', token);
      setSessionToken(token);
    }
  }, [userId]);

  // Initialize session on mount or when userId changes
  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  return {
    sessionToken,
    sessionId,
    isReady,
    conversationHistory,
    conversationContext,
    updateSessionId,
    updateSessionToken,
    addMessages,
    updateContext,
    clearHistory,
    resetSession,
  };
}

/**
 * Upgrade anonymous session to authenticated user session
 * Call this after user logs in to preserve their conversation
 */
export async function upgradeSession(userId: string): Promise<boolean> {
  try {
    const sessionToken = localStorage.getItem('urban_manual_session_token');
    if (!sessionToken) {
      console.warn('No session token found to upgrade');
      return false;
    }

    // Get current session ID
    const response = await fetch(`/api/ai-chat?sessionToken=${encodeURIComponent(sessionToken)}`);
    if (!response.ok) return false;

    const data = await response.json();
    const sessionId = data.sessionId;
    if (!sessionId) return false;

    // Upgrade session
    const upgradeResponse = await fetch('/api/conversation/upgrade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        sessionToken,
        userId,
      }),
    });

    if (upgradeResponse.ok) {
      // Clear session token (no longer needed)
      localStorage.removeItem('urban_manual_session_token');
      console.log('Session upgraded successfully');
      return true;
    }

    return false;
  } catch (error) {
    console.error('Failed to upgrade session:', error);
    return false;
  }
}

/**
 * Load conversation history for a session
 */
export async function loadConversationHistory(
  sessionId?: string | null,
  sessionToken?: string | null
): Promise<ConversationMessage[]> {
  try {
    if (!sessionId && !sessionToken) {
      return [];
    }

    const params = new URLSearchParams();
    if (sessionId) params.set('sessionId', sessionId);
    if (sessionToken) params.set('sessionToken', sessionToken);

    const response = await fetch(`/api/conversation/history?${params.toString()}`);
    if (!response.ok) return [];

    const data = await response.json();
    return data.messages || [];
  } catch (error) {
    console.error('Failed to load conversation history:', error);
    return [];
  }
}
