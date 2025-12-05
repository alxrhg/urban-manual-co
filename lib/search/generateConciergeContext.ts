/**
 * Concierge Context Generator
 *
 * Philosophy:
 * - Concierge, not chatbot
 * - Speaks when useful, silent when not
 * - Professional warmth, not bubbly personality
 * - Short. Useful. Professional.
 */

import { extractLocation as extractLocationAsync } from './extractLocation';

export interface ConciergeInput {
  query: string;
  results: any[];
  filters?: {
    openNow?: boolean;
    priceMax?: number;
    priceMin?: number;
  };
  userContext?: {
    upcomingTrip?: {
      destination: string;
      daysUntil: number;
      tripDays?: string[]; // Days of week in trip
    };
    preferences?: {
      preferOutdoor?: boolean;
      preferQuiet?: boolean;
      favoriteCuisines?: string[];
    };
    recentSearch?: string;
  };
}

export interface ConciergeOutput {
  // Context note (above results) - only when relevant
  contextNote: string | null;

  // Primary message (replaces verbose responses)
  message: string;

  // Clarification needed (ambiguous query)
  needsClarification: boolean;
  clarificationQuestion: string | null;
  clarificationOptions: string[];

  // Soft suggestions (after results)
  suggestions: string[];

  // Warnings/notes (important caveats)
  warnings: string[];

  // Personalization transparency
  personalizationNote: string | null;
}

/**
 * Generate concierge-style context for search results
 * Returns short, useful, professional messages
 */
export async function generateConciergeContext(input: ConciergeInput): Promise<ConciergeOutput> {
  const { query, results, filters, userContext } = input;
  const count = results.length;

  const output: ConciergeOutput = {
    contextNote: null,
    message: '',
    needsClarification: false,
    clarificationQuestion: null,
    clarificationOptions: [],
    suggestions: [],
    warnings: [],
    personalizationNote: null,
  };

  // 1. Trip context awareness
  if (userContext?.upcomingTrip) {
    const { destination, daysUntil } = userContext.upcomingTrip;
    const queryLower = query.toLowerCase();
    const destLower = destination.toLowerCase();

    if (queryLower.includes(destLower) || destLower.includes(queryLower.split(' ')[0])) {
      if (daysUntil === 0) {
        output.contextNote = `You're heading to ${destination} today.`;
      } else if (daysUntil === 1) {
        output.contextNote = `You're heading to ${destination} tomorrow.`;
      } else if (daysUntil > 0 && daysUntil <= 14) {
        output.contextNote = `You're heading to ${destination} in ${daysUntil} days.`;
      }
    }
  }

  // 2. Check for ambiguous queries needing clarification
  const ambiguity = detectAmbiguity(query);
  if (ambiguity && count > 8) {
    output.needsClarification = true;
    output.clarificationQuestion = ambiguity.question;
    output.clarificationOptions = ambiguity.options;
  }

  // 3. Generate primary message (short and professional)
  output.message = generatePrimaryMessage(query, results, count, filters);

  // 4. Generate relevant suggestions
  output.suggestions = await generateRelevantSuggestions(query, results, count);

  // 5. Check for warnings (closed days, reservations, etc.)
  output.warnings = generateWarnings(results, userContext?.upcomingTrip?.tripDays);

  // 6. Personalization transparency
  if (userContext?.preferences?.preferOutdoor) {
    const outdoorCount = results.filter((r: any) =>
      r.vibe_tags?.some((t: string) => t?.toLowerCase().includes('outdoor') || t?.toLowerCase().includes('terrace'))
    ).length;

    if (outdoorCount > 0) {
      output.personalizationNote = 'Showing outdoor seating first — you usually prefer that.';
    }
  }

  return output;
}

interface AmbiguityDetection {
  question: string;
  options: string[];
}

/**
 * Detect if query is ambiguous and needs clarification
 */
function detectAmbiguity(query: string): AmbiguityDetection | null {
  const queryLower = query.toLowerCase();

  // "Special" without context
  if (queryLower.includes('special') && !queryLower.includes('celebration') && !queryLower.includes('romantic')) {
    return {
      question: 'Special how?',
      options: ['celebration', 'romantic', 'solo treat', 'business'],
    };
  }

  // "Nice" without context
  if (queryLower.includes('nice') && queryLower.split(' ').length <= 3) {
    return {
      question: 'Nice meaning?',
      options: ['upscale', 'relaxed', 'views', 'quiet'],
    };
  }

  // "Good" without specifics
  if (queryLower.startsWith('good ') && !queryLower.includes('for')) {
    return {
      question: 'Good for what?',
      options: ['groups', 'dates', 'solo', 'working'],
    };
  }

  // Just a category without modifiers
  const bareCategories = ['restaurant', 'restaurants', 'dinner', 'lunch', 'breakfast', 'coffee', 'drinks'];
  const words = queryLower.split(' ').filter(w => w.length > 2);
  if (words.length === 1 && bareCategories.includes(words[0])) {
    return {
      question: 'Any preferences?',
      options: ['quiet', 'lively', 'outdoor', 'romantic'],
    };
  }

  return null;
}

