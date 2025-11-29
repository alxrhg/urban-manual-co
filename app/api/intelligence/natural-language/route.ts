import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, createValidationError } from '@/lib/errors';
import { createServerClient } from '@/lib/supabase/server';

interface ParsedIntent {
  action: 'add_place' | 'suggest' | 'modify';
  category?: string;
  neighborhood?: string;
  dayNumber?: number;
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
  attributes?: string[];
}

// Simple intent parsing (could be enhanced with AI)
function parseIntent(query: string, tripDays: number): ParsedIntent {
  const lowerQuery = query.toLowerCase();
  const intent: ParsedIntent = { action: 'suggest' };

  // Detect action
  if (lowerQuery.includes('add') || lowerQuery.includes('find') || lowerQuery.includes('book')) {
    intent.action = 'add_place';
  }

  // Detect category
  const categoryPatterns: Record<string, string[]> = {
    restaurant: ['restaurant', 'dinner', 'lunch', 'dining', 'eat'],
    cafe: ['cafe', 'coffee', 'breakfast', 'brunch'],
    bar: ['bar', 'cocktail', 'drink', 'nightlife', 'rooftop'],
    museum: ['museum', 'art', 'gallery', 'exhibition'],
    landmark: ['landmark', 'monument', 'sight', 'attraction'],
    hotel: ['hotel', 'stay', 'accommodation', 'lodging'],
  };

  for (const [category, patterns] of Object.entries(categoryPatterns)) {
    if (patterns.some(p => lowerQuery.includes(p))) {
      intent.category = category;
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

  // Detect attributes
  const attributes: string[] = [];
  if (lowerQuery.includes('quiet')) attributes.push('quiet');
  if (lowerQuery.includes('view')) attributes.push('scenic');
  if (lowerQuery.includes('romantic')) attributes.push('romantic');
  if (lowerQuery.includes('cheap') || lowerQuery.includes('budget')) attributes.push('budget');
  if (lowerQuery.includes('fancy') || lowerQuery.includes('upscale')) attributes.push('upscale');
  if (lowerQuery.includes('rooftop')) attributes.push('rooftop');
  if (lowerQuery.includes('near')) {
    // Extract neighborhood or location reference
    const nearMatch = lowerQuery.match(/near\s+(?:the\s+)?([a-z\s]+?)(?:\s+for|\s+on|\s*$)/i);
    if (nearMatch) {
      intent.neighborhood = nearMatch[1].trim();
    }
  }
  intent.attributes = attributes;

  return intent;
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

/**
 * POST /api/intelligence/natural-language
 * Processes natural language queries for trip planning
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = await request.json();
  const { query, city, tripDays = 1 } = body;

  if (!query) {
    throw createValidationError('Query is required');
  }

  if (!city) {
    throw createValidationError('City is required');
  }

  // Parse intent from query
  const intent = parseIntent(query, tripDays);

  // Build database query
  const supabase = await createServerClient();

  let dbQuery = supabase
    .from('destinations')
    .select('id, slug, name, category, neighborhood, rating, image_thumbnail')
    .ilike('city', `%${city}%`)
    .limit(5);

  // Apply category filter
  if (intent.category) {
    dbQuery = dbQuery.ilike('category', `%${intent.category}%`);
  }

  // Apply neighborhood filter if specified
  if (intent.neighborhood) {
    dbQuery = dbQuery.or(`neighborhood.ilike.%${intent.neighborhood}%,name.ilike.%${intent.neighborhood}%`);
  }

  // Sort by rating
  dbQuery = dbQuery.order('rating', { ascending: false, nullsFirst: false });

  const { data: destinations, error } = await dbQuery;

  if (error) {
    console.error('Database error:', error);
    return NextResponse.json({
      action: 'suggest',
      message: 'Failed to search destinations',
    });
  }

  if (!destinations || destinations.length === 0) {
    return NextResponse.json({
      action: 'suggest',
      message: `No ${intent.category || 'places'} found in ${city}. Try a different request.`,
    });
  }

  // Return the best match
  const bestMatch = destinations[0];

  return NextResponse.json({
    action: intent.action,
    dayNumber: intent.dayNumber || 1,
    time: getTimeForTimeOfDay(intent.timeOfDay),
    category: intent.category,
    destination: {
      id: bestMatch.id,
      slug: bestMatch.slug,
      name: bestMatch.name,
      category: bestMatch.category,
      rating: bestMatch.rating,
      image_thumbnail: bestMatch.image_thumbnail,
    },
    message: `Found ${bestMatch.name}`,
    alternatives: destinations.slice(1).map(d => ({
      id: d.id,
      slug: d.slug,
      name: d.name,
      category: d.category,
    })),
  });
});
