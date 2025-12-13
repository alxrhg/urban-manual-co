/**
 * Shared Zod Schemas for Intelligence APIs
 *
 * Provides typed, validated schemas for:
 * - /api/travel-intelligence
 * - /api/smart-chat
 *
 * These schemas ensure consistency and prevent "shape drift" between endpoints.
 */

import { z } from 'zod';

// ============================================
// COMMON ENUMS & CONSTANTS
// ============================================

export const IntentType = z.enum([
  'search',
  'recommendation',
  'discovery',
  'comparison',
  'more_like_this',
  'itinerary',
  'clarification_response',
  'group_recommendation',
]);

export const TimeContext = z.enum(['breakfast', 'lunch', 'dinner', 'late_night']);

export const PriceContext = z.enum(['budget', 'mid_range', 'splurge']);

export const SocialContext = z.enum(['solo', 'date', 'group', 'business', 'family']);

export const ItineraryDuration = z.enum(['half_day', 'full_day', 'multi_day']);

export const ClarificationType = z.enum(['city', 'category', 'occasion', 'price']);

export const BehaviorSignalType = z.enum([
  'click',
  'save',
  'reject',
  'hover',
  'scroll_past',
  'dwell',
]);

export const TimeSlotType = z.enum(['morning', 'lunch', 'afternoon', 'dinner', 'evening']);

// ============================================
// SHARED FILTER SCHEMAS
// ============================================

/**
 * Search filters used by both travel-intelligence and smart-chat
 */
export const SearchFiltersSchema = z.object({
  city: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  neighborhood: z.string().nullable().optional(),
  priceMin: z.number().min(0).max(4).nullable().optional(),
  priceMax: z.number().min(0).max(4).nullable().optional(),
  michelin: z.boolean().optional(),
  occasion: z.string().nullable().optional(),
  vibe: z.array(z.string()).optional(),
  openNow: z.boolean().optional(),
});

export type SearchFilters = z.infer<typeof SearchFiltersSchema>;

// ============================================
// CONVERSATION SCHEMAS
// ============================================

/**
 * Conversation message (shared between endpoints)
 */
export const ConversationMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  timestamp: z.string().optional(),
  metadata: z
    .object({
      intent: z.string().optional(),
      filters: SearchFiltersSchema.optional(),
      destinationIds: z.array(z.number()).optional(),
    })
    .optional(),
});

export type ConversationMessage = z.infer<typeof ConversationMessageSchema>;

// ============================================
// GROUP PREFERENCES
// ============================================

export const GroupPreferenceSchema = z.object({
  person: z.string(), // 'me', 'friend', 'partner', etc.
  cuisines: z.array(z.string()).optional(),
  vibes: z.array(z.string()).optional(),
  priceContext: PriceContext.optional(),
});

export type GroupPreference = z.infer<typeof GroupPreferenceSchema>;

// ============================================
// PARSED INTENT SCHEMA
// ============================================

/**
 * Parsed query intent (output of query parsing)
 */
export const ParsedIntentSchema = z.object({
  searchQuery: z.string(),
  filters: SearchFiltersSchema,
  intent: IntentType,
  occasion: z.string().optional(),
  vibes: z.array(z.string()),
  timeContext: TimeContext.optional(),
  priceContext: PriceContext.optional(),
  socialContext: SocialContext.optional(),
  referenceDestination: z.string().optional(),
  itineraryDuration: ItineraryDuration.optional(),
  needsClarification: z.boolean().optional(),
  clarificationType: ClarificationType.optional(),
  groupPreferences: z.array(GroupPreferenceSchema).optional(),
});

export type ParsedIntent = z.infer<typeof ParsedIntentSchema>;

// ============================================
// ITINERARY SCHEMAS
// ============================================

export const ItinerarySlotSchema = z.object({
  timeSlot: TimeSlotType,
  label: z.string(),
  category: z.string(),
  destination: z.any().optional(), // Full destination object
});

export type ItinerarySlot = z.infer<typeof ItinerarySlotSchema>;

// ============================================
// INTELLIGENCE CONTEXT SCHEMAS
// ============================================

export const TasteFingerprintSchema = z.object({
  adventurousness: z.number().min(0).max(1),
  priceAffinity: z.number().min(0).max(1),
  designSensitivity: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
});

export type TasteFingerprint = z.infer<typeof TasteFingerprintSchema>;

export const ActiveTripSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  destinations: z.array(z.string()),
  gaps: z.array(
    z.object({
      day: z.number(),
      type: TimeSlotType,
      startTime: z.string(),
      endTime: z.string(),
    })
  ),
});

export type ActiveTripSummary = z.infer<typeof ActiveTripSummarySchema>;

export const IntelligenceContextSchema = z.object({
  hints: z.array(z.string()),
  actions: z.array(
    z.object({
      type: z.string(),
      params: z.record(z.unknown()),
      description: z.string(),
      requiresConfirmation: z.boolean(),
    })
  ),
  activeTrip: ActiveTripSummarySchema.nullable(),
  tasteFingerprint: TasteFingerprintSchema.nullable(),
  relatedArchitects: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      destinationCount: z.number(),
    })
  ),
  relatedMovements: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      period: z.string(),
      destinationCount: z.number(),
    })
  ),
});

