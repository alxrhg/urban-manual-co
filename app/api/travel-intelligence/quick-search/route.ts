/**
 * Quick Search API - Returns vector search results in ~1ms
 * Used for instant preview while full AI processes
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { embedText } from '@/lib/llm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, context } = body;

    if (!message) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 });
    }

    const supabase = await createServerClient();

    // Quick city/category extraction (rule-based, no AI)
    const lower = message.toLowerCase();
    let city = context?.city || null;
    let category = context?.category || null;

    // Fast city detection
    const cityPatterns: Record<string, string> = {
      'tokyo': 'Tokyo', 'paris': 'Paris', 'london': 'London',
      'new york': 'New York', 'nyc': 'New York', 'singapore': 'Singapore',
      'hong kong': 'Hong Kong', 'sydney': 'Sydney', 'dubai': 'Dubai',
      'bangkok': 'Bangkok', 'berlin': 'Berlin', 'amsterdam': 'Amsterdam',
      'rome': 'Rome', 'barcelona': 'Barcelona', 'lisbon': 'Lisbon',
      'kyoto': 'Kyoto', 'osaka': 'Osaka', 'seoul': 'Seoul',
    };
    for (const [pattern, name] of Object.entries(cityPatterns)) {
      if (lower.includes(pattern)) { city = name; break; }
    }

    // Fast category detection
    if (lower.match(/hotel|stay|accommodation/)) category = 'Hotel';
    else if (lower.match(/restaurant|dining|eat|food|dinner|lunch/)) category = 'Restaurant';
    else if (lower.match(/cafe|coffee/)) category = 'Cafe';
    else if (lower.match(/bar|drink|cocktail/)) category = 'Bar';
    else if (lower.match(/museum|gallery|art|culture/)) category = 'Culture';
    else if (lower.match(/shop|store|boutique/)) category = 'Shop';

    // Run vector search (fast ~1-5ms)
    const startTime = Date.now();
    const embedding = await embedText(message);

    let results: any[] = [];

    if (embedding) {
      const { data, error } = await supabase.rpc('match_destinations', {
        query_embedding: embedding,
        match_threshold: 0.35,
        match_count: 12,
        filter_city: city,
        filter_category: category,
        filter_michelin_stars: null,
        filter_min_rating: null,
        filter_max_price_level: null,
        search_query: message,
      });

      if (!error && data) {
        results = data;
      }
    }

    // Fallback to direct query if vector search returns nothing
    if (results.length === 0 && (city || category)) {
      let query = supabase
        .from('destinations')
        .select('*')
        .is('parent_destination_id', null)
        .limit(12);

      if (city) query = query.ilike('city', `%${city}%`);
      if (category) query = query.ilike('category', `%${category}%`);

      const { data } = await query.order('rating', { ascending: false });
      results = data || [];
    }

    const duration = Date.now() - startTime;
    console.log(`[QuickSearch] Found ${results.length} results in ${duration}ms`);

    return NextResponse.json({
      destinations: results.slice(0, 8).map((d: any) => ({
        slug: d.slug,
        name: d.name,
        city: d.city,
        neighborhood: d.neighborhood,
        category: d.category,
        image: d.image,
        michelin_stars: d.michelin_stars,
        rating: d.rating,
        price_level: d.price_level,
        micro_description: d.micro_description,
      })),
      context: { city, category },
      duration,
    });
  } catch (error: any) {
    console.error('[QuickSearch] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
