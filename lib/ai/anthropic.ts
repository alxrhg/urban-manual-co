/**
 * Anthropic Claude Integration for Subtitle Generation
 *
 * Uses Claude to generate compelling, short subtitles for travel destinations.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { SubtitleGenerationInput } from '@/types/subtitle';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

/**
 * Generate a compelling subtitle for a destination using Claude
 *
 * @param input - Destination details for generating the subtitle
 * @returns A short, compelling subtitle (max 50 characters)
 */
export async function generateSubtitle(input: SubtitleGenerationInput): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }

  // Build context from available fields
  let context = input.description || '';
  if (input.architect) context += ` Designed by ${input.architect}.`;
  if (input.architectural_style) context += ` Style: ${input.architectural_style}.`;
  if (input.cuisine) context += ` Cuisine: ${input.cuisine}.`;

  const prompt = `You are a luxury travel copywriter for Urban Manual.

Generate a SINGLE, short, eye-catching subtitle for a travel destination card (max 50 characters including spaces).

Requirements:
- Compelling and specific
- Memorable and evocative
- Use style descriptors, designer names, experiences, or unique attributes
- Avoid generic phrases like "Hotel in [City]" or "[Category] in [City]"
- For hotels: mention architect/designer if available, style, or unique feature
- For restaurants: highlight cuisine style, experience, or signature aspect
- For culture: emphasize design, artist, or unique cultural experience

Destination: ${input.name}
Category: ${input.category}
Location: ${input.city}${input.country ? `, ${input.country}` : ''}
Context: ${context.trim() || 'No additional context available'}

Output ONLY the subtitle text, nothing else. No quotes, no explanation.`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 100,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  // Extract text from response
  const subtitle =
    message.content[0].type === 'text' ? message.content[0].text.trim() : '';

  // Validate and truncate if needed
  if (subtitle.length > 50) {
    return subtitle.substring(0, 47).trim() + '...';
  }

  return subtitle;
}

/**
 * Check if Anthropic API is configured and available
 */
export function isAnthropicConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}
