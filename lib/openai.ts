let OpenAILib: any = null;
try {
  // Dynamically import to avoid build errors if package not present in some environments
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  if (typeof require !== 'undefined') {
    OpenAILib = require('openai');
  }
} catch (error) {
  console.error('Failed to load OpenAI library:', error);
}

let _apiKey: string | undefined = process.env.OPENAI_API_KEY;
let _openai: any = null;

export type EmbeddingProviderHints = {
  model: string;
  dimensions?: number;
  truncate?: string;
  pooling?: string;
};

const DEFAULT_EMBEDDING_HINTS: EmbeddingProviderHints = {
  model: 'text-embedding-3-large',
  dimensions: 1536,
  truncate: 'END',
};

function parseDimension(value?: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function resolveEmbeddingHints(): EmbeddingProviderHints {
  return {
    ...DEFAULT_EMBEDDING_HINTS,
    model: process.env.OPENAI_EMBEDDING_MODEL || DEFAULT_EMBEDDING_HINTS.model,
    dimensions: parseDimension(process.env.OPENAI_EMBEDDING_DIMENSIONS) ?? DEFAULT_EMBEDDING_HINTS.dimensions,
    truncate: process.env.OPENAI_EMBEDDING_TRUNCATE || DEFAULT_EMBEDDING_HINTS.truncate,
    pooling: process.env.OPENAI_EMBEDDING_POOLING || DEFAULT_EMBEDDING_HINTS.pooling,
  };
}

let _embeddingHints = resolveEmbeddingHints();
export let OPENAI_EMBEDDING_MODEL = _embeddingHints.model;
export let OPENAI_EMBEDDING_DIMENSIONS = _embeddingHints.dimensions;
export let OPENAI_EMBEDDING_HINTS: EmbeddingProviderHints = _embeddingHints;

function refreshEmbeddingHints() {
  _embeddingHints = resolveEmbeddingHints();
  OPENAI_EMBEDDING_MODEL = _embeddingHints.model;
  OPENAI_EMBEDDING_DIMENSIONS = _embeddingHints.dimensions;
  OPENAI_EMBEDDING_HINTS = _embeddingHints;
}

// Function to initialize/reinitialize OpenAI client
export function initOpenAI() {
  _apiKey = process.env.OPENAI_API_KEY;
  _openai = _apiKey && OpenAILib ? new OpenAILib({ apiKey: _apiKey }) : null;
  refreshEmbeddingHints();
  return _openai;
}

// Initialize on first load
_initOpenAI();

function _initOpenAI() {
  _openai = initOpenAI();
}

export const openai = {
  get embeddings() {
    if (!_openai) {
      _openai = initOpenAI();
    }
    return _openai?.embeddings || null;
  },
  get chat() {
    if (!_openai) {
      _openai = initOpenAI();
    }
    return _openai?.chat || null;
  },
  get beta() {
    if (!_openai) {
      _openai = initOpenAI();
    }
    return _openai?.beta || null;
  },
  get audio() {
    if (!_openai) {
      _openai = initOpenAI();
    }
    return _openai?.audio || null;
  }
};

// Also export direct access for compatibility
export const getOpenAI = () => {
  if (!_openai) {
    _openai = initOpenAI();
  }
  return _openai;
};

export const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
export const OPENAI_MODEL_COMPLEX = process.env.OPENAI_MODEL_COMPLEX || 'gpt-4.1'; // For complex queries
export const OPENAI_MODEL_VISION = process.env.OPENAI_MODEL_VISION || 'gpt-4o'; // For image analysis

export function getOpenAIEmbeddingConfig(): EmbeddingProviderHints {
  return { ..._embeddingHints };
}

/**
 * Determine if a query is complex and should use GPT-4.1
 * Complex queries: long, multi-part, reasoning, comparisons, planning
 */
export function isComplexQuery(query: string, conversationHistory: Array<{role: string, content: string}> = []): boolean {
  const queryLength = query.length;
  const wordCount = query.split(/\s+/).length;
  
  // Long queries (more than 50 words or 300 characters)
  if (wordCount > 50 || queryLength > 300) {
    return true;
  }
  
  // Multi-part queries (contains "and", "also", "plus", multiple questions)
  const multiPartIndicators = /\b(and|also|plus|additionally|furthermore|moreover)\b/i;
  const questionCount = (query.match(/\?/g) || []).length;
  if (multiPartIndicators.test(query) || questionCount > 1) {
    return true;
  }
  
  // Reasoning/comparison queries
  const reasoningKeywords = /\b(compare|difference|better|best|why|how|explain|analyze|plan|itinerary|recommend|suggest)\b/i;
  if (reasoningKeywords.test(query)) {
    return true;
  }
  
  // Complex conversation context
  if (conversationHistory.length > 3) {
    return true;
  }
  
  // Planning queries
  const planningKeywords = /\b(itinerary|plan|schedule|trip|visit|days|weekend|vacation)\b/i;
  if (planningKeywords.test(query)) {
    return true;
  }
  
  return false;
}

/**
 * Get the appropriate model for a query
 */
export function getModelForQuery(query: string, conversationHistory: Array<{role: string, content: string}> = []): string {
  if (isComplexQuery(query, conversationHistory)) {
    return OPENAI_MODEL_COMPLEX;
  }
  return OPENAI_MODEL;
}


