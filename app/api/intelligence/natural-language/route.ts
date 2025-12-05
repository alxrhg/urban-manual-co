import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, createValidationError } from '@/lib/errors';
import { createServerClient } from '@/lib/supabase/server';

// Action types for trip modifications
type ActionType = 'add_place' | 'suggest' | 'modify' | 'move' | 'find_nearby';

interface ParsedIntent {
  action: ActionType;
  category?: string;
  neighborhood?: string;
  dayNumber?: number;
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
  attributes?: string[];
  // For modify/move actions
  targetItem?: string;
  newTime?: string;
  // For compound actions
  relativeContext?: 'after' | 'before' | 'nearby';
}

interface ParsedCommand {
  intents: ParsedIntent[];
  isCompound: boolean;
  rawQuery: string;
}

// Parse time from natural language (e.g., "8pm", "20:00", "8:30pm")
function parseTime(text: string): string | null {
  // Match patterns like "8pm", "8:30pm", "8 pm", "20:00"
  const timePatterns = [
    /(\d{1,2}):(\d{2})\s*(am|pm)/i,  // 8:30pm
    /(\d{1,2})\s*(am|pm)/i,          // 8pm
    /(\d{1,2}):(\d{2})/,             // 20:00 (24h)
  ];

  for (const pattern of timePatterns) {
    const match = text.match(pattern);
    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = match[2] && !match[3] ? parseInt(match[2], 10) : (match[2] ? parseInt(match[2], 10) : 0);
      const meridiem = match[3] || match[2];

      // Handle 12-hour format
      if (typeof meridiem === 'string' && (meridiem.toLowerCase() === 'pm' || meridiem.toLowerCase() === 'am')) {
        if (meridiem.toLowerCase() === 'pm' && hours !== 12) {
          hours += 12;
        } else if (meridiem.toLowerCase() === 'am' && hours === 12) {
          hours = 0;
        }
      }

      // Format as HH:MM
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
  }

  return null;
}

// Detect if the query contains compound commands (multiple actions)
function splitCompoundQuery(query: string): string[] {
  const lowerQuery = query.toLowerCase();

  // Split patterns for compound commands
  const splitPatterns = [
    /\s+and\s+(?:also\s+)?(?:then\s+)?/i,        // "and", "and also", "and then"
    /\s+then\s+/i,                                // "then"
    /\s*,\s+(?:and\s+)?(?:then\s+)?/i,           // ", and", ", then"
    /\s+(?:after\s+that|afterwards)\s+/i,        // "after that", "afterwards"
  ];

  for (const pattern of splitPatterns) {
    if (pattern.test(lowerQuery)) {
      return query.split(pattern).map(s => s.trim()).filter(s => s.length > 0);
    }
  }

  return [query];
}

