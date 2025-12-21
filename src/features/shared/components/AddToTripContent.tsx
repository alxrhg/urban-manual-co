'use client';

import { memo, useCallback, useState, useMemo } from 'react';
import Image from 'next/image';
import {
  MapPin,
  Plus,
  Sparkles,
  Check,
  Calendar,
  Clock,
  Sun,
  Sunset,
  Moon,
  Coffee,
  Timer,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useTripBuilder } from '@/contexts/TripBuilderContext';
import { useIntelligentDrawer } from './IntelligentDrawerContext';
import { Destination } from '@/types/destination';
import { capitalizeCategory } from '@/lib/utils';
import { TripFitAnalysis } from './types';

// Time slot options with display info
const TIME_SLOTS = [
  { id: 'morning', label: 'Morning', time: '09:00', icon: Coffee, description: '9am - 12pm' },
  { id: 'afternoon', label: 'Afternoon', time: '14:00', icon: Sun, description: '12pm - 5pm' },
  { id: 'evening', label: 'Evening', time: '19:00', icon: Sunset, description: '5pm - 9pm' },
  { id: 'night', label: 'Night', time: '21:00', icon: Moon, description: '9pm+' },
] as const;

type TimeSlotId = typeof TIME_SLOTS[number]['id'];

// Recommended durations by category (in minutes)
function getRecommendedDuration(category?: string | null): number {
  if (!category) return 60;
  const cat = category.toLowerCase();

  if (cat.includes('fine dining') || cat.includes('omakase')) return 150;
  if (cat.includes('restaurant') || cat.includes('dining')) return 90;
  if (cat.includes('museum') || cat.includes('gallery')) return 120;
  if (cat.includes('shopping')) return 90;
  if (cat.includes('bar') || cat.includes('cocktail')) return 75;
  if (cat.includes('cafe') || cat.includes('coffee')) return 45;
  if (cat.includes('bakery') || cat.includes('patisserie')) return 30;
  if (cat.includes('park') || cat.includes('garden')) return 90;
  if (cat.includes('temple') || cat.includes('shrine')) return 60;
  if (cat.includes('hotel')) return 120;

  return 60;
}

// Get best time slot for a category
function getBestTimeSlotForCategory(category?: string | null): TimeSlotId {
  if (!category) return 'afternoon';
  const cat = category.toLowerCase();

  if (cat.includes('breakfast') || cat.includes('cafe') || cat.includes('coffee') || cat.includes('bakery')) {
    return 'morning';
  }
  if (cat.includes('bar') || cat.includes('cocktail') || cat.includes('club')) {
    return 'night';
  }
  if (cat.includes('restaurant') || cat.includes('dining')) {
    return 'evening';
  }
  if (cat.includes('museum') || cat.includes('gallery') || cat.includes('temple')) {
    return 'morning';
  }

  return 'afternoon';
}

/**
 * AddToTripContent - Smart add-to-trip overlay
 *
 * Shows when user wants to add a destination to their trip:
 * - AI-powered day recommendations
 * - Fit score and reason
 * - Time slot selection (Morning/Afternoon/Evening/Night)
 * - Duration customization
 * - Quick day selection
 * - Option to start new trip
 */
