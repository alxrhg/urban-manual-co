'use client';

import { useState, useEffect } from 'react';
import { Plus, Map, Sparkles, Share2, X, MapPin, Plane, StickyNote, Hotel, Car } from 'lucide-react';

interface FloatingActionBarProps {
  onAddPlace: () => void;
  onAddFlight: () => void;
  onAddNote: () => void;
  onAddHotel?: () => void;
  onAddTransport?: () => void;
  onOpenMap: () => void;
  onAIPlan: () => void;
  onShare?: () => void;
  isAIPlanning?: boolean;
  isSaving?: boolean;
}

/**
 * FloatingActionBar - Mobile-optimized bottom action bar
 * Features: Safe area insets, larger touch targets, haptic-friendly
 */
export default function FloatingActionBar({
  onAddPlace,
  onAddFlight,
  onAddNote,
  onAddHotel,
  onAddTransport,
  onOpenMap,
  onAIPlan,
  onShare,
  isAIPlanning = false,
  isSaving = false,
}: FloatingActionBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile for touch-specific behavior
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isExpanded) setIsExpanded(false);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isExpanded]);

  return (
    <>
      {/* Backdrop */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* Action Bar Container - Safe area aware */}
      <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none pb-safe">
        <div className="flex justify-center pb-4 sm:pb-6 px-4">
          <div className="pointer-events-auto">
            {/* Expanded Menu - Grid on mobile for better touch targets */}
            <div
              className={`
                absolute bottom-full left-1/2 -translate-x-1/2 mb-3
                transition-all duration-300 origin-bottom
                ${isExpanded ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4 pointer-events-none'}
              `}
            >
              {/* Add Options - Grid layout on mobile */}
              <div className="grid grid-cols-3 sm:flex sm:items-center gap-1 sm:gap-2 p-2 sm:p-2 rounded-2xl bg-white dark:bg-gray-900 shadow-lg shadow-black/8 border border-gray-200/50 dark:border-gray-700/50">
                <button
                  onClick={() => { onAddPlace(); setIsExpanded(false); }}
                  className="flex flex-col items-center gap-1.5 p-3 sm:p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 transition-colors min-w-[72px] min-h-[72px] sm:min-w-0 sm:min-h-0"
                >
                  <MapPin className="w-6 h-6 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-400" />
                  <span className="text-[11px] sm:text-[10px] font-medium text-gray-500">Place</span>
                </button>
                <button
                  onClick={() => { onAddFlight(); setIsExpanded(false); }}
                  className="flex flex-col items-center gap-1.5 p-3 sm:p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 transition-colors min-w-[72px] min-h-[72px] sm:min-w-0 sm:min-h-0"
                >
                  <Plane className="w-6 h-6 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-400" />
                  <span className="text-[11px] sm:text-[10px] font-medium text-gray-500">Flight</span>
                </button>
                {onAddHotel && (
                  <button
                    onClick={() => { onAddHotel(); setIsExpanded(false); }}
                    className="flex flex-col items-center gap-1.5 p-3 sm:p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 transition-colors min-w-[72px] min-h-[72px] sm:min-w-0 sm:min-h-0"
                  >
                    <Hotel className="w-6 h-6 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-400" />
                    <span className="text-[11px] sm:text-[10px] font-medium text-gray-500">Hotel</span>
                  </button>
                )}
                {onAddTransport && (
                  <button
                    onClick={() => { onAddTransport(); setIsExpanded(false); }}
                    className="flex flex-col items-center gap-1.5 p-3 sm:p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 transition-colors min-w-[72px] min-h-[72px] sm:min-w-0 sm:min-h-0"
                  >
                    <Car className="w-6 h-6 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-400" />
                    <span className="text-[11px] sm:text-[10px] font-medium text-gray-500">Transport</span>
                  </button>
                )}
                <button
                  onClick={() => { onAddNote(); setIsExpanded(false); }}
                  className="flex flex-col items-center gap-1.5 p-3 sm:p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 transition-colors min-w-[72px] min-h-[72px] sm:min-w-0 sm:min-h-0"
                >
                  <StickyNote className="w-6 h-6 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-400" />
                  <span className="text-[11px] sm:text-[10px] font-medium text-gray-500">Note</span>
                </button>
              </div>
            </div>

            {/* Main Bar - Larger touch targets on mobile */}
            <div className="flex items-center gap-1 p-1.5 sm:p-1.5 rounded-full bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl shadow-lg shadow-black/8 border border-gray-200/60 dark:border-gray-700/60">
              {/* Add Button (Primary) - 48px on mobile */}
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={`
                  w-14 h-14 sm:w-12 sm:h-12 rounded-full flex items-center justify-center
                  transition-all duration-300
                  ${isExpanded
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 rotate-45'
                    : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:scale-105 active:scale-95'
                  }
                `}
                aria-label={isExpanded ? 'Close menu' : 'Add item'}
              >
                {isExpanded ? <X className="w-6 h-6 sm:w-5 sm:h-5" /> : <Plus className="w-6 h-6 sm:w-5 sm:h-5" />}
              </button>

              {/* Divider */}
              <div className="w-px h-8 bg-gray-200 dark:bg-gray-700 mx-0.5 sm:mx-1" />

              {/* Map Button - 44px touch target */}
              <button
                onClick={onOpenMap}
                className="w-12 h-12 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-colors"
                aria-label="Open map"
              >
                <Map className="w-5 h-5" />
              </button>

              {/* AI Plan Button - 44px touch target */}
              <button
                onClick={onAIPlan}
                disabled={isAIPlanning || isSaving}
                className={`
                  w-12 h-12 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-colors
                  ${isAIPlanning
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                  }
                  disabled:opacity-50
                `}
                aria-label="Autopilot"
              >
                <Sparkles className={`w-5 h-5 ${isAIPlanning ? 'animate-pulse' : ''}`} />
              </button>

              {/* Share Button - Desktop only to reduce clutter on mobile */}
              {onShare && (
                <button
                  onClick={onShare}
                  className="hidden sm:flex w-10 h-10 rounded-full items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors"
                  aria-label="Share trip"
                >
                  <Share2 className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Saving/Planning Indicator */}
            {(isSaving || isAIPlanning) && (
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-medium shadow-lg whitespace-nowrap">
                {isAIPlanning ? 'Autopilot...' : 'Saving...'}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
