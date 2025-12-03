'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Settings, Sparkles, Plus, FileText, Loader2, Bell, BookOpen, Pencil, Check } from 'lucide-react';

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
  isPlanning?: boolean;
  notificationCount?: number;
}

/**
 * TripHeader - Clean header matching Figma design
 * Features: Hero image, emoji title, tabs with badges, day selector with edit
 */
export default function TripHeader({
  title,
  emoji,
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
  notificationCount = 0,
}: TripHeaderProps) {
  return (
    <header className="w-full mb-6">
      {/* Top Bar: Back + Title + Icons */}
      <div className="flex items-center justify-between mb-5">
        {/* Left: Back to Trips */}
        <Link
          href="/trips"
          className="flex items-center gap-1.5 text-sm text-stone-500 dark:text-gray-400 hover:text-stone-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Trips</span>
        </Link>

        {/* Center: Emoji + Title */}
        <div className="flex items-center gap-2">
          {emoji && <span className="text-2xl">{emoji}</span>}
          <h1 className="text-xl font-semibold text-stone-900 dark:text-white">
            {title}
          </h1>
        </div>

        {/* Right: Icons */}
        <div className="flex items-center gap-1">
          {/* Notification Bell */}
          <button className="relative p-2 hover:bg-stone-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
            <Bell className="w-5 h-5 text-stone-400 dark:text-gray-500" />
            {notificationCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-orange-500 text-white text-[10px] font-medium rounded-full flex items-center justify-center">
                {notificationCount}
              </span>
            )}
          </button>

          {/* Guide/Book Icon */}
          <button className="p-2 hover:bg-stone-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
            <BookOpen className="w-5 h-5 text-stone-400 dark:text-gray-500" />
          </button>

          {/* Settings */}
          <button
            onClick={onSettingsClick}
            className="p-2 hover:bg-stone-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <Settings className="w-5 h-5 text-stone-400 dark:text-gray-500" />
          </button>
        </div>
      </div>

      {/* Hero Image */}
      {heroImage && (
        <div className="relative w-full h-48 sm:h-64 rounded-2xl overflow-hidden mb-6">
          <Image
            src={heroImage}
            alt={title}
            fill
            className="object-cover"
            priority
          />
        </div>
      )}

      {/* Content Tabs Row */}
      <div className="flex items-center justify-between mb-4">
        {/* Tabs */}
        <div className="flex items-center gap-6">
          {/* Itinerary Tab */}
          <button
            onClick={() => onContentTabChange('itinerary')}
            className={`text-sm font-medium transition-colors ${
              activeContentTab === 'itinerary'
                ? 'text-stone-900 dark:text-white'
                : 'text-stone-400 dark:text-gray-500 hover:text-stone-600 dark:hover:text-gray-300'
            }`}
          >
            Itinerary
          </button>

          {/* Flights Tab */}
          <button
            onClick={() => onContentTabChange('flights')}
            className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
              activeContentTab === 'flights'
                ? 'text-stone-900 dark:text-white'
                : 'text-stone-400 dark:text-gray-500 hover:text-stone-600 dark:hover:text-gray-300'
            }`}
          >
            {flightCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-stone-200 dark:bg-gray-700 text-xs flex items-center justify-center">
                {flightCount}
              </span>
            )}
            Flights
          </button>

          {/* Hotels Tab */}
          <button
            onClick={() => onContentTabChange('hotels')}
            className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
              activeContentTab === 'hotels'
                ? 'text-stone-900 dark:text-white'
                : 'text-stone-400 dark:text-gray-500 hover:text-stone-600 dark:hover:text-gray-300'
            }`}
          >
            {hotelCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-stone-200 dark:bg-gray-700 text-xs flex items-center justify-center">
                {hotelCount}
              </span>
            )}
            Hotels
          </button>

          {/* Notes Tab */}
          <button
            onClick={() => onContentTabChange('notes')}
            className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
              activeContentTab === 'notes'
                ? 'text-stone-900 dark:text-white'
                : 'text-stone-400 dark:text-gray-500 hover:text-stone-600 dark:hover:text-gray-300'
            }`}
          >
            <FileText className="w-4 h-4" />
            Notes
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onAutoplanClick}
            disabled={isPlanning}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-stone-900 dark:bg-white dark:text-gray-900 rounded-full hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {isPlanning ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {isPlanning ? 'Planning...' : 'Auto-plan'}
          </button>
          <button
            onClick={onAddClick}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-stone-700 dark:text-gray-300 border border-stone-200 dark:border-gray-700 rounded-full hover:bg-stone-50 dark:hover:bg-gray-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
      </div>

      {/* Day Pills Row (only for itinerary tab) */}
      {days.length > 0 && activeContentTab === 'itinerary' && (
        <div className="flex items-center justify-between">
          {/* Day Pills */}
          <div className="flex items-center gap-2">
            {days.map((day) => (
              <button
                key={day.dayNumber}
                onClick={() => onSelectDay?.(day.dayNumber)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  day.dayNumber === selectedDayNumber
                    ? 'text-stone-900 dark:text-white'
                    : 'text-stone-400 dark:text-gray-500 hover:text-stone-600 dark:hover:text-gray-300'
                }`}
              >
                Day {day.dayNumber}
              </button>
            ))}
          </div>

          {/* Edit Button */}
          <button
            onClick={onEditClick}
            className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
              isEditMode
                ? 'text-stone-900 dark:text-white'
                : 'text-stone-400 dark:text-gray-500 hover:text-stone-600 dark:hover:text-gray-300'
            }`}
          >
            {isEditMode ? (
              <>
                <Check className="w-4 h-4" />
                Done
              </>
            ) : (
              <>
                <Pencil className="w-4 h-4" />
                Edit
              </>
            )}
          </button>
        </div>
      )}
    </header>
  );
}
