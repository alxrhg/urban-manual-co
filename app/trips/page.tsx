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
  MoreVertical,
  ChevronDown,
} from 'lucide-react';
import { PageContainer } from '@/components/PageContainer';
import { TripPlanner } from '@/components/TripPlanner';
import { ConversationInterfaceStreaming } from '@/app/components/chat/ConversationInterfaceStreaming';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
    <article className="group relative overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-950 shadow-sm hover:shadow-md transition-shadow">
      <div className="relative flex flex-col gap-4 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-xl md:text-2xl font-medium leading-tight text-black dark:text-white mb-2">
              {trip.title}
            </h3>
            
            {/* Subtle Metadata */}
            <div className="flex flex-wrap items-center gap-3 text-xs font-normal text-gray-500 dark:text-gray-500">
              <span className="px-2 py-0.5 rounded-full border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                {statusStyle.label}
              </span>
              {trip.destination && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {trip.destination}
                  </span>
                </>
              )}
              {(trip.start_date || trip.end_date) && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {dateRange}
                  </span>
                </>
              )}
              {countdown && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {countdown}
                  </span>
                </>
              )}
            </div>
          </div>
          
          {/* Overflow Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:ring-offset-2"
                aria-label="More options"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onView(trip.id)}>
                <ArrowRight className="h-3.5 w-3.5 mr-2" />
                View itinerary
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onOpenIntelligence(trip)}>
                <Bot className="h-3.5 w-3.5 mr-2" />
                Travel Intelligence
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onEdit(trip)}>
                <Edit2 className="h-3.5 w-3.5 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDelete(trip)}
                className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {trip.description && (
          <p className="text-sm font-normal leading-relaxed text-gray-600 dark:text-gray-400 line-clamp-2">
            {trip.description}
          </p>
        )}
      </div>
    </article>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-dashed border-gray-300 bg-white/90 px-8 py-16 text-center dark:border-gray-800 dark:bg-gray-950/70">
      <div className="absolute inset-x-[-40%] top-1/2 h-64 -translate-y-1/2 bg-gradient-to-r from-blue-100 via-purple-100 to-blue-100 opacity-40 blur-3xl dark:from-blue-900/30 dark:via-purple-900/30 dark:to-blue-900/30" />
      <div className="relative mx-auto max-w-lg space-y-5">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-200">
          <Sparkles className="h-6 w-6" />
        </div>
        <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Design your first intelligent itinerary
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Craft a flexible travel blueprint, then invite our Travel Intelligence copilot to fill in restaurants,
          experiences, and hidden gems tailored to your taste.
        </p>
        <button
          onClick={onCreate}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-900 dark:bg-white dark:text-black dark:hover:bg-gray-200"
        >
          <Plus className="h-4 w-4" />
          Create a new trip
        </button>
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
        <span className="text-gray-500 dark:text-gray-400">Loading trips…</span>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="pb-24">
      {/* Manifesto-Style Hero Section */}
      <section className="px-6 md:px-10 lg:px-12 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h1 className="text-4xl md:text-5xl font-medium leading-tight text-black dark:text-white">
            Plan with intention, travel with confidence
          </h1>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 leading-relaxed max-w-2xl mx-auto">
            Keep every itinerary under one roof. Collaborate with friends, activate Travel Intelligence, and evolve each journey as you discover new possibilities.
            </p>
          <div className="flex flex-wrap justify-center gap-3 pt-4">
            <button
              onClick={() => handleOpenPlanner()}
              className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-900 dark:bg-white dark:text-black dark:hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:ring-offset-2"
            >
              <Plus className="h-4 w-4" />
              New Trip
            </button>
          </div>
        </div>
      </section>

      <PageContainer className="space-y-10">
        <section className="rounded-3xl border border-gray-200 bg-white/90 p-8 shadow-sm dark:border-gray-800 dark:bg-gray-950/80">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-2xl border border-gray-200/70 bg-white/80 p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950/70">
              <p className="text-xs font-medium uppercase tracking-[2px] text-gray-500 dark:text-gray-400">
                Active plans
              </p>
              <p className="mt-3 text-2xl font-semibold text-gray-900 dark:text-white">{metrics.active}</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {metrics.planning} planning • {metrics.upcoming} upcoming • {metrics.ongoing} in progress
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200/70 bg-white/80 p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950/70">
              <p className="text-xs font-medium uppercase tracking-[2px] text-gray-500 dark:text-gray-400">
                Next departure
              </p>
              <p className="mt-3 text-2xl font-semibold text-gray-900 dark:text-white">
                {nextTrip ? nextTrip.title : 'No trip scheduled'}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {nextTrip ? formatDateRange(nextTrip.start_date, nextTrip.end_date) : 'Set your next destination'}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200/70 bg-white/80 p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950/70">
              <p className="text-xs font-medium uppercase tracking-[2px] text-gray-500 dark:text-gray-400">
                Completed journeys
              </p>
              <p className="mt-3 text-2xl font-semibold text-gray-900 dark:text-white">{metrics.completed}</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {metrics.total} total itineraries curated with Urban Manual
              </p>
            </div>
          </div>
        </section>

        {/* Travel Intelligence Section - Dedicated */}
        <section className="border-t border-gray-100 dark:border-gray-700 pt-12 mt-12">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-4">
              <div className="text-xs font-normal uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Travel Intelligence
              </div>
              <h2 className="text-2xl md:text-3xl font-medium text-black dark:text-white">
                Co-pilot every trip with live intelligence
              </h2>
              <p className="text-base text-gray-600 dark:text-gray-400 leading-relaxed max-w-2xl mx-auto">
                Ask Urban Manual to flesh out daily rhythms, surface new openings, track availability swings, and keep every itinerary flexible.
              </p>
            </div>
            
            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={() => handleOpenIntelligence()}
                className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-900 dark:bg-white dark:text-black dark:hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:ring-offset-2"
              >
                <Sparkles className="h-4 w-4" />
                {conversationPreview ? 'Resume conversation' : 'Start a session'}
              </button>
              <button
                onClick={() => router.push('/chat')}
                className="inline-flex items-center gap-2 rounded-full border border-gray-100 dark:border-gray-700 px-5 py-2.5 text-sm font-normal text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:ring-offset-2"
              >
                Open full chat
              </button>
            </div>

            {/* Latest Insights & Opportunities */}
            <div className="grid md:grid-cols-2 gap-6 pt-8">
              <div className="space-y-4">
                <div className="text-xs font-normal uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Latest insights
                </div>
                <p className="text-sm font-normal text-gray-600 dark:text-gray-400 leading-relaxed">
                  {conversationPreview
                    ? `"${truncate(conversationPreview, 160)}"`
                    : 'No recent chat yet. Kick off a session to get tailored suggestions and timeline support.'}
                </p>
                  </div>
              <div className="space-y-4">
                <div className="text-xs font-normal uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Live opportunities
                </div>
                {loadingIntelligence ? (
                  <p className="text-sm font-normal text-gray-500 dark:text-gray-400">Scanning for fresh intel…</p>
                ) : opportunities.length === 0 ? (
                  <p className="text-sm font-normal text-gray-500 dark:text-gray-400">
                    No urgent alerts right now. Travel Intelligence will surface price drops, event openings, and weather wins here.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {opportunities.slice(0, 3).map((opportunity, index) => (
                      <div
                        key={`${opportunity.destinationId}-${index}`}
                        className="rounded-lg border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-950 p-4"
                      >
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <p className="text-sm font-normal text-gray-900 dark:text-white">{opportunity.title}</p>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-normal ${URGENCY_BADGE[opportunity.urgency]}`}
                          >
                            {opportunity.urgency}
                          </span>
                        </div>
                        <p className="text-xs font-normal text-gray-500 dark:text-gray-400">{opportunity.description}</p>
                        {(opportunity.city || opportunity.destinationName) && (
                          <p className="mt-2 flex items-center gap-1.5 text-xs font-normal text-gray-500 dark:text-gray-400">
                            <MapPin className="h-3 w-3" />
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


        <section className="border-t border-gray-100 dark:border-gray-700 pt-12 mt-12">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
              <div>
                <h2 className="text-2xl md:text-3xl font-medium text-black dark:text-white mb-2">Your trips</h2>
                <p className="text-sm font-normal text-gray-600 dark:text-gray-400">
                  Each journey tells a story. Build your itinerary, refine with intelligence, and share with collaborators.
                </p>
              </div>
              <button
                onClick={() => handleOpenPlanner()}
                className="inline-flex items-center gap-2 rounded-full border border-gray-100 dark:border-gray-700 px-4 py-2 text-sm font-normal text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:ring-offset-2"
              >
                <Plus className="h-4 w-4" />
                Add trip
              </button>
            </div>
            <div>
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
          </div>
        </section>

        {archivedTrips.length > 0 && (
          <section className="rounded-3xl border border-gray-200 bg-white/90 p-8 shadow-sm dark:border-gray-800 dark:bg-gray-950/80">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Archived journeys</h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Completed itineraries remain accessible for inspiration, sharing, or fast duplication.
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {archivedTrips.map((trip) => (
                <div
                  key={trip.id}
                  className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white/90 p-5 transition hover:border-gray-300 dark:border-gray-800 dark:bg-gray-950/80 dark:hover:border-gray-700"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[2px] text-gray-400 dark:text-gray-500">
                      <span>Completed</span>
                      {trip.destination && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {trip.destination}
                        </span>
                        </>
                      )}
                      </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{trip.title}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDateRange(trip.start_date, trip.end_date)}
                    </p>
                    {trip.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">{truncate(trip.description, 120)}</p>
                    )}
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <button
                      onClick={() => handleViewTrip(trip.id)}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:border-gray-300 hover:bg-white dark:border-gray-800 dark:text-gray-300 dark:hover:border-gray-700 dark:hover:bg-gray-900/60"
                    >
                      View recap
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
