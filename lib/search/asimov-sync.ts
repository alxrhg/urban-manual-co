/**
 * Asimov Content Sync
 * 
 * Functions to sync Urban Manual destinations to Asimov for indexing
 * 
 * Based on Asimov API: https://asimov.mov/
 * Endpoint: POST /api/content or /api/sources (depending on plan)
 */

const ASIMOV_API_URL = 'https://asimov.mov/api';

/**
 * Add content to Asimov
 * 
 * @param content - Content to add to Asimov
 * @returns true if successful, false otherwise
 */
export async function addContentToAsimov(content: {
  title: string;
  content: string;
  metadata?: Record<string, any>;
  url?: string;
}): Promise<boolean> {
  const apiKey = process.env.ASIMOV_API_KEY;
  
  if (!apiKey) {
    console.warn('[Asimov Sync] API key not configured');
    return false;
  }

  try {
    // Try standard content endpoint first
    let response = await fetch(`${ASIMOV_API_URL}/content`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(content),
    });

    // If that fails, try sources endpoint (some plans use this)
    if (!response.ok && response.status === 404) {
      response = await fetch(`${ASIMOV_API_URL}/sources`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          items: [content],
        }),
      });
    }

    if (!response.ok) {
      const error = await response.text();
      console.error(`[Asimov Sync] Failed to add content: ${response.status} - ${error}`);
      return false;
    }

    return true;
  } catch (error: any) {
    console.error('[Asimov Sync] Error:', error.message);
    return false;
  }
}

/**
 * Build searchable content from destination for Asimov
 */
export function buildDestinationContent(dest: any): {
  title: string;
  content: string;
  metadata: Record<string, any>;
  url: string;
} {
  // Combine all searchable text
  const contentParts = [
    dest.name,
    dest.description,
    dest.content,
    dest.city,
    dest.category,
    dest.country,
    dest.neighborhood,
    dest.architect,
    dest.brand,
    ...(dest.tags || []),
    ...(dest.ai_keywords || []),
    ...(dest.ai_vibe_tags || []),
    dest.ai_short_summary,
    dest.editorial_summary,
  ].filter(Boolean);

  const fullContent = contentParts.join(' ');

  return {
    title: dest.name,
    content: fullContent,
    metadata: {
      id: dest.id,
      slug: dest.slug,
      city: dest.city,
      category: dest.category,
      country: dest.country,
      rating: dest.rating,
      michelin_stars: dest.michelin_stars,
      price_level: dest.price_level,
      neighborhood: dest.neighborhood,
      tags: dest.tags || [],
    },
    url: `https://urbanmanual.co/destination/${dest.slug}`,
  };
}

/**
 * Sync a single destination to Asimov
 */
export async function syncDestinationToAsimov(destination: any): Promise<boolean> {
  const content = buildDestinationContent(destination);
  return await addContentToAsimov(content);
}
