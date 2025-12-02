let OpenAILib: any = null;
try {
  // Dynamically import to avoid build errors if package not present in some environments
   
  if (typeof require !== 'undefined') {
    OpenAILib = require('openai');
  }
} catch (error) {
  console.error('Failed to load OpenAI library:', error);
}

let _apiKey: string | undefined = process.env.OPENAI_API_KEY;
let _openai: any = null;

// Function to initialize/reinitialize OpenAI client
export function initOpenAI() {
  _apiKey = process.env.OPENAI_API_KEY;
  _openai = _apiKey && OpenAILib ? new OpenAILib({ apiKey: _apiKey }) : null;
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

// GPT-5 nano: Fastest, most cost-efficient GPT-5 model - ideal for search/intent detection
export const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5-nano';
// GPT-5: Full GPT-5 for complex reasoning tasks
export const OPENAI_MODEL_COMPLEX = process.env.OPENAI_MODEL_COMPLEX || 'gpt-5';
// GPT-4.1: Best non-reasoning model for vision/image analysis
export const OPENAI_MODEL_VISION = process.env.OPENAI_MODEL_VISION || 'gpt-4.1';
// text-embedding-3-large: 3072-dim embedding model (best quality)
// Note: Requires DB schema to support 3072 dimensions
export const OPENAI_EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-large';

/**
 * Determine if a query is complex and should use GPT-5
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


