/**
 * Unified SearchSession Types
 *
 * Single pipeline that powers both guided search UI (chips/questions/cards)
 * and chat interface - same intent/ranking/memory underneath, different presentation.
 */

import type { Destination } from './destination';
import type { EnhancedIntent } from '@/services/intelligence/intent-analysis';

// ============================================
// PRESENTATION MODES
// ============================================

/**
 * The two presentation modes for the unified pipeline
 */
export type PresentationMode = 'guided' | 'chat';

/**
 * Configuration for each presentation mode
 */
export interface PresentationConfig {
  mode: PresentationMode;
  /** Max destinations to show per response */
  maxDestinations: number;
  /** Whether to include AI-generated narrative */
  includeNarrative: boolean;
  /** Whether to show suggestion chips */
  showSuggestions: boolean;
  /** Whether to enable streaming responses */
  streaming: boolean;
  /** Show reasoning for recommendations */
  showReasoning: boolean;
}

export const DEFAULT_GUIDED_CONFIG: PresentationConfig = {
  mode: 'guided',
  maxDestinations: 8,
  includeNarrative: false,
  showSuggestions: true,
  streaming: false,
  showReasoning: false,
};

export const DEFAULT_CHAT_CONFIG: PresentationConfig = {
  mode: 'chat',
  maxDestinations: 5,
  includeNarrative: true,
  showSuggestions: true,
  streaming: true,
  showReasoning: true,
};

// ============================================
// SESSION & CONTEXT
// ============================================

/**
 * Unified session that maintains state across interactions
 */
export interface SearchSession {
  id: string;
  userId?: string;
  mode: PresentationMode;
  turns: SearchTurn[];
  context: SessionContext;
  createdAt: Date;
  lastActiveAt: Date;
  /** Session expires after this duration of inactivity (ms) */
  expiresAfterMs: number;
}

/**
 * A single turn in the session (user input + system response)
 */
export interface SearchTurn {
  id: string;
  turnNumber: number;
  timestamp: Date;
  input: TurnInput;
  output: TurnOutput;
  metrics?: TurnMetrics;
}

/**
 * Input for a search turn
 */
export interface TurnInput {
  /** The user's query (text or action) */
  query: string;
  /** Input type */
  type: 'text' | 'chip' | 'filter' | 'action';
  /** For chip/action inputs, the action details */
  action?: {
    type: 'refine' | 'expand' | 'similar' | 'filter' | 'save' | 'compare';
    payload?: Record<string, unknown>;
  };
  /** Any filters applied */
  filters?: SearchFilters;
}

/**
 * Output from a search turn - adaptable to either presentation mode
 */
export interface TurnOutput {
  /** Parsed intent from the input */
  intent: ParsedIntent;
  /** Ranked destinations */
  destinations: RankedDestination[];
  /** Presentation-specific content */
  presentation: GuidedPresentation | ChatPresentation;
  /** Suggested next actions/queries */
  suggestions: Suggestion[];
  /** Trip plan if detected */
  tripPlan?: TripPlan;
  /** Whether clarification is needed */
  needsClarification?: boolean;
  clarification?: ClarificationRequest;
  /** Search metadata */
  metadata: SearchMetadata;
}

/**
 * Metrics for a turn (behavior tracking)
 */
export interface TurnMetrics {
  /** Destinations the user clicked */
  clicked: string[];
  /** Destinations the user saved */
  saved: string[];
  /** Destinations shown but not interacted with */
  ignored: string[];
  /** Time spent on this turn (ms) */
  dwellTime?: number;
  /** Actions taken */
  actions: UserAction[];
}

// ============================================
// INTENT & PARSING
// ============================================

/**
 * Unified parsed intent from user input
 */
export interface ParsedIntent {
  /** Raw query text */
  query: string;
  /** Detected keywords */
  keywords: string[];
  /** Enhanced intent analysis */
  enhanced: EnhancedIntent;
  /** Extracted entities */
  entities: {
    cities: string[];
    categories: string[];
    modifiers: string[];
    priceLevel?: number;
    rating?: number;
    michelinStars?: number;
  };
  /** Temporal context */
  temporal?: {
    timeframe: 'now' | 'soon' | 'future' | 'flexible';
    specificDate?: string;
    duration?: string;
  };
  /** Trip planning detection */
  tripPlanning?: {
    detected: boolean;
    days?: number;
    startDate?: string;
    style?: string[];
    travelers?: number;
  };
  /** Reference to previous context */
  reference?: {
    type: 'previous_results' | 'saved_items' | 'comparison' | 'more_like';
    target?: string;
  };
  /** Confidence score (0-1) */
  confidence: number;
}

