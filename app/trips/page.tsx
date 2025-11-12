'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Plus,
  Calendar,
  MapPin,
  Trash2,
  Edit2,
  Sparkles,
  Bot,
  ArrowRight,
  Clock,
  Compass,
  Layers,
} from 'lucide-react';
import { PageContainer } from '@/components/PageContainer';
import { PageIntro } from '@/components/PageIntro';
import { TripPlanner } from '@/components/TripPlanner';
import { ConversationInterfaceStreaming } from '@/app/components/chat/ConversationInterfaceStreaming';
import { Button } from '@/components/ui/button';

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

interface Opportunity {
  type: 'price_drop' | 'availability_opening' | 'event_alert' | 'weather_opportunity' | 'comparative_deal';
  destinationId: number;
  destinationSlug?: string;
  destinationName?: string;
  city?: string;
  title: string;
  description: string;
  urgency: 'low' | 'medium' | 'high';
  detectedAt: string | Date;
  expiresAt?: string | Date;
}

const TRIP_STATUS_STYLES: Record<
  string,
  { label: string; pillClass: string; accentClass: string }
> = {
  planning: {
    label: 'Planning',
    pillClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200',
    accentClass: 'from-blue-500/10 via-blue-500/0 to-blue-500/0',
  },
  upcoming: {
    label: 'Upcoming',
    pillClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
    accentClass: 'from-emerald-500/10 via-emerald-500/0 to-emerald-500/0',
  },
  ongoing: {
    label: 'In Progress',
    pillClass: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-200',
    accentClass: 'from-purple-500/10 via-purple-500/0 to-purple-500/0',
  },
  completed: {
    label: 'Completed',
    pillClass: 'bg-gray-200 text-gray-700 dark:bg-gray-800/60 dark:text-gray-200',
    accentClass: 'from-gray-500/10 via-gray-500/0 to-gray-500/0',
  },
};

