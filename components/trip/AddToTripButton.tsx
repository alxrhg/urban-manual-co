'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Plus, Check, Calendar, ChevronDown } from 'lucide-react';
import { useTripBuilder } from '@/contexts/TripBuilderContext';
import { usePlanningMode } from '@/contexts/PlanningModeContext';
import { Destination } from '@/types/destination';

interface AddToTripButtonProps {
  destination: Destination;
  variant?: 'icon' | 'button' | 'card';
  className?: string;
}

export default function AddToTripButton({
  destination,
  variant = 'icon',
  className = '',
}: AddToTripButtonProps) {
  const { activeTrip, addToTrip, canAddMore } = useTripBuilder();
  const { planningMode, isInPlanningMode, getAddLabel } = usePlanningMode();
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Check if already in trip
  const isInTrip = activeTrip?.days.some(day =>
    day.items.some(item => item.destination.slug === destination.slug)
  );

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDayPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAdd = useCallback((day?: number) => {
    addToTrip(destination, day);
    setJustAdded(true);
    setShowDayPicker(false);

    // Reset animation after delay
    setTimeout(() => setJustAdded(false), 2000);
  }, [destination, addToTrip]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isInTrip) return;

    // In planning mode with quick add enabled, add directly to default day
    if (isInPlanningMode && planningMode.quickAddEnabled) {
      handleAdd(planningMode.defaultDay);
      return;
    }

    // If trip exists with multiple days, show day picker
    if (activeTrip && activeTrip.days.length > 1) {
      setShowDayPicker(true);
    } else {
      // Add to day 1 (or create trip)
      handleAdd(1);
    }
  }, [isInTrip, activeTrip, handleAdd, isInPlanningMode, planningMode]);

  // Icon variant - minimal, for grid cards
  if (variant === 'icon') {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={handleClick}
          disabled={isInTrip}
          className={`p-2 rounded-full transition-all duration-200 ${
            isInTrip
              ? 'bg-green-500 text-white'
              : justAdded
                ? 'bg-green-500 text-white scale-110'
                : 'bg-black/40 text-white hover:bg-black/60 hover:scale-105'
          } ${className}`}
          title={isInTrip ? 'Already in trip' : isInPlanningMode ? getAddLabel() : 'Add to trip'}
        >
          {isInTrip || justAdded ? (
            <Check className="w-4 h-4" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
        </button>

        {/* Day picker dropdown */}
        {showDayPicker && activeTrip && (
          <div className="absolute top-full right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-2 min-w-[140px] z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            <p className="px-3 py-1 text-[11px] font-medium text-gray-400 uppercase">Add to Day</p>
            {activeTrip.days.map(day => (
              <button
                key={day.dayNumber}
                onClick={(e) => {
                  e.stopPropagation();
                  handleAdd(day.dayNumber);
                }}
                disabled={!canAddMore(day.dayNumber)}
                className="w-full px-3 py-2 text-left text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
              >
                <span>Day {day.dayNumber}</span>
                {day.items.length > 0 && (
                  <span className="text-[11px] text-gray-400">{day.items.length} places</span>
                )}
              </button>
            ))}
            <div className="border-t border-gray-100 dark:border-gray-700 mt-1 pt-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAdd(activeTrip.days.length + 1);
                }}
                className="w-full px-3 py-2 text-left text-[13px] text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 flex items-center gap-2"
              >
                <Plus className="w-3 h-3" />
                New day
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Button variant - for destination drawer / detail page
  if (variant === 'button') {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={handleClick}
          disabled={isInTrip}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 ${
            isInTrip
              ? 'bg-green-500 text-white'
              : justAdded
                ? 'bg-green-500 text-white'
                : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100'
          } ${className}`}
        >
          {isInTrip || justAdded ? (
            <>
              <Check className="w-4 h-4" />
              Added to Trip
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              {isInPlanningMode ? getAddLabel() : 'Add to Trip'}
              {!isInPlanningMode && activeTrip && activeTrip.days.length > 1 && (
                <ChevronDown className="w-3 h-3 ml-1" />
              )}
            </>
          )}
        </button>

        {/* Day picker dropdown */}
        {showDayPicker && activeTrip && (
          <div className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-2 min-w-[180px] z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            <p className="px-3 py-1 text-[11px] font-medium text-gray-400 uppercase">Add to Day</p>
            {activeTrip.days.map(day => (
              <button
                key={day.dayNumber}
                onClick={(e) => {
                  e.stopPropagation();
                  handleAdd(day.dayNumber);
                }}
                disabled={!canAddMore(day.dayNumber)}
                className="w-full px-3 py-2.5 text-left text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
              >
                <div>
                  <span className="font-medium">Day {day.dayNumber}</span>
                  {day.date && (
                    <span className="text-gray-400 ml-2 text-[11px]">
                      {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                  )}
                </div>
                {day.items.length > 0 && (
                  <span className="text-[11px] text-gray-400">{day.items.length} places</span>
                )}
              </button>
            ))}
            <div className="border-t border-gray-100 dark:border-gray-700 mt-1 pt-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAdd(activeTrip.days.length + 1);
                }}
                className="w-full px-3 py-2.5 text-left text-[13px] text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 flex items-center gap-2"
              >
                <Calendar className="w-3.5 h-3.5" />
                Add to new day
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Card variant - inline within destination cards
  return (
    <button
      onClick={handleClick}
      disabled={isInTrip}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all duration-200 ${
        isInTrip
          ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
          : justAdded
            ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
            : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20'
      } ${className}`}
    >
      {isInTrip || justAdded ? (
        <>
          <Check className="w-3.5 h-3.5" />
          In Trip
        </>
      ) : (
        <>
          <Plus className="w-3.5 h-3.5" />
          {isInPlanningMode ? `Day ${planningMode.defaultDay}` : 'Add'}
        </>
      )}
    </button>
  );
}
