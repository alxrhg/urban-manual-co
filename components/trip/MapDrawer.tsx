'use client';

import { useEffect } from 'react';
import { X, Maximize2 } from 'lucide-react';
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
 * MapDrawer - Slide-in map overlay from the right
 * Journal aesthetic: Full-height panel, elegant shadow, smooth transition
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
          fixed inset-0 z-40 bg-black/30 backdrop-blur-sm
          transition-opacity duration-300
          ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div
        className={`
          fixed top-0 right-0 bottom-0 z-50
          w-full md:w-[600px] lg:w-[700px]
          bg-[#faf9f7] dark:bg-[#0a0a0a]
          shadow-2xl shadow-black/30
          transition-transform duration-500 ease-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-[#faf9f7] dark:from-[#0a0a0a] to-transparent">
          <h3 className="text-sm font-medium text-stone-600 dark:text-stone-400">
            Route Map
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full flex items-center justify-center bg-white/80 dark:bg-stone-900/80 backdrop-blur-sm text-stone-500 hover:text-stone-900 dark:hover:text-white shadow-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Map Content */}
        <div className="h-full pt-16">
          {isOpen && (
            <TripPlannerMap
              days={days}
              selectedDayNumber={selectedDayNumber}
              activeItemId={activeItemId}
              onMarkerClick={onMarkerClick}
              className="h-full rounded-tl-3xl overflow-hidden"
            />
          )}
        </div>

        {/* Bottom Info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#faf9f7] dark:from-[#0a0a0a] to-transparent">
          <div className="flex items-center justify-between">
            <span className="text-xs text-stone-400">
              {days[selectedDayNumber - 1]?.items.length || 0} stops on Day {selectedDayNumber}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
