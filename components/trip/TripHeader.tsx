'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Bell, Map, Settings, UserPlus, Sparkles, Plus, Pencil, MoreHorizontal, ChevronDown } from 'lucide-react';

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
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showDayPicker, setShowDayPicker] = useState(false);

  const selectedDay = days.find(d => d.dayNumber === selectedDayNumber);

  return (
    <header className="w-full overflow-hidden">
      {/* Top Bar: Back + Title + Icons */}
      <div className="flex items-center justify-between py-2 sm:py-3">
        {/* Back Button */}
        <Link
          href="/trips"
          className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors flex-shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>

        {/* Centered Title with Emoji */}
        <h1 className="flex-1 text-center text-base font-semibold text-gray-900 dark:text-white truncate px-3">
          {emoji} {title}
        </h1>

        {/* Right Icons - minimal on mobile */}
        <div className="flex items-center flex-shrink-0">
          {/* Desktop: Show all icons */}
          <div className="hidden sm:flex items-center gap-1">
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
                <button className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors border-2 border-white dark:border-gray-950">
                  <UserPlus className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <button className="relative p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
              <Bell className="w-5 h-5" />
              {notificationCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {notificationCount}
                </span>
              )}
            </button>
            <button className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
              <Map className="w-5 h-5" />
            </button>
            <button onClick={onSettingsClick} className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
              <Settings className="w-5 h-5" />
            </button>
          </div>

          {/* Mobile: Only menu button */}
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="sm:hidden p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors relative"
          >
            <MoreHorizontal className="w-5 h-5" />
            {notificationCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {showMobileMenu && (
        <div className="sm:hidden absolute right-4 top-12 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg py-1 min-w-[140px]">
          <button
            onClick={() => { onSettingsClick?.(); setShowMobileMenu(false); }}
            className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
          >
            <Settings className="w-4 h-4" /> Settings
          </button>
          <button className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2">
            <Map className="w-4 h-4" /> Map
          </button>
          <button className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2">
            <Bell className="w-4 h-4" /> Notifications
            {notificationCount > 0 && <span className="ml-auto text-xs text-red-500">{notificationCount}</span>}
          </button>
          <button className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2">
            <UserPlus className="w-4 h-4" /> Invite
          </button>
        </div>
      )}

      {/* Hero Image - hidden on mobile */}
      {heroImage && (
        <div className="hidden sm:block relative w-full h-48 md:h-56 rounded-2xl overflow-hidden mb-6">
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
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 mb-2 sm:mb-4">
        {/* Tabs */}
        <div className="flex items-center gap-4 sm:gap-6">
          <button
            onClick={() => onContentTabChange('itinerary')}
            className={`pb-2 sm:pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeContentTab === 'itinerary'
                ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white'
                : 'border-transparent text-gray-500 dark:text-gray-400'
            }`}
          >
            Itinerary
          </button>
          <button
            onClick={() => onContentTabChange('flights')}
            className={`pb-2 sm:pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1 ${
              activeContentTab === 'flights'
                ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white'
                : 'border-transparent text-gray-500 dark:text-gray-400'
            }`}
          >
            Flights
            {flightCount > 0 && <span className="text-xs text-gray-400">({flightCount})</span>}
          </button>
          <button
            onClick={() => onContentTabChange('hotels')}
            className={`pb-2 sm:pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1 ${
              activeContentTab === 'hotels'
                ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white'
                : 'border-transparent text-gray-500 dark:text-gray-400'
            }`}
          >
            Hotels
            {hotelCount > 0 && <span className="text-xs text-gray-400">({hotelCount})</span>}
          </button>
          {/* Notes - hidden on mobile */}
          <button
            onClick={() => onContentTabChange('notes')}
            className={`hidden sm:block pb-2 sm:pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeContentTab === 'notes'
                ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white'
                : 'border-transparent text-gray-500 dark:text-gray-400'
            }`}
          >
            Notes
          </button>
        </div>

        {/* Action Button - single on mobile */}
        <button
          onClick={onAddClick}
          className="flex items-center justify-center w-8 h-8 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Day Tabs Row - Compact on mobile */}
      {days.length > 0 && activeContentTab === 'itinerary' && (
        <div className="flex items-center justify-between mb-2 sm:mb-4">
          {/* Mobile: Day Picker Dropdown */}
          <div className="sm:hidden relative">
            <button
              onClick={() => setShowDayPicker(!showDayPicker)}
              className="flex items-center gap-1 text-sm font-medium text-gray-900 dark:text-white"
            >
              Day {selectedDayNumber}
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
            {showDayPicker && (
              <div className="absolute left-0 top-8 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg py-1 min-w-[100px]">
                {days.map((day) => (
                  <button
                    key={day.dayNumber}
                    onClick={() => { onSelectDay?.(day.dayNumber); setShowDayPicker(false); }}
                    className={`w-full px-3 py-2 text-left text-sm ${
                      day.dayNumber === selectedDayNumber
                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-medium'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    Day {day.dayNumber}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Desktop: Day tabs */}
          <div className="hidden sm:flex items-center gap-4">
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
            className={`flex items-center gap-1 text-sm font-medium transition-colors ${
              isEditMode
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {isEditMode ? 'Done' : <><Pencil className="w-3.5 h-3.5" /><span className="hidden sm:inline">Edit</span></>}
          </button>
        </div>
      )}
    </header>
  );
}
