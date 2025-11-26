'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface Destination {
  slug: string;
  name: string;
  city: string;
  category: string;
  image: string | null;
  michelin_stars: number | null;
  crown: boolean;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  destinations?: Destination[];
}

interface SearchIntent {
  keywords?: string[];
  city?: string;
  category?: string;
  modifiers?: string[];
  confidence?: number;
}

interface AIConversationContextType {
  /** Conversation history shared between both AI interfaces */
  messages: Message[];
  /** Whether AI is currently processing */
  isLoading: boolean;
  /** Latest response content for subtle display */
  latestResponse: string;
  /** Latest destinations from response */
  latestDestinations: Destination[];
  /** Search intent from latest query */
  searchIntent: SearchIntent | null;
  /** Send a message to the AI */
  sendMessage: (query: string) => Promise<{
    content: string;
    destinations: Destination[];
    intent?: SearchIntent;
    searchTier?: string;
    inferredTags?: Record<string, unknown>;
    suggestions?: Array<{ text: string; type: string }>;
  } | null>;
  /** Clear conversation history */
  clearConversation: () => void;
}

const AIConversationContext = createContext<AIConversationContextType | undefined>(undefined);

export function AIConversationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [latestResponse, setLatestResponse] = useState('');
  const [latestDestinations, setLatestDestinations] = useState<Destination[]>([]);
  const [searchIntent, setSearchIntent] = useState<SearchIntent | null>(null);

  const sendMessage = useCallback(async (query: string) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery || isLoading) return null;

    setIsLoading(true);

    // Add user message to history
    const userMessage: Message = { role: 'user', content: trimmedQuery };
    setMessages(prev => [...prev, userMessage]);

    try {
      // Build conversation history for API
      const historyForAPI = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: trimmedQuery,
          userId: user?.id,
          conversationHistory: historyForAPI,
        }),
      });

      if (!response.ok) {
        throw new Error('AI chat failed');
      }

      const data = await response.json();

      // Add assistant response to history
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.content || '',
        destinations: data.destinations,
      };

      setMessages(prev => {
        const newHistory = [...prev, assistantMessage];
        // Keep last 10 messages for context
        return newHistory.slice(-10);
      });

      // Update latest response for subtle display
      setLatestResponse(data.content || '');
      setLatestDestinations(data.destinations || []);

      if (data.intent) {
        setSearchIntent(data.intent);
      }

      return {
        content: data.content || '',
        destinations: data.destinations || [],
        intent: data.intent,
        searchTier: data.searchTier,
        inferredTags: data.inferredTags,
        suggestions: data.suggestions,
      };
    } catch (error) {
      console.error('AI chat error:', error);

      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
      };
      setMessages(prev => [...prev, errorMessage]);
      setLatestResponse('Sorry, I encountered an error. Please try again.');
      setLatestDestinations([]);

      return null;
    } finally {
      setIsLoading(false);
    }
  }, [messages, user, isLoading]);

  const clearConversation = useCallback(() => {
    setMessages([]);
    setLatestResponse('');
    setLatestDestinations([]);
    setSearchIntent(null);
  }, []);

  return (
    <AIConversationContext.Provider
      value={{
        messages,
        isLoading,
        latestResponse,
        latestDestinations,
        searchIntent,
        sendMessage,
        clearConversation,
      }}
    >
      {children}
    </AIConversationContext.Provider>
  );
}

export function useAIConversation() {
  const context = useContext(AIConversationContext);
  if (context === undefined) {
    throw new Error('useAIConversation must be used within an AIConversationProvider');
  }
  return context;
}
