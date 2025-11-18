'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { Drawer } from '@/components/ui/Drawer';
import { TripPlanner } from '@/components/TripPlanner';
import { Plus, MapPin, Calendar, ArrowRight, Loader2, Plane } from 'lucide-react';
import Image from 'next/image';
import type { Trip as TripType } from '@/types/trip';

interface TripsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AirportSummary {
  iata?: string | null;
  city?: string | null;
  name?: string | null;
  country?: string | null;
}

interface FlightDetails {
  from?: AirportSummary | null;
  to?: AirportSummary | null;
  airline?: string | null;
  flightNumber?: string | null;
  departureTime?: string | null;
  arrivalTime?: string | null;
}

interface FlightSegment {
  label: string;
  subtitle: string;
  code: string;
  date: string | null;
  time: string | null;
}

type TripWithPreview = TripType & {
  firstLocationImage: string | null;
  flightDetails?: FlightDetails | null;
};

export function TripsDrawer({ isOpen, onClose }: TripsDrawerProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [trips, setTrips] = useState<TripWithPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTripDialog, setShowTripDialog] = useState(false);
  const [editingTripId, setEditingTripId] = useState<string | null>(null);

  const fetchTrips = useCallback(async () => {
    if (!user) {
      setTrips([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const supabaseClient = createClient();
      if (!supabaseClient) return;

      const { data, error } = await supabaseClient
        .from('trips')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch first location image for each trip
        const tripsWithImages: TripWithPreview[] = await Promise.all(
          (data || []).map(async (trip: TripType) => {
            if (trip.cover_image) {
              return { ...trip, firstLocationImage: null, flightDetails: null };
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

            let flightDetails: FlightDetails | null = null;

          if (items?.notes) {
            try {
              const parsedNotes = JSON.parse(items.notes);
              if (parsedNotes?.from || parsedNotes?.to) {
                flightDetails = {
                  from: parsedNotes.from,
                  to: parsedNotes.to,
                  airline: parsedNotes.airline || null,
                  flightNumber: parsedNotes.flightNumber || null,
                  departureTime: parsedNotes.departureTime || null,
                  arrivalTime: parsedNotes.arrivalTime || null,
                };
              }
              if (parsedNotes?.image && !firstLocationImage) {
                firstLocationImage = parsedNotes.image;
              }
            } catch {
              // Ignore parse errors
            }
          }

          if (items?.destination_slug) {
            const { data: dest } = await supabaseClient
              .from('destinations')
              .select('image')
              .eq('slug', items.destination_slug)
              .maybeSingle();

            if (dest?.image) {
              firstLocationImage = dest.image;
            }
          }

          return { ...trip, firstLocationImage, flightDetails };
        })
      );

      setTrips(tripsWithImages);
    } catch (error) {
      console.error('Error fetching trips:', error);
      setTrips([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen) {
      fetchTrips();
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

  const formatDetailedDate = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const buildFlightSegments = (trip: TripWithPreview): { segments: FlightSegment[]; flightDetails?: FlightDetails | null } => {
    const { flightDetails } = trip;
    const hasFlightDetails = flightDetails && (flightDetails.from || flightDetails.to);

    const rawDestinationCode = trip.destination
      ? trip.destination
          .split(' ')
          .filter((word: string) => word && word.length > 0)
          .map((word: string) => word[0])
          .join('')
          .slice(0, 3)
          .toUpperCase()
      : '';
    const destinationCode = rawDestinationCode || 'TBD';

    const segments = [
      {
        label: flightDetails?.from?.city || 'Departure',
        subtitle: flightDetails?.from?.name || 'Add departure airport',
        code: flightDetails?.from?.iata || '—',
        date: formatDetailedDate(trip.start_date),
        time: flightDetails?.departureTime || null,
      },
      {
        label: flightDetails?.to?.city || trip.destination || 'Arrival',
        subtitle: flightDetails?.to?.name || trip.destination || 'Add arrival airport',
        code: flightDetails?.to?.iata || destinationCode,
        date: formatDetailedDate(trip.end_date || trip.start_date),
        time: flightDetails?.arrivalTime || null,
      },
    ];

    if (!hasFlightDetails && !trip.destination) {
      segments[1].subtitle = 'Set your destination to see it here';
      segments[1].label = 'Arrival';
      segments[1].code = '—';
    }

    return { segments, flightDetails };
  };

  const content = (
    <div className="px-5 py-6">
      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
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
                const imageUrl = trip.cover_image || trip.firstLocationImage;
                const dateRange = formatDateRange(trip.start_date, trip.end_date);
                const { segments, flightDetails } = buildFlightSegments(trip);

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

                      {/* Flight preview */}
                      <div className="mt-3 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/30 p-3">
                        <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">
                          <span>Your Trip</span>
                          <button
                            onClick={() => {
                              if (!user) {
                                router.push('/auth/login');
                                return;
                              }
                              setEditingTripId(trip.id);
                              setShowTripDialog(true);
                            }}
                            className="text-[11px] font-semibold tracking-wide text-gray-900 dark:text-white hover:opacity-70"
                          >
                            Edit
                          </button>
                        </div>
                        <div className="mt-3 flex gap-3">
                          <div className="flex flex-col items-center">
                            <span className="w-2 h-2 rounded-full bg-gray-900 dark:bg-gray-100" />
                            <span className="flex-1 w-px bg-gray-300 dark:bg-gray-700" />
                            <Plane className="h-4 w-4 text-gray-400" />
                            <span className="flex-1 w-px bg-gray-300 dark:bg-gray-700" />
                            <span className="w-2 h-2 rounded-full bg-gray-900 dark:bg-gray-100" />
                          </div>
                          <div className="flex-1 space-y-5">
                            {segments.map((segment, index) => (
                              <div key={`${trip.id}-${segment.label}-${index}`} className="space-y-1">
                                <p className="text-[11px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
                                  {segment.date || 'Add trip dates'}
                                </p>
                                <div className="flex items-start justify-between gap-4">
                                  <div>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{segment.label}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {segment.subtitle}
                                    </p>
                                    <p className="text-[11px] font-mono text-gray-400 dark:text-gray-500 mt-1">
                                      {segment.code || '—'}
                                    </p>
                                  </div>
                                  {segment.time ? (
                                    <div className="text-right">
                                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{segment.time}</p>
                                      {index === 0 && flightDetails?.airline && (
                                        <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                          {flightDetails.airline}
                                          {flightDetails.flightNumber ? ` · ${flightDetails.flightNumber}` : ''}
                                        </p>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="text-right text-[11px] text-gray-400 dark:text-gray-500">
                                      Add time
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

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
