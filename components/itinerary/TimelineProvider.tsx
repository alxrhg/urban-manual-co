'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type {
  TimelineDay,
  TimelineEvent,
  TimelinePlan,
  TimelinePreferences,
} from '@/services/itinerary/timeline';

export interface TimelineEventState extends TimelineEvent {
  destinationSlug: string;
}

export interface TimelineDayState extends Omit<TimelineDay, 'events'> {
  events: TimelineEventState[];
}

interface TimelineMetaState {
  tripId: number;
  destinationSlug: string;
  startDate: string;
  endDate: string;
  preferences?: TimelinePreferences;
}

interface TimelineContextValue {
  days: TimelineDayState[];
  destinationSlug: string;
  dirty: boolean;
  setPlan: (plan: TimelinePlan) => void;
  updateEvent: (eventId: string, updates: Partial<TimelineEventState>) => void;
  moveEvent: (eventId: string, dayId: string, position?: number) => void;
  removeEvent: (eventId: string) => void;
  addEvent: (dayId: string, event: TimelineEventState, position?: number) => void;
  getPlan: () => TimelinePlan | null;
  markClean: () => void;
  setDestinationSlug: (slug: string) => void;
}

const TimelineContext = createContext<TimelineContextValue | undefined>(undefined);

function ensureTimeString(value?: string | null): string {
  if (!value) {
    return '09:00:00.000Z';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '09:00:00.000Z';
  }
  return date.toISOString().split('T')[1] ?? '09:00:00.000Z';
}

function combineDateAndTime(date: string, time: string | undefined): string {
  const normalized = time && time.includes('T') ? time.split('T')[1] : time;
  const fallback = normalized ?? '09:00:00.000Z';
  return new Date(`${date}T${fallback}`).toISOString();
}

function sortEvents(events: TimelineEventState[]): TimelineEventState[] {
  return [...events].sort((a, b) => {
    if (a.startsAt && b.startsAt) {
      return a.startsAt < b.startsAt ? -1 : a.startsAt > b.startsAt ? 1 : 0;
    }
    if (a.startsAt) return -1;
    if (b.startsAt) return 1;
    return a.title.localeCompare(b.title);
  });
}

function cloneDays(days: TimelineDayState[]): TimelineDayState[] {
  return days.map(day => ({
    ...day,
    events: day.events.map(event => ({ ...event })),
  }));
}

