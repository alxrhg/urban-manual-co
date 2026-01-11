'use client';

/**
 * ConversationalDiscovery - Split-screen conversational interface
 *
 * Left (40%): Minimal chat interface for conversational discovery
 * Right (60%): Live-updating destination grid with contextual "why" text
 *
 * Design: Rosewood-inspired aesthetic - minimal, editorial, photography-forward
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchSession } from '@/hooks/useSearchSession';
import type { RankedDestination } from '@/types/search-session';
import { ContextualDestinationCard } from './ContextualDestinationCard';

// Placeholder prompts for empty state
const PLACEHOLDER_PROMPTS = [
  'quiet dinner in tokyo',
  'design hotel in mexico city under $400',
  'best coffee in taipei',
];

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function ConversationalDiscovery() {
  const { user } = useAuth();
  const [inputValue, setInputValue] = useState('');
  const [conversationHistory, setConversationHistory] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastNarrativeRef = useRef<string>('');

  const {
    isLoading,
    isStreaming,
    destinations,
    narrative,
    search,
    turnCount,
  } = useSearchSession({
    mode: 'chat',
    userId: user?.id,
    streaming: true,
  });

  // Disable body scroll for 100vh layout
  useEffect(() => {
    // Store original styles
    const originalOverflow = document.body.style.overflow;
    const originalHeight = document.body.style.height;

    // Set 100vh layout
    document.body.style.overflow = 'hidden';
    document.body.style.height = '100vh';

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.height = originalHeight;
    };
  }, []);

  // Auto-scroll messages to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationHistory, narrative]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Update conversation history when narrative changes
  useEffect(() => {
    if (narrative && narrative !== lastNarrativeRef.current) {
      lastNarrativeRef.current = narrative;

      // Update the last message if it exists, or add a new one
      setConversationHistory(prev => {
        const newHistory = [...prev];
        const lastMsg = newHistory[newHistory.length - 1];

        if (lastMsg && lastMsg.role === 'assistant') {
          // Update existing assistant message
          newHistory[newHistory.length - 1] = { role: 'assistant', content: narrative };
        } else {
          // Add new assistant message
          newHistory.push({ role: 'assistant', content: narrative });
        }

        return newHistory;
      });
    }
  }, [narrative]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');

    // Add user message to history
    setConversationHistory(prev => [...prev, { role: 'user', content: userMessage }]);

    // Search
    search(userMessage);
  }, [inputValue, isLoading, search]);

  const handlePromptClick = useCallback((prompt: string) => {
    setInputValue(prompt);
    inputRef.current?.focus();
  }, []);

  const handleDestinationClick = useCallback((dest: RankedDestination) => {
    // Navigate to destination detail page
    window.location.href = `/destination/${dest.destination.slug}`;
  }, []);

  return (
    <div className="flex overflow-hidden bg-[#FAFAF8]" style={{ height: 'calc(100vh - 200px)' }}>
      {/* LEFT PANEL - Conversational Interface (40%) */}
      <div className="w-[40%] flex flex-col border-r border-gray-200">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-8 py-12">
          {conversationHistory.length === 0 ? (
            // Empty State
            <div className="h-full flex flex-col items-start justify-center space-y-8">
              <div className="space-y-3">
                <h1 className="text-4xl font-serif text-gray-900 leading-tight">
                  Find your next<br />destination
                </h1>
                <p className="text-base text-gray-500 font-light">
                  Tell me what you're looking for
                </p>
              </div>

              {/* Placeholder Prompts */}
              <div className="space-y-2">
                {PLACEHOLDER_PROMPTS.map((prompt, index) => (
                  <button
                    key={index}
                    onClick={() => handlePromptClick(prompt)}
                    className="block text-left text-gray-400 hover:text-gray-600 transition-colors text-sm font-light"
                  >
                    → {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            // Messages
            <div className="space-y-6">
              {conversationHistory.map((message, index) => (
                <div
                  key={index}
                  className={`${
                    message.role === 'user'
                      ? 'text-right'
                      : 'text-left'
                  }`}
                >
                  <div
                    className={`inline-block max-w-[85%] ${
                      message.role === 'user'
                        ? 'bg-gray-900 text-white px-4 py-3 rounded-lg'
                        : 'text-gray-700'
                    }`}
                  >
                    {message.role === 'assistant' && (
                      <div className="flex items-center gap-2 mb-2 text-gray-400 text-xs font-light tracking-wide uppercase">
                        <Sparkles className="h-3 w-3" />
                        <span>Concierge</span>
                      </div>
                    )}
                    <p className="text-sm leading-relaxed font-light whitespace-pre-wrap">
                      {message.content}
                    </p>
                  </div>
                </div>
              ))}

              {/* Streaming indicator */}
              {isStreaming && (
                <div className="text-left">
                  <div className="inline-block max-w-[85%] text-gray-700">
                    <div className="flex items-center gap-2 mb-2 text-gray-400 text-xs font-light tracking-wide uppercase">
                      <Sparkles className="h-3 w-3" />
                      <span>Concierge</span>
                    </div>
                    <p className="text-sm leading-relaxed font-light">
                      {narrative}
                      <span className="inline-block w-1 h-4 ml-1 bg-gray-400 animate-pulse" />
                    </p>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area - Fixed at Bottom */}
        <div className="border-t border-gray-200 px-8 py-6 bg-white">
          <form onSubmit={handleSubmit} className="flex items-end gap-3">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Ask about destinations, cities, or experiences..."
              rows={1}
              disabled={isLoading}
              className="flex-1 resize-none bg-transparent border-none outline-none text-gray-900 placeholder-gray-400 text-sm font-light leading-relaxed disabled:opacity-50"
              style={{ maxHeight: '120px' }}
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-gray-900 text-white hover:bg-gray-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-gray-900"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>

      {/* RIGHT PANEL - Live Destination Grid (60%) */}
      <div className="w-[60%] flex flex-col">
        <div className="flex-1 overflow-y-auto px-12 py-12">
          {destinations.length === 0 ? (
            // Empty State
            <div className="h-full flex items-center justify-center">
              <p className="text-gray-400 text-sm font-light">
                Destinations will appear here as we refine your search
              </p>
            </div>
          ) : (
            // Destination Grid
            <div className="grid grid-cols-2 gap-8">
              {destinations.map((rankedDest) => (
                <ContextualDestinationCard
                  key={rankedDest.destination.slug}
                  destination={rankedDest}
                  onClick={() => handleDestinationClick(rankedDest)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ConversationalDiscovery;
