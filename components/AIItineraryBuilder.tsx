'use client';

import { useState } from 'react';
import { Sparkles, MapPin, Calendar, Clock, ChevronRight, Loader2, AlertCircle } from 'lucide-react';

interface Destination {
  id: number;
  name: string;
  city?: string;
  category?: string;
  latitude?: number;
  longitude?: number;
}

interface ItineraryDay {
  day: number;
  date?: string;
  destinations: Array<{
    destination_id: number;
    name: string;
    category?: string;
    estimated_duration?: number;
    travel_time_from_previous?: number;
    notes?: string;
  }>;
  total_duration?: number;
  summary?: string;
}

interface BuildItineraryParams {
  destinations: Destination[];
  days: number;
  preferences?: {
    pace?: 'relaxed' | 'moderate' | 'packed';
    start_time?: string;
    end_time?: string;
    interests?: string[];
  };
}

interface AIItineraryBuilderProps {
  destinations: Destination[];
  onItineraryGenerated?: (itinerary: ItineraryDay[]) => void;
  className?: string;
}

export function AIItineraryBuilder({ 
  destinations, 
  onItineraryGenerated,
  className = '' 
}: AIItineraryBuilderProps) {
  const [days, setDays] = useState(3);
  const [pace, setPace] = useState<'relaxed' | 'moderate' | 'packed'>('moderate');
  const [itinerary, setItinerary] = useState<ItineraryDay[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildItinerary = async () => {
    if (!destinations || destinations.length === 0) {
      setError('Please select at least one destination');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/agents/itinerary-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destinations: destinations.map(d => ({
            id: d.id,
            destination_id: d.id,
          })),
          days,
          preferences: {
            pace,
            start_time: '09:00',
            end_time: '22:00',
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to build itinerary');
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      const generatedItinerary = data.itinerary || [];
      setItinerary(generatedItinerary);
      onItineraryGenerated?.(generatedItinerary);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to build itinerary';
      setError(errorMessage);
      console.error('Itinerary builder error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Configuration */}
      <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-4 w-4 text-purple-500" />
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
            AI Itinerary Builder
          </h3>
        </div>

        {/* Days selector */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
            Number of Days
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5, 7].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`
                  px-3 py-2 rounded-lg text-xs font-medium transition-colors
                  ${days === d
                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }
                `}
              >
                {d} {d === 1 ? 'day' : 'days'}
              </button>
            ))}
          </div>
        </div>

        {/* Pace selector */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
            Travel Pace
          </label>
          <div className="flex gap-2">
            {[
              { value: 'relaxed' as const, label: 'Relaxed' },
              { value: 'moderate' as const, label: 'Moderate' },
              { value: 'packed' as const, label: 'Packed' },
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setPace(value)}
                className={`
                  flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors
                  ${pace === value
                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }
                `}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Selected destinations count */}
        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
          <MapPin className="h-3.5 w-3.5" />
          <span>{destinations.length} destination{destinations.length !== 1 ? 's' : ''} selected</span>
        </div>

        {/* Build button */}
        <button
          onClick={buildItinerary}
          disabled={loading || destinations.length === 0}
          className="w-full px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Building your itinerary...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              <span>Build Itinerary</span>
            </>
          )}
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Generated Itinerary */}
      {itinerary && itinerary.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
            Your {days}-Day Itinerary
          </h4>
          
          {itinerary.map((day) => (
            <div
              key={day.day}
              className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 space-y-3"
            >
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <h5 className="text-sm font-medium text-gray-900 dark:text-white">
                  Day {day.day}
                </h5>
                {day.total_duration && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
                    ~{Math.round(day.total_duration / 60)}h total
                  </span>
                )}
              </div>

              {day.summary && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                  {day.summary}
                </p>
              )}

              <div className="space-y-2">
                {day.destinations.map((dest, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex-shrink-0 w-6 h-6 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center text-xs font-medium text-purple-700 dark:text-purple-300">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {dest.name}
                      </div>
                      {dest.category && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {dest.category}
                        </div>
                      )}
                      {dest.notes && (
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {dest.notes}
                        </div>
                      )}
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        {dest.estimated_duration && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {dest.estimated_duration} min
                          </span>
                        )}
                        {dest.travel_time_from_previous && idx > 0 && (
                          <span className="flex items-center gap-1 text-gray-400">
                            <ChevronRight className="h-3 w-3" />
                            {dest.travel_time_from_previous} min travel
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Hook for building itineraries
export function useItineraryBuilder() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildItinerary = async (params: BuildItineraryParams): Promise<ItineraryDay[] | null> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/agents/itinerary-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to build itinerary');
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      return data.itinerary || [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to build itinerary';
      setError(errorMessage);
      console.error('Itinerary builder error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { buildItinerary, loading, error };
}