export type IntelligenceContext = z.infer<typeof IntelligenceContextSchema>;

// ============================================
// REQUEST SCHEMAS
// ============================================

/**
 * Travel Intelligence API request
 */
export const TravelIntelligenceRequestSchema = z.object({
  query: z.string().min(1, 'Query is required'),
  conversationHistory: z.array(ConversationMessageSchema).optional().default([]),
  filters: SearchFiltersSchema.optional().default({}),
  limit: z.number().min(1).max(100).optional().default(20),
});

export type TravelIntelligenceRequest = z.infer<typeof TravelIntelligenceRequestSchema>;

/**
 * Smart Chat API request
 */
export const SmartChatRequestSchema = z.object({
  message: z.string().min(2, 'Message too short'),
  sessionId: z.string().nullable().optional().transform((v) => v ?? null),
  includeProactiveActions: z.boolean().optional().default(true),
  maxDestinations: z.number().min(1).max(50).optional().default(10),
});

export type SmartChatRequest = z.infer<typeof SmartChatRequestSchema>;

/**
 * Behavior tracking request
 */
export const BehaviorTrackingRequestSchema = z.object({
  sessionId: z.string(),
  type: BehaviorSignalType,
  destinationSlug: z.string(),
  context: z.record(z.unknown()).optional().default({}),
});

export type BehaviorTrackingRequest = z.infer<typeof BehaviorTrackingRequestSchema>;

/**
 * Itinerary build request
 */
export const ItineraryBuildRequestSchema = z.object({
  city: z.string().min(1, 'City is required'),
  duration: z.enum(['day', 'half_day', 'multi_day']).optional().default('day'),
  neighborhood: z.string().nullable().optional().transform((v) => v ?? null),
  sessionId: z.string().nullable().optional().transform((v) => v ?? null),
});

export type ItineraryBuildRequest = z.infer<typeof ItineraryBuildRequestSchema>;

/**
 * Similar places request
 */
export const SimilarPlacesRequestSchema = z.object({
  destinationSlug: z.string().optional(),
  destinationName: z.string().optional(),
  sessionId: z.string().nullable().optional().transform((v) => v ?? null),
  limit: z.number().min(1).max(50).optional().default(10),
}).refine((data) => data.destinationSlug || data.destinationName, {
  message: 'Either destinationSlug or destinationName is required',
});

export type SimilarPlacesRequest = z.infer<typeof SimilarPlacesRequestSchema>;

/**
 * Multi-city planning request
 */
export const MultiCityPlanRequestSchema = z.object({
  cities: z.array(z.string()).min(2, 'At least 2 cities are required').max(5, 'Maximum 5 cities allowed'),
  daysPerCity: z.number().min(1).max(7).optional().default(2),
  sessionId: z.string().nullable().optional().transform((v) => v ?? null),
});

export type MultiCityPlanRequest = z.infer<typeof MultiCityPlanRequestSchema>;

// ============================================
// RESPONSE SCHEMAS
// ============================================

/**
 * Response metadata (shared)
 */
export const ResponseMetaSchema = z.object({
  query: z.string().optional(),
  totalResults: z.number(),
  hasVectorSearch: z.boolean().optional(),
  ranked: z.boolean().optional(),
  personalized: z.boolean().optional(),
  hasUnifiedContext: z.boolean().optional(),
  isItinerary: z.boolean().optional(),
  duration: ItineraryDuration.optional(),
  isGroupRecommendation: z.boolean().optional(),
  cuisines: z.array(z.string()).optional(),
  similarTo: z.string().optional(),
});

export type ResponseMeta = z.infer<typeof ResponseMetaSchema>;

/**
 * Follow-up suggestion (both endpoints)
 */
export const FollowUpSuggestionSchema = z.string();

/**
 * Smart suggestion with more detail (smart-chat)
 */
export const SmartSuggestionSchema = z.object({
  text: z.string(),
  type: z.enum(['refine', 'expand', 'related', 'contrast', 'trip', 'saved']),
  icon: z.string().optional(),
  reasoning: z.string().optional(),
});

export type SmartSuggestion = z.infer<typeof SmartSuggestionSchema>;

/**
 * Proactive action suggestion
 */
export const ProactiveActionSchema = z.object({
  type: z.enum(['save', 'add_to_trip', 'compare', 'show_map', 'schedule']),
  label: z.string(),
  destinationSlug: z.string().optional(),
  reasoning: z.string(),
});

export type ProactiveAction = z.infer<typeof ProactiveActionSchema>;

/**
 * Recommendation reasoning
 */
export const RecommendationReasoningSchema = z.object({
  primaryReason: z.string(),
  factors: z.array(
    z.object({
      type: z.enum(['taste', 'behavior', 'similar', 'popular', 'trip', 'location', 'price']),
      description: z.string(),
      strength: z.enum(['strong', 'moderate', 'weak']),
    })
  ),
  matchScore: z.number().min(0).max(1),
});