// Parse a single intent from a query segment
function parseSingleIntent(query: string, tripDays: number, previousIntent?: ParsedIntent): ParsedIntent {
  const lowerQuery = query.toLowerCase();
  const intent: ParsedIntent = { action: 'suggest' };

  // Detect action type
  if (lowerQuery.includes('move') || lowerQuery.includes('change') || lowerQuery.includes('reschedule')) {
    intent.action = 'move';
  } else if (lowerQuery.includes('find') && (lowerQuery.includes('nearby') || lowerQuery.includes('near'))) {
    intent.action = 'find_nearby';
  } else if (lowerQuery.includes('add') || lowerQuery.includes('find') || lowerQuery.includes('book') || lowerQuery.includes('get')) {
    intent.action = 'add_place';
  } else if (lowerQuery.includes('modify') || lowerQuery.includes('update') || lowerQuery.includes('edit')) {
    intent.action = 'modify';
  }

  // Detect target item for move/modify actions
  const targetPatterns: Record<string, string[]> = {
    dinner: ['dinner', 'dinner reservation', 'evening meal'],
    lunch: ['lunch', 'midday meal'],
    breakfast: ['breakfast', 'morning meal'],
    museum: ['museum', 'museum visit'],
    hotel: ['hotel', 'check-in', 'checkout'],
  };

  for (const [target, patterns] of Object.entries(targetPatterns)) {
    if (patterns.some(p => lowerQuery.includes(p))) {
      intent.targetItem = target;
      break;
    }
  }

  // Parse time for move actions
  const parsedTime = parseTime(query);
  if (parsedTime) {
    intent.newTime = parsedTime;
  }

  // Detect relative context (after, before, nearby)
  if (lowerQuery.includes('after') || lowerQuery.includes('afterwards') || lowerQuery.includes('for after')) {
    intent.relativeContext = 'after';
  } else if (lowerQuery.includes('before') || lowerQuery.includes('beforehand')) {
    intent.relativeContext = 'before';
  } else if (lowerQuery.includes('nearby') || lowerQuery.includes('near')) {
    intent.relativeContext = 'nearby';
  }

  // Detect category
  const categoryPatterns: Record<string, string[]> = {
    restaurant: ['restaurant', 'dinner', 'lunch', 'dining', 'eat'],
    cafe: ['cafe', 'coffee', 'breakfast', 'brunch'],
    bar: ['bar', 'cocktail', 'drink', 'nightlife', 'rooftop', 'drinks'],
    museum: ['museum', 'art', 'gallery', 'exhibition'],
    landmark: ['landmark', 'monument', 'sight', 'attraction'],
    hotel: ['hotel', 'stay', 'accommodation', 'lodging'],
  };

  for (const [category, patterns] of Object.entries(categoryPatterns)) {
    if (patterns.some(p => lowerQuery.includes(p))) {
      // For move actions, don't set category from target
      if (intent.action !== 'move' || intent.targetItem !== category) {
        intent.category = category;
      }
      break;
    }
  }

  // Detect day number
  const dayMatch = lowerQuery.match(/day\s*(\d+)/i);
  if (dayMatch) {
    const day = parseInt(dayMatch[1], 10);
    if (day >= 1 && day <= tripDays) {
      intent.dayNumber = day;
    }
  }

  // Detect time of day
  if (lowerQuery.includes('breakfast') || lowerQuery.includes('morning')) {
    intent.timeOfDay = 'morning';
  } else if (lowerQuery.includes('lunch') || lowerQuery.includes('afternoon')) {
    intent.timeOfDay = 'afternoon';
  } else if (lowerQuery.includes('dinner') || lowerQuery.includes('evening')) {
    intent.timeOfDay = 'evening';
  } else if (lowerQuery.includes('night') || lowerQuery.includes('late')) {
    intent.timeOfDay = 'night';
  }

  // Inherit context from previous intent if this is a follow-up
  if (previousIntent && intent.relativeContext) {
    if (!intent.dayNumber && previousIntent.dayNumber) {
      intent.dayNumber = previousIntent.dayNumber;
    }
    // If "after dinner", set time based on dinner time
    if (intent.relativeContext === 'after' && previousIntent.newTime) {
      const [hours] = previousIntent.newTime.split(':').map(Number);
      intent.timeOfDay = hours >= 20 ? 'night' : 'evening';
    }
  }

  // Detect attributes
  const attributes: string[] = [];
  if (lowerQuery.includes('quiet')) attributes.push('quiet');
  if (lowerQuery.includes('view')) attributes.push('scenic');
  if (lowerQuery.includes('romantic')) attributes.push('romantic');
  if (lowerQuery.includes('cheap') || lowerQuery.includes('budget')) attributes.push('budget');
  if (lowerQuery.includes('fancy') || lowerQuery.includes('upscale')) attributes.push('upscale');
  if (lowerQuery.includes('rooftop')) attributes.push('rooftop');
  if (lowerQuery.includes('near')) {
    const nearMatch = lowerQuery.match(/near\s+(?:the\s+)?([a-z\s]+?)(?:\s+for|\s+on|\s*$)/i);
    if (nearMatch) {
      intent.neighborhood = nearMatch[1].trim();
    }
  }
  intent.attributes = attributes;

  return intent;
}

// Parse compound commands into multiple intents
function parseCompoundCommand(query: string, tripDays: number): ParsedCommand {
  const segments = splitCompoundQuery(query);

  const intents: ParsedIntent[] = [];
  let previousIntent: ParsedIntent | undefined;

  for (const segment of segments) {
    const intent = parseSingleIntent(segment, tripDays, previousIntent);
    intents.push(intent);
    previousIntent = intent;
  }

  return {
    intents,
    isCompound: intents.length > 1,
    rawQuery: query,
  };
}

// Map time of day to suggested time
function getTimeForTimeOfDay(timeOfDay?: string): string {
  switch (timeOfDay) {
    case 'morning': return '09:00';
    case 'afternoon': return '14:00';
    case 'evening': return '19:00';
    case 'night': return '21:00';
    default: return '12:00';
  }
}

// Calculate suggested time after a given time
function getTimeAfter(baseTime: string, offsetMinutes: number = 90): string {
  const [hours, minutes] = baseTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + offsetMinutes;
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMinutes = totalMinutes % 60;
  return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
}

interface ActionResult {
  action: ActionType;
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
}

