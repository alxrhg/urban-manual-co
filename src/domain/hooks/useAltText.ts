/**
 * Hook for AI-powered alt text generation
 * Generates accessible alt text for images using OpenAI Vision
 */

import { useState, useCallback, useEffect, useRef } from 'react';

interface AltTextResult {
  altText: string;
  confidence: 'high' | 'medium' | 'low';
  tags?: string[];
}

interface DestinationContext {
  name?: string;
  category?: string;
  city?: string;
  country?: string;
}

interface UseAltTextOptions {
  /** Image URL to generate alt text for */
  imageUrl?: string | null;
  /** Fallback alt text if AI generation fails */
  fallback?: string;
  /** Context about the image type */
  context?: string;
  /** Destination metadata for destination images */
  destination?: DestinationContext;
  /** Maximum length for the alt text */
  maxLength?: number;
  /** Whether to generate detailed alt text */
  detailed?: boolean;
  /** Whether to auto-fetch on mount */
  autoFetch?: boolean;
  /** Skip fetching if fallback is sufficient */
  skipIfFallback?: boolean;
}

interface UseAltTextReturn {
  /** The generated alt text (or fallback) */
  altText: string;
  /** Whether alt text is being fetched */
  loading: boolean;
  /** Error message if generation failed */
  error: string | null;
  /** Confidence level of the generated alt text */
  confidence: 'high' | 'medium' | 'low' | null;
  /** Relevant tags extracted from the image */
  tags: string[];
  /** Manually trigger alt text generation */
  generate: () => Promise<void>;
  /** Whether the alt text is from AI or fallback */
  isAIGenerated: boolean;
}

// Cache for generated alt texts to avoid redundant API calls
const altTextCache = new Map<string, AltTextResult>();

/**
 * Build fallback alt text from destination metadata
 */
function buildFallbackAltText(destination?: DestinationContext): string {
  if (!destination) return '';

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

  return parts.join(' - ');
}

export function useAltText(options: UseAltTextOptions): UseAltTextReturn {
  const {
    imageUrl,
    fallback = '',
    context,
    destination,
    maxLength,
    detailed = false,
    autoFetch = false,
    skipIfFallback = true
  } = options;

  const [result, setResult] = useState<AltTextResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  // Compute effective fallback
  const effectiveFallback = fallback || buildFallbackAltText(destination);

  const generate = useCallback(async () => {
    if (!imageUrl) {
      setError('No image URL provided');
      return;
    }

    // Check cache first
    const cached = altTextCache.get(imageUrl);
    if (cached) {
      setResult(cached);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/alt-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          imageUrl,
          context,
          destination,
          maxLength,
          detailed
        })
      });

      if (response.ok) {
        const data = await response.json();
        const altTextResult: AltTextResult = {
          altText: data.altText,
          confidence: data.confidence || 'medium',
          tags: data.tags || []
        };

        // Cache the result
        altTextCache.set(imageUrl, altTextResult);
        setResult(altTextResult);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error || 'Failed to generate alt text');
      }
    } catch (err) {
      console.error('[useAltText] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate alt text');
    } finally {
      setLoading(false);
    }
  }, [imageUrl, context, destination, maxLength, detailed]);

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch && imageUrl && !fetchedRef.current) {
      // Skip if we have a good fallback and skipIfFallback is true
      if (skipIfFallback && effectiveFallback) {
        return;
      }

      fetchedRef.current = true;
      generate();
    }
  }, [autoFetch, imageUrl, effectiveFallback, skipIfFallback, generate]);

  // Reset when image URL changes
  useEffect(() => {
    fetchedRef.current = false;
    setResult(null);
    setError(null);
  }, [imageUrl]);

  return {
    altText: result?.altText || effectiveFallback,
    loading,
    error,
    confidence: result?.confidence || null,
    tags: result?.tags || [],
    generate,
    isAIGenerated: !!result?.altText
  };
}

/**
 * Hook for batch alt text generation
 */
export function useBatchAltText(
  images: Array<{ url: string; context?: string }>
): {
  results: Map<string, AltTextResult | null>;
  loading: boolean;
  error: string | null;
  generate: () => Promise<void>;
} {
  const [results, setResults] = useState<Map<string, AltTextResult | null>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async () => {
    if (images.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/alt-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ images })
      });

      if (response.ok) {
        const data = await response.json();
        const newResults = new Map<string, AltTextResult | null>();

        for (const [url, result] of Object.entries(data.results)) {
          newResults.set(url, result as AltTextResult | null);
          // Also cache individual results
          if (result) {
            altTextCache.set(url, result as AltTextResult);
          }
        }

        setResults(newResults);
      } else {
        setError('Failed to generate alt text');
      }
    } catch (err) {
      console.error('[useBatchAltText] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate alt text');
    } finally {
      setLoading(false);
    }
  }, [images]);

  return {
    results,
    loading,
    error,
    generate
  };
}

/**
 * Clear the alt text cache
 */
export function clearAltTextCache(): void {
  altTextCache.clear();
}

/**
 * Get cached alt text for an image URL
 */
export function getCachedAltText(imageUrl: string): AltTextResult | undefined {
  return altTextCache.get(imageUrl);
}
