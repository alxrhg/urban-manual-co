'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import {
  Calendar, MapPin, Copy, Trash2, Edit2, Plus,
  ChevronRight, Plane, Clock
} from 'lucide-react';
import type { Trip } from '@/types/trip';
import { formatDestinationsFromField } from '@/types/trip';

interface EnhancedTripsTabProps {
  trips: Trip[];
  onTripCreated: () => void;
  onEditTrip: (tripId: string) => void;
  onNewTrip: () => void;
}

function formatDateRange(startDate?: string | null, endDate?: string | null): string {
  if (!startDate) return '';

  const start = new Date(startDate);
  const formatOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };

  if (!endDate) {
    return start.toLocaleDateString('en-US', { ...formatOptions, year: 'numeric' });
  }

  const end = new Date(endDate);
  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();

  if (sameMonth) {
    return `${start.toLocaleDateString('en-US', formatOptions)}–${end.getDate()}, ${end.getFullYear()}`;
  }

  if (sameYear) {
    return `${start.toLocaleDateString('en-US', formatOptions)} – ${end.toLocaleDateString('en-US', formatOptions)}, ${end.getFullYear()}`;
  }

  return `${start.toLocaleDateString('en-US', { ...formatOptions, year: 'numeric' })} – ${end.toLocaleDateString('en-US', { ...formatOptions, year: 'numeric' })}`;
}

