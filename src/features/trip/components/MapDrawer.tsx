'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import TripPlannerMap from './TripPlannerMap';
import type { TripDay } from '@/lib/hooks/useTripEditor';

interface MapDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  days: TripDay[];
  selectedDayNumber: number;
  activeItemId?: string | null;
  onMarkerClick?: (itemId: string) => void;
}

/**
 * MapDrawer - Slide-in map overlay matching Destination drawer style
 * Uses: glassy backdrop, rounded-2xl, gray color palette
 */
export default function MapDrawer({
  isOpen,
  onClose,
  days,
  selectedDayNumber,
  activeItemId,
  onMarkerClick,
}: MapDrawerProps) {
  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`
          fixed inset-0 z-40 bg-black/50 backdrop-blur-sm
          transition-opacity duration-300
          ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div
        className={`
          fixed top-4 right-4 bottom-4 z-50
          w-[calc(100%-2rem)] md:w-[420px]
          bg-white dark:bg-gray-900
          rounded-2xl
          shadow-2xl shadow-black/20
          transition-all duration-500 ease-out
          ${isOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Route Map
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Close map"
          >
            <X className="w-4 h-4 text-gray-900 dark:text-white" strokeWidth={1.5} />
          </button>
        </div>

        {/* Map Content */}
        <div className="h-[calc(100%-8rem)]">
          {isOpen && (
            <TripPlannerMap
              days={days}
              selectedDayNumber={selectedDayNumber}
              activeItemId={activeItemId}
              onMarkerClick={onMarkerClick}
              className="h-full"
            />
          )}
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 rounded-b-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Day {selectedDayNumber} · {days[selectedDayNumber - 1]?.items.length || 0} stops
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
