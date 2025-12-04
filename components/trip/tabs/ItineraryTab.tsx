'use client';

import { useState, useMemo } from 'react';
import { Plus, Pencil } from 'lucide-react';
import type { Trip, ItineraryItem } from '@/types/trip';
import type { EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';
import DayHeader from '../DayHeader';
import ItineraryCard from '../ItineraryCard';
import TransitConnector from '../TransitConnector';
import TravelAISidebar from '../TravelAISidebar';
import InteractiveMapCard from '../InteractiveMapCard';

/**
 * Flight booking type for the flights tab
 */
export interface Flight {
  id: string;
  trip_id: string;
  airline: string;
  flightNumber: string;
  from: string;
  to: string;
  fromCity?: string;
  toCity?: string;
  departureDate: string;
  departureTime: string;
  arrivalDate: string;
  arrivalTime: string;
  terminal?: string;
  gate?: string;
  seatNumber?: string;
  seatClass?: 'economy' | 'premium_economy' | 'business' | 'first';
  confirmationNumber?: string;
  status?: 'confirmed' | 'pending' | 'cancelled';
  baggageAllowance?: string;
  loungeAccess?: boolean;
  loungeName?: string;
  loungeLocation?: string;
  notes?: string;
  legType?: 'outbound' | 'return' | 'multi-city';
}

/**
 * Hotel booking type for the hotels tab
 */
export interface HotelBooking {
  id: string;
  trip_id: string;
  name: string;
  address?: string;
  city?: string;
  country?: string;
  starRating?: number;
  checkInDate: string;
  checkInTime?: string;
  checkOutDate?: string;
  checkOutTime?: string;
  roomType?: string;
  confirmationNumber?: string;
  status?: 'confirmed' | 'pending' | 'cancelled';
  phone?: string;
  website?: string;
  image?: string;
  latitude?: number;
  longitude?: number;
  // Amenities
  breakfastIncluded?: boolean;
  breakfastHours?: string;
  breakfastLocation?: string;
  hasPool?: boolean;
  poolHours?: string;
  hasSpa?: boolean;
  hasGym?: boolean;
  gymHours?: string;
  hasLounge?: boolean;
  loungeHours?: string;
  hasFreeWifi?: boolean;
  hasParking?: boolean;
  parkingFee?: string;
  notes?: string;
}

/**
 * Weather data for a day
 */
export interface DayWeather {
  date: string;
  tempHigh: number;
  tempLow: number;
  condition: 'sunny' | 'cloudy' | 'rainy' | 'stormy' | 'snowy' | 'partly-cloudy';
  description: string;
  humidity?: number;
  windSpeed?: number;
  precipitation?: number;
}

interface ItineraryTabProps {
  trip: Trip;
  flights: Flight[];
  hotels: HotelBooking[];
  items: EnrichedItineraryItem[];
  selectedDay: number;
  setSelectedDay: (day: number) => void;
  selectedItemId: string | null;
  setSelectedItemId: (id: string | null) => void;
  weather?: Record<number, DayWeather>;
  onEditItem?: (item: EnrichedItineraryItem) => void;
  onRemoveItem?: (id: string) => void;
  onAddStop?: (dayNumber: number) => void;
  onReorderItems?: (dayNumber: number, items: EnrichedItineraryItem[]) => void;
  onUpdateTravelMode?: (itemId: string, mode: 'walking' | 'driving' | 'transit') => void;
  isEditMode?: boolean;
  onToggleEditMode?: () => void;
}

/**
 * ItineraryTab - Main itinerary view with day tabs, timeline, and sidebar
 *
 * Layout:
 * - Day tabs at top for navigation
 * - Left column: day timeline with cards and connectors
 * - Right column: map + AI suggestions sidebar
 */
export default function ItineraryTab({
  trip,
  flights,
  hotels,
  items,
  selectedDay,
  setSelectedDay,
  selectedItemId,
  setSelectedItemId,
  weather,
  onEditItem,
  onRemoveItem,
  onAddStop,
  onReorderItems,
  onUpdateTravelMode,
  isEditMode = false,
  onToggleEditMode,
}: ItineraryTabProps) {
  // Calculate number of days
  const numDays = useMemo(() => {
    if (!trip.start_date || !trip.end_date) return 1;
    const start = new Date(trip.start_date);
    const end = new Date(trip.end_date);
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(diff + 1, 1);
  }, [trip.start_date, trip.end_date]);

  // Filter items for selected day
  const dayItems = useMemo(() => {
    return items
      .filter((item) => item.day === selectedDay)
      .sort((a, b) => a.order_index - b.order_index);
  }, [items, selectedDay]);

  // Get weather for selected day
  const dayWeather = weather?.[selectedDay];

  // Get map markers from items
  const mapMarkers = useMemo(() => {
    return dayItems
      .filter((item) => {
        const lat = item.destination?.latitude ?? item.parsedNotes?.latitude;
        const lng = item.destination?.longitude ?? item.parsedNotes?.longitude;
        return lat && lng;
      })
      .map((item, index) => ({
        id: item.id,
        lat: item.destination?.latitude ?? item.parsedNotes?.latitude ?? 0,
        lng: item.destination?.longitude ?? item.parsedNotes?.longitude ?? 0,
        color: 'blue' as const,
        label: String(index + 1),
      }));
  }, [dayItems]);

  // Find overnight hotel for this day
  const overnightHotel = useMemo(() => {
    // Find hotel where check-in date matches this day's date
    const dayDate = trip.start_date
      ? new Date(new Date(trip.start_date).getTime() + (selectedDay - 1) * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0]
      : null;

    return hotels.find((h) => h.checkInDate === dayDate);
  }, [hotels, selectedDay, trip.start_date]);

  // Check for free time gaps (gaps > 2 hours between items)
  const itemsWithGaps = useMemo(() => {
    const result: Array<{
      item: EnrichedItineraryItem;
      hasGapAfter: boolean;
      gapMinutes: number;
    }> = [];

    for (let i = 0; i < dayItems.length; i++) {
      const current = dayItems[i];
      const next = dayItems[i + 1];

      let hasGapAfter = false;
      let gapMinutes = 0;

      if (next && current.time && next.time) {
        const currentEnd = getEndTime(current);
        const nextStart = timeToMinutes(next.time);
        gapMinutes = nextStart - currentEnd;
        hasGapAfter = gapMinutes > 120; // 2 hours
      }

      result.push({ item: current, hasGapAfter, gapMinutes });
    }

    return result;
  }, [dayItems]);

  return (
    <div className="flex flex-col h-full">
      {/* Day Tabs */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {Array.from({ length: numDays }, (_, i) => i + 1).map((day) => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`
                px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all
                ${selectedDay === day
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }
              `}
            >
              Day {day}
            </button>
          ))}
        </div>

        {/* Edit Mode Toggle */}
        {onToggleEditMode && (
          <button
            onClick={onToggleEditMode}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all
              ${isEditMode
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }
            `}
          >
            <Pencil className="w-4 h-4" />
            Edit
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column - Timeline */}
        <div className="flex-1 overflow-y-auto">
          {/* Day Header */}
          <DayHeader
            dayNumber={selectedDay}
            date={trip.start_date ? addDays(trip.start_date, selectedDay - 1) : null}
            itemCount={dayItems.length}
            weather={dayWeather}
            items={dayItems}
            trip={trip}
          />

          {/* Timeline Items */}
          <div className="px-4 py-4 space-y-2">
            {itemsWithGaps.length === 0 ? (
              <EmptyDayState onAddStop={() => onAddStop?.(selectedDay)} />
            ) : (
              <>
                {itemsWithGaps.map(({ item, hasGapAfter, gapMinutes }, index) => (
                  <div key={item.id}>
                    {/* Item Card */}
                    <ItineraryCard
                      item={item}
                      index={index}
                      onEdit={onEditItem}
                      onRemove={onRemoveItem}
                      isActive={selectedItemId === item.id}
                    />

                    {/* Travel Connector */}
                    {index < dayItems.length - 1 && (
                      <TransitConnector
                        from={getItemLocation(item)}
                        to={getItemLocation(dayItems[index + 1])}
                        mode={item.parsedNotes?.travelModeToNext || 'walking'}
                        itemId={item.id}
                        onModeChange={onUpdateTravelMode ? (id, mode) => onUpdateTravelMode(id, mode) : undefined}
                        className="my-1"
                      />
                    )}

                    {/* Free Time Gap */}
                    {hasGapAfter && (
                      <FreeTimeGap
                        minutes={gapMinutes}
                        onAddStop={() => onAddStop?.(selectedDay)}
                      />
                    )}
                  </div>
                ))}

                {/* Overnight Card */}
                {overnightHotel && (
                  <OvernightCard hotel={overnightHotel} />
                )}

                {/* Add Stop Button */}
                <button
                  onClick={() => onAddStop?.(selectedDay)}
                  className="w-full flex items-center justify-center gap-2 py-3 mt-4 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm font-medium">Add stop</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Right Column - Sidebar */}
        <div className="hidden lg:flex flex-col w-80 border-l border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 overflow-y-auto">
          {/* Weather Card */}
          {dayWeather && (
            <div className="p-4">
              <WeatherCard weather={dayWeather} />
            </div>
          )}

          {/* Map */}
          <div className="p-4 pt-0">
            <InteractiveMapCard
              locationName={trip.destination || 'Trip'}
              markers={mapMarkers}
              className="h-48"
            />
          </div>

          {/* AI Suggestions */}
          <div className="p-4 pt-0 flex-1">
            <TravelAISidebar
              suggestions={[]}
              className="h-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper Components

function EmptyDayState({ onAddStop }: { onAddStop: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
        <Plus className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
        No stops planned
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Start building your day by adding destinations
      </p>
      <button
        onClick={onAddStop}
        className="px-4 py-2 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium hover:opacity-90 transition-opacity"
      >
        Add your first stop
      </button>
    </div>
  );
}

function FreeTimeGap({ minutes, onAddStop }: { minutes: number; onAddStop: () => void }) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const timeStr = hours > 0 ? `${hours}h ${mins > 0 ? `${mins}m` : ''}` : `${mins}m`;

  return (
    <div className="my-3 flex items-center gap-3">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-300 dark:via-amber-600 to-transparent" />
      <button
        onClick={onAddStop}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-medium hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
      >
        <span>{timeStr} free</span>
        <Plus className="w-3 h-3" />
      </button>
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-300 dark:via-amber-600 to-transparent" />
    </div>
  );
}

function OvernightCard({ hotel }: { hotel: HotelBooking }) {
  return (
    <div className="mt-6 p-4 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-100 dark:border-indigo-800/30">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-800/50 flex items-center justify-center">
          <span className="text-lg">🌙</span>
        </div>
        <div>
          <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
            Overnight at
          </p>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {hotel.name}
          </p>
        </div>
      </div>
    </div>
  );
}

function WeatherCard({ weather }: { weather: DayWeather }) {
  const weatherIcons: Record<string, string> = {
    sunny: '☀️',
    'partly-cloudy': '⛅',
    cloudy: '☁️',
    rainy: '🌧️',
    stormy: '⛈️',
    snowy: '❄️',
  };

  return (
    <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xl font-medium text-gray-900 dark:text-white">
            {weather.tempHigh}°
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {weather.description}
          </p>
        </div>
        <span className="text-4xl">{weatherIcons[weather.condition] || '☀️'}</span>
      </div>
      {(weather.humidity || weather.windSpeed) && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex gap-4 text-xs text-gray-500 dark:text-gray-400">
          {weather.humidity && <span>💧 {weather.humidity}%</span>}
          {weather.windSpeed && <span>💨 {weather.windSpeed} mph</span>}
        </div>
      )}
    </div>
  );
}

// Helper functions

function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

function timeToMinutes(timeStr: string): number {
  if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const period = match[3]?.toUpperCase();
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }
  return 0;
}

function getEndTime(item: EnrichedItineraryItem): number {
  const startTime = item.time ? timeToMinutes(item.time) : 0;
  const duration = item.parsedNotes?.duration || 60; // default 1 hour
  return startTime + duration;
}

function getItemLocation(item: EnrichedItineraryItem) {
  const lat = item.destination?.latitude ?? item.parsedNotes?.latitude;
  const lng = item.destination?.longitude ?? item.parsedNotes?.longitude;
  if (lat && lng) {
    return { latitude: lat, longitude: lng };
  }
  return undefined;
}
