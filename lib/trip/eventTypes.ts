/**
 * Event Types for Trip Planning
 * Defines event categories, default durations, colors, and helper functions
 */

import type { EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';

// Core event types
export type EventType = 'flight' | 'meal' | 'activity' | 'transport' | 'hotel';

// Event type configuration
export interface EventTypeConfig {
  type: EventType;
  label: string;
  labelPlural: string;
  defaultDurationMinutes: number;
  icon: string; // Lucide icon name
  colors: {
    bg: string;
    bgDark: string;
    border: string;
    borderDark: string;
    text: string;
    textDark: string;
    icon: string;
  };
}

// Complete event type configurations
export const EVENT_TYPE_CONFIGS: Record<EventType, EventTypeConfig> = {
  flight: {
    type: 'flight',
    label: 'Flight',
    labelPlural: 'Flights',
    defaultDurationMinutes: 120,
    icon: 'Plane',
    colors: {
      bg: 'bg-blue-50',
      bgDark: 'dark:bg-blue-900/20',
      border: 'border-blue-200',
      borderDark: 'dark:border-blue-800',
      text: 'text-blue-700',
      textDark: 'dark:text-blue-300',
      icon: 'text-blue-500',
    },
  },
  meal: {
    type: 'meal',
    label: 'Meal',
    labelPlural: 'Meals',
    defaultDurationMinutes: 60,
    icon: 'Utensils',
    colors: {
      bg: 'bg-orange-50',
      bgDark: 'dark:bg-orange-900/20',
      border: 'border-orange-200',
      borderDark: 'dark:border-orange-800',
      text: 'text-orange-700',
      textDark: 'dark:text-orange-300',
      icon: 'text-orange-500',
    },
  },
  activity: {
    type: 'activity',
    label: 'Activity',
    labelPlural: 'Activities',
    defaultDurationMinutes: 90,
    icon: 'Camera',
    colors: {
      bg: 'bg-green-50',
      bgDark: 'dark:bg-green-900/20',
      border: 'border-green-200',
      borderDark: 'dark:border-green-800',
      text: 'text-green-700',
      textDark: 'dark:text-green-300',
      icon: 'text-green-500',
    },
  },
  transport: {
    type: 'transport',
    label: 'Transport',
    labelPlural: 'Transport',
    defaultDurationMinutes: 30,
    icon: 'Car',
    colors: {
      bg: 'bg-gray-50',
      bgDark: 'dark:bg-gray-800/50',
      border: 'border-gray-200',
      borderDark: 'dark:border-gray-700',
      text: 'text-gray-700',
      textDark: 'dark:text-gray-300',
      icon: 'text-gray-500',
    },
  },
  hotel: {
    type: 'hotel',
    label: 'Hotel',
    labelPlural: 'Hotels',
    defaultDurationMinutes: 480, // 8 hours overnight
    icon: 'Moon',
    colors: {
      bg: 'bg-gray-100',
      bgDark: 'dark:bg-gray-800',
      border: 'border-gray-300',
      borderDark: 'dark:border-gray-700',
      text: 'text-gray-800',
      textDark: 'dark:text-gray-200',
      icon: 'text-gray-600',
    },
  },
};

// Get config for an event type
export function getEventTypeConfig(type: EventType): EventTypeConfig {
  return EVENT_TYPE_CONFIGS[type];
}

// Get default duration for an event type
export function getDefaultDuration(type: EventType): number {
  return EVENT_TYPE_CONFIGS[type].defaultDurationMinutes;
}

// Get all event types
export function getAllEventTypes(): EventType[] {
  return Object.keys(EVENT_TYPE_CONFIGS) as EventType[];
}

// Infer event type from destination category or title
export function inferEventType(item: EnrichedItineraryItem): EventType {
  // Check explicit type in notes first
  const explicitType = item.parsedNotes?.type as EventType | undefined;
  if (explicitType && EVENT_TYPE_CONFIGS[explicitType]) {
    return explicitType;
  }

  const category = (item.destination?.category || '').toLowerCase();
  const title = (item.title || '').toLowerCase();
  const name = (item.destination?.name || '').toLowerCase();

  // Hotel detection
  if (
    category.includes('hotel') ||
    category.includes('lodging') ||
    category.includes('accommodation') ||
    category.includes('hostel') ||
    category.includes('resort') ||
    title.includes('hotel') ||
    title.includes('stay')
  ) {
    return 'hotel';
  }

  // Flight detection
  if (
    category.includes('airport') ||
    title.includes('flight') ||
    title.includes('fly') ||
    name.includes('airport')
  ) {
    return 'flight';
  }

  // Transport detection
  if (
    category.includes('transit') ||
    category.includes('station') ||
    category.includes('train') ||
    category.includes('bus') ||
    title.includes('transfer') ||
    title.includes('taxi') ||
    title.includes('uber') ||
    title.includes('drive')
  ) {
    return 'transport';
  }

  // Meal detection
  if (
    category.includes('restaurant') ||
    category.includes('cafe') ||
    category.includes('coffee') ||
    category.includes('food') ||
    category.includes('bakery') ||
    category.includes('bar') ||
    category.includes('pub') ||
    title.includes('lunch') ||
    title.includes('dinner') ||
    title.includes('breakfast') ||
    title.includes('brunch')
  ) {
    return 'meal';
  }

  // Default to activity
  return 'activity';
}

// Get CSS classes for event type colors
export function getEventTypeClasses(type: EventType): string {
  const config = EVENT_TYPE_CONFIGS[type];
  return [
    config.colors.bg,
    config.colors.bgDark,
    config.colors.border,
    config.colors.borderDark,
  ].join(' ');
}

// Get text color classes
export function getEventTypeTextClasses(type: EventType): string {
  const config = EVENT_TYPE_CONFIGS[type];
  return `${config.colors.text} ${config.colors.textDark}`;
}

// Get icon color class
export function getEventTypeIconClass(type: EventType): string {
  return EVENT_TYPE_CONFIGS[type].colors.icon;
}

// Parse time string to hours and minutes
export function parseTimeString(timeStr: string): { hours: number; minutes: number } | null {
  // Handle formats: "10:00 AM", "14:30", "2:30 PM"
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3]?.toUpperCase();

  if (meridiem === 'PM' && hours !== 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;

  return { hours, minutes };
}

// Format minutes to readable duration
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${mins}m`;
}

// Calculate end time from start and duration
export function calculateEndTime(startHours: number, startMinutes: number, durationMinutes: number): { hours: number; minutes: number } {
  const totalMinutes = startHours * 60 + startMinutes + durationMinutes;
  return {
    hours: Math.floor(totalMinutes / 60) % 24,
    minutes: totalMinutes % 60,
  };
}

// Snap time to interval (e.g., 15 minutes)
export function snapToInterval(minutes: number, interval: number = 15): number {
  return Math.round(minutes / interval) * interval;
}

// Time slot type for scheduling
export interface TimeSlot {
  startHours: number;
  startMinutes: number;
  endHours: number;
  endMinutes: number;
}

// Check if two time slots overlap
export function timeSlotsOverlap(a: TimeSlot, b: TimeSlot): boolean {
  const aStart = a.startHours * 60 + a.startMinutes;
  const aEnd = a.endHours * 60 + a.endMinutes;
  const bStart = b.startHours * 60 + b.startMinutes;
  const bEnd = b.endHours * 60 + b.endMinutes;

  return aStart < bEnd && bStart < aEnd;
}

// Find next available time slot
export function findNextAvailableSlot(
  occupiedSlots: TimeSlot[],
  durationMinutes: number,
  preferredStartHour: number = 9,
  maxEndHour: number = 22
): TimeSlot | null {
  // Sort slots by start time
  const sorted = [...occupiedSlots].sort((a, b) => {
    const aStart = a.startHours * 60 + a.startMinutes;
    const bStart = b.startHours * 60 + b.startMinutes;
    return aStart - bStart;
  });

  // Try preferred start time first
  let candidateStart = preferredStartHour * 60;

  for (const slot of sorted) {
    const slotStart = slot.startHours * 60 + slot.startMinutes;
    const slotEnd = slot.endHours * 60 + slot.endMinutes;
    const candidateEnd = candidateStart + durationMinutes;

    // Check if we can fit before this slot
    if (candidateEnd <= slotStart && candidateEnd <= maxEndHour * 60) {
      return {
        startHours: Math.floor(candidateStart / 60),
        startMinutes: candidateStart % 60,
        endHours: Math.floor(candidateEnd / 60),
        endMinutes: candidateEnd % 60,
      };
    }

    // Move candidate to after this slot
    if (candidateStart < slotEnd) {
      candidateStart = slotEnd;
    }
  }

  // Try after all slots
  const candidateEnd = candidateStart + durationMinutes;
  if (candidateEnd <= maxEndHour * 60) {
    return {
      startHours: Math.floor(candidateStart / 60),
      startMinutes: candidateStart % 60,
      endHours: Math.floor(candidateEnd / 60),
      endMinutes: candidateEnd % 60,
    };
  }

  return null; // No available slot
}
