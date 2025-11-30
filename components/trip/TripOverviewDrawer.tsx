'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import {
  X,
  Calendar,
  MapPin,
  Plane,
  Building2,
  Utensils,
  Camera,
  GripVertical,
  ChevronRight,
  BarChart3,
  Map,
  Clock,
  CheckCircle,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import type { Trip } from '@/types/trip';
import type { TripDay, EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';

interface TripOverviewDrawerProps {
  trip: Trip;
  days: TripDay[];
  onClose: () => void;
  onDayReorder?: (fromIndex: number, toIndex: number) => void;
  onOpenDay?: (dayNumber: number) => void;
  onOpenMap?: () => void;
}

/**
 * TripOverviewDrawer - Central view for entire trip summary and controls
 * Shows summary, reservations, stats, and allows day reordering
 */
export default function TripOverviewDrawer({
  trip,
  days,
  onClose,
  onDayReorder,
  onOpenDay,
  onOpenMap,
}: TripOverviewDrawerProps) {
  const [activeSection, setActiveSection] = useState<'overview' | 'reservations' | 'days'>('overview');
  const [draggedDay, setDraggedDay] = useState<number | null>(null);

  // Calculate trip stats
  const stats = useMemo(() => {
    const totalEvents = days.reduce((sum, day) => sum + day.items.length, 0);
    const flights = days.flatMap(d => d.items.filter(i => i.parsedNotes?.type === 'flight'));
    const hotels = days.flatMap(d => d.items.filter(i => i.parsedNotes?.type === 'hotel'));
    const restaurants = days.flatMap(d => d.items.filter(i =>
      i.destination?.category?.toLowerCase().includes('restaurant') ||
      i.parsedNotes?.type === 'breakfast'
    ));
    const activities = days.flatMap(d => d.items.filter(i =>
      !['flight', 'hotel', 'breakfast'].includes(i.parsedNotes?.type || '') &&
      !i.destination?.category?.toLowerCase().includes('restaurant')
    ));

    // Calculate planning progress
    const daysWithItems = days.filter(d => d.items.length > 0).length;
    const planningProgress = days.length > 0 ? Math.round((daysWithItems / days.length) * 100) : 0;

    // Calculate trip quality score (0-100)
    let qualityScore = 50; // Base score
    if (flights.length > 0) qualityScore += 10;
    if (hotels.length >= days.length) qualityScore += 15;
    if (restaurants.length >= days.length) qualityScore += 10;
    if (activities.length >= days.length * 2) qualityScore += 15;
    qualityScore = Math.min(100, qualityScore);

    return {
      totalEvents,
      flights: flights.length,
      hotels: hotels.length,
      restaurants: restaurants.length,
      activities: activities.length,
      planningProgress,
      qualityScore,
      daysWithItems,
    };
  }, [days]);

  // Calculate trip duration
  const duration = useMemo(() => {
    if (!trip.start_date || !trip.end_date) return null;
    const start = new Date(trip.start_date);
    const end = new Date(trip.end_date);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return {
      days: diffDays,
      nights: diffDays - 1,
      startFormatted: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      endFormatted: end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    };
  }, [trip.start_date, trip.end_date]);

  // Get cities from destinations
  const cities = useMemo(() => {
    const citySet = new Set<string>();
    if (trip.destination) citySet.add(trip.destination);
    days.forEach(day => {
      day.items.forEach(item => {
        if (item.destination?.city) citySet.add(item.destination.city);
      });
    });
    return Array.from(citySet);
  }, [trip.destination, days]);

  // Handle day drag
  const handleDragStart = (dayNumber: number) => {
    setDraggedDay(dayNumber);
  };

  const handleDragOver = (e: React.DragEvent, dayNumber: number) => {
    e.preventDefault();
    if (draggedDay !== null && draggedDay !== dayNumber && onDayReorder) {
      // Visual feedback could be added here
    }
  };

  const handleDrop = (dayNumber: number) => {
    if (draggedDay !== null && draggedDay !== dayNumber && onDayReorder) {
      onDayReorder(draggedDay - 1, dayNumber - 1);
    }
    setDraggedDay(null);
  };

  // Get quality score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-orange-500';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Well Planned';
    if (score >= 60) return 'Good Start';
    return 'Needs More';
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative ml-auto w-full max-w-md bg-white dark:bg-gray-900 h-full overflow-hidden flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            Trip Overview
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Section Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-800">
          {(['overview', 'reservations', 'days'] as const).map(section => (
            <button
              key={section}
              onClick={() => setActiveSection(section)}
              className={`flex-1 py-3 text-xs font-medium transition-colors ${
                activeSection === section
                  ? 'text-gray-900 dark:text-white border-b-2 border-gray-900 dark:border-white'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {section.charAt(0).toUpperCase() + section.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Overview Section */}
          {activeSection === 'overview' && (
            <>
              {/* Trip Summary Card */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl space-y-3">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  {trip.title}
                </h3>

                {duration && (
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {duration.startFormatted} – {duration.endFormatted}
                    </span>
                    <span className="text-gray-300 dark:text-gray-600">•</span>
                    <span>{duration.days} days, {duration.nights} nights</span>
                  </div>
                )}

                {cities.length > 0 && (
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <MapPin className="w-4 h-4" />
                    <span>{cities.join(' → ')}</span>
                  </div>
                )}
              </div>

              {/* AI Quality Score */}
              <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-2xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-gray-400" />
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      Trip Quality Score
                    </span>
                  </div>
                  <span className={`text-lg font-bold ${getScoreColor(stats.qualityScore)}`}>
                    {stats.qualityScore}
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      stats.qualityScore >= 80 ? 'bg-green-500' :
                      stats.qualityScore >= 60 ? 'bg-yellow-500' : 'bg-orange-500'
                    }`}
                    style={{ width: `${stats.qualityScore}%` }}
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-2">
                  {getScoreLabel(stats.qualityScore)} – Add more activities to improve your score
                </p>
              </div>

              {/* Planning Progress */}
              <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-2xl">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Planning Progress
                  </span>
                  <span className="text-xs text-gray-900 dark:text-white">
                    {stats.daysWithItems} / {days.length} days
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-black dark:bg-white rounded-full transition-all"
                    style={{ width: `${stats.planningProgress}%` }}
                  />
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <BarChart3 className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-500">Total Events</span>
                  </div>
                  <span className="text-xl font-bold text-gray-900 dark:text-white">
                    {stats.totalEvents}
                  </span>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-500">Duration</span>
                  </div>
                  <span className="text-xl font-bold text-gray-900 dark:text-white">
                    {duration?.days || 0}d
                  </span>
                </div>
              </div>

              {/* Map Preview Button */}
              {onOpenMap && (
                <button
                  onClick={onOpenMap}
                  className="w-full p-4 border border-gray-200 dark:border-gray-800 rounded-2xl flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Map className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-900 dark:text-white">View Trip Map</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </>
          )}

          {/* Reservations Section */}
          {activeSection === 'reservations' && (
            <>
              {/* Flights */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Plane className="w-4 h-4 text-blue-500" />
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Flights ({stats.flights})
                  </span>
                </div>
                {stats.flights === 0 ? (
                  <p className="text-xs text-gray-400 pl-6">No flights added</p>
                ) : (
                  days.flatMap(day =>
                    day.items
                      .filter(i => i.parsedNotes?.type === 'flight')
                      .map(flight => (
                        <div
                          key={flight.id}
                          className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl ml-6"
                        >
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {flight.parsedNotes?.from} → {flight.parsedNotes?.to}
                          </p>
                          <p className="text-xs text-gray-500">
                            {flight.parsedNotes?.airline} {flight.parsedNotes?.flightNumber}
                          </p>
                        </div>
                      ))
                  )
                )}
              </div>

              {/* Hotels */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-gray-500" />
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Hotels ({stats.hotels})
                  </span>
                </div>
                {stats.hotels === 0 ? (
                  <p className="text-xs text-gray-400 pl-6">No hotels added</p>
                ) : (
                  days.flatMap(day =>
                    day.items
                      .filter(i => i.parsedNotes?.type === 'hotel')
                      .map(hotel => (
                        <div
                          key={hotel.id}
                          className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl ml-6"
                        >
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {hotel.title || hotel.parsedNotes?.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            Night {hotel.parsedNotes?.nightStart || 1}
                            {hotel.parsedNotes?.nightEnd && hotel.parsedNotes?.nightStart && hotel.parsedNotes.nightEnd > hotel.parsedNotes.nightStart
                              ? `–${hotel.parsedNotes.nightEnd}` : ''}
                          </p>
                        </div>
                      ))
                  )
                )}
              </div>

              {/* Restaurants */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Utensils className="w-4 h-4 text-orange-500" />
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Restaurants ({stats.restaurants})
                  </span>
                </div>
                {stats.restaurants === 0 ? (
                  <p className="text-xs text-gray-400 pl-6">No restaurants added</p>
                ) : (
                  <p className="text-xs text-gray-400 pl-6">{stats.restaurants} reservations</p>
                )}
              </div>

              {/* Activities */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-green-500" />
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Activities ({stats.activities})
                  </span>
                </div>
                {stats.activities === 0 ? (
                  <p className="text-xs text-gray-400 pl-6">No activities added</p>
                ) : (
                  <p className="text-xs text-gray-400 pl-6">{stats.activities} planned</p>
                )}
              </div>
            </>
          )}

          {/* Days Section (Reorderable) */}
          {activeSection === 'days' && (
            <div className="space-y-2">
              <p className="text-xs text-gray-400 mb-3">
                Drag to reorder days
              </p>
              {days.map(day => (
                <div
                  key={day.dayNumber}
                  draggable
                  onDragStart={() => handleDragStart(day.dayNumber)}
                  onDragOver={(e) => handleDragOver(e, day.dayNumber)}
                  onDrop={() => handleDrop(day.dayNumber)}
                  onDragEnd={() => setDraggedDay(null)}
                  onClick={() => onOpenDay?.(day.dayNumber)}
                  className={`p-3 border rounded-xl cursor-pointer transition-all ${
                    draggedDay === day.dayNumber
                      ? 'border-gray-400 bg-gray-100 dark:bg-gray-800'
                      : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <GripVertical className="w-4 h-4 text-gray-300 dark:text-gray-600 cursor-grab" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          Day {day.dayNumber}
                        </span>
                        {day.items.length > 0 ? (
                          <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {day.items.length} {day.items.length === 1 ? 'event' : 'events'}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