/**
 * Generate short, professional primary message
 */
function generatePrimaryMessage(query: string, results: any[], count: number, filters?: ConciergeInput['filters']): string {
  // Zero results
  if (count === 0) {
    return 'Nothing matches that yet.';
  }

  // Single result
  if (count === 1) {
    const place = results[0];
    if (place?.michelin_stars && place.michelin_stars > 0) {
      return `One place. ${place.michelin_stars} Michelin star${place.michelin_stars > 1 ? 's' : ''}.`;
    }
    return 'One place fits.';
  }

  // Few results (2-4)
  if (count <= 4) {
    return `${count} places.`;
  }

  // Moderate results (5-12)
  if (count <= 12) {
    const michelin = results.filter((r: any) => r.michelin_stars && r.michelin_stars > 0).length;
    if (michelin > 0) {
      return `${count} places. ${michelin} Michelin-starred.`;
    }
    return `${count} places.`;
  }

  // Many results
  const michelin = results.filter((r: any) => r.michelin_stars && r.michelin_stars > 0).length;
  if (michelin >= 3) {
    return `${count} places. ${michelin} Michelin-recognized.`;
  }

  return `${count} places.`;
}

/**
 * Generate relevant suggestions based on results and query
 */
async function generateRelevantSuggestions(query: string, results: any[], count: number): Promise<string[]> {
  if (count === 0 || count <= 3) return [];

  const suggestions: string[] = [];
  const queryLower = query.toLowerCase();

  // Suggest narrowing by vibe if many results
  if (count > 10 && !queryLower.includes('quiet')) {
    suggestions.push('quiet');
  }

  // Check if results have outdoor options
  const hasOutdoor = results.some((r: any) =>
    r.vibe_tags?.some((t: string) => t?.toLowerCase().includes('outdoor') || t?.toLowerCase().includes('terrace'))
  );
  if (hasOutdoor && !queryLower.includes('outdoor') && !queryLower.includes('terrace')) {
    suggestions.push('outdoor seating');
  }

  // Check for late-night options
  const hasLateNight = results.some((r: any) =>
    r.vibe_tags?.some((t: string) => t?.toLowerCase().includes('late') || t?.toLowerCase().includes('night'))
  );
  if (hasLateNight && !queryLower.includes('late')) {
    suggestions.push('open late');
  }

  // Check for price variety
  const priceSet = new Set(results.slice(0, 20).map((r: any) => r.price_level).filter(Boolean));
  if (priceSet.size >= 3) {
    if (!queryLower.includes('budget') && !queryLower.includes('cheap')) {
      suggestions.push('budget-friendly');
    }
    if (!queryLower.includes('upscale') && !queryLower.includes('fine')) {
      suggestions.push('upscale');
    }
  }

  // Limit to 4 suggestions
  return suggestions.slice(0, 4);
}

/**
 * Generate warnings based on results and trip context
 */
function generateWarnings(results: any[], tripDays?: string[]): string[] {
  const warnings: string[] = [];

  // Check for Monday closures if trip includes Monday
  if (tripDays?.some(d => d.toLowerCase() === 'monday')) {
    const mondayClosed = results.filter((r: any) =>
      r.closed_days?.includes('Monday') || r.opening_hours?.monday === 'Closed'
    ).length;

    if (mondayClosed > results.length * 0.3) {
      warnings.push('Most are closed Mondays — your trip includes one.');
    }
  }

  // Check for reservation-heavy results
  const needsReservation = results.filter((r: any) =>
    r.reservation_required === true || r.booking_required === true
  ).length;

  if (needsReservation > results.length * 0.5) {
    warnings.push('Most require reservations.');
  }

  return warnings;
}

/**
 * Generate card-level annotations for a destination
 */
export function generateCardAnnotations(
  destination: any,
  context?: {
    isInTrip?: boolean;
    tripDate?: string;
    matchesPreference?: string;
  }
): string[] {
  const annotations: string[] = [];

  // In trip annotation
  if (context?.isInTrip && context?.tripDate) {
    annotations.push(`In your trip · ${context.tripDate}`);
  }

  // Reservation notice
  if (destination.reservation_required || destination.booking_required) {
    const bookingWindow = destination.booking_window || '2 weeks';
    annotations.push(`Reservations needed · ${bookingWindow} ahead`);
  }

  // Preference match
  if (context?.matchesPreference) {
    annotations.push(`${context.matchesPreference} · your preference`);
  }

  // Michelin stars
  if (destination.michelin_stars && destination.michelin_stars > 0) {
    annotations.push(`${destination.michelin_stars} Michelin star${destination.michelin_stars > 1 ? 's' : ''}`);
  }

  return annotations;
}
