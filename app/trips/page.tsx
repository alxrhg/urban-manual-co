'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Trash2, Edit2, CalendarDays, MapPin, Clock3, ArrowUpRight } from 'lucide-react';
import { TripPlanner } from '@/components/TripPlanner';
import { TripViewDrawer } from '@/components/TripViewDrawer';
import type { Trip } from '@/types/trip';

const tripFlow = [
  {
    title: 'Brief & intent',
    description: 'Name the trip, confirm city, dates, and base to keep context tight.',
  },
  {
    title: 'Compose days',
    description: 'Layer curated POIs, balance neighborhoods, and keep pacing intentional.',
  },
  {
    title: 'Polish & handoff',
    description: 'Add cover art, export to calendar, and share the private link.',
  },
] as const;

const tripGuardrails = [
  'Keep 3–6 anchors per day for a calm editorial cadence.',
  'Mix dining, culture, and downtime across neighborhoods.',
  'Add notes on why each stop matters before sharing.',
] as const;

export default function TripsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [viewingTripId, setViewingTripId] = useState<string | null>(null);

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
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;

    try {
      const supabaseClient = createClient();
      if (!supabaseClient) return;

      const { error } = await supabaseClient
        .from('trips')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTrips(trips.filter((trip) => trip.id !== id));
    } catch (error) {
      console.error('Error deleting trip:', error);
      alert('Failed to delete trip');
    }
  };


  const statusBadgeClass: Record<Trip['status'], string> = {
    planning: 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300',
    upcoming: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-100',
    ongoing: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-100',
    completed: 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900',
  };

  const getTripDateLabel = (trip?: Trip | null) => {
    if (!trip?.start_date) return 'Dates to be announced';
    const start = new Date(trip.start_date);
    if (!trip.end_date) {
      return start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    const end = new Date(trip.end_date);
    const sameMonth = start.getMonth() === end.getMonth();
    const startLabel = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endLabel = end.toLocaleDateString('en-US', {
      day: 'numeric',
      ...(sameMonth ? {} : { month: 'short' }),
    });
    return `${startLabel} – ${endLabel}`;
  };

  const highlightTrip = trips[0] ?? null;
  const highlightImage =
    highlightTrip &&
    (highlightTrip.cover_image || (highlightTrip as any).firstLocationImage || null);

  const uniqueCities = new Set(
    trips
      .map((trip) => trip.destination?.toLowerCase().trim())
      .filter(Boolean) as string[],
  ).size;
  const inMotionCount = trips.filter((trip) =>
    ['planning', 'upcoming', 'ongoing'].includes(trip.status),
  ).length;

  const tripStats = [
    { label: 'Trips saved', value: trips.length },
    { label: 'In motion', value: inMotionCount },
    { label: 'Cities covered', value: uniqueCities },
  ];

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="text-gray-500 dark:text-gray-400">Loading...</span>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="w-full px-6 md:px-10 lg:px-12 py-20 min-h-screen bg-white dark:bg-gray-950">
      <div className="max-w-6xl xl:max-w-7xl mx-auto space-y-14">
        <section className="rounded-[32px] border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40 px-6 md:px-10 py-10 space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-8">
            <div className="space-y-6">
              <div className="space-y-4">
                <p className="text-[11px] uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">
                  Trip Studio
                </p>
                <h1 className="text-[34px] md:text-[46px] leading-tight font-light text-black dark:text-white">
                  Trip building is now the second focus of Urban Manual.
                </h1>
                <p className="text-base text-gray-600 dark:text-gray-400 max-w-2xl">
                  Craft multi-day itineraries with the same monochromatic, editorial polish as the guide
                  itself. Stay in flow, save as you browse, and export when the story feels finished.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setShowCreateDialog(true)}
                  className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-full text-sm font-medium hover:opacity-80 transition-opacity"
                >
                  Launch Trip Planner
                </button>
                <button
                  onClick={() => router.push('/')}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-full text-sm font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
                >
                  Browse the Guide
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {tripStats.map((stat) => (
                  <div
                    key={stat.label}
                    className="border border-gray-200 dark:border-gray-800 rounded-2xl p-4 bg-white dark:bg-gray-900"
                  >
                    <p className="text-xs uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 mb-2">
                      {stat.label}
                    </p>
                    <p className="text-3xl font-light text-black dark:text-white">
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.3em] text-gray-400 dark:text-gray-500">
                    Active trip
                  </p>
                  <h3 className="text-xl font-medium text-gray-900 dark:text-white">
                    {highlightTrip ? highlightTrip.title : 'Nothing in motion yet'}
                  </h3>
                </div>
                {highlightTrip && (
                  <button
                    onClick={() => setViewingTripId(highlightTrip.id)}
                    className="inline-flex items-center gap-2 text-xs font-medium text-gray-900 dark:text-gray-100 hover:opacity-70 transition-opacity"
                  >
                    Open
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                )}
              </div>
              {highlightTrip ? (
                <>
                  <div className="relative rounded-2xl overflow-hidden aspect-[5/3] bg-gray-100 dark:bg-gray-800">
                    {highlightImage ? (
                      <img
                        src={highlightImage}
                        alt={highlightTrip.title}
                        className="w-full h-full object-cover grayscale-[10%]"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                        Add a cover image to set the tone.
                      </div>
                    )}
                    <span
                      className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-medium capitalize ${statusBadgeClass[highlightTrip.status]}`}
                    >
                      {highlightTrip.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-800">
                      <CalendarDays className="w-3.5 h-3.5" />
                      {getTripDateLabel(highlightTrip)}
                    </span>
                    {highlightTrip.destination && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-800">
                        <MapPin className="w-3.5 h-3.5" />
                        {highlightTrip.destination}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-800">
                      <Clock3 className="w-3.5 h-3.5" />
                      {highlightTrip.status}
                    </span>
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 p-6 text-sm text-gray-500 dark:text-gray-400">
                  Launch the planner to lock in your next itinerary. Saved places from the guide appear
                  here automatically.
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[1.35fr_0.65fr] gap-10">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-gray-400 dark:text-gray-500">
                  Library
                </p>
                <h2 className="text-2xl font-medium text-gray-900 dark:text-white">My itineraries</h2>
              </div>
              <button
                onClick={() => setShowCreateDialog(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-full text-sm font-medium hover:opacity-80 transition-opacity"
              >
                <Plus className="h-4 w-4" />
                <span>New trip</span>
              </button>
            </div>
            {trips.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-gray-200 dark:border-gray-800 p-8 text-center space-y-4 bg-white dark:bg-gray-900">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  No trips yet. Bookmark locations in the guide, then build your first itinerary here.
                </p>
                <button
                  onClick={() => setShowCreateDialog(true)}
                  className="px-5 py-2 border border-gray-200 dark:border-gray-800 rounded-full text-sm font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  Start planning
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {trips.map((trip) => {
                  const cardImage =
                    trip.cover_image || (trip as any).firstLocationImage || null;
                  return (
                    <div
                      key={trip.id}
                      className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 space-y-4"
                    >
                      <div className="relative rounded-2xl overflow-hidden aspect-[5/3] bg-gray-100 dark:bg-gray-800">
                        {cardImage ? (
                          <img
                            src={cardImage}
                            alt={trip.title}
                            className="w-full h-full object-cover grayscale-[10%]"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                            Add a cover image
                          </div>
                        )}
                        <span
                          className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-medium capitalize ${statusBadgeClass[trip.status]}`}
                        >
                          {trip.status}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                          {trip.title}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {trip.destination || 'Destination TBD'}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="w-3.5 h-3.5" />
                            {getTripDateLabel(trip)}
                          </span>
                          {trip.destination && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" />
                              {trip.destination}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-2">
                        <button
                          onClick={() => setViewingTripId(trip.id)}
                          className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:opacity-70 transition-opacity"
                        >
                          View trip
                        </button>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setEditingTripId(trip.id);
                              setShowCreateDialog(true);
                            }}
                            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                            aria-label={`Edit ${trip.title}`}
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteTrip(trip.id, trip.title)}
                            className="p-2 text-red-500 dark:text-red-400 hover:opacity-80 transition-opacity"
                            aria-label={`Delete ${trip.title}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="space-y-5">
            <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 space-y-4">
              <p className="text-[11px] uppercase tracking-[0.3em] text-gray-400 dark:text-gray-500">
                Trip Studio flow
              </p>
              <div className="space-y-3">
                {tripFlow.map((step, index) => (
                  <div
                    key={step.title}
                    className="border border-gray-200 dark:border-gray-800 rounded-2xl p-4"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-medium text-gray-700 dark:text-gray-200">
                        {index + 1}
                      </span>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {step.title}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 space-y-3">
              <p className="text-[11px] uppercase tracking-[0.3em] text-gray-400 dark:text-gray-500">
                Quality guardrails
              </p>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                {tripGuardrails.map((tip) => (
                  <li key={tip}>• {tip}</li>
                ))}
              </ul>
              <button
                onClick={() => setShowCreateDialog(true)}
                className="inline-flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100 hover:opacity-70 transition-opacity"
              >
                Launch Trip Planner
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      </div>

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
    </main>
  );
}
