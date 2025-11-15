'use client';

import { useEffect, useState } from 'react';
import { Calendar, MapPin, ExternalLink } from 'lucide-react';

interface Event {
  id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date?: string;
  venue?: string;
  url?: string;
  category?: string;
  distance_km?: number;
}

interface NearbyEventsProps {
  lat: number;
  lng: number;
  locationName?: string;
  radius?: number;
  limit?: number;
}

export function NearbyEvents({ 
  lat, 
  lng, 
  locationName,
  radius = 5,
  limit = 5 
}: NearbyEventsProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!lat || !lng) {
      setLoading(false);
      return;
    }

    fetch(`/api/events/nearby?lat=${lat}&lng=${lng}&radius=${radius}&limit=${limit}`)
      .then(res => {
        if (!res.ok) throw new Error('Events not available');
        return res.json();
      })
      .then(data => {
        setEvents(data.events || []);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [lat, lng, radius, limit]);

  if (loading) {
    return (
      <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 animate-pulse">
        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-32 mb-3"></div>
        <div className="space-y-3">
          <div className="h-16 bg-gray-200 dark:bg-gray-800 rounded"></div>
          <div className="h-16 bg-gray-200 dark:bg-gray-800 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !events || events.length === 0) {
    return null;
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };

  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="h-4 w-4 text-gray-500" />
        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
          Nearby Events
        </h3>
        {locationName && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            near {locationName}
          </span>
        )}
      </div>

      <div className="space-y-3">
        {events.map((event) => (
          <div 
            key={event.id} 
            className="border border-gray-100 dark:border-gray-800 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
                    {event.title}
                  </h4>
                  {event.url && (
                    <a
                      href={event.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
                
                {event.description && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                    {event.description}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(event.start_date)}
                    {event.end_date && ` - ${formatDate(event.end_date)}`}
                  </span>
                  
                  {event.venue && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {event.venue}
                    </span>
                  )}
                  
                  {event.distance_km !== undefined && (
                    <span className="text-gray-400">
                      {event.distance_km < 1 
                        ? `${Math.round(event.distance_km * 1000)}m away`
                        : `${event.distance_km.toFixed(1)}km away`
                      }
                    </span>
                  )}
                </div>

                {event.category && (
                  <span className="inline-block mt-2 px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-400 rounded">
                    {event.category}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {events.length === limit && (
        <div className="mt-3 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Showing {events.length} events within {radius}km
          </p>
        </div>
      )}
    </div>
  );
}
