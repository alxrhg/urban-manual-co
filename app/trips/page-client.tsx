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
  Archive,
  Clock,
  Grid3X3,
  List,
  SortAsc,
  ChevronDown,
  Hotel,
  Utensils,
  Sun,
  Cloud,
  CloudRain,
  Users,
  Globe,
} from 'lucide-react';
import { formatTripDateRange, calculateTripDays, parseDateString } from '@/lib/utils';
import { TripHealthDots } from '@/components/trips/TripHealthIndicator';
import { formatDestinationsFromField, parseDestinations } from '@/types/trip';
import type { Trip } from '@/types/trip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';

export interface TripWithHealth extends Trip {
  item_count?: number;
  has_hotel?: boolean;
  has_flight?: boolean;
}

type TripStatus = 'all' | 'planning' | 'upcoming' | 'ongoing' | 'completed';
type ViewMode = 'grid' | 'list';
type SortOption = 'recent' | 'date' | 'destination' | 'status';

// Status badge config
function getStatusConfig(status?: string) {
  switch (status) {
    case 'planning':
      return { label: 'Planning', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Sparkles };
    case 'upcoming':
      return { label: 'Upcoming', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: Calendar };
    case 'ongoing':
      return { label: 'Now', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', pulse: true, icon: Globe };
    case 'completed':
      return { label: 'Done', color: 'bg-stone-100 text-stone-600 dark:bg-gray-800 dark:text-gray-400', icon: Archive };
    default:
      return null;
  }
}

// Calculate countdown for upcoming trips
function getCountdown(startDate: string | null): string | null {
  if (!startDate) return null;
  const start = parseDateString(startDate);
  if (!start) return null;

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diffTime = start.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return null;
  if (diffDays === 0) return 'Today!';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays <= 7) return `${diffDays} days`;
  if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} weeks`;
  return `${Math.ceil(diffDays / 30)} months`;
}

// Get trip progress percentage
function getTripProgress(trip: TripWithHealth, daysCount: number | null): number {
  if (!daysCount || daysCount <= 0) return 0;
  const itemsPerDay = (trip.item_count || 0) / daysCount;
  const hasHotel = trip.has_hotel ? 25 : 0;
  const hasFlight = trip.has_flight ? 25 : 0;
  const hasItems = Math.min(itemsPerDay * 20, 50); // Up to 50% for items
  return Math.min(hasHotel + hasFlight + hasItems, 100);
}

interface TripsPageClientProps {
  initialTrips: TripWithHealth[];
  userId: string;
}

export default function TripsPageClient({ initialTrips, userId }: TripsPageClientProps) {
  const router = useRouter();
  const [trips, setTrips] = useState<TripWithHealth[]>(initialTrips);
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TripStatus>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  // Calculate stats
  const stats = useMemo(() => {
    const totalDays = trips.reduce((acc, t) => {
      const days = calculateTripDays(t.start_date, t.end_date);
      return acc + (days || 0);
    }, 0);

    const totalPlaces = trips.reduce((acc, t) => acc + (t.item_count || 0), 0);
    const totalDestinations = new Set(trips.flatMap(t => parseDestinations(t.destination))).size;

    return {
      total: trips.length,
      planning: trips.filter(t => t.status === 'planning').length,
      upcoming: trips.filter(t => t.status === 'upcoming').length,
      ongoing: trips.filter(t => t.status === 'ongoing').length,
      completed: trips.filter(t => t.status === 'completed').length,
      totalDays,
      totalPlaces,
      totalDestinations,
    };
  }, [trips]);

  // Filter and sort trips
  const filteredTrips = useMemo(() => {
    let result = trips.filter((trip) => {
      const destinationsDisplay = formatDestinationsFromField(trip.destination);
      const matchesSearch = searchQuery === '' ||
        trip.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        destinationsDisplay.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || trip.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    // Sort
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'date':
          if (!a.start_date && !b.start_date) return 0;
          if (!a.start_date) return 1;
          if (!b.start_date) return -1;
          return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
        case 'destination':
          const destA = formatDestinationsFromField(a.destination);
          const destB = formatDestinationsFromField(b.destination);
          return destA.localeCompare(destB);
        case 'status':
          const statusOrder = { ongoing: 0, upcoming: 1, planning: 2, completed: 3 };
          return (statusOrder[a.status as keyof typeof statusOrder] || 4) -
                 (statusOrder[b.status as keyof typeof statusOrder] || 4);
        case 'recent':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return result;
  }, [trips, searchQuery, statusFilter, sortBy]);

  // Get upcoming trip for countdown
  const nextTrip = useMemo(() => {
    return trips
      .filter(t => t.status === 'upcoming' && t.start_date)
      .sort((a, b) => {
        const dateA = parseDateString(a.start_date);
        const dateB = parseDateString(b.start_date);
        if (!dateA || !dateB) return 0;
        return dateA.getTime() - dateB.getTime();
      })[0];
  }, [trips]);

  const createTrip = async () => {
    try {
      setCreating(true);
      const supabase = createClient();
      if (!supabase) return;

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
      if (data) router.push(`/trips/${data.id}`);
    } catch (err) {
      console.error('Error creating trip:', err);
    } finally {
      setCreating(false);
    }
  };

  const duplicateTrip = async (trip: TripWithHealth) => {
    try {
      setDuplicatingId(trip.id);
      const supabase = createClient();
      if (!supabase) return;

      // Create duplicate trip
      const { data: newTrip, error: tripError } = await supabase
        .from('trips')
        .insert({
          user_id: userId,
          title: `${trip.title} (Copy)`,
          destination: trip.destination,
          description: trip.description,
          status: 'planning',
          cover_image: trip.cover_image,
        })
        .select()
        .single();

      if (tripError) throw tripError;

      // Copy itinerary items if any
      if (newTrip) {
        const { data: items } = await supabase
          .from('itinerary_items')
          .select('*')
          .eq('trip_id', trip.id);

        if (items && items.length > 0) {
          const newItems = items.map(item => ({
            trip_id: newTrip.id,
            destination_slug: item.destination_slug,
            day: item.day,
            order_index: item.order_index,
            time: item.time,
            title: item.title,
            description: item.description,
            notes: item.notes,
          }));

          await supabase.from('itinerary_items').insert(newItems);
        }

        // Refresh trips list
        const { data: updatedTrips } = await supabase
          .from('trips')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (updatedTrips) {
          setTrips(updatedTrips);
        }

        router.push(`/trips/${newTrip.id}`);
      }
    } catch (err) {
      console.error('Error duplicating trip:', err);
    } finally {
      setDuplicatingId(null);
    }
  };

  const deleteTrip = async (tripId: string) => {
    try {
      setDeletingId(tripId);
      const supabase = createClient();
      if (!supabase) return;

      // Delete itinerary items first
      await supabase
        .from('itinerary_items')
        .delete()
        .eq('trip_id', tripId);

      // Delete trip
      const { error } = await supabase
        .from('trips')
        .delete()
        .eq('id', tripId)
        .eq('user_id', userId);

      if (error) throw error;

      setTrips(prev => prev.filter(t => t.id !== tripId));
    } catch (err) {
      console.error('Error deleting trip:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const shareTrip = async (trip: TripWithHealth) => {
    const url = `${window.location.origin}/trips/${trip.id}`;
    const text = `Check out my trip: ${trip.title}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: trip.title, text, url });
      } catch (err) {
        // User cancelled or share failed
      }
    } else {
      await navigator.clipboard.writeText(url);
      // Could add toast notification here
    }
  };

  return (
    <main className="w-full px-4 sm:px-6 md:px-10 pt-16 pb-32 min-h-screen bg-stone-50 dark:bg-gray-950">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-light text-stone-900 dark:text-white mb-1">
                Trips
              </h1>
              {trips.length > 0 && (
                <p className="text-sm text-stone-500 dark:text-gray-400">
                  {stats.total} trip{stats.total !== 1 ? 's' : ''} · {stats.totalPlaces} places · {stats.totalDestinations} destinations
                </p>
              )}
            </div>

            {/* New Trip Button */}
            <button
              onClick={createTrip}
              disabled={creating}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-stone-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 min-h-[44px]"
            >
              {creating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              New Trip
            </button>
          </div>

          {/* Next Trip Countdown */}
          {nextTrip && (
            <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200/50 dark:border-amber-800/30">
              <div className="flex items-center gap-4">
                <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-amber-100 dark:bg-amber-900/30 flex-shrink-0">
                  {nextTrip.cover_image ? (
                    <Image
                      src={nextTrip.cover_image}
                      alt={nextTrip.title}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Plane className="w-6 h-6 text-amber-500" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-0.5">
                    Next Adventure
                  </p>
                  <Link href={`/trips/${nextTrip.id}`} className="block">
                    <h3 className="text-base font-medium text-stone-900 dark:text-white truncate hover:underline">
                      {nextTrip.title}
                    </h3>
                  </Link>
                  <p className="text-sm text-stone-500 dark:text-gray-400">
                    {formatDestinationsFromField(nextTrip.destination)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-light text-amber-600 dark:text-amber-400">
                    {getCountdown(nextTrip.start_date)}
                  </p>
                  <p className="text-xs text-stone-500 dark:text-gray-400">
                    {formatTripDateRange(nextTrip.start_date, nextTrip.end_date)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Filters & Controls */}
        {trips.length > 0 && (
          <div className="mb-6 space-y-4">
            {/* Status Tabs */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex gap-x-1 sm:gap-x-4 text-xs overflow-x-auto scrollbar-hide -mx-1 px-1">
                {[
                  { key: 'all', label: 'All', count: stats.total },
                  { key: 'planning', label: 'Planning', count: stats.planning },
                  { key: 'upcoming', label: 'Upcoming', count: stats.upcoming },
                  ...(stats.ongoing > 0 ? [{ key: 'ongoing', label: 'Active', count: stats.ongoing }] : []),
                  { key: 'completed', label: 'Past', count: stats.completed },
                ].map(({ key, label, count }) => (
                  <button
                    key={key}
                    onClick={() => setStatusFilter(key as TripStatus)}
                    className={`
                      transition-all flex items-center gap-1.5 whitespace-nowrap
                      px-3 py-2 sm:px-2 sm:py-1 rounded-full sm:rounded-none
                      min-h-[40px] sm:min-h-0
                      ${statusFilter === key
                        ? 'font-medium text-stone-900 dark:text-white bg-stone-100 dark:bg-gray-800 sm:bg-transparent sm:dark:bg-transparent'
                        : 'font-medium text-stone-400 dark:text-gray-500 hover:text-stone-600 dark:hover:text-gray-300'
                      }
                    `}
                  >
                    {count > 0 && (
                      <span className={`
                        w-4 h-4 rounded-full text-[10px] flex items-center justify-center
                        ${statusFilter === key
                          ? 'bg-stone-200 dark:bg-gray-700'
                          : 'bg-stone-100 dark:bg-gray-800'
                        }
                      `}>
                        {count}
                      </span>
                    )}
                    {label}
                  </button>
                ))}
              </div>

              {/* View & Sort Controls */}
              <div className="flex items-center gap-2">
                {/* Sort Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-stone-500 dark:text-gray-400 hover:bg-stone-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                      <SortAsc className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">
                        {sortBy === 'recent' && 'Recent'}
                        {sortBy === 'date' && 'Date'}
                        {sortBy === 'destination' && 'Destination'}
                        {sortBy === 'status' && 'Status'}
                      </span>
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setSortBy('recent')}>
                      <Clock className="w-3.5 h-3.5 mr-2" />
                      Recently updated
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy('date')}>
                      <Calendar className="w-3.5 h-3.5 mr-2" />
                      Trip date
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy('destination')}>
                      <MapPin className="w-3.5 h-3.5 mr-2" />
                      Destination
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy('status')}>
                      <Archive className="w-3.5 h-3.5 mr-2" />
                      Status
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* View Toggle */}
                <div className="hidden sm:flex items-center bg-stone-100 dark:bg-gray-800 rounded-lg p-0.5">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded-md transition-colors ${
                      viewMode === 'list'
                        ? 'bg-white dark:bg-gray-700 text-stone-900 dark:text-white shadow-sm'
                        : 'text-stone-400 dark:text-gray-500 hover:text-stone-600 dark:hover:text-gray-300'
                    }`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-md transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-white dark:bg-gray-700 text-stone-900 dark:text-white shadow-sm'
                        : 'text-stone-400 dark:text-gray-500 hover:text-stone-600 dark:hover:text-gray-300'
                    }`}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </button>
                </div>

                {/* Search Toggle */}
                <button
                  onClick={() => setSearchQuery(searchQuery ? '' : ' ')}
                  className={`
                    p-2 rounded-lg transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center
                    ${searchQuery
                      ? 'bg-stone-100 dark:bg-gray-800 text-stone-900 dark:text-white'
                      : 'hover:bg-stone-100 dark:hover:bg-gray-800 text-stone-400 dark:text-gray-500'
                    }
                  `}
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Search Input */}
            {searchQuery !== '' && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search trips..."
                  value={searchQuery.trim()}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  className="w-full pl-10 pr-10 py-3 bg-white dark:bg-gray-900 border border-stone-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/10 dark:focus:ring-white/10 transition-all"
                />
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600 dark:hover:text-gray-300 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Trip List */}
        {trips.length === 0 ? (
          /* Empty State */
          <div className="text-center py-16 px-6 rounded-2xl border border-dashed border-stone-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-stone-100 dark:bg-gray-800 flex items-center justify-center">
              <Plane className="w-7 h-7 text-stone-400" />
            </div>
            <h3 className="text-lg font-medium text-stone-900 dark:text-white mb-2">
              Plan your next adventure
            </h3>
            <p className="text-sm text-stone-500 dark:text-gray-400 mb-8 max-w-sm mx-auto">
              Create a trip to organize your itinerary, track flights and hotels, and discover great places.
            </p>
            <button
              onClick={createTrip}
              disabled={creating}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-stone-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {creating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Create Your First Trip
            </button>

            {/* Features */}
            <div className="mt-10 pt-8 border-t border-stone-100 dark:border-gray-800">
              <div className="flex flex-wrap justify-center gap-3 text-xs text-stone-500 dark:text-gray-400">
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-50 dark:bg-gray-800/50 rounded-full">
                  <MapPin className="w-3.5 h-3.5" /> Save places
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-50 dark:bg-gray-800/50 rounded-full">
                  <Plane className="w-3.5 h-3.5" /> Track flights
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-50 dark:bg-gray-800/50 rounded-full">
                  <Hotel className="w-3.5 h-3.5" /> Book hotels
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-50 dark:bg-gray-800/50 rounded-full">
                  <Calendar className="w-3.5 h-3.5" /> Day-by-day itinerary
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-50 dark:bg-gray-800/50 rounded-full">
                  <Sparkles className="w-3.5 h-3.5" /> AI suggestions
                </span>
              </div>
            </div>
          </div>
        ) : filteredTrips.length === 0 ? (
          /* No Results */
          <div className="text-center py-16 px-6 rounded-2xl border border-dashed border-stone-200 dark:border-gray-800">
            <div className="w-14 h-14 mx-auto mb-6 rounded-full bg-stone-100 dark:bg-gray-800 flex items-center justify-center">
              <Search className="w-6 h-6 text-stone-400" />
            </div>
            <h3 className="text-lg font-medium text-stone-900 dark:text-white mb-2">
              No matching trips
            </h3>
            <p className="text-sm text-stone-500 dark:text-gray-400 mb-6">
              {searchQuery.trim() ? `No trips found for "${searchQuery.trim()}"` : `No ${statusFilter} trips found`}
            </p>
            <button
              onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
              className="text-sm font-medium text-stone-900 dark:text-white underline underline-offset-4 hover:opacity-70 transition-opacity"
            >
              Clear filters
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTrips.map((trip) => {
              const statusConfig = getStatusConfig(trip.status);
              const daysCount = calculateTripDays(trip.start_date, trip.end_date);
              const dateDisplay = formatTripDateRange(trip.start_date, trip.end_date);
              const destinationsDisplay = formatDestinationsFromField(trip.destination);
              const countdown = getCountdown(trip.start_date);
              const progress = getTripProgress(trip, daysCount);

              return (
                <div
                  key={trip.id}
                  className="group relative flex flex-col rounded-2xl bg-white dark:bg-gray-900 border border-stone-200 dark:border-gray-800 hover:border-stone-300 dark:hover:border-gray-700 transition-all overflow-hidden"
                >
                  {/* Cover Image */}
                  <Link href={`/trips/${trip.id}`} className="relative h-36 bg-stone-100 dark:bg-gray-800">
                    {trip.cover_image ? (
                      <Image
                        src={trip.cover_image}
                        alt={trip.title}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-stone-100 to-stone-200 dark:from-gray-800 dark:to-gray-700">
                        <MapPin className="w-8 h-8 text-stone-300 dark:text-gray-600" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />

                    {/* Status Badge */}
                    {statusConfig && (
                      <span className={`absolute top-3 left-3 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide ${statusConfig.color}`}>
                        {statusConfig.pulse && (
                          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                        )}
                        {statusConfig.label}
                      </span>
                    )}

                    {/* Countdown */}
                    {countdown && trip.status === 'upcoming' && (
                      <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/90 dark:bg-gray-900/90 text-stone-900 dark:text-white">
                        {countdown}
                      </span>
                    )}
                  </Link>

                  {/* Content */}
                  <div className="flex-1 p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <Link href={`/trips/${trip.id}`} className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-stone-900 dark:text-white truncate hover:underline">
                          {trip.title}
                        </h3>
                      </Link>

                      {/* Actions Menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1 -mr-1 text-stone-400 hover:text-stone-600 dark:hover:text-gray-300 transition-colors opacity-0 group-hover:opacity-100">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => duplicateTrip(trip)} disabled={duplicatingId === trip.id}>
                            <Copy className="w-3.5 h-3.5 mr-2" />
                            {duplicatingId === trip.id ? 'Duplicating...' : 'Duplicate'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => shareTrip(trip)}>
                            <Share2 className="w-3.5 h-3.5 mr-2" />
                            Share
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => deleteTrip(trip.id)}
                            disabled={deletingId === trip.id}
                            className="text-red-600 dark:text-red-400"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-2" />
                            {deletingId === trip.id ? 'Deleting...' : 'Delete'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Meta Info */}
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stone-500 dark:text-gray-400 mb-3">
                      {destinationsDisplay && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {destinationsDisplay}
                        </span>
                      )}
                      {dateDisplay && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {dateDisplay}
                        </span>
                      )}
                    </div>

                    {/* Progress Bar for Planning */}
                    {trip.status === 'planning' && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-stone-400 dark:text-gray-500">Planning progress</span>
                          <span className="text-stone-500 dark:text-gray-400">{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} className="h-1" />
                      </div>
                    )}

                    {/* Quick Stats */}
                    {(trip.item_count || 0) > 0 && trip.status !== 'planning' && (
                      <div className="flex items-center gap-3 text-xs text-stone-400 dark:text-gray-500">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {trip.item_count} places
                        </span>
                        {daysCount && daysCount > 0 && (
                          <span>{daysCount} days</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* List View */
          <div className="space-y-3">
            {filteredTrips.map((trip) => {
              const statusConfig = getStatusConfig(trip.status);
              const daysCount = calculateTripDays(trip.start_date, trip.end_date);
              const dateDisplay = formatTripDateRange(trip.start_date, trip.end_date);
              const destinationsDisplay = formatDestinationsFromField(trip.destination);
              const countdown = getCountdown(trip.start_date);
              const progress = getTripProgress(trip, daysCount);

              return (
                <div
                  key={trip.id}
                  className="group flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-gray-900 border border-stone-200 dark:border-gray-800 hover:border-stone-300 dark:hover:border-gray-700 transition-all"
                >
                  {/* Cover Image */}
                  <Link href={`/trips/${trip.id}`} className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-stone-100 dark:bg-gray-800 flex-shrink-0">
                    {trip.cover_image ? (
                      <Image
                        src={trip.cover_image}
                        alt={trip.title}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="80px"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <MapPin className="w-6 h-6 text-stone-300 dark:text-gray-600" />
                      </div>
                    )}
                  </Link>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <Link href={`/trips/${trip.id}`} className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-stone-900 dark:text-white truncate hover:underline">
                          {trip.title}
                        </h3>
                      </Link>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Countdown */}
                        {countdown && trip.status === 'upcoming' && (
                          <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                            {countdown}
                          </span>
                        )}
                        {/* Status Badge */}
                        {statusConfig && (
                          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide ${statusConfig.color}`}>
                            {statusConfig.pulse && (
                              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                            )}
                            {statusConfig.label}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Meta Info */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500 dark:text-gray-400">
                      {destinationsDisplay && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {destinationsDisplay}
                        </span>
                      )}
                      {daysCount && daysCount > 0 && (
                        <span>{daysCount} day{daysCount !== 1 ? 's' : ''}</span>
                      )}
                      {dateDisplay && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {dateDisplay}
                        </span>
                      )}
                    </div>

                    {/* Health/Progress Indicator */}
                    {trip.status === 'planning' && (
                      <div className="flex items-center gap-3 mt-2">
                        <TripHealthDots
                          itemCount={trip.item_count || 0}
                          dayCount={daysCount || 1}
                          hasHotel={trip.has_hotel || false}
                          hasFlight={trip.has_flight || false}
                        />
                        {(trip.item_count || 0) < 3 && (
                          <span className="text-[10px] text-stone-400 dark:text-gray-500 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            Continue planning
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-gray-300 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => duplicateTrip(trip)} disabled={duplicatingId === trip.id}>
                        <Copy className="w-3.5 h-3.5 mr-2" />
                        {duplicatingId === trip.id ? 'Duplicating...' : 'Duplicate'}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => shareTrip(trip)}>
                        <Share2 className="w-3.5 h-3.5 mr-2" />
                        Share
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => deleteTrip(trip.id)}
                        disabled={deletingId === trip.id}
                        className="text-red-600 dark:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-2" />
                        {deletingId === trip.id ? 'Deleting...' : 'Delete'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
