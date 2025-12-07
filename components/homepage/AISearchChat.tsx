'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2, Sparkles, X, MapPin, ChevronRight, Bookmark, Plus, Brain } from 'lucide-react';
import Image from 'next/image';
import { Destination } from '@/types/destination';
import { useHomepageData } from './HomepageDataProvider';
import { capitalizeCity, capitalizeCategory } from '@/lib/utils';

/**
 * AI Search Chat - Smart Conversation Interface
 *
 * Features:
 * - Persistent sessions (continues across page reloads)
 * - Behavior tracking (learns from your clicks)
 * - Proactive suggestions
 * - Contextual hints
 * - Trip-aware responses
 */

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  destinations?: Destination[];
  suggestions?: SmartSuggestion[];
  contextualHints?: string[];
  proactiveActions?: ProactiveAction[];
  isStreaming?: boolean;
}

interface SmartSuggestion {
  text: string;
  type: 'refine' | 'expand' | 'related' | 'contrast' | 'trip' | 'saved';
  icon?: string;
  reasoning?: string;
}

interface ProactiveAction {
  type: 'save' | 'add_to_trip' | 'compare' | 'show_map' | 'schedule';
  label: string;
  destinationSlug?: string;
  reasoning: string;
}

interface AISearchChatProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

// Session storage key
const SESSION_KEY = 'urbanmanual_chat_session';