const AddToTripContent = memo(function AddToTripContent() {
  const { state, addToTripAndClose, close } = useIntelligentDrawer();
  const { activeTrip, startTrip, totalItems } = useTripBuilder();

  const destination = state.context.destination;
  const fitAnalysis = state.context.tripFitAnalysis;

  // Get recommended time slot from fit analysis or category
  const initialTimeSlot = useMemo(() => {
    if (fitAnalysis?.timeSlot) {
      // Map time string to slot id
      const hour = parseInt(fitAnalysis.timeSlot.split(':')[0]);
      if (hour < 12) return 'morning';
      if (hour < 17) return 'afternoon';
      if (hour < 21) return 'evening';
      return 'night';
    }
    return getBestTimeSlotForCategory(destination?.category);
  }, [fitAnalysis, destination]);

  // State for customization
  const [selectedDay, setSelectedDay] = useState<number | null>(fitAnalysis?.bestDay || 1);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlotId>(initialTimeSlot);
  const [showTimeOptions, setShowTimeOptions] = useState(false);
  const [duration, setDuration] = useState(() => getRecommendedDuration(destination?.category));

  // Get the actual time string for the selected slot
  const selectedTime = useMemo(() => {
    const slot = TIME_SLOTS.find(s => s.id === selectedTimeSlot);
    return slot?.time || '14:00';
  }, [selectedTimeSlot]);

  const handleAddToDay = useCallback(
    (day: number) => {
      if (destination) {
        addToTripAndClose(destination, day, selectedTime);
      }
    },
    [destination, addToTripAndClose, selectedTime]
  );

  const handleQuickAdd = useCallback(() => {
    if (destination && selectedDay) {
      addToTripAndClose(destination, selectedDay, selectedTime);
    }
  }, [destination, selectedDay, selectedTime, addToTripAndClose]);

  const handleStartNewTrip = useCallback(() => {
    if (!destination) return;
    startTrip(destination.city || 'New Trip', 3);
    addToTripAndClose(destination, 1, selectedTime);
  }, [destination, startTrip, addToTripAndClose, selectedTime]);

  if (!destination) return null;

  const imageUrl = destination.image || destination.image_thumbnail;
  const recommendedDuration = getRecommendedDuration(destination.category);
  const SelectedTimeIcon = TIME_SLOTS.find(s => s.id === selectedTimeSlot)?.icon || Sun;

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
            {/* Duration badge */}
            <div className="flex items-center gap-1 mt-1.5">
              <Timer className="w-3 h-3 text-gray-400" />
              <span className="text-[11px] text-gray-400">
                ~{recommendedDuration} min recommended
              </span>
            </div>
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
          </div>
        </div>
      )}

      {/* Time Slot Selection */}
      {activeTrip && (
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <button
            onClick={() => setShowTimeOptions(!showTimeOptions)}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <SelectedTimeIcon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </div>
              <div className="text-left">
                <p className="text-[13px] font-medium text-gray-900 dark:text-white">
                  {TIME_SLOTS.find(s => s.id === selectedTimeSlot)?.label}
                </p>
                <p className="text-[11px] text-gray-500">
                  {TIME_SLOTS.find(s => s.id === selectedTimeSlot)?.description}
                </p>
              </div>
            </div>
            {showTimeOptions ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>

          {/* Time Slot Options */}
          {showTimeOptions && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              {TIME_SLOTS.map((slot) => {
                const Icon = slot.icon;
                const isSelected = selectedTimeSlot === slot.id;
                return (
                  <button
                    key={slot.id}
                    onClick={() => {
                      setSelectedTimeSlot(slot.id);
                      setShowTimeOptions(false);
                    }}
                    className={`
                      flex items-center gap-2 p-3 rounded-xl transition-all
                      ${isSelected
                        ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                        : 'bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10'
                      }
                    `}
                  >
                    <Icon className={`w-4 h-4 ${isSelected ? '' : 'text-gray-400'}`} />
                    <div className="text-left">
                      <p className={`text-[12px] font-medium ${isSelected ? '' : 'text-gray-900 dark:text-white'}`}>
                        {slot.label}
                      </p>
                      <p className={`text-[10px] ${isSelected ? 'opacity-70' : 'text-gray-500'}`}>
                        {slot.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Day Selection */}
      {activeTrip && (
        <div className="px-5 py-4">
          <p className="text-[12px] font-medium text-gray-500 uppercase tracking-wide mb-3">
            Choose a day
          </p>
          <div className="grid grid-cols-3 gap-2">
            {activeTrip.days.map((day) => {
              const isBest = fitAnalysis?.bestDay === day.dayNumber;
              const isSelected = selectedDay === day.dayNumber;
              return (
                <button
                  key={day.dayNumber}
                  onClick={() => setSelectedDay(day.dayNumber)}
                  className={`
                    relative p-3 rounded-xl text-center transition-all
                    ${isSelected
                      ? 'bg-gray-900 dark:bg-white ring-2 ring-gray-900 dark:ring-white'
                      : isBest
                      ? 'bg-gray-100 dark:bg-white/10 ring-1 ring-green-500'
                      : 'bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10'
                    }
                  `}
                >
                  {isBest && !isSelected && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                      <Sparkles className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                  <p className={`text-[15px] font-semibold ${isSelected ? 'text-white dark:text-gray-900' : 'text-gray-900 dark:text-white'}`}>
                    {day.dayNumber}
                  </p>
                  <p className={`text-[11px] ${isSelected ? 'text-white/70 dark:text-gray-500' : 'text-gray-500'}`}>
                    {day.items.length} place{day.items.length !== 1 ? 's' : ''}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Add Button */}
          <button
            onClick={handleQuickAdd}
            disabled={!selectedDay}
            className={`mt-4 w-full py-3 rounded-xl font-medium text-[14px] transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed ${
              fitAnalysis?.category === 'perfect' && selectedDay === fitAnalysis.bestDay
                ? 'bg-green-600 text-white hover:bg-green-700'
                : fitAnalysis?.category === 'good' && selectedDay === fitAnalysis.bestDay
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" />
              Add to Day {selectedDay} · {TIME_SLOTS.find(s => s.id === selectedTimeSlot)?.label}
            </span>
          </button>
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