const URGENCY_BADGE: Record<'low' | 'medium' | 'high', string> = {
  low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
  high: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200',
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
    <article className="group relative overflow-hidden rounded-3xl border border-border bg-card/95 shadow-sm transition-transform hover:-translate-y-1">
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${statusStyle.accentClass}`} />
      <div className="relative flex flex-col gap-6 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${statusStyle.pillClass}`}>
                {statusStyle.label}
              </span>
              {countdown && (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  {countdown}
                </span>
              )}
            </div>
            <h3 className="mt-3 text-xl font-semibold leading-tight text-foreground">
              {trip.title}
            </h3>
            {trip.destination && (
              <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" aria-hidden="true" />
                <span>{trip.destination}</span>
              </p>
            )}
            {(trip.start_date || trip.end_date) && (
              <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" aria-hidden="true" />
                <span>{dateRange}</span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="rounded-full border-border/70 text-muted-foreground hover:text-foreground"
              onClick={() => onEdit(trip)}
              aria-label={`Edit ${trip.title}`}
            >
              <Edit2 className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="rounded-full border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:text-red-300"
              onClick={() => onDelete(trip)}
              aria-label={`Delete ${trip.title}`}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>

        {trip.description && (
          <p className="text-sm leading-6 text-muted-foreground">{trip.description}</p>
        )}

        <div className="mt-auto flex flex-wrap gap-3">
          <Button
            type="button"
            className="flex-1 rounded-full"
            onClick={() => onOpenIntelligence(trip)}
          >
            <Bot className="h-4 w-4" aria-hidden="true" />
            Travel Intelligence
          </Button>
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            onClick={() => onView(trip.id)}
          >
            View itinerary
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </article>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-dashed border-border bg-background/95 px-8 py-16 text-center">
      <div className="absolute inset-x-[-40%] top-1/2 h-64 -translate-y-1/2 bg-gradient-to-r from-blue-100 via-purple-100 to-blue-100 opacity-40 blur-3xl dark:from-blue-900/30 dark:via-purple-900/30 dark:to-blue-900/30" aria-hidden="true" />
      <div className="relative mx-auto max-w-lg space-y-5">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-200">
          <Sparkles className="h-6 w-6" aria-hidden="true" />
        </div>
        <h3 className="text-2xl font-semibold text-foreground">
          Design your first intelligent itinerary
        </h3>
        <p className="text-sm text-muted-foreground">
          Craft a flexible travel blueprint, then invite our Travel Intelligence copilot to fill in restaurants,
          experiences, and hidden gems tailored to your taste.
        </p>
        <Button className="rounded-full px-6" onClick={onCreate}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Create a new trip
        </Button>
      </div>
    </div>
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
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loadingIntelligence, setLoadingIntelligence] = useState(false);
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

      const { data, error } = await supabaseClient
        .from('trips')
        .select('*')
        .order('created_at', { ascending: false });

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

  const fetchOpportunities = useCallback(
    async (city?: string | null) => {
      try {
        setLoadingIntelligence(true);
        const params = new URLSearchParams();
        if (city) {
          params.set('city', city);
        }
        const response = await fetch(`/api/intelligence/opportunities${params.toString() ? `?${params.toString()}` : ''}`);
        if (!response.ok) return;
        const data = await response.json();
        setOpportunities(Array.isArray(data.opportunities) ? data.opportunities : []);
      } catch (error) {
        console.error('Error loading travel intelligence opportunities:', error);
      } finally {
        setLoadingIntelligence(false);
      }
    },
    []
  );

  useEffect(() => {
    if (user) {
      fetchTrips();
      fetchConversationPreview();
    }
  }, [user, fetchTrips, fetchConversationPreview]);


  const metrics = useMemo(() => {
    const planning = trips.filter((trip) => trip.status === 'planning').length;
    const upcoming = trips.filter((trip) => trip.status === 'upcoming').length;
    const ongoing = trips.filter((trip) => trip.status === 'ongoing').length;
    const completed = trips.filter((trip) => trip.status === 'completed').length;
    return {
      total: trips.length,
      planning,
      upcoming,
      ongoing,
      completed,
      active: planning + upcoming + ongoing,
    };
  }, [trips]);

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

  useEffect(() => {
    if (!user || loadingTrips) return;
    fetchOpportunities(nextTrip?.destination || undefined);
  }, [user, nextTrip?.destination, loadingTrips, fetchOpportunities]);

  const handleOpenPlanner = useCallback(
    (trip?: Trip) => {
      setEditingTripId(trip?.id ?? null);
      setShowPlanner(true);
    },
    []
  );

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
    [router]
  );

  const handleOpenIntelligence = useCallback((trip?: Trip) => {
    setIntelligenceSessionToken(trip ? `trip-${trip.id}` : null);
    setShowIntelligence(true);
  }, []);

  const workflowSteps = useMemo(
    () => [
      {
        title: 'Blueprint the journey',
        description: 'Lock in cities, travel style, must-hit spots, and collaborators.',
        icon: Compass,
        action: () => handleOpenPlanner(),
        actionLabel: 'Open Trip Planner',
      },
      {
        title: 'Activate Travel Intelligence',
        description: 'Ask Urban Manual to co-create itineraries, surface openings, and refine pacing.',
        icon: Bot,
        action: () => handleOpenIntelligence(),
        actionLabel: 'Launch copilot',
      },
      {
        title: 'Polish & share',
        description: 'Export to calendar or Notion, invite friends, and keep everything in sync.',
        icon: Layers,
        action: () => {
          if (nextTrip) {
            handleViewTrip(nextTrip.id);
          } else {
            handleOpenPlanner();
          }
        },
        actionLabel: nextTrip ? 'Open next trip' : 'Start a plan',
      },
    ],
    [handleOpenPlanner, handleOpenIntelligence, handleViewTrip, nextTrip]
  );

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
        <span className="text-muted-foreground">Loading trips…</span>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="pb-20">
      <PageIntro
        eyebrow="Itinerary Studio"
        title="Trips"
        description="Keep every itinerary under one roof, collaborate with friends, and activate Travel Intelligence to evolve each journey."
        actions={
          <div className="flex flex-wrap gap-3">
            <Button className="rounded-full px-5" onClick={() => handleOpenPlanner()}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              New trip
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-full px-5"
              onClick={() => handleOpenIntelligence()}
            >
              <Bot className="h-4 w-4" aria-hidden="true" />
              Travel Intelligence hub
            </Button>
          </div>
        }
      />

      <PageContainer className="space-y-12">
        <section className="rounded-3xl border border-border bg-card/90 p-8 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-2xl border border-border bg-background/80 p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[2px] text-muted-foreground">
                Active plans
              </p>
              <p className="mt-3 text-2xl font-semibold text-foreground">{metrics.active}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {metrics.planning} planning • {metrics.upcoming} upcoming • {metrics.ongoing} in progress
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-background/80 p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[2px] text-muted-foreground">
                Next departure
              </p>
              <p className="mt-3 text-2xl font-semibold text-foreground">
                {nextTrip ? nextTrip.title : 'No trip scheduled'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {nextTrip ? formatDateRange(nextTrip.start_date, nextTrip.end_date) : 'Set your next destination'}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-background/80 p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[2px] text-muted-foreground">
                Completed journeys
              </p>
              <p className="mt-3 text-2xl font-semibold text-foreground">{metrics.completed}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {metrics.total} total itineraries curated with Urban Manual
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 rounded-3xl border border-border bg-card/90 p-8 shadow-sm lg:grid-cols-[1.5fr,1fr]">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-[2px] text-muted-foreground">
              Travel Intelligence
            </div>
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-foreground">
                Co-pilot every trip with live intelligence
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Ask Urban Manual to flesh out daily rhythms, surface new openings, track availability swings, and keep every itinerary flexible.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button className="rounded-full px-5" onClick={() => handleOpenIntelligence()}>
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                {conversationPreview ? 'Resume conversation' : 'Start a session'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-full px-5"
                onClick={() => router.push('/chat')}
              >
                Open full chat
              </Button>
            </div>
          </div>
          <div className="rounded-3xl border border-border bg-background/90 p-6 shadow-sm">
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[2px] text-muted-foreground">
                  Latest insights
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {conversationPreview
                    ? `“${truncate(conversationPreview, 160)}”`
                    : 'No recent chat yet. Kick off a session to get tailored suggestions and timeline support.'}
                </p>
              </div>
              <div className="space-y-3 border-t border-border pt-4">
                <p className="text-xs font-semibold uppercase tracking-[2px] text-muted-foreground">
                  Live opportunities
                </p>
                {loadingIntelligence ? (
                  <p className="text-sm text-muted-foreground">Scanning for fresh intel…</p>
                ) : opportunities.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No urgent alerts right now. Travel Intelligence will surface price drops, event openings, and weather wins here.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {opportunities.slice(0, 3).map((opportunity, index) => (
                      <div
                        key={`${opportunity.destinationId}-${index}`}
                        className="rounded-2xl border border-border bg-background/90 p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium text-foreground">{opportunity.title}</p>
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${URGENCY_BADGE[opportunity.urgency]}`}
                          >
                            {opportunity.urgency}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">{opportunity.description}</p>
                        {(opportunity.city || opportunity.destinationName) && (
                          <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>{opportunity.city || opportunity.destinationName}</span>
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card/90 p-8 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-xl space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[2px] text-muted-foreground">
                Orchestrated flow
              </p>
              <h2 className="text-2xl font-semibold text-foreground">Plan with confidence, finish with flair</h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Every trip follows a proven cadence. Progress through each step and Travel Intelligence keeps the details humming in the background.
              </p>
            </div>
            <div className="grid flex-1 gap-4 sm:grid-cols-2">
              {workflowSteps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.title}
                    className="flex flex-col rounded-2xl border border-border bg-background/90 p-5 shadow-sm transition hover:border-foreground/10"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-200">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">0{index + 1}</span>
                    </div>
                    <div className="mt-4 space-y-2">
                      <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
                      <p className="text-xs leading-5 text-muted-foreground">{step.description}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      className="mt-auto justify-start gap-2 px-0 text-blue-600 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200"
                      onClick={step.action}
                    >
                      {step.actionLabel}
                      <ArrowRight className="h-3 w-3" aria-hidden="true" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card/90 p-8 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Active trips</h2>
              <p className="text-sm text-muted-foreground">
                Collaborate with Travel Intelligence to complete each itinerary.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="rounded-full px-4"
              onClick={() => handleOpenPlanner()}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add trip
            </Button>
          </div>
          <div className="mt-6">
            {activeTrips.length === 0 ? (
              <EmptyState onCreate={() => handleOpenPlanner()} />
            ) : (
              <div className="grid gap-6 lg:grid-cols-2">
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
          <section className="rounded-3xl border border-border bg-card/90 p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-foreground">Archived journeys</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Completed itineraries remain accessible for inspiration, sharing, or fast duplication.
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {archivedTrips.map((trip) => (
                <div
                  key={trip.id}
                  className="flex flex-col justify-between rounded-2xl border border-border bg-background/90 p-5 transition hover:border-foreground/10"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[2px] text-muted-foreground">
                      <span>Completed</span>
                      {trip.destination && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" aria-hidden="true" />
                            {trip.destination}
                          </span>
                        </>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">{trip.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      {formatDateRange(trip.start_date, trip.end_date)}
                    </p>
                    {trip.description && (
                      <p className="text-sm text-muted-foreground">{truncate(trip.description, 120)}</p>
                    )}
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 rounded-full"
                      onClick={() => handleViewTrip(trip.id)}
                    >
                      View recap
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full"
                      onClick={() => handleOpenPlanner(trip)}
                    >
                      Duplicate
                    </Button>
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
