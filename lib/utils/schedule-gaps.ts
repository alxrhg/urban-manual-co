/**
 * Schedule Gap Detection Utility
 * Analyzes itinerary items to find unscheduled time gaps
 */

export interface ScheduleItem {
  id: string;
  time?: string | null;
  endTime?: string | null;
  duration?: number; // in minutes
  title: string;
}

export interface ScheduleGap {
  afterItemId: string;
  afterItemTitle: string;
  beforeItemId: string;
  beforeItemTitle: string;
  startTime: string; // "HH:MM" format
  endTime: string;
  durationMinutes: number;
  orderIndex: number; // Position in the day's schedule
}

export interface GapAnalysis {
  gaps: ScheduleGap[];
  totalGapMinutes: number;
  hasSignificantGaps: boolean; // Gaps > 60 minutes
  scheduledMinutes: number;
  morningGap?: { startTime: string; endTime: string; durationMinutes: number };
  eveningGap?: { startTime: string; endTime: string; durationMinutes: number };
}

/**
 * Parse time string to minutes from midnight
 * Supports "HH:MM", "H:MM AM/PM", "HH:MM AM/PM"
 */
export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return -1;

  // Handle 24-hour format (HH:MM)
  if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  // Handle 12-hour format (H:MM AM/PM or HH:MM AM/PM)
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const period = match[3]?.toUpperCase();
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }

  return -1;
}

/**
 * Convert minutes from midnight to "HH:MM" format
 */
export function minutesToTimeString(minutes: number): string {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Format duration for display
 */
export function formatGapDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  if (remainingMins === 0) return `${hours}h`;
  return `${hours}h ${remainingMins}m`;
}

/**
 * Default duration for items without explicit duration (in minutes)
 */
const DEFAULT_ITEM_DURATION = 60;

/**
 * Minimum gap duration to consider significant (in minutes)
 */
const MIN_SIGNIFICANT_GAP = 30;

/**
 * Typical day boundaries
 */
const DAY_START_HOUR = 8; // 8:00 AM
const DAY_END_HOUR = 22; // 10:00 PM

/**
 * Analyze schedule gaps in a day's itinerary
 */
export function analyzeScheduleGaps(items: ScheduleItem[]): GapAnalysis {
  // Filter items with valid times and sort by time
  const timedItems = items
    .filter(item => item.time)
    .map(item => ({
      ...item,
      startMinutes: parseTimeToMinutes(item.time!),
      endMinutes: item.endTime
        ? parseTimeToMinutes(item.endTime)
        : parseTimeToMinutes(item.time!) + (item.duration || DEFAULT_ITEM_DURATION),
    }))
    .filter(item => item.startMinutes >= 0)
    .sort((a, b) => a.startMinutes - b.startMinutes);

  const gaps: ScheduleGap[] = [];
  let totalGapMinutes = 0;
  let scheduledMinutes = 0;
  let hasSignificantGaps = false;

  // Find gaps between consecutive items
  for (let i = 0; i < timedItems.length - 1; i++) {
    const current = timedItems[i];
    const next = timedItems[i + 1];

    const gapStart = current.endMinutes;
    const gapEnd = next.startMinutes;
    const gapDuration = gapEnd - gapStart;

    // Track scheduled time
    scheduledMinutes += current.endMinutes - current.startMinutes;

    // Only track gaps >= minimum threshold
    if (gapDuration >= MIN_SIGNIFICANT_GAP) {
      gaps.push({
        afterItemId: current.id,
        afterItemTitle: current.title,
        beforeItemId: next.id,
        beforeItemTitle: next.title,
        startTime: minutesToTimeString(gapStart),
        endTime: minutesToTimeString(gapEnd),
        durationMinutes: gapDuration,
        orderIndex: i,
      });

      totalGapMinutes += gapDuration;

      if (gapDuration >= 60) {
        hasSignificantGaps = true;
      }
    }
  }

  // Track last item's duration
  if (timedItems.length > 0) {
    const lastItem = timedItems[timedItems.length - 1];
    scheduledMinutes += lastItem.endMinutes - lastItem.startMinutes;
  }

  // Check for morning gap (before first activity)
  let morningGap: GapAnalysis['morningGap'];
  if (timedItems.length > 0) {
    const dayStartMinutes = DAY_START_HOUR * 60;
    const firstItemStart = timedItems[0].startMinutes;
    if (firstItemStart > dayStartMinutes + MIN_SIGNIFICANT_GAP) {
      morningGap = {
        startTime: minutesToTimeString(dayStartMinutes),
        endTime: minutesToTimeString(firstItemStart),
        durationMinutes: firstItemStart - dayStartMinutes,
      };
    }
  }

  // Check for evening gap (after last activity)
  let eveningGap: GapAnalysis['eveningGap'];
  if (timedItems.length > 0) {
    const dayEndMinutes = DAY_END_HOUR * 60;
    const lastItemEnd = timedItems[timedItems.length - 1].endMinutes;
    if (dayEndMinutes > lastItemEnd + MIN_SIGNIFICANT_GAP) {
      eveningGap = {
        startTime: minutesToTimeString(lastItemEnd),
        endTime: minutesToTimeString(dayEndMinutes),
        durationMinutes: dayEndMinutes - lastItemEnd,
      };
    }
  }

  return {
    gaps,
    totalGapMinutes,
    hasSignificantGaps,
    scheduledMinutes,
    morningGap,
    eveningGap,
  };
}

