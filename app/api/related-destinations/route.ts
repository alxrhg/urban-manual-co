import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const limit = parseInt(searchParams.get('limit') || '6');

    if (!slug) {
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
    }

    // Get the destination
    const { data: destination, error: destError } = await supabase
      .from('destinations')
      .select('*')
      .eq('slug', slug)
      .single();

    if (destError || !destination) {
      return NextResponse.json({ error: 'Destination not found' }, { status: 404 });
    }

    // Build query for related destinations
    let query = supabase
      .from('destinations')
      .select('*')
      .neq('slug', slug)
      .limit(limit);

    // Score-based selection: same city, same category, shared tags, nearby cities
    const related: any[] = [];
    
    // 1. Same city + same category (highest priority)
    if (destination.city && destination.category) {
      const { data: sameCityCategory } = await supabase
        .from('destinations')
        .select('*')
        .eq('city', destination.city)
        .eq('category', destination.category)
        .neq('slug', slug)
        .limit(limit);
      
      if (sameCityCategory) {
        related.push(...sameCityCategory.map(d => ({ ...d, _score: 10 })));
      }
    }

    // 2. Same city, different category
    if (destination.city && related.length < limit) {
      const { data: sameCity } = await supabase
        .from('destinations')
        .select('*')
        .eq('city', destination.city)
        .neq('category', destination.category || '')
        .neq('slug', slug)
        .not('slug', 'in', `(${related.map(r => r.slug).join(',') || 'none'})`)
        .limit(limit - related.length);
      
      if (sameCity) {
        related.push(...sameCity.map(d => ({ ...d, _score: 7 })));
      }
    }

    // 3. Same category, different city
    if (destination.category && related.length < limit) {
      const { data: sameCategory } = await supabase
        .from('destinations')
        .select('*')
        .eq('category', destination.category)
        .neq('city', destination.city || '')
        .neq('slug', slug)
        .not('slug', 'in', `(${related.map(r => r.slug).join(',') || 'none'})`)
        .limit(limit - related.length);
      
      if (sameCategory) {
        related.push(...sameCategory.map(d => ({ ...d, _score: 5 })));
      }
    }

    // 4. Boost Michelin-starred places
    const boosted = related.map(d => {
      let score = d._score || 3;
      if (d.michelin_stars && d.michelin_stars > 0) score += 2;
      if (d.crown) score += 1;
      if (d.rating && d.rating >= 4.5) score += 1;
      return { ...d, _score: score };
    });

    // Sort by score and limit
    const final = boosted
      .sort((a, b) => (b._score || 0) - (a._score || 0))
      .slice(0, limit)
      .map(({ _score, ...rest }) => rest);

    return NextResponse.json({
      related: final,
      count: final.length,
    });
  } catch (error: any) {
    console.error('Error fetching related destinations:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch related destinations' },
      { status: 500 }
    );
  }
}

