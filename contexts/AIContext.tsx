'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useTripBuilder, type ActiveTrip, type TripDay } from './TripBuilderContext';
import { Destination } from '@/types/destination';

// =============================================================================
// TYPES
// =============================================================================

export interface AIContext {
  type: 'global' | 'trip' | 'destination' | 'city';
  trip?: {
    id?: string;
    title: string;
    city: string;
    days: {
      dayNumber: number;
      date?: string;
      items: {
        name: string;
        category?: string;
        timeSlot?: string;
        slug: string;
      }[];
    }[];
    startDate?: string;
    endDate?: string;
  };
  destination?: {
    slug: string;
    name: string;
    city: string;
    category?: string;
  };
  city?: string;
  page?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  destinations?: Destination[];
  suggestions?: ProactiveSuggestion[];
  timestamp: number;
  isStreaming?: boolean;
}

export interface ProactiveSuggestion {
  id: string;
  type: 'tip' | 'warning' | 'recommendation' | 'action';
  title: string;
  description: string;
  action?: {
    type: 'add_to_trip' | 'search' | 'navigate' | 'optimize';
    label: string;
    payload?: Record<string, unknown>;
  };
  destinations?: {
    slug: string;
    name: string;
    city: string;
    category?: string;
    image?: string;
  }[];
  priority: number;
  reasoning?: string;
}

export interface AIProviderContextType {
  // State
  isOpen: boolean;
  isMinimized: boolean;
  isLoading: boolean;
  messages: ChatMessage[];
  suggestions: ProactiveSuggestion[];
  sessionId: string | null;
  context: AIContext;

  // Actions
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
  minimizeChat: () => void;
  expandChat: () => void;
  sendMessage: (message: string) => Promise<void>;
  clearMessages: () => void;
  setContext: (context: Partial<AIContext>) => void;
  refreshSuggestions: () => Promise<void>;
  handleSuggestionAction: (suggestion: ProactiveSuggestion) => void;

  // Quick actions
  askAboutTrip: (question?: string) => void;
  askAboutDestination: (destination: Destination, question?: string) => void;
  searchInCity: (city: string, query?: string) => void;
}

const AIProviderContext = createContext<AIProviderContextType | null>(null);

// Session storage key
const SESSION_KEY = 'urbanmanual_ai_session';
const MESSAGES_KEY = 'urbanmanual_ai_messages';

// =============================================================================
// PROVIDER
// =============================================================================