/**
 * Get gap suggestions based on gap duration and time of day
 */
export function getGapSuggestions(gap: ScheduleGap): string[] {
  const suggestions: string[] = [];
  const startHour = parseTimeToMinutes(gap.startTime) / 60;

  // Morning suggestions (before noon)
  if (startHour < 12) {
    if (gap.durationMinutes >= 60) {
      suggestions.push('Visit a nearby museum or gallery');
      suggestions.push('Explore a local market');
    }
    if (gap.durationMinutes >= 30) {
      suggestions.push('Coffee break at a local cafe');
      suggestions.push('Quick walking tour of the neighborhood');
    }
  }

  // Afternoon suggestions (12-17)
  if (startHour >= 12 && startHour < 17) {
    if (gap.durationMinutes >= 90) {
      suggestions.push('Lunch at a recommended restaurant');
      suggestions.push('Visit a local attraction');
    }
    if (gap.durationMinutes >= 45) {
      suggestions.push('Light lunch or snack');
      suggestions.push('Shopping in the area');
    }
  }

  // Evening suggestions (after 5pm)
  if (startHour >= 17) {
    if (gap.durationMinutes >= 120) {
      suggestions.push('Dinner at a local restaurant');
      suggestions.push('Evening show or entertainment');
    }
    if (gap.durationMinutes >= 60) {
      suggestions.push('Drinks at a rooftop bar');
      suggestions.push('Sunset viewing spot');
    }
    if (gap.durationMinutes >= 30) {
      suggestions.push('Aperitivo at a wine bar');
    }
  }

  // General suggestions for any time
  if (gap.durationMinutes >= 45 && gap.durationMinutes < 90) {
    suggestions.push('Take a scenic walk between locations');
  }

  return suggestions.slice(0, 3); // Return top 3 suggestions
}

/**
 * Check if a day has too many gaps or is over-scheduled
 */
export function analyzeDayBalance(analysis: GapAnalysis, itemCount: number): {
  status: 'balanced' | 'too_sparse' | 'too_packed' | 'no_schedule';
  message: string;
} {
  if (itemCount === 0) {
    return { status: 'no_schedule', message: 'No activities planned for this day' };
  }

  const totalDayMinutes = (DAY_END_HOUR - DAY_START_HOUR) * 60; // 14 hours
  const scheduledRatio = analysis.scheduledMinutes / totalDayMinutes;

  if (scheduledRatio < 0.2) {
    return { status: 'too_sparse', message: 'This day has plenty of free time for exploration' };
  }

  if (scheduledRatio > 0.8) {
    return { status: 'too_packed', message: 'This day is quite packed - consider leaving buffer time' };
  }

  if (analysis.hasSignificantGaps) {
    return { status: 'balanced', message: `${analysis.gaps.length} gap${analysis.gaps.length > 1 ? 's' : ''} available for additional activities` };
  }

  return { status: 'balanced', message: 'Well-balanced schedule for the day' };
}
