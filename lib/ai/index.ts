/**
 * AI Module Exports
 *
 * Consolidated exports for AI-related functionality
 */

// Intent analysis
export { analyzeIntent } from "./intent-analysis";
export type { NLUResult, UserContext } from "./intent-analysis";
export { ADVANCED_NLU_SYSTEM_PROMPT } from "./advanced-nlu-prompt";

// Enhanced query parsing (new)
export {
  parseEnhancedQuery,
  parseQueryWithKeywords,
  getRequestedFilters,
  CUISINE_KEYWORDS,
  DIETARY_KEYWORDS,
  SEATING_KEYWORDS,
  AMENITY_KEYWORDS,
  VIBE_KEYWORDS,
  OCCASION_KEYWORDS,
} from "./enhanced-query-parser";
export type { EnhancedParsedQuery } from "./enhanced-query-parser";

// Enhanced response generation (new)
export {
  generateEnhancedResponse,
  analyzeMatchedFilters,
} from "./enhanced-response-generator";
export type {
  ResponseContext,
  MatchedFilter,
  UnmatchedFilter,
  AlternativeSuggestion,
  EnhancedResponse,
  RefinementChip,
} from "./enhanced-response-generator";

// System prompts
export {
  URBAN_MANUAL_EDITOR_SYSTEM_PROMPT,
  SUMMARISER_SYSTEM_PROMPT,
} from "./systemPrompts";
