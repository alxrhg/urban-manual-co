'use client';

import { useState } from 'react';
import { MessageSquare, X, Trash2, ChevronDown, MapPin, Tag, Clock, DollarSign, Sparkles } from 'lucide-react';

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  destinations?: any[];
}

interface ConversationContext {
  city?: string;
  category?: string;
  meal?: string;
  cuisine?: string;
  mood?: string;
  price_level?: string;
}

interface ConversationPanelProps {
  conversationHistory: ConversationMessage[];
  context?: ConversationContext;
  sessionId?: string | null;
  onClearConversation: () => void;
  onSuggestionClick?: (suggestion: string) => void;
  isVisible?: boolean;
}

export function ConversationPanel({
  conversationHistory,
  context = {},
  sessionId,
  onClearConversation,
  onSuggestionClick,
  isVisible = true
}: ConversationPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const messageCount = conversationHistory.length;
  const hasContext = Object.keys(context).some(key => context[key as keyof ConversationContext]);
  const hasConversation = messageCount > 0 || hasContext;

  if (!isVisible || !hasConversation) return null;

  // Generate smart suggestions based on context
  const generateSuggestions = (): string[] => {
    const suggestions: string[] = [];

    if (context.city && !context.category) {
      suggestions.push(`Show me restaurants in ${context.city}`);
      suggestions.push(`Find hotels in ${context.city}`);
      suggestions.push(`Best cafes in ${context.city}`);
    } else if (context.city && context.category) {
      suggestions.push(`Show me more ${context.category}s`);
      suggestions.push(`Different ${context.category}s in ${context.city}`);
      if (context.category === 'restaurant') {
        suggestions.push(`Top rated ${context.category}s`);
      }
    }

    if (context.mood && messageCount > 2) {
      suggestions.push(`More ${context.mood} places`);
    }

    if (!context.city && messageCount > 0) {
      suggestions.push('Search in a different city');
    }

    return suggestions.slice(0, 3);
  };

  const suggestions = generateSuggestions();

  return (
    <div className="fixed bottom-6 right-6 z-40 max-w-sm">
      {/* Collapsed State - Conversation Indicator */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-full shadow-lg hover:shadow-xl transition-all"
        >
          <MessageSquare className="h-4 w-4" />
          <span className="text-sm font-medium">
            Conversation {messageCount > 0 && `(${messageCount})`}
          </span>
          {hasContext && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            </div>
          )}
        </button>
      )}

      {/* Expanded State - Full Panel */}
      {isExpanded && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden w-96 max-h-[600px] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <h3 className="text-sm font-semibold">Conversation</h3>
              {messageCount > 0 && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {messageCount} {messageCount === 1 ? 'message' : 'messages'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={onClearConversation}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                title="Clear conversation"
              >
                <Trash2 className="h-4 w-4 text-gray-500" />
              </button>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Context Badges */}
          {hasContext && (
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                Current Context
              </div>
              <div className="flex flex-wrap gap-2">
                {context.city && (
                  <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs">
                    <MapPin className="h-3 w-3" />
                    <span className="capitalize">{context.city}</span>
                  </div>
                )}
                {context.category && (
                  <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs">
                    <Tag className="h-3 w-3" />
                    <span className="capitalize">{context.category}</span>
                  </div>
                )}
                {context.meal && (
                  <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full text-xs">
                    <Clock className="h-3 w-3" />
                    <span className="capitalize">{context.meal}</span>
                  </div>
                )}
                {context.cuisine && (
                  <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs">
                    <Sparkles className="h-3 w-3" />
                    <span className="capitalize">{context.cuisine}</span>
                  </div>
                )}
                {context.mood && (
                  <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 rounded-full text-xs">
                    <Sparkles className="h-3 w-3" />
                    <span className="capitalize">{context.mood}</span>
                  </div>
                )}
                {context.price_level && (
                  <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full text-xs">
                    <DollarSign className="h-3 w-3" />
                    <span>{'$'.repeat(parseInt(context.price_level))}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Conversation History */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px] max-h-[300px]">
            {messageCount === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 text-sm py-8">
                No messages yet. Start a conversation!
              </div>
            ) : (
              conversationHistory.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-xs ${
                      msg.role === 'user'
                        ? 'bg-black dark:bg-white text-white dark:text-black'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    <div className="font-medium text-[10px] opacity-70 mb-1">
                      {msg.role === 'user' ? 'You' : 'AI'}
                    </div>
                    <div className="leading-relaxed break-words">
                      {msg.content}
                    </div>
                    {msg.destinations && msg.destinations.length > 0 && (
                      <div className="text-[10px] opacity-70 mt-1">
                        {msg.destinations.length} results
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Smart Suggestions */}
          {suggestions.length > 0 && onSuggestionClick && (
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-800">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                Try asking
              </div>
              <div className="flex flex-col gap-1.5">
                {suggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      onSuggestionClick(suggestion);
                      setIsExpanded(false);
                    }}
                    className="text-left px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 rounded-lg text-xs transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Session Info */}
          {sessionId && (
            <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-800">
              <div className="text-[10px] text-gray-400 dark:text-gray-600 font-mono">
                Session: {sessionId.substring(0, 8)}...
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
