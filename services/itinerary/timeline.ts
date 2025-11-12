import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import type { AvailabilityResponse } from '@/services/intelligence/context';
import { fetchAvailability } from '@/services/intelligence/context';

export type OpeningHoursMap = Record<string, string[]>;

export interface DestinationAttraction {
  id: string;
  slug: string;
  name: string;
  category?: string;
  description?: string;
  durationMinutes?: number;
  priority?: number;
  openingHours?: OpeningHoursMap;
  location?: {
    address?: string;
    latitude?: number;
    longitude?: number;
  };
}

export interface DestinationData {
  slug: string;
  timezone?: string;
  defaultStartHour?: number;
  defaultEndHour?: number;
  attractions: DestinationAttraction[];
}

export interface TimelinePreferences {
  dayStartHour?: number;
  dayEndHour?: number;
  breakMinutes?: number;
  maxPerDay?: number;
  preferredCategories?: string[];
  pace?: 'relaxed' | 'balanced' | 'intense';
  partySize?: number;
}

export interface TimelineGenerationInput {
  tripId: number;
  destinationSlug: string;
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  preferences?: TimelinePreferences;
}

export interface TimelineEventMetadata {
  category?: string;
  location?: DestinationAttraction['location'];
  attractionId?: string;
  source?: string;
  [key: string]: unknown;
}

export interface TimelineEvent {
  id: string;
  title: string;
  description?: string;
  startsAt: string; // ISO datetime
  endsAt?: string; // ISO datetime
  durationMinutes?: number;
  availability?: AvailabilityResponse;
  metadata?: TimelineEventMetadata;
  notes?: string;
  dayIndex: number;
}

export interface TimelineDay {
  id: string;
  label: string;
  date: string; // ISO date string
  index: number;
  events: TimelineEvent[];
}

export interface TimelinePlan {
  tripId: number;
  destinationSlug: string;
  startDate: string;
  endDate: string;
  days: TimelineDay[];
  unplacedAttractions: DestinationAttraction[];
  preferences: Required<TimelinePreferences>;
  generatedAt: string;
}

export interface TimelineGenerationOptions {
  availabilityProvider?: (requests: AvailabilityRequest[]) => Promise<AvailabilityResponse[]>;
  baseUrl?: string;
}

export interface AvailabilityRequest {
  attractionId?: string;
  destinationSlug: string;
  date: string; // ISO date string
  startTime: string; // HH:mm format
  endTime?: string;
  partySize?: number;
}

const WEEKDAY_KEYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

type WeekdayKey = (typeof WEEKDAY_KEYS)[number];

function toWeekdayKey(date: Date): WeekdayKey {
  return WEEKDAY_KEYS[date.getUTCDay()];
}

function parseTimeString(value: string): { hours: number; minutes: number } {
  const [hours, minutes] = value.split(':').map(Number);
  return {
    hours: Number.isFinite(hours) ? hours : 0,
    minutes: Number.isFinite(minutes) ? minutes : 0,
  };
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function formatTime(date: Date): string {
  return date.toISOString().slice(11, 16);
}

function ensureTimelinePreferences(
  destination: DestinationData,
  preferences?: TimelinePreferences,
): Required<TimelinePreferences> {
  const base: Required<TimelinePreferences> = {
    dayStartHour: preferences?.dayStartHour ?? destination.defaultStartHour ?? 9,
    dayEndHour: preferences?.dayEndHour ?? destination.defaultEndHour ?? 20,
    breakMinutes: preferences?.breakMinutes ?? 60,
    maxPerDay: preferences?.maxPerDay ?? 4,
    preferredCategories: preferences?.preferredCategories ?? [],
    pace: preferences?.pace ?? 'balanced',
    partySize: preferences?.partySize ?? 2,
  };

  if (base.pace === 'relaxed') {
    base.maxPerDay = Math.max(3, base.maxPerDay - 1);
  } else if (base.pace === 'intense') {
    base.maxPerDay = base.maxPerDay + 1;
  }

  return base;
}

function getOpeningWindows(attraction: DestinationAttraction, date: Date) {
  const hoursForDay = attraction.openingHours?.[toWeekdayKey(date)] ?? [];
  return hoursForDay.map(range => {
    const [start, end] = range.split('-');
    return { start, end };
  });
}

function clampToWindow(
  date: Date,
  window: { start: string; end: string },
  durationMinutes: number,
): { start: Date; end: Date } | null {
  const startParts = parseTimeString(window.start);
  const endParts = parseTimeString(window.end);
  const startDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), startParts.hours, startParts.minutes));
  const endDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), endParts.hours, endParts.minutes));
  const eventEnd = addMinutes(startDate, durationMinutes);
  if (eventEnd > endDate) {
    if (eventEnd.getTime() - endDate.getTime() > 10 * 60 * 1000) {
      return null;
    }
  }
  return { start: startDate, end: eventEnd <= endDate ? eventEnd : endDate };
}

function withinOperatingDay(startHour: number, endHour: number, start: Date, end: Date): boolean {
  const dayStart = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate(), startHour, 0));
  const dayEnd = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate(), endHour, 0));
  return start >= dayStart && end <= dayEnd;
}

export async function loadDestinationData(destinationSlug: string): Promise<DestinationData> {
  const filePath = path.join(process.cwd(), 'data', 'destinations', `${destinationSlug}.json`);
  const raw = await fs.readFile(filePath, 'utf-8');
  const parsed = JSON.parse(raw) as DestinationData;
  if (!Array.isArray(parsed.attractions)) {
    throw new Error(`Destination ${destinationSlug} is missing attractions data`);
  }
  return parsed;
}

