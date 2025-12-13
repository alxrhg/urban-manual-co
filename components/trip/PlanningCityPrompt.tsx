'use client';

import { useState, useEffect } from 'react';
import { useTripBuilder } from '@/contexts/TripBuilderContext';
import { X, MapPin, Plus, Eye } from 'lucide-react';

interface PlanningCityPromptProps {
  /** The city being viewed that's not in the trip */
  viewedCity: string;
  /** Callback when dismissed */
  onDismiss?: () => void;
}

/**
 * PlanningCityPrompt - Inline prompt for non-trip city navigation
 *
 * Shown when user is in planning mode but viewing a city not in their trip.
 * Provides options to:
 * - Switch planning city to this one
 * - Add this city to the trip
 * - View anyway (dismiss)
 */
export default function PlanningCityPrompt({ viewedCity, onDismiss }: PlanningCityPromptProps) {
  const [dismissed, setDismissed] = useState(false);
  const {
    isPlanningMode,
    planningCity,
    activeTrip,
    getTripCities,
    setPlanningCity,
    startTrip,
  } = useTripBuilder();

  const tripCities = getTripCities();
  const isInTrip = tripCities.some(c => c.toLowerCase() === viewedCity.toLowerCase());

  // Reset dismissed state when viewed city changes
  useEffect(() => {
    setDismissed(false);
  }, [viewedCity]);

  // Don't show if:
  // - Not in planning mode
  // - City is already in trip
  // - Already dismissed
  // - No city being viewed
  if (!isPlanningMode || isInTrip || dismissed || !viewedCity) {
    return null;
  }

  const handleSwitchCity = () => {
    setPlanningCity(viewedCity);
    setDismissed(true);
    onDismiss?.();
  };

  const handleAddCity = () => {
    // If no trip exists, start one with this city
    if (!activeTrip) {
      startTrip(viewedCity, 3); // Default to 3 days
    }
    // Switch to this city for planning
    setPlanningCity(viewedCity);
    setDismissed(true);
    onDismiss?.();
  };

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800
                    rounded-xl p-4 mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-800 rounded-full
                       flex items-center justify-center">
          <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            You're viewing {viewedCity}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {planningCity
              ? `Currently planning in ${planningCity}`
              : 'This city is not in your trip'}
          </p>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              onClick={handleSwitchCity}
              className="inline-flex items-center gap-1.5 px-3 py-1.5
                       bg-blue-600 text-white text-xs font-medium rounded-lg
                       hover:bg-blue-700 transition-colors"
            >
              <MapPin className="w-3 h-3" />
              Plan here
            </button>

            {!isInTrip && activeTrip && (
              <button
                onClick={handleAddCity}
                className="inline-flex items-center gap-1.5 px-3 py-1.5
                         bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300
                         text-xs font-medium rounded-lg
                         hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add to trip
              </button>
            )}

            <button
              onClick={handleDismiss}
              className="inline-flex items-center gap-1.5 px-3 py-1.5
                       text-gray-500 dark:text-gray-400 text-xs font-medium
                       hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              <Eye className="w-3 h-3" />
              View anyway
            </button>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600
                   dark:hover:text-gray-300 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
