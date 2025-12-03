'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Bell, Map, Settings, UserPlus, Sparkles, Plus, Pencil } from 'lucide-react';

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

/**
 * TripHeader - Figma-inspired header for trip pages
 * Features: Centered title with emoji, hero image, content tabs with counts, day tabs
 */
export default function TripHeader({
  title,
  emoji = '🎉',
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
  collaborators = [],
  notificationCount = 0,
}: TripHeaderProps) {
  return (
    <header className="w-full overflow-hidden">
      {/* Top Bar: Back + Title + Icons */}
      <div className="flex items-center justify-between py-3">
        {/* Back Button */}
        <Link
          href="/trips"
          className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors flex-shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Trips</span>
        </Link>

        {/* Centered Title with Emoji */}
        <h1 className="flex-1 text-center text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate px-2">
          <span className="mr-1.5">{emoji}</span>
          <span className="truncate">{title}</span>
        </h1>

        {/* Right Icons */}
        <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
          {/* Collaborators - hidden on mobile */}
          {collaborators.length > 0 && (
            <div className="hidden sm:flex items-center -space-x-2 mr-2">
              {collaborators.slice(0, 2).map((collab, i) => (
                <div
                  key={i}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium text-white border-2 border-white dark:border-gray-950"
                  style={{ backgroundColor: collab.color }}
                >
                  {collab.initials}
                </div>
              ))}
              <button className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors border-2 border-white dark:border-gray-950">
                <UserPlus className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Notification Bell */}
          <button className="relative p-1.5 sm:p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            <Bell className="w-5 h-5" />
            {notificationCount > 0 && (
              <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            )}
          </button>

          {/* Map Icon - hidden on small mobile */}
          <button className="hidden xs:block p-1.5 sm:p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            <Map className="w-5 h-5" />
          </button>

          {/* Settings */}
          <button
            onClick={onSettingsClick}
            className="p-1.5 sm:p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Hero Image */}
      {heroImage && (
        <div className="relative w-full h-40 sm:h-48 md:h-56 rounded-xl sm:rounded-2xl overflow-hidden mb-4 sm:mb-6">
          <Image
            src={heroImage}
            alt={title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
          />
        </div>
      )}

      {/* Content Tabs Row */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 mb-3 sm:mb-4 gap-2">
        {/* Tabs - scrollable on mobile */}
        <div className="flex items-center gap-4 sm:gap-6 overflow-x-auto scrollbar-hide flex-1 min-w-0">
          <button
            onClick={() => onContentTabChange('itinerary')}
            className={`pb-2.5 sm:pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
              activeContentTab === 'itinerary'
                ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Itinerary
          </button>
          <button
            onClick={() => onContentTabChange('flights')}
            className={`pb-2.5 sm:pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1 whitespace-nowrap flex-shrink-0 ${
              activeContentTab === 'flights'
                ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {flightCount > 0 && (
              <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-gray-200 dark:bg-gray-700 text-[10px] sm:text-xs flex items-center justify-center">
                {flightCount}
              </span>
            )}
            Flights
          </button>
          <button
            onClick={() => onContentTabChange('hotels')}
            className={`pb-2.5 sm:pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1 whitespace-nowrap flex-shrink-0 ${
              activeContentTab === 'hotels'
                ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {hotelCount > 0 && (
              <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-gray-200 dark:bg-gray-700 text-[10px] sm:text-xs flex items-center justify-center">
                {hotelCount}
              </span>
            )}
            Hotels
          </button>
          <button
            onClick={() => onContentTabChange('notes')}
            className={`pb-2.5 sm:pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
              activeContentTab === 'notes'
                ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Notes
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <button
            onClick={onAutoplanClick}
            className="flex items-center gap-1 px-2 sm:px-3 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs sm:text-sm font-medium rounded-full hover:opacity-90 transition-opacity"
          >
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Auto-plan</span>
          </button>
          <button
            onClick={onAddClick}
            className="flex items-center justify-center w-8 h-8 sm:w-auto sm:h-auto sm:gap-1.5 sm:px-3 sm:py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add</span>
          </button>
        </div>
      </div>

      {/* Day Tabs Row */}
      {days.length > 0 && activeContentTab === 'itinerary' && (
        <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
          {/* Day Tabs - scrollable */}
          <div className="flex items-center gap-3 sm:gap-4 overflow-x-auto scrollbar-hide flex-1 min-w-0">
            {days.map((day) => (
              <button
                key={day.dayNumber}
                onClick={() => onSelectDay?.(day.dayNumber)}
                className={`text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                  day.dayNumber === selectedDayNumber
                    ? 'text-gray-900 dark:text-white'
                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              >
                Day {day.dayNumber}
              </button>
            ))}
          </div>

          {/* Edit Button */}
          <button
            onClick={onEditClick}
            className={`flex items-center gap-1 text-sm font-medium transition-colors flex-shrink-0 ${
              isEditMode
                ? 'text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
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