// Process a single intent and return the result
async function processIntent(
  intent: ParsedIntent,
  city: string,
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  previousResult?: ActionResult
): Promise<ActionResult> {
  // Handle move/modify actions
  if (intent.action === 'move') {
    return {
      action: 'move',
      success: true,
      message: intent.newTime
        ? `Move ${intent.targetItem || 'item'} to ${intent.newTime}`
        : `Reschedule ${intent.targetItem || 'item'}`,
      data: {
        targetItem: intent.targetItem,
        newTime: intent.newTime,
        dayNumber: intent.dayNumber,
      },
    };
  }

  // Handle find_nearby or add_place actions
  if (intent.action === 'find_nearby' || intent.action === 'add_place') {
    // Determine category - for "find a bar nearby for after", extract bar
    let category = intent.category;
    if (!category && intent.action === 'find_nearby') {
      // Try to extract category from common phrases
      category = 'restaurant'; // default
    }

    // Calculate suggested time based on context
    let suggestedTime = intent.newTime || getTimeForTimeOfDay(intent.timeOfDay);

    // If this is "after" a previous action with a time, calculate relative time
    if (intent.relativeContext === 'after' && previousResult?.data?.newTime) {
      suggestedTime = getTimeAfter(previousResult.data.newTime as string, 90);
    }

    // Search for destinations
    let dbQuery = supabase
      .from('destinations')
      .select('id, slug, name, category, neighborhood, rating, image_thumbnail, latitude, longitude')
      .ilike('city', `%${city}%`)
      .limit(5);

    if (category) {
      dbQuery = dbQuery.ilike('category', `%${category}%`);
    }

    if (intent.neighborhood) {
      dbQuery = dbQuery.or(`neighborhood.ilike.%${intent.neighborhood}%,name.ilike.%${intent.neighborhood}%`);
    }

    dbQuery = dbQuery.order('rating', { ascending: false, nullsFirst: false });

    const { data: destinations, error } = await dbQuery;

    if (error || !destinations || destinations.length === 0) {
      return {
        action: intent.action,
        success: false,
        message: `No ${category || 'places'} found${intent.relativeContext ? ' nearby' : ''} in ${city}`,
      };
    }

    const bestMatch = destinations[0];

    return {
      action: intent.action,
      success: true,
      message: `Found ${bestMatch.name}`,
      data: {
        destination: {
          id: bestMatch.id,
          slug: bestMatch.slug,
          name: bestMatch.name,
          category: bestMatch.category,
          rating: bestMatch.rating,
          image_thumbnail: bestMatch.image_thumbnail,
          latitude: bestMatch.latitude,
          longitude: bestMatch.longitude,
        },
        dayNumber: intent.dayNumber || 1,
        time: suggestedTime,
        category: category,
        relativeContext: intent.relativeContext,
        alternatives: destinations.slice(1).map(d => ({
          id: d.id,
          slug: d.slug,
          name: d.name,
          category: d.category,
        })),
      },
    };
  }

  // Default suggest action
  return {
    action: 'suggest',
    success: true,
    message: 'How can I help with your trip?',
  };
}

/**
 * POST /api/intelligence/natural-language
 * Processes natural language queries for trip planning
 * Supports compound commands like "Move dinner to 8pm and find a bar nearby for after"
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = await request.json();
  const { query, city, tripDays = 1, existingItems = [] } = body;

  if (!query) {
    throw createValidationError('Query is required');
  }

  if (!city) {
    throw createValidationError('City is required');
  }

  // Parse compound command
  const parsedCommand = parseCompoundCommand(query, tripDays);
  const supabase = await createServerClient();

  // Process each intent sequentially
  const results: ActionResult[] = [];
  let previousResult: ActionResult | undefined;

  for (const intent of parsedCommand.intents) {
    const result = await processIntent(intent, city, supabase, previousResult);
    results.push(result);
    previousResult = result;
  }

  // For compound commands, return all actions
  if (parsedCommand.isCompound) {
    // Check if we have both a move and an add action
    const moveAction = results.find(r => r.action === 'move');
    const addAction = results.find(r => r.action === 'add_place' || r.action === 'find_nearby');

    return NextResponse.json({
      isCompound: true,
      actions: results.map(r => ({
        action: r.action,
        success: r.success,
        message: r.message,
        ...r.data,
      })),
      // Primary response for UI
      primaryAction: moveAction || addAction || results[0],
      // If we have an add action, include destination for easy access
      destination: addAction?.data?.destination,
      dayNumber: addAction?.data?.dayNumber || moveAction?.data?.dayNumber || 1,
      time: addAction?.data?.time,
      // Include move details if present
      moveDetails: moveAction ? {
        targetItem: moveAction.data?.targetItem,
        newTime: moveAction.data?.newTime,
      } : undefined,
      message: results.map(r => r.message).join('. '),
    });
  }

  // Single action response (backwards compatible)
  const result = results[0];

  if (result.action === 'move') {
    return NextResponse.json({
      action: 'move',
      targetItem: result.data?.targetItem,
      newTime: result.data?.newTime,
      dayNumber: result.data?.dayNumber || 1,
      message: result.message,
    });
  }

  if (!result.success) {
    return NextResponse.json({
      action: 'suggest',
      message: result.message,
    });
  }

  // Return destination result
  return NextResponse.json({
    action: result.action,
    dayNumber: result.data?.dayNumber || 1,
    time: result.data?.time,
    category: result.data?.category,
    destination: result.data?.destination,
    message: result.message,
    alternatives: result.data?.alternatives,
  });
});
