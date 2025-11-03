const apiKey = process.env.OPENAI_API_KEY;

let OpenAILib: any = null;
if (apiKey) {
  try {
    // Dynamically import only if key exists to avoid module resolution warnings
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    OpenAILib = require('openai');
  } catch (_) {}
}

export const openai = apiKey && OpenAILib ? new OpenAILib({ apiKey }) : null;

export const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5-turbo';
export const OPENAI_EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-large';


