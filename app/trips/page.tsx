'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Calendar, MapPin, Trash2, Edit2, Bot, ArrowRight, Clock } from 'lucide-react';
import { PageContainer } from '@/components/PageContainer';
import { PageIntro } from '@/components/PageIntro';
import { TripPlanner } from '@/components/TripPlanner';
import { ConversationInterfaceStreaming } from '@/app/components/chat/ConversationInterfaceStreaming';

interface Trip {
  id: string;
  title: string;
  description: string | null;
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  is_public: boolean;
  cover_image: string | null;
  created_at: string;
}

const TRIP_STATUS_STYLES: Record<string, { label: string; pillClass: string }> = {
  planning: {
    label: 'Planning',
    pillClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200',
  },
  upcoming: {
    label: 'Upcoming',
    pillClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
  },
  ongoing: {
    label: 'In Progress',
    pillClass: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-200',
  },
  completed: {
    label: 'Completed',
    pillClass: 'bg-gray-200 text-gray-700 dark:bg-gray-800/60 dark:text-gray-200',
  },
};

function parseDate(input: string | null): Date | null {
  if (!input) return null;
  const date = new Date(input);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateRange(start: string | null, end: string | null): string {
  const startDate = parseDate(start);
  const endDate = parseDate(end);
  if (!startDate && !endDate) return 'Dates to be confirmed';
  const formatterShort = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  });
  const formatterLong = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  if (startDate && endDate) {
    const sameYear = startDate.getFullYear() === endDate.getFullYear();
    const first = sameYear ? formatterShort.format(startDate) : formatterLong.format(startDate);
    const second = formatterLong.format(endDate);
    return `${first} – ${second}`;
  }

  const singleDate = startDate || endDate;
  if (!singleDate) return 'Dates to be confirmed';
  return formatterLong.format(singleDate);
}

function formatCountdown(start: string | null): string | null {
  const startDate = parseDate(start);
  if (!startDate) return null;
  const now = new Date();
  const diffMs = startDate.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays > 0) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} away`;
  }
  if (diffDays === 0) {
    return 'Starts today';
  }
  return `Started ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'} ago`;
}

function truncate(text: string, length = 140): string {
  if (!text) return '';
  return text.length > length ? `${text.slice(0, length)}…` : text;
}

interface TripCardProps {
  trip: Trip;
  onView: (tripId: string) => void;
  onEdit: (trip: Trip) => void;
  onDelete: (trip: Trip) => void;
  onOpenIntelligence: (trip: Trip) => void;
}