function enumerateTripDates(startDate: string, endDate: string): Date[] {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error('Invalid trip date range provided');
  }
  if (end < start) {
    throw new Error('Trip end date must be after start date');
  }
  const days: Date[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    days.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

function pickAttractions(
  destination: DestinationData,
  preferences: Required<TimelinePreferences>,
): DestinationAttraction[] {
  const sorted = [...destination.attractions].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  if (!preferences.preferredCategories.length) {
    return sorted;
  }
  const preferred = sorted.filter(attraction =>
    attraction.category && preferences.preferredCategories?.includes(attraction.category),
  );
  const remaining = sorted.filter(attraction => !preferred.includes(attraction));
  return [...preferred, ...remaining];
}

function createEventFromAttraction(
  attraction: DestinationAttraction,
  dayDate: Date,
  start: Date,
  end: Date,
  index: number,
): TimelineEvent {
  return {
    id: randomUUID(),
    title: attraction.name,
    description: attraction.description,
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
    durationMinutes: Math.max(30, Math.round((end.getTime() - start.getTime()) / (60 * 1000))),
    metadata: {
      category: attraction.category,
      location: attraction.location,
      attractionId: attraction.id,
      index,
      source: 'engine',
    },
    dayIndex: index,
  };
}

function isoDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export async function generateTimeline(
  input: TimelineGenerationInput,
  options?: TimelineGenerationOptions,
): Promise<TimelinePlan> {
  const destination = await loadDestinationData(input.destinationSlug);
  const preferences = ensureTimelinePreferences(destination, input.preferences);
  const tripDates = enumerateTripDates(input.startDate, input.endDate);
  const attractions = pickAttractions(destination, preferences);
  const unplaced: DestinationAttraction[] = [];
  const days: TimelineDay[] = [];
  let attractionCursor = 0;

  tripDates.forEach((date, dayIndex) => {
    const label = `Day ${dayIndex + 1}`;
    const day: TimelineDay = {
      id: `timeline-day-${dayIndex + 1}`,
      label,
      date: isoDate(date),
      index: dayIndex + 1,
      events: [],
    };

    let slotsFilled = 0;
    let currentTime = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), preferences.dayStartHour, 0));

    while (slotsFilled < preferences.maxPerDay && attractionCursor < attractions.length) {
      const attraction = attractions[attractionCursor];
      attractionCursor += 1;
      const duration = attraction.durationMinutes ?? 90;
      const windows = getOpeningWindows(attraction, date);

      let scheduled: { start: Date; end: Date } | null = null;

      if (windows.length === 0) {
        const fallbackEnd = addMinutes(currentTime, duration);
        if (withinOperatingDay(preferences.dayStartHour, preferences.dayEndHour, currentTime, fallbackEnd)) {
          scheduled = { start: currentTime, end: fallbackEnd };
        }
      } else {
        for (const window of windows) {
          const windowSlot = clampToWindow(date, window, duration);
          if (!windowSlot) continue;
          if (windowSlot.start < currentTime) {
            const adjustedStart = currentTime;
            const adjustedEnd = addMinutes(adjustedStart, duration);
            if (adjustedEnd <= windowSlot.end && withinOperatingDay(preferences.dayStartHour, preferences.dayEndHour, adjustedStart, adjustedEnd)) {
              scheduled = { start: adjustedStart, end: adjustedEnd };
              break;
            }
          } else if (withinOperatingDay(preferences.dayStartHour, preferences.dayEndHour, windowSlot.start, windowSlot.end)) {
            scheduled = windowSlot;
            break;
          }
        }
      }

      if (!scheduled) {
        unplaced.push(attraction);
        continue;
      }

      const event = createEventFromAttraction(attraction, date, scheduled.start, scheduled.end, day.index);
      day.events.push(event);
      currentTime = addMinutes(scheduled.end, preferences.breakMinutes);
      slotsFilled += 1;
    }

    days.push(day);
  });

  // Fill availability
  const availabilityRequests: AvailabilityRequest[] = days
    .flatMap(day => day.events.map(event => ({
      attractionId: event.metadata?.attractionId,
      destinationSlug: input.destinationSlug,
      date: day.date,
      startTime: formatTime(new Date(event.startsAt)),
      endTime: event.endsAt ? formatTime(new Date(event.endsAt)) : undefined,
      partySize: preferences.partySize,
    })));

  if (availabilityRequests.length > 0) {
    try {
      const provider = options?.availabilityProvider ?? (requests => fetchAvailability(requests, { baseUrl: options?.baseUrl }));
      const availability = await provider(availabilityRequests);
      const availabilityMap = new Map<string, AvailabilityResponse>();
      availability.forEach(entry => {
        if (!entry.attractionId) return;
        const key = `${entry.attractionId}-${entry.date}-${entry.startTime}`;
        availabilityMap.set(key, entry);
      });

      days.forEach(day => {
        day.events = day.events.map(event => {
          const key = `${event.metadata?.attractionId ?? ''}-${day.date}-${formatTime(new Date(event.startsAt))}`;
          return {
            ...event,
            availability: availabilityMap.get(key),
          };
        });
      });
    } catch (error) {
      console.warn('Failed to hydrate itinerary availability', error);
    }
  }

  return {
    tripId: input.tripId,
    destinationSlug: input.destinationSlug,
    startDate: input.startDate,
    endDate: input.endDate,
    days,
    unplacedAttractions: unplaced,
    preferences,
    generatedAt: new Date().toISOString(),
  };
}

export type { TimelinePlan as GeneratedTimeline, TimelineDay as TimelineDayPlan, TimelineEvent as TimelineEventPlan };