// ============================================
// DESTINATIONS & RANKING
// ============================================

/**
 * Destination with ranking metadata and optional reasoning
 */
export interface RankedDestination {
  destination: Destination;
  /** Overall ranking score (0-1) */
  score: number;
  /** Ranking breakdown */
  factors: RankingFactors;
  /** Human-readable reasoning (for chat mode) */
  reasoning?: RecommendationReasoning;
  /** Enrichment data if available */
  enrichment?: DestinationEnrichment;
}

export interface RankingFactors {
  similarity: number;
  quality: number;
  popularity: number;
  personalization: number;
  trending: number;
  intentMatch: number;
  enrichment: number;
  recency: number;
}

export interface RecommendationReasoning {
  primaryReason: string;
  factors: Array<{
    type: 'taste' | 'behavior' | 'similar' | 'popular' | 'trip' | 'location' | 'price';
    description: string;
    strength: 'strong' | 'moderate' | 'weak';
  }>;
  matchScore: number;
}

export interface DestinationEnrichment {
  weather?: {
    current: string;
    temperature: number;
    recommendation?: string;
  };
  events?: Array<{
    name: string;
    date: string;
    distance?: string;
  }>;
  walkingTime?: string;
  openNow?: boolean;
  priceContext?: string;
}

// ============================================
// FILTERS
// ============================================

export interface SearchFilters {
  city?: string;
  cities?: string[];
  category?: string;
  categories?: string[];
  priceLevel?: number | [number, number];
  rating?: number;
  michelinStars?: number;
  neighborhood?: string;
  tags?: string[];
  openNow?: boolean;
  sortBy?: 'relevance' | 'rating' | 'price' | 'distance' | 'trending';
}

// ============================================
// PRESENTATION-SPECIFIC OUTPUT
// ============================================

/**
 * Guided mode presentation (chips, cards, questions)
 */
export interface GuidedPresentation {
  type: 'guided';
  /** Filter chips to refine results */
  filterChips: FilterChip[];
  /** Question cards for disambiguation */
  questionCards?: QuestionCard[];
  /** Category groupings */
  groups?: DestinationGroup[];
  /** Featured/highlighted destination */
  featured?: string;
  /** Quick stats */
  stats?: {
    total: number;
    byCategory: Record<string, number>;
  };
}

export interface FilterChip {
  id: string;
  label: string;
  type: 'category' | 'price' | 'rating' | 'modifier' | 'city' | 'quick';
  value: unknown;
  active?: boolean;
  count?: number;
}

export interface QuestionCard {
  id: string;
  question: string;
  options: Array<{
    label: string;
    value: string;
    icon?: string;
  }>;
  multiSelect?: boolean;
}

export interface DestinationGroup {
  id: string;
  title: string;
  description?: string;
  destinationSlugs: string[];
}

/**
 * Chat mode presentation (narrative, conversational)
 */
export interface ChatPresentation {
  type: 'chat';
  /** AI-generated narrative response */
  narrative: string;
  /** Conversational tone */
  tone: 'friendly' | 'expert' | 'concise';
  /** Contextual hints for the user */
  hints: string[];
  /** Proactive actions suggested */
  proactiveActions?: ProactiveAction[];
  /** Seasonal/event awareness */
  seasonalContext?: {
    event: string;
    description: string;
    isActive: boolean;
    daysUntil?: number;
  };
}

export interface ProactiveAction {
  id: string;
  type: 'save_all' | 'create_trip' | 'share' | 'compare' | 'book';
  label: string;
  description?: string;
  payload?: Record<string, unknown>;
}

// ============================================
// SUGGESTIONS
// ============================================

export interface Suggestion {
  id: string;
  type: 'refine' | 'expand' | 'related' | 'contrast' | 'trip' | 'saved' | 'filter';
  label: string;
  query?: string;
  action?: {
    type: string;
    payload?: Record<string, unknown>;
  };
  icon?: string;
  /** Priority for display ordering */
  priority: number;
}

// ============================================
// CLARIFICATION
// ============================================

