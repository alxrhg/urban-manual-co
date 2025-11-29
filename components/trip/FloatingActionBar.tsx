'use client';

import { useState, useEffect } from 'react';
import { Plus, Map, Sparkles, X, MapPin, Plane } from 'lucide-react';

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
 * FloatingActionBar - Minimal bottom action bar
 * Features: Clean design, essential actions only
 */
export default function FloatingActionBar({
  onAddPlace,
  onAddFlight,
  onAddNote,
  onOpenMap,
  onAIPlan,
  isAIPlanning = false,
  isSaving = false,
}: FloatingActionBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

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
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity md:hidden"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* Mobile FAB */}
      <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none pb-safe md:hidden">
        <div className="flex justify-center pb-6 px-4">
          <div className="pointer-events-auto relative">
            {/* Expanded Menu */}
            <div
              className={`
                absolute bottom-full left-1/2 -translate-x-1/2 mb-3
                transition-all duration-200 origin-bottom
                ${isExpanded ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}
              `}
            >
              <div className="flex items-center gap-2 p-2 rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-800">
                <button
                  onClick={() => { onAddPlace(); setIsExpanded(false); }}
                  className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors min-w-[64px]"
                >
                  <MapPin className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <span className="text-[10px] font-medium text-gray-500">Place</span>
                </button>
                <button
                  onClick={() => { onAddFlight(); setIsExpanded(false); }}
                  className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors min-w-[64px]"
                >
                  <Plane className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <span className="text-[10px] font-medium text-gray-500">Flight</span>
                </button>
              </div>
            </div>

            {/* Main Bar */}
            <div className="flex items-center gap-1 p-1.5 rounded-full bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-800">
              {/* Add Button */}
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={`
                  w-12 h-12 rounded-full flex items-center justify-center
                  transition-all duration-200
                  ${isExpanded
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 rotate-45'
                    : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                  }
                `}
                aria-label={isExpanded ? 'Close menu' : 'Add item'}
              >
                {isExpanded ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              </button>

              {/* Divider */}
              <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />

              {/* Map Button */}
              <button
                onClick={onOpenMap}
                className="w-10 h-10 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors"
                aria-label="Open map"
              >
                <Map className="w-5 h-5" />
              </button>

              {/* AI Plan Button */}
              <button
                onClick={onAIPlan}
                disabled={isAIPlanning || isSaving}
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center transition-colors
                  ${isAIPlanning
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                    : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                  }
                  disabled:opacity-50
                `}
                aria-label="AI Autopilot"
              >
                <Sparkles className={`w-5 h-5 ${isAIPlanning ? 'animate-pulse' : ''}`} />
              </button>
            </div>

            {/* Status Indicator */}
            {(isSaving || isAIPlanning) && (
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[10px] font-medium shadow-lg">
                {isAIPlanning ? 'Planning...' : 'Saving...'}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
