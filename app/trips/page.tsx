'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Trash2, Edit2, Eye, Calendar, MapPin, Loader2 } from 'lucide-react';
import { TripPlanner } from '@/components/TripPlanner';
import { TripViewDrawer } from '@/components/TripViewDrawer';
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
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [viewingTripId, setViewingTripId] = useState<string | null>(null);
  const [deleteConfirmTrip, setDeleteConfirmTrip] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchTrips();
    }
  }, [user]);

  const fetchTrips = async () => {
    try {
      setLoading(true);
      const supabaseClient = createClient();
      if (!supabaseClient) return;

      const { data, error } = await supabaseClient
        .from('trips')
        .select('*')
        .order('created_at', { ascending: false });

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

  const formatDateRange = (startDate: string | null, endDate: string | null) => {
    if (!startDate && !endDate) return null;
    
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    if (startDate && endDate) {
      return `${formatDate(startDate)} – ${formatDate(endDate)}`;
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
        return 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'upcoming':
      case 'ongoing':
        return 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800';
      case 'completed':
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700';
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

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const hasAnyTrips = trips.length > 0;

  return (
    <main className="w-full px-6 md:px-10 lg:px-12 py-12 md:py-16 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-semibold text-gray-900 dark:text-white tracking-tight mb-2">
                Trips
              </h1>
              {hasAnyTrips && (
                <p className="text-sm text-gray-500 dark:text-gray-400 font-light">
                  {trips.length} {trips.length === 1 ? 'trip' : 'trips'}
                </p>
              )}
            </div>
            <button
              onClick={() => setShowCreateDialog(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-sm font-medium hover:opacity-90 transition-all duration-180 ease-out"
            >
              <Plus className="h-4 w-4" />
              <span>New Trip</span>
            </button>
          </div>
        </div>

        {/* Empty State */}
        {!hasAnyTrips ? (
          <div className="text-center py-20 space-y-6">
            <div className="space-y-3">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight">
                No trips yet
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-light max-w-sm mx-auto">
                Start planning your next adventure.
              </p>
            </div>
            <button
              onClick={() => setShowCreateDialog(true)}
              className="px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl hover:opacity-90 transition-all duration-180 ease-out text-sm font-medium"
            >
              Create Your First Trip
            </button>
          </div>
        ) : (
          <div className="space-y-12">
            {/* In Planning */}
            {groupedTrips.planning.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white tracking-tight uppercase">
                  In Planning
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupedTrips.planning.map(trip => (
                    <TripCard
                      key={trip.id}
                      trip={trip}
                      onView={() => setViewingTripId(trip.id)}
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
              </section>
            )}

            {/* Upcoming */}
            {groupedTrips.upcoming.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white tracking-tight uppercase">
                  Upcoming
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupedTrips.upcoming.map(trip => (
                    <TripCard
                      key={trip.id}
                      trip={trip}
                      onView={() => setViewingTripId(trip.id)}
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
              </section>
            )}

            {/* Past Trips */}
            {groupedTrips.past.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white tracking-tight uppercase">
                  Past Trips
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupedTrips.past.map(trip => (
                    <TripCard
                      key={trip.id}
                      trip={trip}
                      onView={() => setViewingTripId(trip.id)}
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
              </section>
            )}
          </div>
        )}
      </div>

      {/* Trip Planner Modal */}
      <TripPlanner
        isOpen={showCreateDialog}
        tripId={editingTripId || undefined}
        onClose={() => {
          setShowCreateDialog(false);
          setEditingTripId(null);
          if (user) {
            fetchTrips();
          }
        }}
      />

      {/* Trip View Drawer */}
      {viewingTripId && (
        <TripViewDrawer
          isOpen={!!viewingTripId}
          onClose={() => {
            setViewingTripId(null);
            fetchTrips();
          }}
          tripId={viewingTripId}
          onEdit={() => {
            setEditingTripId(viewingTripId);
            setViewingTripId(null);
            setShowCreateDialog(true);
          }}
          onDelete={() => {
            fetchTrips();
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
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Delete Trip
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
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

  return (
    <div
      className="group flex flex-col overflow-hidden rounded-xl border border-gray-200/50 dark:border-gray-800/50 bg-white dark:bg-gray-950 hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-700 transition-all duration-180 ease-out cursor-pointer"
      onClick={onView}
    >
      {/* Image */}
      <div className="relative h-48 bg-gray-100 dark:bg-gray-800 overflow-hidden">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={trip.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <MapPin className="w-12 h-12 text-gray-300 dark:text-gray-700" />
          </div>
        )}
        {/* Status Badge */}
        <div className="absolute top-3 right-3">
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium border backdrop-blur-sm ${getStatusBadgeColor(trip.status)}`}>
            {getStatusLabel(trip.status)}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-5">
        {/* Title */}
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 line-clamp-2">
          {trip.title}
        </h3>

        {/* Destination */}
        {trip.destination && (
          <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 mb-2">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{trip.destination}</span>
          </div>
        )}

        {/* Date Range */}
        {dateRange && (
          <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-500 mb-4">
            <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{dateRange}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 mt-auto border-t border-gray-200/50 dark:border-gray-800/50">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onView();
            }}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-900 dark:text-white hover:opacity-70 transition-opacity"
          >
            <Eye className="w-4 h-4" />
            View
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-900 rounded-lg transition-all duration-180 ease-out"
              aria-label={`Edit ${trip.title}`}
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-180 ease-out"
              aria-label={`Delete ${trip.title}`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
