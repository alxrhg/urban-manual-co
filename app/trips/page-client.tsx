'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  Plus,
  Loader2,
  MapPin,
  Calendar,
  Plane,
  Search,
  X,
  Sparkles,
  MoreHorizontal,
  Copy,
  Trash2,
  Share2,
  Hotel,
  ChevronRight,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { formatTripDateRange, calculateTripDays, parseDateString } from '@/lib/utils';
import { formatDestinationsFromField } from '@/types/trip';
import type { Trip } from '@/types/trip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface TripWithHealth extends Trip {
  item_count?: number;
  has_hotel?: boolean;
  has_flight?: boolean;
}

// Calculate countdown
function getCountdown(startDate: string | null): { text: string; urgent: boolean } | null {
  if (!startDate) return null;
  const start = parseDateString(startDate);
  if (!start) return null;

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diffTime = start.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return null;
  if (diffDays === 0) return { text: 'Today', urgent: true };
  if (diffDays === 1) return { text: 'Tomorrow', urgent: true };
  if (diffDays <= 7) return { text: `${diffDays}d`, urgent: true };
  if (diffDays <= 30) return { text: `${Math.ceil(diffDays / 7)}w`, urgent: false };
  return { text: `${Math.ceil(diffDays / 30)}mo`, urgent: false };
}

// Trip Card Component
interface TripCardProps {
  trip: TripWithHealth;
  onDelete: (id: string) => void;
  onDuplicate: (trip: TripWithHealth) => void;
}

