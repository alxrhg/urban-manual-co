/**
 * Vector Search Utilities for MCP Server
 *
 * Provides semantic search capabilities using Upstash Vector.
 */

import { Index } from "@upstash/vector";

// Initialize Upstash Vector client
let vectorIndex: Index | null = null;

interface VectorSearchOptions {
  city?: string;
  category?: string;
  limit?: number;
}

interface VectorSearchResult {
  slug: string;
  name: string;
  city: string;
  category: string;
  micro_description?: string;
  description?: string;
  rating?: number;
  image?: string;
  latitude?: number;
  longitude?: number;
  score?: number;
  price_level?: number;
}

/**
 * Get or create the Upstash Vector index client
 */
function getVectorIndex(): Index | null {
  if (vectorIndex) {
    return vectorIndex;
  }

  const url = process.env.UPSTASH_VECTOR_REST_URL;
  const token = process.env.UPSTASH_VECTOR_REST_TOKEN;

  if (!url || !token) {
    console.warn("[MCP Server] Upstash Vector not configured, semantic search disabled");
    return null;
  }

  vectorIndex = new Index({
    url,
    token,
  });

  return vectorIndex;
}

/**
 * Generate embeddings for a query using OpenAI
 */
async function generateEmbedding(text: string): Promise<number[] | null> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.warn("[MCP Server] OpenAI API key not configured for embeddings");
    return null;
  }

  try {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        input: text,
        model: "text-embedding-3-small",
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error("[MCP Server] Failed to generate embedding:", error);
    return null;
  }
}

/**
 * Search for destinations using semantic similarity
 */
export async function searchVectors(
  query: string,
  options: VectorSearchOptions = {}
): Promise<VectorSearchResult[]> {
  const { city, category, limit = 10 } = options;

  const index = getVectorIndex();

  if (!index) {
    // Fallback to basic search if vector not available
    return fallbackSearch(query, options);
  }

  // Generate embedding for the query
  const embedding = await generateEmbedding(query);

  if (!embedding) {
    return fallbackSearch(query, options);
  }

  try {
    // Build filter if city or category specified
    let filter: string | undefined;
    const filters: string[] = [];

    if (city) {
      filters.push(`city = '${city}'`);
    }
    if (category) {
      filters.push(`category = '${category}'`);
    }

    if (filters.length > 0) {
      filter = filters.join(" AND ");
    }

    // Query the vector index
    const results = await index.query({
      vector: embedding,
      topK: limit,
      includeMetadata: true,
      filter,
    });

    // Map results to our format
    return results.map((result) => ({
      slug: (result.metadata?.slug as string) || result.id,
      name: (result.metadata?.name as string) || "",
      city: (result.metadata?.city as string) || "",
      category: (result.metadata?.category as string) || "",
      micro_description: result.metadata?.micro_description as string | undefined,
      description: result.metadata?.description as string | undefined,
      rating: result.metadata?.rating as number | undefined,
      image: result.metadata?.image as string | undefined,
      latitude: result.metadata?.latitude as number | undefined,
      longitude: result.metadata?.longitude as number | undefined,
      score: result.score,
    }));
  } catch (error) {
    console.error("[MCP Server] Vector search failed:", error);
    return fallbackSearch(query, options);
  }
}

/**
 * Fallback search when vector search is not available
 * Uses basic text matching via Supabase
 */
async function fallbackSearch(
  query: string,
  options: VectorSearchOptions
): Promise<VectorSearchResult[]> {
  const { city, category, limit = 10 } = options;

  // Import Supabase here to avoid circular dependency
  const { createServiceClient } = await import("./supabase.js");
  const supabase = createServiceClient();

  let dbQuery = supabase
    .from("destinations")
    .select("slug, name, city, category, micro_description, description, rating, image, latitude, longitude")
    .limit(limit * 2); // Get more to filter

  if (city) {
    dbQuery = dbQuery.ilike("city", `%${city}%`);
  }
  if (category) {
    dbQuery = dbQuery.ilike("category", `%${category}%`);
  }

  // Basic text search
  dbQuery = dbQuery.or(
    `name.ilike.%${query}%,micro_description.ilike.%${query}%,description.ilike.%${query}%`
  );

  const { data, error } = await dbQuery;

  if (error) {
    console.error("[MCP Server] Fallback search failed:", error);
    return [];
  }

  // Score results based on match quality
  const scored = (data || []).map((d) => {
    let score = 0;
    const queryLower = query.toLowerCase();

    if (d.name?.toLowerCase().includes(queryLower)) score += 0.5;
    if (d.micro_description?.toLowerCase().includes(queryLower)) score += 0.3;
    if (d.description?.toLowerCase().includes(queryLower)) score += 0.2;

    return { ...d, score };
  });

  // Sort by score and limit
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Check if vector search is available
 */
export function isVectorSearchAvailable(): boolean {
  return !!(
    process.env.UPSTASH_VECTOR_REST_URL &&
    process.env.UPSTASH_VECTOR_REST_TOKEN &&
    process.env.OPENAI_API_KEY
  );
}
