'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, X, ChevronUp, ChevronDown, Plus, Eye } from 'lucide-react';
import { useTrip } from '@/contexts/TripContext';
import { useDrawerStore } from '@/lib/stores/drawer-store';

/**
 * Floating Trip Widget - Shows when user has an active trip
 *
 * Features:
 * - Collapsible to just an icon
 * - Shows trip summary and location count
 * - Quick access to add or view trip
 * - Persists collapsed state in localStorage
 */
export function FloatingTripWidget() {
  const router = useRouter();
  const { activeTrip } = useTrip();
  const { openDrawer } = useDrawerStore();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isVisible, setIsVisible] = useState(false);

  // Load collapsed state from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const stored = localStorage.getItem('urban-manual-widget-collapsed');
    if (stored !== null) {
      setIsCollapsed(stored === 'true');
    }
  }, []);

  // Show widget when there's an active trip
  useEffect(() => {
    if (activeTrip) {
      // Small delay for entrance animation
      const timer = setTimeout(() => setIsVisible(true), 100);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [activeTrip]);

  // Save collapsed state
  const toggleCollapsed = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    if (typeof window !== 'undefined') {
      localStorage.setItem('urban-manual-widget-collapsed', String(newState));
    }
  };

  const handleViewTrip = () => {
    if (activeTrip) {
      router.push(`/trips/${activeTrip.id}`);
    }
  };

  const handleAddPlace = () => {
    // Open the quick trip selector or place selector
    openDrawer('quick-trip-selector', {
      destinationSlug: '',
      destinationName: 'Add a place',
      destinationCity: activeTrip?.destination,
    });
  };

  // Don't render if no active trip or not visible
  if (!activeTrip || !isVisible) return null;

  const locationCount = activeTrip.locations?.length || 0;

  return (
    <div
      className={`fixed bottom-6 right-6 z-40 transition-all duration-300 ease-out ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      }`}
    >
      {isCollapsed ? (
        // Collapsed state - just an icon button
        <button
          onClick={toggleCollapsed}
          className="group relative flex items-center justify-center w-14 h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all"
          aria-label="Expand trip widget"
        >
          <MapPin className="w-6 h-6" />
          {/* Badge showing location count */}
          {locationCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-white text-emerald-600 text-xs font-bold rounded-full flex items-center justify-center shadow">
              {locationCount}
            </span>
          )}
          {/* Tooltip on hover */}
          <span className="absolute right-full mr-2 px-2 py-1 bg-stone-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            {activeTrip.name}
          </span>
        </button>
      ) : (
        // Expanded state - full widget
        <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-700 overflow-hidden w-72">
          {/* Header */}
          <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-100 dark:border-emerald-800/30">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center">
                <MapPin className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Planning</p>
                <p className="text-sm font-medium text-stone-900 dark:text-white truncate max-w-[140px]">
                  {activeTrip.name}
                </p>
              </div>
            </div>
            <button
              onClick={toggleCollapsed}
              className="p-1.5 hover:bg-emerald-100 dark:hover:bg-emerald-800/30 rounded-full transition-colors"
              aria-label="Collapse widget"
            >
              <ChevronDown className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-3">
            {/* Stats */}
            <div className="flex items-center gap-4 mb-3 text-sm">
              <div className="flex items-center gap-1.5 text-stone-600 dark:text-stone-400">
                <MapPin className="w-4 h-4" />
                <span>{locationCount} {locationCount === 1 ? 'place' : 'places'}</span>
              </div>
              {activeTrip.destination && (
                <span className="text-stone-400 dark:text-stone-500">
                  {activeTrip.destination}
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleViewTrip}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <Eye className="w-4 h-4" />
                View Trip
              </button>
              <button
                onClick={handleAddPlace}
                className="px-3 py-2 border border-stone-200 dark:border-stone-700 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
                aria-label="Add place to trip"
              >
                <Plus className="w-4 h-4 text-stone-600 dark:text-stone-400" />
              </button>
            </div>
          </div>

          {/* Close/Dismiss */}
          <button
            onClick={() => setIsVisible(false)}
            className="absolute top-2 right-2 p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors opacity-0 hover:opacity-100"
            aria-label="Hide widget"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}
