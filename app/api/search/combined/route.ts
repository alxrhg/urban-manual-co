/**
 * Combined Search API Route
 * 
 * POST /api/search/combined
 * 
 * Hybrid search combining keyword matching and semantic vector search.
 * Uses keyword search for initial candidates, then reranks with vector similarity.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateTextEmbedding } from '@/lib/ml/embeddings';
import { queryVectorIndex } from '@/lib/upstash-vector';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, limit = 20, filters = {} } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Step 1: Fast keyword search to get candidate IDs (top 100)
    let keywordQuery = supabase
      .from('destinations')
      .select('id, name, slug, city, country, category, image, michelin_stars, popularity_score')
      .or(`name.ilike.%${query}%,city.ilike.%${query}%,category.ilike.%${query}%,description.ilike.%${query}%`)
      .order('popularity_score', { ascending: false, nullsFirst: false })
      .limit(100);

    // Apply filters
    if (filters.city) {
      keywordQuery = keywordQuery.eq('city', filters.city);
    }
    if (filters.category) {
      keywordQuery = keywordQuery.eq('category', filters.category);
    }
    if (filters.country) {
      keywordQuery = keywordQuery.eq('country', filters.country);
    }

    const { data: candidates, error: keywordError } = await keywordQuery;

    if (keywordError) {
      console.error('Keyword search error:', keywordError);
      return NextResponse.json(
        { error: 'Failed to fetch candidates' },
        { status: 500 }
      );
    }

    if (!candidates || candidates.length === 0) {
      return NextResponse.json({
        query,
        results: [],
        total: 0,
        method: 'keyword',
      });
    }

    // Step 2: Get semantic similarity scores for candidates
    try {
      const { embedding } = await generateTextEmbedding(query);
      
      // Search vector index (returns top results with scores)
      const vectorResults = await queryVectorIndex(
        embedding,
        {
          topK: Math.min(limit * 2, 50),
          includeMetadata: true,
        }
      );

      // Map vector scores to candidates
      const scoresMap = new Map(
        vectorResults.map(r => [r.metadata.destination_id, r.score])
      );

      // Combine keyword results with vector scores
      const combinedResults = candidates
        .map(dest => ({
          ...dest,
          semantic_score: scoresMap.get(dest.id) || 0,
          keyword_match: true,
        }))
        .sort((a, b) => {
          // Rank by semantic score if available, otherwise by popularity
          if (a.semantic_score && b.semantic_score) {
            return b.semantic_score - a.semantic_score;
          }
          if (a.semantic_score) return -1;
          if (b.semantic_score) return 1;
          return (b.popularity_score || 0) - (a.popularity_score || 0);
        })
        .slice(0, limit);

      return NextResponse.json({
        query,
        results: combinedResults,
        total: combinedResults.length,
        method: 'hybrid',
        candidatesEvaluated: candidates.length,
      });

    } catch (vectorError) {
      console.error('Vector search failed, falling back to keyword only:', vectorError);
      
      // Fallback to keyword results only
      return NextResponse.json({
        query,
        results: candidates.slice(0, limit),
        total: candidates.length,
        method: 'keyword_fallback',
      });
    }

  } catch (error) {
    console.error('Combined search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
