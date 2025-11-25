'use client';

import { useState } from 'react';
import { CloudRain, ArrowLeftRight, Check, X, Umbrella, Sun } from 'lucide-react';
import { suggestWeatherSwaps, type WeatherSwapSuggestion } from '@/lib/trip-intelligence';

interface WeatherSwapAlertProps {
  days: Array<{
    dayNumber: number;
    date: string | null;
    weather?: { condition: string; isRainy: boolean };
    items: Array<{
      id: string;
      title: string;
      category?: string | null;
    }>;
  }>;
  onSwap?: (suggestion: WeatherSwapSuggestion) => void;
  className?: string;
}

export default function WeatherSwapAlert({ days, onSwap, className = '' }: WeatherSwapAlertProps) {
  const [dismissedSwaps, setDismissedSwaps] = useState<Set<string>>(new Set());

  const suggestions = suggestWeatherSwaps(days);

  // Filter out dismissed suggestions
  const activeSuggestions = suggestions.filter(
    (s) => !dismissedSwaps.has(`${s.affectedItem.id}-${s.targetItem.id}`)
  );

  if (activeSuggestions.length === 0) return null;

  const handleDismiss = (suggestion: WeatherSwapSuggestion) => {
    setDismissedSwaps((prev) => new Set([...prev, `${suggestion.affectedItem.id}-${suggestion.targetItem.id}`]));
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {activeSuggestions.map((suggestion, index) => (
        <div
          key={`${suggestion.affectedItem.id}-${suggestion.targetItem.id}`}
          className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4"
        >
          {/* Header */}
          <div className="flex items-start gap-3 mb-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
              <CloudRain className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Weather Alert: Day {suggestion.affectedDay}
              </h4>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                Rain forecasted – consider swapping activities
              </p>
            </div>
          </div>

          {/* Swap Visualization */}
          <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 rounded-lg mb-3">
            {/* Outdoor activity (rainy day) */}
            <div className="flex-1 text-center">
              <div className="flex items-center justify-center gap-1 text-[10px] text-gray-500 mb-1">
                <CloudRain className="w-3 h-3 text-blue-400" />
                Day {suggestion.affectedDay}
              </div>
              <div className="text-xs font-medium text-gray-900 dark:text-white truncate px-2">
                {suggestion.affectedItem.name}
              </div>
              <div className="text-[10px] text-orange-500 mt-0.5">Outdoor</div>
            </div>

            {/* Swap arrow */}
            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full">
              <ArrowLeftRight className="w-4 h-4 text-gray-500" />
            </div>

            {/* Indoor activity (clear day) */}
            <div className="flex-1 text-center">
              <div className="flex items-center justify-center gap-1 text-[10px] text-gray-500 mb-1">
                <Sun className="w-3 h-3 text-yellow-500" />
                Day {suggestion.targetDay}
              </div>
              <div className="text-xs font-medium text-gray-900 dark:text-white truncate px-2">
                {suggestion.targetItem.name}
              </div>
              <div className="text-[10px] text-green-500 mt-0.5">Indoor</div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onSwap?.(suggestion);
                handleDismiss(suggestion);
              }}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              Swap Activities
            </button>
            <button
              onClick={() => handleDismiss(suggestion)}
              className="px-3 py-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-xs transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