function TripCard({ trip, onView, onEdit, onDelete, onOpenIntelligence }: TripCardProps) {
  const statusStyle = TRIP_STATUS_STYLES[trip.status] || TRIP_STATUS_STYLES.planning;
  const countdown = formatCountdown(trip.start_date);
  const dateRange = formatDateRange(trip.start_date, trip.end_date);

  return (
    <article className="rounded-2xl border border-gray-200 bg-white/80 p-5 shadow-sm transition hover:border-gray-300 dark:border-gray-800 dark:bg-gray-950/70">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${statusStyle.pillClass}`}>
                {statusStyle.label}
              </span>
              {countdown && (
                <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                  <Clock className="h-3.5 w-3.5" />
                  {countdown}
                </span>
              )}
            </div>
            <h3 className="text-lg font-semibold leading-tight text-gray-900 dark:text-white">{trip.title}</h3>
            {trip.destination && (
              <p className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <MapPin className="h-4 w-4" />
                <span>{trip.destination}</span>
              </p>
            )}
            <p className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <Calendar className="h-4 w-4" />
              <span>{dateRange}</span>
            </p>
            {trip.description && (
              <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">{truncate(trip.description, 160)}</p>
            )}
          </div>
          <div className="flex items-center gap-2 sm:pl-4">
            <button
              onClick={() => onEdit(trip)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition-colors hover:border-gray-300 hover:text-gray-700 dark:border-gray-800 dark:text-gray-300 dark:hover:border-gray-700"
              aria-label={`Edit ${trip.title}`}
            >
              <Edit2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => onDelete(trip)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-red-100 text-red-500 transition-colors hover:border-red-200 hover:text-red-600 dark:border-red-900/40 dark:text-red-300 dark:hover:border-red-800/60"
              aria-label={`Delete ${trip.title}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onView(trip.id)}
            className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-900 dark:bg-white dark:text-black dark:hover:bg-gray-200"
          >
            Open itinerary
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => onOpenIntelligence(trip)}
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:border-gray-300 hover:bg-white dark:border-gray-800 dark:text-gray-200 dark:hover:border-gray-700 dark:hover:bg-gray-900/60"
          >
            <Bot className="h-4 w-4" />
            Travel Intelligence
          </button>
        </div>
      </div>
    </article>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-gray-300 bg-white/70 px-8 py-10 text-center dark:border-gray-800 dark:bg-gray-950/70">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-900 text-white dark:bg-white dark:text-gray-900">
        <Plus className="h-5 w-5" />
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No trips just yet</h3>
        <p className="max-w-sm text-sm text-gray-600 dark:text-gray-400">
          Build your first itinerary and invite Travel Intelligence to help you shape each day.
        </p>
      </div>
      <button
        onClick={onCreate}
        className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-900 dark:bg-white dark:text-black dark:hover:bg-gray-200"
      >
        <Plus className="h-4 w-4" />
        Start planning
      </button>
    </div>
  );
}

function NextTripCard({ trip, onView, onEdit }: { trip: Trip; onView: (tripId: string) => void; onEdit: (trip: Trip) => void }) {
  const dateRange = formatDateRange(trip.start_date, trip.end_date);
  const countdown = formatCountdown(trip.start_date);

  return (
    <section className="flex flex-col justify-between gap-6 rounded-3xl border border-gray-200 bg-gradient-to-br from-white/90 via-white/70 to-blue-50/60 p-6 shadow-sm dark:border-gray-800 dark:from-gray-950/80 dark:via-gray-950/60 dark:to-blue-950/40">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[2px] text-gray-500 dark:text-gray-400">Next trip</p>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">{trip.title}</h2>
        {trip.destination && (
          <p className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <MapPin className="h-4 w-4" />
            {trip.destination}
          </p>
        )}
        <p className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <Calendar className="h-4 w-4" />
          {dateRange}
        </p>
        {countdown && <p className="text-xs font-medium text-blue-600 dark:text-blue-300">{countdown}</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onView(trip.id)}
          className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-900 dark:bg-white dark:text-black dark:hover:bg-gray-200"
        >
          Open itinerary
          <ArrowRight className="h-4 w-4" />
        </button>
        <button
          onClick={() => onEdit(trip)}
          className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:border-gray-300 hover:bg-white dark:border-gray-800 dark:text-gray-200 dark:hover:border-gray-700 dark:hover:bg-gray-900/60"
        >
          Edit details
        </button>
      </div>
    </section>
  );
}

function TravelIntelligenceCard({ preview, onOpen }: { preview: string | null; onOpen: () => void }) {
  return (
    <section className="flex flex-col justify-between gap-6 rounded-3xl border border-gray-200 bg-white/90 p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950/80">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[2px] text-gray-500 dark:text-gray-400">Travel Intelligence</p>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Stay inspired between planning sessions</h3>
        <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">
          Ask Urban Manual to suggest restaurants, pacing, and last-minute ideas whenever you are ready.
        </p>
        {preview && (
          <div className="rounded-2xl border border-gray-200 bg-white/80 p-4 text-sm italic text-gray-600 dark:border-gray-800 dark:bg-gray-900/60 dark:text-gray-300">
            “{truncate(preview, 140)}”
          </div>
        )}
      </div>
      <button
        onClick={onOpen}
        className="inline-flex items-center gap-2 self-start rounded-full border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:border-gray-300 hover:bg-white dark:border-gray-800 dark:text-gray-200 dark:hover:border-gray-700 dark:hover:bg-gray-900/60"
      >
        <Bot className="h-4 w-4" />
        Launch Travel Intelligence
      </button>
    </section>
  );
}

