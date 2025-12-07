/**
 * Intelligence Services Index
 *
 * Centralized exports for all travel intelligence capabilities.
 */

// Core intent analysis
export { intentAnalysisService, EnhancedIntent, IntentAnalysisService } from './intent-analysis';
export { deepIntentAnalysisService, DeepIntentAnalysisService, MultiIntentResult } from './deep-intent-analysis';

// Creative intelligence (outside-the-box thinking)
export {
  creativeIntelligenceService,
  CreativeIntelligenceService,
  CreativeIntent,
  CreativeIntentType,
  CreativeRecommendation,
} from './creative-intelligence';

// Cross-domain intelligence (unexpected connections)
export {
  crossDomainIntelligenceService,
  CrossDomainIntelligenceService,
  DomainConnection,
  ConnectionType,
  CrossDomainRecommendation,
} from './cross-domain-intelligence';

// Proactive suggestions engine
export {
  proactiveSuggestionsEngine,
  ProactiveSuggestionsEngine,
  ProactiveSuggestion,
  ProactiveSuggestionType,
  ProactiveContext,
} from './proactive-suggestions';

// Recommendations
export { advancedRecommendationEngine, AdvancedRecommendationEngine } from './recommendations-advanced';

// Search ranking
export { searchRankingService } from './search-ranking';

// Rich query context
export { richQueryContextService } from './rich-query-context';

// Conversation memory
export { conversationMemoryService } from './conversation-memory';
