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
  }
};

// Also export direct access for compatibility
export const getOpenAI = () => {
  if (!_openai) {
    _openai = initOpenAI();
  }
  return _openai;
};

// GPT-5 Nano: 8x faster (<150ms), 3x cheaper ($0.05/1M), released Aug 2025
export const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5-nano';
export const OPENAI_EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-large';


