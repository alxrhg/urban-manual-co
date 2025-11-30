/**
 * Smart Scheduling for Trip Planning
 * Handles automatic time suggestions, travel time, and conflict detection
 */

import type { EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';
import type { EventType } from './eventTypes';
import { getDefaultDuration, inferEventType } from './eventTypes';

// Scheduling configuration
export interface SchedulingConfig {
  dayStartHour: number;       // Default 9:00 AM
  dayEndHour: number;         // Default 22:00 (10 PM)
  lunchWindowStart: number;   // 12:00
  lunchWindowEnd: number;     // 14:00
  dinnerWindowStart: number;  // 18:00
  dinnerWindowEnd: number;    // 21:00
  bufferMinutes: number;      // Buffer between events (default 15)
  snapIntervalMinutes: number; // Snap to 15 min intervals
}

export const DEFAULT_SCHEDULING_CONFIG: SchedulingConfig = {
  dayStartHour: 9,
  dayEndHour: 22,
  lunchWindowStart: 12,
  lunchWindowEnd: 14,
  dinnerWindowStart: 18,
  dinnerWindowEnd: 21,
  bufferMinutes: 15,
  snapIntervalMinutes: 15,
};

// Time slot representation
export interface TimeSlot {
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  durationMinutes: number;
}

// Scheduled event
export interface ScheduledEvent {
  item: EnrichedItineraryItem;
  slot: TimeSlot;
  type: EventType;
  travelTimeFromPrevious?: number;
  conflicts: string[]; // IDs of conflicting events
}

// Convert time to minutes since midnight
function timeToMinutes(hour: number, minute: number): number {
  return hour * 60 + minute;
}

// Convert minutes to time
function minutesToTime(totalMinutes: number): { hour: number; minute: number } {
  return {
    hour: Math.floor(totalMinutes / 60) % 24,
    minute: totalMinutes % 60,
  };
}

// Snap minutes to interval
function snapMinutes(minutes: number, interval: number): number {
  return Math.round(minutes / interval) * interval;
}

// Parse time string from item
export function parseItemTime(timeStr: string | null | undefined): TimeSlot | null {
  if (!timeStr) return null;

  // Match formats: "10:00 AM", "14:30", "2:30 PM"
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return null;

  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const meridiem = match[3]?.toUpperCase();

  if (meridiem === 'PM' && hour !== 12) hour += 12;
  if (meridiem === 'AM' && hour === 12) hour = 0;

  // Default duration of 60 minutes
  const durationMinutes = 60;
  const endMinutes = hour * 60 + minute + durationMinutes;
  const endTime = minutesToTime(endMinutes);

  return {
    startHour: hour,
    startMinute: minute,
    endHour: endTime.hour,
    endMinute: endTime.minute,
    durationMinutes,
  };
}

// Check if two time slots overlap
export function slotsOverlap(a: TimeSlot, b: TimeSlot): boolean {
  const aStart = timeToMinutes(a.startHour, a.startMinute);
  const aEnd = timeToMinutes(a.endHour, a.endMinute);
  const bStart = timeToMinutes(b.startHour, b.startMinute);
  const bEnd = timeToMinutes(b.endHour, b.endMinute);

  return aStart < bEnd && bStart < aEnd;
}

// Find conflicts between events
export function findConflicts(
  events: { id: string; slot: TimeSlot }[]
): Map<string, string[]> {
  const conflicts = new Map<string, string[]>();

  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      if (slotsOverlap(events[i].slot, events[j].slot)) {
        // Add conflict for event i
        const iConflicts = conflicts.get(events[i].id) || [];
        iConflicts.push(events[j].id);
        conflicts.set(events[i].id, iConflicts);

        // Add conflict for event j
        const jConflicts = conflicts.get(events[j].id) || [];
        jConflicts.push(events[i].id);
        conflicts.set(events[j].id, jConflicts);
      }
    }
  }

  return conflicts;
}

