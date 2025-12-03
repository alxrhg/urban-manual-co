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
  collaborators = [],
  notificationCount = 0,
}: TripHeaderProps) {
  return (
    <header className="w-full">
      {/* Top Bar: Back + Title + Icons */}
      <div className="flex items-center justify-between py-4">
        {/* Back Button */}
        <Link
          href="/trips"
          className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Trips</span>
        </Link>

        {/* Centered Title with Emoji */}
        <h1 className="absolute left-1/2 -translate-x-1/2 text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <span>{emoji}</span>
          <span>{title}</span>
        </h1>

        {/* Right Icons */}
        <div className="flex items-center gap-1">
          {/* Collaborators */}
          {collaborators.length > 0 && (
            <div className="flex items-center -space-x-2 mr-2">
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
          <button className="relative p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            <Bell className="w-5 h-5" />
            {notificationCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            )}
          </button>

          {/* Map Icon */}
          <button className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            <Map className="w-5 h-5" />
          </button>

          {/* Settings */}
          <button
            onClick={onSettingsClick}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Hero Image */}
      {heroImage && (
        <div className="relative w-full h-48 sm:h-56 md:h-64 rounded-2xl overflow-hidden mb-6">
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
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 mb-4">
        {/* Tabs */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => onContentTabChange('itinerary')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeContentTab === 'itinerary'
                ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Itinerary
          </button>
          <button
            onClick={() => onContentTabChange('flights')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeContentTab === 'flights'
                ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {flightCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 text-xs flex items-center justify-center">
                {flightCount}
              </span>
            )}
            Flights
          </button>
          <button
            onClick={() => onContentTabChange('hotels')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeContentTab === 'hotels'
                ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {hotelCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 text-xs flex items-center justify-center">
                {hotelCount}
              </span>
            )}
            Hotels
          </button>
          <button
            onClick={() => onContentTabChange('notes')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeContentTab === 'notes'
                ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Notes
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onAutoplanClick}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded-full hover:opacity-90 transition-opacity"
          >
            <Sparkles className="w-4 h-4" />
            Auto-plan
          </button>
          <button
            onClick={onAddClick}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
      </div>

      {/* Day Tabs Row */}
      {days.length > 0 && (
        <div className="flex items-center justify-between mb-4">
          {/* Day Tabs */}
          <div className="flex items-center gap-4">
            {days.map((day) => (
              <button
                key={day.dayNumber}
                onClick={() => onSelectDay?.(day.dayNumber)}
                className={`text-sm font-medium transition-colors ${
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
            className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <Pencil className="w-4 h-4" />
            Edit
          </button>
        </div>
      )}
    </header>
  );
}
