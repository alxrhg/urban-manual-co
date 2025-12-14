'use client';

import { useState, useCallback } from 'react';
import { Calendar, MapPin, Clock, Sparkles, Loader2, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useUserContext, formatUserContextForAPI } from '@/hooks/useUserContext';
import { cn } from '@/lib/utils';

interface ItineraryItem {
  time: string;
  destination: {
    name: string;
    slug: string;
    category: string;
    city: string;
  };
  duration: string;
  notes?: string;
}

interface GeneratedItinerary {
  title: string;
  city: string;
  items: ItineraryItem[];
  tips?: string[];
}

interface PlanMyDayProps {
  defaultCity?: string;
  onDestinationClick?: (slug: string) => void;
  onAddToTrip?: (itinerary: GeneratedItinerary) => void;
  className?: string;
}

const PRESET_PROMPTS = [
  { label: 'Morning to evening', prompt: 'Plan my day from breakfast to dinner' },
  { label: 'Afternoon adventure', prompt: 'Plan my afternoon with lunch and activities' },
  { label: 'Romantic evening', prompt: 'Plan a romantic evening with dinner and drinks' },
  { label: 'Architecture tour', prompt: 'Plan a day exploring architectural landmarks' },
  { label: 'Foodie crawl', prompt: 'Plan a food-focused day hitting multiple spots' },
];

const POPULAR_CITIES = [
  'Tokyo', 'Paris', 'London', 'New York', 'Singapore',
  'Hong Kong', 'Los Angeles', 'Sydney', 'Dubai', 'Bangkok',
];

export function PlanMyDay({
  defaultCity,
  onDestinationClick,
  onAddToTrip,
  className,
}: PlanMyDayProps) {
  const { user } = useAuth();
  const { context } = useUserContext();

  const [city, setCity] = useState(defaultCity || '');
  const [customPrompt, setCustomPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [itinerary, setItinerary] = useState<GeneratedItinerary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCityPicker, setShowCityPicker] = useState(!defaultCity);

  const generateItinerary = useCallback(async (prompt: string) => {
    if (!city) {
      setError('Please select a city first');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setItinerary(null);

    try {
      const response = await fetch('/api/intelligence/itinerary/plan-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city,
          prompt,
          userContext: formatUserContextForAPI(context),
          date: new Date().toISOString().split('T')[0],
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate itinerary');
      }

      const data = await response.json();
      setItinerary(data.itinerary);
    } catch (err: any) {
      console.error('Error generating itinerary:', err);
      setError(err.message || 'Failed to generate itinerary. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }, [city, context]);

  const handlePresetClick = (prompt: string) => {
    setCustomPrompt(prompt);
    generateItinerary(prompt);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customPrompt.trim()) {
      generateItinerary(customPrompt.trim());
    }
  };

  return (
    <div className={cn('rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden', className)}>
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-4 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Plan My Day</h2>
        </div>
        <p className="text-sm text-white/80">
          Get a personalized itinerary powered by AI
        </p>
      </div>

      <div className="p-4 space-y-4">
        {/* City Selection */}
        {showCityPicker && (
          <div>
            <label className="text-sm font-medium mb-2 block flex items-center gap-2">
              <MapPin className="h-4 w-4 text-gray-500" />
              Where are you going?
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {POPULAR_CITIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCity(c)}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                    city === c
                      ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Or type a city..."
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        )}

        {/* Selected City Display */}
        {!showCityPicker && city && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-gray-500" />
              <span className="font-medium">{city}</span>
            </div>
            <button
              onClick={() => setShowCityPicker(true)}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Change
            </button>
          </div>
        )}

        {/* Preset Prompts */}
        {city && !itinerary && (
          <div>
            <p className="text-sm font-medium mb-2">Quick plans:</p>
            <div className="flex flex-wrap gap-2">
              {PRESET_PROMPTS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => handlePresetClick(preset.prompt)}
                  disabled={isGenerating}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors disabled:opacity-50"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Custom Prompt */}
        {city && !itinerary && (
          <form onSubmit={handleCustomSubmit} className="flex gap-2">
            <input
              type="text"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder={`"Plan my Saturday in ${city}..."`}
              className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={isGenerating}
            />
            <Button
              type="submit"
              disabled={!customPrompt.trim() || isGenerating}
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
            </Button>
          </form>
        )}

        {/* Loading State */}
        {isGenerating && (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-indigo-500" />
            <p className="text-sm text-gray-500">Planning your perfect day...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Generated Itinerary */}
        {itinerary && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{itinerary.title}</h3>
              <button
                onClick={() => setItinerary(null)}
                className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                Start over
              </button>
            </div>

            {/* Itinerary Items */}
            <div className="space-y-3">
              {itinerary.items.map((item, index) => (
                <div
                  key={index}
                  className="flex gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  onClick={() => onDestinationClick?.(item.destination.slug)}
                >
                  <div className="flex-shrink-0 w-16 text-center">
                    <div className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                      {item.time}
                    </div>
                    <div className="text-[10px] text-gray-400">{item.duration}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-sm line-clamp-1">
                          {item.destination.name}
                        </p>
                        <p className="text-xs text-gray-500 capitalize">
                          {item.destination.category}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    </div>
                    {item.notes && (
                      <p className="text-xs text-gray-500 mt-1">{item.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Tips */}
            {itinerary.tips && itinerary.tips.length > 0 && (
              <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs font-medium text-gray-500 mb-2">Tips:</p>
                <ul className="space-y-1">
                  {itinerary.tips.map((tip, index) => (
                    <li key={index} className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-2">
                      <span className="text-indigo-500">•</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Actions */}
            {onAddToTrip && (
              <Button
                onClick={() => onAddToTrip(itinerary)}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add to Trip
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
