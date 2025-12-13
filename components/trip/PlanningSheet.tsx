'use client';

import { useEffect, useRef } from 'react';
import { useTripBuilder } from '@/contexts/TripBuilderContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  X,
  MapPin,
  Calendar,
  FolderOpen,
  Save,
  Share2,
  Plus,
  ChevronDown,
} from 'lucide-react';

/**
 * PlanningSheet - Expanded planning controls
 *
 * Bottom sheet with:
 * - Planning On/Off toggle
 * - City scope chips (for multi-city trips)
 * - Day picker
 * - Quick actions
 */
export default function PlanningSheet() {
  const { user } = useAuth();
  const sheetRef = useRef<HTMLDivElement>(null);
  const {
    activeTrip,
    savedTrips,
    totalItems,
    isPlanningMode,
    planningCity,
    defaultDay,
    isPlanningSheetOpen,
    closePlanningSheet,
    setPlanningMode,
    setPlanningCity,
    setDefaultDay,
    openPanel,
    saveTrip,
    getTripCities,
    startTrip,
  } = useTripBuilder();

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sheetRef.current && !sheetRef.current.contains(event.target as Node)) {
        closePlanningSheet();
      }
    }

    if (isPlanningSheetOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isPlanningSheetOpen, closePlanningSheet]);

  // Close on escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closePlanningSheet();
      }
    }

    if (isPlanningSheetOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isPlanningSheetOpen, closePlanningSheet]);

  if (!isPlanningSheetOpen) return null;

  const tripCities = getTripCities();
  const hasMultipleCities = tripCities.length > 1;
  const hasTripDays = activeTrip && activeTrip.days.length > 0;

  // Handle starting a new trip with a city
  const handleStartTrip = (city: string) => {
    startTrip(city, 3); // Default to 3 days
    setPlanningMode(true);
    setPlanningCity(city);
  };

  // Handle save
  const handleSave = async () => {
    if (!user) {
      // Could show login prompt here
      return;
    }
    await saveTrip();
  };

  // Handle share (placeholder - would open share modal)
  const handleShare = () => {
    // TODO: Implement share functionality
    console.log('Share trip');
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40 transition-opacity"
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className="fixed bottom-0 left-0 right-0 z-50
                   bg-white dark:bg-gray-900
                   rounded-t-2xl shadow-2xl
                   max-h-[70vh] overflow-y-auto
                   animate-in slide-in-from-bottom duration-300"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-700" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Trip Planning
          </h2>
          <button
            onClick={closePlanningSheet}
            className="p-2 -m-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-6">
          {/* Planning Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Planning Mode
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Filter browse to trip cities, quick-add places
              </p>
            </div>
            <button
              onClick={() => setPlanningMode(!isPlanningMode)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                isPlanningMode
                  ? 'bg-blue-600'
                  : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                  isPlanningMode ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* No Trip - City Selection */}
          {!activeTrip && isPlanningMode && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Pick a city to start planning
              </p>
              <div className="flex flex-wrap gap-2">
                {['Tokyo', 'Paris', 'London', 'New York', 'Los Angeles'].map(city => (
                  <button
                    key={city}
                    onClick={() => handleStartTrip(city)}
                    className="flex items-center gap-1.5 px-3 py-1.5
                             bg-gray-100 dark:bg-gray-800 rounded-full
                             text-sm text-gray-700 dark:text-gray-300
                             hover:bg-gray-200 dark:hover:bg-gray-700
                             transition-colors"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    {city}
                  </button>
                ))}
              </div>

              {/* Load saved trip */}
              {savedTrips.length > 0 && (
                <div className="pt-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    Or continue a saved trip:
                  </p>
                  <div className="space-y-1">
                    {savedTrips.slice(0, 3).map(trip => (
                      <button
                        key={trip.id}
                        onClick={() => {
                          // This would load the trip - handled by context
                          closePlanningSheet();
                          openPanel();
                        }}
                        className="w-full flex items-center justify-between px-3 py-2
                                 bg-gray-50 dark:bg-gray-800/50 rounded-lg
                                 hover:bg-gray-100 dark:hover:bg-gray-800
                                 transition-colors text-left"
                      >
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {trip.title}
                        </span>
                        <span className="text-xs text-gray-400">
                          {trip.itemCount} places
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Has Trip - City Scope */}
          {activeTrip && hasMultipleCities && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Planning city
              </p>
              <div className="flex flex-wrap gap-2">
                {tripCities.map(city => (
                  <button
                    key={city}
                    onClick={() => setPlanningCity(city)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full
                              text-sm transition-colors ${
                                planningCity === city
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                              }`}
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    {city}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Single city display */}
          {activeTrip && !hasMultipleCities && tripCities.length === 1 && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <MapPin className="w-4 h-4" />
              <span>Planning in {tripCities[0]}</span>
            </div>
          )}

          {/* Day Picker */}
          {hasTripDays && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Default day for new places
              </p>
              <div className="flex flex-wrap gap-2">
                {activeTrip.days.map(day => {
                  const itemCount = day.items.length;
                  const isSelected = defaultDay === day.dayNumber;

                  return (
                    <button
                      key={day.dayNumber}
                      onClick={() => setDefaultDay(day.dayNumber)}
                      className={`flex flex-col items-center px-4 py-2 rounded-xl
                                transition-colors ${
                                  isSelected
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                }`}
                    >
                      <span className="text-sm font-medium">Day {day.dayNumber}</span>
                      {day.date && (
                        <span className={`text-[10px] ${isSelected ? 'text-white/70' : 'text-gray-400'}`}>
                          {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </span>
                      )}
                      <span className={`text-[10px] mt-0.5 ${isSelected ? 'text-white/70' : 'text-gray-400'}`}>
                        {itemCount} {itemCount === 1 ? 'place' : 'places'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          {activeTrip && (
            <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
              <div className="flex gap-3">
                {/* Open Trip */}
                <button
                  onClick={() => {
                    closePlanningSheet();
                    openPanel();
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5
                           bg-gray-900 dark:bg-white rounded-xl
                           text-white dark:text-gray-900 text-sm font-medium
                           hover:bg-gray-800 dark:hover:bg-gray-100
                           transition-colors"
                >
                  <FolderOpen className="w-4 h-4" />
                  Open Trip
                </button>

                {/* Save */}
                {user && activeTrip.isModified && (
                  <button
                    onClick={handleSave}
                    className="flex items-center justify-center gap-2 px-4 py-2.5
                             bg-gray-100 dark:bg-gray-800 rounded-xl
                             text-gray-700 dark:text-gray-300 text-sm font-medium
                             hover:bg-gray-200 dark:hover:bg-gray-700
                             transition-colors"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                )}

                {/* Share */}
                {activeTrip.id && (
                  <button
                    onClick={handleShare}
                    className="flex items-center justify-center gap-2 px-4 py-2.5
                             bg-gray-100 dark:bg-gray-800 rounded-xl
                             text-gray-700 dark:text-gray-300 text-sm font-medium
                             hover:bg-gray-200 dark:hover:bg-gray-700
                             transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Trip Summary */}
          {activeTrip && (
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>
                {activeTrip.days.length} {activeTrip.days.length === 1 ? 'day' : 'days'} · {totalItems} {totalItems === 1 ? 'place' : 'places'}
              </span>
              {activeTrip.isModified && !activeTrip.id && (
                <span className="text-amber-500">Unsaved</span>
              )}
            </div>
          )}
        </div>

        {/* Safe area padding for mobile */}
        <div className="h-safe-area-bottom" />
      </div>
    </>
  );
}