export interface ClarificationRequest {
  question: string;
  reason: string;
  options: ClarificationOption[];
  allowFreeText: boolean;
}

export interface ClarificationOption {
  id: string;
  label: string;
  value: string;
  description?: string;
}

// ============================================
// TRIP PLANNING
// ============================================

export interface TripPlan {
  id?: string;
  city: string;
  title: string;
  days: TripDay[];
  startDate?: string;
  travelers?: number;
  summary?: string;
  style?: string[];
}

export interface TripDay {
  day: number;
  title: string;
  items: TripItem[];
}

export interface TripItem {
  time?: string;
  title: string;
  description?: string;
  category?: string;
  destinationSlug?: string;
}

// ============================================
// SESSION CONTEXT
// ============================================

/**
 * Accumulated context within a session
 */
export interface SessionContext {
  /** Current focus */
  currentCity?: string;
  currentCategory?: string;
  currentIntent?: string;

  /** Multi-city support */
  cities: string[];
  isMultiCity: boolean;

  /** Travel companion awareness */
  companion?: TravelCompanion;

  /** Behavioral signals */
  liked: string[];
  disliked: string[];
  saved: string[];
  shown: string[];

  /** Inferred preferences from behavior */
  inferred: InferredPreferences;

  /** Active trip context */
  activeTrip?: {
    id: string;
    name: string;
    city: string;
    startDate?: string;
    endDate?: string;
  };

  /** Conversation summary for long sessions */
  summary?: string;

  /** Cross-session insights */
  previousInsights?: string[];
}

export interface TravelCompanion {
  type: 'solo' | 'couple' | 'family' | 'friends' | 'business';
  hasKids?: boolean;
  kidsAges?: number[];
  groupSize?: number;
  specialNeeds?: string[];
  vibe?: 'romantic' | 'adventurous' | 'relaxed' | 'cultural' | 'party';
}

export interface InferredPreferences {
  prefersMichelin?: boolean;
  prefersDesign?: boolean;
  prefersLocal?: boolean;
  pricePreference?: 'budget' | 'mid' | 'luxury';
  moodPreference?: string[];
  categoryAffinity?: Record<string, number>;
}

// ============================================
// USER ACTIONS & BEHAVIOR
// ============================================

export interface UserAction {
  type: 'click' | 'save' | 'hover' | 'scroll' | 'scroll_past' | 'share' | 'book' | 'reject' | 'dwell';
  target: string;
  timestamp: Date;
  context?: Record<string, unknown>;
}

export interface BehaviorSignal {
  type: 'click' | 'save' | 'reject' | 'hover' | 'scroll_past' | 'dwell';
  destinationSlug: string;
  timestamp: Date;
  turnId: string;
  context?: Record<string, unknown>;
}

// ============================================
// SEARCH METADATA
// ============================================

export interface SearchMetadata {
  /** Which search tier was used */
  searchTier: 'discovery-engine' | 'vector-search' | 'keyword-search' | 'city-fallback';
  /** Total results found */
  totalResults: number;
  /** Processing time (ms) */
  processingTime: number;
  /** Cache status */
  cached: boolean;
  /** Enrichment availability */
  enrichmentAvailable: boolean;
}

// ============================================
// API REQUEST/RESPONSE
// ============================================

/**
 * Unified API request for search session
 */
export interface SearchSessionRequest {
  /** Session ID (omit for new session) */
  sessionId?: string;
  /** User ID if authenticated */
  userId?: string;
  /** Presentation mode */
  mode: PresentationMode;
  /** The user's input */
  input: TurnInput;
  /** Presentation config overrides */
  config?: Partial<PresentationConfig>;
  /** Include proactive actions in response */
  includeProactiveActions?: boolean;
}

/**
 * Unified API response from search session
 */
export interface SearchSessionResponse {
  /** Session ID */
  sessionId: string;
  /** The turn output */
  turn: TurnOutput;
  /** Turn number in session */
  turnNumber: number;
  /** Session context snapshot */
  context: SessionContext;
  /** Whether session is new */
  isNewSession: boolean;
}

/**
 * Streaming response chunk
 */
export interface SearchSessionStreamChunk {
  type: 'intent' | 'destinations' | 'narrative' | 'suggestions' | 'complete' | 'error';
  data: unknown;
  turnId: string;
}
