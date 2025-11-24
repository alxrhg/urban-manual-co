'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Loader2, MapPin, Plane } from 'lucide-react';
import { TripPlanner } from '@/components/TripPlanner';
import type { Trip } from '@/types/trip';
import UMFeaturePill from '@/components/ui/UMFeaturePill';
import UMActionPill from '@/components/ui/UMActionPill';
import TripCard from '@/components/trips/TripCard';

interface TripWithImage extends Trip {
  firstLocationImage?: string | null;
}

type FilterType = 'all' | 'planning' | 'upcoming' | 'completed';

export default function TripsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [trips, setTrips] = useState<TripWithImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [deleteConfirmTrip, setDeleteConfirmTrip] = useState<{ id: string; title: string } | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

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

  // Calculate stats
  const stats = useMemo(() => {
    const planning = trips.filter(t => t.status === 'planning').length;
    const upcoming = trips.filter(t => t.status === 'upcoming' || t.status === 'ongoing').length;
    const completed = trips.filter(t => t.status === 'completed').length;
    return { total: trips.length, planning, upcoming, completed };
  }, [trips]);

  // Filter trips based on active filter
  const filteredTrips = useMemo(() => {
    if (activeFilter === 'all') return trips;
    if (activeFilter === 'planning') return trips.filter(t => t.status === 'planning');
    if (activeFilter === 'upcoming') return trips.filter(t => t.status === 'upcoming' || t.status === 'ongoing');
    if (activeFilter === 'completed') return trips.filter(t => t.status === 'completed');
    return trips;
  }, [trips, activeFilter]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return null;
    }
  };

  const getCityFromTrip = (trip: TripWithImage) => {
    return trip.destination || undefined;
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

  const filters: { key: FilterType; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: stats.total },
    { key: 'planning', label: 'Planning', count: stats.planning },
    { key: 'upcoming', label: 'Upcoming', count: stats.upcoming },
    { key: 'completed', label: 'Completed', count: stats.completed },
  ];

  return (
    <div className="w-full px-6 md:px-10 py-20 min-h-screen">
      <div className="w-full">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-light">Trips</h1>
            {/* Desktop: New Trip button in header */}
            <div className="hidden sm:block">
              <UMActionPill
                variant="primary"
                onClick={() => {
                  if (!user) {
                    router.push('/auth/login');
                  } else {
                    setShowCreateDialog(true);
                  }
                }}
              >
                <Plus className="w-4 h-4 mr-1" />
                New Trip
              </UMActionPill>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Plan and organize your travels
          </p>
        </div>

        <div className="w-full space-y-8">
          {/* Mobile: Full-width New Trip CTA */}
          <div className="sm:hidden">
            <UMFeaturePill
              onClick={() => {
                if (!user) {
                  router.push('/auth/login');
                } else {
                  setShowCreateDialog(true);
                }
              }}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Trip
            </UMFeaturePill>
          </div>

          {/* FILTER PILLS - Horizontally scrollable on mobile */}
          {trips.length > 0 && (
            <div className="overflow-x-auto -mx-6 px-6 sm:mx-0 sm:px-0 scrollbar-hide">
              <div className="flex gap-2 min-w-max sm:min-w-0 sm:flex-wrap">
                {filters.map((filter) => (
                  <UMActionPill
                    key={filter.key}
                    variant={activeFilter === filter.key ? 'primary' : 'default'}
                    onClick={() => setActiveFilter(filter.key)}
                    className="whitespace-nowrap"
                  >
                    {filter.label}
                    {filter.count > 0 && (
                      <span className={`ml-1.5 text-xs ${
                        activeFilter === filter.key
                          ? 'text-white/70 dark:text-black/60'
                          : 'text-neutral-400 dark:text-neutral-500'
                      }`}>
                        {filter.count}
                      </span>
                    )}
                  </UMActionPill>
                ))}
              </div>
            </div>
          )}

          {/* TRIP LIST */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTrips.length === 0 ? (
              <div className="col-span-full">
                {/* Empty State */}
                <div className="text-center py-16 px-6 rounded-[16px] border border-dashed border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
                  <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                    <Plane className="w-8 h-8 text-neutral-400 dark:text-neutral-500" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    {activeFilter === 'all' ? 'No trips yet' : `No ${activeFilter} trips`}
                  </h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6 max-w-sm mx-auto">
                    {activeFilter === 'all'
                      ? 'Start planning your next adventure by creating your first trip.'
                      : `You don't have any ${activeFilter} trips. Create a new trip to get started.`
                    }
                  </p>
                  <UMFeaturePill
                    onClick={() => {
                      if (!user) {
                        router.push('/auth/login');
                      } else {
                        setShowCreateDialog(true);
                      }
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Trip
                  </UMFeaturePill>
                </div>
              </div>
            ) : (
              filteredTrips.map((trip) => (
                <TripCard
                  key={trip.id}
                  trip={{
                    id: trip.id,
                    name: trip.title,
                    coverImage: trip.cover_image || trip.firstLocationImage,
                    city: getCityFromTrip(trip),
                    startDate: formatDate(trip.start_date) || undefined,
                    endDate: formatDate(trip.end_date) || undefined,
                    status: trip.status,
                  }}
                  onView={() => router.push(`/trips/${trip.id}`)}
                  onEdit={() => {
                    setEditingTripId(trip.id);
                    setShowCreateDialog(true);
                  }}
                />
              ))
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
              <div className="relative bg-white dark:bg-gray-950 rounded-[16px] shadow-xl border border-gray-200 dark:border-gray-800 p-6 max-w-md w-full">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Delete Trip
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 font-light">
                  Are you sure you want to delete &ldquo;{deleteConfirmTrip.title}&rdquo;? This action cannot be undone.
                </p>
                <div className="flex gap-3 justify-end">
                  <UMActionPill onClick={() => setDeleteConfirmTrip(null)}>
                    Cancel
                  </UMActionPill>
                  <button
                    onClick={() => deleteTrip(deleteConfirmTrip.id, deleteConfirmTrip.title)}
                    className="px-4 h-[38px] rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-all"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
