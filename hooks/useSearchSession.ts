'use client';

/**
 * useSearchSession Hook
 *
 * Unified React hook for the SearchSession pipeline.
 * Powers both guided search UI and chat interface with the same underlying engine.
 *
 * Features:
 * - Session persistence across page reloads
 * - Mode switching (guided ↔ chat)
 * - Streaming support for real-time responses
 * - Behavior tracking
 * - Optimistic updates
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  SearchSession,
  TurnOutput,
  TurnInput,
  SessionContext,
  PresentationMode,
  PresentationConfig,
  RankedDestination,
  Suggestion,
  BehaviorSignal,
  SearchSessionResponse,
  SearchSessionStreamChunk,
} from '@/types/search-session';

// ============================================
// TYPES
// ============================================

interface UseSearchSessionOptions {
  /** Initial presentation mode */
  mode?: PresentationMode;
  /** User ID for personalization */
  userId?: string;
  /** Enable streaming responses */
  streaming?: boolean;
  /** Session TTL key for localStorage */
  storageKey?: string;
  /** Callback when session loads */
  onSessionLoad?: (session: SearchSession) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

interface UseSearchSessionReturn {
  // State
  sessionId: string | null;
  mode: PresentationMode;
  isLoading: boolean;
  isStreaming: boolean;
  error: Error | null;

  // Turn data
  currentOutput: TurnOutput | null;
  destinations: RankedDestination[];
  suggestions: Suggestion[];
  narrative: string;

  // Context
  context: SessionContext | null;
  turnCount: number;

  // Actions
  search: (query: string, filters?: TurnInput['filters']) => Promise<void>;
  searchWithChip: (chip: Suggestion) => Promise<void>;
  switchMode: (newMode: PresentationMode) => Promise<void>;
  trackBehavior: (signals: BehaviorSignal[]) => Promise<void>;
  clearSession: () => void;

  // Utilities
  isGuidedMode: boolean;
  isChatMode: boolean;
}

// ============================================
// CONSTANTS
// ============================================

const SESSION_STORAGE_KEY = 'urban-manual-search-session';
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ============================================
// HOOK IMPLEMENTATION
// ============================================

