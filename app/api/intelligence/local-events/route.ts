import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, createValidationError } from '@/lib/errors';
import { enforceRateLimit, apiRatelimit, memoryApiRatelimit } from '@/lib/rate-limit';

interface LocalEvent {
  id: string;
  title: string;
  date: string;
  category: 'concert' | 'exhibition' | 'festival' | 'theater' | 'other';
  venue?: string;
  url?: string;
  description?: string;
}

// Sample events by city (in production, this would come from an events API)
const SAMPLE_EVENTS: Record<string, LocalEvent[]> = {
  paris: [
    { id: 'p1', title: 'Jazz at Le Caveau', date: '', category: 'concert', venue: 'Le Caveau de la Huchette' },
    { id: 'p2', title: 'Impressionist Masters', date: '', category: 'exhibition', venue: "Musée d'Orsay" },
    { id: 'p3', title: 'French Film Festival', date: '', category: 'festival', venue: 'Various Cinemas' },
  ],
  london: [
    { id: 'l1', title: 'West End Show', date: '', category: 'theater', venue: 'West End Theatre' },
    { id: 'l2', title: 'Tate Modern Exhibition', date: '', category: 'exhibition', venue: 'Tate Modern' },
    { id: 'l3', title: 'Camden Music Festival', date: '', category: 'concert', venue: 'Camden Town' },
  ],
  'new york': [
    { id: 'ny1', title: 'Broadway Musical', date: '', category: 'theater', venue: 'Broadway' },
    { id: 'ny2', title: 'MoMA Special Exhibition', date: '', category: 'exhibition', venue: 'MoMA' },
    { id: 'ny3', title: 'Jazz at Lincoln Center', date: '', category: 'concert', venue: 'Lincoln Center' },
  ],
  tokyo: [
    { id: 't1', title: 'Kabuki Performance', date: '', category: 'theater', venue: 'Kabukiza Theatre' },
    { id: 't2', title: 'Digital Art Exhibition', date: '', category: 'exhibition', venue: 'teamLab Borderless' },
    { id: 't3', title: 'Matsuri Festival', date: '', category: 'festival', venue: 'Asakusa' },
  ],
  default: [
    { id: 'd1', title: 'Local Art Exhibition', date: '', category: 'exhibition', venue: 'City Gallery' },
    { id: 'd2', title: 'Live Music Night', date: '', category: 'concert', venue: 'Downtown Venue' },
    { id: 'd3', title: 'Cultural Festival', date: '', category: 'festival', venue: 'City Center' },
  ],
};

/**
 * GET /api/intelligence/local-events
 * Returns events happening in a city during trip dates
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  // Rate limit event requests
  const rateLimitResponse = await enforceRateLimit({
    request,
    message: 'Too many event requests. Please wait a moment.',
    limiter: apiRatelimit,
    memoryLimiter: memoryApiRatelimit,
  });
  if (rateLimitResponse) return rateLimitResponse;

  const searchParams = request.nextUrl.searchParams;
  const city = searchParams.get('city');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  if (!city) {
    throw createValidationError('City is required');
  }

  if (!startDate) {
    throw createValidationError('Start date is required');
  }

  // In production, this would call an events API like:
  // - Eventbrite API
  // - Ticketmaster Discovery API
  // - Google Events Search
  // - Yelp Events

  // For now, return sample events with dates adjusted to trip dates
  const cityLower = city.toLowerCase();
  const baseEvents = SAMPLE_EVENTS[cityLower] || SAMPLE_EVENTS.default;

  // Calculate trip dates
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  const tripLength = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;

  // Distribute events across trip dates
  const events = baseEvents.map((event, index) => {
    const eventDate = new Date(start);
    eventDate.setDate(start.getDate() + (index % tripLength));
    return {
      ...event,
      date: eventDate.toISOString().split('T')[0],
    };
  });

  // Sort by date
  events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return NextResponse.json({
    events,
    city,
    startDate,
    endDate: endDate || end.toISOString().split('T')[0],
  });
});
