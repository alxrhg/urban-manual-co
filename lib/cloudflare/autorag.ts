/**
 * Cloudflare AutoRAG Integration
 * 
 * Provides utilities for querying Cloudflare AutoRAG instances
 * for conversational AI and knowledge base Q&A.
 */

interface AutoRAGQueryOptions {
  query: string;
  max_results?: number;
  rewrite_query?: boolean;
  min_score?: number;
}

interface AutoRAGResult {
  content: string;
  score: number;
  metadata?: {
    source?: string;
    [key: string]: any;
  };
}

interface AutoRAGResponse {
  results: AutoRAGResult[];
  query?: string;
  rewritten_query?: string;
}

/**
 * Query Cloudflare AutoRAG instance
 */
export async function queryAutoRAG(
  query: string,
  options: {
    max_results?: number;
    rewrite_query?: boolean;
    min_score?: number;
  } = {}
): Promise<AutoRAGResponse> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const instanceId = process.env.AUTORAG_INSTANCE_ID;

  if (!accountId || !apiToken || !instanceId) {
    throw new Error(
      'Missing AutoRAG configuration. Please set:\n' +
      '  - CLOUDFLARE_ACCOUNT_ID\n' +
      '  - CLOUDFLARE_API_TOKEN\n' +
      '  - AUTORAG_INSTANCE_ID'
    );
  }

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/autorag/${instanceId}/query`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      max_results: options.max_results || 10,
      rewrite_query: options.rewrite_query !== false, // Default to true
      min_score: options.min_score || 0.5,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`AutoRAG query failed: ${response.status} ${error}`);
  }

  const data = await response.json();
  return data.result;
}

/**
 * Format AutoRAG results for display
 */
export function formatAutoRAGResults(results: AutoRAGResult[]): string {
  if (results.length === 0) {
    return 'No relevant information found.';
  }

  const formatted = results.map((result, index) => {
    const source = result.metadata?.source || 'Unknown source';
    return `[${index + 1}] ${result.content}\n   Source: ${source} (Score: ${result.score.toFixed(2)})`;
  });

  return formatted.join('\n\n');
}

/**
 * Get the best result from AutoRAG (highest score)
 */
export function getBestResult(results: AutoRAGResult[]): AutoRAGResult | null {
  if (results.length === 0) return null;
  
  return results.reduce((best, current) => 
    current.score > best.score ? current : best
  );
}

/**
 * Combine AutoRAG results into a single answer
 */
export function combineResults(results: AutoRAGResult[]): string {
  if (results.length === 0) {
    return 'I couldn\'t find relevant information about that.';
  }

  // Use the best result as the primary answer
  const best = getBestResult(results);
  if (!best) return 'I couldn\'t find relevant information about that.';

  // If there are multiple high-quality results, combine them
  const highQualityResults = results.filter(r => r.score >= 0.7);
  
  if (highQualityResults.length > 1) {
    const combined = highQualityResults
      .map(r => r.content)
      .join('\n\n');
    return combined;
  }

  return best.content;
}

