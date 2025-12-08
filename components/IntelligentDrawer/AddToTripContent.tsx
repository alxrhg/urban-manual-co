'use client';

import { memo, useCallback } from 'react';
import Image from 'next/image';
import {
  MapPin,
  Plus,
  Sparkles,
  Check,
  Calendar,
  Clock,
} from 'lucide-react';
import { useTripBuilder } from '@/contexts/TripBuilderContext';
import { useIntelligentDrawer } from './IntelligentDrawerContext';
import { Destination } from '@/types/destination';
import { capitalizeCategory } from '@/lib/utils';
import { TripFitAnalysis } from './types';

/**
 * AddToTripContent - Smart add-to-trip overlay
 *
 * Shows when user wants to add a destination to their trip:
 * - AI-powered day recommendations
 * - Fit score and reason
 * - Quick day selection
 * - Option to start new trip
 */
const AddToTripContent = memo(function AddToTripContent() {
  const { state, addToTripAndClose, close } = useIntelligentDrawer();
  const { activeTrip, startTrip, totalItems } = useTripBuilder();

  const destination = state.context.destination;
  const fitAnalysis = state.context.tripFitAnalysis;

  const handleAddToDay = useCallback(
    (day: number) => {
      if (destination) {
        addToTripAndClose(destination, day);
      }
    },
    [destination, addToTripAndClose]
  );

  const handleStartNewTrip = useCallback(() => {
    if (!destination) return;
    startTrip(destination.city || 'New Trip', 3);
    addToTripAndClose(destination, 1);
  }, [destination, startTrip, addToTripAndClose]);

  if (!destination) return null;

  const imageUrl = destination.image || destination.image_thumbnail;

  return (
    <div className="pb-6">
      {/* Destination Preview */}
      <div className="px-5 pt-4 pb-5 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={destination.name}
                width={64}
                height={64}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <MapPin className="w-6 h-6 text-gray-400" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[16px] font-semibold text-gray-900 dark:text-white truncate">
              {destination.name}
            </h3>
            <p className="text-[13px] text-gray-500 truncate">
              {destination.category && capitalizeCategory(destination.category)}
              {destination.category && destination.neighborhood && ' · '}
              {destination.neighborhood}
            </p>
          </div>
        </div>
      </div>

      {/* Smart Recommendation */}
      {fitAnalysis && activeTrip && (
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div
            className={`p-4 rounded-2xl ${
              fitAnalysis.category === 'perfect'
                ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20'
                : fitAnalysis.category === 'good'
                ? 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20'
                : 'bg-gray-50 dark:bg-white/5'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  fitAnalysis.category === 'perfect'
                    ? 'bg-green-500'
                    : fitAnalysis.category === 'good'
                    ? 'bg-blue-500'
                    : 'bg-gray-400'
                }`}
              >
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-[14px] font-semibold text-gray-900 dark:text-white mb-1">
                  {fitAnalysis.category === 'perfect'
                    ? 'Perfect for Day ' + fitAnalysis.bestDay
                    : fitAnalysis.category === 'good'
                    ? 'Great fit for Day ' + fitAnalysis.bestDay
                    : 'Add to Day ' + fitAnalysis.bestDay}
                </p>
                <p className="text-[13px] text-gray-600 dark:text-gray-400">
                  {fitAnalysis.reason}
                  {fitAnalysis.timeSlot && ` at ${fitAnalysis.timeSlot}`}
                </p>
              </div>
              <div className="text-right">
                <span
                  className={`text-[20px] font-bold ${
                    fitAnalysis.score >= 80
                      ? 'text-green-600'
                      : fitAnalysis.score >= 60
                      ? 'text-blue-600'
                      : 'text-gray-500'
                  }`}
                >
                  {fitAnalysis.score}
                </span>
                <span className="text-[11px] text-gray-400 block">fit score</span>
              </div>
            </div>

            {/* Quick add to recommended day */}
            <button
              onClick={() => handleAddToDay(fitAnalysis.bestDay)}
              className={`mt-4 w-full py-3 rounded-xl font-medium text-[14px] transition-all hover:scale-[1.01] active:scale-[0.99] ${
                fitAnalysis.category === 'perfect'
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : fitAnalysis.category === 'good'
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" />
                Add to Day {fitAnalysis.bestDay}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* All Days Selection */}
      {activeTrip && (
        <div className="px-5 py-4">
          <p className="text-[12px] font-medium text-gray-500 uppercase tracking-wide mb-3">
            Or choose another day
          </p>
          <div className="grid grid-cols-3 gap-2">
            {activeTrip.days.map((day) => {
              const isBest = fitAnalysis?.bestDay === day.dayNumber;
              return (
                <button
                  key={day.dayNumber}
                  onClick={() => handleAddToDay(day.dayNumber)}
                  className={`
                    relative p-3 rounded-xl text-center transition-all
                    ${
                      isBest
                        ? 'bg-gray-100 dark:bg-white/10 ring-2 ring-gray-900 dark:ring-white'
                        : 'bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10'
                    }
                  `}
                >
                  {isBest && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                  <p className="text-[15px] font-semibold text-gray-900 dark:text-white">
                    {day.dayNumber}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    {day.items.length} place{day.items.length !== 1 ? 's' : ''}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* No active trip - Start new */}
      {!activeTrip && (
        <div className="px-5 py-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-[16px] font-semibold text-gray-900 dark:text-white mb-1">
              Start a new trip
            </h3>
            <p className="text-[13px] text-gray-500">
              Create a trip to {destination.city || 'this destination'}
            </p>
          </div>

          <button
            onClick={handleStartNewTrip}
            className="w-full py-3 px-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-medium text-[14px] hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
          >
            <span className="flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" />
              Start {destination.city || 'New'} Trip
            </span>
          </button>
        </div>
      )}

      {/* Trip Preview */}
      {activeTrip && totalItems > 0 && (
        <div className="px-5 pt-2 pb-4 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between text-[12px] text-gray-500">
            <span>
              {activeTrip.title} · {totalItems} place{totalItems !== 1 ? 's' : ''}
            </span>
            <span>
              {activeTrip.days.length} day{activeTrip.days.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}
    </div>
  );
});

export default AddToTripContent;
