'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Trash2, Edit2, Eye, Calendar, MapPin, Loader2, X } from 'lucide-react';
import { TripPlanner } from '@/components/TripPlanner';
import type { Trip } from '@/types/trip';
import Image from 'next/image';
import UMFeaturePill from '@/components/ui/UMFeaturePill';
import UMActionPill from '@/components/ui/UMActionPill';
import TripCard from '@/components/trips/TripCard';

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
  const [deleteConfirmTrip, setDeleteConfirmTrip] = useState<{ id: string; title: string } | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'planning' | 'completed'>('all');

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

  // Filter trips based on active filter
  const filteredTrips = useMemo(() => {
    if (activeFilter === 'all') return trips;
    if (activeFilter === 'planning') return trips.filter(t => t.status === 'planning');
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
    return trip.destination || trip.city || 'Unknown';
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

  return (
    <div className="max-w-2xl mx-auto px-6 py-12 space-y-10">
      {/* HEADER */}
      <div className="space-y-2">
        <p className="text-xs tracking-widest text-neutral-400 uppercase">Trips</p>
        <p className="text-neutral-500 text-sm">Plan and revisit your journeys with clarity.</p>
      </div>

      {/* PRIMARY CTA */}
      <UMFeaturePill
        onClick={() => {
          if (!user) {
            router.push('/auth/login');
          } else {
            setShowCreateDialog(true);
          }
        }}
      >
        + New Trip
      </UMFeaturePill>

      {/* FILTER PILLS */}
      {trips.length > 0 && (
        <div className="flex gap-2">
          <UMActionPill
            variant={activeFilter === 'all' ? 'primary' : 'default'}
            onClick={() => setActiveFilter('all')}
          >
            All
          </UMActionPill>
          <UMActionPill
            variant={activeFilter === 'planning' ? 'primary' : 'default'}
            onClick={() => setActiveFilter('planning')}
          >
            Planning
          </UMActionPill>
          <UMActionPill
            variant={activeFilter === 'completed' ? 'primary' : 'default'}
            onClick={() => setActiveFilter('completed')}
          >
            Completed
          </UMActionPill>
        </div>
      )}

      {/* TRIP LIST */}
      <div className="space-y-8">
        {filteredTrips.length === 0 ? (
          <div className="text-center space-y-3 py-20">
            <p className="text-sm text-neutral-500">You have no trips yet.</p>
            <UMFeaturePill
              onClick={() => {
                if (!user) {
                  router.push('/auth/login');
                } else {
                  setShowCreateDialog(true);
                }
              }}
            >
              Create Trip
            </UMFeaturePill>
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
              onDelete={() => setDeleteConfirmTrip({ id: trip.id, title: trip.title })}
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
    </div>
  );
}
