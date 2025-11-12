'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, Sparkles, X, Loader2 } from 'lucide-react';
import { Destination } from '@/types/destination';

interface SearchResult {
  destination: Destination;
  relevance: string;
}

interface MorphicSearchProps {
  onClose: () => void;
}

export default function MorphicSearch({ onClose }: MorphicSearchProps) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [streamingResponse, setStreamingResponse] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const responseRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-focus input when component mounts
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom as response streams
    if (responseRef.current) {
      responseRef.current.scrollTop = responseRef.current.scrollHeight;
    }
  }, [streamingResponse]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isSearching) return;

    setIsSearching(true);
    setStreamingResponse('');
    setResults([]);
    setError(null);

    try {
      const response = await fetch('/api/morphic-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() }),
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'token') {
                setStreamingResponse((prev) => prev + data.content);
              } else if (data.type === 'results') {
                setResults(data.destinations);
              } else if (data.type === 'done') {
                break;
              }
            } catch (e) {
              console.error('Error parsing SSE:', e);
            }
          }
        }
      }
    } catch (err) {
      setError('Failed to perform search. Please try again.');
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-16">
      <div
        className="w-full max-w-4xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden"
        style={{ height: 'calc(100vh / 3)' }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <Sparkles className="h-5 w-5 text-purple-500" />
          <h2 className="text-lg font-semibold">AI Search</h2>
          <button
            onClick={onClose}
            className="ml-auto p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Close search"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearch} className="px-6 py-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything about destinations..."
              className="w-full pl-12 pr-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
              disabled={isSearching}
            />
            {isSearching && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
              </div>
            )}
          </div>
        </form>

        {/* Response & Results */}
        <div
          ref={responseRef}
          className="px-6 pb-4 overflow-y-auto"
          style={{ maxHeight: 'calc(100vh / 3 - 160px)' }}
        >
          {/* Error State */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <span className="text-red-600 dark:text-red-400 text-sm">{error}</span>
            </div>
          )}

          {/* Streaming AI Response */}
          {streamingResponse && (
            <div className="mb-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <span className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {streamingResponse}
              </span>
            </div>
          )}

          {/* Results */}
          {results.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase">
                Recommended Destinations
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {results.slice(0, 4).map(({ destination, relevance }) => (
                  <a
                    key={destination.slug}
                    href={`/destination/${destination.slug}`}
                    className="block p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:shadow-md transition-all"
                  >
                    <h4 className="font-medium text-sm mb-1">{destination.name}</h4>
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {destination.city} • {destination.category}
                    </span>
                    {relevance && (
                      <span className="text-xs text-purple-600 dark:text-purple-400 mt-2 line-clamp-2">
                        {relevance}
                      </span>
                    )}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!streamingResponse && !isSearching && !error && (
            <div className="text-center text-gray-400 dark:text-gray-600 text-sm py-8">
              <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <span>Ask me to find destinations, recommend places, or answer questions...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
