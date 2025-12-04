'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Settings, Sparkles, Plus, Pencil, Loader2 } from 'lucide-react';

interface TripHeaderProps {
  title: string;
  heroImage?: string;
  activeContentTab: 'itinerary' | 'flights' | 'hotels' | 'notes';
  onContentTabChange: (tab: 'itinerary' | 'flights' | 'hotels' | 'notes') => void;
  flightCount?: number;
  hotelCount?: number;
  days?: Array<{ dayNumber: number }>;
  selectedDayNumber?: number;
  onSelectDay?: (dayNumber: number) => void;
  onSettingsClick?: () => void;
  onAutoplanClick?: () => void;
  onAddClick?: () => void;
  onEditClick?: () => void;
  isEditMode?: boolean;
  isPlanning?: boolean;
}

/**
 * TripHeader - Clean header matching /trips design
 */
export default function TripHeader({
  title,
  heroImage,
  activeContentTab,
  onContentTabChange,
  flightCount = 0,
  hotelCount = 0,
  days = [],
  selectedDayNumber = 1,
  onSelectDay,
  onSettingsClick,
  onAutoplanClick,
  onAddClick,
  onEditClick,
  isEditMode = false,
  isPlanning = false,
}: TripHeaderProps) {
  return (
    <header className="w-full mb-6">
      {/* Top Bar - Matching /trips header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-6">
        {/* Back Link */}
        <Link
          href="/trips"
          className="flex items-center gap-1.5 text-xs text-stone-400 dark:text-gray-500 hover:text-stone-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Trips</span>
        </Link>

        {/* Title */}
        <h1 className="text-xl sm:text-2xl font-light text-stone-900 dark:text-white truncate">
          {title}
        </h1>

        {/* Spacer */}
        <div className="hidden sm:block flex-1" />

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onAutoplanClick}
            disabled={isPlanning}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-stone-900 dark:bg-white text-white dark:text-gray-900 text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50 min-h-[40px]"
          >
            {isPlanning ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            {isPlanning ? 'Planning...' : 'Auto-plan'}
          </button>
          <button
            onClick={onAddClick}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white dark:bg-gray-900 border border-stone-200 dark:border-gray-800 text-stone-700 dark:text-gray-300 text-xs font-medium hover:border-stone-300 dark:hover:border-gray-700 transition-colors min-h-[40px]"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
          <button
            onClick={onSettingsClick}
            className="p-2.5 rounded-full hover:bg-stone-100 dark:hover:bg-gray-800 text-stone-400 dark:text-gray-500 hover:text-stone-900 dark:hover:text-white transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Hero Image */}
      {heroImage && (
        <div className="relative w-full h-40 sm:h-48 rounded-2xl overflow-hidden mb-6">
          <Image
            src={heroImage}
            alt={title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 800px"
          />
        </div>
      )}

      {/* Content Tabs - Matching /trips tab style */}
      <div className="mb-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-x-1 sm:gap-x-4 text-xs overflow-x-auto scrollbar-hide -mx-1 px-1">
            {[
              { key: 'itinerary', label: 'Itinerary', count: 0 },
              { key: 'flights', label: 'Flights', count: flightCount },
              { key: 'hotels', label: 'Hotels', count: hotelCount },
              { key: 'notes', label: 'Notes', count: 0 },
            ].map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => onContentTabChange(key as typeof activeContentTab)}
                className={`
                  transition-all flex items-center gap-1.5 whitespace-nowrap
                  px-3 py-2 sm:px-2 sm:py-1 rounded-full sm:rounded-none
                  min-h-[40px] sm:min-h-0
                  ${activeContentTab === key
                    ? 'font-medium text-stone-900 dark:text-white bg-stone-100 dark:bg-gray-800 sm:bg-transparent sm:dark:bg-transparent'
                    : 'font-medium text-stone-400 dark:text-gray-500 hover:text-stone-600 dark:hover:text-gray-300'
                  }
                `}
              >
                {count > 0 && (
                  <span className={`
                    w-4 h-4 rounded-full text-[10px] flex items-center justify-center
                    ${activeContentTab === key
                      ? 'bg-stone-200 dark:bg-gray-700'
                      : 'bg-stone-100 dark:bg-gray-800'
                    }
                  `}>
                    {count}
                  </span>
                )}
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Day Tabs Row (only for itinerary tab) */}
      {days.length > 0 && activeContentTab === 'itinerary' && (
        <div className="flex items-center justify-between">
          {/* Day Pills */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
            {days.map((day) => (
              <button
                key={day.dayNumber}
                onClick={() => onSelectDay?.(day.dayNumber)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors whitespace-nowrap min-h-[32px] ${
                  day.dayNumber === selectedDayNumber
                    ? 'bg-stone-900 dark:bg-white text-white dark:text-gray-900'
                    : 'text-stone-400 dark:text-gray-500 hover:bg-stone-100 dark:hover:bg-gray-800 hover:text-stone-600 dark:hover:text-gray-300'
                }`}
              >
                Day {day.dayNumber}
              </button>
            ))}
          </div>

          {/* Edit Button */}
          <button
            onClick={onEditClick}
            className={`flex items-center gap-1.5 text-xs font-medium transition-colors flex-shrink-0 ${
              isEditMode
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-stone-400 dark:text-gray-500 hover:text-stone-900 dark:hover:text-white'
            }`}
          >
            {isEditMode ? (
              'Done'
            ) : (
              <>
                <Pencil className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Edit</span>
              </>
            )}
          </button>
        </div>
      )}
    </header>
  );
}
