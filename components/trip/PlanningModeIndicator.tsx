'use client';

import { useState, useRef, useEffect } from 'react';
import { MapPin, Calendar, ChevronDown, X, Zap } from 'lucide-react';
import { usePlanningMode } from '@/contexts/PlanningModeContext';
import { useTripBuilder } from '@/contexts/TripBuilderContext';

interface PlanningModeIndicatorProps {
  className?: string;
  compact?: boolean;
}

export function PlanningModeIndicator({
  className = '',
  compact = false,
}: PlanningModeIndicatorProps) {
  const { planningMode, isInPlanningMode, setDefaultDay, exitPlanningMode } = usePlanningMode();
  const { activeTrip } = useTripBuilder();
  const [showDayPicker, setShowDayPicker] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  if (!isInPlanningMode) return null;

  const tripCity = planningMode.targetCity || activeTrip?.city;
  const numDays = activeTrip?.days.length || 1;

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-500 text-white rounded-full text-xs font-medium">
          <Zap className="w-3 h-3" />
          <span>Day {planningMode.defaultDay}</span>
        </div>
        <button
          onClick={exitPlanningMode}
          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          title="Exit planning mode"
        >
          <X className="w-3.5 h-3.5 text-gray-500" />
        </button>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Planning Mode Badge */}
      <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl">
        <Zap className="w-4 h-4 text-blue-500" />
        <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
          Planning Mode
        </span>
      </div>

      {/* City indicator */}
      {tripCity && (
        <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
          <MapPin className="w-3.5 h-3.5" />
          <span>{tripCity}</span>
        </div>
      )}

      {/* Day selector */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setShowDayPicker(!showDayPicker)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Day {planningMode.defaultDay}</span>
          <ChevronDown className="w-3 h-3" />
        </button>

        {showDayPicker && (
          <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 min-w-[120px] z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            {Array.from({ length: numDays }, (_, i) => i + 1).map(day => (
              <button
                key={day}
                onClick={() => {
                  setDefaultDay(day);
                  setShowDayPicker(false);
                }}
                className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                  day === planningMode.defaultDay
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                Day {day}
                {activeTrip?.days[day - 1]?.date && (
                  <span className="ml-2 text-xs text-gray-400">
                    {new Date(activeTrip.days[day - 1].date!).toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Exit button */}
      <button
        onClick={exitPlanningMode}
        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
        title="Exit planning mode"
      >
        <X className="w-4 h-4 text-gray-500" />
      </button>
    </div>
  );
}

/**
 * Floating planning mode bar - shown at bottom of screen during planning
 */
export function PlanningModeBar({ className = '' }: { className?: string }) {
  const { planningMode, isInPlanningMode, setDefaultDay, exitPlanningMode } = usePlanningMode();
  const { activeTrip, openPanel } = useTripBuilder();
  const [showDayPicker, setShowDayPicker] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  if (!isInPlanningMode) return null;

  const tripCity = planningMode.targetCity || activeTrip?.city;
  const numDays = activeTrip?.days.length || 1;
  const totalItems = activeTrip?.days.reduce((sum, day) => sum + day.items.length, 0) || 0;

  return (
    <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-40 ${className}`}>
      <div className="flex items-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-2xl shadow-2xl backdrop-blur-sm">
        {/* Trip info */}
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4" />
          <span className="text-sm font-medium">
            {tripCity ? `${tripCity} Trip` : 'Planning'}
          </span>
          {totalItems > 0 && (
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
              {totalItems} places
            </span>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-white/30" />

        {/* Day selector */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDayPicker(!showDayPicker)}
            className="flex items-center gap-1.5 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Day {planningMode.defaultDay}</span>
            <ChevronDown className="w-3 h-3" />
          </button>

          {showDayPicker && (
            <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 min-w-[140px] z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
              {Array.from({ length: numDays }, (_, i) => i + 1).map(day => (
                <button
                  key={day}
                  onClick={() => {
                    setDefaultDay(day);
                    setShowDayPicker(false);
                  }}
                  className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                    day === planningMode.defaultDay
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <span className="font-medium">Day {day}</span>
                  {activeTrip?.days[day - 1]?.items.length ? (
                    <span className="ml-2 text-xs text-gray-400">
                      {activeTrip.days[day - 1].items.length} places
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* View trip button */}
        <button
          onClick={openPanel}
          className="px-3 py-1 bg-white text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors"
        >
          View Trip
        </button>

        {/* Exit button */}
        <button
          onClick={exitPlanningMode}
          className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
          title="Exit planning mode"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default PlanningModeIndicator;
