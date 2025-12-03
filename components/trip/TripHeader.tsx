'use client';

import Link from 'next/link';
import { ArrowLeft, Settings, Sparkles, Plus, Pencil, Check, StickyNote, Loader2 } from 'lucide-react';

interface TripHeaderProps {
  title: string;
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
 * TripHeader - Clean, minimal header for trip pages
 * Features: Simple tabs with badges, day selector, action buttons
 */
export default function TripHeader({
  title,
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
  const tabs = ['itinerary', 'flights', 'hotels', 'notes'] as const;

  return (
    <header className="w-full mb-4">
      {/* Top Bar: Back + Title + Settings */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/trips"
          className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-gray-400 hover:text-stone-900 dark:hover:text-white transition-colors min-h-[44px] -ml-2 pl-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Trips</span>
        </Link>

        <div className="flex-1" />

        <h1 className="text-xl sm:text-2xl font-light text-stone-900 dark:text-white truncate">
          {title}
        </h1>

        <div className="flex-1" />

        <button
          onClick={onSettingsClick}
          className="p-2.5 hover:bg-stone-100 dark:hover:bg-gray-800 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          title="Settings"
        >
          <Settings className="w-5 h-5 text-stone-500 dark:text-gray-400" />
        </button>
      </div>

      {/* Tab Navigation Row */}
      <div className="flex items-center justify-between gap-4 mb-4">
        {/* Tabs */}
        <div className="flex gap-x-1 sm:gap-x-4 text-xs overflow-x-auto -mx-1 px-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => onContentTabChange(tab)}
              className={`
                transition-all flex items-center gap-1.5 whitespace-nowrap
                px-3 py-2 sm:px-2 sm:py-1 rounded-full sm:rounded-none
                min-h-[40px] sm:min-h-0
                ${activeContentTab === tab
                  ? 'font-medium text-stone-900 dark:text-white bg-stone-100 dark:bg-gray-800 sm:bg-transparent sm:dark:bg-transparent'
                  : 'font-medium text-stone-400 dark:text-gray-500 hover:text-stone-600 dark:hover:text-gray-300'
                }
              `}
            >
              {tab === 'notes' && <StickyNote className="w-3.5 h-3.5 sm:w-3 sm:h-3" />}
              {tab === 'flights' && flightCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-stone-200 dark:bg-gray-700 text-[10px] flex items-center justify-center">
                  {flightCount}
                </span>
              )}
              {tab === 'hotels' && hotelCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-stone-200 dark:bg-gray-700 text-[10px] flex items-center justify-center">
                  {hotelCount}
                </span>
              )}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onAutoplanClick}
            disabled={isPlanning}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-stone-900 dark:bg-white dark:text-gray-900 rounded-full hover:opacity-80 disabled:opacity-50 transition-opacity"
          >
            {isPlanning ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Sparkles className="w-3 h-3" />
            )}
            {isPlanning ? 'Planning...' : 'Auto-plan'}
          </button>
          <button
            onClick={onAddClick}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-stone-200 dark:border-gray-800 rounded-full hover:bg-stone-50 dark:hover:bg-gray-800 transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add
          </button>
        </div>
      </div>

      {/* Day Tabs Row (only for itinerary tab) */}
      {days.length > 0 && activeContentTab === 'itinerary' && (
        <div className="flex items-center gap-4 mb-4">
          {/* Day Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto">
            {days.map((day) => (
              <button
                key={day.dayNumber}
                onClick={() => onSelectDay?.(day.dayNumber)}
                className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors whitespace-nowrap ${
                  day.dayNumber === selectedDayNumber
                    ? 'bg-stone-900 dark:bg-white text-white dark:text-gray-900'
                    : 'text-stone-400 dark:text-gray-500 hover:bg-stone-100 dark:hover:bg-gray-800 hover:text-stone-600 dark:hover:text-gray-300'
                }`}
              >
                Day {day.dayNumber}
              </button>
            ))}
          </div>

          <div className="flex-1" />

          {/* Edit Button */}
          <button
            onClick={onEditClick}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              isEditMode
                ? 'bg-stone-900 dark:bg-white text-white dark:text-gray-900'
                : 'text-stone-500 dark:text-gray-400 hover:bg-stone-100 dark:hover:bg-gray-800'
            }`}
          >
            {isEditMode ? (
              <>
                <Check className="w-3 h-3" />
                Done
              </>
            ) : (
              <>
                <Pencil className="w-3 h-3" />
                Edit
              </>
            )}
          </button>
        </div>
      )}
    </header>
  );
}
