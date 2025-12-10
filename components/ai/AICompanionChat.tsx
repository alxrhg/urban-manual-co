'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Minimize2, Trash2, MapPin, ChevronRight, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useAI, type ChatMessage, type ProactiveSuggestion } from '@/contexts/AIContext';
import { Destination } from '@/types/destination';
import { capitalizeCity, capitalizeCategory } from '@/lib/utils';

/**
 * AICompanionChat - Full chat interface with messages, input, and suggestions
 */
export default function AICompanionChat() {
  const {
    messages,
    suggestions,
    isLoading,
    context,
    sendMessage,
    clearMessages,
    minimizeChat,
    closeChat,
    handleSuggestionAction,
  } = useAI();

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Get context label
  const getContextLabel = () => {
    if (context.type === 'trip' && context.trip) {
      return `Trip to ${context.trip.city}`;
    }
    if (context.type === 'destination' && context.destination) {
      return context.destination.name;
    }
    if (context.type === 'city' && context.city) {
      return `Exploring ${context.city}`;
    }
    return 'Urban Manual AI';
  };

  // Get starter prompts based on context
  const getStarterPrompts = () => {
    if (context.type === 'trip' && context.trip) {
      return [
        `How is my ${context.trip.city} trip looking?`,
        'Suggest restaurants for Day 1',
        'Optimize my itinerary',
      ];
    }
    if (context.type === 'city' && context.city) {
      return [
        `Best restaurants in ${context.city}`,
        `Hidden gems in ${context.city}`,
        `Plan a day in ${context.city}`,
      ];
    }
    return [
      'Best restaurants in Tokyo',
      'Plan a weekend in Paris',
      'Michelin-starred restaurants',
    ];
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex flex-col items-center pointer-events-none">
      {/* Chat Messages */}
      {messages.length > 0 && (
        <div className="w-full max-w-2xl mb-4 px-4 pointer-events-auto">
          <div
            className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-gray-200/50 dark:border-white/10 max-h-[60vh] overflow-y-auto"
            style={{
              boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.1), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)',
            }}
          >
            {/* Header */}
            <div className="sticky top-0 flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-white/10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-t-3xl">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {getContextLabel()}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={clearMessages}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                  aria-label="Clear chat"
                >
                  <Trash2 className="w-4 h-4 text-gray-400" />
                </button>
                <button
                  onClick={minimizeChat}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                  aria-label="Minimize chat"
                >
                  <Minimize2 className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="p-4 space-y-4">
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  onSuggestionClick={handleSuggestionAction}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>
      )}

      {/* Input Bar */}
      <div className="w-full max-w-2xl px-4 pb-6 pointer-events-auto">
        <div
          className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-gray-200/50 dark:border-white/10 p-4"
          style={{
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.1), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)',
          }}
        >
          <form onSubmit={handleSubmit} className="flex items-end gap-3">
            <div className="flex-1">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about destinations, plan trips..."
                rows={1}
                className="w-full resize-none bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-base"
                style={{ maxHeight: '120px' }}
              />
            </div>
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl hover:bg-gray-800 dark:hover:bg-gray-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </form>

          {/* Starter prompts */}
          {messages.length === 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-white/10">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Try asking:</div>
              <div className="flex flex-wrap gap-2">
                {getStarterPrompts().map((prompt, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setInput(prompt);
                      inputRef.current?.focus();
                    }}
                    className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-white/20 transition-all"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Inline suggestions */}
          {suggestions.length > 0 && messages.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-white/10">
              <div className="flex flex-wrap gap-2">
                {suggestions.slice(0, 3).map((suggestion) => (
                  <button
                    key={suggestion.id}
                    onClick={() => handleSuggestionAction(suggestion)}
                    className="px-3 py-1.5 text-xs bg-purple-50 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 rounded-full hover:bg-purple-100 dark:hover:bg-purple-500/30 transition-all flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    {suggestion.title}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MESSAGE BUBBLE
// =============================================================================

interface MessageBubbleProps {
  message: ChatMessage;
  onSuggestionClick?: (suggestion: ProactiveSuggestion) => void;
}

function MessageBubble({ message, onSuggestionClick }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] ${isUser ? '' : 'w-full'}`}>
        {/* Message content */}
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? 'bg-black dark:bg-white text-white dark:text-black'
              : 'bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white'
          }`}
        >
          {message.isStreaming ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Thinking...</span>
            </div>
          ) : (
            <div className="text-sm whitespace-pre-wrap leading-relaxed">
              {message.content.split('\n').map((line, i) => {
                // Parse markdown-style bold
                const parts = line.split(/(\*\*.*?\*\*)/g);
                return (
                  <div key={i}>
                    {parts.map((part, j) => {
                      if (part.startsWith('**') && part.endsWith('**')) {
                        return <strong key={j}>{part.slice(2, -2)}</strong>;
                      }
                      return <span key={j}>{part}</span>;
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Destination cards */}
        {message.destinations && message.destinations.length > 0 && (
          <div className="mt-3 space-y-2">
            {message.destinations.slice(0, 6).map((dest) => (
              <DestinationCard key={dest.slug} destination={dest} />
            ))}
          </div>
        )}

        {/* Message suggestions */}
        {message.suggestions && message.suggestions.length > 0 && onSuggestionClick && (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.suggestions.slice(0, 3).map((suggestion) => (
              <button
                key={suggestion.id}
                onClick={() => onSuggestionClick(suggestion)}
                className="px-3 py-1.5 text-xs bg-purple-50 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 rounded-full hover:bg-purple-100 dark:hover:bg-purple-500/30 transition-all"
              >
                {suggestion.title}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// DESTINATION CARD
// =============================================================================

interface DestinationCardProps {
  destination: Destination;
}

function DestinationCard({ destination }: DestinationCardProps) {
  return (
    <a
      href={`/destination/${destination.slug}`}
      className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 transition-colors group"
    >
      <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0">
        {(destination.image_thumbnail || destination.image) ? (
          <Image
            src={destination.image_thumbnail || destination.image || ''}
            alt={destination.name}
            width={48}
            height={48}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <MapPin className="w-4 h-4 text-gray-400" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {destination.name}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
          {destination.category && capitalizeCategory(destination.category)}
          {destination.category && destination.city && ' · '}
          {destination.city && capitalizeCity(destination.city)}
        </p>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
    </a>
  );
}