export function AIProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  // Try to get trip context - but handle case where TripBuilderProvider isn't available
  let tripContext: { activeTrip: ActiveTrip | null } = { activeTrip: null };
  try {
    tripContext = useTripBuilder();
  } catch {
    // TripBuilderProvider not available, that's okay
  }
  const { activeTrip } = tripContext;

  // State
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [suggestions, setSuggestions] = useState<ProactiveSuggestion[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [context, setContextState] = useState<AIContext>({ type: 'global' });

  // Load session from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) {
      try {
        const { sessionId: storedId, lastActive } = JSON.parse(stored);
        const hoursSinceLastActive = (Date.now() - lastActive) / (1000 * 60 * 60);
        if (hoursSinceLastActive < 24) {
          setSessionId(storedId);
        }
      } catch {
        // Invalid stored data
      }
    }

    // Load messages
    const storedMessages = localStorage.getItem(MESSAGES_KEY);
    if (storedMessages) {
      try {
        const parsed = JSON.parse(storedMessages);
        // Only restore if less than 24 hours old
        const mostRecent = parsed[parsed.length - 1];
        if (mostRecent && Date.now() - mostRecent.timestamp < 24 * 60 * 60 * 1000) {
          setMessages(parsed.slice(-20)); // Keep last 20 messages
        }
      } catch {
        // Invalid stored data
      }
    }
  }, []);

  // Save session when it changes
  useEffect(() => {
    if (sessionId) {
      localStorage.setItem(SESSION_KEY, JSON.stringify({
        sessionId,
        lastActive: Date.now(),
      }));
    }
  }, [sessionId]);

  // Save messages when they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages.slice(-20)));
    }
  }, [messages]);

  // Update context when trip changes
  useEffect(() => {
    if (activeTrip) {
      setContextState(prev => ({
        ...prev,
        type: 'trip',
        trip: {
          id: activeTrip.id,
          title: activeTrip.title,
          city: activeTrip.city,
          days: activeTrip.days.map(day => ({
            dayNumber: day.dayNumber,
            date: day.date,
            items: day.items.map(item => ({
              name: item.destination.name,
              category: item.destination.category,
              timeSlot: item.timeSlot,
              slug: item.destination.slug,
            })),
          })),
          startDate: activeTrip.startDate,
          endDate: activeTrip.endDate,
        },
      }));
    } else if (context.type === 'trip') {
      setContextState({ type: 'global' });
    }
  }, [activeTrip]);

  // Fetch suggestions when context changes
  const refreshSuggestions = useCallback(async () => {
    if (context.type === 'global' && !context.city) {
      setSuggestions([]);
      return;
    }

    try {
      const params = new URLSearchParams();
      params.set('contextType', context.type);

      if (context.city) {
        params.set('city', context.city);
      }

      if (context.trip) {
        params.set('trip', JSON.stringify(context.trip));
      }

      const response = await fetch(`/api/ai/chat?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.suggestions) {
          setSuggestions(data.data.suggestions);
        }
      }
    } catch (error) {
      console.error('[AI] Error fetching suggestions:', error);
    }
  }, [context]);

  // Refresh suggestions when context changes significantly
  useEffect(() => {
    const debounce = setTimeout(() => {
      if (context.type !== 'global' || context.city) {
        refreshSuggestions();
      }
    }, 1000);

    return () => clearTimeout(debounce);
  }, [context.type, context.city, context.trip?.days?.length, refreshSuggestions]);

  // Send message
  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message.trim(),
      timestamp: Date.now(),
    };

    // Add user message
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Add placeholder for assistant
    const assistantId = `assistant-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    }]);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message.trim(),
          sessionId,
          context,
          includeProactiveSuggestions: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();

      if (data.success && data.data) {
        // Update session ID
        if (data.data.sessionId && data.data.sessionId !== sessionId) {
          setSessionId(data.data.sessionId);
        }

        // Update suggestions
        if (data.data.suggestions) {
          setSuggestions(data.data.suggestions);
        }

        // Update assistant message
        setMessages(prev => prev.map(m =>
          m.id === assistantId
            ? {
                ...m,
                content: data.data.content,
                destinations: data.data.destinations,
                suggestions: data.data.suggestions,
                isStreaming: false,
              }
            : m
        ));
      } else {
        throw new Error('Invalid response');
      }
    } catch (error) {
      console.error('[AI] Error sending message:', error);

      setMessages(prev => prev.map(m =>
        m.id === assistantId
          ? {
              ...m,
              content: 'Sorry, I encountered an error. Please try again.',
              isStreaming: false,
            }
          : m
      ));
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, sessionId, context]);

  // Clear messages
  const clearMessages = useCallback(() => {
    setMessages([]);
    setSessionId(null);
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(MESSAGES_KEY);
  }, []);

  // Set context
  const setContext = useCallback((partial: Partial<AIContext>) => {
    setContextState(prev => ({ ...prev, ...partial }));
  }, []);

  // Handle suggestion action
  const handleSuggestionAction = useCallback((suggestion: ProactiveSuggestion) => {
    if (!suggestion.action) return;

    switch (suggestion.action.type) {
      case 'search':
        // Open chat and perform search
        setIsOpen(true);
        setIsMinimized(false);
        const searchQuery = suggestion.action.payload?.query as string;
        if (searchQuery) {
          sendMessage(searchQuery);
        }
        break;

      case 'add_to_trip':
        // This would integrate with TripBuilderContext
        // For now, just open chat
        setIsOpen(true);
        setIsMinimized(false);
        break;

      case 'navigate':
        const url = suggestion.action.payload?.url as string;
        if (url) {
          window.location.href = url;
        }
        break;

      case 'optimize':
        // This would call trip optimization
        setIsOpen(true);
        setIsMinimized(false);
        sendMessage('Optimize my trip itinerary');
        break;
    }
  }, [sendMessage]);

  // Quick actions
  const askAboutTrip = useCallback((question?: string) => {
    setIsOpen(true);
    setIsMinimized(false);
    if (question) {
      sendMessage(question);
    } else if (activeTrip) {
      sendMessage(`How is my ${activeTrip.city} trip looking? Any suggestions?`);
    }
  }, [activeTrip, sendMessage]);

  const askAboutDestination = useCallback((destination: Destination, question?: string) => {
    setContextState(prev => ({
      ...prev,
      type: 'destination',
      destination: {
        slug: destination.slug,
        name: destination.name,
        city: destination.city || '',
        category: destination.category,
      },
    }));
    setIsOpen(true);
    setIsMinimized(false);
    if (question) {
      sendMessage(question);
    } else {
      sendMessage(`Tell me about ${destination.name}`);
    }
  }, [sendMessage]);

  const searchInCity = useCallback((city: string, query?: string) => {
    setContextState(prev => ({
      ...prev,
      type: 'city',
      city,
    }));
    setIsOpen(true);
    setIsMinimized(false);
    sendMessage(query || `What are the best things to do in ${city}?`);
  }, [sendMessage]);

  // Computed
  const value: AIProviderContextType = useMemo(() => ({
    isOpen,
    isMinimized,
    isLoading,
    messages,
    suggestions,
    sessionId,
    context,
    openChat: () => { setIsOpen(true); setIsMinimized(false); },
    closeChat: () => setIsOpen(false),
    toggleChat: () => setIsOpen(prev => !prev),
    minimizeChat: () => setIsMinimized(true),
    expandChat: () => setIsMinimized(false),
    sendMessage,
    clearMessages,
    setContext,
    refreshSuggestions,
    handleSuggestionAction,
    askAboutTrip,
    askAboutDestination,
    searchInCity,
  }), [
    isOpen,
    isMinimized,
    isLoading,
    messages,
    suggestions,
    sessionId,
    context,
    sendMessage,
    clearMessages,
    setContext,
    refreshSuggestions,
    handleSuggestionAction,
    askAboutTrip,
    askAboutDestination,
    searchInCity,
  ]);

  return (
    <AIProviderContext.Provider value={value}>
      {children}
    </AIProviderContext.Provider>
  );
}

export function useAI() {
  const context = useContext(AIProviderContext);
  if (!context) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
}

// Optional hook that doesn't throw if provider is missing
export function useAIOptional() {
  return useContext(AIProviderContext);
}