// Suggest optimal time for a new event
export function suggestTimeSlot(
  existingEvents: { slot: TimeSlot }[],
  eventType: EventType,
  durationMinutes?: number,
  config: SchedulingConfig = DEFAULT_SCHEDULING_CONFIG
): TimeSlot | null {
  const duration = durationMinutes || getDefaultDuration(eventType);

  // Get preferred time windows based on event type
  const preferredWindows = getPreferredTimeWindows(eventType, config);

  // Sort existing events by start time
  const sortedEvents = [...existingEvents].sort((a, b) => {
    return timeToMinutes(a.slot.startHour, a.slot.startMinute) -
           timeToMinutes(b.slot.startHour, b.slot.startMinute);
  });

  // Try preferred windows first
  for (const window of preferredWindows) {
    const slot = findSlotInWindow(
      sortedEvents,
      window.start,
      window.end,
      duration,
      config.bufferMinutes,
      config.snapIntervalMinutes
    );
    if (slot) return slot;
  }

  // Fall back to any available slot
  return findSlotInWindow(
    sortedEvents,
    config.dayStartHour * 60,
    config.dayEndHour * 60,
    duration,
    config.bufferMinutes,
    config.snapIntervalMinutes
  );
}

// Get preferred time windows for event type
function getPreferredTimeWindows(
  eventType: EventType,
  config: SchedulingConfig
): { start: number; end: number }[] {
  switch (eventType) {
    case 'meal':
      // Prefer lunch and dinner windows
      return [
        { start: config.lunchWindowStart * 60, end: config.lunchWindowEnd * 60 },
        { start: config.dinnerWindowStart * 60, end: config.dinnerWindowEnd * 60 },
      ];
    case 'flight':
    case 'transport':
      // Morning or evening
      return [
        { start: config.dayStartHour * 60, end: 12 * 60 },
        { start: 16 * 60, end: config.dayEndHour * 60 },
      ];
    case 'activity':
      // Midday
      return [
        { start: 10 * 60, end: 17 * 60 },
      ];
    case 'hotel':
      // Evening
      return [
        { start: 18 * 60, end: 23 * 60 },
      ];
    default:
      return [
        { start: config.dayStartHour * 60, end: config.dayEndHour * 60 },
      ];
  }
}

// Find available slot within a time window
function findSlotInWindow(
  events: { slot: TimeSlot }[],
  windowStartMinutes: number,
  windowEndMinutes: number,
  durationMinutes: number,
  bufferMinutes: number,
  snapInterval: number
): TimeSlot | null {
  let candidateStart = snapMinutes(windowStartMinutes, snapInterval);

  for (const event of events) {
    const eventStart = timeToMinutes(event.slot.startHour, event.slot.startMinute);
    const eventEnd = timeToMinutes(event.slot.endHour, event.slot.endMinute);

    const candidateEnd = candidateStart + durationMinutes;

    // Check if we can fit before this event
    if (candidateEnd + bufferMinutes <= eventStart && candidateEnd <= windowEndMinutes) {
      const start = minutesToTime(candidateStart);
      const end = minutesToTime(candidateEnd);
      return {
        startHour: start.hour,
        startMinute: start.minute,
        endHour: end.hour,
        endMinute: end.minute,
        durationMinutes,
      };
    }

    // Move candidate to after this event
    if (candidateStart < eventEnd + bufferMinutes) {
      candidateStart = snapMinutes(eventEnd + bufferMinutes, snapInterval);
    }
  }

  // Try after all events
  const candidateEnd = candidateStart + durationMinutes;
  if (candidateEnd <= windowEndMinutes) {
    const start = minutesToTime(candidateStart);
    const end = minutesToTime(candidateEnd);
    return {
      startHour: start.hour,
      startMinute: start.minute,
      endHour: end.hour,
      endMinute: end.minute,
      durationMinutes,
    };
  }

  return null;
}

