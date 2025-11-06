import { config } from 'dotenv';

config();

export const AI_CONFIG = {
  // OpenAI configuration (fallback)
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  },

  // Anthropic Claude configuration (primary - most admired LLM!)
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
  },

  // Database configuration
  database: {
    url: process.env.DATABASE_URL || process.env.POSTGRES_URL || '',
  },

  // Agent configuration
  agent: {
    verbose: process.env.AGENT_VERBOSE === 'true',
    temperature: parseFloat(process.env.AGENT_TEMPERATURE || '0.7'),
    maxIterations: parseInt(process.env.AGENT_MAX_ITERATIONS || '10'),
  },
};

export const validateConfig = () => {
  const errors: string[] = [];

  if (!AI_CONFIG.openai.apiKey && !AI_CONFIG.anthropic.apiKey) {
    errors.push('Either OPENAI_API_KEY or ANTHROPIC_API_KEY must be set');
  }

  if (!AI_CONFIG.database.url) {
    errors.push('DATABASE_URL or POSTGRES_URL must be set');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration errors:\n${errors.join('\n')}`);
  }
};

export const getLLM = () => {
  // Prefer Claude Sonnet (most admired LLM in 2025 survey!)
  if (AI_CONFIG.anthropic.apiKey) {
    return {
      provider: 'anthropic' as const,
      model: AI_CONFIG.anthropic.model,
      apiKey: AI_CONFIG.anthropic.apiKey,
    };
  }

  // Fallback to OpenAI
  return {
    provider: 'openai' as const,
    model: AI_CONFIG.openai.model,
    apiKey: AI_CONFIG.openai.apiKey,
  };
};
