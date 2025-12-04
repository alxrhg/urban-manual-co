'use client';

import { useState, useCallback } from 'react';
import { Sparkles, Plus, Send, Loader2, RefreshCw, Clock, MapPin } from 'lucide-react';
import type { AISuggestion } from '@/hooks/useTravelAISuggestions';

// Re-export for convenience
export type { AISuggestion };

export interface TravelAISidebarProps {
  suggestions?: AISuggestion[];
  aiMessage?: string;
  onAddSuggestion?: (suggestion: AISuggestion) => void;
  onAskQuestion?: (question: string) => Promise<string>;
  onRefresh?: () => void;
  isLoading?: boolean;
  className?: string;
}

/**
 * TravelAISidebar - AI assistant panel for trip suggestions
 * Features: AI message, clickable suggestions, natural language input
 *
 * Usage with useTravelAISuggestions hook:
 * ```tsx
 * const { suggestions, aiMessage, isLoading, askQuestion, refetch } = useTravelAISuggestions({
 *   city: 'Paris',
 *   existingItems: dayItems,
 * });
 *
 * <TravelAISidebar
 *   suggestions={suggestions}
 *   aiMessage={aiMessage}
 *   isLoading={isLoading}
 *   onAskQuestion={askQuestion}
 *   onRefresh={refetch}
 *   onAddSuggestion={handleAddSuggestion}
 * />
 * ```
 */
export default function TravelAISidebar({
  suggestions = [],
  aiMessage: propAiMessage,
  onAddSuggestion,
  onAskQuestion,
  onRefresh,
  isLoading = false,
  className = '',
}: TravelAISidebarProps) {
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [localAiMessage, setLocalAiMessage] = useState('');

  // Use prop message if provided, otherwise use local state
  const aiMessage = propAiMessage || localAiMessage || 'Ready to help plan your trip! Ask me anything or check out the suggestions below.';

  const handleSubmit = useCallback(async () => {
    if (!input.trim() || !onAskQuestion) return;

    setIsProcessing(true);
    try {
      const response = await onAskQuestion(input);
      setLocalAiMessage(response);
      setInput('');
    } catch (error) {
      console.error('AI question error:', error);
      setLocalAiMessage('Sorry, I had trouble processing that. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [input, onAskQuestion]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Get icon for suggestion based on category
  const getSuggestionIcon = (suggestion: AISuggestion) => {
    if (suggestion.gapContext) {
      return Clock;
    }
    return Plus;
  };

  // Show placeholder if loading
  if (isLoading && suggestions.length === 0) {
    return (
      <div className={`rounded-2xl bg-white dark:bg-gray-900/80 border border-gray-200 dark:border-gray-800 overflow-hidden ${className}`}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="font-medium text-gray-900 dark:text-white text-sm">Travel AI</span>
          </div>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2" />
            </div>
          </div>
          {[1, 2, 3].map(i => (
            <div key={i} className="h-14 bg-gray-100 dark:bg-gray-800/50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl bg-white dark:bg-gray-900/80 border border-gray-200 dark:border-gray-800 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <span className="font-medium text-gray-900 dark:text-white text-sm">Travel AI</span>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors disabled:opacity-50"
            aria-label="Refresh suggestions"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>

      {/* AI Message */}
      <div className="p-4">
        <div className="flex gap-3">
          <div className="w-6 h-6 rounded-full bg-gray-900 dark:bg-white flex items-center justify-center flex-shrink-0">
            <span className="text-[10px] font-bold text-white dark:text-gray-900">AI</span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            {aiMessage}
          </p>
        </div>
      </div>

      {/* Suggestions */}
      <div className="px-4 pb-4 space-y-2">
        {suggestions.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">
            No suggestions available. Try asking a question!
          </p>
        ) : (
          suggestions.map((suggestion) => {
            const IconComponent = getSuggestionIcon(suggestion);
            const isGapSuggestion = !!suggestion.gapContext;

            return (
              <button
                key={suggestion.id}
                onClick={() => onAddSuggestion?.(suggestion)}
                disabled={isLoading}
                className={`
                  w-full flex items-center gap-3 p-3 rounded-xl
                  ${isGapSuggestion
                    ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50 hover:bg-amber-100 dark:hover:bg-amber-900/30'
                    : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }
                  border hover:border-gray-300 dark:hover:border-gray-600
                  transition-all text-left group disabled:opacity-50
                `}
              >
                <div className={`
                  w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors
                  ${isGapSuggestion
                    ? 'bg-amber-100 dark:bg-amber-800/30 group-hover:bg-amber-200 dark:group-hover:bg-amber-800/50'
                    : 'bg-gray-100 dark:bg-gray-700/50 group-hover:bg-gray-200 dark:group-hover:bg-gray-700'
                  }
                `}>
                  <IconComponent className={`
                    w-4 h-4 transition-colors
                    ${isGapSuggestion
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white'
                    }
                  `} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                    {suggestion.text}
                  </span>
                  {suggestion.label && (
                    <span className="block text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                      {suggestion.label}
                    </span>
                  )}
                  {suggestion.destination && (
                    <span className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                      <MapPin className="w-3 h-3" />
                      {suggestion.destination.name}
                      {suggestion.destination.rating && ` • ${suggestion.destination.rating}★`}
                    </span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Input Field */}
      <div className="p-4 pt-0">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask for recommendations..."
            disabled={isProcessing}
            className="w-full px-4 py-3 pr-12 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-gray-300 dark:focus:border-gray-600 disabled:opacity-50 transition-colors"
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || isProcessing}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-900 dark:text-white hover:opacity-70 disabled:text-gray-300 dark:disabled:text-gray-600 disabled:cursor-not-allowed transition-opacity"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
