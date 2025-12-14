/**
 * Streaming Itinerary Generation API
 * Provides real-time streaming AI-powered trip recommendations using SSE
 *
 * Note: This endpoint returns a streaming Response (not NextResponse) for SSE,
 * so it uses manual auth handling instead of withOptionalAuth wrapper.
 */

import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import {
  genAI,
  GEMINI_MODEL_PRO,
  isGeminiAvailable,
} from '@/lib/gemini';
import {
  conversationRatelimit,
  memoryConversationRatelimit,
  getIdentifier,
  isUpstashConfigured,
} from '@/lib/rate-limit';

// Allow longer AI processing for itinerary generation
export const maxDuration = 60;

// System prompt for itinerary generation
const ITINERARY_SYSTEM_PROMPT = `You are an expert travel planner for Urban Manual, a curated travel guide featuring 897+ destinations worldwide. Create detailed, personalized itineraries that showcase the best restaurants, hotels, cafes, bars, and attractions.

Guidelines:
- Create day-by-day itineraries with specific times and activities
- Include a mix of dining experiences (breakfast, lunch, dinner)
- Suggest activities appropriate for the time of day
- Consider travel time between locations
- Balance must-see highlights with hidden gems
- Account for user preferences and travel style
- Keep recommendations authentic and locally-focused
- Format each day clearly with time slots

Output format for each day:
Day [N]: [Theme/Focus]
- Morning (9:00): [Activity/Place]
- Lunch (12:30): [Restaurant recommendation]
- Afternoon (14:00): [Activity/Place]
- Evening (18:00): [Activity or dinner preparation]
- Dinner (19:30): [Restaurant recommendation]
- Night (21:00): [Optional: bar, show, or activity]

Include brief descriptions of why each place is worth visiting.`;

// Helper to create SSE-formatted message
function createSSEMessage(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

interface GenerateItineraryRequest {
  destination: string;
  dates: {
    start: string;
    end: string;
  };
  preferences?: string[];
  travelStyle?: 'relaxed' | 'moderate' | 'packed';
  budget?: 'budget' | 'moderate' | 'luxury';
  tripId?: string;
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  // Get user if authenticated (optional auth)
  let userId: string | undefined;
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id;
  } catch {
    // Auth is optional for this endpoint
  }

  // Rate limiting: 5 requests per 10 seconds
  const identifier = getIdentifier(request, userId);
  const ratelimit = isUpstashConfigured() ? conversationRatelimit : memoryConversationRatelimit;
  const { success, limit, remaining, reset } = await ratelimit.limit(identifier);

  if (!success) {
    return new Response(
      encoder.encode(createSSEMessage({
        type: 'error',
        error: 'Too many requests. Please wait a moment before generating another itinerary.',
        limit,
        remaining,
        reset
      })),
      {
        status: 429,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      }
    );
  }

  const body: GenerateItineraryRequest = await request.json();
  const { destination, dates, preferences = [], travelStyle = 'moderate', budget = 'moderate', tripId } = body;

  // Validate required fields
  if (!destination || typeof destination !== 'string' || destination.trim().length === 0) {
    return new Response(
      encoder.encode(createSSEMessage({ type: 'error', error: 'Destination is required' })),
      {
        status: 400,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      }
    );
  }

  if (!dates?.start || !dates?.end) {
    return new Response(
      encoder.encode(createSSEMessage({ type: 'error', error: 'Start and end dates are required' })),
      {
      status: 400,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      }
    );
  }

  // Check Gemini availability
  if (!isGeminiAvailable() || !genAI) {
    return new Response(
      encoder.encode(createSSEMessage({
        type: 'error',
        error: 'AI service is temporarily unavailable. Please try again later.'
      })),
      {
        status: 503,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      }
    );
  }

  // Calculate trip duration
  const startDate = new Date(dates.start);
  const endDate = new Date(dates.end);
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const tripDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  // Fetch user preferences if logged in
  let userPreferences: string[] = [...preferences];
  if (userId) {
    try {
      const supabase = await createServerClient();
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('favorite_cities, favorite_categories, travel_style')
        .eq('user_id', userId)
        .maybeSingle();

      if (profile) {
        if (profile.favorite_categories) {
          userPreferences = [...userPreferences, ...profile.favorite_categories];
        }
      }
    } catch (error) {
      console.debug('User profile fetch failed (optional):', error);
    }
  }

  // Create streaming response
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Send initial status
        controller.enqueue(encoder.encode(createSSEMessage({
          type: 'status',
          status: 'planning',
          message: `Planning your ${tripDays}-day trip to ${destination}...`
        })));

        // Build the prompt
        const preferencesText = userPreferences.length > 0
          ? `User preferences: ${userPreferences.join(', ')}`
          : 'No specific preferences provided';

        const budgetGuide = {
          budget: 'Focus on affordable local spots, street food, free attractions, and budget-friendly accommodations.',
          moderate: 'Mix of mid-range restaurants, quality attractions, and comfortable hotels.',
          luxury: 'Emphasize fine dining, exclusive experiences, premium hotels, and VIP access where available.',
        }[budget];

        const paceGuide = {
          relaxed: 'Keep the pace leisurely with plenty of downtime and flexibility.',
          moderate: 'Balanced itinerary with good coverage but not rushed.',
          packed: 'Maximize activities and experiences - ideal for those who want to see everything.',
        }[travelStyle];

        const prompt = `Create a detailed ${tripDays}-day itinerary for ${destination} from ${dates.start} to ${dates.end}.

${preferencesText}
Travel style: ${travelStyle} - ${paceGuide}
Budget level: ${budget} - ${budgetGuide}

Please create a comprehensive day-by-day itinerary following the format specified. Include specific venue names where possible, and explain why each recommendation fits the traveler's preferences.`;

        // Use Gemini Pro for better quality itineraries
        // Re-check genAI availability (TypeScript narrowing doesn't persist into async closures)
        if (!genAI) {
          throw new Error('AI service became unavailable');
        }

        const model = genAI.getGenerativeModel({
          model: GEMINI_MODEL_PRO,
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 4096,
          },
          systemInstruction: ITINERARY_SYSTEM_PROMPT,
        });

        // Generate streaming content
        const result = await model.generateContentStream(prompt);
        let fullContent = '';

        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) {
            fullContent += text;
            controller.enqueue(encoder.encode(createSSEMessage({
              type: 'chunk',
              content: text
            })));
          }
        }

        // Parse and structure the itinerary if possible
        const itineraryData = {
          destination,
          dates,
          tripDays,
          preferences: userPreferences,
          travelStyle,
          budget,
          content: fullContent,
        };

        // Send completion with structured data
        controller.enqueue(encoder.encode(createSSEMessage({
          type: 'complete',
          itinerary: itineraryData,
          tripId: tripId || null,
          model: GEMINI_MODEL_PRO,
        })));

        controller.close();
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('Itinerary generation error:', error);
        controller.enqueue(encoder.encode(createSSEMessage({
          type: 'error',
          error: 'Failed to generate itinerary. Please try again.',
          details: errorMessage
        })));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
