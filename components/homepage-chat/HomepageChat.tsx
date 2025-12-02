'use client';

import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, MessageCircle } from 'lucide-react';
import { ChatHeader, ContextBadge } from './ChatHeader';
import { ChatMessages, ChatEmptyState, ChatMessagesSkeleton } from './ChatMessages';
import { ChatInput, CompactInput } from './ChatInput';
import { Message, ChatMessageDestination } from './ChatMessage';
import { useAuth } from '@/contexts/AuthContext';
import { useDrawer } from '@/contexts/DrawerContext';
import {
  ensureConversationSessionToken,
  persistConversationSessionToken,
} from '@/lib/chat/sessionToken';
import { trackSuggestionAcceptance } from '@/lib/metrics/conversationMetrics';
import { cn } from '@/lib/utils';

export type ChatViewMode = 'minimized' | 'compact' | 'expanded';

interface HomepageChatProps {
  className?: string;
  defaultViewMode?: ChatViewMode;
  onDestinationClick?: (destination: ChatMessageDestination) => void;
}

export const HomepageChat = memo(function HomepageChat({
  className,
  defaultViewMode = 'minimized',
  onDestinationClick,
}: HomepageChatProps) {
  // State
  const [viewMode, setViewMode] = useState<ChatViewMode>(defaultViewMode);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [guestSessionToken, setGuestSessionToken] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [context, setContext] = useState<{ city?: string; category?: string; mood?: string }>({});
  const [isOnline, setIsOnline] = useState(true);

  // Refs
  const abortControllerRef = useRef<AbortController | null>(null);

  // Hooks
  const { user } = useAuth();
  const { openDrawer } = useDrawer();

  // Initialize guest session token
  useEffect(() => {
    if (!user) {
      const token = ensureConversationSessionToken();
      if (token) {
        setGuestSessionToken(token);
      }
    } else {
      setGuestSessionToken(null);
    }
  }, [user]);

  // Load conversation history when opening chat
  useEffect(() => {
    if (viewMode !== 'minimized' && (user?.id || guestSessionToken)) {
      loadConversationHistory();
    }
  }, [viewMode, user?.id, guestSessionToken]);

  // Check online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load conversation history
  const loadConversationHistory = useCallback(async () => {
    try {
      setIsLoadingHistory(true);
      const isGuest = !user?.id;
      const resolvedToken = isGuest ? guestSessionToken : undefined;

      if (isGuest && !resolvedToken) return;

      const userId = user?.id || 'guest';
      const tokenQuery = resolvedToken ? `?session_token=${resolvedToken}` : '';

      const response = await fetch(`/api/conversation/${userId}${tokenQuery}`);

      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
        setSessionId(data.session_id || null);

        if (isGuest && data.session_token) {
          persistConversationSessionToken(data.session_token);
          setGuestSessionToken(data.session_token);
        }

        // Extract context from response
        if (data.context) {
          setContext({
            city: data.context.city,
            category: data.context.category,
            mood: data.context.mood,
          });
        }
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [user?.id, guestSessionToken]);

  // Send message with streaming
  const sendMessageStreaming = useCallback(
    async (userMessage: string) => {
      // Cancel any existing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setIsStreaming(true);
      setStreamingContent('');

      // Add user message immediately
      const userMsg: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: userMessage,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);

      try {
        const isGuest = !user?.id;
        let resolvedToken = isGuest ? guestSessionToken : undefined;

        if (isGuest && !resolvedToken) {
          resolvedToken = ensureConversationSessionToken();
          if (resolvedToken) {
            setGuestSessionToken(resolvedToken);
          }
        }

        const userId = user?.id || 'guest';
        const response = await fetch(`/api/conversation-stream/${userId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userMessage,
            session_token: resolvedToken,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) throw new Error('Streaming conversation failed');

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) throw new Error('No reader available');

        let fullResponse = '';
        let lastSuggestions: string[] = [];
        let lastDestinations: ChatMessageDestination[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));

                switch (data.type) {
                  case 'chunk':
                    fullResponse += data.content;
                    setStreamingContent(fullResponse);
                    break;

                  case 'complete':
                    setSessionId(data.session_id || sessionId);
                    lastSuggestions = data.suggestions || [];
                    lastDestinations = data.destinations || [];

                    // Update context if provided
                    if (data.context) {
                      setContext({
                        city: data.context.city,
                        category: data.context.category,
                        mood: data.context.mood,
                      });
                    }
                    break;

                  case 'error':
                    console.error('Streaming error:', data.error);
                    fullResponse = "Sorry, I encountered an error. Please try again.";
                    setStreamingContent(fullResponse);
                    break;
                }
              } catch {
                // Ignore parsing errors for partial chunks
              }
            }
          }
        }

        // Add the complete assistant message
        const assistantMsg: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: fullResponse,
          suggestions: lastSuggestions,
          destinations: lastDestinations,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMsg]);

        if (isGuest && resolvedToken) {
          persistConversationSessionToken(resolvedToken);
        }
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          return; // Request was cancelled
        }

        console.error('Streaming conversation error:', error);
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            role: 'assistant',
            content: "Sorry, I encountered an error. Please try again.",
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsStreaming(false);
        setStreamingContent('');
        abortControllerRef.current = null;
      }
    },
    [user?.id, guestSessionToken, sessionId]
  );

  // Send message (non-streaming fallback)
  const sendMessageNonStreaming = useCallback(
    async (userMessage: string) => {
      setIsLoading(true);

      const userMsg: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: userMessage,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);

      try {
        const isGuest = !user?.id;
        const resolvedToken = isGuest ? guestSessionToken : undefined;

        if (isGuest && !resolvedToken) return;

        const userId = user?.id || 'guest';
        const response = await fetch(`/api/conversation/${userId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userMessage,
            session_token: resolvedToken,
          }),
        });

        if (!response.ok) throw new Error('Conversation failed');

        const data = await response.json();

        setSessionId(data.session_id || sessionId);
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: data.message,
            suggestions: data.suggestions,
            destinations: data.destinations,
            timestamp: new Date(),
          },
        ]);

        if (data.context) {
          setContext({
            city: data.context.city,
            category: data.context.category,
            mood: data.context.mood,
          });
        }

        if (isGuest && resolvedToken) {
          persistConversationSessionToken(resolvedToken);
        }
      } catch (error) {
        console.error('Conversation error:', error);
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            role: 'assistant',
            content: "Sorry, I encountered an error. Please try again.",
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [user?.id, guestSessionToken, sessionId]
  );

  // Submit handler - prefers streaming
  const handleSubmit = useCallback(
    (message: string) => {
      sendMessageStreaming(message);
    },
    [sendMessageStreaming]
  );

  // Suggestion click handler
  const handleSuggestionClick = useCallback(
    async (suggestion: string) => {
      await trackSuggestionAcceptance(sessionId || '', suggestion, user?.id);
      handleSubmit(suggestion);
    },
    [sessionId, user?.id, handleSubmit]
  );

  // Destination click handler
  const handleDestinationClick = useCallback(
    (destination: ChatMessageDestination) => {
      if (onDestinationClick) {
        onDestinationClick(destination);
      } else {
        // Default: navigate to destination page
        window.location.href = `/destination/${destination.slug}`;
      }
    },
    [onDestinationClick]
  );

  // Clear conversation
  const handleClearHistory = useCallback(() => {
    setMessages([]);
    setContext({});
    setStreamingContent('');
  }, []);

  // Close and minimize
  const handleClose = useCallback(() => {
    setViewMode('minimized');
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // Clear context
  const handleClearContext = useCallback(() => {
    setContext({});
  }, []);

  // Render minimized button
  if (viewMode === 'minimized') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'fixed bottom-6 left-1/2 -translate-x-1/2 z-40',
          className
        )}
      >
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setViewMode('compact')}
          className="flex items-center gap-3 px-5 py-3 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-full shadow-lg shadow-black/10 dark:shadow-white/5 border border-gray-200/50 dark:border-gray-800/50 hover:bg-white dark:hover:bg-gray-900 transition-colors group"
        >
          <div className="relative">
            <Sparkles className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            {messages.length > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-violet-500 rounded-full" />
            )}
          </div>
          <span className="font-medium text-sm text-gray-900 dark:text-white">
            Ask AI
          </span>
        </motion.button>
      </motion.div>
    );
  }

  // Render compact or expanded chat
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className={cn(
        'fixed inset-x-0 bottom-0 z-50 flex flex-col items-center pointer-events-none',
        className
      )}
    >
      <div className="w-full max-w-3xl px-4 pb-4 pointer-events-auto">
        <div
          className={cn(
            'bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-black/10 dark:shadow-white/5 border border-gray-200/50 dark:border-gray-800/50 overflow-hidden',
            'flex flex-col',
            viewMode === 'expanded' ? 'max-h-[80vh]' : 'max-h-[60vh]'
          )}
        >
          {/* Header */}
          <ChatHeader
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onClose={handleClose}
            onClearHistory={handleClearHistory}
            isOnline={isOnline}
            hasMessages={messages.length > 0}
          />

          {/* Context Badge */}
          <ContextBadge context={context} onClear={handleClearContext} />

          {/* Messages Area */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {isLoadingHistory ? (
              <ChatMessagesSkeleton />
            ) : messages.length === 0 && !isStreaming ? (
              <ChatEmptyState onSuggestionClick={handleSuggestionClick} />
            ) : (
              <ChatMessages
                messages={messages}
                isTyping={isLoading || (isStreaming && !streamingContent)}
                streamingContent={streamingContent}
                onSuggestionClick={handleSuggestionClick}
                onDestinationClick={handleDestinationClick}
              />
            )}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200/50 dark:border-gray-800/50">
            <ChatInput
              onSubmit={handleSubmit}
              isLoading={isLoading || isStreaming}
              disabled={!isOnline}
              autoFocus={viewMode !== 'minimized'}
              placeholder={
                !isOnline
                  ? 'You appear to be offline...'
                  : 'Ask about restaurants, hotels, cities...'
              }
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
});

export default HomepageChat;
