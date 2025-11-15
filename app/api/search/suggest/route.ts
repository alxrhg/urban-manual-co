/**
 * Search Suggest API Route
 * 
 * GET /api/search/suggest?q=paris
 * 
 * Fast typeahead suggestions using keyword matching.
 * Returns destination names, cities, and categories that match the query.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: 'Query must be at least 2 characters' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fast keyword search on name, city, and category
    // Using PostgreSQL's ILIKE for case-insensitive matching
    const { data: destinations, error } = await supabase
      .from('destinations')
      .select('id, name, slug, city, country, category, image, michelin_stars')
      .or(`name.ilike.%${query}%,city.ilike.%${query}%,category.ilike.%${query}%`)
      .order('popularity_score', { ascending: false, nullsFirst: false })
      .limit(limit);

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch suggestions' },
        { status: 500 }
      );
    }

    // Group results by type for better UI
    const suggestions = {
      destinations: destinations || [],
      cities: Array.from(new Set(
        (destinations || [])
          .filter(d => d.city?.toLowerCase().includes(query.toLowerCase()))
          .map(d => ({ city: d.city, country: d.country }))
      )).slice(0, 5),
      categories: Array.from(new Set(
        (destinations || [])
          .filter(d => d.category?.toLowerCase().includes(query.toLowerCase()))
          .map(d => d.category)
      )).slice(0, 5),
    };

    return NextResponse.json({
      query,
      suggestions,
      total: destinations?.length || 0,
    });

  } catch (error) {
    console.error('Suggest API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