export function useSearchSession(options: UseSearchSessionOptions = {}): UseSearchSessionReturn {
  const {
    mode: initialMode = 'guided',
    userId,
    streaming = false,
    storageKey = SESSION_STORAGE_KEY,
    onSessionLoad,
    onError,
  } = options;

  // State
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [mode, setMode] = useState<PresentationMode>(initialMode);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Turn data
  const [currentOutput, setCurrentOutput] = useState<TurnOutput | null>(null);
  const [destinations, setDestinations] = useState<RankedDestination[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [narrative, setNarrative] = useState('');

  // Context
  const [context, setContext] = useState<SessionContext | null>(null);
  const [turnCount, setTurnCount] = useState(0);

  // Refs for abort controller
  const abortControllerRef = useRef<AbortController | null>(null);

  // ============================================
  // PERSISTENCE
  // ============================================

  // Load session from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const { sessionId: storedId, expiresAt, mode: storedMode } = JSON.parse(stored);
        if (storedId && expiresAt && Date.now() < expiresAt) {
          setSessionId(storedId);
          if (storedMode) setMode(storedMode);
          // Load session from API
          loadSession(storedId);
        } else {
          localStorage.removeItem(storageKey);
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [storageKey]);

  // Persist session to localStorage
  const persistSession = useCallback((id: string, sessionMode: PresentationMode) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        sessionId: id,
        mode: sessionMode,
        expiresAt: Date.now() + SESSION_TTL_MS,
      }));
    } catch {
      // Ignore localStorage errors
    }
  }, [storageKey]);

  // Load existing session
  const loadSession = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/search-session?sessionId=${id}&userId=${userId || ''}`);
      if (response.ok) {
        const data = await response.json();
        setContext(data.context);
        setTurnCount(data.turnCount);
        if (data.lastTurn) {
          setCurrentOutput(data.lastTurn.output);
          setDestinations(data.lastTurn.output.destinations || []);
          setSuggestions(data.lastTurn.output.suggestions || []);
          if (data.lastTurn.output.presentation?.type === 'chat') {
            setNarrative(data.lastTurn.output.presentation.narrative || '');
          }
        }
        onSessionLoad?.(data);
      }
    } catch (err) {
      console.error('[useSearchSession] Load error:', err);
    }
  }, [userId, onSessionLoad]);

  // ============================================
  // SEARCH
  // ============================================

  const search = useCallback(async (
    query: string,
    filters?: TurnInput['filters']
  ) => {
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    // Optimistic: clear previous results for fresh search
    if (!query.toLowerCase().startsWith('more')) {
      setDestinations([]);
      setNarrative('');
    }

    try {
      const body = {
        sessionId,
        userId,
        mode,
        input: {
          query,
          type: 'text' as const,
          filters,
        },
        config: {
          streaming,
        },
      };

      if (streaming && mode === 'chat') {
        // Use streaming endpoint
        await handleStreamingSearch(body);
      } else {
        // Use regular endpoint
        await handleRegularSearch(body);
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        const error = err as Error;
        setError(error);
        onError?.(error);
      }
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  }, [sessionId, userId, mode, streaming, onError]);

  const handleRegularSearch = async (body: Record<string, unknown>) => {
    const response = await fetch('/api/search-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: abortControllerRef.current?.signal,
    });

    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }

    const data: SearchSessionResponse = await response.json();

    // Update state
    setSessionId(data.sessionId);
    setCurrentOutput(data.turn);
    setDestinations(data.turn.destinations);
    setSuggestions(data.turn.suggestions);
    setContext(data.context);
    setTurnCount(data.turnNumber);

    if (data.turn.presentation.type === 'chat') {
      setNarrative(data.turn.presentation.narrative);
    }

    // Persist
    persistSession(data.sessionId, mode);
  };

  const handleStreamingSearch = async (body: Record<string, unknown>) => {
    setIsStreaming(true);

    const response = await fetch('/api/search-session/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: abortControllerRef.current?.signal,
    });

    if (!response.ok) {
      throw new Error(`Stream failed: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const chunk: SearchSessionStreamChunk = JSON.parse(line.slice(6));
            handleStreamChunk(chunk);
          } catch {
            // Ignore parse errors
          }
        }
      }
    }
  };

  const handleStreamChunk = (chunk: SearchSessionStreamChunk) => {
    switch (chunk.type) {
      case 'intent':
        if (typeof chunk.data === 'object' && chunk.data !== null && 'sessionId' in chunk.data) {
          setSessionId((chunk.data as { sessionId: string }).sessionId);
        }
        break;

      case 'destinations':
        if (typeof chunk.data === 'object' && chunk.data !== null && 'destinations' in chunk.data) {
          const newDests = (chunk.data as { destinations: RankedDestination[] }).destinations;
          setDestinations(prev => {
            const existingSlugs = new Set(prev.map(d => d.destination.slug));
            const unique = newDests.filter(d => !existingSlugs.has(d.destination.slug));
            return [...prev, ...unique];
          });
        }
        break;

      case 'narrative':
        if (typeof chunk.data === 'object' && chunk.data !== null && 'text' in chunk.data) {
          setNarrative((chunk.data as { text: string }).text);
        }
        break;

      case 'suggestions':
        if (typeof chunk.data === 'object' && chunk.data !== null && 'suggestions' in chunk.data) {
          setSuggestions((chunk.data as { suggestions: Suggestion[] }).suggestions);
        }
        break;

      case 'complete':
        if (typeof chunk.data === 'object' && chunk.data !== null) {
          const completeData = chunk.data as {
            turnNumber: number;
            context: SessionContext;
            presentation: TurnOutput['presentation'];
          };
          setTurnCount(completeData.turnNumber);
          setContext(completeData.context);
          if (sessionId) {
            persistSession(sessionId, mode);
          }
        }
        setIsStreaming(false);
        break;

      case 'error':
        if (typeof chunk.data === 'object' && chunk.data !== null && 'message' in chunk.data) {
          setError(new Error((chunk.data as { message: string }).message));
        }
        setIsStreaming(false);
        break;
    }
  };

  // ============================================
  // CHIP SEARCH
  // ============================================

  const searchWithChip = useCallback(async (chip: Suggestion) => {
    if (chip.query) {
      await search(chip.query, chip.action?.payload as TurnInput['filters']);
    } else if (chip.action) {
      // Handle action-based chips
      switch (chip.action.type) {
        case 'show_saved':
          await search('show my saved places');
          break;
        default:
          await search(chip.label);
      }
    }
  }, [search]);

  // ============================================
  // MODE SWITCHING
  // ============================================

  const switchMode = useCallback(async (newMode: PresentationMode) => {
    if (newMode === mode) return;

    try {
      if (sessionId) {
        await fetch('/api/search-session', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            userId,
            action: 'switch_mode',
            data: { mode: newMode },
          }),
        });
      }

      setMode(newMode);
      if (sessionId) {
        persistSession(sessionId, newMode);
      }
    } catch (err) {
      console.error('[useSearchSession] Mode switch error:', err);
    }
  }, [sessionId, userId, mode, persistSession]);

  // ============================================
  // BEHAVIOR TRACKING
  // ============================================

  const trackBehavior = useCallback(async (signals: BehaviorSignal[]) => {
    if (!sessionId || signals.length === 0) return;

    try {
      await fetch('/api/search-session', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          userId,
          action: 'track_behavior',
          data: { signals },
        }),
      });
    } catch (err) {
      console.error('[useSearchSession] Track behavior error:', err);
    }
  }, [sessionId, userId]);

  // ============================================
  // CLEAR SESSION
  // ============================================

  const clearSession = useCallback(() => {
    setSessionId(null);
    setCurrentOutput(null);
    setDestinations([]);
    setSuggestions([]);
    setNarrative('');
    setContext(null);
    setTurnCount(0);
    setError(null);
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  // ============================================
  // CLEANUP
  // ============================================

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // ============================================
  // RETURN
  // ============================================

  return {
    // State
    sessionId,
    mode,
    isLoading,
    isStreaming,
    error,

    // Turn data
    currentOutput,
    destinations,
    suggestions,
    narrative,

    // Context
    context,
    turnCount,

    // Actions
    search,
    searchWithChip,
    switchMode,
    trackBehavior,
    clearSession,

    // Utilities
    isGuidedMode: mode === 'guided',
    isChatMode: mode === 'chat',
  };
}

export default useSearchSession;