function calculateDuration(startDate?: string | null, endDate?: string | null): number | null {
  if (!startDate || !endDate) return null;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

function getTripStatus(startDate?: string | null, endDate?: string | null): 'upcoming' | 'ongoing' | 'past' {
  if (!startDate) return 'upcoming';

  const now = new Date();
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : start;

  if (now < start) return 'upcoming';
  if (now > end) return 'past';
  return 'ongoing';
}

export function EnhancedTripsTab({
  trips,
  onTripCreated,
  onEditTrip,
  onNewTrip,
}: EnhancedTripsTabProps) {
  const router = useRouter();
  const [duplicating, setDuplicating] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Categorize trips
  const categorizedTrips = useMemo(() => {
    const upcoming: Trip[] = [];
    const ongoing: Trip[] = [];
    const past: Trip[] = [];

    trips.forEach(trip => {
      const status = getTripStatus(trip.start_date, trip.end_date);
      if (status === 'upcoming') upcoming.push(trip);
      else if (status === 'ongoing') ongoing.push(trip);
      else past.push(trip);
    });

    // Sort upcoming by start date (soonest first)
    upcoming.sort((a, b) => {
      if (!a.start_date) return 1;
      if (!b.start_date) return -1;
      return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
    });

    // Sort past by end date (most recent first)
    past.sort((a, b) => {
      const dateA = a.end_date || a.start_date;
      const dateB = b.end_date || b.start_date;
      if (!dateA) return 1;
      if (!dateB) return -1;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

    return { upcoming, ongoing, past };
  }, [trips]);

  // Calculate stats
  const stats = useMemo(() => {
    let totalDays = 0;

    trips.forEach(trip => {
      const duration = calculateDuration(trip.start_date, trip.end_date);
      if (duration) totalDays += duration;
    });

    return {
      totalTrips: trips.length,
      upcomingTrips: categorizedTrips.upcoming.length + categorizedTrips.ongoing.length,
      totalDays,
    };
  }, [trips, categorizedTrips]);

  async function handleDuplicateTrip(trip: Trip) {
    if (duplicating) return;

    try {
      setDuplicating(trip.id);

      // Create a duplicate with "(Copy)" suffix
      const { data, error } = await supabase
        .from('trips')
        .insert({
          user_id: trip.user_id,
          title: `${trip.title} (Copy)`,
          destination: trip.destination,
          start_date: null, // Clear dates for the copy
          end_date: null,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Trip duplicated successfully');
      onTripCreated();

      // Navigate to the new trip
      if (data) {
        router.push(`/trips/${data.id}`);
      }
    } catch (error) {
      console.error('Error duplicating trip:', error);
      toast.error('Failed to duplicate trip');
    } finally {
      setDuplicating(null);
    }
  }

  async function handleDeleteTrip(trip: Trip) {
    if (deleting) return;

    if (!confirm(`Delete "${trip.title}"? This cannot be undone.`)) return;

    try {
      setDeleting(trip.id);

      const { error } = await supabase
        .from('trips')
        .delete()
        .eq('id', trip.id);

      if (error) throw error;

      toast.success('Trip deleted');
      onTripCreated();
    } catch (error) {
      console.error('Error deleting trip:', error);
      toast.error('Failed to delete trip');
    } finally {
      setDeleting(null);
    }
  }

  if (trips.length === 0) {
    return (
      <div className="max-w-md py-12">
        <div className="text-4xl mb-4">
          <Plane className="w-10 h-10 text-gray-300" />
        </div>
        <h3 className="text-lg font-medium mb-2">Plan Your Next Adventure</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
          Create trips to organize your travel plans. Add destinations, set dates, and build detailed itineraries.
        </p>

        <div className="space-y-3 mb-8">
          <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span>Add destinations from your saved places</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span>Set travel dates and create day-by-day itineraries</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
            <Clock className="w-4 h-4 text-gray-400" />
            <span>Get optimized routes and time estimates</span>
          </div>
        </div>

        <button
          onClick={onNewTrip}
          className="px-6 py-2 bg-black dark:bg-white text-white dark:text-black text-xs font-medium rounded-lg hover:opacity-80 transition-opacity inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Your First Trip
        </button>
      </div>
    );
  }

  const TripCard = ({ trip, showDates = true }: { trip: Trip; showDates?: boolean }) => {
    const status = getTripStatus(trip.start_date, trip.end_date);
    const duration = calculateDuration(trip.start_date, trip.end_date);
    const isLoading = duplicating === trip.id || deleting === trip.id;

    return (
      <div
        className={`p-4 rounded-lg border transition-all ${
          status === 'ongoing'
            ? 'bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-600'
            : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <button
            onClick={() => router.push(`/trips/${trip.id}`)}
            className="flex-1 text-left hover:opacity-70 transition-opacity"
          >
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium">{trip.title}</h4>
              {status === 'ongoing' && (
                <span className="px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-md">
                  Active
                </span>
              )}
            </div>

            {trip.destination && (
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {formatDestinationsFromField(trip.destination)}
              </p>
            )}

            {showDates && trip.start_date && (
              <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDateRange(trip.start_date, trip.end_date)}
                </span>
                {duration && (
                  <span>{duration} {duration === 1 ? 'day' : 'days'}</span>
                )}
              </div>
            )}
          </button>

          <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0 mt-1" />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={() => onEditTrip(trip.id)}
            disabled={isLoading}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-black dark:hover:text-white transition-colors disabled:opacity-50"
          >
            <Edit2 className="w-3 h-3" />
            Edit
          </button>
          <button
            onClick={() => handleDuplicateTrip(trip)}
            disabled={isLoading}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-black dark:hover:text-white transition-colors disabled:opacity-50"
          >
            <Copy className="w-3 h-3" />
            {duplicating === trip.id ? 'Duplicating...' : 'Duplicate'}
          </button>
          <button
            onClick={() => handleDeleteTrip(trip)}
            disabled={isLoading}
            className="flex items-center gap-1 px-2 py-1 text-xs text-red-500 hover:text-red-600 transition-colors disabled:opacity-50 ml-auto"
          >
            <Trash2 className="w-3 h-3" />
            {deleting === trip.id ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-2xl space-y-8">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium">My Trips</h2>
          <p className="text-sm text-gray-500 mt-1">
            {stats.totalTrips} {stats.totalTrips === 1 ? 'trip' : 'trips'}
            {stats.upcomingTrips > 0 && ` · ${stats.upcomingTrips} upcoming`}
            {stats.totalDays > 0 && ` · ${stats.totalDays} days planned`}
          </p>
        </div>
        <button
          onClick={onNewTrip}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-black dark:hover:text-white transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Trip
        </button>
      </div>

      {/* Ongoing trips */}
      {categorizedTrips.ongoing.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-green-600 uppercase tracking-wide mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Currently Traveling
          </h3>
          <div className="space-y-3">
            {categorizedTrips.ongoing.map(trip => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming trips */}
      {categorizedTrips.upcoming.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
            Upcoming
          </h3>
          <div className="space-y-3">
            {categorizedTrips.upcoming.map(trip => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        </div>
      )}

      {/* Past trips */}
      {categorizedTrips.past.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
            Past Trips
          </h3>
          <div className="space-y-3">
            {categorizedTrips.past.map(trip => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        </div>
      )}

      {/* Quick action */}
      <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          Ready for your next adventure?
        </p>
        <button
          onClick={onNewTrip}
          className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-xs font-medium rounded-lg hover:opacity-80 transition-opacity inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Plan a New Trip
        </button>
      </div>
    </div>
  );
}
