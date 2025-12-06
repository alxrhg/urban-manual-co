'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2, Sparkles, X, MapPin, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { Destination } from '@/types/destination';
import { useHomepageData } from './HomepageDataProvider';
import { capitalizeCity, capitalizeCategory } from '@/lib/utils';

/**
 * AI Search Chat - Apple Design System
 *
 * Natural language search with:
 * - Clean chat interface
 * - Streaming responses
 * - Intent extraction
 * - Follow-up suggestions
 * - Destination cards inline
 */

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  destinations?: Destination[];
  suggestions?: string[];
  isStreaming?: boolean;
}

interface AISearchChatProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AISearchChat({ isOpen, onClose }: AISearchChatProps) {
  const { openDestination, destinations } = useHomepageData();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

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

  // Generate follow-up suggestions based on results
  const generateSuggestions = useCallback((query: string, results: Destination[]): string[] => {
    const suggestions: string[] = [];

    // Extract unique cities and categories from results
    const cities = [...new Set(results.map(r => r.city).filter(Boolean))];
    const categories = [...new Set(results.map(r => r.category).filter(Boolean))];

    if (cities.length > 0) {
      suggestions.push(`Show me more in ${cities[0]}`);
    }
    if (categories.length > 0 && categories[0]) {
      suggestions.push(`Best ${categories[0]}s nearby`);
    }
    suggestions.push('What about Michelin star restaurants?');
    suggestions.push('Show me on map');

    return suggestions.slice(0, 4);
  }, []);

  // Send message
  const sendMessage = useCallback(async () => {
    const query = input.trim();
    if (!query || isLoading) return;

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
      // Try AI search first
      const response = await fetch('/api/search/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          conversationHistory: messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (response.ok) {
        const data = await response.json();

        setMessages(prev => prev.map(m =>
          m.id === assistantId
            ? {
                ...m,
                content: data.response || 'Here are some recommendations for you:',
                destinations: data.destinations || [],
                suggestions: generateSuggestions(query, data.destinations || []),
                isStreaming: false,
              }
            : m
        ));
      } else {
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
                suggestions: results.length > 0 ? generateSuggestions(query, results) : ['Show me restaurants in Tokyo', 'Best hotels in London'],
                isStreaming: false,
              }
            : m
        ));
      }
    } catch {
      // Fallback to local search on error
      const results = localSearch(query);
      const responseText = results.length > 0
        ? `Found ${results.length} result${results.length === 1 ? '' : 's'}:`
        : `No results found for "${query}".`;

      setMessages(prev => prev.map(m =>
        m.id === assistantId
          ? {
              ...m,
              content: responseText,
              destinations: results,
              suggestions: ['Show me restaurants', 'Hotels in Paris'],
              isStreaming: false,
            }
          : m
      ));
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, localSearch, generateSuggestions]);

  // Handle suggestion click
  const handleSuggestionClick = useCallback((suggestion: string) => {
    setInput(suggestion);
    setTimeout(() => {
      sendMessage();
    }, 100);
  }, [sendMessage]);

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
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-[16px] font-semibold text-gray-900 dark:text-white">
                AI Search
              </h2>
              <p className="text-[12px] text-gray-500 dark:text-gray-400">
                Ask me anything about destinations
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
          {messages.length === 0 && (
            <div className="text-center py-8">
              <p className="text-[15px] text-gray-500 dark:text-gray-400 mb-4">
                Try asking:
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {['Best restaurants in Tokyo', 'Romantic hotels in Paris', 'Coffee shops in London'].map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSuggestionClick(s)}
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
                      <span className="text-[14px]">Searching...</span>
                    </div>
                  ) : (
                    <p className="text-[14px] leading-relaxed">{message.content}</p>
                  )}
                </div>

                {/* Destination cards */}
                {message.destinations && message.destinations.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {message.destinations.map((dest) => (
                      <button
                        key={dest.slug}
                        onClick={() => openDestination(dest)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl
                                   bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10
                                   hover:border-gray-300 dark:hover:border-white/20
                                   transition-colors text-left"
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
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Suggestions */}
                {message.suggestions && message.suggestions.length > 0 && !message.isStreaming && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {message.suggestions.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => handleSuggestionClick(s)}
                        className="px-3 py-1.5 rounded-full border border-gray-200 dark:border-white/10
                                   text-[12px] text-gray-600 dark:text-gray-400
                                   hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                      >
                        {s}
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
