'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Calendar, Loader2, MapPin, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { PageContainer } from '@/components/PageContainer';
import { PageIntro } from '@/components/PageIntro';
import {
  fetchTripSummaries,
  TripSummary,
} from '@/services/tripPlannerService';

interface StoredProgressSummary {
  tripId?: string | null;
  tripName?: string;
  destinationName?: string;
  startDate?: string;
  endDate?: string;
  step?: string;
}

export default function TripsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [fetchedTrips, setFetchedTrips] = useState<TripSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<StoredProgressSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const storageKey = useMemo(
    () => `trip-wizard-progress-${user?.id ?? 'guest'}`,
    [user?.id]
  );

  useEffect(() => {
    if (!user) {
      setFetchedTrips([]);
      setLoading(false);
      return;
    }

    let ignore = false;

    const loadTrips = async () => {
      setLoading(true);
      setError(null);

      try {
        const summaries = await fetchTripSummaries(user.id);
        if (!ignore) {
          setFetchedTrips(summaries);
        }
      } catch (fetchError) {
        console.error('Failed to load trips', fetchError);
        if (!ignore) {
          setError('We could not load your trips. Please try again.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    void loadTrips();

    return () => {
      ignore = true;
    };
  }, [user]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(storageKey);
    let nextDraft: StoredProgressSummary | null = null;

    if (stored) {
      try {
        nextDraft = JSON.parse(stored);
      } catch (parseError) {
        console.warn('Unable to parse trip wizard progress', parseError);
      }
    }

    setDraft(nextDraft);
  }, [storageKey]);

  const handleResumeDraft = () => {
    if (draft?.tripId) {
      router.push(`/trips/new?tripId=${draft.tripId}`);
    } else {
      router.push('/trips/new');
    }
  };

  const trips = user ? fetchedTrips : [];
  const isLoading = user ? loading : false;

  const renderTripCard = (trip: TripSummary) => {
    const start = trip.start_date ? new Date(trip.start_date) : null;
    const end = trip.end_date ? new Date(trip.end_date) : null;
    const dateLabel = start && end
      ? `${start.toLocaleDateString()} – ${end.toLocaleDateString()}`
      : start
      ? start.toLocaleDateString()
      : 'Dates to be confirmed';

    return (
      <li
        key={trip.id}
        className="flex flex-col justify-between rounded-3xl border border-gray-200 bg-white/80 p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-950/70 dark:hover:border-gray-700"
      >
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {trip.title || 'Untitled trip'}
          </h3>
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
            {trip.destination && (
              <span className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {trip.destination}
              </span>
            )}
            <span className="inline-flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {dateLabel}
            </span>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            href={`/trips/new?tripId=${trip.id}`}
            className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
          >
            Resume planning
            <ArrowRight className="h-4 w-4" />
          </Link>
          {trip.destination && (
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold uppercase tracking-[2px] text-gray-600 dark:bg-gray-900 dark:text-gray-300">
              Planning
            </span>
          )}
        </div>
      </li>
    );
  };

  return (
    <PageContainer>
      <PageIntro
        eyebrow="Your trips"
        title="Plan and revisit every getaway"
        description="Start a new itinerary or jump back into one you’ve already drafted."
        actions={
          <Link
            href="/trips/new"
            className="flex items-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-900 dark:bg-white dark:text-black dark:hover:bg-gray-200"
          >
            <Plus className="h-4 w-4" />
            Create a trip
          </Link>
        }
      />

      {!user && (
        <div className="mt-8 rounded-3xl border border-gray-200 bg-white/80 p-6 text-sm text-gray-600 shadow-sm dark:border-gray-800 dark:bg-gray-950/70 dark:text-gray-300">
          Sign in to manage your trips and pick up where you left off.
        </div>
      )}

      {draft && (
        <div className="mt-8 rounded-3xl border border-amber-200 bg-amber-50/80 p-6 shadow-sm dark:border-amber-800 dark:bg-amber-950/60">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[2px] text-amber-700 dark:text-amber-200">
                Wizard draft saved locally
              </p>
              <h3 className="mt-1 text-base font-semibold text-amber-900 dark:text-amber-100">
                {draft.tripName || 'Untitled trip'}
              </h3>
              <p className="mt-1 text-sm text-amber-800/80 dark:text-amber-200/80">
                {draft.destinationName || 'Destination pending'} · {draft.step ? `Step: ${draft.step}` : 'Not started'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleResumeDraft}
              className="inline-flex items-center gap-2 rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-500"
            >
              Resume wizard
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-[2px] text-gray-500 dark:text-gray-400">
            Your itineraries
          </h2>
          <Link
            href="/trips/new"
            className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-400 hover:bg-white dark:border-gray-700 dark:text-gray-200 dark:hover:border-gray-500 dark:hover:bg-gray-900/60"
          >
            <Plus className="h-4 w-4" />
            Start new trip
          </Link>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center rounded-3xl border border-gray-200 bg-white/80 p-12 text-sm text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-950/70 dark:text-gray-300">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading trips…
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-red-200 bg-red-50/70 p-6 text-sm text-red-700 shadow-sm dark:border-red-800 dark:bg-red-950/60 dark:text-red-200">
            {error}
          </div>
        ) : trips.length > 0 ? (
          <ul className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {trips.map(renderTripCard)}
          </ul>
        ) : (
          <div className="rounded-3xl border border-dashed border-gray-300 bg-white/50 p-12 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-950/40 dark:text-gray-300">
            You haven’t created any trips yet. Start with the wizard to map out your next adventure.
          </div>
        )}
      </section>
    </PageContainer>
  );
}