export function AISearchChat({ isOpen, onClose, initialQuery }: AISearchChatProps) {
  const { openDestination, destinations } = useHomepageData();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasProcessedInitialQuery, setHasProcessedInitialQuery] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [turnNumber, setTurnNumber] = useState(0);
  const [isReturningUser, setIsReturningUser] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load session from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) {
      try {
        const { sessionId: storedId, lastActive } = JSON.parse(stored);
        // Only restore if session is less than 24 hours old
        const hoursSinceLastActive = (Date.now() - lastActive) / (1000 * 60 * 60);
        if (hoursSinceLastActive < 24) {
          setSessionId(storedId);
          setIsReturningUser(true);
        }
      } catch {
        // Invalid stored data, start fresh
      }
    }
  }, []);

  // Save session to localStorage when it changes
  useEffect(() => {
    if (sessionId) {
      localStorage.setItem(SESSION_KEY, JSON.stringify({
        sessionId,
        lastActive: Date.now(),
      }));
    }
  }, [sessionId]);

  // Load previous conversation when opening (for returning users)
  useEffect(() => {
    if (isOpen && isReturningUser && sessionId && messages.length === 0) {
      loadPreviousSession();
    }
  }, [isOpen, isReturningUser, sessionId, messages.length]);

  const loadPreviousSession = async () => {
    if (!sessionId) return;

    try {
      const response = await fetch(`/api/smart-chat?sessionId=${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          // Restore messages
          if (data.data.messages?.length > 0) {
            setMessages(data.data.messages.map((m: any) => ({
              id: m.id || `msg-${Date.now()}-${Math.random()}`,
              role: m.role,
              content: m.content,
              destinations: m.metadata?.destinations,
              isStreaming: false,
            })));
          }
          // Set welcome back message
          if (data.data.welcomeBack) {
            setWelcomeMessage(data.data.welcomeBack);
          }
        }
      }
    } catch (error) {
      console.error('Error loading previous session:', error);
    }
  };

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setHasProcessedInitialQuery(false);
    }
  }, [isOpen]);

  // Handle initial query when chat opens
  useEffect(() => {
    if (isOpen && initialQuery && !hasProcessedInitialQuery && !isLoading) {
      setHasProcessedInitialQuery(true);
      setInput(initialQuery);
      setTimeout(() => {
        const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
        const form = inputRef.current?.closest('form');
        if (form) {
          form.dispatchEvent(submitEvent);
        }
      }, 200);
    }
  }, [isOpen, initialQuery, hasProcessedInitialQuery, isLoading]);

  // Handle keyboard escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Track behavior when user clicks a destination
  const trackClick = useCallback(async (slug: string) => {
    if (!sessionId) return;
    try {
      await fetch('/api/smart-chat/behavior', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          type: 'click',
          destinationSlug: slug,
        }),
      });
    } catch {
      // Silent fail - behavior tracking is best-effort
    }
  }, [sessionId]);

  // Handle destination click
  const handleDestinationClick = useCallback((dest: Destination) => {
    trackClick(dest.slug);
    openDestination(dest);
  }, [trackClick, openDestination]);

  // Local search as fallback
  const localSearch = useCallback((query: string): Destination[] => {
    const term = query.toLowerCase();
    return destinations
      .filter(d =>
        d.name?.toLowerCase().includes(term) ||
        d.city?.toLowerCase().includes(term) ||
        d.category?.toLowerCase().includes(term) ||
        d.neighborhood?.toLowerCase().includes(term) ||
        d.micro_description?.toLowerCase().includes(term) ||
        d.tags?.some(t => t.toLowerCase().includes(term))
      )
      .slice(0, 6);
  }, [destinations]);

  // Send message using smart chat API
  const sendMessage = useCallback(async () => {
    const query = input.trim();
    if (!query || isLoading) return;

    // Clear welcome message when user sends a message
    setWelcomeMessage(null);

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Add placeholder for assistant
    const assistantId = `assistant-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: assistantId,
      role: 'assistant',
      content: '',
      isStreaming: true,
    }]);

    try {
      // Use smart chat API
      const response = await fetch('/api/smart-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          sessionId,
          includeProactiveActions: true,
          maxDestinations: 10,
        }),
      });

      if (response.ok) {
        const data = await response.json();

        if (data.success && data.data) {
          // Update session ID if new
          if (data.data.conversationId && data.data.conversationId !== sessionId) {
            setSessionId(data.data.conversationId);
          }
          setTurnNumber(data.data.turnNumber || turnNumber + 1);

          setMessages(prev => prev.map(m =>
            m.id === assistantId
              ? {
                  ...m,
                  content: data.data.content || 'Here are some recommendations:',
                  destinations: data.data.destinations || [],
                  suggestions: data.data.suggestions || [],
                  contextualHints: data.data.contextualHints || [],
                  proactiveActions: data.data.proactiveActions || [],
                  isStreaming: false,
                }
              : m
          ));
        } else {
          throw new Error('Invalid response');
        }
      } else {
        throw new Error('API error');
      }
    } catch (error) {
      console.error('Smart chat error:', error);

      // Fallback to local search
      const results = localSearch(query);
      const responseText = results.length > 0
        ? `I found ${results.length} place${results.length === 1 ? '' : 's'} matching "${query}":`
        : `I couldn't find anything matching "${query}". Try a different search term.`;

      setMessages(prev => prev.map(m =>
        m.id === assistantId
          ? {
              ...m,
              content: responseText,
              destinations: results,
              suggestions: results.length > 0 ? [
                { text: `More in ${results[0]?.city || 'this area'}`, type: 'expand' as const },
                { text: 'Something different', type: 'contrast' as const },
              ] : [
                { text: 'Restaurants in Tokyo', type: 'expand' as const },
                { text: 'Hotels in London', type: 'expand' as const },
              ],
              isStreaming: false,
            }
          : m
      ));
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, sessionId, localSearch, turnNumber]);

  // Handle suggestion click
  const handleSuggestionClick = useCallback((suggestion: SmartSuggestion) => {
    setInput(suggestion.text);
    setTimeout(() => {
      sendMessage();
    }, 100);
  }, [sendMessage]);

  // Get icon for suggestion type
  const getSuggestionIcon = (type: SmartSuggestion['type']) => {
    switch (type) {
      case 'trip': return <Plus className="w-3 h-3" />;
      case 'saved': return <Bookmark className="w-3 h-3" />;
      default: return null;
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Chat Panel */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:bottom-4 md:left-1/2 md:-translate-x-1/2
                      md:w-full md:max-w-2xl md:rounded-2xl
                      bg-white dark:bg-[#1c1c1e] shadow-2xl
                      flex flex-col max-h-[85vh] md:max-h-[70vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500
                            flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-[16px] font-semibold text-gray-900 dark:text-white">
                Smart Search
              </h2>
              <p className="text-[12px] text-gray-500 dark:text-gray-400">
                {turnNumber > 0 ? `Turn ${turnNumber} · Remembers your preferences` : 'I learn from our conversation'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-gray-100 dark:hover:bg-white/10
                       flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Welcome back message */}
          {welcomeMessage && messages.length === 0 && (
            <div className="text-center py-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 text-[13px]">
                <Sparkles className="w-4 h-4" />
                {welcomeMessage}
              </div>
            </div>
          )}

          {messages.length === 0 && !welcomeMessage && (
            <div className="text-center py-8">
              <p className="text-[15px] text-gray-500 dark:text-gray-400 mb-4">
                Try asking:
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {['Best restaurants in Tokyo', 'Romantic hotels in Paris', 'Coffee shops in London'].map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSuggestionClick({ text: s, type: 'expand' })}
                    className="px-4 py-2 rounded-full bg-gray-100 dark:bg-white/10
                               text-[13px] text-gray-700 dark:text-gray-300
                               hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] ${message.role === 'user' ? '' : 'w-full'}`}>
                {/* Message bubble */}
                <div className={`rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                    : 'bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white'
                }`}>
                  {message.isStreaming ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-[14px]">Thinking...</span>
                    </div>
                  ) : (
                    <p className="text-[14px] leading-relaxed">{message.content}</p>
                  )}
                </div>

                {/* Contextual hints */}
                {message.contextualHints && message.contextualHints.length > 0 && !message.isStreaming && (
                  <div className="mt-2 px-1">
                    {message.contextualHints.map((hint, i) => (
                      <p key={i} className="text-[12px] text-purple-600 dark:text-purple-400 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        {hint}
                      </p>
                    ))}
                  </div>
                )}

                {/* Destination cards */}
                {message.destinations && message.destinations.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {message.destinations.map((dest) => (
                      <button
                        key={dest.slug}
                        onClick={() => handleDestinationClick(dest)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl
                                   bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10
                                   hover:border-gray-300 dark:hover:border-white/20
                                   transition-colors text-left group"
                      >
                        <div className="w-14 h-14 rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0">
                          {(dest.image_thumbnail || dest.image) ? (
                            <Image
                              src={dest.image_thumbnail || dest.image || ''}
                              alt={dest.name}
                              width={56}
                              height={56}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <MapPin className="w-5 h-5 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-medium text-gray-900 dark:text-white truncate">
                            {dest.name}
                          </p>
                          <p className="text-[12px] text-gray-500 dark:text-gray-400 truncate">
                            {dest.category && capitalizeCategory(dest.category)}
                            {dest.category && dest.city && ' · '}
                            {dest.city && capitalizeCity(dest.city)}
                            {dest.rating && ` · ⭐ ${dest.rating}`}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Smart Suggestions */}
                {message.suggestions && message.suggestions.length > 0 && !message.isStreaming && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {message.suggestions.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => handleSuggestionClick(s)}
                        className="px-3 py-1.5 rounded-full border border-gray-200 dark:border-white/10
                                   text-[12px] text-gray-600 dark:text-gray-400
                                   hover:bg-gray-100 dark:hover:bg-white/10 transition-colors
                                   flex items-center gap-1.5"
                        title={s.reasoning}
                      >
                        {getSuggestionIcon(s.type)}
                        {s.text}
                      </button>
                    ))}
                  </div>
                )}

                {/* Proactive Actions */}
                {message.proactiveActions && message.proactiveActions.length > 0 && !message.isStreaming && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {message.proactiveActions.map((action, i) => (
                      <button
                        key={i}
                        className="px-3 py-1.5 rounded-full bg-purple-100 dark:bg-purple-500/20
                                   text-[12px] text-purple-700 dark:text-purple-300
                                   hover:bg-purple-200 dark:hover:bg-purple-500/30 transition-colors
                                   flex items-center gap-1.5"
                        title={action.reasoning}
                      >
                        {action.type === 'save' && <Bookmark className="w-3 h-3" />}
                        {action.type === 'add_to_trip' && <Plus className="w-3 h-3" />}
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-5 py-4 border-t border-gray-100 dark:border-white/10">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="flex items-center gap-3"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Search destinations..."
              className="flex-1 h-12 px-5 rounded-full bg-gray-100 dark:bg-white/10
                         text-[15px] text-gray-900 dark:text-white
                         placeholder:text-gray-500 dark:placeholder:text-gray-400
                         focus:outline-none focus:ring-2 focus:ring-gray-900/20 dark:focus:ring-white/20
                         transition-all"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="w-12 h-12 rounded-full bg-gray-900 dark:bg-white
                         flex items-center justify-center
                         disabled:opacity-40
                         hover:bg-gray-800 dark:hover:bg-gray-100
                         transition-colors"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-white dark:text-gray-900" />
              ) : (
                <Send className="w-5 h-5 text-white dark:text-gray-900" />
              )}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

export default AISearchChat;
