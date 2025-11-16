'use client';

import { useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  LayoutList,
  Share2,
  Sparkles,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface TripFocusSectionProps {
  user: User | null;
  onCreateTrip: () => void;
  onViewTrips: () => void;
}

interface TripPreview {
  id: string;
  title: string;
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  cover_image: string | null;
  stops: number;
}

interface TripStats {
  totalTrips: number;
  upcomingTrips: number;
  uniqueCities: number;
  totalStops: number;
}

const flowSteps = [
  {
    title: 'Brief & intent',
    description: 'Name the trip, define the city, dates, and the travel style.',
  },
  {
    title: 'Compose each day',
    description: 'Drop curated POIs, balance pacing, and surface gaps instantly.',
  },
  {
    title: 'Polish & ship',
    description: 'Share, export to calendar, and sync with collaborators in seconds.',
  },
] as const;

const sellingPoints = [
  { icon: Sparkles, label: 'AI suggestions stay contextual and optional.' },
  { icon: LayoutList, label: 'Day builder respects pacing and neighborhoods.' },
  { icon: Share2, label: 'Exports feel editorial, not spreadsheet screenshots.' },
] as const;

const initialStats: TripStats = {
  totalTrips: 0,
  upcomingTrips: 0,
  uniqueCities: 0,
  totalStops: 0,
};

function getDateRange(startDate?: string | null, endDate?: string | null) {
  if (!startDate) return 'Dates to be confirmed';
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : null;
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  if (!end) {
    return start.toLocaleDateString('en-US', options);
  }
  const sameMonth = start.getMonth() === end.getMonth();
  const startLabel = start.toLocaleDateString('en-US', options);
  const endLabel = end.toLocaleDateString('en-US', {
    ...options,
    ...(sameMonth ? {} : { month: 'short' }),
  });
  return `${startLabel} – ${endLabel}`;
}

export function TripFocusSection({
  user,
  onCreateTrip,
  onViewTrips,
}: TripFocusSectionProps) {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<TripStats>(initialStats);
  const [recentTrip, setRecentTrip] = useState<TripPreview | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchTripHighlights() {
      if (!user) {
        if (isMounted) {
          setStats(initialStats);
          setRecentTrip(null);
        }
        return;
      }

      setLoading(true);
      try {
        const supabase = createClient();
        const { data, error, count } = await supabase
          .from('trips')
          .select(
            'id,title,destination,start_date,end_date,status,cover_image,updated_at',
            { count: 'exact' },
          )
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(3);

        if (error) throw error;

        let stopsLookup: Record<string, number> = {};
        if (data && data.length > 0) {
          const { data: itineraryItems, error: itineraryError } = await supabase
            .from('itinerary_items')
            .select('trip_id')
            .in(
              'trip_id',
              data.map((trip) => trip.id),
            );

          if (itineraryError) {
            console.warn('Failed to load itinerary counts', itineraryError.message);
          } else if (Array.isArray(itineraryItems)) {
            stopsLookup = itineraryItems.reduce<Record<string, number>>((acc, item) => {
              acc[item.trip_id] = (acc[item.trip_id] || 0) + 1;
              return acc;
            }, {});
          }
        }

        if (!isMounted) return;

        const enhanced = (data ?? []).map<TripPreview>((trip) => ({
          ...trip,
          stops: stopsLookup[trip.id] || 0,
        }));

        const uniqueCities = new Set(
          enhanced
            .map((trip) => trip.destination?.toLowerCase().trim())
            .filter(Boolean) as string[],
        ).size;

        const upcomingTrips = enhanced.filter((trip) => trip.status !== 'completed').length;
        const totalStops = enhanced.reduce((sum, trip) => sum + trip.stops, 0);

        setStats({
          totalTrips: count ?? enhanced.length,
          upcomingTrips,
          uniqueCities,
          totalStops,
        });
        setRecentTrip(enhanced[0] ?? null);
      } catch (err) {
        console.error('Failed to fetch trip focus data', err);
        if (isMounted) {
          setStats(initialStats);
          setRecentTrip(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchTripHighlights();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const statCards = useMemo(
    () => [
      {
        label: 'Trips saved',
        value: user ? stats.totalTrips : 'Personalized',
        hint: user ? 'All of your itineraries stay private by default.' : 'Sign in to track every itinerary.',
      },
      {
        label: 'Upcoming or in-play',
        value: stats.upcomingTrips,
        hint: 'Keep one trip active and draft the next in parallel.',
      },
      {
        label: 'Cities covered',
        value: stats.uniqueCities,
        hint: 'We keep neighborhoods and pacing in context.',
      },
    ],
    [stats.totalTrips, stats.uniqueCities, stats.upcomingTrips, user],
  );

  return (
    <section className="w-full px-6 md:px-10 mt-14">
      <div className="max-w-[1800px] mx-auto border border-gray-200 dark:border-gray-800 rounded-[32px] bg-gray-50 dark:bg-gray-950/40 px-6 md:px-10 py-10 md:py-14">
        <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.35em] text-gray-500 dark:text-gray-500 mb-6">
          <span>Trip Studio</span>
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-[10px] tracking-[0.2em]">
            Second Focus
          </span>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-10 xl:gap-12">
          <div className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-[34px] md:text-[42px] leading-[1.1] font-light text-black dark:text-white">
                Trips are now the second focus of The Urban Manual.
              </h2>
              <p className="text-base md:text-lg text-gray-600 dark:text-gray-400 max-w-2xl">
                Every itinerary inherits the same editorial polish as the guide itself—minimalist,
                monochromatic, and obsession-level structured. Plan, refine, and publish without
                leaving the discovery flow.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={onCreateTrip}
                className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-full hover:opacity-80 transition-opacity"
              >
                Launch Trip Planner
              </button>
              <button
                onClick={onViewTrips}
                className="px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-full text-sm font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
              >
                Open Trip Studio
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {statCards.map((card) => (
                <div
                  key={card.label}
                  className="border border-gray-200 dark:border-gray-800 rounded-2xl p-4 bg-white dark:bg-gray-900"
                >
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 mb-2">
                    {card.label}
                  </p>
                  <p className="text-3xl font-light text-black dark:text-white mb-2">
                    {loading ? (
                      <span className="inline-flex animate-pulse h-8 w-16 rounded-full bg-gray-200 dark:bg-gray-800" />
                    ) : (
                      card.value
                    )}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{card.hint}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {sellingPoints.map((point) => (
                <div
                  key={point.label}
                  className="flex items-start gap-3 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 bg-white dark:bg-gray-900"
                >
                  <div className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                    <point.icon className="w-4 h-4" />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{point.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="border border-gray-200 dark:border-gray-800 rounded-3xl bg-white dark:bg-gray-900 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.3em] text-gray-400 dark:text-gray-500 mb-2">
                    Latest trip
                  </p>
                  <h3 className="text-xl font-medium text-black dark:text-white">
                    {recentTrip?.title || 'No trip yet'}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {recentTrip?.destination || 'Choose a destination to begin'}
                  </p>
                </div>
                <button
                  onClick={onViewTrips}
                  className="p-2 rounded-full border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  aria-label="Open trips"
                >
                  <ArrowUpRight className="w-4 h-4 text-gray-900 dark:text-white" />
                </button>
              </div>

              {loading ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-40 rounded-2xl bg-gray-100 dark:bg-gray-800" />
                  <div className="h-4 rounded bg-gray-100 dark:bg-gray-800 w-3/4" />
                  <div className="h-4 rounded bg-gray-100 dark:bg-gray-800 w-1/2" />
                </div>
              ) : recentTrip ? (
                <>
                  <div className="relative overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-800 aspect-[4/3] mb-5">
                    {recentTrip.cover_image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={recentTrip.cover_image}
                        alt={recentTrip.title}
                        className="w-full h-full object-cover grayscale-[15%]"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-gray-400">
                        Add a cover image
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-800">
                      <CalendarDays className="w-3.5 h-3.5" />
                      {getDateRange(recentTrip.start_date, recentTrip.end_date)}
                    </span>
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-800">
                      <LayoutList className="w-3.5 h-3.5" />
                      {recentTrip.stops} stops
                    </span>
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-800 capitalize">
                      <Clock3 className="w-3.5 h-3.5" />
                      {recentTrip.status}
                    </span>
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 p-6 text-sm text-gray-500 dark:text-gray-400">
                  Drop in 2–3 places you already love, then we’ll surface gaps, pacing, and share-ready
                  exports. Hit “Launch Trip Planner” to get started.
                </div>
              )}
            </div>

            <div className="border border-gray-200 dark:border-gray-800 rounded-3xl bg-white dark:bg-gray-900 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.3em] text-gray-400 dark:text-gray-500">
                    Flow
                  </p>
                  <h4 className="text-lg font-medium text-black dark:text-white mt-2">Trip Studio steps</h4>
                </div>
                <button
                  onClick={onCreateTrip}
                  className="px-4 py-2 rounded-full border border-gray-200 dark:border-gray-800 text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Start now
                </button>
              </div>
              <div className="space-y-4">
                {flowSteps.map((step, index) => (
                  <div
                    key={step.title}
                    className="flex items-start gap-4 rounded-2xl border border-gray-200 dark:border-gray-800 p-4"
                  >
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-medium ${
                        index === 0
                          ? 'bg-black text-white dark:bg-white dark:text-black'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-black dark:text-white">{step.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-gray-200 dark:border-gray-800 rounded-3xl bg-white dark:bg-gray-900 p-6 flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="space-y-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Trips live alongside discovery. Add locations directly from every destination card, keep
                  context with notes, and export once everything feels editorial-perfect.
                </p>
                <button
                  onClick={onViewTrips}
                  className="inline-flex items-center gap-2 text-sm font-medium text-black dark:text-white hover:opacity-70 transition-opacity"
                >
                  View my trips
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
