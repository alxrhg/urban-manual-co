'use client';

import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';

export interface Message {
  role: 'assistant' | 'user';
  content: string;
}

interface CompactResponseSectionProps {
  query: string;
  messages: Message[];
  suggestions?: Array<{ label: string; refinement: string }>;
  onChipClick: (refinement: string) => void;
  onFollowUp?: (message: string) => Promise<string>;
  onQueryChange?: (query: string) => void;
  resultCount?: number;
  activeFilters?: Array<{ label: string; value: string }>;
  onRemoveFilter?: (value: string) => void;
  className?: string;
}

export function CompactResponseSection({
  query,
  messages,
  suggestions = [],
  onChipClick,
  onFollowUp,
  onQueryChange,
  resultCount,
  activeFilters = [],
  onRemoveFilter,
  className = '',
}: CompactResponseSectionProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [editableQuery, setEditableQuery] = useState(query);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Sync editable query with prop
  useEffect(() => {
    setEditableQuery(query);
  }, [query]);

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

  const handleQuerySubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onQueryChange && editableQuery !== query) {
      onQueryChange(editableQuery);
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Results header - clean, not conversational */}
      <div className="pb-4 border-b border-gray-100 dark:border-gray-800 mb-4">
        <div className="flex items-baseline justify-between gap-4">
          {/* Editable query */}
          <input
            type="text"
            value={editableQuery}
            onChange={(e) => setEditableQuery(e.target.value)}
            onKeyDown={handleQuerySubmit}
            className="flex-1 text-lg font-medium text-gray-900 dark:text-white bg-transparent border-none p-0 focus:outline-none"
          />
          {/* Result count */}
          {resultCount !== undefined && (
            <span className="text-sm text-gray-400 dark:text-gray-500 flex-shrink-0">
              {resultCount} {resultCount === 1 ? 'result' : 'results'}
            </span>
          )}
        </div>

        {/* Active filters as removable chips */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {activeFilters.map((filter, i) => (
              <button
                key={i}
                onClick={() => onRemoveFilter?.(filter.value)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                {filter.label}
                <X className="h-3 w-3 text-gray-400 hover:text-gray-600" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Inline refinement suggestions - text links, not buttons */}
      {suggestions.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 mb-4">
          {suggestions.map((suggestion, i) => (
            <span key={i} className="flex items-center">
              {i > 0 && <span className="text-gray-300 dark:text-gray-600 mx-1">·</span>}
              <button
                onClick={() => onChipClick(suggestion.refinement)}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 px-2 py-1 rounded transition-all"
              >
                {suggestion.label}
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Messages area - only show if there are messages */}
      {messages.length > 0 && (
        <div
          ref={scrollRef}
          className="max-h-[150px] overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-300 scrollbar-track-transparent mb-4"
        >
          <div className="space-y-2 pr-2">
            {messages.map((message, i) => (
              <div key={i}>
                {message.role === 'assistant' ? (
                  <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                    {message.content}
                  </p>
                ) : (
                  <p className="text-sm leading-relaxed text-gray-400 dark:text-gray-500">
                    {message.content}
                  </p>
                )}
              </div>
            ))}

            {/* Loading skeleton instead of text */}
            {isLoading && (
              <div className="space-y-2 animate-pulse">
                <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-3/4" />
                <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Follow-up input - only show if handler provided */}
      {onFollowUp && (
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Refine your search..."
            disabled={isLoading}
            className="w-full px-0 py-2 text-sm border-b border-gray-200 dark:border-gray-700 focus:border-gray-400 dark:focus:border-gray-500 focus:outline-none placeholder:text-gray-300 dark:placeholder:text-gray-600 bg-transparent text-gray-900 dark:text-gray-100 disabled:opacity-50 transition-colors duration-200"
          />
        </form>
      )}
    </div>
  );
}