export default function TripsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [showPlanner, setShowPlanner] = useState(false);
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [showIntelligence, setShowIntelligence] = useState(false);
  const [intelligenceSessionToken, setIntelligenceSessionToken] = useState<string | null>(null);
  const [conversationPreview, setConversationPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  const fetchTrips = useCallback(async () => {
    try {
      setLoadingTrips(true);
      const supabaseClient = createClient();
      if (!supabaseClient) return;

      const { data, error } = await supabaseClient.from('trips').select('*').order('created_at', { ascending: false });

      if (error) throw error;
      setTrips(data || []);
    } catch (error) {
      console.error('Error fetching trips:', error);
    } finally {
      setLoadingTrips(false);
    }
  }, []);

  const fetchConversationPreview = useCallback(async () => {
    if (!user?.id) return;
    try {
      const response = await fetch(`/api/conversation/${user.id}`);
      if (!response.ok) return;
      const data = await response.json();
      const messages = Array.isArray(data.messages) ? data.messages : [];
      const lastAssistant = [...messages].reverse().find((msg: any) => msg.role === 'assistant' && msg.content);
      if (lastAssistant?.content) {
        setConversationPreview(lastAssistant.content as string);
      }
    } catch (error) {
      console.error('Error loading conversation preview:', error);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user) {
      fetchTrips();
      fetchConversationPreview();
    }
  }, [user, fetchTrips, fetchConversationPreview]);

  const activeTrips = useMemo(() => {
    return trips
      .filter((trip) => trip.status !== 'completed')
      .sort((a, b) => {
        const aStart = parseDate(a.start_date)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        const bStart = parseDate(b.start_date)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        return aStart - bStart;
      });
  }, [trips]);

  const archivedTrips = useMemo(() => {
    return trips
      .filter((trip) => trip.status === 'completed')
      .sort((a, b) => {
        const aEnd = parseDate(a.end_date)?.getTime() ?? parseDate(a.start_date)?.getTime() ?? 0;
        const bEnd = parseDate(b.end_date)?.getTime() ?? parseDate(b.start_date)?.getTime() ?? 0;
        return bEnd - aEnd;
      });
  }, [trips]);

  const nextTrip = activeTrips[0];

  const handleOpenPlanner = useCallback((trip?: Trip) => {
    setEditingTripId(trip?.id ?? null);
    setShowPlanner(true);
  }, []);

  const handleDeleteTrip = useCallback(async (trip: Trip) => {
    if (!confirm(`Are you sure you want to delete "${trip.title}"?`)) return;
    try {
      const supabaseClient = createClient();
      if (!supabaseClient) return;

      const { error } = await supabaseClient.from('trips').delete().eq('id', trip.id);
      if (error) throw error;

      setTrips((current) => current.filter((item) => item.id !== trip.id));
    } catch (error) {
      console.error('Error deleting trip:', error);
      alert('Failed to delete trip');
    }
  }, []);

  const handleViewTrip = useCallback(
    (tripId: string) => {
      router.push(`/trips/${tripId}`);
    },
    [router],
  );

  const handleOpenIntelligence = useCallback((trip?: Trip) => {
    setIntelligenceSessionToken(trip ? `trip-${trip.id}` : null);
    setShowIntelligence(true);
  }, []);

  useEffect(() => {
    if (!user) return;
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('new') === '1') {
      handleOpenPlanner();
      router.replace('/trips');
    }
  }, [user, handleOpenPlanner, router]);

  if (authLoading || loadingTrips) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <span className="text-gray-500 dark:text-gray-400">Loading trips…</span>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="pb-24">
      <PageIntro
        eyebrow="Itinerary studio"
        title="Trips"
        description="Organize upcoming adventures, revisit past highlights, and keep each itinerary evolving."
        actions={
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => handleOpenPlanner()}
              className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-900 dark:bg-white dark:text-black dark:hover:bg-gray-200"
            >
              <Plus className="h-4 w-4" />
              New trip
            </button>
            <button
              onClick={() => handleOpenIntelligence()}
              className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:border-gray-400 hover:bg-white dark:border-gray-700 dark:text-gray-200 dark:hover:border-gray-600 dark:hover:bg-gray-900/60"
            >
              <Bot className="h-4 w-4" />
              Travel Intelligence
            </button>
          </div>
        }
      />

      <PageContainer className="space-y-8">
        <div className={`grid gap-6 ${nextTrip ? 'lg:grid-cols-2' : ''}`}>
          {nextTrip && <NextTripCard trip={nextTrip} onView={handleViewTrip} onEdit={handleOpenPlanner} />}
          <TravelIntelligenceCard preview={conversationPreview} onOpen={() => handleOpenIntelligence(nextTrip)} />
        </div>

        <section className="rounded-3xl border border-gray-200 bg-white/90 p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950/80">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Active trips</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Keep plans close and iterate when inspiration hits.</p>
            </div>
            <button
              onClick={() => handleOpenPlanner()}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-gray-300 hover:bg-white dark:border-gray-800 dark:text-gray-200 dark:hover:border-gray-700 dark:hover:bg-gray-900/60"
            >
              <Plus className="h-4 w-4" />
              Add trip
            </button>
          </div>
          <div className="mt-6">
            {activeTrips.length === 0 ? (
              <EmptyState onCreate={() => handleOpenPlanner()} />
            ) : (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {activeTrips.map((trip) => (
                  <TripCard
                    key={trip.id}
                    trip={trip}
                    onView={handleViewTrip}
                    onEdit={handleOpenPlanner}
                    onDelete={handleDeleteTrip}
                    onOpenIntelligence={handleOpenIntelligence}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        {archivedTrips.length > 0 && (
          <section className="rounded-3xl border border-gray-200 bg-white/90 p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950/80">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Past trips</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Save your favourite itineraries for easy sharing or quick duplication.</p>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {archivedTrips.map((trip) => (
                <div
                  key={trip.id}
                  className="flex flex-col justify-between gap-4 rounded-2xl border border-gray-200 bg-white/80 p-5 transition hover:border-gray-300 dark:border-gray-800 dark:bg-gray-950/70 dark:hover:border-gray-700"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-[2px] text-gray-400 dark:text-gray-500">
                      <span>Completed</span>
                      {trip.destination && (
                        <span className="flex items-center gap-1 text-[11px] normal-case text-gray-500 dark:text-gray-400">
                          <MapPin className="h-3 w-3" />
                          {trip.destination}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{trip.title}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{formatDateRange(trip.start_date, trip.end_date)}</p>
                    {trip.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-300">{truncate(trip.description, 120)}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleViewTrip(trip.id)}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:border-gray-300 hover:bg-white dark:border-gray-800 dark:text-gray-300 dark:hover:border-gray-700 dark:hover:bg-gray-900/60"
                    >
                      View itinerary
                    </button>
                    <button
                      onClick={() => handleOpenPlanner(trip)}
                      className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:border-gray-300 hover:bg-white dark:border-gray-800 dark:text-gray-300 dark:hover:border-gray-700 dark:hover:bg-gray-900/60"
                    >
                      Duplicate
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </PageContainer>

      <TripPlanner
        isOpen={showPlanner}
        tripId={editingTripId || undefined}
        onClose={() => {
          setShowPlanner(false);
          setEditingTripId(null);
          if (user) {
            fetchTrips();
          }
        }}
      />

      <ConversationInterfaceStreaming
        isOpen={showIntelligence}
        onClose={() => setShowIntelligence(false)}
        sessionToken={intelligenceSessionToken || undefined}
        useStreaming
      />
    </div>
  );
}
