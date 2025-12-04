'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Settings, Sparkles, Plus, Pencil, Loader2, Map, ChevronDown, Utensils, Coffee, Building2, Plane, Hotel, Car, Waves, FileText } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Trip } from '@/types/trip';
import { parseDestinations, formatDestinations } from '@/types/trip';

export type AddItemType = 'restaurant' | 'cafe' | 'attraction' | 'flight' | 'hotel' | 'transport' | 'hotel-activity' | 'custom-note';

interface TripHeaderProps {
  title: string;
  trip?: Trip;
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
 * TripHeader - Clean header matching /trips design
 */
export default function TripHeader({
  title,
  trip,
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
  onAddItemClick,
  onEditClick,
  isEditMode = false,
  isPlanning = false,
  onMapClick,
  travelerCount = 1,
}: TripHeaderProps) {
  // Parse trip metadata
  const destinations = trip ? parseDestinations(trip.destination) : [];
  const destinationDisplay = formatDestinations(destinations);
  const dateRange = trip ? formatDateRange(trip.start_date, trip.end_date) : '';

  // Build metadata parts
  const metadataParts: string[] = [];
  if (dateRange) metadataParts.push(dateRange);
  if (destinationDisplay) metadataParts.push(destinationDisplay);
  if (travelerCount > 0) metadataParts.push(`${travelerCount} traveler${travelerCount !== 1 ? 's' : ''}`);

  return (
    <header className="w-full mb-6">
      {/* Top Bar - Matching /trips header */}
      <div className="flex flex-col gap-3 mb-6">
        {/* Row 1: Back link + Title */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          {/* Back Link */}
          <Link
            href="/trips"
            className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Trips</span>
          </Link>

          {/* Title */}
          <h1 className="text-xl sm:text-2xl font-medium text-gray-900 dark:text-white truncate">
            {title}
          </h1>
        </div>

        {/* Row 2: Metadata + Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          {/* Metadata (date range, destination, travelers) */}
          {metadataParts.length > 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {metadataParts.join(' · ')}
            </p>
          )}

          {/* Spacer */}
          <div className="hidden sm:block flex-1" />

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={onAutoplanClick}
              disabled={isPlanning}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50 min-h-[40px]"
            >
              {isPlanning ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              {isPlanning ? 'Planning...' : 'Auto-plan'}
            </button>

            {/* Add Dropdown */}
            {onAddItemClick ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 text-xs font-medium hover:border-gray-300 dark:hover:border-gray-700 transition-colors min-h-[40px]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
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
                className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 text-xs font-medium hover:border-gray-300 dark:hover:border-gray-700 transition-colors min-h-[40px]"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            )}

            <button
              onClick={onSettingsClick}
              className="p-2.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
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
                    ? 'font-medium text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 sm:bg-transparent sm:dark:bg-transparent'
                    : 'font-medium text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                  }
                `}
              >
                {count > 0 && (
                  <span className={`
                    w-4 h-4 rounded-full text-[10px] flex items-center justify-center
                    ${activeContentTab === key
                      ? 'bg-gray-200 dark:bg-gray-700'
                      : 'bg-gray-100 dark:bg-gray-800'
                    }
                  `}>
                    {count}
                  </span>
                )}
                {label}
              </button>
            ))}
          </div>

          {/* Map Button */}
          {activeContentTab === 'itinerary' && onMapClick && (
            <button
              onClick={onMapClick}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
              title="View map"
            >
              <Map className="w-4 h-4" />
            </button>
          )}
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
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                    : 'text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300'
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
                : 'text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white'
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
