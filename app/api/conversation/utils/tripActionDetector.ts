import type { ExtractedIntent } from '@/app/api/intent/schema';
import type { TripPlannerCommand } from '@/types/trip-intent';

const TRIP_KEYWORDS = [
  'plan my trip',
  'plan a trip',
  'trip plan',
  'trip',
  'itinerary',
  'weekend getaway',
  'city break',
  'vacation',
  'long weekend',
];

const DAY_TIME_KEYWORDS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
  'tonight',
  'tomorrow',
  'weekend',
  'this weekend',
  'next weekend',
  'friday night',
  'saturday night',
];

const SHOW_PLAN_KEYWORDS = [
  'show me my trip',
  'show my trip',
  'show the plan',
  'open my trip',
  'open my plan',
  'open my itinerary',
  'show my itinerary',
];

const SLOT_KEYWORDS: Array<{ label: string; variants: string[] }> = [
  { label: 'breakfast', variants: ['breakfast', 'morning'] },
  { label: 'brunch', variants: ['brunch'] },
  { label: 'lunch', variants: ['lunch', 'midday'] },
  { label: 'dinner', variants: ['dinner', 'evening', 'supper'] },
  { label: 'drinks', variants: ['drinks', 'nightcap', 'nightlife'] },
];

const DAY_OF_WEEK = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

interface DerivedDates {
  startDate: string | null;
  endDate: string | null;
  label: string | null;
}

function toISODate(date: Date) {
  return date.toISOString().split('T')[0];
}

function getUpcomingWeekend(offsetWeeks = 0) {
  const today = new Date();
  const day = today.getDay();
  const fridayOffset = (5 - day + 7) % 7;
  const start = new Date(today);
  start.setDate(start.getDate() + fridayOffset + offsetWeeks * 7);
  const end = new Date(start);
  end.setDate(start.getDate() + 2);
  return { startDate: toISODate(start), endDate: toISODate(end) };
}

function inferDatesFromMessage(lower: string): DerivedDates | null {
  if (lower.includes('this weekend')) {
    const weekend = getUpcomingWeekend();
    return { ...weekend, label: 'this weekend' };
  }

  if (lower.includes('next weekend')) {
    const weekend = getUpcomingWeekend(1);
    return { ...weekend, label: 'next weekend' };
  }

  if (lower.includes('tonight')) {
    const today = new Date();
    const iso = toISODate(today);
    return { startDate: iso, endDate: iso, label: 'tonight' };
  }

  if (lower.includes('tomorrow')) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const iso = toISODate(tomorrow);
    return { startDate: iso, endDate: iso, label: 'tomorrow' };
  }

  return null;
}

function deriveDates(intent: ExtractedIntent, lower: string): DerivedDates {
  const range = intent.temporalContext?.dateRange;
  if (range?.start || range?.end) {
    return {
      startDate: range?.start || null,
      endDate: range?.end || range?.start || null,
      label: null,
    };
  }

  if (intent.temporalContext?.specificDate) {
    return {
      startDate: intent.temporalContext.specificDate,
      endDate: intent.temporalContext.specificDate,
      label: null,
    };
  }

  const inferred = inferDatesFromMessage(lower);
  if (inferred) {
    return inferred;
  }

  return { startDate: null, endDate: null, label: null };
}

function extractSlot(lower: string) {
  const day = DAY_OF_WEEK.find((weekday) => lower.includes(weekday));
  const slot = SLOT_KEYWORDS.find((entry) => entry.variants.some((variant) => lower.includes(variant)))?.label;
  if (day && slot) return `${day} ${slot}`;
  return slot || day || null;
}

function extractItemName(message: string) {
  const match = message.match(/add\s+(.+?)\s+(?:to|for)/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  return null;
}

export function detectTripAction(intent: ExtractedIntent, message: string): TripPlannerCommand | null {
  const lower = message.toLowerCase();

  if (SHOW_PLAN_KEYWORDS.some((phrase) => lower.includes(phrase))) {
    return {
      action: 'openTripPage',
      rawText: message,
    };
  }

  const addIntent = lower.includes('add') && lower.includes('trip');
  if (addIntent) {
    return {
      action: 'addToTrip',
      city: intent.city || null,
      slot: extractSlot(lower),
      itemName: extractItemName(message),
      rawText: message,
    };
  }

  const mentionsTrip = intent.primaryIntent === 'plan' || TRIP_KEYWORDS.some((keyword) => lower.includes(keyword));
  const mentionsDayTime = DAY_TIME_KEYWORDS.some((keyword) => lower.includes(keyword));

  if (mentionsTrip || mentionsDayTime) {
    const derived = deriveDates(intent, lower);
    const cityOrTimeSignal = intent.city || mentionsDayTime || derived.startDate;
    if (cityOrTimeSignal) {
      return {
        action: 'openTripPlanner',
        city: intent.city || null,
        startDate: derived.startDate,
        endDate: derived.endDate,
        requiresDates: !(derived.startDate && derived.endDate),
        activityType: intent.category || null,
        timeDescriptor: derived.label || intent.temporalContext?.timeframe || null,
        rawText: message,
      };
    }
  }

  return null;
}
