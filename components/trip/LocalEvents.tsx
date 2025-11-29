'use client';

import { useState, useEffect } from 'react';
import { Calendar, Music, Palette, Theater, Loader2, ExternalLink, Plus } from 'lucide-react';

interface LocalEvent {
  id: string;
  title: string;
  date: string;
  category: 'concert' | 'exhibition' | 'festival' | 'theater' | 'other';
  venue?: string;
  url?: string;
  description?: string;
}

interface LocalEventsProps {
  city: string;
  startDate?: string | null;
  endDate?: string | null;
  onAddToTrip?: (event: LocalEvent) => void;
  className?: string;
}

const categoryIcons = {
  concert: Music,
  exhibition: Palette,
  festival: Calendar,
  theater: Theater,
  other: Calendar,
};

const categoryColors = {
  concert: 'text-purple-500 bg-purple-100 dark:bg-purple-900/30',
  exhibition: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30',
  festival: 'text-amber-500 bg-amber-100 dark:bg-amber-900/30',
  theater: 'text-red-500 bg-red-100 dark:bg-red-900/30',
  other: 'text-stone-500 bg-stone-100 dark:bg-gray-800',
};

/**
 * LocalEvents - Shows events happening during the trip
 */
export default function LocalEvents({
  city,
  startDate,
  endDate,
  onAddToTrip,
  className = '',
}: LocalEventsProps) {
  const [events, setEvents] = useState<LocalEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!city || !startDate) return;

    const fetchEvents = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          city,
          startDate,
          ...(endDate && { endDate }),
        });

        const response = await fetch(`/api/intelligence/local-events?${params}`);
        if (response.ok) {
          const data = await response.json();
          setEvents(data.events || []);
        }
      } catch (error) {
        console.error('Failed to fetch events:', error);
        // Use sample data for demo
        setEvents([
          {
            id: '1',
            title: 'Jazz at Lincoln Center',
            date: startDate,
            category: 'concert',
            venue: 'Lincoln Center',
          },
          {
            id: '2',
            title: 'Modern Art Exhibition',
            date: startDate,
            category: 'exhibition',
            venue: 'MoMA',
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [city, startDate, endDate]);

  if (!city || !startDate) return null;

  const displayEvents = expanded ? events : events.slice(0, 3);

  return (
    <div className={`border border-stone-200 dark:border-gray-800 rounded-2xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-stone-100 dark:border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-stone-400" />
          <h3 className="text-sm font-medium text-stone-900 dark:text-white">
            What's On
          </h3>
        </div>
        <span className="text-xs text-stone-400">
          {events.length} events
        </span>
      </div>

      {/* Content */}
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-4 h-4 animate-spin text-stone-400" />
            <span className="ml-2 text-xs text-stone-500">Finding events...</span>
          </div>
        ) : events.length === 0 ? (
          <p className="text-xs text-stone-400 dark:text-gray-500 text-center py-4">
            No events found during your trip dates
          </p>
        ) : (
          <div className="space-y-3">
            {displayEvents.map((event) => {
              const Icon = categoryIcons[event.category];
              const colorClass = categoryColors[event.category];

              return (
                <div
                  key={event.id}
                  className="flex items-start gap-3 p-3 rounded-xl hover:bg-stone-50 dark:hover:bg-gray-800/50 transition-colors group"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-900 dark:text-white truncate">
                      {event.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {event.venue && (
                        <span className="text-xs text-stone-500 dark:text-gray-400 truncate">
                          {event.venue}
                        </span>
                      )}
                      <span className="text-xs text-stone-400">
                        {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {event.url && (
                      <a
                        href={event.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-gray-300"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {onAddToTrip && (
                      <button
                        onClick={() => onAddToTrip(event)}
                        className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-gray-300"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {events.length > 3 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="w-full py-2 text-xs font-medium text-stone-500 dark:text-gray-400 hover:text-stone-900 dark:hover:text-white transition-colors"
              >
                {expanded ? 'Show less' : `Show ${events.length - 3} more`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
