'use client';

import { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import TripInteractiveMap from './TripInteractiveMap';
import type { TripDay } from '@/lib/hooks/useTripEditor';
import type { Destination } from '@/types/destination';

interface FullscreenMapOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  days: TripDay[];
  selectedDayNumber?: number;
  activeItemId?: string | null;
  tripDestination?: string;
  onMarkerClick?: (itemId: string) => void;
  onAddPlace?: (place: Partial<Destination>, dayNumber: number) => void;
}

/**
 * FullscreenMapOverlay - Full-screen map modal for trip planning
 * Provides a larger view of the interactive map with all features
 */
export default function FullscreenMapOverlay({
  isOpen,
  onClose,
  days,
  selectedDayNumber,
  activeItemId,
  tripDestination,
  onMarkerClick,
  onAddPlace,
}: FullscreenMapOverlayProps) {
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Map Container */}
      <div className="absolute inset-4 md:inset-6 lg:inset-8 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-white/95 dark:from-gray-900/95 to-transparent">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Trip Map
            </h2>
            {tripDestination && (
              <p className="text-sm text-gray-500 dark:text-gray-400">{tripDestination}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
            aria-label="Close map"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Interactive Map */}
        <TripInteractiveMap
          days={days}
          selectedDayNumber={selectedDayNumber}
          activeItemId={activeItemId}
          tripDestination={tripDestination}
          onMarkerClick={onMarkerClick}
          onAddPlace={onAddPlace}
          showSearch={true}
          showDayFilter={true}
          hasHeader={true}
          className="h-full"
        />
      </div>
    </div>
  );
}
