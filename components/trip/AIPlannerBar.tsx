'use client';

import { useState, useCallback } from 'react';
import { Sparkles, Loader2, ChevronDown, ChevronUp, Calendar, Music, X } from 'lucide-react';

interface AIPlannerBarProps {
  city?: string | null;
  tripDays?: number;
  startDate?: string | null;
  endDate?: string | null;
  onAddPlace?: (destination: unknown, dayNumber: number, time?: string) => Promise<void>;
  selectedDayNumber: number;
  className?: string;
}

interface LocalEvent {
  id: string;
  title: string;
  date: string;
  category: string;
  venue?: string;
}

/**
 * AIPlannerBar - Compact integrated AI planner with events
 * Collapsible bar that combines NL input + local events in one place
 */
export default function AIPlannerBar({
  city,
  tripDays = 1,
  startDate,
  endDate,
  onAddPlace,
  selectedDayNumber,
  className = '',
}: AIPlannerBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [events, setEvents] = useState<LocalEvent[]>([]);
  const [eventsLoaded, setEventsLoaded] = useState(false);

  // Fetch events when expanded
  const handleExpand = useCallback(async () => {
    setIsExpanded(true);
    if (!eventsLoaded && city && startDate) {
      try {
        const params = new URLSearchParams({ city, startDate });
        if (endDate) params.append('endDate', endDate);
        const response = await fetch(`/api/intelligence/local-events?${params}`);
        if (response.ok) {
          const data = await response.json();
          setEvents(data.events?.slice(0, 3) || []);
        }
      } catch {
        // Silent fail for events
      }
      setEventsLoaded(true);
    }
  }, [city, startDate, endDate, eventsLoaded]);

  const processInput = useCallback(async () => {
    if (!input.trim() || !city) return;

    setIsProcessing(true);
    try {
      const response = await fetch('/api/intelligence/natural-language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: input, city, tripDays }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.destination && onAddPlace) {
          await onAddPlace(result.destination, result.dayNumber || selectedDayNumber, result.time);
        }
      }
    } catch (error) {
      console.error('AI planning error:', error);
    } finally {
      setIsProcessing(false);
      setInput('');
    }
  }, [input, city, tripDays, selectedDayNumber, onAddPlace]);

  const quickActions = [
    { label: 'Breakfast spot', query: 'Add a breakfast cafe' },
    { label: 'Dinner', query: 'Add a nice restaurant for dinner' },
    { label: 'Museum', query: 'Add a museum to visit' },
    { label: 'Bar', query: 'Add a bar for evening' },
  ];

  if (!city) return null;

  return (
    <div className={`border border-stone-200 dark:border-gray-800 rounded-xl overflow-hidden ${className}`}>
      {/* Collapsed State - Just a button */}
      {!isExpanded ? (
        <button
          onClick={handleExpand}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-stone-50 dark:hover:bg-gray-800/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-stone-400" />
            <span className="text-sm text-stone-500 dark:text-gray-400">
              Ask AI to add places...
            </span>
          </div>
          <ChevronDown className="w-4 h-4 text-stone-400" />
        </button>
      ) : (
        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-stone-500" />
              <span className="text-xs font-medium text-stone-500 dark:text-gray-400">AI Planner</span>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1 text-stone-400 hover:text-stone-600 dark:hover:text-gray-300"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>

          {/* Input */}
          <div className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && processInput()}
              placeholder={`"Add a rooftop bar for day ${selectedDayNumber}"`}
              className="w-full px-3 py-2 pr-10 text-sm bg-stone-50 dark:bg-gray-900 border border-stone-200 dark:border-gray-700 rounded-lg placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-300 dark:focus:ring-gray-600"
            />
            <button
              onClick={processInput}
              disabled={!input.trim() || isProcessing}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600 disabled:opacity-50"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-1.5">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => setInput(action.query)}
                className="px-2 py-1 text-[11px] text-stone-500 dark:text-gray-400 bg-stone-100 dark:bg-gray-800 rounded-full hover:bg-stone-200 dark:hover:bg-gray-700 transition-colors"
              >
                {action.label}
              </button>
            ))}
          </div>

          {/* Local Events (if any) */}
          {events.length > 0 && (
            <div className="pt-3 border-t border-stone-100 dark:border-gray-800">
              <div className="flex items-center gap-1.5 mb-2">
                <Calendar className="w-3 h-3 text-stone-400" />
                <span className="text-[10px] font-medium text-stone-400 uppercase tracking-wide">
                  Happening during your trip
                </span>
              </div>
              <div className="space-y-1.5">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-stone-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                    onClick={() => setInput(`Add ${event.title} on ${new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`)}
                  >
                    <Music className="w-3 h-3 text-stone-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-stone-700 dark:text-gray-300 truncate">{event.title}</p>
                      <p className="text-[10px] text-stone-400">{event.venue}</p>
                    </div>
                    <span className="text-[10px] text-stone-400 flex-shrink-0">
                      {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
