'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Settings, Sparkles, Plus, Pencil, Loader2, Map, ChevronDown, Utensils, Coffee, Building2, Plane, Hotel, Car, Waves, FileText, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Trip } from '@/types/trip';
import { parseDestinations, formatDestinations } from '@/types/trip';
import type { TripDay } from '@/lib/hooks/useTripEditor';

export type AddItemType = 'restaurant' | 'cafe' | 'attraction' | 'flight' | 'hotel' | 'transport' | 'hotel-activity' | 'custom-note';

interface TripHeaderProps {
  title: string;
  trip?: Trip;
  heroImage?: string;
  activeContentTab: 'itinerary' | 'flights' | 'hotels' | 'notes';
  onContentTabChange: (tab: 'itinerary' | 'flights' | 'hotels' | 'notes') => void;
  flightCount?: number;
  hotelCount?: number;
  diningCount?: number;
  days?: TripDay[];
  selectedDayNumber?: number;
  onSelectDay?: (dayNumber: number) => void;
  onSettingsClick?: () => void;
  onAutoplanClick?: () => void;
  onAddClick?: () => void;
  onAddItemClick?: (type: AddItemType) => void;
  onEditClick?: () => void;
  isEditMode?: boolean;
  isPlanning?: boolean;
  onMapClick?: () => void;
  travelerCount?: number;
}

/**
 * Format date range for display (e.g., "Dec 14-16, 2025")
 */
function formatDateRange(startDate: string | null, endDate: string | null): string {
  if (!startDate) return '';

  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : start;

  const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
  const startDay = start.getDate();
  const endDay = end.getDate();
  const year = start.getFullYear();

  // Same month
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    if (startDay === endDay) {
      return `${startMonth} ${startDay}, ${year}`;
    }
    return `${startMonth} ${startDay}-${endDay}, ${year}`;
  }

  // Different months
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
}

/**
 * Add item dropdown menu items
 */
const addMenuItems: Array<{ type: AddItemType; label: string; icon: React.ReactNode }> = [
  { type: 'restaurant', label: 'Restaurant', icon: <Utensils className="w-4 h-4" /> },
  { type: 'cafe', label: 'Cafe', icon: <Coffee className="w-4 h-4" /> },
  { type: 'attraction', label: 'Attraction', icon: <Building2 className="w-4 h-4" /> },
  { type: 'flight', label: 'Flight', icon: <Plane className="w-4 h-4" /> },
  { type: 'hotel', label: 'Hotel', icon: <Hotel className="w-4 h-4" /> },
  { type: 'transport', label: 'Transport', icon: <Car className="w-4 h-4" /> },
  { type: 'hotel-activity', label: 'Hotel Activity', icon: <Waves className="w-4 h-4" /> },
  { type: 'custom-note', label: 'Custom note', icon: <FileText className="w-4 h-4" /> },
];

/**
 * Calculate trip duration in days
 */
