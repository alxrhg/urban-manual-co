'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { Drawer } from '@/components/ui/Drawer';
import { TripPlanner } from '@/components/TripPlanner';
import { Plus, MapPin, Calendar, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import Image from 'next/image';

interface TripsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const LOADING_TIMEOUT = 15000; // 15 seconds (longer for trips with images)

export function TripsDrawer({ isOpen, onClose }: TripsDrawerProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTripDialog, setShowTripDialog] = useState(false);
  const [editingTripId, setEditingTripId] = useState<string | null>(null);

  const fetchTrips = useCallback(async () => {
    if (!user) {
      setTrips([]);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const supabaseClient = createClient();
      if (!supabaseClient) {
        throw new Error('Failed to initialize database connection');
      }

      // Add timeout handling
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), LOADING_TIMEOUT);
      });

      const fetchPromise = (async () => {
        const { data, error } = await supabaseClient
          .from('trips')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        // Fetch first location image for each trip
        const tripsWithImages = await Promise.all(
          (data || []).map(async (trip) => {
            if (trip.cover_image) {
              return { ...trip, firstLocationImage: null };
            }

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
              const { data: dest } = await supabaseClient
                .from('destinations')
                .select('image')
                .eq('slug', items.destination_slug)
                .maybeSingle();
              
              if (dest?.image) {
                firstLocationImage = dest.image;
              }
            } else if (items?.notes) {
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
      })();

      await Promise.race([fetchPromise, timeoutPromise]);
    } catch (error: any) {
      console.error('Error fetching trips:', error);
      setError(error.message || 'Failed to load trips. Please try again.');
      setTrips([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen) {
      fetchTrips();
    } else {
      // Reset state when drawer closes
      setError(null);
    }
  }, [isOpen, fetchTrips]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateRange = (start: string | null, end: string | null) => {
    if (!start && !end) return null;
    const startFormatted = formatDate(start);
    const endFormatted = formatDate(end);
    if (startFormatted && endFormatted) {
      return `${startFormatted} – ${endFormatted}`;
    }
    return startFormatted || endFormatted;
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

  const getStatusColor = (status: string) => {
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

  const content = (
    <div className="px-5 py-6">
      {loading ? (
        <div className="text-center py-12 space-y-3">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading trips...</p>
          {/* Skeleton loader */}
          <div className="space-y-3 mt-6">
            {[1, 2].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-40 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
              </div>
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="text-center py-12 space-y-4">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-900 dark:text-white">Failed to load</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{error}</p>
          </div>
          <button
            onClick={fetchTrips}
            className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-medium rounded-xl hover:opacity-80 transition-opacity"
          >
            Try Again
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {trips.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
              <MapPin className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-700 mb-4" />
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">You have no trips yet.</p>
              <button
                onClick={() => {
                  if (!user) {
                    router.push('/auth/login');
                  } else {
                    setEditingTripId(null);
                    setShowTripDialog(true);
                  }
                }}
                className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-medium rounded-xl hover:opacity-80 transition-opacity"
              >
                Create Trip
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {trips.map((trip) => {
                const imageUrl = trip.cover_image || (trip as any).firstLocationImage;
                const dateRange = formatDateRange(trip.start_date, trip.end_date);

                return (
                  <div
                    key={trip.id}
                    className="flex flex-col border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden bg-white dark:bg-gray-950 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
                  >
                    {/* Thumbnail */}
                    {imageUrl && (
                      <div className="relative w-full h-32 bg-gray-200 dark:bg-gray-800">
                        <Image
                          src={imageUrl}
                          alt={trip.title}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 420px"
                        />
                        {/* Status Badge */}
                        <div className="absolute top-3 right-3">
                          <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getStatusColor(trip.status || 'planning')}`}>
                            {getStatusLabel(trip.status || 'planning')}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Content */}
                    <div className="p-3 space-y-1.5">
                      {/* Trip Title */}
                      <h3 className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-2">
                        {trip.title}
                      </h3>

                      {/* Date Range - Compact Layout */}
                      {dateRange && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                          <Calendar className="w-3 h-3" />
                          <span>{dateRange}</span>
                        </div>
                      )}

                      {/* City */}
                      {trip.destination && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                          <MapPin className="w-3 h-3" />
                          <span>{trip.destination}</span>
                        </div>
                      )}

                      {/* Action - Arrow Right */}
                      <button
                        onClick={() => {
                          onClose();
                          setTimeout(() => {
                            router.push(`/trips/${trip.id}`);
                          }, 200);
                        }}
                        className="w-full flex items-center justify-end gap-2 pt-2 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                      >
                        <span>View Trip</span>
                        <ArrowRight className="w-3 h-3" strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        title="Your Trips"
        headerContent={
          <div className="flex items-center justify-between w-full">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Your Trips</h2>
            <button
              onClick={() => {
                if (!user) {
                  router.push('/auth/login');
                } else {
                  setEditingTripId(null);
                  setShowTripDialog(true);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg text-xs font-medium hover:opacity-90 transition-opacity"
            >
              <Plus className="w-3.5 h-3.5" />
              New Trip
            </button>
          </div>
        }
        desktopWidth="420px"
        position="right"
        style="solid"
        backdropOpacity="15"
        keepStateOnClose={true}
      >
        {content}
      </Drawer>
      <TripPlanner
        isOpen={showTripDialog}
        tripId={editingTripId || undefined}
        onClose={() => {
          setShowTripDialog(false);
          setEditingTripId(null);
          fetchTrips();
        }}
      />
    </>
  );
}
