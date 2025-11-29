'use client';

import { useState, useCallback } from 'react';
import { Sparkles, Loader2, Send } from 'lucide-react';

interface NaturalLanguageInputProps {
  city?: string | null;
  tripDays?: number;
  onResult?: (result: {
    action: 'add_place' | 'modify' | 'suggest';
    dayNumber?: number;
    category?: string;
    neighborhood?: string;
    destination?: {
      id: number;
      slug: string;
      name: string;
      category: string;
    };
    time?: string;
    message?: string;
  }) => void;
  className?: string;
}

/**
 * NaturalLanguageInput - AI-powered trip planning via natural language
 * Examples:
 * - "Add a nice dinner spot near the Eiffel Tower for day 2"
 * - "Find a quiet cafe for breakfast on day 1"
 * - "Suggest a museum near my hotel"
 */
export default function NaturalLanguageInput({
  city,
  tripDays = 1,
  onResult,
  className = '',
}: NaturalLanguageInputProps) {
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const processInput = useCallback(async () => {
    if (!input.trim() || !city) return;

    setIsProcessing(true);
    setLastResult(null);

    try {
      const response = await fetch('/api/intelligence/natural-language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: input,
          city,
          tripDays,
        }),
      });

      if (response.ok) {
        const result = await response.json();

        if (result.destination) {
          setLastResult(`Found: ${result.destination.name}`);
          onResult?.(result);
        } else if (result.message) {
          setLastResult(result.message);
        } else {
          setLastResult('No results found. Try being more specific.');
        }
      } else {
        setLastResult('Failed to process request. Try again.');
      }
    } catch (error) {
      console.error('Natural language processing error:', error);
      setLastResult('Something went wrong. Please try again.');
    } finally {
      setIsProcessing(false);
      setInput('');
    }
  }, [input, city, tripDays, onResult]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      processInput();
    }
  };

  const suggestions = [
    'Add a rooftop bar for day 2',
    'Find breakfast near my hotel',
    'Suggest a quiet museum',
    'Add dinner with a view',
  ];

  return (
    <div className={`border border-stone-200 dark:border-gray-800 rounded-2xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-stone-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-stone-400" />
          <h3 className="text-sm font-medium text-stone-900 dark:text-white">
            Ask AI
          </h3>
        </div>
      </div>

      {/* Input */}
      <div className="p-4">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={city ? `"Add a nice dinner spot in ${city}..."` : 'Set a destination first'}
            disabled={!city || isProcessing}
            className="w-full px-4 py-3 pr-12 text-sm text-stone-700 dark:text-gray-300 bg-stone-50 dark:bg-gray-900 border border-stone-200 dark:border-gray-800 rounded-xl placeholder:text-stone-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-gray-700 disabled:opacity-50"
          />
          <button
            onClick={processInput}
            disabled={!input.trim() || !city || isProcessing}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-stone-400 hover:text-stone-600 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Result message */}
        {lastResult && (
          <p className="mt-2 text-xs text-stone-500 dark:text-gray-400">
            {lastResult}
          </p>
        )}

        {/* Quick suggestions */}
        {!input && city && (
          <div className="mt-3 flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => setInput(suggestion)}
                className="px-2.5 py-1 text-[11px] text-stone-500 dark:text-gray-400 bg-stone-100 dark:bg-gray-800 rounded-full hover:bg-stone-200 dark:hover:bg-gray-700 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
