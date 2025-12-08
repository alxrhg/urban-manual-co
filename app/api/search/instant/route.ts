/**
 * Instant Search API - Fast preview results as user types
 *
 * Features:
 * - Fast vector search (preview, top 5)
 * - Search user's saved places
 * - Search user's visited places
 * - Search user's trips
 * - Smart autocomplete with recent searches
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { withErrorHandling } from '@/lib/errors';
import { queryVectorIndex, VectorSearchResult } from '@/lib/upstash-vector';
import { generateTextEmbedding } from '@/lib/ml/embeddings';

interface InstantResult {
  type: 'destination' | 'saved' | 'visited' | 'trip' | 'suggestion';
  id: string | number;
  name: string;
  subtitle: string;
  city?: string;
  category?: string;
  slug?: string;
  image?: string;
  score?: number;
  tripId?: string;
}

interface InstantSearchResponse {
  results: InstantResult[];
  suggestions: string[];
  meta: {
    query: string;
    hasMore: boolean;
    sources: string[];
  };
}

export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';

  if (!query || query.length < 2) {
    return NextResponse.json({
      results: [],
      suggestions: [],
      meta: { query, hasMore: false, sources: [] },
    });
  }

  const supabase = await createServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;

  const results: InstantResult[] = [];
  const sources: string[] = [];

  // Run searches in parallel for speed
  const [vectorResults, textSearchResults, savedResults, visitedResults, tripResults] = await Promise.all([
    // 1. Fast vector search (top 5)
    (async () => {
      try {
        const embeddingResult = await generateTextEmbedding(query);
        const embedding = embeddingResult.embedding;

        const vectorHits = await queryVectorIndex(embedding, {
          topK: 5,
          includeMetadata: true,
        });

        if (vectorHits && vectorHits.length > 0) {
          sources.push('search');
          const ids = vectorHits.map((r: VectorSearchResult) => r.metadata.destination_id);
          const { data: destinations } = await supabase
            .from('destinations')
            .select('id, name, city, category, slug, image')
            .in('id', ids);

          if (destinations) {
            return destinations.map((d): InstantResult => ({
              type: 'destination',
              id: d.id,
              name: d.name,
              subtitle: `${d.category} in ${d.city}`,
              city: d.city,
              category: d.category,
              slug: d.slug,
              image: d.image,
              score: vectorHits.find((v: VectorSearchResult) => v.metadata.destination_id === d.id)?.score,
            }));
          }
        }
        return [];
      } catch (e) {
        console.error('Vector search failed:', e);
        return [];
      }
    })(),

    // 1b. Fallback text search (in case vector search fails or misses exact matches)
    (async () => {
      try {
        const { data: textResults } = await supabase
          .from('destinations')
          .select('id, name, city, category, slug, image')
          .or(`name.ilike.%${query}%,city.ilike.%${query}%`)
          .limit(5);

        if (textResults && textResults.length > 0) {
          return textResults.map((d): InstantResult => ({
            type: 'destination',
            id: d.id,
            name: d.name,
            subtitle: `${d.category} in ${d.city}`,
            city: d.city,
            category: d.category,
            slug: d.slug,
            image: d.image,
            score: 0.5, // Lower score than vector results
          }));
        }
        return [];
      } catch (e) {
        console.error('Text search failed:', e);
        return [];
      }
    })(),

    // 2. Search user's saved places
    userId ? (async () => {
      try {
        const { data: saved } = await supabase
          .from('saved_places')
          .select(`
            id,
            destination_slug,
            notes,
            destinations!inner(id, name, city, category, slug, image)
          `)
          .eq('user_id', userId)
          .or(`notes.ilike.%${query}%,destinations.name.ilike.%${query}%,destinations.city.ilike.%${query}%`)
          .limit(3);

        if (saved && saved.length > 0) {
          sources.push('saved');
          return saved.map((s: any): InstantResult => ({
            type: 'saved',
            id: s.destinations.id,
            name: s.destinations.name,
            subtitle: `Saved • ${s.destinations.city}`,
            city: s.destinations.city,
            category: s.destinations.category,
            slug: s.destinations.slug,
            image: s.destinations.image,
          }));
        }
        return [];
      } catch (e) {
        console.error('Saved places search failed:', e);
        return [];
      }
    })() : Promise.resolve([]),

    // 3. Search user's visited places
    userId ? (async () => {
      try {
        const { data: visited } = await supabase
          .from('visited_places')
          .select(`
            id,
            destination_slug,
            rating,
            destinations!inner(id, name, city, category, slug, image)
          `)
          .eq('user_id', userId)
          .or(`destinations.name.ilike.%${query}%,destinations.city.ilike.%${query}%`)
          .limit(3);

        if (visited && visited.length > 0) {
          sources.push('visited');
          return visited.map((v: any): InstantResult => ({
            type: 'visited',
            id: v.destinations.id,
            name: v.destinations.name,
            subtitle: `Visited${v.rating ? ` • ${v.rating}★` : ''} • ${v.destinations.city}`,
            city: v.destinations.city,
            category: v.destinations.category,
            slug: v.destinations.slug,
            image: v.destinations.image,
          }));
        }
        return [];
      } catch (e) {
        console.error('Visited places search failed:', e);
        return [];
      }
    })() : Promise.resolve([]),

    // 4. Search user's trips
    userId ? (async () => {
      try {
        const { data: trips } = await supabase
          .from('trips')
          .select('id, title, destination, start_date, cover_image')
          .eq('user_id', userId)
          .or(`title.ilike.%${query}%,destination.ilike.%${query}%`)
          .limit(2);

        if (trips && trips.length > 0) {
          sources.push('trips');
          return trips.map((t): InstantResult => ({
            type: 'trip',
            id: t.id,
            name: t.title || t.destination,
            subtitle: `Trip • ${t.destination}${t.start_date ? ` • ${new Date(t.start_date).toLocaleDateString()}` : ''}`,
            city: t.destination,
            image: t.cover_image,
            tripId: t.id,
          }));
        }
        return [];
      } catch (e) {
        console.error('Trips search failed:', e);
        return [];
      }
    })() : Promise.resolve([]),
  ]);

  // Combine results, prioritizing saved/visited (personal), then vector search, then text search
  const seen = new Set<string>();

  // Add saved places first
  for (const r of savedResults) {
    if (r.slug && !seen.has(r.slug)) {
      results.push(r);
      seen.add(r.slug);
    }
  }

  // Add visited places
  for (const r of visitedResults) {
    if (r.slug && !seen.has(r.slug)) {
      results.push(r);
      seen.add(r.slug);
    }
  }

  // Add trips
  for (const r of tripResults) {
    results.push(r);
  }

  // Add vector search results
  for (const r of vectorResults) {
    if (r.slug && !seen.has(r.slug)) {
      results.push(r);
      seen.add(r.slug);
    }
  }

  // Add text search results (fallback for exact name matches)
  for (const r of textSearchResults) {
    if (r.slug && !seen.has(r.slug)) {
      results.push(r);
      seen.add(r.slug);
      if (!sources.includes('text')) sources.push('text');
    }
  }

  // Generate smart suggestions based on query
  const suggestions = generateSmartSuggestions(query, results);

  return NextResponse.json({
    results: results.slice(0, 8), // Max 8 instant results
    suggestions: suggestions.slice(0, 4),
    meta: {
      query,
      hasMore: results.length > 8 || vectorResults.length >= 5,
      sources,
    },
  } as InstantSearchResponse);
});

function generateSmartSuggestions(query: string, results: InstantResult[]): string[] {
  const suggestions: string[] = [];
  const lowerQuery = query.toLowerCase();

  // City-based suggestions
  const cities = ['Tokyo', 'Kyoto', 'New York', 'London', 'Paris', 'Taipei', 'Singapore', 'Hong Kong'];
  for (const city of cities) {
    if (city.toLowerCase().includes(lowerQuery) || lowerQuery.includes(city.toLowerCase())) {
      suggestions.push(`Restaurants in ${city}`);
      suggestions.push(`Hotels in ${city}`);
      suggestions.push(`Plan my day in ${city}`);
      break;
    }
  }

  // Category suggestions
  const categories = ['restaurant', 'hotel', 'bar', 'cafe', 'shop'];
  for (const cat of categories) {
    if (lowerQuery.includes(cat)) {
      suggestions.push(`Best ${cat}s in Tokyo`);
      suggestions.push(`${cat.charAt(0).toUpperCase() + cat.slice(1)}s in Paris`);
      break;
    }
  }

  // Vibe suggestions
  if (lowerQuery.includes('romantic') || lowerQuery.includes('date')) {
    suggestions.push('Romantic restaurants in Tokyo');
    suggestions.push('Date night spots');
  }
  if (lowerQuery.includes('coffee') || lowerQuery.includes('cafe')) {
    suggestions.push('Best coffee in Tokyo');
    suggestions.push('Specialty coffee shops');
  }

  // If results exist, suggest exploration
  if (results.length > 0) {
    const city = results[0].city;
    if (city && !suggestions.some(s => s.includes(city))) {
      suggestions.push(`More in ${city}`);
    }
  }

  // Fallback suggestions
  if (suggestions.length === 0) {
    suggestions.push('Restaurants in Tokyo');
    suggestions.push('Hotels in Paris');
    suggestions.push('Plan my day in New York');
    suggestions.push('Best cafes in London');
  }

  return [...new Set(suggestions)]; // Dedupe
}