function calculateTripDays(startDate: string | null, endDate: string | null): number {
  if (!startDate) return 0;
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : start;
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Calculate day fullness percentage based on items and typical 12-hour day
 */
function calculateDayFullness(day: TripDay): number {
  const totalMinutesInDay = 12 * 60; // 12 active hours
  let usedMinutes = 0;

  for (const item of day.items) {
    const duration = item.parsedNotes?.duration || 60;
    usedMinutes += duration;
  }

  return Math.min(100, Math.round((usedMinutes / totalMinutesInDay) * 100));
}

/**
 * TripHeader - Redesigned header with stat pills and visual day selector
 */
export default function TripHeader({
  title,
  trip,
  heroImage,
  activeContentTab,
  onContentTabChange,
  flightCount = 0,
  hotelCount = 0,
  diningCount = 0,
  days = [],
  selectedDayNumber = 1,
  onSelectDay,
  onSettingsClick,
  onAutoplanClick,
  onAddClick,
  onAddItemClick,
  onEditClick,
  isEditMode = false,
  isPlanning = false,
  onMapClick,
  travelerCount = 1,
}: TripHeaderProps) {
  // Parse trip metadata
  const dateRange = trip ? formatDateRange(trip.start_date, trip.end_date) : '';
  const tripDays = trip ? calculateTripDays(trip.start_date, trip.end_date) : days.length;

  // Calculate dining count from days if not provided
  const actualDiningCount = diningCount || days.reduce((count, day) => {
    return count + day.items.filter(item =>
      ['restaurant', 'bar', 'cafe'].includes(item.parsedNotes?.type || item.parsedNotes?.category || '')
    ).length;
  }, 0);

  // Build metadata string
  const metaParts: string[] = [];
  if (dateRange) metaParts.push(dateRange);
  if (tripDays > 0) metaParts.push(`${tripDays} day${tripDays !== 1 ? 's' : ''}`);
  if (travelerCount > 0) metaParts.push(`${travelerCount} traveler${travelerCount !== 1 ? 's' : ''}`);

  // Format day for visual day selector
  const formatDayDate = (date: string | null): { weekday: string; dayNum: string } => {
    if (!date) return { weekday: '', dayNum: '' };
    try {
      const d = new Date(date);
      return {
        weekday: d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
        dayNum: d.getDate().toString(),
      };
    } catch {
      return { weekday: '', dayNum: '' };
    }
  };

  return (
    <header className="w-full mb-6">
      {/* Navigation Row */}
      <div className="flex items-center justify-between mb-4">
        <Link
          href="/trips"
          className="flex items-center gap-1.5 text-xs text-stone-400 dark:text-gray-500 hover:text-stone-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Trips</span>
        </Link>
        <div className="flex items-center gap-1">
          <button
            onClick={onSettingsClick}
            className="p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-gray-800 text-stone-400 dark:text-gray-500 hover:text-stone-900 dark:hover:text-white transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-gray-800 text-stone-400 dark:text-gray-500 hover:text-stone-900 dark:hover:text-white transition-colors">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEditClick}>
                <Pencil className="w-4 h-4 mr-2" />
                {isEditMode ? 'Done Editing' : 'Edit Items'}
              </DropdownMenuItem>
              {onMapClick && (
                <DropdownMenuItem onClick={onMapClick}>
                  <Map className="w-4 h-4 mr-2" />
                  View Map
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Title */}
      <h1 className="text-2xl sm:text-3xl font-semibold text-stone-900 dark:text-white mb-2">
        {title}
      </h1>

      {/* Metadata */}
      {metaParts.length > 0 && (
        <p className="text-sm text-stone-500 dark:text-gray-400 mb-4">
          {metaParts.join(' · ')}
        </p>
      )}

      {/* Hero Image */}
      {heroImage && (
        <div className="relative w-full h-40 sm:h-48 rounded-2xl overflow-hidden mb-5">
          <Image
            src={heroImage}
            alt={title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 800px"
          />
        </div>
      )}

      {/* Stat Pills Row */}
      <div className="flex items-center gap-2 flex-wrap mb-6">
        {flightCount > 0 && (
          <button
            onClick={() => onContentTabChange('flights')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
              activeContentTab === 'flights'
                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                : 'bg-stone-50 dark:bg-gray-800 border-stone-200 dark:border-gray-700 text-stone-600 dark:text-gray-400 hover:border-stone-300 dark:hover:border-gray-600'
            }`}
          >
            <Plane className="w-3.5 h-3.5" />
            <span className="font-semibold">{flightCount}</span>
            <span>Flight{flightCount !== 1 ? 's' : ''}</span>
          </button>
        )}

        {hotelCount > 0 && (
          <button
            onClick={() => onContentTabChange('hotels')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
              activeContentTab === 'hotels'
                ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300'
                : 'bg-stone-50 dark:bg-gray-800 border-stone-200 dark:border-gray-700 text-stone-600 dark:text-gray-400 hover:border-stone-300 dark:hover:border-gray-600'
            }`}
          >
            <Hotel className="w-3.5 h-3.5" />
            <span className="font-semibold">{hotelCount}</span>
            <span>Hotel{hotelCount !== 1 ? 's' : ''}</span>
          </button>
        )}

        {actualDiningCount > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-50 dark:bg-gray-800 border border-stone-200 dark:border-gray-700 text-xs font-medium text-stone-600 dark:text-gray-400">
            <Utensils className="w-3.5 h-3.5" />
            <span className="font-semibold">{actualDiningCount}</span>
            <span>Dining</span>
          </div>
        )}

        {/* Add Button */}
        {onAddItemClick ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-stone-900 dark:bg-white text-white dark:text-stone-900 text-xs font-medium hover:opacity-90 transition-opacity">
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              {addMenuItems.map((item) => (
                <DropdownMenuItem
                  key={item.type}
                  onClick={() => onAddItemClick(item.type)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  {item.icon}
                  <span>{item.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <button
            onClick={onAddClick}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-stone-900 dark:bg-white text-white dark:text-stone-900 text-xs font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        )}
      </div>

      {/* Visual Day Selector (only for itinerary tab with multiple days) */}
      {days.length > 1 && activeContentTab === 'itinerary' && (
        <div className="mb-6">
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
            {days.map((day) => {
              const { weekday, dayNum } = formatDayDate(day.date);
              const fullness = calculateDayFullness(day);
              const isSelected = day.dayNumber === selectedDayNumber;

              return (
                <button
                  key={day.dayNumber}
                  onClick={() => onSelectDay?.(day.dayNumber)}
                  className={`flex flex-col items-center min-w-[72px] p-3 rounded-xl transition-all ${
                    isSelected
                      ? 'bg-white dark:bg-gray-800 border-2 border-blue-500 dark:border-blue-400 shadow-sm shadow-blue-500/10'
                      : 'bg-stone-50 dark:bg-gray-900 border-2 border-transparent hover:bg-stone-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <span className={`text-[10px] font-semibold tracking-wide ${
                    isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-stone-400 dark:text-gray-500'
                  }`}>
                    {weekday || `DAY`}
                  </span>
                  <span className={`text-lg font-bold mt-0.5 ${
                    isSelected ? 'text-stone-900 dark:text-white' : 'text-stone-700 dark:text-gray-300'
                  }`}>
                    {dayNum || day.dayNumber}
                  </span>
                  {/* Fullness bar */}
                  <div className="w-full h-1 bg-stone-200 dark:bg-gray-700 rounded-full mt-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isSelected
                          ? 'bg-gradient-to-r from-blue-500 to-purple-500'
                          : 'bg-stone-300 dark:bg-gray-600'
                      }`}
                      style={{ width: `${fullness}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-stone-400 dark:text-gray-500 mt-1">
                    {day.items.length} stop{day.items.length !== 1 ? 's' : ''}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Single day indicator (for 1-day trips) */}
      {days.length === 1 && activeContentTab === 'itinerary' && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm font-medium text-stone-900 dark:text-white">
            Day 1
          </span>
          <span className="text-sm text-stone-400 dark:text-gray-500">
            · {days[0]?.items.length || 0} stops
          </span>
        </div>
      )}

      {/* Edit Mode Indicator */}
      {isEditMode && (
        <div className="flex items-center justify-between py-2 px-3 mb-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
            Edit mode: Tap items to delete
          </span>
          <button
            onClick={onEditClick}
            className="text-xs font-semibold text-blue-700 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-200"
          >
            Done
          </button>
        </div>
      )}
    </header>
  );
}