// Estimate travel time between two locations
export async function estimateTravelTime(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): Promise<number> {
  // Haversine distance calculation
  const R = 6371; // Earth's radius in km
  const dLat = toRad(toLat - fromLat);
  const dLng = toRad(toLng - fromLng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(fromLat)) * Math.cos(toRad(toLat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = R * c;

  // Rough estimate: 30 km/h average in city, 60 km/h for longer distances
  const speedKmH = distanceKm < 10 ? 30 : 60;
  const timeHours = distanceKm / speedKmH;
  const timeMinutes = Math.ceil(timeHours * 60);

  // Minimum 5 minutes, maximum 180 minutes
  return Math.max(5, Math.min(180, timeMinutes));
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Auto-schedule a list of items optimally
export function autoScheduleDay(
  items: EnrichedItineraryItem[],
  config: SchedulingConfig = DEFAULT_SCHEDULING_CONFIG
): ScheduledEvent[] {
  const scheduled: ScheduledEvent[] = [];
  const usedSlots: { slot: TimeSlot }[] = [];

  // Separate items by type for priority scheduling
  const flights = items.filter(i => inferEventType(i) === 'flight');
  const hotels = items.filter(i => inferEventType(i) === 'hotel');
  const meals = items.filter(i => inferEventType(i) === 'meal');
  const activities = items.filter(i => inferEventType(i) === 'activity');
  const transport = items.filter(i => inferEventType(i) === 'transport');

  // Schedule in priority order: flights, hotels, meals, transport, activities
  const orderedItems = [...flights, ...hotels, ...meals, ...transport, ...activities];

  for (const item of orderedItems) {
    const type = inferEventType(item);
    const duration = item.parsedNotes?.durationMinutes || getDefaultDuration(type);

    // Check if item already has a time
    const existingSlot = parseItemTime(item.time);
    if (existingSlot) {
      existingSlot.durationMinutes = duration;
      existingSlot.endHour = minutesToTime(
        timeToMinutes(existingSlot.startHour, existingSlot.startMinute) + duration
      ).hour;
      existingSlot.endMinute = minutesToTime(
        timeToMinutes(existingSlot.startHour, existingSlot.startMinute) + duration
      ).minute;

      scheduled.push({ item, slot: existingSlot, type, conflicts: [] });
      usedSlots.push({ slot: existingSlot });
      continue;
    }

    // Suggest a new slot
    const suggestedSlot = suggestTimeSlot(usedSlots, type, duration, config);
    if (suggestedSlot) {
      scheduled.push({ item, slot: suggestedSlot, type, conflicts: [] });
      usedSlots.push({ slot: suggestedSlot });
    }
  }

  // Find and mark conflicts
  const conflictMap = findConflicts(
    scheduled.map(e => ({ id: e.item.id, slot: e.slot }))
  );

  for (const event of scheduled) {
    event.conflicts = conflictMap.get(event.item.id) || [];
  }

  // Sort by start time
  scheduled.sort((a, b) => {
    return timeToMinutes(a.slot.startHour, a.slot.startMinute) -
           timeToMinutes(b.slot.startHour, b.slot.startMinute);
  });

  return scheduled;
}

// Format time slot for display
export function formatTimeSlot(slot: TimeSlot): string {
  const formatTime = (hour: number, minute: number) => {
    const h = hour % 12 || 12;
    const m = minute.toString().padStart(2, '0');
    const ampm = hour < 12 ? 'AM' : 'PM';
    return `${h}:${m} ${ampm}`;
  };

  return `${formatTime(slot.startHour, slot.startMinute)} – ${formatTime(slot.endHour, slot.endMinute)}`;
}

// Create time string from slot
export function slotToTimeString(slot: TimeSlot): string {
  const h = slot.startHour % 12 || 12;
  const m = slot.startMinute.toString().padStart(2, '0');
  const ampm = slot.startHour < 12 ? 'AM' : 'PM';
  return `${h}:${m} ${ampm}`;
}
