/**
 * AI-powered alt text generation for images
 * Uses OpenAI Vision API (GPT-4o) to generate descriptive, accessible alt text
 */

import { getOpenAI, OPENAI_MODEL_VISION } from '../openai';

export interface AltTextOptions {
  /** Context about the image (e.g., "restaurant interior", "hotel exterior") */
  context?: string;
  /** Maximum length for the alt text (default: 125 characters for accessibility) */
  maxLength?: number;
  /** Include detailed description for complex images */
  detailed?: boolean;
}

export interface AltTextResult {
  altText: string;
  confidence: 'high' | 'medium' | 'low';
  tags?: string[];
}

/**
 * Generate accessible alt text for an image using AI vision
 * @param imageUrl - URL of the image to analyze
 * @param options - Configuration options for alt text generation
 * @returns Alt text result with confidence level
 */
export async function generateAltText(
  imageUrl: string,
  options: AltTextOptions = {}
): Promise<AltTextResult | null> {
  const openai = getOpenAI();
  if (!openai?.chat) {
    console.warn('[AltText] OpenAI client not available');
    return null;
  }

  const { context, maxLength = 125, detailed = false } = options;

  try {
    const systemPrompt = `You are an expert at writing accessible alt text for images. Your alt text should:
- Be concise yet descriptive (max ${maxLength} characters unless detailed mode)
- Focus on the main subject and purpose of the image
- Not start with "Image of" or "Picture of" - describe directly
- Include relevant details like colors, mood, or setting when helpful
- Be useful for screen reader users${detailed ? '\n- Provide additional context and visual details for complex images' : ''}

${context ? `Context: This image is related to ${context}. Consider this when describing the image.` : ''}

Return a JSON response with:
- altText: The generated alt text (string)
- confidence: "high", "medium", or "low" based on image clarity and content
- tags: Array of 3-5 relevant descriptive tags`;

    const userPrompt = detailed
      ? 'Generate detailed, accessible alt text for this image. Include visual details that help understand the scene.'
      : 'Generate concise, accessible alt text for this image.';

    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL_VISION,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: userPrompt },
            { type: 'image_url', image_url: { url: imageUrl } }
          ]
        }
      ],
      max_tokens: 300,
      temperature: 0.3
    });

    const text = response.choices?.[0]?.message?.content || '';

    try {
      // Try to parse as JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          altText: truncateAltText(parsed.altText, maxLength),
          confidence: parsed.confidence || 'medium',
          tags: parsed.tags || []
        };
      }
    } catch {
      // If not valid JSON, use the raw text as alt text
    }

    // Fallback: use the raw response as alt text
    return {
      altText: truncateAltText(text, maxLength),
      confidence: 'low',
      tags: []
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[AltText] Error generating alt text:', errorMessage);
    return null;
  }
}

/**
 * Generate alt text for a destination image with context
 */
export async function generateDestinationAltText(
  imageUrl: string,
  destination: {
    name?: string;
    category?: string;
    city?: string;
    country?: string;
  }
): Promise<string> {
  const context = [
    destination.category,
    destination.name,
    destination.city && destination.country
      ? `in ${destination.city}, ${destination.country}`
      : destination.city || destination.country
  ]
    .filter(Boolean)
    .join(' ');

  const result = await generateAltText(imageUrl, { context });

  // Fallback to descriptive text from destination data
  if (!result?.altText) {
    return buildFallbackAltText(destination);
  }

  return result.altText;
}

/**
 * Build fallback alt text from destination metadata when AI is unavailable
 */
export function buildFallbackAltText(destination: {
  name?: string;
  category?: string;
  city?: string;
  country?: string;
}): string {
  const parts: string[] = [];

  if (destination.name) {
    parts.push(destination.name);
  }

  if (destination.category) {
    parts.push(destination.category);
  }

  if (destination.city) {
    parts.push(`in ${destination.city}`);
    if (destination.country) {
      parts.push(destination.country);
    }
  } else if (destination.country) {
    parts.push(`in ${destination.country}`);
  }

  return parts.join(' - ') || 'Destination image';
}

/**
 * Truncate alt text to specified length, preserving word boundaries
 */
function truncateAltText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;

  // Truncate at word boundary
  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > maxLength * 0.8) {
    return truncated.substring(0, lastSpace);
  }

  return truncated;
}

/**
 * Batch generate alt text for multiple images
 * @param images - Array of image URLs with optional context
 * @returns Map of image URL to alt text result
 */
export async function batchGenerateAltText(
  images: Array<{ url: string; context?: string }>
): Promise<Map<string, AltTextResult | null>> {
  const results = new Map<string, AltTextResult | null>();

  // Process in parallel with concurrency limit
  const concurrencyLimit = 3;
  for (let i = 0; i < images.length; i += concurrencyLimit) {
    const batch = images.slice(i, i + concurrencyLimit);
    const batchResults = await Promise.all(
      batch.map(async (img) => {
        const result = await generateAltText(img.url, { context: img.context });
        return { url: img.url, result };
      })
    );

    for (const { url, result } of batchResults) {
      results.set(url, result);
    }
  }

  return results;
}
