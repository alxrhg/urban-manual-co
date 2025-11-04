/**
 * Asimov Search Integration
 * 
 * Asimov is a semantic search service that provides:
 * - Semantic Search and Re-Ranker built-in
 * - Simple API integration
 * 
 * We use it as a fallback when vector search fails or embeddings aren't available.
 * 
 * Documentation: https://www.asimov.mov/
 */

interface AsimovSearchParams {
  query: string;
  limit?: number;
  params?: {
    category?: string;
    language?: string;
    city?: string;
  };
  recall?: number; // 0-100, how many results to recall
}

interface AsimovSearchResult {
  id?: string;
  content?: string;
  title?: string;
  url?: string;
  score?: number;
  metadata?: Record<string, any>;
}

/**
 * Search using Asimov API
 * Returns null if API key is not configured or search fails
 */
export async function searchAsimov(params: AsimovSearchParams): Promise<AsimovSearchResult[] | null> {
  const apiKey = process.env.ASIMOV_API_KEY;
  
  if (!apiKey) {
    console.log('[Asimov] API key not configured, skipping Asimov search');
    return null;
  }

  try {
    const response = await fetch('https://asimov.mov/api/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query: params.query,
        limit: params.limit || 20,
        params: params.params || {},
        recall: params.recall || 100,
      }),
    });

    if (!response.ok) {
      console.error('[Asimov] API error:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    
    // Asimov returns results in different formats depending on the plan
    // Handle both array and object with results array
    if (Array.isArray(data)) {
      return data;
    } else if (data.results && Array.isArray(data.results)) {
      return data.results;
    } else if (data.data && Array.isArray(data.data)) {
      return data.data;
    }

    return [];
  } catch (error) {
    console.error('[Asimov] Search error:', error);
    return null;
  }
}

/**
 * Convert Asimov results to Urban Manual destination format
 * This is a best-effort mapping - Asimov may not have all our destination data
 */
export function mapAsimovResultsToDestinations(
  asimovResults: AsimovSearchResult[],
  existingDestinations: any[] // Known destinations from our DB
): any[] {
  if (!asimovResults || asimovResults.length === 0) {
    return [];
  }

  // Try to match Asimov results to existing destinations by name/slug
  const matched: any[] = [];
  const unmatched: AsimovSearchResult[] = [];

  for (const result of asimovResults) {
    const title = result.title || result.content || '';
    const slug = result.metadata?.slug || 
                 title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    // Try to find matching destination
    const match = existingDestinations.find(dest => 
      dest.name?.toLowerCase() === title.toLowerCase() ||
      dest.slug === slug ||
      dest.name?.toLowerCase().includes(title.toLowerCase()) ||
      title.toLowerCase().includes(dest.name?.toLowerCase())
    );

    if (match) {
      // Enhance existing destination with Asimov score
      matched.push({
        ...match,
        _asimov_score: result.score || 0,
        _asimov_matched: true,
      });
    } else {
      unmatched.push(result);
    }
  }

  // For unmatched results, create minimal destination objects
  // These won't have full destination data but can be used for suggestions
  const synthetic = unmatched.map((result, index) => ({
    id: `asimov-${index}`,
    slug: result.metadata?.slug || `asimov-${index}`,
    name: result.title || result.content?.substring(0, 100) || 'Unknown',
    city: result.metadata?.city || result.params?.city || 'Unknown',
    category: result.metadata?.category || result.params?.category || 'Unknown',
    description: result.content?.substring(0, 200) || '',
    _asimov_score: result.score || 0,
    _asimov_matched: false,
    _is_synthetic: true, // Flag to indicate this is from Asimov, not our DB
  }));

  return [...matched, ...synthetic];
}

