/**
 * Unified SearchSession Module
 *
 * Single pipeline for both guided search UI and chat interface.
 */

export { searchSessionEngine, SearchSessionEngine } from './search-session-engine';
export {
  DEFAULT_GUIDED_CONFIG,
  DEFAULT_CHAT_CONFIG,
} from '@/types/search-session';
export type {
  SearchSession,
  SearchTurn,
  TurnInput,
  TurnOutput,
  ParsedIntent,
  RankedDestination,
  SessionContext,
  SearchFilters,
  GuidedPresentation,
  ChatPresentation,
  Suggestion,
  TripPlan,
  ClarificationRequest,
  SearchMetadata,
  PresentationMode,
  PresentationConfig,
  FilterChip,
  ProactiveAction,
  BehaviorSignal,
  SearchSessionRequest,
  SearchSessionResponse,
  SearchSessionStreamChunk,
} from '@/types/search-session';
