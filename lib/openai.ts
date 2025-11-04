let OpenAILib: any = null;
try {
  // Dynamically import to avoid build errors if package not present in some environments
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  if (typeof require !== 'undefined') {
    OpenAILib = require('openai');
  }
} catch (_) {
  // Package not available - will be null
}

const apiKey = process.env.OPENAI_API_KEY;

export const openai = apiKey && OpenAILib ? new OpenAILib({ apiKey }) : null;

export const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
export const OPENAI_EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-large';


