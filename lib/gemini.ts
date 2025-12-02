/**
 * Gemini AI Client - Consolidated initialization
 *
 * Provides a single source of truth for Gemini AI client configuration.
 * Similar to lib/openai.ts for OpenAI.
 */

import { GoogleGenerativeAI, GenerativeModel, GenerationConfig } from '@google/generative-ai';

// API key resolution (check multiple env vars for flexibility)
const GOOGLE_API_KEY =
  process.env.GEMINI_API_KEY ||
  process.env.GOOGLE_API_KEY ||
  process.env.NEXT_PUBLIC_GOOGLE_API_KEY ||
  '';

// Model configuration - using stable model names (not "-latest" which is deprecated)
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
export const GEMINI_MODEL_PRO = process.env.GEMINI_MODEL_PRO || 'gemini-1.5-pro';

// Initialize client (lazy)
let _genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI | null {
  if (!GOOGLE_API_KEY) {
    return null;
  }
  if (!_genAI) {
    _genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
  }
  return _genAI;
}

/**
 * Check if Gemini is configured and available
 */
export function isGeminiAvailable(): boolean {
  return !!GOOGLE_API_KEY;
}

/**
 * Get a Gemini generative model with optional configuration
 */
export function getGeminiModel(config?: {
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  systemInstruction?: string;
}): GenerativeModel | null {
  const genAI = getGenAI();
  if (!genAI) {
    return null;
  }

  const generationConfig: GenerationConfig = {};
  if (config?.temperature !== undefined) {
    generationConfig.temperature = config.temperature;
  }
  if (config?.maxOutputTokens !== undefined) {
    generationConfig.maxOutputTokens = config.maxOutputTokens;
  }

  return genAI.getGenerativeModel({
    model: config?.model || GEMINI_MODEL,
    generationConfig,
    ...(config?.systemInstruction && { systemInstruction: config.systemInstruction }),
  });
}

/**
 * Generate text using Gemini
 */
export async function generateTextWithGemini(
  prompt: string,
  options?: {
    model?: string;
    temperature?: number;
    maxOutputTokens?: number;
    systemInstruction?: string;
  }
): Promise<string | null> {
  const model = getGeminiModel(options);
  if (!model) {
    return null;
  }

  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error('[Gemini] Text generation error:', error);
    return null;
  }
}

/**
 * Generate JSON using Gemini
 */
export async function generateJSONWithGemini(
  prompt: string,
  options?: {
    model?: string;
    temperature?: number;
  }
): Promise<any | null> {
  const genAI = getGenAI();
  if (!genAI) {
    return null;
  }

  try {
    const model = genAI.getGenerativeModel({
      model: options?.model || GEMINI_MODEL,
      generationConfig: {
        temperature: options?.temperature ?? 0.2,
        responseMimeType: 'application/json',
      },
    });
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return JSON.parse(text);
  } catch (error) {
    console.error('[Gemini] JSON generation error:', error);
    return null;
  }
}

/**
 * Generate streaming content using Gemini
 */
export async function* generateStreamWithGemini(
  prompt: string,
  options?: {
    model?: string;
    temperature?: number;
    maxOutputTokens?: number;
    systemInstruction?: string;
  }
): AsyncGenerator<string, void, unknown> {
  const model = getGeminiModel(options);
  if (!model) {
    return;
  }

  try {
    const result = await model.generateContentStream(prompt);
    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        yield text;
      }
    }
  } catch (error) {
    console.error('[Gemini] Streaming error:', error);
  }
}

// Export the raw client for advanced use cases
export const genAI = getGenAI();
