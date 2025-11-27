'use client';

import { useState } from 'react';
import { Plus, Map, Sparkles, Share2, MoreHorizontal, X, MapPin, Plane, StickyNote } from 'lucide-react';

interface FloatingActionBarProps {
  onAddPlace: () => void;
  onAddFlight: () => void;
  onAddNote: () => void;
  onOpenMap: () => void;
  onAIPlan: () => void;
  onShare?: () => void;
  isAIPlanning?: boolean;
  isSaving?: boolean;
}

/**
 * FloatingActionBar - Bottom floating action bar with expanding menu
 * Journal aesthetic: Glass morphism, smooth expand animation
 */
export default function FloatingActionBar({
  onAddPlace,
  onAddFlight,
  onAddNote,
  onOpenMap,
  onAIPlan,
  onShare,
  isAIPlanning = false,
  isSaving = false,
}: FloatingActionBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      {/* Backdrop */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* Action Bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        {/* Expanded Menu */}
        <div
          className={`
            absolute bottom-full left-1/2 -translate-x-1/2 mb-3
            flex flex-col items-center gap-2
            transition-all duration-300 origin-bottom
            ${isExpanded ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4 pointer-events-none'}
          `}
        >
          {/* Add Options */}
          <div className="flex items-center gap-2 p-2 rounded-2xl bg-white dark:bg-stone-900 shadow-2xl shadow-black/20">
            <button
              onClick={() => { onAddPlace(); setIsExpanded(false); }}
              className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              <MapPin className="w-5 h-5 text-stone-600 dark:text-stone-400" />
              <span className="text-[10px] font-medium text-stone-500">Place</span>
            </button>
            <button
              onClick={() => { onAddFlight(); setIsExpanded(false); }}
              className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              <Plane className="w-5 h-5 text-stone-600 dark:text-stone-400" />
              <span className="text-[10px] font-medium text-stone-500">Flight</span>
            </button>
            <button
              onClick={() => { onAddNote(); setIsExpanded(false); }}
              className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              <StickyNote className="w-5 h-5 text-stone-600 dark:text-stone-400" />
              <span className="text-[10px] font-medium text-stone-500">Note</span>
            </button>
          </div>
        </div>

        {/* Main Bar */}
        <div className="flex items-center gap-1 p-1.5 rounded-full bg-white/90 dark:bg-stone-900/90 backdrop-blur-xl shadow-2xl shadow-black/20 border border-stone-200/50 dark:border-stone-700/50">
          {/* Add Button (Primary) */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`
              w-12 h-12 rounded-full flex items-center justify-center
              transition-all duration-300
              ${isExpanded
                ? 'bg-stone-900 dark:bg-white text-white dark:text-stone-900 rotate-45'
                : 'bg-stone-900 dark:bg-white text-white dark:text-stone-900 hover:scale-105'
              }
            `}
          >
            {isExpanded ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          </button>

          {/* Divider */}
          <div className="w-px h-8 bg-stone-200 dark:bg-stone-700 mx-1" />

          {/* Map Button */}
          <button
            onClick={onOpenMap}
            className="w-10 h-10 rounded-full flex items-center justify-center text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-white transition-colors"
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
                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                : 'text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-white'
              }
              disabled:opacity-50
            `}
          >
            <Sparkles className={`w-5 h-5 ${isAIPlanning ? 'animate-pulse' : ''}`} />
          </button>

          {/* Share Button */}
          {onShare && (
            <button
              onClick={onShare}
              className="w-10 h-10 rounded-full flex items-center justify-center text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-white transition-colors"
            >
              <Share2 className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Saving Indicator */}
        {isSaving && (
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-stone-900 dark:bg-white text-white dark:text-stone-900 text-xs font-medium shadow-lg">
            Saving...
          </div>
        )}
      </div>
    </>
  );
}