function TripCard({ trip, onDelete, onDuplicate }: TripCardProps) {
  const router = useRouter();
  const destinationsDisplay = formatDestinationsFromField(trip.destination ?? null);
  const daysCount = calculateTripDays(trip.start_date, trip.end_date);
  const countdown = getCountdown(trip.start_date);
  const dateRange = formatTripDateRange(trip.start_date, trip.end_date);

  const isOngoing = trip.status === 'ongoing';
  const isPast = trip.status === 'completed';

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/trips/${trip.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: trip.title, text: `Check out my trip: ${trip.title}`, url });
      } catch {
        // cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  return (
    <Link
      href={`/trips/${trip.id}`}
      className="group block"
    >
      <div className="relative rounded-2xl overflow-hidden bg-white dark:bg-gray-900 border border-stone-200 dark:border-gray-800 hover:border-stone-300 dark:hover:border-gray-700 transition-all hover:shadow-lg">
        {/* Cover Image */}
        <div className="relative h-40 bg-stone-100 dark:bg-gray-800">
          {trip.cover_image ? (
            <Image
              src={trip.cover_image}
              alt={trip.title}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <MapPin className="w-10 h-10 text-stone-300 dark:text-gray-700" />
            </div>
          )}

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

          {/* Status Badges */}
          <div className="absolute top-3 left-3 flex items-center gap-2">
            {isOngoing && (
              <span className="px-2 py-1 text-[10px] font-semibold bg-green-500 text-white rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                NOW
              </span>
            )}
            {countdown && !isOngoing && !isPast && (
              <span className={`px-2 py-1 text-[10px] font-semibold rounded-full ${
                countdown.urgent
                  ? 'bg-amber-500 text-white'
                  : 'bg-white/90 dark:bg-gray-900/90 text-stone-700 dark:text-gray-300'
              }`}>
                {countdown.text}
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  onClick={(e) => e.preventDefault()}
                  className="p-1.5 bg-white/90 dark:bg-gray-900/90 hover:bg-white dark:hover:bg-gray-900 rounded-full transition-colors"
                >
                  <MoreHorizontal className="w-4 h-4 text-stone-700 dark:text-gray-300" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={handleShare}>
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.preventDefault(); onDuplicate(trip); }}>
                  <Copy className="w-4 h-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => { e.preventDefault(); onDelete(trip.id); }}
                  className="text-red-600 dark:text-red-400"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Title on Image */}
          <div className="absolute bottom-3 left-3 right-3">
            <h3 className="text-lg font-semibold text-white truncate">
              {trip.title}
            </h3>
          </div>
        </div>

        {/* Card Content */}
        <div className="p-4">
          {/* Destination & Date */}
          <div className="flex items-center gap-2 text-sm text-stone-600 dark:text-gray-400 mb-3">
            {destinationsDisplay && (
              <span className="flex items-center gap-1.5 truncate">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                {destinationsDisplay}
              </span>
            )}
          </div>

          {/* Meta Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-stone-500 dark:text-gray-500">
              {dateRange && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {dateRange}
                </span>
              )}
              {daysCount && daysCount > 0 && (
                <span>{daysCount}d</span>
              )}
            </div>

            {/* Quick Stats */}
            <div className="flex items-center gap-2">
              {trip.has_flight && (
                <Plane className="w-3.5 h-3.5 text-stone-400" />
              )}
              {trip.has_hotel && (
                <Hotel className="w-3.5 h-3.5 text-stone-400" />
              )}
              {(trip.item_count || 0) > 0 && (
                <span className="text-xs text-stone-400">
                  {trip.item_count} stops
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

// Empty State
function EmptyState({ onCreateTrip }: { onCreateTrip: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="w-16 h-16 rounded-2xl bg-stone-100 dark:bg-gray-800 flex items-center justify-center mb-6">
        <MapPin className="w-8 h-8 text-stone-400" />
      </div>
      <h3 className="text-lg font-medium text-stone-900 dark:text-white mb-2">
        No trips yet
      </h3>
      <p className="text-sm text-stone-500 dark:text-gray-400 text-center mb-6 max-w-sm">
        Start planning your next adventure. Create a trip to organize your destinations and itinerary.
      </p>
      <button
        onClick={onCreateTrip}
        className="flex items-center gap-2 px-5 py-2.5 bg-stone-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded-full hover:opacity-90 transition-opacity"
      >
        <Plus className="w-4 h-4" />
        Create Trip
      </button>
    </div>
  );
}

// Main Component
interface TripsClientPageProps {
  initialTrips: TripWithHealth[];
  userId: string;
}

export default function TripsClientPage({ initialTrips, userId }: TripsClientPageProps) {
  const router = useRouter();
  const [trips, setTrips] = useState<TripWithHealth[]>(initialTrips);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter trips
  const filteredTrips = useMemo(() => {
    let result = [...trips];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(trip =>
        trip.title.toLowerCase().includes(query) ||
        (trip.destination?.toLowerCase() || '').includes(query)
      );
    }

    // Sort by most recent or upcoming
    result.sort((a, b) => {
      // Ongoing trips first
      if (a.status === 'ongoing' && b.status !== 'ongoing') return -1;
      if (b.status === 'ongoing' && a.status !== 'ongoing') return 1;

      // Then upcoming trips by start date
      if (a.status === 'upcoming' && b.status === 'upcoming') {
        if (a.start_date && b.start_date) {
          return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
        }
      }

      // Then planning
      if (a.status === 'planning' && b.status !== 'planning') return -1;
      if (b.status === 'planning' && a.status !== 'planning') return 1;

      // Finally by updated_at
      return new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime();
    });

    return result;
  }, [trips, searchQuery]);

  // Grouped trips
  const groupedTrips = useMemo(() => {
    const ongoing = filteredTrips.filter(t => t.status === 'ongoing');
    const upcoming = filteredTrips.filter(t => t.status === 'upcoming');
    const planning = filteredTrips.filter(t => t.status === 'planning');
    const completed = filteredTrips.filter(t => t.status === 'completed');

    return { ongoing, upcoming, planning, completed };
  }, [filteredTrips]);

  // Create new trip
  const handleCreateTrip = useCallback(async () => {
    setIsCreating(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('trips')
        .insert({
          user_id: userId,
          title: 'New Trip',
          status: 'planning',
        })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        router.push(`/trips/${data.id}`);
      }
    } catch (err) {
      console.error('Failed to create trip:', err);
      setIsCreating(false);
    }
  }, [userId, router]);

  // Delete trip
  const handleDeleteTrip = useCallback(async (tripId: string) => {
    if (!confirm('Delete this trip? This cannot be undone.')) return;

    try {
      const supabase = createClient();
      await supabase.from('trips').delete().eq('id', tripId).eq('user_id', userId);
      setTrips(prev => prev.filter(t => t.id !== tripId));
    } catch (err) {
      console.error('Failed to delete trip:', err);
    }
  }, [userId]);

  // Duplicate trip
  const handleDuplicateTrip = useCallback(async (trip: TripWithHealth) => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('trips')
        .insert({
          user_id: userId,
          title: `${trip.title} (Copy)`,
          destination: trip.destination,
          status: 'planning',
        })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setTrips(prev => [data, ...prev]);
      }
    } catch (err) {
      console.error('Failed to duplicate trip:', err);
    }
  }, [userId]);

  // Render trip section
  const renderTripSection = (title: string, trips: TripWithHealth[], icon?: React.ReactNode) => {
    if (trips.length === 0) return null;

    return (
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          {icon}
          <h2 className="text-sm font-medium text-stone-500 dark:text-gray-400 uppercase tracking-wide">
            {title}
          </h2>
          <span className="text-xs text-stone-400 dark:text-gray-500">
            ({trips.length})
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {trips.map(trip => (
            <TripCard
              key={trip.id}
              trip={trip}
              onDelete={handleDeleteTrip}
              onDuplicate={handleDuplicateTrip}
            />
          ))}
        </div>
      </section>
    );
  };

  return (
    <main className="w-full min-h-screen bg-stone-50 dark:bg-gray-950 pt-20 pb-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-stone-900 dark:text-white">
              My Trips
            </h1>
            {trips.length > 0 && (
              <p className="text-sm text-stone-500 dark:text-gray-400 mt-1">
                {trips.length} {trips.length === 1 ? 'trip' : 'trips'}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            {trips.length > 0 && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search trips..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-48 sm:w-56 pl-9 pr-3 py-2 text-sm bg-white dark:bg-gray-900 border border-stone-200 dark:border-gray-800 rounded-full placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-gray-700"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Create Button */}
            <button
              onClick={handleCreateTrip}
              disabled={isCreating}
              className="flex items-center gap-2 px-4 py-2 bg-stone-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded-full hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {isCreating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">New Trip</span>
            </button>
          </div>
        </div>

        {/* Content */}
        {trips.length === 0 ? (
          <EmptyState onCreateTrip={handleCreateTrip} />
        ) : filteredTrips.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm text-stone-500 dark:text-gray-400">
              No trips match your search
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="mt-2 text-sm text-stone-900 dark:text-white hover:underline"
            >
              Clear search
            </button>
          </div>
        ) : (
          <>
            {/* Ongoing */}
            {renderTripSection(
              'Happening Now',
              groupedTrips.ongoing,
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            )}

            {/* Upcoming */}
            {renderTripSection(
              'Coming Up',
              groupedTrips.upcoming,
              <Clock className="w-4 h-4 text-amber-500" />
            )}

            {/* Planning */}
            {renderTripSection(
              'In Planning',
              groupedTrips.planning,
              <Sparkles className="w-4 h-4 text-blue-500" />
            )}

            {/* Completed */}
            {groupedTrips.completed.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-sm font-medium text-stone-400 dark:text-gray-500 uppercase tracking-wide">
                    Past Trips
                  </h2>
                  <span className="text-xs text-stone-400 dark:text-gray-500">
                    ({groupedTrips.completed.length})
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 opacity-75">
                  {groupedTrips.completed.map(trip => (
                    <TripCard
                      key={trip.id}
                      trip={trip}
                      onDelete={handleDeleteTrip}
                      onDuplicate={handleDuplicateTrip}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {/* Mobile FAB */}
      <div className="fixed bottom-6 right-6 sm:hidden z-40">
        <button
          onClick={handleCreateTrip}
          disabled={isCreating}
          className="w-14 h-14 rounded-full bg-stone-900 dark:bg-white shadow-lg flex items-center justify-center disabled:opacity-50"
        >
          {isCreating ? (
            <Loader2 className="w-6 h-6 text-white dark:text-gray-900 animate-spin" />
          ) : (
            <Plus className="w-6 h-6 text-white dark:text-gray-900" />
          )}
        </button>
      </div>
    </main>
  );
}