export type RecommendationReasoning = z.infer<typeof RecommendationReasoningSchema>;

/**
 * Trip plan schema
 */
export const TripPlanSchema = z.object({
  city: z.string(),
  title: z.string(),
  days: z.array(
    z.object({
      day: z.number(),
      title: z.string(),
      items: z.array(
        z.object({
          time: z.string().optional(),
          title: z.string(),
          description: z.string().optional(),
          category: z.string().optional(),
          destinationSlug: z.string().optional(),
        })
      ),
    })
  ),
  startDate: z.string().optional(),
  travelers: z.number().optional(),
  summary: z.string().optional(),
});

export type TripPlan = z.infer<typeof TripPlanSchema>;

/**
 * Query intent for smart-chat response
 */
export const QueryIntentSchema = z.object({
  keywords: z.array(z.string()),
  city: z.string().optional(),
  category: z.string().optional(),
  filters: z
    .object({
      priceLevel: z.number().optional(),
      rating: z.number().optional(),
      michelinStar: z.number().optional(),
    })
    .optional(),
  intent: z.string().optional(),
  confidence: z.number().optional(),
  clarifications: z.array(z.string()).optional(),
  isFollowUp: z.boolean().optional(),
  referencesPrevious: z.boolean().optional(),
  isTripPlanning: z.boolean().optional(),
  tripDays: z.number().optional(),
  tripStartDate: z.string().optional(),
  tripStyle: z.array(z.string()).optional(),
});

export type QueryIntent = z.infer<typeof QueryIntentSchema>;

/**
 * Travel Intelligence API response
 */
export const TravelIntelligenceResponseSchema = z.object({
  response: z.string(),
  destinations: z.array(z.any()), // Full destination objects
  filters: SearchFiltersSchema,
  followUps: z.array(z.string()),
  intent: IntentType,
  vibes: z.array(z.string()).optional(),
  itinerary: z.array(ItinerarySlotSchema).optional(),
  groupPreferences: z.array(GroupPreferenceSchema).optional(),
  intelligence: IntelligenceContextSchema.optional(),
  meta: ResponseMetaSchema,
  // Clarification fields
  needsClarification: z.boolean().optional(),
  clarificationType: ClarificationType.optional(),
});

export type TravelIntelligenceResponse = z.infer<typeof TravelIntelligenceResponseSchema>;

/**
 * Smart Chat API response (wrapped in data)
 */
export const SmartChatResponseDataSchema = z.object({
  content: z.string(),
  destinations: z.array(z.any()), // Destinations with reasoning
  suggestions: z.array(SmartSuggestionSchema),
  contextualHints: z.array(z.string()),
  proactiveActions: z.array(ProactiveActionSchema).optional(),
  tripPlan: TripPlanSchema.optional(),
  conversationId: z.string(),
  turnNumber: z.number(),
  intent: QueryIntentSchema,
  confidence: z.number(),
});

export type SmartChatResponseData = z.infer<typeof SmartChatResponseDataSchema>;

export const SmartChatResponseSchema = z.object({
  success: z.boolean(),
  data: SmartChatResponseDataSchema.optional(),
  error: z.string().optional(),
  content: z.string().optional(), // Fallback for error responses
  destinations: z.array(z.any()).optional(), // Fallback for error responses
});

export type SmartChatResponse = z.infer<typeof SmartChatResponseSchema>;

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Validate and parse travel intelligence request
 */
export function parseTravelIntelligenceRequest(body: unknown): TravelIntelligenceRequest {
  return TravelIntelligenceRequestSchema.parse(body);
}

/**
 * Validate and parse smart chat request
 */
export function parseSmartChatRequest(body: unknown): SmartChatRequest {
  return SmartChatRequestSchema.parse(body);
}

/**
 * Safe parse with error handling
 */
export function safeParseTravelIntelligenceRequest(body: unknown) {
  return TravelIntelligenceRequestSchema.safeParse(body);
}

export function safeParseSmartChatRequest(body: unknown) {
  return SmartChatRequestSchema.safeParse(body);
}

/**
 * Create a standardized error response
 */
export function createValidationErrorResponse(error: z.ZodError) {
  const issues = error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));

  return {
    error: 'Validation failed',
    details: issues,
  };
}

// ============================================
// SHARED CONSTANTS (extracted from route files)
// ============================================

export const SUPPORTED_CITIES = [
  'Tokyo',
  'Kyoto',
  'New York',
  'London',
  'Paris',
  'Taipei',
  'Los Angeles',
  'Hong Kong',
  'Singapore',
  'Bangkok',
] as const;

export const SUPPORTED_CATEGORIES = [
  'restaurant',
  'hotel',
  'bar',
  'cafe',
  'shop',
] as const;

export const VIBE_TYPES = [
  'romantic',
  'trendy',
  'hidden_gem',
  'upscale',
  'casual',
  'lively',
  'quiet',
  'design',
] as const;

export const OCCASION_TYPES = [
  'anniversary',
  'birthday',
  'business',
  'date',
  'family',
  'friends',
] as const;
