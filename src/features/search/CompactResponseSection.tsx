'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';

export interface Message {
  role: 'assistant' | 'user';
  content: string;
}

export interface ConciergeState {
  // Context note (above results) - only when relevant
  contextNote?: string | null;

  // Clarification needed (ambiguous query)
  needsClarification?: boolean;
  clarificationQuestion?: string | null;
  clarificationOptions?: string[];

  // Soft suggestions (after results) - concierge style
  softSuggestions?: string[];

  // Warnings/notes (important caveats)
  warnings?: string[];

  // Personalization transparency
  personalizationNote?: string | null;
}

interface CompactResponseSectionProps {
  query: string;
  messages: Message[];
  suggestions?: Array<{ label: string; refinement: string }>;
  onChipClick: (refinement: string) => void;
  onFollowUp?: (message: string) => Promise<string>;
  className?: string;
  // Concierge enhancements
  concierge?: ConciergeState;
  onClarificationSelect?: (option: string) => void;
  onSoftSuggestionSelect?: (suggestion: string) => void;
  onWarningAction?: (warningIndex: number) => void;
}

export function CompactResponseSection({
  query,
  messages,
  suggestions = [],
  onChipClick,
  onFollowUp,
  className = '',
  concierge,
  onClarificationSelect,
  onSoftSuggestionSelect,
  onWarningAction,
}: CompactResponseSectionProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !onFollowUp || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    try {
      await onFollowUp(userMessage);
    } catch (error) {
      console.error('Follow-up error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClarificationClick = (option: string) => {
    if (onClarificationSelect) {
      onClarificationSelect(option);
    } else {
      onChipClick(option);
    }
  };

  const handleSoftSuggestionClick = (suggestion: string) => {
    if (onSoftSuggestionSelect) {
      onSoftSuggestionSelect(suggestion);
    } else {
      onChipClick(suggestion);
    }
  };

  return (
    <div className={`relative mb-8 ${className}`}>
      {/* Concierge Context Note (above query) */}
      {concierge?.contextNote && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {concierge.contextNote}
        </p>
      )}

      {/* Query (uppercase) */}
      {query && (
        <h2 className="text-xs font-medium tracking-widest uppercase text-gray-500 mb-4">
          {query.toUpperCase()}
        </h2>
      )}

      {/* Scrollable conversation area (200px max) */}
      <div
        ref={scrollRef}
        className="max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-300 scrollbar-track-transparent mb-4"
      >
        <div className="space-y-3 pr-2">
          {/* Personalization transparency note */}
          {concierge?.personalizationNote && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {concierge.personalizationNote}
            </p>
          )}

          {/* Contextual response messages */}
          {messages.length === 0 ? (
            <p className="text-sm leading-relaxed text-gray-400">
              Start a conversation to refine your search...
            </p>
          ) : (
            messages.map((message, i) => (
              <div key={i} className="flex flex-col gap-1">
                {message.role === 'assistant' ? (
                  <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                    {message.content}
                  </p>
                ) : (
                  <p className="text-sm leading-relaxed text-gray-500 italic">
                    → {message.content}
                  </p>
                )}
              </div>
            ))
          )}

          {/* Loading indicator */}
          {isLoading && (
            <p className="text-sm text-gray-400 italic">
              with our in-house travel intelligence…
            </p>
          )}
        </div>
      </div>

      {/* Concierge Clarification (when query is ambiguous) */}
      {concierge?.needsClarification && concierge?.clarificationQuestion && (
        <div className="mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
            {concierge.clarificationQuestion}
          </p>
          <div className="flex flex-wrap gap-x-1 gap-y-1">
            {concierge.clarificationOptions?.map((opt, i) => (
              <span key={opt}>
                {i > 0 && <span className="text-gray-300 dark:text-gray-600 mx-1">·</span>}
                <button
                  onClick={() => handleClarificationClick(opt)}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 px-1.5 py-0.5 rounded transition-colors"
                >
                  {opt}
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Concierge Warnings/Notes */}
      {concierge?.warnings && concierge.warnings.length > 0 && (
        <div className="mb-4">
          {concierge.warnings.map((warning, i) => (
            <div
              key={i}
              className="text-[13px] text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 px-4 py-3 rounded-lg mb-2"
            >
              <span>{warning}</span>
              {onWarningAction && (
                <button
                  onClick={() => onWarningAction(i)}
                  className="ml-2 text-gray-700 dark:text-gray-200 underline underline-offset-2 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  Filter results
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Clickable refinement chips */}
      {suggestions.length > 0 && (
        <div
          className="flex gap-2 mb-4 overflow-x-auto flex-nowrap sm:flex-wrap sm:overflow-visible scrollbar-thin scrollbar-thumb-neutral-200 scrollbar-track-transparent -mx-1 px-1"
        >
          {suggestions.map((suggestion, i) => (
            <Button
              key={i}
              type="button"
              variant="pill"
              size="xs"
              onClick={() => onChipClick(suggestion.refinement)}
              className="shrink-0 border-gray-300 text-gray-600 hover:text-gray-900 dark:border-gray-700 dark:text-gray-200"
            >
              {suggestion.label}
            </Button>
          ))}
        </div>
      )}

      {/* Concierge Soft Suggestions (after results) */}
      {concierge?.softSuggestions && concierge.softSuggestions.length > 0 && suggestions.length === 0 && (
        <p className="text-[13px] text-gray-400 dark:text-gray-500 mt-5">
          <span>Narrow it down? </span>
          {concierge.softSuggestions.map((suggestion, i) => (
            <span key={suggestion}>
              {i > 0 && <span className="text-gray-300 dark:text-gray-600 mx-1">·</span>}
              <button
                onClick={() => handleSoftSuggestionClick(suggestion)}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 px-1 py-0.5 rounded transition-colors"
              >
                {suggestion}
              </button>
            </span>
          ))}
        </p>
      )}

      {/* Optional follow-up input */}
      {onFollowUp && (
        <form onSubmit={handleSubmit} className="mt-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a follow-up..."
            disabled={isLoading}
            className="w-full px-0 py-2 text-sm border-b border-gray-200 dark:border-gray-700 focus:border-gray-900 dark:focus:border-gray-100 focus:outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500 bg-transparent text-gray-900 dark:text-gray-100 disabled:opacity-50 transition-colors duration-200"
          />
        </form>
      )}
    </div>
  );
}
