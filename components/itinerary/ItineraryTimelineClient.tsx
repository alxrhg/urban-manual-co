'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, RefreshCw, Save } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import type { TimelinePlan } from '@/services/itinerary/timeline';
import { TimelineProvider, useTimeline } from './TimelineProvider';
import { TimelineGrid } from './TimelineGrid';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface TripSummary {
  id: number;
  title: string;
  destination?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

interface ItineraryTimelineClientProps {
  tripId: number;
  trip: TripSummary;
}

function normalizeDestinationSlug(destination?: string | null): string {
  if (!destination) return 'paris';
  return destination
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'paris';
}

function createEmptyPlan(trip: TripSummary, destinationSlug: string): TimelinePlan {
  const start = trip.startDate ? new Date(trip.startDate) : new Date();
  const end = trip.endDate ? new Date(trip.endDate) : start;
  if (end < start) {
    end.setTime(start.getTime());
  }
  const days: TimelinePlan['days'] = [];
  const cursor = new Date(start);
  let index = 1;
  while (cursor <= end) {
    days.push({
      id: `timeline-day-${index}`,
      label: `Day ${index}`,
      date: cursor.toISOString().split('T')[0],
      index,
      events: [],
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    index += 1;
  }
  if (days.length === 0) {
    days.push({ id: 'timeline-day-1', label: 'Day 1', date: new Date().toISOString().split('T')[0], index: 1, events: [] });
  }
  return {
    tripId: trip.id,
    destinationSlug,
    startDate: days[0].date,
    endDate: days[days.length - 1].date,
    days,
    unplacedAttractions: [],
    preferences: {
      dayStartHour: 9,
      dayEndHour: 20,
      breakMinutes: 60,
      maxPerDay: 4,
      preferredCategories: [],
      pace: 'balanced',
      partySize: 2,
    },
    generatedAt: new Date().toISOString(),
  };
}

function convertPlanFromQuery(trip: TripSummary, plan: TimelinePlan | null | undefined): TimelinePlan {
  if (plan) {
    return plan;
  }
  return createEmptyPlan(trip, normalizeDestinationSlug(trip.destination));
}

function TimelineInitializer({ plan }: { plan: TimelinePlan | null }) {
  const { setPlan } = useTimeline();
  const lastPlan = useRef<TimelinePlan | null>(null);

  useEffect(() => {
    if (plan && plan !== lastPlan.current) {
      setPlan(plan);
      lastPlan.current = plan;
    }
  }, [plan, setPlan]);

  return null;
}

interface TimelineLayoutProps {
  trip: TripSummary;
  loading: boolean;
  error?: string;
  generating: boolean;
  saving: boolean;
  onGenerate: (destinationSlug: string) => Promise<void>;
  onSave: (events: SaveEventPayload[]) => Promise<void>;
}

interface SaveEventPayload {
  id: string;
  dayId: string;
  dayIndex: number;
  date: string;
  startsAt: string | null;
  endsAt: string | null;
  title: string;
  description: string | null;
  notes: string | null;
  attractionId: string | null;
  destinationSlug: string;
  availability: unknown;
  metadata: unknown;
}

function TimelineLayout({ trip, loading, error, generating, saving, onGenerate, onSave }: TimelineLayoutProps) {
  const { destinationSlug, setDestinationSlug, dirty, getPlan, markClean } = useTimeline();
  const [pendingSave, setPendingSave] = useState(false);
  const [pendingGenerate, setPendingGenerate] = useState(false);
  const [localDestination, setLocalDestination] = useState(destinationSlug);

  useEffect(() => {
    setLocalDestination(destinationSlug);
  }, [destinationSlug]);

  const handleSave = async () => {
    const plan = getPlan();
    if (!plan) return;
    const events: SaveEventPayload[] = plan.days.flatMap(day =>
      day.events.map(event => ({
        id: event.id,
        dayId: day.id,
        dayIndex: day.index,
        date: day.date,
        startsAt: event.startsAt ?? null,
        endsAt: event.endsAt ?? null,
        title: event.title,
        description: event.description ?? null,
        notes: event.notes ?? null,
        attractionId: event.metadata?.attractionId ?? null,
        destinationSlug: plan.destinationSlug,
        availability: event.availability ?? null,
        metadata: event.metadata ?? null,
      })),
    );

    setPendingSave(true);
    try {
      await onSave(events);
      markClean();
    } finally {
      setPendingSave(false);
    }
  };

  const handleGenerate = async () => {
    setPendingGenerate(true);
    try {
      const slug = (localDestination || destinationSlug || normalizeDestinationSlug(trip.destination)).trim();
      setDestinationSlug(slug || normalizeDestinationSlug(trip.destination));
      await onGenerate(slug || normalizeDestinationSlug(trip.destination));
    } finally {
      setPendingGenerate(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="rounded-3xl border border-neutral-200/80 bg-white/90 p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/50">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">{trip.title}</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-500 dark:text-neutral-400">
              <span>Destination dataset</span>
              <Input
                value={localDestination}
                onChange={event => setLocalDestination(event.target.value)}
                onBlur={() => setDestinationSlug(localDestination || normalizeDestinationSlug(trip.destination))}
                className="h-9 w-48 rounded-xl border-neutral-200/70 bg-white text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
              <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs uppercase tracking-[0.2em] text-neutral-500 dark:bg-neutral-800/70 dark:text-neutral-400">
                {dirty ? 'Unsaved edits' : 'Synced'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="ghost"
              onClick={handleGenerate}
              disabled={generating || pendingGenerate}
              className="gap-2"
            >
              {generating || pendingGenerate ? <Spinner className="size-4" /> : <RefreshCw className="size-4" />}
              Generate schedule
            </Button>
            <Button
              variant="default"
              onClick={handleSave}
              disabled={!dirty || saving || pendingSave}
              className="gap-2"
            >
              {saving || pendingSave ? <Spinner className="size-4" /> : <Save className="size-4" />}
              Save changes
            </Button>
          </div>
        </div>
        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
            <AlertCircle className="size-4" />
            {error}
          </div>
        )}
      </div>

      <div className="flex-1 rounded-3xl border border-neutral-200/80 bg-white/90 p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/40">
        {loading ? (
          <div className="flex min-h-[40vh] items-center justify-center text-neutral-500 dark:text-neutral-400">
            <Spinner className="size-6" />
          </div>
        ) : (
          <TimelineGrid />
        )}
      </div>
    </div>
  );
}

export function ItineraryTimelineClient({ tripId, trip }: ItineraryTimelineClientProps) {
  const { data, isLoading, error } = trpc.itinerary.get.useQuery({ tripId });
  const generateMutation = trpc.itinerary.generate.useMutation();
  const saveMutation = trpc.itinerary.save.useMutation();

  const [seedPlan, setSeedPlan] = useState<TimelinePlan | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const currentTrip = useMemo<TripSummary>(() => ({
    id: tripId,
    title: data?.trip?.title ?? trip.title,
    destination: data?.trip?.destination ?? trip.destination,
    startDate: data?.trip?.startDate ?? trip.startDate,
    endDate: data?.trip?.endDate ?? trip.endDate,
  }), [tripId, data?.trip, trip]);

  useEffect(() => {
    if (!hydrated && (data || error)) {
      const timelinePlan = data?.timeline
        ? {
            ...data.timeline,
            tripId,
            unplacedAttractions: [],
            preferences: data.timeline.preferences ?? {
              dayStartHour: 9,
              dayEndHour: 20,
              breakMinutes: 60,
              maxPerDay: 4,
              preferredCategories: [],
              pace: 'balanced',
              partySize: 2,
            },
          }
        : null;
      setSeedPlan(convertPlanFromQuery(currentTrip, timelinePlan));
      setHydrated(true);
    }
  }, [data, error, hydrated, tripId, currentTrip]);

  const handleGenerate = async (destinationSlug: string) => {
    const result = await generateMutation.mutateAsync({
      tripId,
      destinationSlug,
      startDate: currentTrip.startDate ?? new Date().toISOString(),
      endDate: currentTrip.endDate ?? currentTrip.startDate ?? new Date().toISOString(),
    });
    setSeedPlan(result.plan);
  };

  return (
    <TimelineProvider initialPlan={seedPlan ?? undefined}>
      <TimelineInitializer plan={seedPlan} />
      <TimelineLayout
        trip={currentTrip}
        loading={isLoading && !hydrated}
        error={error ? error.message : undefined}
        generating={generateMutation.isLoading}
        saving={saveMutation.isLoading}
        onGenerate={handleGenerate}
        onSave={events => saveMutation.mutateAsync({ tripId, events })}
      />
    </TimelineProvider>
  );
}

export default ItineraryTimelineClient;
