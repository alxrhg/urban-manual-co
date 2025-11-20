'use client';

import { FormEvent, useState } from 'react';
import { Loader2, MessageSquare, Send, Sparkles, TriangleAlert } from 'lucide-react';
import { useUnscheduledContext } from '@/contexts/UnscheduledContext';

interface PlannerChatProps {
  tripContext: {
    location?: string;
    date?: string;
  };
  className?: string;
}

export function PlannerChat({ tripContext, className }: PlannerChatProps) {
  const { appendItems, setItems, setIsSearching, setLastQuery, isSearching } = useUnscheduledContext();
  const [input, setInput] = useState('');
  const [appendMode, setAppendMode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!input.trim()) return;

    const query = input.trim();
    setLastQuery(query);
    setIsSearching(true);
    setError(null);

    try {
      const response = await fetch('/api/search/intelligent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          tripContext: {
            location: tripContext.location || null,
            date: tripContext.date || null,
          },
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || 'Search failed');
      }

      const candidates = (payload?.results || []).map((item: any) => ({
        id: item.slug || item.id?.toString() || item.name,
        name: item.name || item.title || 'Unnamed place',
        city: item.city || item.location || tripContext.location || null,
        category: item.category || item.primary_category || null,
        image: item.image || item.image_thumbnail || null,
        slug: item.slug || null,
        description: item.micro_description || item.description || null,
      }));

      if (appendMode) {
        appendItems(candidates);
      } else {
        setItems(candidates);
      }
    } catch (err: any) {
      console.error('PlannerChat search error', err);
      setError(err?.message || 'Unable to run search');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-3xl px-4 ${className || ''}`}
      aria-live="polite"
    >
      <form
        onSubmit={handleSubmit}
        className="bg-white/80 dark:bg-gray-900/90 backdrop-blur-md shadow-2xl border border-gray-200/80 dark:border-gray-800/70 rounded-2xl p-4 flex flex-col gap-3"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-800 dark:text-gray-100">
            <MessageSquare className="h-4 w-4" />
            PlannerChat
            {tripContext.location && (
              <span className="text-gray-500 dark:text-gray-400">· {tripContext.location}</span>
            )}
          </div>
          <label className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 select-none">
            <input
              type="checkbox"
              checked={appendMode}
              onChange={(event) => setAppendMode(event.target.checked)}
              className="rounded border-gray-300 text-gray-900 shadow-sm focus:ring-gray-900"
            />
            Append results to dock
          </label>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Describe what you need... e.g. Find lunch near Mori Art Museum"
              className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-4 py-3 pr-28 shadow-inner focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 text-sm"
              disabled={isSearching}
            />
            <div className="absolute inset-y-0 right-2 flex items-center gap-2">
              <span className="text-xs text-gray-400 dark:text-gray-500 px-2 rounded-full border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
                {tripContext.date ? tripContext.date : 'Flexible dates'}
              </span>
            </div>
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-gray-900 to-gray-700 text-white text-sm font-semibold shadow-lg hover:from-gray-800 hover:to-gray-600 transition disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSearching ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Send
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900 px-3 py-2 rounded-lg">
            <TriangleAlert className="h-4 w-4" />
            {error}
          </div>
        )}

        <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
          <Send className="h-3 w-3" />
          Natural language queries will search /api/search/intelligent with your current trip context.
        </div>
      </form>
    </div>
  );
}
