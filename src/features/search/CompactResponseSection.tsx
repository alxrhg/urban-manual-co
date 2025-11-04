'use client';

import { useState, useRef, useEffect } from 'react';

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
  className?: string;
}

export function CompactResponseSection({
  query,
  messages,
  suggestions = [],
  onChipClick,
  onFollowUp,
  className = '',
}: CompactResponseSectionProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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
      const response = await onFollowUp(userMessage);
    } catch (error) {
      console.error('Follow-up error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`relative mb-8 ${className}`}>
      <h2 className="text-sm font-medium tracking-wider uppercase text-neutral-900 mb-6">
        {query}
      </h2>

      <div
        ref={scrollRef}
        className="max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-300 scrollbar-track-transparent"
      >
        <div className="space-y-4 pr-2">
          {messages.map((message, i) => (
            <div key={i}>
              {message.role === 'assistant' ? (
                <p className="text-sm leading-relaxed text-neutral-700">
                  {message.content}
                </p>
              ) : (
                <p className="text-sm leading-relaxed text-neutral-500 italic">
                  → {message.content}
                </p>
              )}
            </div>
          ))}

          {isLoading && (
            <p className="text-sm text-neutral-400">with our in-house travel intelligence…</p>
          )}
        </div>

        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4 pb-2">
            {suggestions.map((suggestion, i) => (
              <button
                key={i}
                onClick={() => onChipClick(suggestion.refinement)}
                className="px-3 py-1 text-xs border border-neutral-300 rounded-full hover:border-neutral-900 hover:bg-neutral-900 hover:text-white transition-colors duration-200"
              >
                {suggestion.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {onFollowUp && (
        <form onSubmit={handleSubmit} className="mt-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a follow-up..."
            disabled={isLoading}
            className="w-full px-0 py-2 text-sm border-b border-neutral-200 focus:border-neutral-900 focus:outline-none placeholder:text-neutral-400 bg-transparent disabled:opacity-50"
          />
        </form>
      )}
    </div>
  );
}


