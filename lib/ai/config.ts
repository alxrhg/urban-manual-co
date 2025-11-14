/**
 * AI Configuration
 * Centralized configuration for AI/ML features
 */

// Cache configuration
export const AI_CACHE_CONFIG = {
  // Cache TTL in milliseconds
  EMBEDDING_TTL: parseInt(process.env.AI_EMBEDDING_CACHE_TTL || '300000', 10), // 5 minutes default
  INTENT_TTL: parseInt(process.env.AI_INTENT_CACHE_TTL || '300000', 10), // 5 minutes default
  SEARCH_TTL: parseInt(process.env.AI_SEARCH_CACHE_TTL || '300000', 10), // 5 minutes default
  
  // Maximum cache sizes (LRU eviction)
  MAX_EMBEDDING_CACHE_SIZE: parseInt(process.env.AI_MAX_EMBEDDING_CACHE_SIZE || '100', 10),
  MAX_INTENT_CACHE_SIZE: parseInt(process.env.AI_MAX_INTENT_CACHE_SIZE || '100', 10),
  MAX_SEARCH_CACHE_SIZE: parseInt(process.env.AI_MAX_SEARCH_CACHE_SIZE || '100', 10),
} as const;

// Timeout configuration
export const AI_TIMEOUT_CONFIG = {
  EMBEDDING_GENERATION: parseInt(process.env.AI_EMBEDDING_TIMEOUT || '5000', 10), // 5 seconds
  INTENT_PARSING: parseInt(process.env.AI_INTENT_TIMEOUT || '4000', 10), // 4 seconds
  RESPONSE_GENERATION: parseInt(process.env.AI_RESPONSE_TIMEOUT || '5000', 10), // 5 seconds
  CONVERSATION: parseInt(process.env.AI_CONVERSATION_TIMEOUT || '5000', 10), // 5 seconds
} as const;

// Database query configuration
export const DB_QUERY_CONFIG = {
  // Batch size for bulk operations
  EMBEDDING_BATCH_SIZE: parseInt(process.env.DB_EMBEDDING_BATCH_SIZE || '50', 10),
  RECOMMENDATION_BATCH_SIZE: parseInt(process.env.DB_RECOMMENDATION_BATCH_SIZE || '100', 10),
  
  // Query limits
  MAX_SEARCH_RESULTS: parseInt(process.env.DB_MAX_SEARCH_RESULTS || '50', 10),
  MAX_ENRICHMENT_RESULTS: parseInt(process.env.DB_MAX_ENRICHMENT_RESULTS || '3', 10),
} as const;

// Performance monitoring
export const MONITORING_CONFIG = {
  ENABLED: process.env.AI_MONITORING_ENABLED === 'true',
  LOG_SLOW_QUERIES: process.env.AI_LOG_SLOW_QUERIES === 'true',
  SLOW_QUERY_THRESHOLD: parseInt(process.env.AI_SLOW_QUERY_THRESHOLD || '1000', 10), // 1 second
} as const;

// Rate limiting configuration
export const RATE_LIMIT_CONFIG = {
  ENABLED: process.env.AI_RATE_LIMIT_ENABLED !== 'false', // Enabled by default
  MAX_REQUESTS_PER_MINUTE: parseInt(process.env.AI_MAX_REQUESTS_PER_MINUTE || '30', 10),
  MAX_REQUESTS_PER_HOUR: parseInt(process.env.AI_MAX_REQUESTS_PER_HOUR || '500', 10),
} as const;

// Model configuration
export const MODEL_CONFIG = {
  OPENAI_EMBEDDING_MODEL: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-large',
  OPENAI_CHAT_MODEL: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  OPENAI_COMPLEX_MODEL: process.env.OPENAI_MODEL_COMPLEX || 'gpt-4.1',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-1.5-flash-latest',
  
  // Temperature settings
  INTENT_TEMPERATURE: parseFloat(process.env.AI_INTENT_TEMPERATURE || '0.2'),
  RESPONSE_TEMPERATURE: parseFloat(process.env.AI_RESPONSE_TEMPERATURE || '0.7'),
} as const;

// Feature flags
export const AI_FEATURES = {
  STREAMING_ENABLED: process.env.AI_STREAMING_ENABLED === 'true',
  ENRICHMENT_ENABLED: process.env.AI_ENRICHMENT_ENABLED !== 'false', // Enabled by default
  PERSONALIZATION_ENABLED: process.env.AI_PERSONALIZATION_ENABLED !== 'false', // Enabled by default
  COLLABORATIVE_FILTERING_ENABLED: process.env.AI_COLLABORATIVE_FILTERING_ENABLED !== 'false',
} as const;