export function TimelineProvider({ children, initialPlan }: { children: ReactNode; initialPlan?: TimelinePlan | null }) {
  const [days, setDays] = useState<TimelineDayState[]>(() => {
    if (!initialPlan) return [];
    return initialPlan.days.map(day => ({
      ...day,
      events: day.events.map(event => ({
        ...event,
        destinationSlug: initialPlan.destinationSlug,
      })),
    }));
  });
  const [meta, setMeta] = useState<TimelineMetaState | null>(() =>
    initialPlan
      ? {
          tripId: initialPlan.tripId,
          destinationSlug: initialPlan.destinationSlug,
          startDate: initialPlan.startDate,
          endDate: initialPlan.endDate,
          preferences: initialPlan.preferences,
        }
      : null,
  );
  const [dirty, setDirty] = useState(false);

  const setPlan = useCallback((plan: TimelinePlan) => {
    setDays(
      plan.days.map(day => ({
        ...day,
        events: day.events.map(event => ({
          ...event,
          destinationSlug: plan.destinationSlug,
        })),
      })),
    );
    setMeta({
      tripId: plan.tripId,
      destinationSlug: plan.destinationSlug,
      startDate: plan.startDate,
      endDate: plan.endDate,
      preferences: plan.preferences,
    });
    setDirty(false);
  }, []);

  const updateEvent = useCallback((eventId: string, updates: Partial<TimelineEventState>) => {
    setDays(prevDays => {
      const nextDays = cloneDays(prevDays);
      let updated = false;
      nextDays.forEach(day => {
        day.events = day.events.map(event => {
          if (event.id !== eventId) return event;
          updated = true;
          const merged: TimelineEventState = {
            ...event,
            ...updates,
          };
          if (updates.startsAt && !updates.startsAt?.includes(day.date)) {
            const time = ensureTimeString(updates.startsAt);
            merged.startsAt = combineDateAndTime(day.date, time);
          }
          if (updates.endsAt && !updates.endsAt?.includes(day.date)) {
            const time = ensureTimeString(updates.endsAt);
            merged.endsAt = combineDateAndTime(day.date, time);
          }
          merged.dayIndex = day.index;
          return merged;
        });
        day.events = sortEvents(day.events);
      });
      if (updated) {
        setDirty(true);
      }
      return nextDays;
    });
  }, []);

  const moveEvent = useCallback((eventId: string, targetDayId: string, position?: number) => {
    setDays(prevDays => {
      const nextDays = cloneDays(prevDays);
      const sourceDay = nextDays.find(day => day.events.some(event => event.id === eventId));
      const targetDay = nextDays.find(day => day.id === targetDayId);
      if (!sourceDay || !targetDay) {
        return prevDays;
      }

      const eventIndex = sourceDay.events.findIndex(event => event.id === eventId);
      const [event] = sourceDay.events.splice(eventIndex, 1);
      if (!event) {
        return prevDays;
      }

      const time = ensureTimeString(event.startsAt);
      const newStart = combineDateAndTime(targetDay.date, time);
      const newEnd = event.endsAt ? combineDateAndTime(targetDay.date, ensureTimeString(event.endsAt)) : undefined;

      const updatedEvent: TimelineEventState = {
        ...event,
        startsAt: newStart,
        endsAt: newEnd,
        dayIndex: targetDay.index,
        destinationSlug: event.destinationSlug,
      };

      if (typeof position === 'number' && position >= 0 && position <= targetDay.events.length) {
        targetDay.events.splice(position, 0, updatedEvent);
      } else {
        targetDay.events.push(updatedEvent);
      }

      targetDay.events = sortEvents(targetDay.events);
      sourceDay.events = sortEvents(sourceDay.events);
      setDirty(true);
      return nextDays;
    });
  }, []);

  const removeEvent = useCallback((eventId: string) => {
    setDays(prevDays => {
      const nextDays = cloneDays(prevDays);
      let removed = false;
      nextDays.forEach(day => {
        const before = day.events.length;
        day.events = day.events.filter(event => event.id !== eventId);
        if (day.events.length !== before) {
          removed = true;
        }
      });
      if (removed) {
        setDirty(true);
      }
      return nextDays;
    });
  }, []);

  const addEvent = useCallback((dayId: string, event: TimelineEventState, position?: number) => {
    setDays(prevDays => {
      const nextDays = cloneDays(prevDays);
      const targetDay = nextDays.find(day => day.id === dayId);
      if (!targetDay) {
        return prevDays;
      }
      const newEvent: TimelineEventState = {
        ...event,
        dayIndex: targetDay.index,
        startsAt: event.startsAt ?? combineDateAndTime(targetDay.date, undefined),
        destinationSlug: event.destinationSlug,
      };
      if (typeof position === 'number' && position >= 0 && position <= targetDay.events.length) {
        targetDay.events.splice(position, 0, newEvent);
      } else {
        targetDay.events.push(newEvent);
      }
      targetDay.events = sortEvents(targetDay.events);
      setDirty(true);
      return nextDays;
    });
  }, []);

  const getPlan = useCallback((): TimelinePlan | null => {
    if (!meta) return null;
    return {
      tripId: meta.tripId,
      destinationSlug: meta.destinationSlug,
      startDate: meta.startDate,
      endDate: meta.endDate,
      days: days.map(day => ({
        ...day,
        events: day.events.map(({ destinationSlug: _unused, ...eventRest }) => ({
          ...eventRest,
        })),
      })),
      unplacedAttractions: [],
      preferences: meta.preferences ?? {
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
  }, [days, meta]);

  const markClean = useCallback(() => setDirty(false), []);

  const setDestinationSlug = useCallback((slug: string) => {
    setMeta(prev => (prev ? { ...prev, destinationSlug: slug } : prev));
    setDirty(true);
  }, []);

  const value = useMemo<TimelineContextValue>(() => ({
    days,
    destinationSlug: meta?.destinationSlug ?? '',
    dirty,
    setPlan,
    updateEvent,
    moveEvent,
    removeEvent,
    addEvent,
    getPlan,
    markClean,
    setDestinationSlug,
  }), [days, meta?.destinationSlug, dirty, setPlan, updateEvent, moveEvent, removeEvent, addEvent, getPlan, markClean, setDestinationSlug]);

  return <TimelineContext.Provider value={value}>{children}</TimelineContext.Provider>;
}

export function useTimeline() {
  const context = useContext(TimelineContext);
  if (!context) {
    throw new Error('useTimeline must be used within a TimelineProvider');
  }
  return context;
}
