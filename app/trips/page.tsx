'use client';

import { useEffect, useState, useMemo, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Plus,
  Trash2,
  Edit2,
  Eye,
  Calendar,
  MapPin,
  Loader2,
  Search,
  SlidersHorizontal,
  CalendarRange,
} from 'lucide-react';
import { TripPlanner } from '@/components/TripPlanner';
import type { Trip } from '@/types/trip';
import Image from 'next/image';

interface TripWithImage extends Trip {
  firstLocationImage?: string | null;
}

export default function TripsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [trips, setTrips] = useState<TripWithImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [deleteConfirmTrip, setDeleteConfirmTrip] = useState<{ id: string; title: string } | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'planning' | 'upcoming' | 'past'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [sortOption, setSortOption] = useState<'recent' | 'upcoming'>('recent');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchTrips();
    } else {
      setTrips([]);
    }
  }, [user]);

  const fetchTrips = async () => {
    try {
      setLoading(true);
      setError(null);
      const supabaseClient = createClient();
      if (!supabaseClient || !user) return;

      let query = supabaseClient
        .from('trips')
        .select('*')
        .order('created_at', { ascending: false });

      query = query.eq('user_id', user.id);

      const { data, error } = await query;

      if (error) throw error;
      
      // Fetch first location image for each trip
      const tripsWithImages = await Promise.all(
        (data || []).map(async (trip) => {
          // If trip has cover_image, use it
          if (trip.cover_image) {
            return { ...trip, firstLocationImage: null };
          }

          // Otherwise, fetch first itinerary item's image
          const { data: items } = await supabaseClient
            .from('itinerary_items')
            .select('destination_slug, notes')
            .eq('trip_id', trip.id)
            .order('day', { ascending: true })
            .order('order_index', { ascending: true })
            .limit(1)
            .maybeSingle();

          let firstLocationImage: string | null = null;

          if (items?.destination_slug) {
            // Try to get image from destination
            const { data: dest } = await supabaseClient
              .from('destinations')
              .select('image')
              .eq('slug', items.destination_slug)
              .maybeSingle();
            
            if (dest?.image) {
              firstLocationImage = dest.image;
            }
          } else if (items?.notes) {
            // Try to parse image from notes JSON
            try {
              const notesData = JSON.parse(items.notes);
              if (notesData.image) {
                firstLocationImage = notesData.image;
              }
            } catch {
              // Ignore parse errors
            }
          }

          return { ...trip, firstLocationImage };
        })
      );

      setTrips(tripsWithImages);
    } catch (error) {
      console.error('Error fetching trips:', error);
      setError('We couldn\'t load your trips right now. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const deleteTrip = async (id: string, title: string) => {
    try {
      const supabaseClient = createClient();
      if (!supabaseClient) return;

      const { error } = await supabaseClient
        .from('trips')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTrips(trips.filter((trip) => trip.id !== id));
      setDeleteConfirmTrip(null);
    } catch (error) {
      console.error('Error deleting trip:', error);
      alert('Failed to delete trip');
    }
  };

  // Group trips by status
  const groupedTrips = useMemo(() => {
    const planning = trips.filter(t => t.status === 'planning');
    const upcoming = trips.filter(t => t.status === 'upcoming' || t.status === 'ongoing');
    const past = trips.filter(t => t.status === 'completed');

    return { planning, upcoming, past };
  }, [trips]);

  const filteredTrips = useMemo(() => {
    const matches = trips.filter((trip) => {
      const matchesSearch = [trip.title, trip.destination]
        .filter(Boolean)
        .some((field) => field?.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'planning' && trip.status === 'planning') ||
        (statusFilter === 'upcoming' && (trip.status === 'upcoming' || trip.status === 'ongoing')) ||
        (statusFilter === 'past' && trip.status === 'completed');

      const startDate = trip.start_date ? new Date(trip.start_date) : null;
      const endDate = trip.end_date ? new Date(trip.end_date) : null;
      const filterStart = dateRange.start ? new Date(dateRange.start) : null;
      const filterEnd = dateRange.end ? new Date(dateRange.end) : null;

      const matchesDateStart = filterStart ? ((startDate || endDate)?.getTime() ?? 0) >= filterStart.getTime() : true;
      const matchesDateEnd = filterEnd ? ((endDate || startDate)?.getTime() ?? 0) <= filterEnd.getTime() : true;

      return matchesSearch && matchesStatus && matchesDateStart && matchesDateEnd;
    });

    return matches.sort((a, b) => {
      if (sortOption === 'upcoming') {
        const aDate = a.start_date ? new Date(a.start_date).getTime() : Infinity;
        const bDate = b.start_date ? new Date(b.start_date).getTime() : Infinity;
        return aDate - bDate;
      }

      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [dateRange.end, dateRange.start, searchQuery, sortOption, statusFilter, trips]);

  const formatDateRange = (startDate: string | null, endDate: string | null) => {
    if (!startDate && !endDate) return null;
    
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    if (startDate && endDate) {
      return `${formatDate(startDate)} → ${formatDate(endDate)}`;
    }
    if (startDate) {
      return `From ${formatDate(startDate)}`;
    }
    if (endDate) {
      return `Until ${formatDate(endDate)}`;
    }
    return null;
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'planning':
        return 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300';
      case 'upcoming':
      case 'ongoing':
        return 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300';
      case 'completed':
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'planning':
        return 'Planning';
      case 'upcoming':
        return 'Upcoming';
      case 'ongoing':
        return 'Ongoing';
      case 'completed':
        return 'Completed';
      default:
        return status;
    }
  };

  if (!user) {
    return null;
  }

  const hasAnyTrips = trips.length > 0;
  const hasFilteredTrips = filteredTrips.length > 0;

  const nextTrip = groupedTrips.upcoming
    .filter((trip) => trip.start_date)
    .sort((a, b) => new Date(a.start_date || '').getTime() - new Date(b.start_date || '').getTime())[0];

  const nextTripDateLabel = nextTrip?.start_date
    ? new Date(nextTrip.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <main className="w-full px-6 md:px-10 lg:px-12 py-20 min-h-screen">
      <div className="w-full max-w-7xl mx-auto">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 text-white p-8 md:p-12 mb-10">
          <div className="absolute inset-0 opacity-60 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.08),_transparent_35%),_radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.08),_transparent_35%)]" />
          <div className="relative grid gap-10 lg:grid-cols-[1.4fr_1fr] items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Your trips at a glance
              </div>
              <div className="space-y-3">
                <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">Craft your next chapter.</h1>
                <p className="text-sm md:text-base text-white/80 max-w-2xl">
                  Track where you have been and where you are headed. Filter, search, and jump into planning without losing momentum.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setShowCreateDialog(true)}
                  className="inline-flex items-center gap-2 rounded-full bg-white text-gray-900 px-5 py-2.5 text-sm font-semibold shadow-sm transition hover:translate-y-[-1px] hover:shadow-lg"
                >
                  <Plus className="h-4 w-4" />
                  Start a trip
                </button>
                <button
                  onClick={() => router.push('/trips')}
                  className="inline-flex items-center gap-2 rounded-full border border-white/30 px-4 py-2.5 text-sm font-medium text-white transition hover:border-white/60 hover:bg-white/10"
                >
                  View all itineraries
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <StatCard
                label="Total trips"
                value={hasAnyTrips ? trips.length.toString() : '—'}
                helper="All time"
              />
              <StatCard
                label="In planning"
                value={groupedTrips.planning.length.toString()}
                helper={groupedTrips.planning.length ? 'Keep the momentum' : 'No drafts yet'}
              />
              <StatCard
                label="Next departure"
                value={nextTripDateLabel || 'TBD'}
                helper={groupedTrips.upcoming.length ? 'Upcoming' : 'Add a date'}
              />
            </div>
          </div>
        </section>

        {/* Filters */}
        <div className="mb-8 rounded-2xl border border-gray-200/70 dark:border-gray-800/70 bg-white dark:bg-gray-950 shadow-sm">
          <div className="grid gap-4 p-4 md:p-6 md:grid-cols-[1.2fr_0.9fr_0.9fr_0.7fr] items-end">
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2 mb-2">
                <Search className="h-3.5 w-3.5" />
                Search
              </label>
              <div className="relative">
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by title or destination"
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-3 py-2.5 pl-10 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-gray-400 focus:outline-none"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2 mb-2">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:border-gray-400 focus:outline-none"
              >
                <option value="all">All statuses</option>
                <option value="planning">Planning</option>
                <option value="upcoming">Upcoming / Ongoing</option>
                <option value="past">Completed</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2 mb-2">
                <CalendarRange className="h-3.5 w-3.5" />
                Date range
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:border-gray-400 focus:outline-none"
                />
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:border-gray-400 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2 mb-2">
                Sort
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as typeof sortOption)}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:border-gray-400 focus:outline-none"
                >
                  <option value="recent">Newest first</option>
                  <option value="upcoming">Next departures</option>
                </select>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                    setDateRange({ start: '', end: '' });
                    setSortOption('recent');
                  }}
                  className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-8 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
            <div className="flex items-center justify-between">
              <p>{error}</p>
              <button
                onClick={fetchTrips}
                className="text-xs font-medium underline underline-offset-4 hover:text-red-900 dark:hover:text-red-100"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !hasAnyTrips && !error && (
          <div className="rounded-3xl border border-dashed border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-center py-20 px-6">
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-900 text-gray-500">
              <Calendar className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">Start your first itinerary</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
              Create a trip to organize destinations, dates, and plans in one place. You can always edit or collaborate later.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                onClick={() => setShowCreateDialog(true)}
                className="inline-flex items-center gap-2 rounded-full bg-gray-900 text-white px-5 py-2.5 text-sm font-semibold shadow-sm transition hover:translate-y-[-1px] hover:shadow-lg dark:bg-white dark:text-gray-900"
              >
                <Plus className="h-4 w-4" />
                Plan a trip
              </button>
            </div>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {[...Array(6)].map((_, index) => (
              <div
                key={index}
                className="animate-pulse overflow-hidden rounded-2xl border border-gray-200/70 dark:border-gray-800/70 bg-white dark:bg-gray-950"
              >
                <div className="aspect-[16/9] bg-gray-100 dark:bg-gray-900" />
                <div className="p-5 space-y-3">
                  <div className="h-4 w-3/4 rounded bg-gray-100 dark:bg-gray-900" />
                  <div className="h-3 w-1/2 rounded bg-gray-100 dark:bg-gray-900" />
                  <div className="h-3 w-full rounded bg-gray-100 dark:bg-gray-900" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Trips Grid */}
        {!loading && hasFilteredTrips && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredTrips.map((trip) => (
              <TripCard
                key={trip.id}
                trip={trip}
                onView={() => router.push(`/trips/${trip.id}`)}
                onEdit={() => {
                  setEditingTripId(trip.id);
                  setShowCreateDialog(true);
                }}
                onDelete={() => setDeleteConfirmTrip({ id: trip.id, title: trip.title })}
                formatDateRange={formatDateRange}
                getStatusBadgeColor={getStatusBadgeColor}
                getStatusLabel={getStatusLabel}
              />
            ))}
          </div>
        )}

        {/* Filtered Empty State */}
        {!loading && hasAnyTrips && !hasFilteredTrips && !error && (
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-10 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-900 text-gray-500">
              <Search className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No trips match these filters</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Try adjusting your search, status, or date range.</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setDateRange({ start: '', end: '' });
                setSortOption('recent');
              }}
              className="text-sm font-medium text-gray-900 dark:text-white underline underline-offset-4"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Trip Planner Modal - Only render when open */}
      {showCreateDialog && (
        <TripPlanner
          isOpen={true}
          tripId={editingTripId || undefined}
          onClose={() => {
            setShowCreateDialog(false);
            setEditingTripId(null);
            if (user) {
              fetchTrips();
            }
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div
            className="fixed inset-0 bg-black/50 transition-opacity"
            onClick={() => setDeleteConfirmTrip(null)}
          />
          <div className="relative bg-white dark:bg-gray-950 rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Delete Trip
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 font-light">
              Are you sure you want to delete &ldquo;{deleteConfirmTrip.title}&rdquo;? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirmTrip(null)}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-900 transition-all duration-180 ease-out"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteTrip(deleteConfirmTrip.id, deleteConfirmTrip.title)}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-all duration-180 ease-out"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

interface TripCardProps {
  trip: TripWithImage;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  formatDateRange: (start: string | null, end: string | null) => string | null;
  getStatusBadgeColor: (status: string) => string;
  getStatusLabel: (status: string) => string;
}

function TripCard({ trip, onView, onEdit, onDelete, formatDateRange, getStatusBadgeColor, getStatusLabel }: TripCardProps) {
  const imageUrl = trip.cover_image || trip.firstLocationImage;
  const dateRange = formatDateRange(trip.start_date, trip.end_date);

  // Format meta info: {city} · {start_date} → {end_date}
  const metaInfo = [trip.destination, dateRange].filter(Boolean).join(' · ');

  return (
    <div
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200/70 dark:border-gray-800/70 bg-white dark:bg-gray-950 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
      onClick={onView}
    >
      {/* Image - 16:9 ratio */}
      <div className="relative aspect-[16/9] bg-gray-100 dark:bg-gray-900 overflow-hidden">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={trip.title}
            fill
            className="object-cover transition duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-700">
            <MapPin className="w-12 h-12" />
          </div>
        )}
        {/* Status Badge */}
        <div className="absolute top-4 left-4">
          <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${getStatusBadgeColor(trip.status)}`}>
            {getStatusLabel(trip.status)}
          </span>
        </div>
        <div className="absolute top-3 right-3 flex gap-2 opacity-0 transition group-hover:opacity-100">
          <IconButton label="View" onClick={onView}>
            <Eye className="h-4 w-4" />
          </IconButton>
          <IconButton label="Edit" onClick={onEdit}>
            <Edit2 className="h-4 w-4" />
          </IconButton>
          <IconButton label="Delete" onClick={onDelete} destructive>
            <Trash2 className="h-4 w-4" />
          </IconButton>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-5 md:p-6 gap-4">
        {/* Title - Bold, premium */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2 tracking-tight">
            {trip.title}
          </h3>
          {metaInfo && <div className="text-sm text-gray-500 dark:text-gray-400 font-light">{metaInfo}</div>}
        </div>

        {trip.description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">{trip.description}</p>
        )}

        <div className="flex flex-wrap gap-2 mt-auto">
          {trip.destination && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-900 px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-200">
              <MapPin className="h-3.5 w-3.5" />
              {trip.destination}
            </span>
          )}
          {dateRange && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-900 px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-200">
              <Calendar className="h-3.5 w-3.5" />
              {dateRange}
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-900 px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-200">
            {trip.is_public ? 'Shared' : 'Private'}
          </span>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  helper: string;
}

function StatCard({ label, value, helper }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-sm p-4">
      <p className="text-xs uppercase tracking-wide text-white/60 mb-1">{label}</p>
      <div className="flex items-baseline justify-between">
        <span className="text-2xl font-semibold text-white">{value}</span>
      </div>
      <p className="text-[11px] text-white/60 mt-1">{helper}</p>
    </div>
  );
}

interface IconButtonProps {
  children: ReactNode;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}

function IconButton({ children, label, onClick, destructive }: IconButtonProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`flex h-9 w-9 items-center justify-center rounded-full border text-xs font-medium shadow-sm transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
        destructive
          ? 'border-red-100 bg-white text-red-600 hover:bg-red-50 focus:ring-red-200 dark:border-red-900/60 dark:bg-gray-950 dark:text-red-300 dark:hover:bg-red-950/60 dark:focus:ring-red-800'
          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 focus:ring-gray-200 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200 dark:hover:bg-gray-900 dark:focus:ring-gray-700'
      }`}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}
