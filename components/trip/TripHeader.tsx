'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, MoreHorizontal, ChevronDown, Plus, Pencil } from 'lucide-react';

interface TripHeaderProps {
  title: string;
  emoji?: string;
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
  collaborators?: Array<{ name: string; initials: string; color: string }>;
  notificationCount?: number;
}

export default function TripHeader({
  title,
  emoji = '🎉',
  activeContentTab,
  onContentTabChange,
  flightCount = 0,
  hotelCount = 0,
  days = [],
  selectedDayNumber = 1,
  onSelectDay,
  onSettingsClick,
  onAddClick,
  onEditClick,
  isEditMode = false,
}: TripHeaderProps) {
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  return (
    <header className="w-full mb-6 sm:mb-8">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        {/* Back Link */}
        <Link
          href="/trips"
          className="flex items-center gap-1.5 text-stone-400 dark:text-gray-500 hover:text-stone-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-xs hidden sm:inline">Trips</span>
        </Link>

        {/* Title */}
        <h1 className="text-lg sm:text-xl font-light text-stone-900 dark:text-white truncate px-4">
          {emoji} {title}
        </h1>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Desktop: Settings */}
          <button
            onClick={onSettingsClick}
            className="hidden sm:flex p-2 text-stone-400 dark:text-gray-500 hover:text-stone-900 dark:hover:text-white transition-colors"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>

          {/* Mobile: Menu */}
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="sm:hidden p-2 text-stone-400 dark:text-gray-500 hover:text-stone-900 dark:hover:text-white transition-colors"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {showMobileMenu && (
        <div className="sm:hidden absolute right-4 top-14 z-50 bg-white dark:bg-gray-900 border border-stone-200 dark:border-gray-800 rounded-xl shadow-lg py-2 min-w-[160px]">
          <button
            onClick={() => { onSettingsClick?.(); setShowMobileMenu(false); }}
            className="w-full px-4 py-2.5 text-left text-sm text-stone-700 dark:text-gray-300 hover:bg-stone-50 dark:hover:bg-gray-800"
          >
            Trip Settings
          </button>
          <button
            onClick={() => { onAddClick?.(); setShowMobileMenu(false); }}
            className="w-full px-4 py-2.5 text-left text-sm text-stone-700 dark:text-gray-300 hover:bg-stone-50 dark:hover:bg-gray-800"
          >
            Add Place
          </button>
        </div>
      )}

      {/* Content Tabs */}
      <div className="flex items-center justify-between border-b border-stone-200 dark:border-gray-800 mb-6">
        <div className="flex items-center gap-6 sm:gap-8">
          {(['itinerary', 'flights', 'hotels', 'notes'] as const).map((tab) => {
            const count = tab === 'flights' ? flightCount : tab === 'hotels' ? hotelCount : 0;
            const isHidden = tab === 'notes'; // Hide notes on mobile

            return (
              <button
                key={tab}
                onClick={() => onContentTabChange(tab)}
                className={`
                  pb-3 text-xs font-medium transition-colors capitalize
                  ${isHidden ? 'hidden sm:block' : ''}
                  ${activeContentTab === tab
                    ? 'text-stone-900 dark:text-white border-b-2 border-stone-900 dark:border-white -mb-px'
                    : 'text-stone-400 dark:text-gray-500 hover:text-stone-600 dark:hover:text-gray-300'
                  }
                `}
              >
                {tab}
                {count > 0 && (
                  <span className="ml-1.5 text-stone-300 dark:text-gray-600">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Add Button */}
        <button
          onClick={onAddClick}
          className="flex items-center justify-center w-8 h-8 mb-1 bg-stone-900 dark:bg-white text-white dark:text-gray-900 rounded-full hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Day Tabs - Only for itinerary */}
      {days.length > 0 && activeContentTab === 'itinerary' && (
        <div className="flex items-center justify-between">
          {/* Mobile: Dropdown */}
          <div className="sm:hidden relative">
            <button
              onClick={() => setShowDayPicker(!showDayPicker)}
              className="flex items-center gap-1.5 text-sm font-medium text-stone-900 dark:text-white"
            >
              Day {selectedDayNumber}
              <ChevronDown className="w-4 h-4 text-stone-400" />
            </button>
            {showDayPicker && (
              <div className="absolute left-0 top-8 z-50 bg-white dark:bg-gray-900 border border-stone-200 dark:border-gray-800 rounded-xl shadow-lg py-1 min-w-[100px]">
                {days.map((day) => (
                  <button
                    key={day.dayNumber}
                    onClick={() => { onSelectDay?.(day.dayNumber); setShowDayPicker(false); }}
                    className={`w-full px-4 py-2 text-left text-sm ${
                      day.dayNumber === selectedDayNumber
                        ? 'bg-stone-100 dark:bg-gray-800 text-stone-900 dark:text-white font-medium'
                        : 'text-stone-500 dark:text-gray-400 hover:bg-stone-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    Day {day.dayNumber}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Desktop: Day pills */}
          <div className="hidden sm:flex items-center gap-2">
            {days.map((day) => (
              <button
                key={day.dayNumber}
                onClick={() => onSelectDay?.(day.dayNumber)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  day.dayNumber === selectedDayNumber
                    ? 'bg-stone-900 dark:bg-white text-white dark:text-gray-900'
                    : 'text-stone-400 dark:text-gray-500 hover:bg-stone-100 dark:hover:bg-gray-800 hover:text-stone-600 dark:hover:text-gray-300'
                }`}
              >
                Day {day.dayNumber}
              </button>
            ))}
          </div>

          {/* Edit Toggle */}
          <button
            onClick={onEditClick}
            className={`text-xs font-medium transition-colors ${
              isEditMode
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-stone-400 dark:text-gray-500 hover:text-stone-900 dark:hover:text-white'
            }`}
          >
            {isEditMode ? 'Done' : (
              <span className="flex items-center gap-1">
                <Pencil className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Edit</span>
              </span>
            )}
          </button>
        </div>
      )}
    </header>
  );
}
