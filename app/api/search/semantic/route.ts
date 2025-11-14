/**
 * Semantic Search API Route
 * 
 * POST /api/search/semantic
 * 
 * Performs semantic search using Upstash Vector and returns full destination data from Supabase.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateTextEmbedding } from '@/lib/ml/embeddings';
import { queryVectorIndex } from '@/lib/upstash-vector';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, limit = 10, filters = {} } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required and must be a string' },
        { status: 400 }
      );
    }

    // Step 1: Generate embedding for the query
    const { embedding } = await generateTextEmbedding(query);

    // Step 2: Build filter string for Upstash Vector
    let filterString: string | undefined;
    if (filters.city) {
      filterString = `city = "${filters.city}"`;
    } else if (filters.category) {
      filterString = `category = "${filters.category}"`;
    }

    // Step 3: Query Upstash Vector
    const vectorResults = await queryVectorIndex(embedding, {
      topK: limit,
      filter: filterString,
      includeMetadata: true,
    });

    if (vectorResults.length === 0) {
      return NextResponse.json({
        results: [],
        count: 0,
        message: 'No results found',
      });
    }

    // Step 4: Fetch full destination data from Supabase
    const destinationIds = vectorResults.map(r => r.metadata.destination_id);
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: destinations, error } = await supabase
      .from('destinations')
      .select('*')
      .in('id', destinationIds);

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch destination details' },
        { status: 500 }
      );
    }

    // Step 5: Merge vector scores with destination data
    const resultsWithScores = destinations?.map(dest => {
      const vectorResult = vectorResults.find(
        r => r.metadata.destination_id === dest.id
      );
      return {
        ...dest,
        similarity_score: vectorResult?.score ?? 0,
      };
    }) || [];

    // Sort by similarity score (descending)
    resultsWithScores.sort((a, b) => b.similarity_score - a.similarity_score);

    return NextResponse.json({
      results: resultsWithScores,
      count: resultsWithScores.length,
      query,
    });

  } catch (error) {
    console.error('Semantic search error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
